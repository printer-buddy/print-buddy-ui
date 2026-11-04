PB.panel("database", {
  title: "Database backup", desc: "Back up and restore Moonraker's database (history, spools, settings)", cls: "adv", single: true,
  icon: PB.icon('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'),
  create(host) {
    host.innerHTML = `<div class="pb-dbl"></div><div class="pb-msg pb-muted"></div>
      <div class="pb-row"><button type="button" class="pb-pri" data-a="make">Create backup</button><button type="button" data-a="compact" title="Shrink the database file">Compact database</button></div>`;
    const list = host.querySelector(".pb-dbl"), msg = host.querySelector(".pb-msg");
    let backups = [], working = false;
    const printing = () => { const p = PB.current(); return !!p && (p.state === "printing" || p.state === "paused"); };
    const stamp = () => { const d = new Date(), z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}-${z(d.getSeconds())}.db`; };
    function draw() {
      const off = printing() || working;
      list.innerHTML = backups.length ? backups.map(n => `<div class="pb-dbrow"><span class="pb-dbname">${esc(n)}</span>
        <button type="button" data-restore="${esc(n)}" title="Restore this backup"${off ? " disabled" : ""} aria-label="Restore ${esc(n)}">${PB.ic.refresh}</button>
        <button type="button" data-del="${esc(n)}" title="Delete this backup" aria-label="Delete ${esc(n)}"${working ? " disabled" : ""}>${PB.ic.x}</button></div>`).join("") : "";
      msg.textContent = backups.length ? "" : "No backups yet.";
      for (const b of host.querySelectorAll("[data-a=make], [data-a=compact]")) b.disabled = off;
      for (const b of list.querySelectorAll("[data-restore]")) b.onclick = () => {
        if (confirm(`Restore ${b.dataset.restore}?\n\nEverything in Moonraker's database (print history, spools, saved settings) is replaced by this backup.`))
          run(() => PB.rpc("server.database.restore", { filename: b.dataset.restore }), "Backup restored");
      };
      for (const b of list.querySelectorAll("[data-del]")) b.onclick = () => {
        if (confirm(`Delete ${b.dataset.del}?`)) run(() => PB.rpc("server.database.delete_backup", { filename: b.dataset.del }), "Backup deleted");
      };
    }
    async function load() {
      const id = pageId; if (id === null) return;
      try { const r = await PB.rpc("server.database.list"); if (id === pageId) backups = (r?.backups || []).slice().sort().reverse(); }
      catch (e) { if (id === pageId) { backups = []; msg.textContent = e.message; list.innerHTML = ""; return; } }
      draw();
    }
    async function run(fn, done) {
      working = true; draw();
      try { await fn(); toast(done); } catch (e) { toast(e.message); }
      working = false; await load();
    }
    host.querySelector("[data-a=make]").onclick = () => run(() => PB.rpc("server.database.post_backup", { filename: stamp() }), "Backup created");
    host.querySelector("[data-a=compact]").onclick = () => run(() => PB.rpc("server.database.compact"), "Database compacted");
    return {
      open() { backups = []; list.innerHTML = ""; msg.textContent = ""; },
      shown() { load(); },
      update() { draw(); },
    };
  },
});
