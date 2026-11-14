PB.panel("thermals", {
  title: "Thermals", desc: "Temperatures table, presets and history chart",
  icon: PB.icon('<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>'),
  gear: true,
  settings: [
    { k: "table", label: "Show the table", type: "check", def: true },
    { k: "presets", label: "Show presets (PLA / PETG / ABS / your own)", type: "check", def: true },
    { k: "chart", label: "Show the chart", type: "check", def: true },
    { k: "span", label: "Chart length", type: "select", def: 20, options: [[10, "10 minutes"], [20, "20 minutes"], [60, "1 hour"]] },
    { k: "height", label: "Chart height", type: "select", def: "auto", options: [["auto", "Like Fluidd (260, or 180 on phones)"], [120, "Small"], [180, "Medium"], [260, "Tall"], [360, "Taller"]] },
  ],
  create(host, cfg) {
    host.innerHTML = `<table class="pb-temps"><thead><tr><th>Name</th><th class="r">Power</th><th class="r">Actual</th><th class="r">Target</th></tr></thead><tbody></tbody></table>
      <div class="pb-pres adv"></div>
      <div class="pb-chart"></div>`;
    const body = host.querySelector("tbody"), chartEl = host.querySelector(".pb-chart");
    host.querySelector(".pb-temps").hidden = !cfg.table;
    if (!cfg.presets) host.querySelector(".pb-pres").remove();
    chartEl.style.height = `${cfg.height === "auto" ? (matchMedia("(max-width: 760px)").matches ? 180 : 260) : +cfg.height}px`;
    if (!cfg.chart) chartEl.remove();
    const COLORS = { extruder: "#FF8A1F", heater_bed: "#8B5CF6" }, EXTRA = ["#4FD1C5", "#F6E05E", "#FC8181", "#90CDF4", "#68D391", "#C4A7FF"];
    const SPAN = cfg.span * 60 * 1000;
    let chart = null, series = {}, lastPush = 0, key = "", order = [], frozen = false;
    const hidden = new Set(PB.store.get("pb-thermals-hidden", []));
    const nameOf = s => s.id === "extruder" ? "Extruder" : s.id === "heater_bed" ? "Heater Bed" : s.name;
    const ICONS = { flame: '<path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-4 3-5 0 2 1 3 2 3 0-4-1-5 0-9z"/>',
                    bed: '<rect x="3" y="15" width="18" height="4" rx="1"/><path d="M7 4c1 1-1 2 0 4M12 4c1 1-1 2 0 4M17 4c1 1-1 2 0 4"/>',
                    fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 2 3 0 5M14 12c4 0 7 1 7 4 0 2-3 2-5 0M12 14c0 4-1 7-4 7-2 0-2-3 0-5M10 12c-4 0-7-1-7-4 0-2 3-2 5 0"/>',
                    therm: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>' };
    const iconOf = id => ICONS[id === "heater_bed" ? "bed" : /^extruder\d*$/.test(id) || id.startsWith("heater_generic") ? "flame" : id.startsWith("temperature_fan") ? "fan" : "therm"];
    const colorOf = id => COLORS[id] || EXTRA[Math.max(0, order.indexOf(id) - (order.includes("extruder") ? 1 : 0) - (order.includes("heater_bed") ? 1 : 0)) % EXTRA.length];
    if (!cfg.chart) { }
    else if (window.echarts) {
      chart = echarts.init(chartEl, null, { renderer: "canvas" });
      new ResizeObserver(() => chart.resize()).observe(chartEl);
      const pauseBtn = document.createElement("button"); pauseBtn.type = "button"; pauseBtn.className = "pb-cpause"; pauseBtn.title = "Pause the chart"; pauseBtn.setAttribute("aria-pressed", "false");
      const PAUSE = PB.icon('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'), PLAY = PB.icon('<path d="M7 5l12 7-12 7z"/>');
      pauseBtn.innerHTML = PAUSE;
      pauseBtn.onclick = () => { frozen = !frozen; pauseBtn.innerHTML = frozen ? PLAY : PAUSE; pauseBtn.title = frozen ? "Resume the chart" : "Pause the chart"; pauseBtn.setAttribute("aria-pressed", String(frozen)); if (!frozen) draw(); };
      chartEl.append(pauseBtn);
    } else chartEl.innerHTML = `<p class="pb-muted">Chart unavailable (vendor/echarts.min.js missing).</p>`;

    function draw() {
      if (!chart || frozen) return;
      const out = [], legend = [];
      for (const [id, s] of Object.entries(series)) {
        if (hidden.has(id)) continue;
        const color = colorOf(id);
        legend.push(s.name);
        out.push({ name: s.name, type: "line", showSymbol: false, data: s.temp, smooth: true, lineStyle: { width: 1.5, color }, itemStyle: { color }, areaStyle: { color, opacity: .06 } });
        if (s.hasTarget) out.push({ name: s.name + " target", type: "line", showSymbol: false, data: s.target,
                                    lineStyle: { width: 1, type: "dashed", color, opacity: .6 }, itemStyle: { color } });
      }
      const dark = document.documentElement.dataset.theme !== "light";
      const font = dark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.45)", fs = chartEl.clientWidth < 460 ? 13 : 14;
      const grid = { color: dark ? "#ffffff" : "#000000", opacity: .05 };
      chart.setOption({
        backgroundColor: "transparent", animation: false, textStyle: { color: font, fontFamily: "inherit", fontSize: fs },
        grid: { left: 16, right: 16, top: 34, bottom: 16, containLabel: true },
        tooltip: { trigger: "axis", backgroundColor: dark ? "rgba(15,15,15,0.75)" : "rgba(255,255,255,0.75)", borderColor: "transparent", textStyle: { color: font, fontSize: fs },
                   axisPointer: { type: "line", lineStyle: { color: dark ? "#ffffff" : "#000000", opacity: .5 } },
                   valueFormatter: v => v == null ? "—" : `${v.toFixed(1)}°C` },
        xAxis: { type: "time", max: "dataMax", min: v => Math.max(v.min, v.max - SPAN), axisTick: { show: false }, axisLine: { show: false }, splitLine: { show: true, lineStyle: grid },
                 axisLabel: { margin: 14, color: font, fontSize: fs, hideOverlap: true, formatter: v => {
                   const d = new Date(v), h12 = typeof hour12 === "function" ? hour12() : undefined;
                   return h12 !== true ? `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}` : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: h12 });
                 } } },
        yAxis: { type: "value", name: "Temperature °C", nameTextStyle: { fontSize: fs, color: font, align: "left" }, nameGap: 8, minInterval: 20, maxInterval: 60,
                 min: e => { const m = Math.floor(e.min / 10) * 10; return m === e.min && m - 10 >= 0 ? m - 10 : m; },
                 max: e => { const m = Math.ceil(e.max / 10) * 10; return m === e.max ? m + 10 : m; },
                 axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: true, lineStyle: grid },
                 axisLabel: { margin: 8, color: font, fontSize: fs, formatter: "{value}" }, boundaryGap: [0, "100%"] },
        series: out,
      }, { replaceMerge: ["series"] });
    }
    const cmd = (s, v) => s.id.startsWith("temperature_fan ")
      ? `SET_TEMPERATURE_FAN_TARGET TEMPERATURE_FAN=${s.id.slice(16)} TARGET=${v}`
      : `SET_HEATER_TEMPERATURE HEATER=${s.id.startsWith("heater_generic ") ? s.id.slice(15) : s.id} TARGET=${v}`;
    const presets = PB.parts.thermalsPresets(host, cmd);
    return {
      async open(id) {
        series = {}; lastPush = 0; key = "";
        presets.load(id);
        try {
          const { history, sensors } = await api(`/api/printers/${id}/temps`);
          if (id !== pageId) return;
          const now = Date.now();
          for (const s of sensors.filter(s => s.kind !== "fan")) {
            const h = history[s.id] || {}, keep = SPAN / 1000;
            const temps = (h.temperatures || []).slice(-keep), targets = (h.targets || []).slice(-keep), t0 = now - (temps.length - 1) * 1000;
            series[s.id] = { name: nameOf(s), hasTarget: s.target != null, temp: temps.map((v, i) => [t0 + i * 1000, v]),
                             target: targets.map((v, i) => [t0 + i * 1000, v]) };
          }
        } catch {}
        draw();
      },
      shown() { chart?.resize(); },
      update(p) {
        const list = (p.sensors || []).filter(s => s.kind !== "fan"), live = p.connection === "online" && p.klippy_state === "ready";
        const k = list.map(s => s.id).join("|");
        if (k !== key) {
          key = k; order = list.map(s => s.id);
          body.innerHTML = list.length ? list.map(s => `<tr data-s="${esc(s.id)}"${hidden.has(s.id) ? ' class="off"' : ""}><td><button type="button" class="pb-tname" title="Show or hide on the graph"><span class="pb-ti" style="color:${colorOf(s.id)}">${PB.icon(iconOf(s.id))}</span>${esc(nameOf(s))}</button></td>
            <td class="r pb-muted" data-f="pw"></td><td class="r" data-f="now"></td>
            <td class="r">${s.target != null ? `<span class="pb-tin"><input type="number" min="0" max="400" inputmode="numeric" aria-label="${esc(nameOf(s))} target °C"><em>°C</em></span>` : `<span class="pb-muted">—</span>`}</td></tr>`).join("")
            : `<tr><td colspan="4" class="pb-muted">No temperatures (printer offline?)</td></tr>`;
          for (const row of body.querySelectorAll("tr[data-s]")) {
            row.querySelector(".pb-tname").onclick = () => {
              const id = row.dataset.s;
              if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
              PB.store.set("pb-thermals-hidden", [...hidden]);
              row.classList.toggle("off", hidden.has(id));
              draw();
            };
            const inp = row.querySelector("input"); if (!inp) continue;
            inp.onkeydown = e => {
              if (e.key !== "Enter" || inp.value === "") return;
              const s = (PB.current()?.sensors || []).find(x => x.id === row.dataset.s);
              if (s) { gcode(cmd(s, Math.max(0, Math.round(+inp.value)))); inp.value = ""; inp.blur(); }
            };
          }
        }
        for (const s of list) {
          const row = body.querySelector(`tr[data-s="${CSS.escape(s.id)}"]`); if (!row) continue;
          row.querySelector("[data-f=now]").textContent = !live ? "—" : s.temp != null ? `${s.temp.toFixed(1)}°C${s.target != null ? " /" : ""}` : "—";
          row.querySelector("[data-f=pw]").textContent = live && s.kind === "heater" && s.power != null ? `${Math.round(s.power * 100)}%` : "";
          const inp = row.querySelector("input");
          if (inp) { if (document.activeElement !== inp) inp.placeholder = s.target ? `${Math.round(s.target)}` : "0"; inp.disabled = !live || isBasic(); }
        }
        if (!chart || Date.now() - lastPush < 1000 || !live) return;
        const now = lastPush = Date.now();
        for (const s of list) {
          if (s.temp == null) continue;
          const ser = series[s.id] ||= { name: nameOf(s), hasTarget: s.target != null, temp: [], target: [] };
          ser.temp.push([now, s.temp]); if (ser.hasTarget) ser.target.push([now, s.target ?? 0]);
          while (ser.temp.length && ser.temp[0][0] < now - SPAN) ser.temp.shift();
          while (ser.target.length && ser.target[0][0] < now - SPAN) ser.target.shift();
        }
        if (chartEl.offsetParent) draw();
      },
      destroy() { chart?.dispose(); presets.destroy(); },
    };
  },
});
