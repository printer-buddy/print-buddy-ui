PB.panel("queue", {
  title: "Queue", desc: "Line up prints to run one after another", cls: "adv",
  icon: PB.icon('<path d="M4 6h16M4 12h16M4 18h10"/><path d="M18 16l3 2-3 2z"/>'),
  settings: [{ k: "thumbs", label: "Show thumbnails", type: "check", def: true }],
  create(host, cfg) {
    host.innerHTML = `<div class="pb-tool"><span class="pb-qstate pb-muted"></span><span class="bd-sp"></span>
        <button type="button" class="pb-pri" data-a="start">Resume</button><button type="button" data-a="pause">Pause</button>
        <button type="button" data-a="ref" data-head title="Refresh" aria-label="Refresh">${PB.ic.refresh}</button></div>
      <div class="pb-msg pb-muted"></div><div class="pb-list"></div><div class="pb-qtot"></div>`;
    const q = s => host.querySelector(s), list = q(".pb-list"), msg = q(".pb-msg"), tot = q(".pb-qtot");
    let jobs = [], state = null, timer = null, pid = null;
    const STATE = { ready: "Waiting: starts the next job when the printer is free", paused: "Paused: nothing starts on its own",
                    loading: "Loading the next job…", starting: "Starting the next job…" };
    async function call(action, extra) {
      const id = pageId; if (id === null) return;
      try {
        const r = action ? await api(`/api/printers/${id}/queue`, { method: "POST", body: JSON.stringify({ action, ...extra }) })
                         : await api(`/api/printers/${id}/queue`);
        if (id !== pageId) return;
        jobs = r.jobs || []; state = r.state; draw();
      } catch (e) { if (id === pageId) { jobs = []; state = null; list.innerHTML = ""; msg.textContent = e.message; setButtons(); } }
    }
    function setButtons() {
      q("[data-a=start]").hidden = state !== "paused";
      q("[data-a=pause]").hidden = state === "paused" || state == null;
      q(".pb-qstate").textContent = state ? STATE[state] || state : "";
    }
    // the same file queued several times in a row shows as one row with a copies count (− / +)
    const groups = () => { const g = []; for (const j of jobs) { const last = g.at(-1); if (last && last.filename === j.filename) last.jobs.push(j); else g.push({ filename: j.filename, jobs: [j] }); } return g; };
    function rebuild(gs) {   // write the whole queue back in this order (Moonraker: post_job with reset)
      const names = gs.flatMap(g => Array(g.n ?? g.jobs.length).fill(g.filename));
      return names.length ? call("add", { filenames: names, reset: true }) : call("remove", { job_ids: jobs.map(j => j.id) });
    }
    const hms = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60; return `${h ? h + "h " : ""}${m || h ? m + "m " : ""}${r}s`; };
    function totals() {
      let mm = 0, g = 0, sec = 0, unknown = 0;
      for (const j of jobs) {
        if (j.time == null && j.filament == null && j.weight == null) unknown++;
        mm += j.filament || 0; g += j.weight || 0; sec += j.time || 0;
      }
      const p = PB.current(), running = p && (p.state === "printing" || p.state === "paused") && p.eta != null;
      const eta = new Date(Date.now() + ((running ? p.eta : 0) + sec) * 1000), today = eta.toDateString() === new Date().toDateString();
      const at = eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const chips = [unknown ? `<span class="pb-qchip warn">No file info for ${unknown} job${unknown > 1 ? "s" : ""}</span>` : "",
        mm || g ? `<span class="pb-qchip">Filament: ${(mm / 1000).toFixed(2)} m / ${g.toFixed(2)} g</span>` : "",
        sec ? `<span class="pb-qchip">Print time: ${hms(sec)}</span><span class="pb-qchip">ETA: ${today ? at : eta.toLocaleDateString([], { day: "numeric", month: "short" }) + " " + at}</span>` : ""];
      tot.innerHTML = jobs.length ? chips.join("") : "";
    }
    function draw() {
      setButtons();
      totals();
      const card = host.closest(".pb-card"); if (card) { if (jobs.length) delete card.dataset.empty; else card.dataset.empty = "1"; }
      const gs = groups();
      msg.textContent = jobs.length ? `${jobs.length} job${jobs.length > 1 ? "s" : ""} queued` : "The queue is empty. Add files with + Queue in the Files panel.";
      list.innerHTML = gs.map((g, i) => `<div class="pb-li">
          ${cfg.thumbs ? `<img class="pb-lthumb" loading="lazy" alt="" src="${PB.thumbUrl(pageId, g.filename)}">` : ""}
          <div class="pb-lmain"><div class="pb-lname">${i + 1}. ${esc(g.filename)}</div>
            <div class="pb-lsub">added ${g.jobs[0].added ? fmtDate(g.jobs[0].added) : "—"}</div></div>
          <div class="pb-lbtn"><span class="pb-qcount"><button type="button" data-less="${i}" title="One copy fewer" aria-label="One copy fewer">−</button>
              <b title="Copies">×${g.jobs.length}</b><button type="button" data-more="${i}" title="One more copy" aria-label="One more copy">+</button></span>
            ${i ? `<button type="button" data-next="${i}" title="Make this the next job">↑ Next</button>` : ""}
            <button type="button" data-rm="${i}" title="Remove from the queue" aria-label="Remove">${PB.ic.x}</button></div></div>`).join("");
      for (const img of list.querySelectorAll(".pb-lthumb")) img.onerror = () => img.classList.add("none");
      for (const b of list.querySelectorAll("[data-next]")) b.onclick = () => { const i = +b.dataset.next; rebuild([gs[i], ...gs.filter((_, k) => k !== i)]); };
      for (const b of list.querySelectorAll("[data-rm]")) b.onclick = () => call("remove", { job_ids: gs[+b.dataset.rm].jobs.map(j => j.id) });
      for (const b of list.querySelectorAll("[data-more]")) b.onclick = () => { const i = +b.dataset.more; rebuild(gs.map((g, k) => k === i ? { ...g, n: g.jobs.length + 1 } : g)); };
      for (const b of list.querySelectorAll("[data-less]")) b.onclick = () => {
        const g = gs[+b.dataset.less]; if (g.jobs.length > 1) call("remove", { job_ids: [g.jobs.at(-1).id] }); else call("remove", { job_ids: [g.jobs[0].id] });
      };
    }
    q("[data-a=start]").onclick = () => call("start");
    q("[data-a=pause]").onclick = () => call("pause");
    q("[data-a=ref]").onclick = () => call();
    PB.queueAdd = async path => {
      const id = pageId; if (id === null) return;
      try {
        const r = await api(`/api/printers/${id}/queue`, { method: "POST", body: JSON.stringify({ action: "add", filenames: [path] }) });
        toast(`Queued ${path} (${r.jobs.length} in the queue)`);
        if (id === pageId) { jobs = r.jobs; state = r.state; draw(); }
      } catch (e) { toast(e.message); }
    };
    return {
      open(id) { pid = id; jobs = []; state = null; list.innerHTML = ""; msg.textContent = ""; },
      shown() {
        call();
        clearInterval(timer);
        timer = setInterval(() => { if (host.offsetParent && pageId !== null) call(); }, 10000);
      },
      destroy() { clearInterval(timer); },
    };
  },
});
