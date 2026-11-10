// The Jobs card, laid out like Fluidd's: a toolbar (folder path, icons, search) over a sortable table of G-code files and folders.
// Click a file for its menu (print, queue, preview, download, rename, duplicate, remove); click a folder to open it.
PB.panel("jobs", {
  title: "Jobs", desc: "G-code files and folders (like Fluidd's Jobs card)", cls: "adv", flush: true,
  icon: PB.icon('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'),
  create(host) {
    const I = { thumb: PB.icon('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>'),
                cols: PB.icon('<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="16" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/>'),
                find: PB.icon('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'), filter: PB.icon('<path d="M3 5h18l-7 8v6l-4-2v-4z"/>'),
                plus: PB.icon('<path d="M12 5v14M5 12h14"/>'), folder: PB.icon('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
                file: PB.icon('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'),
                full: PB.icon('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'), up: PB.icon('<path d="M6 15l6-6 6 6"/>'), down: PB.icon('<path d="M6 9l6 6 6-6"/>'),
                x: PB.icon('<path d="M6 6l12 12M18 6L6 18"/>') };
    const pad = n => String(n).padStart(2, "0");
    const fdate = t => { if (!t) return "--"; const d = new Date(t * 1000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    const fbytes = n => { if (n == null) return "--"; let i = -1; do { n /= 1024; i++; } while (n > 1024 && i < 3); return `${n.toFixed(1)} ${["kB", "MB", "GB", "TB"][i]}`; };
    const COLS = [
      { k: "print_start_time", label: "Last printed", on: true, get: f => fdate(f.print_start_time) },
      { k: "modified", label: "Modified", on: true, get: f => fdate(f.modified) },
      { k: "size", label: "Size", on: true, get: f => fbytes(f.size), dir: "--" },
      { k: "estimated_time", label: "Print time", on: false, get: f => f.estimated_time ? fmtDur(f.estimated_time) : "--" },
      { k: "filament_total", label: "Filament", on: false, get: f => f.filament_total ? fmtFil(f.filament_total) : "--" },
      { k: "layer_height", label: "Layer height", on: false, get: f => f.layer_height ? `${f.layer_height} mm` : "--" },
      { k: "slicer", label: "Slicer", on: false, get: f => f.slicer || "--" },
    ];
    const saved = PB.store.get("pb-jobs", {});
    const cols = new Set(Array.isArray(saved.cols) ? saved.cols : COLS.filter(c => c.on).map(c => c.k));
    let thumb = +saved.thumb || 32, hideHidden = saved.hideHidden !== false, hidePrinted = !!saved.hidePrinted;
    const keep = () => PB.store.set("pb-jobs", { cols: [...cols], thumb, hideHidden, hidePrinted });
    host.innerHTML = `<div class="pb-jb">
        <div class="pb-jbbar"><span class="pb-jbcrumb"></span><span class="bd-sp"></span>
          <button type="button" data-a="thumb" title="Thumbnail Size" aria-label="Thumbnail Size">${I.thumb}</button>
          <button type="button" data-a="cols" title="Columns" aria-label="Columns">${I.cols}</button>
          <button type="button" data-a="goto" title="Go to file" aria-label="Go to file">${I.find}</button>
          <button type="button" data-a="filter" title="Filter" aria-label="Filter">${I.filter}</button>
          <button type="button" data-a="add" title="Add" aria-label="Add">${I.plus}</button>
          <button type="button" data-a="ref" title="Refresh" aria-label="Refresh">${PB.ic.refresh}</button>
          <span class="pb-jbsearch"><input type="text" spellcheck="false" aria-label="Search the files"><button type="button" data-a="sclear" aria-label="Clear the search" hidden>${I.x}</button><span class="pb-sicon">${I.find}</span></span>
          <input type="file" accept=".gcode,.gco,.g,.gc,.ufp,.nc" multiple hidden></div>
        <div class="pb-jbprog" hidden></div>
        <div class="pb-jbscroll"><table class="pb-jbt"><thead></thead><tbody></tbody></table><p class="pb-jbempty pb-muted" hidden></p></div></div>`;
    const q = s => host.querySelector(s), thead = q("thead"), tbody = q("tbody"), empty = q(".pb-jbempty"), crumb = q(".pb-jbcrumb"), search = q(".pb-jbsearch input"), prog = q(".pb-jbprog"), fileIn = q("input[type=file]");
    // header: a ? with Fluidd's hint, and a button that opens the Jobs tab
    const card = host.closest(".pb-card"), ttl = card?.querySelector(".pb-title");
    if (ttl && !ttl.querySelector(".pb-qhelp")) {
      const qh = PB.el("span", "pb-qhelp"); qh.textContent = "?"; qh.title = "Drag and drop files or folders from outside the browser to upload them here"; qh.onclick = e => e.stopPropagation(); ttl.append(qh);
    }
    const fs = PB.el("button", "", I.full); fs.type = "button"; fs.dataset.a = "full"; fs.dataset.head = ""; fs.title = "Open the full Jobs page"; fs.setAttribute("aria-label", "Open the full Jobs page");
    host.append(fs);
    const railBtn = () => document.querySelector('#page .bd-rail button[title="Jobs"]');
    fs.onclick = () => railBtn()?.click();

    let dir = "", dirs = [], files = [], loaded = false, busy = false, sort = { k: "modified", desc: true }, term = "", wasBusy = false, flash = null;
    const path = n => (dir ? dir + "/" : "") + n;
    async function load() {
      const id = pageId; if (id === null) return;
      loaded = true;
      try {
        const r = await PB.rpc("server.files.get_directory", { path: "gcodes" + (dir ? "/" + dir : ""), extended: true });
        if (id !== pageId) return;
        dirs = r.dirs || []; files = r.files || [];
        draw();
      } catch (e) { if (id === pageId) { dirs = []; files = []; draw(); empty.hidden = false; empty.textContent = e.message; } }
    }
    function drawCrumbs() {
      const parts = dir ? dir.split("/") : [];
      crumb.innerHTML = [`<button type="button" data-d="" title="gcodes"${parts.length ? "" : " disabled"}>${I.folder}</button>`]
        .concat(parts.map((p, i) => `<span class="pb-jbsep">/</span><button type="button" data-d="${esc(parts.slice(0, i + 1).join("/"))}"${i === parts.length - 1 ? " disabled" : ""}>${esc(p)}</button>`)).join("");
      for (const b of crumb.querySelectorAll("[data-d]")) b.onclick = () => { dir = b.dataset.d; load(); };
    }
    function draw() {
      drawCrumbs();
      const colsOn = COLS.filter(c => cols.has(c.k)), t = term.toLowerCase();
      const arrow = k => sort.k === k ? `<i class="pb-srt">${sort.desc ? I.down : I.up}</i>` : "";
      thead.innerHTML = `<tr><th class="ic"></th><th data-s="name"${sort.k === "name" ? ' class="on"' : ""}>Name${arrow("name")}</th>${colsOn.map(c => `<th data-s="${c.k}" class="nw${sort.k === c.k ? " on" : ""}">${c.label}${arrow(c.k)}</th>`).join("")}</tr>`;
      for (const h of thead.querySelectorAll("[data-s]")) h.onclick = () => { sort = { k: h.dataset.s, desc: sort.k === h.dataset.s ? !sort.desc : h.dataset.s !== "name" }; draw(); };
      const val = (it, k) => k === "name" ? it.name.toLowerCase() : (it[k] || 0);
      const cmp = (a, b) => { const x = val(a, sort.k), y = val(b, sort.k), r = typeof x === "string" ? x.localeCompare(y) : x - y; return sort.desc ? -r : r; };
      const hid = n => hideHidden && n.startsWith(".");
      const D = dirs.map(d => ({ dir: true, name: d.dirname, modified: d.modified, size: null })).filter(d => !hid(d.name) && (!t || d.name.toLowerCase().includes(t))).sort(cmp);
      const F = files.map(f => ({ ...f, name: f.filename })).filter(f => !hid(f.name) && !(hidePrinted && f.print_start_time) && (!t || f.name.toLowerCase().includes(t))).sort(cmp);
      const items = [...(dir ? [{ up: true, dir: true, name: ".." }] : []), ...D, ...F];
      tbody.innerHTML = items.map((it, i) => {
        const ic = it.up || it.dir ? `<span class="pb-jbi dir">${I.folder}</span>` : `<img class="pb-jbth" loading="lazy" alt="" src="${PB.thumbUrl(pageId, path(it.name))}" style="max-width:${thumb}px;max-height:${thumb}px"><span class="pb-jbi" hidden>${I.file}</span>`;
        return `<tr data-i="${i}"${flash === it.name ? ' class="flash"' : ""}><td class="ic">${ic}</td><td class="nm">${esc(it.name)}</td>${colsOn.map(c => `<td class="nw">${it.up ? "" : it.dir ? (c.dir || (c.k === "modified" ? fdate(it.modified) : "")) : c.get(it)}</td>`).join("")}</tr>`;
      }).join("");
      empty.hidden = items.length > 0; empty.textContent = "No files found";
      for (const img of tbody.querySelectorAll("img.pb-jbth")) img.onerror = () => { img.hidden = true; img.nextElementSibling.hidden = false; };
      tbody.querySelectorAll("tr").forEach(tr => {
        const it = items[+tr.dataset.i];
        tr.onclick = e => { if (it.up) { dir = dir.split("/").slice(0, -1).join("/"); load(); } else if (it.dir) { dir = path(it.name); load(); } else menu(e, it); };
        tr.oncontextmenu = e => { e.preventDefault(); if (!it.up) menu(e, it); };
      });
      const fl = tbody.querySelector("tr.flash"); if (fl) { fl.scrollIntoView({ block: "center" }); flash = null; }
    }
    // the menu that opens when a row is clicked
    const mn = PB.el("div", "pb-jbmenu"); mn.hidden = true; document.body.append(mn);
    const shut = () => { mn.hidden = true; };
    function menu(e, it) {
      const p = path(it.name), file = !it.dir;
      const rows = file ? [["Print", "print", busy], ["Add to Queue", "queue"], ...(PB.previewFile ? [["Preview G-code", "prev"]] : []), ["Download", "dl"], ["Rename", "ren"], ["Duplicate", "dup"], ["Remove", "del"]]
                        : [["Rename", "ren"], ["Remove", "del"]];
      mn.innerHTML = rows.map(([l, a, off]) => `<button type="button" data-m="${a}"${off ? " disabled" : ""}>${l}</button>`).join("");
      mn.hidden = false;
      mn.style.left = `${Math.max(8, Math.min(e.clientX, innerWidth - mn.offsetWidth - 8))}px`;
      mn.style.top = `${Math.max(8, Math.min(e.clientY, innerHeight - mn.offsetHeight - 8))}px`;
      mn.onclick = async ev => {
        const b = ev.target.closest("[data-m]"); if (!b || b.disabled) return; shut();
        const a = b.dataset.m;
        try {
          if (a === "print") PB.printFile(p);
          else if (a === "queue") {
            if (PB.queueAdd) PB.queueAdd(p);
            else { const r = await api(`/api/printers/${pageId}/queue`, { method: "POST", body: JSON.stringify({ action: "add", filenames: [p] }) }); toast(`Queued ${it.name} (${r.jobs.length} in the queue)`); }
          } else if (a === "prev") PB.previewFile(p);
          else if (a === "dl") { const l = PB.el("a"); l.href = PB.fileUrl("gcodes", p, true); l.download = it.name; document.body.append(l); l.click(); l.remove(); }
          else if (a === "ren") {
            const name = prompt("New name:", it.name); if (!name || name === it.name || name.includes("/")) return;
            await PB.rpc("server.files.move", { source: `gcodes/${p}`, dest: `gcodes/${path(name)}` }); load();
          } else if (a === "dup") {
            const dot = it.name.lastIndexOf("."), def = dot > 0 ? `${it.name.slice(0, dot)}_copy${it.name.slice(dot)}` : `${it.name}_copy`;
            const name = prompt("Name of the copy:", def); if (!name || name === it.name || name.includes("/")) return;
            await PB.rpc("server.files.copy", { source: `gcodes/${p}`, dest: `gcodes/${path(name)}` }); toast(`Copied to ${name}`); load();
          } else if (a === "del") {
            if (file) { if (!confirm(`Delete ${it.name}?`)) return; await PB.rpc("server.files.delete_file", { path: `gcodes/${p}` }); }
            else { if (!confirm(`Delete the folder ${it.name} and everything in it?`)) return; await PB.rpc("server.files.delete_directory", { path: `gcodes/${p}`, force: true }); }
            load();
          }
        } catch (err) { toast(err.message); }
      };
    }
    // small pop-ups under the toolbar icons (thumbnail size, columns, filter, add)
    const pop = PB.el("div", "pb-jbpop"); pop.hidden = true; document.body.append(pop);
    let popFor = null;
    const closePop = () => { pop.hidden = true; popFor = null; };
    function openPop(btn, html, wire) {
      if (popFor === btn && !pop.hidden) return closePop();
      pop.innerHTML = html; wire(); pop.hidden = false; popFor = btn;
      const r = btn.getBoundingClientRect();
      pop.style.top = `${r.bottom + 4}px`; pop.style.left = `${Math.max(8, Math.min(r.right - pop.offsetWidth, innerWidth - pop.offsetWidth - 8))}px`;
    }
    q("[data-a=thumb]").onclick = e => openPop(e.currentTarget, `<label class="pb-jbsl"><span>Thumbnail Size</span><output>${thumb} px</output><input type="range" min="32" max="192" step="16" value="${thumb}"></label>`, () => {
      const r = pop.querySelector("input"), o = pop.querySelector("output");
      r.oninput = () => { thumb = +r.value; o.textContent = `${thumb} px`; keep(); draw(); };
    });
    q("[data-a=cols]").onclick = e => openPop(e.currentTarget, COLS.map(c => `<label class="pb-jbck"><input type="checkbox" data-c="${c.k}"${cols.has(c.k) ? " checked" : ""}> ${c.label}</label>`).join(""), () => {
      for (const c of pop.querySelectorAll("[data-c]")) c.onchange = () => { if (c.checked) cols.add(c.dataset.c); else cols.delete(c.dataset.c); keep(); draw(); };
    });
    q("[data-a=filter]").onclick = e => openPop(e.currentTarget, `<label class="pb-jbck"><input type="checkbox" data-f="printed"${hidePrinted ? " checked" : ""}> Filter printed</label>
        <label class="pb-jbck"><input type="checkbox" data-f="hidden"${hideHidden ? " checked" : ""}> Filter hidden files and folders</label>`, () => {
      for (const c of pop.querySelectorAll("[data-f]")) c.onchange = () => { if (c.dataset.f === "printed") hidePrinted = c.checked; else hideHidden = c.checked; keep(); draw(); };
    });
    q("[data-a=add]").onclick = e => openPop(e.currentTarget, `<button type="button" data-u="up">Upload</button><button type="button" data-u="upprint">Upload and Print</button><button type="button" data-u="dir">Add Directory</button>`, () => {
      for (const b of pop.querySelectorAll("[data-u]")) b.onclick = async () => {
        closePop();
        if (b.dataset.u === "dir") {
          const name = prompt("New folder name:"); if (!name || name.includes("/")) return;
          try { await PB.rpc("server.files.post_directory", { path: `gcodes/${path(name)}` }); load(); } catch (err) { toast(err.message); }
        } else { fileIn.dataset.start = b.dataset.u === "upprint" ? "1" : ""; fileIn.click(); }
      };
    });
    q("[data-a=ref]").onclick = load;
    // go to file: find a file in any folder and jump to it
    const gd = PB.el("dialog", "bd-lib pb-xd pb-jbgo"); document.body.append(gd);
    q("[data-a=goto]").onclick = async () => {
      gd.innerHTML = `<div class="pb-ptop"><h3>Go to file</h3><button type="button" class="pb-px" aria-label="Close">${PB.ic.x}</button></div>
        <input type="search" placeholder="Search" aria-label="Search all files"><div class="pb-jbgl pb-muted">Loading…</div>`;
      gd.querySelector(".pb-px").onclick = () => gd.close();
      gd.showModal();
      const list = gd.querySelector(".pb-jbgl"), box = gd.querySelector("input");
      let all = [];
      try { all = (await PB.rpc("server.files.list", { root: "gcodes" })) || []; } catch (err) { list.textContent = err.message; return; }
      const show = () => {
        const t = box.value.trim().toLowerCase(), hits = all.filter(f => !t || (f.path || "").toLowerCase().includes(t)).sort((a, b) => (b.modified || 0) - (a.modified || 0)).slice(0, 60);
        list.className = "pb-jbgl"; list.innerHTML = hits.length ? hits.map(f => `<button type="button" data-p="${esc(f.path)}">${esc(f.path)}</button>`).join("") : `<span class="pb-muted">No files found</span>`;
        for (const b of list.querySelectorAll("[data-p]")) b.onclick = () => { const p = b.dataset.p; dir = p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : ""; flash = p.split("/").pop(); term = ""; search.value = ""; gd.close(); load(); };
      };
      box.oninput = show; show(); box.focus();
    };
    search.oninput = () => { term = search.value.trim(); q("[data-a=sclear]").hidden = !term; q(".pb-sicon").hidden = !!term; draw(); };
    q("[data-a=sclear]").onclick = () => { search.value = ""; search.oninput(); search.focus(); };
    // upload (also used by dropping files on the page)
    async function upload(list, start) {
      const id = pageId;
      for (const [n, file] of list.entries()) {
        if (id !== pageId) return;
        await new Promise(done => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `/api/printers/${id}/files/upload?name=${encodeURIComponent(file.name)}&dir=${encodeURIComponent(dir)}&print=${start ? 1 : 0}`);
          prog.hidden = false;
          xhr.upload.onprogress = ev => { if (ev.lengthComputable) prog.textContent = `Uploading ${n + 1}/${list.length}: ${file.name}… ${Math.round(ev.loaded / ev.total * 100)}%`; };
          xhr.onload = () => {
            let err = null; try { err = JSON.parse(xhr.responseText).error; } catch {}
            if (xhr.status >= 200 && xhr.status < 300) toast(start ? `Uploaded and started ${file.name}` : `Uploaded ${file.name}`);
            else toast(`${file.name}: upload failed: ${err || `HTTP ${xhr.status}`}`);
            done();
          };
          xhr.onerror = () => { toast(`${file.name}: upload failed (network)`); done(); };
          xhr.send(file);
        });
      }
      prog.hidden = true;
      if (id === pageId) load();
    }
    fileIn.onchange = e => { const l = [...e.target.files], start = !!fileIn.dataset.start && l.length === 1; e.target.value = ""; upload(l, start); };
    PB.uploadFiles = l => upload(l, false);
    const outside = e => { if (!mn.hidden && !mn.contains(e.target)) shut(); if (!pop.hidden && !pop.contains(e.target) && !e.target.closest(`[data-a=${popFor?.dataset.a}]`)) closePop(); };
    const onKey = e => { if (e.key === "Escape") { shut(); closePop(); } };
    const onScroll = e => { if (!mn.hidden && !mn.contains(e.target)) shut(); };
    document.addEventListener("pointerdown", outside, true); document.addEventListener("keydown", onKey); addEventListener("scroll", onScroll, true);
    return {
      open() { dirs = []; files = []; dir = ""; loaded = false; term = ""; search.value = ""; thead.innerHTML = tbody.innerHTML = ""; drawCrumbs(); },
      shown() { if (!loaded) load(); },
      update(p) {
        busy = p.state === "printing" || p.state === "paused";
        if (!loaded && p.connection === "online") load();
        if (wasBusy && !busy) load();
        wasBusy = busy;
        const on = p.connection === "online";
        for (const b of host.querySelectorAll(".pb-jbbar button")) if (!b.closest(".pb-jbcrumb")) b.disabled = !on;
        const rb = railBtn(); fs.hidden = !rb || rb.getAttribute("aria-current") === "true";
      },
      destroy() { document.removeEventListener("pointerdown", outside, true); document.removeEventListener("keydown", onKey); removeEventListener("scroll", onScroll, true); mn.remove(); pop.remove(); gd.remove(); },
    };
  },
});
