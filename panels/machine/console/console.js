PB.panel("console", {
  title: "Console", desc: "Klipper replies and a G-code input", cls: "adv", flush: true, gear: true,
  icon: PB.icon('<path d="M4 17l6-5-6-5M12 19h8"/>'),
  settings: [
    { k: "height", label: "Height", type: "select", def: 300, options: [[120, "Small"], [180, "Medium"], [300, "Like Fluidd (300)"], [480, "Tall"], [640, "Very tall"]] },
    { k: "temps", label: "Hide temperature reports (ok T:… B:…)", type: "check", def: true },
    { k: "lines", label: "Lines kept on screen", type: "select", def: 200, options: [[80, "80"], [200, "200"], [500, "500"]] },
  ],
  create(host, cfg) {
    const I = { down: PB.icon('<path d="M12 5v14M5 12l7 7 7-7"/>'), filter: PB.icon('<path d="M3 5h18l-7 8v6l-4-2v-4z"/>'),
                find: PB.icon('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
                dockBottom: PB.icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15h18"/>'),
                dockTop: PB.icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>') };
    host.innerHTML = `<div class="pb-ctool"><span class="bd-sp"></span>
        <button type="button" data-a="scroll" title="Scroll to latest" aria-label="Scroll to latest" hidden>${I.down}</button>
        <button type="button" data-a="flip" title="Flip layout" aria-label="Flip layout">${I.dockBottom}</button>
        <button type="button" data-a="filters" title="Hide lines that match your filters" aria-label="Filters">${I.filter}<span class="pb-fn"></span></button>
        <button type="button" data-a="clear" title="Clear" aria-label="Clear">${PB.ic.trash}</button>
        <span class="pb-csearch"><input type="text" spellcheck="false" placeholder="Search" aria-label="Search the console"><button type="button" data-a="sclear" aria-label="Clear the search" hidden>${PB.ic.x}</button><span class="pb-sicon">${I.find}</span></span></div>
      <div class="pb-log" role="log" aria-label="Klipper console"></div>
      <form class="pb-cin"><span class="pb-cwrap"><input autocomplete="off" spellcheck="false" aria-label="G-code command" title="Enter help for commands. Tab completes. ↑ and ↓ step through history."><button type="button" class="pb-cx" aria-label="Clear the command" hidden>${PB.ic.x}</button></span><button>Send</button></form>`;
    const helpBtn = PB.el("button", "", PB.ic.list); helpBtn.type = "button"; helpBtn.dataset.a = "help"; helpBtn.dataset.head = ""; helpBtn.title = "Commands: every command Klipper knows"; helpBtn.setAttribute("aria-label", "Commands");
    host.append(helpBtn);
    // like Fluidd: a ? after the title with the hints, and a button that opens the full Console tab
    const card = host.closest(".pb-card"), ttl = card?.querySelector(".pb-title");
    if (ttl && !ttl.querySelector(".pb-qhelp")) {
      const qh = PB.el("span", "pb-qhelp"); qh.textContent = "?"; qh.title = ["Enter help for commands", "Use Tab for autocomplete", "Use ↑ and ↓ for history"].join("\n");
      qh.onclick = e => e.stopPropagation(); ttl.append(qh);
    }
    const fsBtn = PB.el("button", "", PB.icon('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')); fsBtn.type = "button"; fsBtn.dataset.a = "full"; fsBtn.dataset.head = ""; fsBtn.title = "Open the full Console page"; fsBtn.setAttribute("aria-label", "Open the full Console page");
    host.append(fsBtn);
    const railBtn = () => document.querySelector('#page .bd-rail button[title="Console"]');
    fsBtn.onclick = () => railBtn()?.click();
    const dl = PB.el("datalist"); dl.id = "pb-cmds-" + Math.random().toString(36).slice(2, 7); host.append(dl);
    const q = s => host.querySelector(s), logEl = q(".pb-log"), input = q(".pb-cin input"), form = q("form"), search = q(".pb-csearch input");
    logEl.style.height = `${cfg.height}px`;
    let filters = [], auto = true, hist = -1, help = {}, flipped = !!PB.store.get("pb-console-flip", false), term = "";
    const atLatest = () => flipped ? logEl.scrollTop <= 4 : logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 4;
    const toLatest = () => { logEl.scrollTop = flipped ? 0 : logEl.scrollHeight; };
    const clock = t => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: typeof hour12 === "function" ? hour12() === true : false });
    async function commands(id) {
      try {
        const h = await PB.rpc("printer.gcode.help");
        if (id === pageId) help = h || {};
        if (id === pageId) dl.innerHTML = Object.entries(h || {}).sort().map(([c, d]) => `<option value="${esc(c)}">${esc(d || "")}</option>`).join("");
      } catch {}
    }
    // text with the search term marked, and Klipper command names in a reply made clickable (like Fluidd)
    function nodes(text, links) {
      const out = [], mark = s => {
        if (!term) return [document.createTextNode(s)];
        const parts = [], low = s.toLowerCase(), t = term.toLowerCase(); let at = 0, i;
        while ((i = low.indexOf(t, at)) >= 0) {
          if (i > at) parts.push(document.createTextNode(s.slice(at, i)));
          const m = PB.el("mark"); m.textContent = s.slice(i, i + t.length); parts.push(m); at = i + t.length;
        }
        if (at < s.length) parts.push(document.createTextNode(s.slice(at)));
        return parts;
      };
      if (!links) return mark(text);
      let at = 0;
      for (const m of text.matchAll(/[A-Z_][A-Z0-9_.]+/g)) {
        if (!(m[0] in help)) continue;
        if (m.index > at) out.push(...mark(text.slice(at, m.index)));
        const a = PB.el("a", "pb-cmd"); a.textContent = m[0]; a.onclick = () => { input.value = m[0]; syncX(); input.focus(); };
        out.push(a); at = m.index + m[0].length;
      }
      if (at < text.length) out.push(...mark(text.slice(at)));
      return out;
    }
    function draw() {
      const hidden = flt.hidden(), t = term.toLowerCase();
      let log = (conLogs.get(pageId) || []).filter(l => l.kind === "sent" || l.kind === "err" || !hidden(l.text)).slice(-cfg.lines);
      if (t) log = log.filter(l => l.text.toLowerCase().includes(t));
      if (flipped) log = log.slice().reverse();
      logEl.innerHTML = log.length ? "" : `<div class="pb-muted">${t ? "Nothing matches." : "Klipper's replies show up here."}</div>`;
      for (const { kind, text, t: at } of log) {
        const bad = kind === "err" || kind === "error" || text.startsWith("!!"), sent = kind === "sent";
        const d = PB.el("div", `pb-cl ${sent ? "sent" : bad ? "error" : ""}`);
        if (at) { const s = PB.el("span", "pb-lt"); s.textContent = clock(at); d.append(s); }
        const m = PB.el("span", "pb-lm");
        if (sent) {
          const cmd = text.replace(/^>\s*/, "");
          m.append("$ ", ...nodes(cmd, false));
          d.title = "Click to put this command back in the box"; d.onclick = () => { input.value = cmd; syncX(); input.focus(); };
        } else m.append(...nodes(text, !bad));
        d.append(m); logEl.append(d);
      }
      if (auto) toLatest();
      q("[data-a=scroll]").hidden = auto;
      q(".pb-fn").textContent = filters.length ? ` ${filters.length}` : "";
    }
    const syncX = () => { q(".pb-cx").hidden = !input.value; };
    function applyFlip() {
      q("[data-a=flip]").innerHTML = flipped ? I.dockTop : I.dockBottom;
      q("[data-a=flip]").setAttribute("aria-pressed", String(flipped));
      if (flipped) logEl.before(form); else logEl.after(form);
      draw();
    }
    logEl.onscroll = () => { const at = atLatest(); if (auto !== at) { auto = at; q("[data-a=scroll]").hidden = auto; } };
    q("[data-a=scroll]").onclick = () => { auto = true; toLatest(); q("[data-a=scroll]").hidden = true; };
    q("[data-a=flip]").onclick = () => { flipped = !flipped; PB.store.set("pb-console-flip", flipped); auto = true; applyFlip(); };
    q("[data-a=clear]").onclick = () => { conLogs.set(pageId, []); draw(); };
    search.oninput = () => { term = search.value.trim(); q("[data-a=sclear]").hidden = !term; q(".pb-sicon").hidden = !!term; draw(); };
    q("[data-a=sclear]").onclick = () => { search.value = ""; search.oninput(); search.focus(); };
    q(".pb-cx").onclick = () => { input.value = ""; syncX(); input.focus(); };
    const flt = PB.parts.consoleFilters(q, cfg, { get: () => filters, set: f => { filters = f; draw(); return f; } });
    const hlp = PB.parts.consoleHelp(q, input, () => help);
    input.oninput = () => { syncX(); if (input.value.trim()) input.setAttribute("list", dl.id); else input.removeAttribute("list"); };
    input.onkeydown = e => {
      if (e.key === "Tab") {
        e.preventDefault();
        const v = input.value.trim().toUpperCase(), m = v ? Object.keys(help).filter(c => c.toUpperCase().startsWith(v)).sort() : [];
        if (m.length) { input.value = m[0]; syncX(); }
        return;
      }
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      input.removeAttribute("list");
      if (!conHistory.length) return;
      if (e.key === "ArrowUp") hist = hist === -1 ? conHistory.length - 1 : Math.max(0, hist - 1);
      else hist = hist === -1 ? -1 : hist + 1 >= conHistory.length ? -1 : hist + 1;
      input.value = hist === -1 ? "" : conHistory[hist]; syncX();
    };
    form.onsubmit = e => { e.preventDefault(); const v = input.value; input.value = ""; syncX(); input.removeAttribute("list"); hist = -1; if (v.trim()) { auto = true; conSend(v); } };
    if (flipped) { logEl.before(form); q("[data-a=flip]").innerHTML = I.dockTop; q("[data-a=flip]").setAttribute("aria-pressed", "true"); }
    return {
      async open(id) {
        filters = []; draw(); commands(id);
        try { const f = await PB.kv.get("console_filters", id); if (id === pageId) { filters = Array.isArray(f) ? f : []; draw(); } } catch {}
      },
      shown: draw, log: draw,
      update(p) { const rb = railBtn(); fsBtn.hidden = !rb || rb.getAttribute("aria-current") === "true"; const on = p.connection === "online"; input.disabled = !on; q("form button:not(.pb-cx)").disabled = !on; },
      destroy() { flt.destroy(); hlp.destroy(); },
    };
  },
});
