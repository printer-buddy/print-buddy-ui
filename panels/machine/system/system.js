(() => {
  const THROTTLE = { "Under-Voltage Detected": "Under-voltage now", "Frequency Capped": "CPU slowed", "Currently Throttled": "Throttled now",
                     "Temperature Limit Active": "Too hot", "Previously Under-Volted": "Under-voltage earlier", "Previously Throttled": "Throttled earlier" };
  const KEEP = 120;   // 10 minutes at one sample every 5 s, like Fluidd's chart window
  const load = st => st && st.mcu_task_avg != null ? ((st.mcu_task_avg + 3 * (st.mcu_task_stddev || 0)) / 0.0025) * 100 : null;
  const pretty = n => n.replace(/[_ ]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());   // "mcu nozzle_mcu" -> "Mcu Nozzle Mcu"
  // Fluidd's inline chart: a boxed plot area, no axis labels, faint grid lines, a smooth line with a soft fill, the last 10 minutes
  const opt = (data, minMax) => {
    const light = document.documentElement.dataset.theme === "light", grid = { color: light ? "#000" : "#fff", opacity: 0.05 };
    return { animation: false, grid: { show: true, left: 1, right: 1, top: 1, bottom: 1, borderWidth: 1, borderColor: light ? "rgba(0,0,0,.15)" : "rgba(255,255,255,.25)" },
      tooltip: { trigger: "axis", valueFormatter: v => (+v).toFixed(2) },
      xAxis: { type: "time", min: v => v.max - 600000, max: "dataMax", axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, splitLine: { show: true, lineStyle: grid }, axisPointer: { lineStyle: grid } },
      yAxis: { type: "value", min: 0, max: v => Math.max(minMax, v.max), axisLabel: { show: false }, splitLine: { show: true, lineStyle: grid } },
      series: [{ type: "line", smooth: true, showSymbol: false, areaStyle: { opacity: 0.3 }, lineStyle: { width: 1.5 }, itemStyle: { color: "#ff8a1f" }, color: "#ff8a1f", data }] };
  };

  const make = part => (host, cfg) => {
    host.innerHTML = part === "usage" ? `<div class="pb-throt" hidden></div><div class="pb-sysgrid"></div>` : `<div class="pb-mcus"></div>`;
    const q = s => host.querySelector(s), charts = new Map();
    let timer = null, mcus = [], hist = {}, forId = null, prevCpu = null, key = "", cores = 1, last = {};
    const dlg = part === "mcus" ? PB.el("dialog", "bd-lib pb-xd pb-hdlg") : null; if (dlg) document.body.append(dlg);
    const push = (k, v) => { if (v == null || isNaN(v)) return; (hist[k] ||= []).push([Date.now(), Math.round(v * 100) / 100]); if (hist[k].length > KEEP) hist[k].shift(); };
    const dropCharts = () => { for (const c of charts.values()) c.dispose(); charts.clear(); };
    const lastOf = k => { const h = hist[k]; return h?.length ? h.at(-1)[1] : null; };
    const fmt = (v, suf = " %") => v == null ? "--" : `${v !== 0 ? (+v).toFixed(2) : 0}${suf}`;

    // usage: one small chart per metric, with its label and live value underneath
    const CELLS = () => [["load", "System Load"], ["mem", "System Memory"], ["klip", "Klipper Load"], ["moon", "Moonraker Load"],
      ...mcus.flatMap(n => [[`m:${n}`, `${pretty(n)} Load`]])];
    function buildGrid() {
      dropCharts();
      q(".pb-sysgrid").innerHTML = CELLS().map(([k, t]) => `<div class="pb-sysch" data-c="${esc(k)}"><div class="pb-syschart" style="height:${cfg.height}px"></div>
        <div class="pb-sysl"><span>${esc(t)}</span><span class="v"></span></div>${k.startsWith("m:") ? `<div class="pb-sysl"><span>${esc(pretty(k.slice(2)))} Awake Time</span><span class="va"></span></div>` : ""}</div>`).join("");
      if (window.echarts) for (const [k] of CELLS()) charts.set(k, echarts.init(q(`[data-c="${CSS.escape(k)}"] .pb-syschart`), null, { renderer: "canvas" }));
    }
    function drawGrid() {
      const src = { load: ["Sys load", cores, ` / ${cores}`], mem: ["Memory", 100, " %"], klip: ["Klipper", 100, " %"], moon: ["Moonraker", 100, " %"] };
      for (const [k] of CELLS()) {
        const el = q(`[data-c="${CSS.escape(k)}"]`); if (!el) continue;
        const h = k.startsWith("m:") ? k.slice(2) : src[k][0], mm = k.startsWith("m:") ? 100 : src[k][1], suf = k.startsWith("m:") ? " %" : src[k][2];
        el.querySelector(".v").textContent = fmt(lastOf(h), suf);
        if (k.startsWith("m:")) el.querySelector(".va").textContent = fmt(lastOf(`awake:${h}`));
        charts.get(k)?.setOption(opt(hist[h] || [], mm), { replaceMerge: ["series"] });
      }
    }
    function details(n) {
      const m = last[n] || {}, rows = o => Object.entries(o || {}).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(String(v))}</td></tr>`).join("");
      dlg.innerHTML = `<h3>${esc(pretty(n))} Information</h3><h4>Constants</h4><table class="pb-sit"><tbody>${rows(m.mcu_constants)}</tbody></table>
        <h4>Last Stats</h4><table class="pb-sit"><tbody>${rows(m.last_stats)}</tbody></table><div class="bd-libfoot"><span class="bd-sp"></span><button type="button" data-a="no">Close</button></div>`;
      dlg.querySelector("[data-a=no]").onclick = () => dlg.close(); dlg.showModal();
    }
    function buildMcus() {
      q(".pb-mcus").innerHTML = mcus.map(n => `<div class="pb-mcu" data-n="${esc(n)}"><div class="pb-mcuh"><b>${esc(pretty(n))} Information</b>
          <button type="button" data-info title="All constants and stats" aria-label="MCU details">${PB.icon('<path d="M4 6h16M4 12h16M4 18h10"/>')}</button></div>
          <table class="pb-sit"><tbody></tbody></table></div>`).join("") || `<p class="pb-muted">No boards reported (is Klipper running?).</p>`;
      for (const b of host.querySelectorAll("[data-info]")) b.onclick = () => details(b.closest("[data-n]").dataset.n);
    }
    async function tick() {
      const id = pageId; if (id === null || !host.offsetParent) return;
      if (forId !== id) { forId = id; hist = {}; mcus = []; prevCpu = null; key = ""; }
      try {
        if (!mcus.length) {
          const names = ((await PB.rpc("printer.objects.list"))?.objects || []);
          mcus = names.filter(n => n === "mcu" || n.startsWith("mcu "));
        }
        if (part === "mcus") {
          const r = await PB.rpc("printer.objects.query", { objects: Object.fromEntries(mcus.map(n => [n, ["mcu_version", "mcu_constants", "last_stats"]])) });
          if (id !== pageId) return;
          last = r?.status || {}; const k = mcus.join("|"); if (k !== key) { key = k; buildMcus(); }
          for (const n of mcus) {
            const m = last[n] || {}, c = m.mcu_constants || {}, el = q(`[data-n="${CSS.escape(n)}"] tbody`); if (!el) continue;
            el.innerHTML = [["Micro-Controller", c.MCU], ["Frequency", c.CLOCK_FREQ ? `${+(c.CLOCK_FREQ / 1e6).toFixed(2)} MHz` : null], ["Version", m.mcu_version]]
              .filter(([, v]) => v).map(([k2, v]) => `<tr><th>${k2}</th><td>${esc(String(v))}</td></tr>`).join("");
          }
        } else {
          const objs = Object.fromEntries([["system_stats", null], ...mcus.map(n => [n, ["last_stats"]])]);
          const [r, ps] = await Promise.all([PB.rpc("printer.objects.query", { objects: objs }), PB.rpc("machine.proc_stats").catch(() => null)]);
          if (id !== pageId) return;
          const st = r?.status || {}, ss = st.system_stats || {};
          cores = Object.keys(ps?.system_cpu_usage || {}).filter(k => /^cpu\d+$/.test(k)).length || 1;
          push("Sys load", ss.sysload);
          if (ss.cputime != null) {   // Klipper's own CPU use = its CPU seconds used per second
            const now = Date.now() / 1000;
            if (prevCpu) push("Klipper", Math.max(0, (ss.cputime - prevCpu[0]) / (now - prevCpu[1]) * 100));
            prevCpu = [ss.cputime, now];
          }
          const sm = ps?.system_memory || {};
          if (sm.total) push("Memory", (sm.used != null ? sm.used : sm.total - (sm.available ?? 0)) / sm.total * 100);
          push("Moonraker", ps?.moonraker_stats?.at?.(-1)?.cpu_usage);
          for (const n of mcus) { const ls = st[n]?.last_stats; push(n, load(ls)); if (ls?.mcu_awake != null) push(`awake:${n}`, ls.mcu_awake / 5 * 100); }
          const flags = (ps?.throttled_state?.flags || []).map(f => THROTTLE[f] || f);
          const th = q(".pb-throt"); th.hidden = !flags.length;
          if (flags.length) th.textContent = `The Pi reports: ${flags.join(", ")}. Check the power supply.`;
          if (!window.echarts) { q(".pb-sysgrid").innerHTML = `<p class="pb-muted">Chart unavailable.</p>`; return; }
          const k = mcus.join("|"); if (k !== key) { key = k; buildGrid(); }
          drawGrid();
        }
      } catch (e) { (q(".pb-mcus") || q(".pb-sysgrid")).innerHTML = `<p class="pb-muted">${esc(e.message)}</p>`; }
    }
    return {
      open() { forId = null; hist = {}; mcus = []; key = ""; dropCharts(); const m = q(".pb-mcus") || q(".pb-sysgrid"); if (m) m.innerHTML = ""; },
      shown() { tick(); clearInterval(timer); timer = setInterval(tick, 5000); for (const c of charts.values()) c.resize(); },
      destroy() { clearInterval(timer); dropCharts(); dlg?.remove(); },
    };
  };

  PB.panel("system", {
    title: "System Utilization", desc: "Small charts of system load, memory, Klipper, Moonraker and each MCU, with live values", cls: "adv", gear: true,
    icon: PB.icon('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
    settings: [{ k: "height", label: "Chart height", type: "select", def: 120, options: [[90, "Small"], [120, "Like Fluidd (120)"], [180, "Tall"]] }],
    create: make("usage"),
  });
  PB.panel("mcus", {
    title: "MCU Information", desc: "Each MCU board: chip, clock speed and firmware version, with a button for all its constants and stats", cls: "adv",
    icon: PB.icon('<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>'),
    create: make("mcus"),
  });
})();
