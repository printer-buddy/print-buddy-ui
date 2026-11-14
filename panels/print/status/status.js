PB.panel("status", {
  title: "Printer Status", desc: "Print progress, file, times, layer, speed and flow",
  icon: PB.icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  settings: [
    { k: "thumb", label: "Show the print's picture", type: "check", def: true },
    { k: "list", label: "Show the numbers list", type: "check", def: true },
  ],
  create(host, cfg) {
    const ICON = { pause: PB.icon('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'),
                   resume: PB.icon('<path d="M7 5l12 7-12 7z"/>'), cancel: PB.icon('<rect x="6" y="6" width="12" height="12" rx="1"/>'),
                   reset: PB.icon('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
                   file: PB.icon('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'),
                   gone: PB.icon('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M9 12l5 5M14 12l-5 5"/>'),
                   ok: PB.icon('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'),
                   bad: PB.icon('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'),
                   run: PB.icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
                   print: PB.icon('<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7"/>') };
    const row = (k, label) => `<div class="pb-sl" data-row="${k}"><dt>${label}</dt><dd data-k="${k}">--</dd></div>`;
    host.innerHTML = `<button type="button" data-a="cancel" data-head title="Cancel the print" aria-label="Cancel the print">${ICON.cancel}<span>Cancel</span></button>
      <button type="button" data-a="pr" data-head title="Pause" aria-label="Pause">${ICON.pause}<span>Pause</span></button>
      <button type="button" data-a="reset" data-head title="Clear the finished print" aria-label="Clear the finished print">${ICON.reset}<span>Clear File</span></button>
      <div class="pb-v-status">
        <div class="pb-st2">
          <div class="pb-ring" hidden><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="bg" cx="18" cy="18" r="15.5"/><circle class="fg" cx="18" cy="18" r="15.5" pathLength="100" stroke-dasharray="0 100"/></svg><span data-k="pct">0%</span></div>
          <dl class="pb-sls">${row("m117", "M117")}${row("file", "File")}</dl>
          <img class="pb-thumb" alt="" hidden>
        </div>
        <div class="pb-pal" hidden><span class="pb-palstate pb-muted"></span><span class="bd-sp"></span><button type="button" data-a="pal">Pause at layer…</button></div>
        <div class="pb-cols2" hidden>
          <dl class="pb-sls">${row("speed", "Speed")}${row("flow", "Flow")}${row("filament", "Filament")}${row("layer", "Layer")}</dl>
          <dl class="pb-sls">${row("actual", "Actual")}${row("filetime", "File")}${row("slicer", "Slicer")}${row("total", "Total")}${row("finish", "Finish")}</dl>
        </div>
      </div>
      <div class="pb-v-re" hidden></div>`;
    const q = s => host.querySelector(s), k = n => host.querySelector(`[data-k=${n}]`);
    const thumb = q(".pb-thumb"), ring = q(".pb-ring"), cols = q(".pb-cols2"), vStatus = q(".pb-v-status"), vRe = q(".pb-v-re");
    if (!cfg.list) cols.remove();
    thumb.onload = () => { thumb.hidden = false; };
    thumb.onerror = () => { thumb.hidden = true; };
    let thumbFile;
    q("[data-a=pal]").onclick = () => PB.pauseAtLayer?.();
    let paused = false;
    q("[data-a=pr]").onclick = () => doAction(pageId, paused ? "resume" : "pause");
    q("[data-a=cancel]").onclick = () => doAction(pageId, "cancel");
    q("[data-a=reset]").onclick = () => gcode("SDCARD_RESET_FILE");
    const set = (n, v) => { const e = k(n); if (e) e.textContent = v == null || v === "" ? "--" : v; };
    const card = host.closest(".pb-card");

    // the Re-Print tab: the last few jobs, like Fluidd's, shown when no file is loaded
    let tab = "status", reBtn = null, title = null, hist = null, histOk = true, histAt = 0, histPid = null, lastFile, wasActive = false;
    function setTab(t) {
      tab = t; vStatus.hidden = t !== "status"; vRe.hidden = t !== "re";
      reBtn?.setAttribute("aria-pressed", String(t === "re")); title?.setAttribute("aria-pressed", String(t === "status"));
      if (t === "re") loadHist(true);
    }
    function ensureTabs() {
      if (reBtn || !card) return;
      title = card.querySelector(".pb-title"); if (!title) return;
      card.classList.add("pb-statuscard");
      title.addEventListener("click", e => { e.stopImmediatePropagation(); setTab("status"); });
      reBtn = document.createElement("button"); reBtn.type = "button"; reBtn.className = "pb-retab"; reBtn.textContent = "Re-Print";
      reBtn.onclick = () => setTab("re");
      const sp = document.createElement("span"); sp.className = "pb-retsp";
      title.after(reBtn); reBtn.after(sp);
    }
    const base = f => String(f || "").split("/").pop();
    const dur = s => { s = Math.round(s); if (!(s > 0)) return "--"; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
      return [h ? `${h}h` : "", h || m ? `${m}m` : "", `${x}s`].filter(Boolean).join(" "); };
    const wording = (p, st, tag) => {
      if (p.connection !== "online" || p.klippy_state !== "ready") return tag;
      if (p.state === "paused" || p.state === "cancelled" || p.state === "error") return tag;
      const idle = String(p.idle_state || "").toLowerCase();
      if (!idle) return st === "standby" ? "Standby" : tag;
      return idle === "printing" && p.state !== "printing" ? "Busy" : idle[0].toUpperCase() + idle.slice(1);
    };
    function drawHist() {
      if (!hist) { vRe.innerHTML = `<p class="pb-muted">${histOk ? "Loading…" : "Print history isn't available on this printer."}</p>`; return; }
      const printing = statusPrinting;
      vRe.innerHTML = `<table class="pb-rep"><thead><tr><th></th><th>Name</th><th>Status</th><th>Print duration</th>${printing ? "" : "<th></th>"}</tr></thead><tbody>${hist.length ? hist.map((j, i) => {
        const st = j.status === "completed" ? `<span class="ok" title="Completed">${ICON.ok}</span>` : j.status === "in_progress" ? `<span title="In progress">${ICON.run}</span>`
          : `<span class="bad" title="${esc(String(j.status || "").replaceAll("_", " "))}">${ICON.bad}</span>`;
        const pic = !j.exists ? `<span class="pb-rep-i" title="The file is gone">${ICON.gone}</span>`
          : `<img class="pb-rep-t" alt="" src="${PB.thumbUrl(histPid, j.filename)}" width="24" data-i="${i}"><span class="pb-rep-i" hidden>${ICON.file}</span>`;
        return `<tr><td>${pic}</td><td class="nm">${esc(base(j.filename))}</td><td>${st}</td><td class="du">${dur(j.print_duration)}</td>${printing ? "" :
          `<td class="ac"><button type="button" class="pb-rep-go" data-i="${i}" title="Print this again" aria-label="Print ${esc(base(j.filename))} again"${j.exists ? "" : " disabled"}>${ICON.print}</button></td>`}</tr>`;
      }).join("") : `<tr><td colspan="5" class="pb-muted">No prints yet.</td></tr>`}</tbody></table>`;
      for (const img of vRe.querySelectorAll("img.pb-rep-t")) img.onerror = () => { img.hidden = true; img.nextElementSibling.hidden = false; };
      for (const b of vRe.querySelectorAll(".pb-rep-go")) b.onclick = () => PB.printFile(hist[+b.dataset.i].filename);
    }
    async function loadHist(force, pid) {
      pid = pid ?? PB.current()?.id; if (pid == null) return;
      if (!force && histPid === pid && Date.now() - histAt < 15000) return;
      histAt = Date.now(); histPid = pid;
      try {
        const seen = new Set();
        hist = ((await api(`/api/printers/${pid}/history?start=0&limit=40`)).jobs || []).filter(j => j.exists && !seen.has(j.filename) && seen.add(j.filename)).slice(0, 3);
        histOk = true;
      }
      catch { hist = null; histOk = false; }
      if (!histOk && tab === "re") setTab("status");
      reBtn && (reBtn.hidden = !histOk || statusPrinting);
      drawHist();
    }
    let statusPrinting = false;

    return {
      open() { thumbFile = undefined; lastFile = undefined; histAt = 0; },
      update(p) {
        ensureTabs();
        const st = statusOf(p), [tagText, , barColor, , statusColor] = look(st);
        const live = p.connection === "online", active = p.state === "printing" || p.state === "paused";
        statusPrinting = active;
        const showPct = active || p.state === "complete", pct = showPct ? p.progress || 0 : 0;
        const file = p.filename || null;
        paused = p.state === "paused";
        if (title) { title.textContent = wording(p, st, tagText); title.style.setProperty("--tab", statusColor); }
        if (file !== lastFile) { lastFile = file; setTab(file || !histOk ? "status" : "re"); }
        if (active && tab === "re") setTab("status");
        if (reBtn) reBtn.hidden = active || !histOk;
        if (wasActive && !active) { loadHist(true, p.id); setTimeout(() => loadHist(true, p.id), 4000); }
        wasActive = active;
        if (tab === "re") loadHist(false, p.id);
        const pr = q("[data-a=pr]"), lbl = paused ? "Resume" : "Pause";
        pr.hidden = q("[data-a=cancel]").hidden = !active; pr.innerHTML = `${paused ? ICON.resume : ICON.pause}<span>${lbl}</span>`; pr.title = lbl; pr.setAttribute("aria-label", lbl);
        q("[data-a=reset]").hidden = active || !p.filename;
        for (const b of [pr, q("[data-a=cancel]"), q("[data-a=reset]")]) b.disabled = !live;
        if (file !== thumbFile && cfg.thumb) {
          thumbFile = file; thumb.hidden = true;
          if (file) thumb.src = `/api/printers/${p.id}/thumbnail?file=${encodeURIComponent(file)}`; else thumb.removeAttribute("src");
        }
        ring.hidden = !showPct;
        const fg = ring.querySelector(".fg");
        fg.setAttribute("stroke-dasharray", `${Math.round(pct * 100)} 100`); fg.style.stroke = barColor;
        k("pct").textContent = `${Math.floor(pct * 100)}%`;
        const pl = p.pause_layer, pal = q(".pb-pal");
        pal.hidden = !pl || !active;
        if (pl) q(".pb-palstate").textContent = pl.next?.enable ? "Pausing at the next layer" : pl.at?.enable && pl.at.layer ? `Pausing at layer ${pl.at.layer}` : "";
        const msg = p.klippy_message || (p.state === "error" && p.message) || p.message || "";
        q("[data-row=m117]").hidden = !msg; set("m117", msg);
        q("[data-row=file]").hidden = !file; set("file", file);
        if (!cfg.list) return;
        const printing = p.state === "printing";
        cols.hidden = !printing;
        if (!printing) return;
        set("speed", p.live_velocity > 0 ? `${p.live_velocity.toFixed(1)} mm/s` : null);
        set("flow", p.live_flow > 0 ? `${p.live_flow.toFixed(1)} mm³/s` : null);
        set("filament", p.filament_used > 0 ? (p.filament_used >= 1000 ? `${(p.filament_used / 1000).toFixed(2)} m` : `${Math.round(p.filament_used)} mm`) : null);
        set("layer", p.layer != null && p.total_layers ? `${p.layer} / ${p.total_layers}` : null);
        set("actual", p.eta > 0 ? fmtDur(p.eta) : null);
        set("filetime", p.file_eta > 0 ? fmtDur(p.file_eta) : null);
        set("slicer", p.slicer_eta > 0 ? fmtDur(p.slicer_eta) : null);
        set("total", p.print_duration > 0 ? fmtDur(p.print_duration) : null);
        set("finish", p.eta > 0 ? fmtClock(new Date(Date.now() + p.eta * 1000)) : null);
      },
    };
  },
});
