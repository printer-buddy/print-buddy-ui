// The Settings page, like Fluidd's: one centered column, a small title above each card, rows with the label on the left and the control on the right.
// Fluidd's cards come first (General, Theme, Console, File Browser, Macros, Cameras, Tool, Thermal Presets, Gcode Preview, Version), then this app's own.
(() => {
  const home = name => document.querySelector(`.pb-settings [data-body="${name}"]`);
  const row = (label, control, sub) => `<div class="pb-fo"><span class="pb-lab">${label}${sub ? `<small>${sub}</small>` : ""}</span><span class="bd-sp"></span>${control}</div>`;
  const sw = (key, def) => `<input type="checkbox" class="pb-switch" role="switch" data-c="${key}" data-def="${def ? 1 : ""}">`;
  const when = (ev, fn) => { document.addEventListener(ev, fn); return () => document.removeEventListener(ev, fn); };

  PB.panel("setgeneral", {
    title: "General", desc: "Printer name, time format, shortcuts, confirmations, time-left estimate, tab title and touch-screen sliders", single: true, cls: "adv",
    icon: PB.icon('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
    create(host) {
      host.innerHTML = row("Printer Name", `<input type="text" data-a="name" aria-label="Printer name">`)
        + row("Time format", `<select data-o="pb-clock"><option value="auto">Auto (this device)</option><option value="12">12 hour (3:45 PM)</option><option value="24">24 hour (15:45)</option></select>`)
        + row("Keyboard shortcuts", sw("pb-keys", false), "Press ? on a printer page for the list")
        + row("Require confirm on Emergency Stop", sw("pb-confirm-estop", true))
        + row("Print ETA calculation", `<select data-a="eta"><option value="file">How far through the file</option><option value="slicer">The slicer's estimate</option><option value="filament">Filament used so far</option></select>`)
        + row("Require confirm on cancelling a print", sw("pb-confirm-cancel", true))
        + row("Require confirm on cooling down", sw("pb-confirm-cool", false), "All heaters off")
        + row("Show print progress in the browser tab title", sw("pb-title", true))
        + row("Lock sliders on touch screens", sw("pb-lock", false), "Tap once to unlock, so scrolling can't change them");
      const q = s => host.querySelector(s);
      function fill() {
        q("[data-a=name]").value = PB.current()?.name || "";
        q("[data-o=pb-clock]").value = PB.store.get("pb-clock", "auto");
        for (const c of host.querySelectorAll("[data-c]")) c.checked = !!PB.store.get(c.dataset.c, !!c.dataset.def);
        api("/api/ui/eta").then(r => { q("[data-a=eta]").value = r.mode; }).catch(() => {});
      }
      q("[data-a=name]").onchange = async e => {
        const p = PB.current(), name = e.target.value.trim(); if (!p || !name || name === p.name) return;
        try { printers.set(p.id, await api(`/api/printers/${p.id}`, { method: "PATCH", body: JSON.stringify({ name }) })); render(); toast("Renamed"); } catch (x) { toast(x.message); }
      };
      q("[data-o=pb-clock]").onchange = e => { PB.store.set("pb-clock", e.target.value); try { renderPage(); } catch {} };
      q("[data-a=eta]").onchange = e => api("/api/ui/eta", { method: "PUT", body: JSON.stringify({ mode: e.target.value }) }).then(() => toast("Saved"), x => toast(x.message));
      for (const c of host.querySelectorAll("[data-c]")) c.onchange = () => PB.store.set(c.dataset.c, c.checked);
      return { open: fill, shown: fill };
    },
  });

  // the "Theme from Fluidd or Mainsail" form is built by theme.js into the home page's Settings panel; this card borrows it while the page is open
  PB.panel("settheme", {
    title: "Theme", desc: "Dark mode, and copying a Fluidd or Mainsail theme", single: true, cls: "adv",
    icon: PB.icon('<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18" fill="currentColor"/>'),
    create(host) {
      host.innerHTML = row("Dark mode", `<select data-a="theme"><option value="auto">Auto (follow this device)</option><option value="dark">On</option><option value="light">Off</option></select>`) + `<div class="pb-thmhold"></div>`;
      const sel = host.querySelector("[data-a=theme]"), hold = host.querySelector(".pb-thmhold");
      sel.onchange = () => PB.setTheme(sel.value);
      const take = () => { const n = document.querySelector(".pb-thm"); if (n && n.parentNode !== hold) hold.append(n); sel.value = PB.store.get("pb-theme", "auto"); };
      take();
      return { open: take, shown: take, destroy() { const n = document.querySelector(".pb-thm"); if (n && hold.contains(n)) { const b = home("look"); if (b) b.append(n); else PB.park(n); } } };
    },
  });

  // Fluidd's list cards: the list, and a button that opens the editor this app already has
  const listCard = (id, title, desc, icon, button, get, edit, events) => PB.panel(id, {
    title, desc, single: true, cls: "adv", icon,
    create(host) {
      host.innerHTML = `<div class="pb-sl"></div><div class="pb-sladd"><button type="button" class="pb-pri" data-a="add">${button}</button></div>`;
      const box = host.querySelector(".pb-sl"), add = host.querySelector("[data-a=add]");
      async function draw() {
        let items = []; try { items = await get(); } catch {}
        box.innerHTML = items.length ? `<table class="pb-sit"><tbody>${items.map(([a, b]) => `<tr><td>${esc(a)}</td><td class="r">${esc(b || "")}</td></tr>`).join("")}</tbody></table>` : `<p class="pb-muted">Nothing here yet.</p>`;
      }
      add.onclick = () => edit();
      const off = (events || []).map(e => when(e, draw));
      return { open: draw, shown: draw, destroy() { off.forEach(f => f()); } };
    },
  });
  listCard("setconsole", "Console", "Console filters: lines that match are hidden", PB.icon('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 9l4 3-4 3M12 15h5"/>'), "Add Filter",
    async () => { const f = PB.current() ? await PB.kv.get("console_filters", PB.current().id) : []; return (Array.isArray(f) ? f : []).map(x => [x]); },
    () => { const b = document.querySelector("[data-a=filters]"); if (b) b.click(); else toast("Put the Console card on a page to edit its filters"); }, ["pb-console-filters"]);
  listCard("setmacros", "Macros", "Macro groups", PB.icon('<path d="M4 6h16M4 12h16M4 18h10"/>'), "Add Category",
    () => (PB.macros?.cats() || []).map(c => [c.name]),
    () => { if (PB.macros) PB.macros.organize(); else toast("Put the Macros card on a page to edit its groups"); }, ["pb-macros"]);
  listCard("setcamera", "Cameras", "The printer's cameras and their settings", PB.icon('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>'), "Camera Settings",
    () => { const p = PB.current(); return p ? (p.cams?.length ? p.cams : [{ name: "Camera 1" }]).map(c => [c.name]) : []; },
    () => { const p = PB.current(); if (p) openCamDlg(p.id); }, []);
  listCard("setpresets", "Thermal Presets", "Temperature presets for the heaters", PB.icon('<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>'), "Add Thermal Preset",
    () => (PB.thermalPresets?.get() || []).map(p => [p.name, Object.values(p.temps || {}).filter(v => v !== "" && v != null).join(" / ")]),
    () => { if (PB.thermalPresets) PB.thermalPresets.edit(); else toast("Put the Thermals card on a page to edit its presets"); }, ["pb-presets"]);

  // a card's own options, shown inline (the same switches and menus as its gear)
  const COVERED = new Set(["jobs", "tool", "gcodeview"]);
  const inline = (id, type, title, desc, icon) => PB.panel(id, {
    title, desc, single: true, cls: "adv", icon,
    create(host) {
      function draw() {
        const def = PB.defs[type];
        if (!def?.settings?.length || !PB.cardOptions?.has(type)) { host.innerHTML = `<p class="pb-muted">Put the ${esc(def?.title || type)} card on a page and its options show up here.</p>`; return; }
        const o = { ...Object.fromEntries(def.settings.map(s => [s.k, s.def])), ...PB.cardOptions.get(type) };
        host.innerHTML = def.settings.map(s => row(esc(s.label), s.type === "check" ? `<input type="checkbox" class="pb-switch" role="switch" data-k="${esc(s.k)}"${o[s.k] ? " checked" : ""}>`
          : `<select data-k="${esc(s.k)}">${(s.options || []).map(([v, l]) => `<option value="${esc(String(v))}"${String(o[s.k]) === String(v) ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`)).join("");
        for (const el of host.querySelectorAll("[data-k]")) el.onchange = () => {
          const s = def.settings.find(x => x.k === el.dataset.k), v = PB.cardOptions.get(type);
          v[s.k] = s.type === "check" ? el.checked : ((s.options || []).find(([ov]) => String(ov) === el.value) || [el.value])[0];
          PB.cardOptions.set(type, v);
        };
      }
      return { open: draw, shown: draw };
    },
  });
  inline("setjobs", "jobs", "File Browser", "Whether the Jobs card fills the page height", PB.icon('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'));
  inline("settool", "tool", "Tool", "Jog distances and speeds, Z offset steps, inverted axes", PB.icon('<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>'));
  inline("setgcode", "gcodeview", "Gcode Preview", "2D or 3D, quality, colours, nozzle and travel moves", PB.icon('<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 12l8 4 8-4M4 17l8 4 8-4"/>'));

  // this app's own settings: the notification and AI forms live in the home page's Settings panel; these cards borrow them while this page is open
  const borrow = (type, title, desc, icon, find, back, onShown) => PB.panel(type, {
    title, desc, single: true, cls: "adv", icon,
    create(host) {
      const take = () => { const n = find(); if (n && n.parentNode !== host) host.append(n); if (n) n.hidden = false; return n; };
      take();
      return { shown() { take(); onShown?.(); },
               destroy() { const n = find(); if (n && host.contains(n)) { const b = back(); if (b) b.append(n); else PB.park(n); } } };
    },
  });
  borrow("setalerts", "Notifications", "Where to send alerts when a print finishes or fails", PB.icon('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>'),
    () => document.querySelector("#notifyPanel"), () => home("alerts"), () => { try { loadNotify(); } catch {} });
  borrow("setai", "AI Detection", "Failure detection: how often to look, how sensitive, what to do", PB.icon('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v4"/>'),
    () => document.querySelector("#aiPanel"), () => home("ai"), async () => { try { await loadAI(); if (aiCfg) fillAIForm(); } catch {} });

  PB.panel("setcards", {
    title: "Other Card Options", desc: "The options of the remaining cards (the same as each card's gear), in one list", single: true, cls: "adv",
    icon: PB.icon('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
    create(host) {
      host.innerHTML = `<div class="pb-cardopts"></div>`;
      const box = host.querySelector(".pb-cardopts");
      function draw() {
        const list = Object.values(PB.defs).filter(d => d.settings?.length && PB.cardOptions?.has(d.type) && !COVERED.has(d.type)).sort((a, b) => a.title.localeCompare(b.title));
        box.innerHTML = list.map(d => row(esc(d.title), `<button type="button" data-t="${esc(d.type)}">Options…</button>`, esc(d.desc || ""))).join("") || `<p class="pb-muted">No cards with options.</p>`;
        for (const b of box.querySelectorAll("[data-t]")) b.onclick = () => { const d = PB.defs[b.dataset.t]; PB.settings(d, PB.cardOptions.get(d.type), v => PB.cardOptions.set(d.type, v)); };
      }
      return { shown: draw, open: draw };
    },
  });

  PB.panel("setabout", {
    title: "About", desc: "Printer Buddy's version", single: true, cls: "adv",
    icon: PB.icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
    create(host) {
      host.innerHTML = `<table class="pb-sit"><tbody></tbody></table>`;
      const body = host.querySelector("tbody");
      async function load() {
        let v = {}; try { v = (await api("/api/config")).version || {}; } catch {}
        body.innerHTML = [["Version", v.commit || "?"], ["Branch", v.branch || "?"], ["Updated", v.date || "?"], ["Interface", typeof isBasic === "function" && isBasic() ? "Basic" : "Advanced"], ["Printers", printers.size]]
          .map(([k, x]) => `<tr><th>${k}</th><td>${esc(String(x))}</td></tr>`).join("");
      }
      return { shown: load };
    },
  });
})();
