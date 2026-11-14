PB.panel("fsensors", {
  title: "Runout Sensors", desc: "Filament runout sensors on / off", cls: "adv",
  icon: PB.icon('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v6"/>'),
  create(host) {
    host.innerHTML = `<div class="pb-list"></div>`;
    const list = host.querySelector(".pb-list");
    let key = "";
    const OK = PB.icon('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'), WARN = PB.icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>');
    return {
      update(p) {
        const fs = p.fsensors || [], k = JSON.stringify(fs);
        if (k === key) return;
        key = k;
        list.innerHTML = fs.length ? fs.map(f => `<div class="pb-fo"><span class="pb-lab">${esc(f.name)}</span><span class="bd-sp"></span>
            <span class="pb-fsi ${f.detected ? "ok" : "warn"}" title="${f.detected ? "Filament detected" : "No filament"}">${f.detected ? OK : WARN}</span>
            <input type="checkbox" class="pb-switch" role="switch" data-s="${esc(f.id.split(" ").slice(1).join(" "))}" aria-label="Enable ${esc(f.name)}"${f.enabled ? " checked" : ""}></div>`).join("")
          : `<p class="pb-muted">No filament sensors in printer.cfg.</p>`;
        for (const b of list.querySelectorAll("[data-s]")) b.onchange = () => gcode(`SET_FILAMENT_SENSOR SENSOR=${b.dataset.s} ENABLE=${b.checked ? 1 : 0}`);
      },
    };
  },
});
