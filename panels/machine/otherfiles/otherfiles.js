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
// Fluidd's "Other Files": a read-only browser for the logs, docs and config-examples roots. Reuses the config
// file browser's parts (list, preview, download); never editable, so no add/rename/delete.
PB.panel("otherfiles", {
  title: "Other files", desc: "Browse logs, docs and config examples; view and download", cls: "adv",
  icon: PB.icon('<path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>'),
  create(host, cfg) {
    host.innerHTML = `<div class="pb-tool">
        <select data-a="root" aria-label="Folder"><option value="logs">Logs</option><option value="docs">Docs</option><option value="config_examples">Config examples</option></select>
        <input type="search" placeholder="Search…" aria-label="Search this folder">
        <button type="button" data-a="add" hidden>+ Add</button><button type="button" data-a="filter">Filter</button>
        <button type="button" data-a="goto" title="Go to file" aria-label="Go to file">${PB.ic.search}</button>
        <span class="pb-clow" hidden>${PB.ic.alert}</span>
        <button type="button" data-a="refresh" data-head title="Refresh" aria-label="Refresh">${PB.ic.refresh}</button></div>
      <div class="pb-bulk" hidden><b class="pb-bn"></b><span class="bd-sp"></span><button type="button" data-b="zip">Zip</button><button type="button" data-b="del" class="pb-danger">Delete</button></div>
      <div class="pb-crumbs"></div><div class="pb-ccount pb-muted" aria-live="polite"></div>
      <div class="pb-cwrap"><div class="pb-chead"></div><div class="pb-cfiles"></div></div>
      <input type="file" data-u="files" multiple hidden><input type="file" data-u="dir" webkitdirectory hidden>`;
    const q = s => host.querySelector(s);
    const pop = PB.el("div", "pb-cmenu"); pop.hidden = true; ($("#page") || document.body).append(pop);
    const outside = e => { if (!pop.contains(e.target)) shut(); };
    const onKey = e => { if (e.key === "Escape") shut(); };
    function shut() { pop.hidden = true; removeEventListener("pointerdown", outside, true); removeEventListener("keydown", onKey, true); }
    function menu(at, items) {
      items = items.filter(Boolean); if (!items.length) return;
      pop.innerHTML = items.map((it, i) => it.check != null
        ? `<label class="bd-check"><input type="checkbox" data-i="${i}"${it.check ? " checked" : ""}> ${esc(it.label)}</label>`
        : `<button type="button" data-i="${i}"${it.danger ? ' class="pb-danger"' : ""}>${it.icon || ""}${esc(it.label)}</button>`).join("");
      for (const b of pop.querySelectorAll("[data-i]")) {
        const it = items[b.dataset.i];
        if (it.check != null) b.onchange = () => it.run(b.checked); else b.onclick = () => { shut(); it.run(); };
      }
      pop.hidden = false;
      const r = at instanceof Event ? { left: at.clientX, bottom: at.clientY } : at.getBoundingClientRect();
      pop.style.left = `${Math.max(4, Math.min(r.left, innerWidth - pop.offsetWidth - 4))}px`;
      pop.style.top = `${Math.max(4, Math.min(r.bottom, innerHeight - pop.offsetHeight - 4))}px`;
      addEventListener("pointerdown", outside, true); addEventListener("keydown", onKey, true);
    }
    const c = {
      q, menu, root: "logs", dir: "", dirs: [], files: [], rows: [], disk: null, err: "", loaded: false, picked: new Set(),
      full: n => (c.dir ? c.dir + "/" : "") + n, path: n => `${c.root}/${c.full(n)}`, ro: () => true,
    };
    c.ed = PB.parts.cfgEditor(cfg, () => c.load());
    const br = PB.parts.cfgBrowse(c), act = PB.parts.cfgActions(c);
    q("[data-a=refresh]").onclick = () => c.load();
    return {
      open() { c.ed.reset(); shut(); Object.assign(c, { root: "logs", dir: "", dirs: [], files: [], disk: null, err: "", loaded: false }); c.picked.clear(); q("[data-a=root]").value = "logs"; c.draw(); },
      shown() { if (!c.loaded) c.load(); },
      update(p) { c.ed.setBusy(p.state === "printing" || p.state === "paused" || p.connection !== "online"); },
      destroy() { c.ed.destroy(); br.destroy(); act.destroy(); shut(); pop.remove(); },
    };
  },
});
