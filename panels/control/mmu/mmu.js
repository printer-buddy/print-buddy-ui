//LICENSE
//
//Copyright (C) 2026  sterling motuz <Sterling@dexabyte.ca>
//
//for https://github.com/printer-buddy/printer-buddy
//
//SPDX-License-Identifier: AGPL-3.0-only
//
//Additional term (AGPL-3.0 section 7b, keep author credit): keep this header
//
//Additional term (AGPL-3.0 section 7c, mark changed versions): if you make any changes, you must include a CHANGELOG with all changes and their dates
let _sid = 0;
function _px(h) { h = String(h || "").replace("#", ""); if (h.length === 3) h = h.split("").map(x => x + x).join(""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function _mix(hex, to, amt) { const [r, g, b] = _px(hex), t = to === "#fff" ? 255 : 0, m = v => Math.round(v + (t - v) * amt); return `rgb(${m(r)},${m(g)},${m(b)})`; }
// Face-on filament spool: translucent flange + spoke hub, wound filament ring in the slot colour that recedes toward the hub as it empties.
const _HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
function _spool(color, pct, empty) {
  const cx = 60, cy = 60, uid = ++_sid, c = empty ? "" : (_HEX.test(color) ? color : "#9aa3af");
  const R_OUT = 52, R_HUB = 23;
  const frac = empty ? 0 : Math.min(1, Math.max(0.14, pct == null ? 1 : pct / 100));
  const rFil = R_HUB + (R_OUT - R_HUB) * frac;
  const pl0 = "#eef1f5", pl1 = "#c3cad3", pl2 = "#9aa3af", rim = "#7c8691", bed = "#0c0e12";
  const fHi = empty ? "" : _mix(c, "#fff", 0.30), fLo = empty ? "" : _mix(c, "#000", 0.34), fEdge = empty ? "" : _mix(c, "#000", 0.5);
  let winds = "";
  if (!empty) for (let r = R_HUB + 2.4; r <= rFil - 0.6; r += 2.4) {
    const odd = Math.round((r - R_HUB) / 2.4) % 2;
    winds += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${odd ? fLo : fHi}" stroke-width="1.1" opacity="${odd ? 0.5 : 0.35}"/>`;
  }
  const spokes = [0, 1, 2, 3, 4].map(i => { const a = i / 5 * 2 * Math.PI - Math.PI / 2, x = cx + Math.cos(a) * 15, y = cy + Math.sin(a) * 15; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.1" fill="#11141a"/><ellipse cx="${x.toFixed(1)}" cy="${(y - 0.6).toFixed(1)}" rx="3.1" ry="2" fill="rgba(255,255,255,.18)"/>`; }).join("");
  return `<svg class="pb-mmu-spool" viewBox="-4 -4 128 132" aria-hidden="true"><defs>`
    + `<radialGradient id="pl${uid}" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${pl0}"/><stop offset=".55" stop-color="${pl1}"/><stop offset="1" stop-color="${pl2}"/></radialGradient>`
    + `<radialGradient id="gl${uid}" cx=".35" cy=".28" r=".55"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`
    + `<ellipse cx="${cx}" cy="116" rx="46" ry="6" fill="#000" opacity=".32"/>`
    + `<circle cx="${cx}" cy="${cy}" r="56" fill="url(#pl${uid})" stroke="${rim}" stroke-width="1.5"/>`
    + `<circle cx="${cx}" cy="${cy}" r="55" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${R_OUT}" fill="${bed}"/><circle cx="${cx}" cy="${cy}" r="${R_OUT}" fill="none" stroke="#000" stroke-opacity=".6" stroke-width="2"/>`
    + (empty ? "" : `<circle cx="${cx}" cy="${cy}" r="${rFil.toFixed(1)}" fill="${c}"/>${winds}<circle cx="${cx}" cy="${cy}" r="${rFil.toFixed(1)}" fill="none" stroke="${fEdge}" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="${(rFil - 1).toFixed(1)}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1"/>`)
    + `<circle cx="${cx}" cy="${cy}" r="${R_HUB}" fill="url(#pl${uid})" stroke="${rim}" stroke-width="1.2"/>${spokes}`
    + `<circle cx="${cx}" cy="${cy}" r="7.5" fill="#0e1116" stroke="#000" stroke-opacity=".6"/><circle cx="${cx}" cy="${cy}" r="7.5" fill="none" stroke="#fff" stroke-opacity=".15" stroke-width="1" transform="translate(0,-.8)"/>`
    + `<circle cx="${cx}" cy="${cy}" r="56" fill="url(#gl${uid})"/>`
    + (empty ? `<circle cx="${cx}" cy="${cy}" r="${R_OUT}" fill="none" stroke="${rim}" stroke-dasharray="3 5" stroke-width="1.5" opacity=".7"/>` : "")
    + `</svg>`;
}
// Klipper splits command params with shlex: always double-quote, escape backslashes, and drop characters that start a comment.
function _q(v) { v = String(v ?? "").replace(/[#;*"]/g, "").trim().replace(/\\/g, "\\\\"); return `"${v}"`; }
function _hex(c) { return _HEX.test(c || "") ? (c.length === 4 ? "#" + [...c.slice(1)].map(x => x + x).join("") : c).toLowerCase() : ""; }
PB.panel("mmu", {
  title: "MMU / AMS", desc: "Filament slots, what's loaded, load, unload and edit each lane", cls: "adv",
  icon: PB.icon('<circle cx="6" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><path d="M3 18h18"/>'),
  create(host) {
    host.innerHTML = `<div class="pb-mmu"></div>`;
    const box = host.querySelector(".pb-mmu");
    let key = "", sel = null, editing = false, last = null;
    const busyNow = () => !!last && (last.state === "printing" || last.state === "paused");
    function gate(g, i, m) {
      const empty = !g.status, on = m.gate === i, no = g.label || i + 1;
      const lbl = [g.grams != null ? `${g.grams} g` : "", g.remaining != null ? `${Math.round(g.remaining)}% left` : ""].filter(Boolean).join(" · ");
      const left = g.remaining != null || g.grams != null
        ? `${g.remaining != null ? `<span class="pb-mmu-left"><i style="width:${Math.max(0, Math.min(100, g.remaining))}%"></i></span>` : ""}<span class="pb-mmu-pct">${esc(lbl)}</span>`
        : "";
      return `<button type="button" class="pb-mmu-gate${on ? " on" : ""}${empty ? " empty" : ""}${sel === i ? " sel" : ""}" data-g="${i}"
          style="--c:${esc(g.color || "transparent")}" ${m.readonly || m.enabled === false ? "disabled" : ""}
          title="${esc(empty ? `Slot ${no}: empty` : `Slot ${no}: ${g.name || g.material}${g.temp ? ` · ${g.temp}°C` : ""}`)}">
        ${_spool(g.color, g.remaining, empty)}<span class="pb-mmu-mat">${esc(empty ? "Empty" : g.material || "?")}</span>
        <span class="pb-mmu-name">${esc(empty ? "" : g.name && g.name !== g.material ? g.name : "")}</span>${left}
        <span class="pb-mmu-no">${esc(String(no))}</span></button>`;
    }
    const btn = (act, label, off) => `<button type="button" data-act="${act}" ${off ? "disabled" : ""}>${label}</button>`;
    // Per-lane actions, as Fluidd and Mainsail offer them
    function menu(m, busy) {
      const i = sel, g = m.gates[i], no = g.label || i + 1, nm = /^lane/i.test(no) ? no : `Lane ${no}`;
      if (m.afc) {
        const ready = g.load && g.prep;
        const t0 = [...new Set(m.gates.map(x => x.map).filter(Boolean))].sort(), tools = g.map && !t0.includes(g.map) ? [g.map, ...t0] : t0;
        const others = m.gates.filter((x, j) => j !== i && x.load && x.prep).map(x => x.label);
        return `<div class="pb-mmu-menu"><div class="pb-mmu-menu-head"><b>${esc(String(nm))}</b>
            <span class="pb-muted">${esc(ready ? "Ready" : g.prep ? "Prep detected" : "Empty")}</span></div>
          <div class="pb-mmu-acts">${g.tool_loaded ? btn("unload", "Unload", busy) : btn("load", "Load", busy || !ready)}
            ${btn("eject", "Eject", busy || g.tool_loaded || !g.prep)}${btn("edit", "Edit filament", false)}</div>
          ${tools.length ? `<label class="pb-mmu-row">Tool <select data-map>${tools.map(t => `<option${t === g.map ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>` : ""}
          <label class="pb-mmu-row">Runout to <select data-runout><option value="NONE">None</option>${others.map(l => `<option${l === g.runout ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
          ${editing ? `<div class="pb-mmu-form">
            <label>Colour <input type="color" data-f="color" value="${esc(_hex(g.color) || "#888888")}"></label>
            <label>Material <input type="text" data-f="material" value="${esc(g.material || "")}"></label>
            <label>Weight (g) <input type="number" min="0" data-f="weight" value="${esc(g.grams ?? "")}"></label>
            <div class="pb-mmu-acts">${btn("save", "Save", false)}${btn("cancel", "Cancel", false)}</div></div>` : ""}</div>`;
      }
      const on = m.gate === i, pos = m.filament_pos, loaded = pos != null ? pos === 10 : m.loaded;
      const unit = m.units.find(u => i >= u.first && i < u.first + u.count) || {};
      return `<div class="pb-mmu-menu"><div class="pb-mmu-menu-head"><b>Gate ${esc(String(no))}</b>
          <span class="pb-muted">${esc(g.status > 0 ? "Available" : g.status === 0 ? "Empty" : "Unknown")}</span></div>
        <div class="pb-mmu-acts">${btn("select", "Select", busy || on || loaded)}${btn("preload", "Preload", busy || (on && loaded))}
          ${btn("eject", "Eject", busy || (!on && !unit.crossload))}${btn("change", "Change tool", busy || on)}${btn("edit", "Edit gate", false)}</div>
        ${editing ? `<div class="pb-mmu-form">
          <label>Name <input type="text" data-f="name" value="${esc(g.name || "")}"></label>
          <label>Material <input type="text" data-f="material" value="${esc(g.material || "")}"></label>
          <label>Colour <input type="color" data-f="color" value="${esc(_hex(g.color) || "#888888")}"></label>
          <label>Temperature <input type="number" min="0" data-f="temp" value="${esc(g.temp ?? "")}"></label>
          <label class="pb-mmu-check"><input type="checkbox" data-f="available"${g.status > 0 ? " checked" : ""}> Available</label>
          <div class="pb-mmu-acts">${btn("save", "Save", false)}${btn("cancel", "Cancel", false)}</div></div>` : ""}</div>`;
    }
    function act(a, m) {
      const i = sel, g = m.gates[i], lane = _q(g.label), no = g.label || i + 1, nm = /^lane/i.test(no) ? no : `lane ${no}`, f = n => box.querySelector(`[data-f="${n}"]`);
      const ask = (t, s) => { if (confirm(t) && !busyNow()) gcode(s); };
      if (a === "edit") { editing = true; return draw(last); }
      if (a === "cancel") { editing = false; return draw(last); }
      if (m.afc) {
        if (a === "load") return ask(`Load ${nm}?`, `CHANGE_TOOL LANE=${lane}`);
        if (a === "unload") return ask(`Unload ${nm}?`, `TOOL_UNLOAD LANE=${lane}`);
        if (a === "eject") return ask(`Eject ${nm}?`, `LANE_UNLOAD LANE=${lane}`);
        if (a === "save") {
          const c = f("color").value.replace("#", ""), mat = f("material").value.trim(), w = f("weight").value;
          const lines = [];
          if (f("color").dataset.touched) lines.push(`SET_COLOR LANE=${lane} COLOR=${c}`);
          if (mat && mat !== (g.material || "")) lines.push(`SET_MATERIAL LANE=${lane} MATERIAL=${_q(mat)}`);
          if (w !== "" && +w !== g.grams) lines.push(`SET_WEIGHT LANE=${lane} WEIGHT=${Math.round(+w)}`);
          if (lines.length) gcode(lines.join("\n"));
          editing = false; return draw(last);
        }
        return;
      }
      if (a === "select") return gcode(`MMU_SELECT GATE=${i}`);
      if (a === "preload") return ask(`Preload gate ${no}?`, `MMU_PRELOAD GATE=${i}`);
      if (a === "eject") return ask(`Eject gate ${no}?`, `MMU_EJECT GATE=${i}`);
      if (a === "change") return ask(`Change tool to gate ${no}?`, `MMU_CHANGE_TOOL GATE=${i}`);
      if (a === "save") {
        const parts = [], name = f("name").value.trim(), mat = f("material").value.trim(), c = f("color").value.replace("#", ""), t = f("temp").value, av = f("available").checked;
        if (name !== (g.name || "")) parts.push(`NAME=${_q(name)}`);
        if (mat !== (g.material || "")) parts.push(`MATERIAL=${_q(mat)}`);
        if (f("color").dataset.touched) parts.push(`COLOR=${c}`);
        if (t !== "" && +t !== g.temp) parts.push(`TEMP=${Math.round(+t)}`);
        if (av !== g.status > 0) parts.push(`AVAILABLE=${av ? 1 : 0}`);
        if (parts.length) gcode(`MMU_GATE_MAP GATE=${i} ${parts.join(" ")} QUIET=1`);
        editing = false; return draw(last);
      }
    }
    function draw(p) {
      last = p;
      const m = p.mmu;
      if (!m) { box.innerHTML = `<p class="pb-muted">No MMU or AMS on this printer.</p>`; return; }
      if (sel != null && !m.gates[sel]) { sel = null; editing = false; }
      const busy = p.state === "printing" || p.state === "paused";
      const loaded = m.gate >= 0 ? `Slot ${m.gates[m.gate]?.label || m.gate + 1}` + (m.gates[m.gate] ? ` · ${m.gates[m.gate].name || m.gates[m.gate].material}` : "")
        : m.gate === -2 ? "External spool" : m.loaded ? "Unknown" : "Nothing";
      const pos = m.filament_pos, hhLoaded = pos != null ? pos !== 0 : m.loaded;
      box.innerHTML = m.units.map(u => `<div class="pb-mmu-unit"><div class="pb-mmu-head"><span>${esc(u.name)}</span>
          <span class="pb-muted">${[u.temp != null ? `${Math.round(u.temp)}°C` : "", u.humidity != null ? `${Math.round(u.humidity)}% RH` : ""].filter(Boolean).join(" · ")}</span></div>
          <div class="pb-mmu-gates">${m.gates.slice(u.first, u.first + u.count).map((g, j) => gate(g, u.first + j, m)).join("")}</div></div>`).join("")
        + (sel != null && !m.readonly ? menu(m, busy) : "")
        + `<div class="pb-mmu-foot"><span>Loaded: <b>${esc(loaded)}</b></span>
          ${m.readonly ? "" : m.afc ? `<button type="button" data-unload ${m.loaded && !busy ? "" : "disabled"}>Unload</button>`
            : `<span class="pb-mmu-acts">${m.bypass ? btn("bypass", "Select bypass", busy || m.gate === -2 || hhLoaded) : ""}${btn("hhload", "Load", busy || hhLoaded)}${btn("hhunload", "Unload", busy || !hhLoaded)}</span>`}</div>`;
      for (const b of box.querySelectorAll("[data-g]")) b.onclick = () => { const i = +b.dataset.g; sel = sel === i ? null : i; editing = false; draw(last); };
      for (const b of box.querySelectorAll(".pb-mmu-menu [data-act]")) b.onclick = () => act(b.dataset.act, m);
      const g = sel != null ? m.gates[sel] : null;
      for (const el of box.querySelectorAll("[data-f]")) for (const ev of ["input", "change"]) el.addEventListener(ev, () => { el.dataset.touched = "1"; });
      box.querySelector("[data-map]")?.addEventListener("change", e => gcode(`SET_MAP LANE=${_q(g.label)} MAP=${_q(e.target.value)}`));
      box.querySelector("[data-runout]")?.addEventListener("change", e => gcode(`SET_RUNOUT LANE=${_q(g.label)} RUNOUT=${_q(e.target.value)}`));
      box.querySelector("[data-unload]")?.addEventListener("click", () => { if (confirm("Unload the filament?") && !busyNow()) gcode(m.gates[m.gate]?.label ? `TOOL_UNLOAD LANE=${_q(m.gates[m.gate].label)}` : "TOOL_UNLOAD"); });
      box.querySelector('.pb-mmu-foot [data-act="bypass"]')?.addEventListener("click", () => { if (!busyNow()) gcode("MMU_SELECT BYPASS=1"); });
      box.querySelector('.pb-mmu-foot [data-act="hhload"]')?.addEventListener("click", () => { if (confirm("Load the filament?") && !busyNow()) gcode("MMU_LOAD"); });
      box.querySelector('.pb-mmu-foot [data-act="hhunload"]')?.addEventListener("click", () => { if (confirm("Unload the filament?") && !busyNow()) gcode("MMU_UNLOAD"); });
    }
    // Redraw while the editor is open (so buttons follow the printer state) but keep the fields that were edited, and the focus.
    function redrawKeepingForm(p) {
      const keep = [...box.querySelectorAll("[data-f]")].filter(el => el.dataset.touched).map(el => [el.dataset.f, el.value, el.checked, el.dataset.touched]);
      const fo = document.activeElement?.dataset?.f, s0 = document.activeElement?.selectionStart, s1 = document.activeElement?.selectionEnd;
      draw(p);
      for (const [n, v, c, t] of keep) {
        const el = box.querySelector(`[data-f="${n}"]`);
        if (!el) continue;
        el.value = v; el.checked = c;
        if (t) el.dataset.touched = t;
      }
      const el = fo && box.querySelector(`[data-f="${fo}"]`);
      if (el) { el.focus(); try { if (s0 != null) el.setSelectionRange(s0, s1); } catch (e) { } }
    }
    return {
      open() { key = ""; sel = null; editing = false; last = null; },
      update(p) {
        const k = JSON.stringify([p.mmu, p.state]);
        last = p;
        if (k === key) return;
        key = k;
        if (editing) return redrawKeepingForm(p);
        draw(p);
      },
    };
  },
});
