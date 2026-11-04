const CHEV = PB.icon('<path d="M6 9l6 6 6-6"/>');
PB.panel("macros", {
  title: "Macros", desc: "Your printer's macros as buttons, in groups you choose", cls: "adv",
  icon: PB.icon('<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>'),
  create(host) {
    host.innerHTML = `<div class="pb-macgroups"><span class="pb-muted">Loading…</span></div>
      <div class="pb-maclinks"><button type="button" class="pb-link" data-a="edit">Hide some…</button><button type="button" class="pb-link" data-a="org">Organize…</button><button type="button" class="pb-link" data-a="show" hidden></button></div>`;
    const box = host.querySelector(".pb-macgroups");
    let list = [], count = -1, pid = null, wasBusy = null;
    const store = k => PB.store.get(k, {});
    const hidden = () => store("pb-macros-hidden")[pid] || [];
    const cfg = () => { const c = store("pb-macros-cfg")[pid] || {}; return { cats: c.cats || [], assign: c.assign || {}, lock: c.lock || {}, fold: c.fold || {} }; };
    const saveCfg = c => { const all = store("pb-macros-cfg"); all[pid] = c; PB.store.set("pb-macros-cfg", all); };
    const busy = () => { const p = PB.current(); return !!p && (p.state === "printing" || p.state === "paused"); };
    async function load(id) {
      pid = id;
      try { list = (await api(`/api/printers/${id}/macros`)).macros || []; } catch { list = []; }
      if (id === pageId) draw();
    }
    const macBtn = (m, locked) => {
      const dis = locked ? " disabled" : "", tip = locked ? "Locked while a print is running" : m.description || m.name;
      return `<span class="pb-mac"><button type="button" data-mac="${esc(m.name)}"${dis} title="${esc(tip)}">${esc(m.name.replaceAll("_", " "))}</button>${m.params?.length ? `<button type="button" class="arr" data-par="${esc(m.name)}"${dis} title="Parameters: ${esc(m.params.map(x => x.name).join(", "))}">${CHEV}</button>` : ""}<button type="button" class="x" data-hide="${esc(m.name)}" title="Hide">${PB.ic.x}</button></span>`;
    };
    function draw() {
      const hid = hidden(), c = cfg(), lockNow = busy();
      const shown = list.filter(m => !hid.includes(m.name)), ids = new Set(c.cats.map(k => k.id));
      const groups = [{ id: "", macros: shown.filter(m => !ids.has(c.assign[m.name])) },
        ...c.cats.map(k => ({ ...k, macros: shown.filter(m => c.assign[m.name] === k.id) }))].filter(g => g.macros.length);
      box.innerHTML = groups.length ? groups.map(g => {
        const body = `<div class="pb-macs">${g.macros.map(m => macBtn(m, lockNow && c.lock[m.name])).join("")}</div>`;
        return g.id ? `<div class="pb-maccat${c.fold[g.id] ? " fold" : ""}"><button type="button" class="pb-maccath" data-fold="${esc(g.id)}" aria-expanded="${!c.fold[g.id]}">${CHEV}<span>${esc(g.name)}</span><small>${g.macros.length}</small></button>${body}</div>` : body;
      }).join("") : `<span class="pb-muted">${list.length ? "All macros are hidden." : "No macros on this printer."}</span>`;
      const show = host.querySelector("[data-a=show]");
      show.hidden = !hid.length; show.textContent = `Show hidden (${hid.length})`;
      const ask = name => !busy() || confirm(`Run ${name} while a print is running?`);
      for (const b of box.querySelectorAll("[data-mac]")) b.onclick = () => {
        if (!PB.current() || !ask(b.dataset.mac)) return;
        gcode(b.dataset.mac); toast(`Sent ${b.dataset.mac}`);
      };
      for (const b of box.querySelectorAll("[data-par]")) b.onclick = () => {
        if (!PB.current() || !ask(b.dataset.par)) return;
        form(list.find(x => x.name === b.dataset.par), b);
      };
      for (const b of box.querySelectorAll("[data-hide]")) b.onclick = () => {
        const all = store("pb-macros-hidden"); (all[pid] ||= []).push(b.dataset.hide); PB.store.set("pb-macros-hidden", all); draw();
      };
      for (const b of box.querySelectorAll("[data-fold]")) b.onclick = () => {
        const k = cfg(); k.fold[b.dataset.fold] = !k.fold[b.dataset.fold]; saveCfg(k); draw();
      };
    }
    const params = PB.parts.macroParams(), form = params.form;

    const RULES = [
      ["Print", /^(START_PRINT|PRINT_START|END_PRINT|PRINT_END|PAUSE|RESUME|CANCEL_PRINT|CLEAR_PAUSE|QUICK_START|SET_PAUSE_|SET_PRINT_STATS_INFO|PRINT_|M(PAUSE|RESUME)|SDCARD_|LAYER|EXCLUDE_)/],
      ["Calibration", /(CALIBRAT|^PID_|BED_MESH|LOAD_CELL|EXCITATE|SHAPER|RESONANC|MEASURE_AXES|AXES_MAP|^Z_|SCREWS|QGL|QUAD_GANTRY|PROBE|LEVEL|OFFSET|TUNE|ADAPTIVE)/],
      ["Motion", /^(HOME|G28|G32|PARK|CENTER|MOVE|FORCE_MOVE|M84|M18|MOTORS?_|DOCK|UNDOCK|ATTACH|DETACH|ENDSTOP|STEPPER)/],
      ["Filament", /(FILAMENT|^M60[01]$|^T\d+$|PURGE|PRIME|SPOOL|NOZZLE_CLEAN|CLEAN_NOZZLE|BRUSH|WIPE|RETRACT)/],
      ["Temperature", /^(M104|M109|M140|M141|M190|M191|SET_HEATER|SET_TEMP|TURN_O(N|FF)_FANS|M10[67]|PREHEAT|COOLDOWN|HEAT|SOAK|FAN|SET_FAN|TEMPERATURE)/],
      ["Camera", /(CAMERA|TIMELAPSE|WEBCAM)/],
      ["Lights", /((^|_)(LED|LEDS|LIGHT|LIGHTS|NEOPIXEL)(_|$)|^STATUS_(?!REPORT))/],
      ["System", /^(CHECK_|SUPPORT_ZIP|CONFIG_|BEEP|M300|REBOOT|RESTART|FIRMWARE_|UPDATE|SAVE_CONFIG|BACKUP|SHUTDOWN|REPORT|DUMP_|SHOW_|GET_|TEST_|STATUS_REPORT|SYSTEM)/],
    ];
    const prefixOf = name => { const m = /^([A-Z][A-Z0-9]{2,})_/.exec(name.toUpperCase()); return m ? m[1] : ""; };
    function suggest() {
      const c = cfg(); let n = 0;
      const todo = list.filter(m => !(c.assign[m.name] && c.cats.some(k => k.id === c.assign[m.name])));
      const put = (m, name) => {
        let cat = c.cats.find(k => k.name === name);
        if (!cat) { cat = { id: "g" + name.toLowerCase().replace(/[^a-z0-9]/g, ""), name }; c.cats.push(cat); }
        c.assign[m.name] = cat.id; n++;
      };
      const rest = [];
      for (const m of todo) {
        if (m.name.startsWith("_")) continue;
        const hit = RULES.find(([, re]) => re.test(m.name.toUpperCase()));
        if (hit) put(m, hit[0]); else rest.push(m);
      }
      const byPre = {};
      for (const m of rest) { const p = prefixOf(m.name); if (p) (byPre[p] ||= []).push(m); }
      for (const [p, ms] of Object.entries(byPre)) if (ms.length > 1) for (const m of ms) put(m, p.length <= 4 ? p : p[0] + p.slice(1).toLowerCase());
      saveCfg(c); draw(); organize();
      toast(n ? `Grouped ${n} macro${n > 1 ? "s" : ""}. Change any of them below.` : "Nothing new to group");
    }

    const dlg = PB.el("dialog", "bd-lib pb-orgdlg"); document.body.append(dlg);
    function organize() {
      const c = cfg(), keep = dlg.querySelector(".pb-orglist")?.scrollTop || 0;
      dlg.innerHTML = `<h3>Organize macros</h3>
        <p class="pb-muted">Put macros in groups. A locked macro is greyed out while a print is running.</p>
        <div class="pb-orgcats">${c.cats.map(k => `<div class="pb-orgcat"><input data-cat="${esc(k.id)}" value="${esc(k.name)}" aria-label="Group name" autocomplete="off"><button type="button" data-delcat="${esc(k.id)}" title="Delete this group" aria-label="Delete this group">${PB.ic.x}</button></div>`).join("")}
          <form class="pb-orgadd"><input name="n" placeholder="New group" aria-label="New group name" autocomplete="off"><button type="submit">Add</button></form>
          <button type="button" class="pb-link" data-a="auto" title="Sort ungrouped macros into groups by their names">Suggest groups</button></div>
        <div class="pb-orghead"><span>Macro</span><span>Group</span><span title="Greyed out while a print is running">Lock</span></div>
        <div class="pb-orglist">${list.map(m => `<div class="pb-orgrow"><span class="pb-orgname">${esc(m.name)}</span>
          <select data-as="${esc(m.name)}" aria-label="Group for ${esc(m.name)}"><option value="">None</option>${c.cats.map(k => `<option value="${esc(k.id)}"${c.assign[m.name] === k.id ? " selected" : ""}>${esc(k.name)}</option>`).join("")}</select>
          <input type="checkbox" data-lock="${esc(m.name)}" aria-label="Lock ${esc(m.name)} while printing"${c.lock[m.name] ? " checked" : ""}></div>`).join("")}</div>
        <div class="bd-libfoot"><button type="button" class="bd-primary" data-a="done">Done</button></div>`;
      dlg.querySelector(".pb-orglist").scrollTop = keep;
      if (!dlg.open) dlg.showModal();
    }
    dlg.addEventListener("change", e => {
      const c = cfg(), t = e.target;
      if (t.dataset.cat) { const k = c.cats.find(x => x.id === t.dataset.cat); if (k) k.name = t.value.trim() || k.name; }
      else if (t.dataset.as !== undefined) { if (t.value) c.assign[t.dataset.as] = t.value; else delete c.assign[t.dataset.as]; }
      else if (t.dataset.lock !== undefined) { if (t.checked) c.lock[t.dataset.lock] = true; else delete c.lock[t.dataset.lock]; }
      else return;
      saveCfg(c); draw(); organize();
    });
    dlg.addEventListener("submit", e => {
      e.preventDefault();
      const n = e.target.n.value.trim(); if (!n) return;
      const c = cfg(); c.cats.push({ id: "g" + Date.now().toString(36), name: n }); saveCfg(c); draw(); organize();
    });
    dlg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.a === "done") return dlg.close();
      if (b.dataset.a === "auto") return suggest();
      if (b.dataset.delcat) {
        const c = cfg(); c.cats = c.cats.filter(k => k.id !== b.dataset.delcat);
        for (const m of Object.keys(c.assign)) if (c.assign[m] === b.dataset.delcat) delete c.assign[m];
        saveCfg(c); draw(); organize();
      }
    });

    host.querySelector("[data-a=edit]").onclick = e => { const on = host.classList.toggle("pb-macedit"); e.target.textContent = on ? "Done" : "Hide some…"; };
    host.querySelector("[data-a=org]").onclick = () => { if (list.length) organize(); else toast("No macros to organize yet"); };
    host.querySelector("[data-a=show]").onclick = () => { const all = store("pb-macros-hidden"); delete all[pid]; PB.store.set("pb-macros-hidden", all); draw(); };
    return {
      open() { pid = null; count = -1; wasBusy = null; },
      destroy() { params.destroy(); dlg.remove(); },
      update(p) {
        if ((pid !== p.id || p.macro_count !== count) && p.connection === "online") { count = p.macro_count; load(p.id); }
        const b = p.state === "printing" || p.state === "paused";
        if (b !== wasBusy) { wasBusy = b; if (list.length) draw(); }
      },
    };
  },
});
