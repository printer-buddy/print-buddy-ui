PB.homePanel("printers", {
  title: "Printers", desc: "Your printers as cards or a list (sort, search, groups)", single: true, flush: true,
  icon: PB.icon('<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M4 12h16M8 20h8M12 16v4"/>'),
  create(host) {
    host.classList.add("pb-printers");
    const parts = ["#grid", "#noMatch", "#setupLine", "#empty"].map(s => $(s)).filter(Boolean);
    host.append(...parts);
    return { destroy() { for (const n of parts) $("#home").after(n); } };
  },
});

PB.homePanel("fleet", {
  title: "Fleet", desc: "How many are printing, idle, offline or in error, and what finishes next",
  icon: PB.icon('<path d="M3 20h18M6 16V9M10 16V5M14 16v-6M18 16v-3"/>'),
  create(host) {
    host.innerHTML = `<div class="pb-fleet"></div><div class="pb-next pb-muted"></div>`;
    const box = host.querySelector(".pb-fleet"), next = host.querySelector(".pb-next");
    const KINDS = [["printing", "Printing", "running"], ["idle", "Idle", "done"], ["offline", "Offline", ""], ["error", "Error", "failed"]];
    const kind = p => { const s = statusOf(p); return s === "printing" || s === "paused" ? "printing" : ["error", "shutdown"].includes(s) ? "error"
                                                    : ["offline", "connecting", "auth_error"].includes(s) ? "offline" : "idle"; };
    return {
      update(list) {
        const n = Object.fromEntries(KINDS.map(([k]) => [k, 0])); for (const p of list) n[kind(p)]++;
        box.innerHTML = KINDS.map(([k, label, cls]) => `<div class="pb-fstat ${cls}"><b>${n[k]}</b><span>${label}</span></div>`).join("");
        const run = list.filter(p => p.state === "printing" && p.eta != null).sort((a, b) => a.eta - b.eta)[0];
        next.innerHTML = run ? `Finishing next: <a href="#printer-${run.id}">${esc(run.name)}</a> in ${fmtDur(run.eta)} (around ${fmtClock(new Date(Date.now() + run.eta * 1000))})`
                             : list.length ? "Nothing printing right now." : "";
      },
    };
  },
});

PB.homePanel("active", {
  title: "Active prints", desc: "Every running print with progress, time left and pause",
  icon: PB.icon('<path d="M6 4l14 8-14 8z"/>'),
  create(host) {
    host.innerHTML = `<div class="pb-list"></div>`;
    const list = host.querySelector(".pb-list");
    let key = "";
    return {
      update(all) {
        const act = all.filter(p => p.state === "printing" || p.state === "paused");
        const k = act.map(p => `${p.id}:${p.state}:${Math.floor((p.progress || 0) * 100)}:${Math.round((p.eta || 0) / 60)}`).join("|");
        if (k === key) return; key = k;
        list.innerHTML = act.length ? act.map(p => `<div class="pb-li">
            <img class="pb-lthumb" alt="" loading="lazy" src="${PB.thumbUrl(p.id, p.filename || "")}" onerror="this.classList.add('none')">
            <div class="pb-lmain"><div class="pb-lname"><a href="#printer-${p.id}">${esc(p.name)}</a> · ${esc(p.filename || "")}</div>
              <div class="pb-prog"><i style="width:${(p.progress || 0) * 100}%;background:var(--orange)"></i></div>
              <div class="pb-lsub">${Math.floor((p.progress || 0) * 100)}%${p.eta != null ? ` · ${fmtDur(p.eta)} left` : ""}${p.state === "paused" ? " · paused" : ""}</div></div>
            <div class="pb-lbtn"><button type="button" data-id="${p.id}" data-act="${p.state === "paused" ? "resume" : "pause"}">${p.state === "paused" ? "Resume" : "Pause"}</button></div></div>`).join("")
          : `<p class="pb-muted">No prints running.</p>`;
        for (const b of list.querySelectorAll("[data-act]")) b.onclick = () => doAction(+b.dataset.id, b.dataset.act);
      },
    };
  },
});

