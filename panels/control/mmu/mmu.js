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
PB.panel("mmu", {
  title: "MMU / AMS", desc: "Filament slots, what's loaded, load and unload", cls: "adv",
  icon: PB.icon('<circle cx="6" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><path d="M3 18h18"/>'),
  create(host) {
    host.innerHTML = `<div class="pb-mmu"></div>`;
    const box = host.querySelector(".pb-mmu");
    let key = "";
    function gate(g, i, m, busy) {
      const empty = !g.status, on = m.gate === i, no = g.label || i + 1;
      const lbl = [g.grams != null ? `${g.grams} g` : "", g.remaining != null ? `${Math.round(g.remaining)}% left` : ""].filter(Boolean).join(" · ");
      const left = g.remaining != null || g.grams != null
        ? `${g.remaining != null ? `<span class="pb-mmu-left"><i style="width:${Math.max(0, Math.min(100, g.remaining))}%"></i></span>` : ""}<span class="pb-mmu-pct">${esc(lbl)}</span>`
        : "";
      return `<button type="button" class="pb-mmu-gate${on ? " on" : ""}${empty ? " empty" : ""}" data-g="${i}"
          style="--c:${esc(g.color || "transparent")}" ${empty || busy || m.readonly ? "disabled" : ""}
          title="${esc(empty ? `Slot ${no}: empty` : `Slot ${no}: ${g.name || g.material}${g.temp ? ` · ${g.temp}°C` : ""}`)}">
        ${_spool(g.color, g.remaining, empty)}<span class="pb-mmu-mat">${esc(empty ? "Empty" : g.material || "?")}</span>
        <span class="pb-mmu-name">${esc(empty ? "" : g.name && g.name !== g.material ? g.name : "")}</span>${left}
        <span class="pb-mmu-no">${esc(String(no))}</span></button>`;
    }
    function draw(p) {
      const m = p.mmu;
      if (!m) { box.innerHTML = `<p class="pb-muted">No MMU or AMS on this printer.</p>`; return; }
      const busy = p.state === "printing" || p.state === "paused";
      const loaded = m.gate >= 0 ? `Slot ${m.gates[m.gate]?.label || m.gate + 1}` + (m.gates[m.gate] ? ` · ${m.gates[m.gate].name || m.gates[m.gate].material}` : "")
        : m.gate === -2 ? "External spool" : m.loaded ? "Unknown" : "Nothing";
      box.innerHTML = m.units.map(u => `<div class="pb-mmu-unit"><div class="pb-mmu-head"><span>${esc(u.name)}</span>
          <span class="pb-muted">${[u.temp != null ? `${Math.round(u.temp)}°C` : "", u.humidity != null ? `${Math.round(u.humidity)}% RH` : ""].filter(Boolean).join(" · ")}</span></div>
          <div class="pb-mmu-gates">${m.gates.slice(u.first, u.first + u.count).map((g, j) => gate(g, u.first + j, m, busy)).join("")}</div></div>`).join("")
        + `<div class="pb-mmu-foot"><span>Loaded: <b>${esc(loaded)}</b></span>
          ${m.readonly ? "" : `<button type="button" data-unload ${m.loaded && !busy ? "" : "disabled"}>Unload</button>`}</div>`;
      for (const b of box.querySelectorAll("[data-g]")) b.onclick = () => {
        const i = +b.dataset.g, g = m.gates[i];
        if (m.gate === i || confirm(`Load slot ${g.label || i + 1} (${g.name || g.material})?`)) gcode(m.afc ? `CHANGE_TOOL LANE=${g.label}` : `MMU_CHANGE_TOOL GATE=${i}`);
      };
      box.querySelector("[data-unload]")?.addEventListener("click", () => { if (confirm("Unload the filament?")) gcode(m.afc ? (m.gates[m.gate]?.label ? `TOOL_UNLOAD LANE=${m.gates[m.gate].label}` : "TOOL_UNLOAD") : `MMU_EJECT GATE=${m.gate}`); });
    }
    return {
      open() { key = ""; },
      update(p) {
        const k = JSON.stringify([p.mmu, p.state]);
        if (k === key) return;
        key = k;
        draw(p);
      },
    };
  },
});
