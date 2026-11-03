PB.panel("mmu", {
  title: "MMU / AMS", desc: "Filament slots, what's loaded, load and unload", cls: "adv",
  icon: PB.icon('<circle cx="6" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><path d="M3 18h18"/>'),
  create(host) {
    host.innerHTML = `<div class="pb-mmu"></div>`;
    const box = host.querySelector(".pb-mmu");
    let key = "";
    function gate(g, i, m, busy) {
      const empty = !g.status, on = m.gate === i;
      const left = g.remaining != null ? `<span class="pb-mmu-left"><i style="width:${Math.max(0, Math.min(100, g.remaining))}%"></i></span>` : "";
      return `<button type="button" class="pb-mmu-gate${on ? " on" : ""}${empty ? " empty" : ""}" data-g="${i}"
          style="--c:${esc(g.color || "transparent")}" ${empty || busy ? "disabled" : ""}
          title="${esc(empty ? `Slot ${i + 1}: empty` : `Slot ${i + 1}: ${g.name || g.material}${g.temp ? ` · ${g.temp}°C` : ""}`)}">
        <span class="pb-mmu-spool"></span><span class="pb-mmu-mat">${esc(empty ? "Empty" : g.material || "?")}</span>
        <span class="pb-mmu-name">${esc(empty ? "" : g.name && g.name !== g.material ? g.name : "")}</span>${left}
        <span class="pb-mmu-no">${i + 1}</span></button>`;
    }
    function draw(p) {
      const m = p.mmu;
      if (!m) { box.innerHTML = `<p class="pb-muted">No MMU or AMS on this printer.</p>`; return; }
      const busy = p.state === "printing" || p.state === "paused";
      const loaded = m.gate >= 0 ? `Slot ${m.gate + 1}` + (m.gates[m.gate] ? ` · ${m.gates[m.gate].name || m.gates[m.gate].material}` : "")
        : m.gate === -2 ? "External spool" : m.loaded ? "Unknown" : "Nothing";
      box.innerHTML = m.units.map(u => `<div class="pb-mmu-unit"><div class="pb-mmu-head"><span>${esc(u.name)}</span>
          <span class="pb-muted">${[u.temp != null ? `${Math.round(u.temp)}°C` : "", u.humidity != null ? `${Math.round(u.humidity)}% RH` : ""].filter(Boolean).join(" · ")}</span></div>
          <div class="pb-mmu-gates">${m.gates.slice(u.first, u.first + u.count).map((g, j) => gate(g, u.first + j, m, busy)).join("")}</div></div>`).join("")
        + `<div class="pb-mmu-foot"><span>Loaded: <b>${esc(loaded)}</b></span>
          <button type="button" data-unload ${m.loaded && !busy ? "" : "disabled"}>Unload</button></div>`;
      for (const b of box.querySelectorAll("[data-g]")) b.onclick = () => {
        const i = +b.dataset.g, g = m.gates[i];
        if (m.gate === i || confirm(`Load slot ${i + 1} (${g.name || g.material})?`)) gcode(`MMU_CHANGE_TOOL GATE=${i}`);
      };
      box.querySelector("[data-unload]").onclick = () => { if (confirm("Unload the filament?")) gcode(`MMU_EJECT GATE=${m.gate}`); };
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