PB.homePanel("camwall", {
  title: "Camera wall", desc: "Every printer's camera in one grid", flush: true,
  icon: PB.icon('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>'),
  settings: [{ k: "cols", label: "Columns", type: "select", def: 3, options: [[2, "2"], [3, "3"], [4, "4"]] }],
  create(host, cfg) {
    host.innerHTML = `<div class="pb-camwall"></div>`;
    const wall = host.querySelector(".pb-camwall");
    wall.style.gridTemplateColumns = `repeat(${cfg.cols}, minmax(0, 1fr))`;
    let key = "";
    return {
      update(all) {
        const cams = all.filter(p => p.has_webcam && p.connection === "online");
        const k = cams.map(p => p.id).join();
        if (k === key) return; key = k;
        wall.innerHTML = cams.length ? cams.map(p => `<a class="pb-camtile" href="#printer-${p.id}"><img alt="${esc(p.name)}" data-cam-pid="${p.id}" data-cam-kind="card">
            <span>${esc(p.name)}</span></a>`).join("") : `<p class="pb-muted" style="padding:12px">No cameras online.</p>`;
      },
    };
  },
});

PB.homePanel("news", {
  title: "News", desc: "Printer Buddy announcements (same as the bell)",
  icon: PB.icon('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  create(host) {
    const draw = () => { host.innerHTML = PB.news ? PB.news.html(10) : ""; };
    addEventListener("pb-news", draw);
    draw();
    return { destroy() { removeEventListener("pb-news", draw); } };
  },
});

