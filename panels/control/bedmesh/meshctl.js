PB.panel("meshctl", {
  title: "Bed Mesh Controls", desc: "Saved bed mesh profiles: load, save, remove", cls: "adv",
  icon: PB.icon('<path d="M3 17l9 4 9-4M3 12l9 4 9-4M3 7l9 4 9-4-9-4z"/>'),
  create(host) {
    const PLAY = PB.icon('<path d="M7 5l12 7-12 7z"/>');
    host.innerHTML = `<div class="pb-tool"><button type="button" data-a="save">Save as…</button><button type="button" data-a="clear">Clear</button><span class="bd-sp"></span><button type="button" data-a="mprobe" title="Start MANUAL_PROBE: lower the nozzle until a sheet of paper just drags">Manual probe</button></div><div class="pb-mctl"></div>`;
    const box = host.querySelector(".pb-mctl"), q = s => host.querySelector(s);
    let key = "", mesh = {}, live = false, printing = false;
    const bm = (text, cmd) => PB.confirmGcode(text, cmd, "Sent");
    const rangeOf = pr => { const f = (pr.points || []).flat().filter(v => typeof v === "number"); return f.length ? (Math.max(...f) - Math.min(...f)).toFixed(3) : "—"; };
    function draw() {
      const profs = Object.entries(mesh.profiles || {});
      box.innerHTML = profs.length ? `<table class="pb-mt"><thead><tr><th></th><th>Name</th><th>Range</th><th></th></tr></thead><tbody>${profs.map(([n, pr]) => `<tr${n === mesh.profile_name ? ' class="on"' : ""}>
          <td>${n === mesh.profile_name ? "Active" : ""}</td><td>${esc(n)}</td><td>${rangeOf(pr)} mm</td>
          <td class="pb-mtb"><button type="button" data-load="${esc(n)}" title="Load this profile" aria-label="Load ${esc(n)}"${live && !printing ? "" : " disabled"}>${PLAY}</button>
            <button type="button" data-rm="${esc(n)}" title="Remove this profile" aria-label="Remove ${esc(n)}"${live && !printing ? "" : " disabled"}>${PB.ic.trash}</button></td></tr>`).join("")}</tbody></table>`
        : `<p class="pb-muted">No saved profiles.</p>`;
      for (const b of box.querySelectorAll("[data-load]")) b.onclick = () => gcode(`BED_MESH_PROFILE LOAD="${b.dataset.load}"`);
      for (const b of box.querySelectorAll("[data-rm]")) b.onclick = () => bm(`Remove profile "${b.dataset.rm}"? Then run SAVE_CONFIG when idle.`, `BED_MESH_PROFILE REMOVE="${b.dataset.rm}"`);
    }
    async function load() {
      if (pageId === null) return;
      try { const r = await PB.rpc("printer.objects.query", { objects: { bed_mesh: null } }); mesh = r?.status?.bed_mesh || {}; draw(); }
      catch (e) { box.innerHTML = `<p class="pb-muted">${esc(e.message)}</p>`; }
    }
    q("[data-a=mprobe]").onclick = () => bm("Start a manual probe? The nozzle will move down in steps you choose. The printer must be homed.", "MANUAL_PROBE");
    q("[data-a=clear]").onclick = () => bm("Clear the active mesh?", "BED_MESH_CLEAR");
    q("[data-a=save]").onclick = () => { const n = prompt("Save the current mesh as profile:", "default"); if (n) bm(`Save as "${n}"? Then run SAVE_CONFIG when idle.`, `BED_MESH_PROFILE SAVE="${n}"`); };
    return {
      open() { key = ""; mesh = {}; box.innerHTML = ""; },
      shown: load,
      update(p) {
        const k = JSON.stringify(p.mesh); if (k !== key) { key = k; if (host.offsetParent) load(); }
        live = p.connection === "online" && p.klippy_state === "ready"; printing = p.state === "printing" || p.state === "paused";
        for (const b of host.querySelectorAll("button")) b.disabled = !live || printing;
        if (!p.features?.bed_mesh) box.innerHTML = `<p class="pb-muted">No [bed_mesh] in printer.cfg</p>`;
      },
    };
  },
});
