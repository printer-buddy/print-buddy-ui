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
        <span class="pb-mmu-spool"></span><span class="pb-mmu-mat">${esc(empty ? "Empty" : g.material || "?")}</span>
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