// Totals for every printer's print history, a per-printer table, where prints fail, and a CSV of every job
PB.homePanel("stats", {
  title: "Fleet Stats", desc: "Prints, success rate, print time and filament for all printers, where prints fail, and a CSV export",
  icon: PB.icon('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
  create(host) {
    const RANGES = [[7, "7 days"], [30, "30 days"], [90, "90 days"], [365, "1 year"], [0, "All time"]];
    host.innerHTML = `<div class="pb-tool"><span class="bd-seg pb-strange">${RANGES.map(([d, l]) => `<button type="button" data-d="${d}">${l}</button>`).join("")}</span>
        <span class="bd-sp"></span><button type="button" data-a="csv" data-head title="Download every job as CSV" aria-label="Download CSV">${PB.ic.download}</button>
        <button type="button" data-a="ref" data-head title="Refresh" aria-label="Refresh">${PB.ic.refresh}</button></div><div class="pb-fs"></div>`;
    const q = s => host.querySelector(s), box = q(".pb-fs");
    let days = PB.store.get("pb-fleetstats-days", 30), data = null, busy = false;
    const FAIL = new Set(["error", "klippy_shutdown", "klippy_disconnect", "interrupted"]);
    const fil = mm => mm >= 1e6 ? `${(mm / 1e6).toFixed(2)} km` : mm >= 1000 ? `${(mm / 1000).toFixed(1)} m` : `${Math.round(mm)} mm`;
    const pct = (a, b) => b ? `${Math.round(a / b * 100)}%` : "—";
    function sum(jobs) {
      const s = { n: jobs.length, done: 0, failed: 0, cancelled: 0, time: 0, fil: 0 };
      for (const j of jobs) { if (j.status === "completed") s.done++; else if (j.status === "cancelled") s.cancelled++; else if (FAIL.has(j.status)) s.failed++; s.time += j.print_duration || 0; s.fil += j.filament_used || 0; }
      return s;
    }
    function draw() {
      for (const b of host.querySelectorAll("[data-d]")) b.setAttribute("aria-pressed", String(+b.dataset.d === days));
      if (!data) { box.innerHTML = `<p class="pb-muted">Loading…</p>`; return; }
      const jobs = data.jobs, t = sum(jobs), ended = t.done + t.failed + t.cancelled;
      const skipped = data.printers.filter(p => p.error).map(p => `${esc(p.name)} (${esc(p.error)})`);
      const tile = (label, value) => `<div class="pb-fstat"><b>${value}</b><span>${label}</span></div>`;
      const rows = data.printers.filter(p => !p.error).map(p => ({ p, s: sum(jobs.filter(j => j.printer_id === p.id)) })).sort((a, b) => b.s.n - a.s.n);
      const bad = jobs.filter(j => j.status === "cancelled" || FAIL.has(j.status));
      const byFile = Object.entries(bad.reduce((m, j) => { m[j.filename || "?"] = (m[j.filename || "?"] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const hours = Array.from({ length: 24 }, () => [0, 0]);
      for (const j of jobs) if (j.start_time) { const h = new Date(j.start_time * 1000).getHours(); hours[h][0]++; if (j.status === "cancelled" || FAIL.has(j.status)) hours[h][1]++; }
      const top = Math.max(1, ...hours.map(h => h[0]));
      box.innerHTML = `<div class="pb-fleet pb-fs-tiles">${tile("Prints", t.n)}${tile("Completed", t.done)}${tile("Failed", t.failed)}${tile("Cancelled", t.cancelled)}
          ${tile("Success rate", pct(t.done, ended))}${tile("Print time", fmtDur(t.time))}${tile("Filament", fil(t.fil))}</div>
        ${rows.length ? `<div class="pb-sub-h">Per printer</div><div class="pb-tablewrap"><table class="pb-htable"><thead><tr><th>Printer</th><th>Prints</th><th>Completed</th><th>Failed</th><th>Cancelled</th><th>Success</th><th>Print time</th><th>Filament</th></tr></thead><tbody>
          ${rows.map(({ p, s }) => `<tr><td>${esc(p.name)}</td><td class="num">${s.n}</td><td class="num">${s.done}</td><td class="num">${s.failed}</td><td class="num">${s.cancelled}</td>
            <td class="num">${pct(s.done, s.done + s.failed + s.cancelled)}</td><td class="num">${fmtDur(s.time)}</td><td class="num">${fil(s.fil)}</td></tr>`).join("")}</tbody></table></div>` : ""}
        <div class="pb-sub-h">Failed and cancelled</div>
        ${bad.length ? `<div class="pb-fs-two"><div><div class="pb-muted pb-fs-cap">Files that failed most</div><table class="pb-htable"><tbody>${byFile.map(([f, n]) => `<tr><td class="pb-tname" title="${esc(f)}">${esc(f)}</td><td class="num">${n}</td></tr>`).join("")}</tbody></table></div>
          <div><div class="pb-muted pb-fs-cap">Prints started per hour of the day (red: failed or cancelled)</div><div class="pb-fs-hours">${hours.map(([n, b], h) =>
            `<span title="${h}:00 · ${n} started, ${b} failed or cancelled"><i style="height:${Math.round(n / top * 100)}%"><em style="height:${n ? Math.round(b / n * 100) : 0}%"></em></i><small>${h % 6 ? "" : h}</small></span>`).join("")}</div></div></div>`
          : `<p class="pb-muted">No failed or cancelled prints in this period.</p>`}
        ${skipped.length ? `<p class="pb-muted pb-fs-cap">Not counted: ${skipped.join(", ")}</p>` : ""}`;
    }
    async function load() {
      if (busy) return; busy = true; data = null; draw();
      try { data = await api(`/api/stats?days=${days}`); } catch (e) { box.innerHTML = `<p class="pb-muted">${esc(e.message)}</p>`; busy = false; return; }
      busy = false; draw();
    }
    for (const b of host.querySelectorAll("[data-d]")) b.onclick = () => { days = +b.dataset.d; PB.store.set("pb-fleetstats-days", days); load(); };
    q("[data-a=ref]").onclick = load;
    q("[data-a=csv]").onclick = () => {
      if (!data?.jobs.length) return toast("Nothing to export");
      const cell = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
      const lines = [["printer", "file", "status", "started", "print_seconds", "filament_mm"].join(",")].concat(data.jobs.map(j =>
        [j.printer, j.filename, j.status, j.start_time ? new Date(j.start_time * 1000).toISOString() : "", Math.round(j.print_duration || 0), Math.round(j.filament_used || 0)].map(cell).join(",")));
      const a = PB.el("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = `printer-buddy-stats-${days || "all"}d.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    };
    let loaded = false;
    return { update() { if (!loaded) { loaded = true; load(); } } };
  },
});
