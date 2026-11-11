PB.panel("beacon", {
  title: "Beacon", desc: "Beacon probe models: load, save, remove, calibrate (shows only when the printer has a Beacon)", cls: "adv",
  icon: PB.icon('<circle cx="12" cy="12" r="3"/><path d="M5 12a7 7 0 0 1 7-7M19 12a7 7 0 0 1-7 7M2 12a10 10 0 0 1 10-10M22 12a10 10 0 0 1-10 10"/>'),
  create(host) {
    const PLAY = PB.icon('<path d="M7 5l12 7-12 7z"/>');
    host.innerHTML = `<div class="pb-tool"><button type="button" data-a="save">Save as…</button><button type="button" data-a="cal">Calibrate</button></div><div class="pb-mctl"></div>`;
    const box = host.querySelector(".pb-mctl"), q = s => host.querySelector(s);
    let key = "", b = null, live = false, printing = false;
    const bm = (text, cmd) => PB.confirmGcode(text, cmd, "Sent");
    function draw() {
      const ms = b?.models || [];
      box.innerHTML = ms.length ? `<table class="pb-mt"><thead><tr><th></th><th>Name</th><th></th></tr></thead><tbody>${ms.map(n => `<tr${n === b.active ? ' class="on"' : ""}>
          <td>${n === b.active ? "Active" : ""}</td><td>${esc(n)}</td>
          <td class="pb-mtb"><button type="button" data-load="${esc(n)}" title="Load this model" aria-label="Load ${esc(n)}"${live ? "" : " disabled"}>${PLAY}</button>
            <button type="button" data-rm="${esc(n)}" title="Remove this model" aria-label="Remove ${esc(n)}"${live && !printing ? "" : " disabled"}>${PB.ic.trash}</button></td></tr>`).join("")}</tbody></table>`
        : `<p class="pb-muted">No saved Beacon models.</p>`;
      for (const x of box.querySelectorAll("[data-load]")) x.onclick = () => {
        const cmd = `BEACON_MODEL_SELECT NAME="${x.dataset.load}"`;
        if (printing) bm(`Change the Beacon model to "${x.dataset.load}" during a print?`, cmd); else gcode(cmd);
      };
      for (const x of box.querySelectorAll("[data-rm]")) x.onclick = () => bm(`Remove Beacon model "${x.dataset.rm}"? Then run SAVE_CONFIG when idle.`, `BEACON_MODEL_REMOVE NAME="${x.dataset.rm}"`);
    }
    q("[data-a=cal]").onclick = () => bm("Start a Beacon calibration? The printer must be homed and the bed clear.", "BEACON_CALIBRATE");
    q("[data-a=save]").onclick = () => { const n = prompt("Save the current Beacon model as:", b?.active || "default"); if (n) bm(`Save the Beacon model as "${n}"? Then run SAVE_CONFIG when idle.`, `BEACON_MODEL_SAVE NAME="${n}"`); };
    return {
      open() { key = ""; b = null; box.innerHTML = ""; },
      update(p) {
        const card = host.closest(".pb-card"); if (card) { if (p.beacon) delete card.dataset.empty; else card.dataset.empty = "1"; }
        live = p.connection === "online" && p.klippy_state === "ready"; printing = p.state === "printing" || p.state === "paused";
        const k = JSON.stringify([p.beacon, live, printing]); if (k === key) return; key = k; b = p.beacon; draw();
        for (const x of host.querySelectorAll(".pb-tool button")) x.disabled = !live || printing;
      },
    };
  },
});
