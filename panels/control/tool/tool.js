// The Tool card, laid out like Fluidd's: move cross and steps on the left; position, extruder and Z offset on the right;
// then the extrusion stats line and the speed, flow and pressure advance sliders.
PB.panel("tool", {
  title: "Tool", desc: "Move, home, extrude, Z offset, speed and flow", cls: "adv", gear: true,
  icon: PB.icon('<rect x="4" y="3" width="16" height="6" rx="1"/><path d="M8 9v3l4 4 4-4V9"/><path d="M12 16v3M5 21h14"/>'),
  settings: [
    { k: "steps", label: "Jog distances (mm)", type: "select", def: "0.1,1,10,25,50,100", options: [["0.1,1,10,25,50,100", "0.1 · 1 · 10 · 25 · 50 · 100"], ["0.1,1,10,50", "0.1 · 1 · 10 · 50"],
      ["0.1,1,10,100", "0.1 · 1 · 10 · 100"], ["0.05,0.5,5,25", "0.05 · 0.5 · 5 · 25"], ["1,5,10,50", "1 · 5 · 10 · 50"], ["0.01,0.1,1,10", "0.01 · 0.1 · 1 · 10"]] },
    { k: "zsteps", label: "Z offset step sizes (mm)", type: "select", def: "0.005,0.01,0.025,0.05", options: [["0.005,0.01,0.025,0.05", "0.005 · 0.01 · 0.025 · 0.05"],
      ["0.01,0.025,0.05,0.1", "0.01 · 0.025 · 0.05 · 0.1"], ["0.001,0.005,0.01,0.05", "0.001 · 0.005 · 0.01 · 0.05"]] },
    { k: "fxy", label: "Jog speed X / Y", type: "select", def: 100, options: [[50, "50 mm/s"], [100, "100 mm/s"], [200, "200 mm/s"], [300, "300 mm/s"]] },
    { k: "fz", label: "Jog speed Z", type: "select", def: 10, options: [[5, "5 mm/s"], [10, "10 mm/s"], [20, "20 mm/s"], [30, "30 mm/s"]] },
    { k: "invx", label: "Invert X buttons", type: "check", def: false },
    { k: "invy", label: "Invert Y buttons", type: "check", def: false },
    { k: "invz", label: "Invert Z buttons", type: "check", def: false },
  ],
  create(host, cfg) {
    const STEPS = String(cfg.steps || "0.1,1,10,25,50,100").split(",").map(Number), ZSTEPS = String(cfg.zsteps || "0.005,0.01,0.025,0.05").split(",").map(Number);
    const I = { up: PB.icon('<path d="M6 15l6-6 6 6"/>'), down: PB.icon('<path d="M6 9l6 6 6-6"/>'), left: PB.icon('<path d="M15 6l-6 6 6 6"/>'), right: PB.icon('<path d="M9 6l6 6-6 6"/>'),
                house: PB.icon('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'), zup: PB.icon('<path d="M12 20V6M6 12l6-6 6 6"/><path d="M5 22h14"/>'),
                zdown: PB.icon('<path d="M12 4v14M6 12l6 6 6-6"/><path d="M5 2h14"/>'), save: PB.icon('<path d="M5 3h12l4 4v14H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>'),
                reset: PB.icon('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'), chev: PB.icon('<path d="M6 9l6 6 6-6"/>'), tools: PB.icon('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
                abs: PB.icon('<path d="M12 13V4M12 13l7 4M12 13l-7 4"/>'), rel: PB.icon('<path d="M5 19L19 5M10 5h9v9"/>'),
                snow: PB.icon('<path d="M11 3v18M3.5 7.5l15 9M18.5 7.5l-15 9"/><path d="M20 2v4M20 8.5v.5"/>') };
    const arrow = (j, ic, c) => `<button type="button" class="pb-m ${c}" data-jog="${j}" aria-label="Move ${j.replace("-", " minus").replace("+", " plus")}">${ic}</button>`;
    const home = (a, t, c, text) => `<button type="button" class="pb-h ${c}" data-home="${a}" title="${t}" aria-label="${t}">${I.house}${text ? `<span>${text}</span>` : ""}</button>`;
    const field = (label, k, v, unit, extra) => `<label class="pb-pf"><span>${label}</span><input type="number" step="any" data-k="${k}" value="${v}" ${extra || ""}>${unit ? `<em>${unit}</em>` : ""}</label>`;
    const slider = (k, label, unit, min, max, step, rst) => `<div class="pb-ns" data-n="${k}"><div class="pb-nsh"><span class="pb-nsl">${label}</span>${rst !== undefined ? `<button type="button" class="pb-nsr" data-rst="${k}" title="Reset to ${rst}" aria-label="Reset ${label}">${I.reset}</button>` : ""}
        <span class="pb-nsf"><input type="number" min="${min}" max="${max}" step="${step}" data-k="${k}n" aria-label="${label}"><em>${unit}</em></span></div>
        <input type="range" min="${min}" max="${max}" step="${step}" data-k="${k}r" aria-label="${label}"></div>`;
    host.innerHTML = `
      <button type="button" data-a="force" data-head hidden aria-pressed="false" title="Klipper's FORCE_MOVE: move axes that are not homed. This can damage the printer.">FORCE_MOVE</button>
      <button type="button" data-a="off" data-head hidden title="Turn the motors off (M84) so you can move the axes by hand">Motors off</button>
      <button type="button" class="pb-toolsbtn" data-a="tools" data-head hidden aria-haspopup="true" aria-expanded="false">${I.tools}<span>Tools</span>${I.chev}</button>
      <div class="pb-ttc" hidden></div>
      <div class="pb-t2">
        <div class="pb-tl"><div class="pb-tex-t" hidden></div>
          <div class="pb-tx">${arrow("Y+", I.up, "c2 r1")}${arrow("Z+", I.up, "c4 r1")}${home("", "Home all axes", "c5 r1 w", "ALL")}
            ${arrow("X-", I.left, "c1 r2")}${home("X Y", "Home X and Y", "c2 r2")}${arrow("X+", I.right, "c3 r2")}${home("Z", "Home Z", "c4 r2")}${home("X", "Home X", "c5 r2 w", "X")}
            ${arrow("Y-", I.down, "c2 r3")}${arrow("Z-", I.down, "c4 r3")}${home("Y", "Home Y", "c5 r3 w", "Y")}</div>
          <div class="pb-seg pb-tsteps">${STEPS.map(s => `<button type="button" data-step="${s}" aria-pressed="${s === 1}">${s}</button>`).join("")}</div>
        </div>
        <div class="pb-tr">
          <div class="pb-tpos">${["X", "Y", "Z"].map(a => `<label class="pb-pf"><span data-live="${a}">${a} [ -- ]</span><input type="number" step="any" data-ax="${a}" aria-label="${a} position, type a number and press Enter to move there"></label>`).join("")}
            <div class="pb-tgl" role="group" aria-label="Positioning"><button type="button" data-pos="abs" aria-pressed="true" title="Absolute Positioning">${I.abs}</button><button type="button" data-pos="rel" aria-pressed="false" title="Relative Positioning">${I.rel}</button></div></div>
          <div class="pb-tex">${field("Extrude Length", "len", 10, "mm", 'min="0.1"')}<button type="button" class="pb-tb" data-ex="-1">Retract ${I.up}</button>
            ${field("Extrude Speed", "spd", 5, "mm/s", 'min="0.1"')}<button type="button" class="pb-tb" data-ex="1">Extrude ${I.down}</button></div>
          <div class="pb-tz"><div class="pb-tzl"><div class="pb-seg pb-zsteps">${ZSTEPS.map((s, i) => `<button type="button" data-zstep="${s}" aria-pressed="${i === 0}">${s}</button>`).join("")}</div>
              <div class="pb-tzo"><span class="pb-muted">Z Offset</span> <span data-k="zo">0.000mm</span></div></div>
            <div class="pb-tzb"><button type="button" data-zdir="1" title="Nozzle further from the bed">${I.zup}</button><button type="button" data-zdir="-1" title="Nozzle closer to the bed">${I.zdown}</button>
              <button type="button" data-a="zsave" title="Save the Z offset to the probe or endstop">${I.save}</button></div></div>
        </div>
      </div>
      <div class="pb-tst"><button type="button" class="pb-tstb" aria-expanded="false"><span data-k="stat">~ -- mm @ -- mm³/s</span><i>${I.chev}</i></button>
        <div class="pb-tstd" hidden></div></div>
      <div class="pb-t2s">${slider("speed", "Speed", "%", 1, 200, 1, 100)}${slider("flow", "Flow", "%", 1, 200, 1, 100)}</div>
      <div class="pb-t2s pb-tpa" hidden>${slider("pa", "Pressure Advance", "s", 0, 2, 0.001, "the configured value")}${slider("st", "Smooth Time", "s", 0, 0.2, 0.001, "the configured value")}</div>`;
    const q = s => host.querySelector(s), k = n => host.querySelector(`[data-k=${n}]`), all = s => [...host.querySelectorAll(s)];
    const card = host.closest(".pb-card"), ttl = card?.querySelector(".pb-title");
    let stat = null;
    if (ttl && !ttl.querySelector(".pb-tstat")) { stat = PB.el("span", "pb-tstat"); stat.hidden = true; stat.innerHTML = I.snow; stat.title = "The nozzle is too cold to extrude"; ttl.append(stat); }
    let step = STEPS.includes(1) ? 1 : STEPS[Math.min(2, STEPS.length - 1)], zstep = ZSTEPS[0], ok = false, homed = "", printing = false, feats = {}, lastExt = null, rel = false, force = false, inst = null;
    const feed = a => (a === "Z" ? cfg.fz : cfg.fxy) * 60;
    for (const b of all("[data-step]")) b.onclick = () => { step = +b.dataset.step; all("[data-step]").forEach(o => o.setAttribute("aria-pressed", String(o === b))); };
    for (const b of all("[data-zstep]")) b.onclick = () => { zstep = +b.dataset.zstep; all("[data-zstep]").forEach(o => o.setAttribute("aria-pressed", String(o === b))); };
    for (const b of all("[data-home]")) b.onclick = () => { if (ok) gcode(`G28 ${b.dataset.home}`.trim()); };
    for (const b of all("[data-jog]")) b.onclick = () => {
      if (!ok) return;
      const axis = b.dataset.jog[0], inv = cfg[`inv${axis.toLowerCase()}`] ? -1 : 1, dir = (b.dataset.jog[1] === "-" ? -1 : 1) * inv;
      if (force) return forceMove(axis, dir * step);
      gcode(`G91\nG1 ${axis}${dir * step} F${feed(axis)}\nG90`);
    };
    const forceMove = (axis, dist) => gcode(`FORCE_MOVE STEPPER=stepper_${axis.toLowerCase()} DISTANCE=${+dist.toFixed(4)} VELOCITY=${axis === "Z" ? cfg.fz : cfg.fxy} ACCEL=${axis === "Z" ? (lastExt?.max_z_accel || 100) : (lastExt?.max_accel || 3000)}`);
    const boxes = all("[data-ax]");
    for (const x of boxes) x.onkeydown = e => {
      if (e.key === "Escape") x.blur();
      if (e.key !== "Enter" || x.value === "") return;
      const a = x.dataset.ax;
      if (force) { forceMove(a, rel ? +x.value : +x.value - +((lastExt?.position || [])["XYZ".indexOf(a)] || 0)); x.blur(); return; }
      gcode(rel ? `G91\nG1 ${a}${+x.value} F${feed(a)}\nG90` : `G90\nG1 ${a}${+x.value} F${feed(a)}`); x.blur();
    };
    for (const b of all("[data-pos]")) b.onclick = () => { rel = b.dataset.pos === "rel"; all("[data-pos]").forEach(o => o.setAttribute("aria-pressed", String(o === b))); };
    q("[data-a=force]").onclick = () => {
      if (!force && !confirm("Are you sure? This can damage the printer.")) return;
      force = !force; if (inst && lastExt) inst.update(lastExt);
    };
    q("[data-a=off]").onclick = () => PB.confirmGcode("Turn the motors off? Axes will need homing again.", "M84", "Motors off");
    // extruder
    const num = (n, lo, hi, d) => Math.min(hi, Math.max(lo, +k(n).value || d));
    for (const b of all("[data-ex]")) b.onclick = () => gcode(`M83\nG1 E${(+b.dataset.ex * num("len", 0.1, 200, 10)).toFixed(2)} F${Math.round(num("spd", 0.1, 50, 5) * 60)}`);
    // Z offset
    for (const b of all("[data-zdir]")) b.onclick = () => gcode(`SET_GCODE_OFFSET Z_ADJUST=${(+b.dataset.zdir * zstep).toFixed(3)} MOVE=1`);
    q("[data-a=zsave]").onclick = () => {
      const cmd = feats.probe || feats.bltouch ? "Z_OFFSET_APPLY_PROBE" : "Z_OFFSET_APPLY_ENDSTOP";
      PB.confirmGcode(`Save this offset (${cmd})? You then need SAVE_CONFIG (restarts Klipper) when the printer is idle.`, cmd, "Saved. Run SAVE_CONFIG when idle.");
    };
    // the extrusion stats line, which opens to show how it's worked out
    const sb = q(".pb-tstb"), sd = q(".pb-tstd");
    sb.onclick = () => { sd.hidden = !sd.hidden; sb.setAttribute("aria-expanded", String(!sd.hidden)); k("stat").hidden = !sd.hidden; };
    const flowOf = (spd, fd) => spd * Math.PI * (fd / 2) ** 2;
    const stats = p => {
      const len = num("len", 0.1, 200, 10), spd = num("spd", 0.1, 50, 5), fd = p.filament_diameter || 1.75, nd = p.nozzle_diameter || 0.4, lh = 0.2, f = p.extrude_factor || 1;
      const out = Math.round(len * f * (fd ** 2 / nd ** 2) * 10) / 10, flow = Math.round(Math.PI / 4 * fd ** 2 * spd * 10) / 10;
      const max = Math.round(flow / (lh * (nd + lh * (Math.PI / 4 - 1))) * 10) / 10;
      k("stat").textContent = `~ ${out} mm @ ${flow} mm³/s, ${max} mm/s`;
      sd.innerHTML = `<p><span class="s">The active extruder configuration is set for</span> ${fd} mm diameter filament <span class="s">and</span> ${nd} mm nozzle</p>
        <p>Extruding at ${spd} mm/s<span class="s">, the extruder should be able to provide an</span> estimated volumetric flow of ${flow} mm³/s</p>
        <p>Extruding ${len} mm of filament at ${Math.round(f * 100)} % flow<span class="s">, will provide an</span> estimated output length of ${out} mm</p>
        <p><span class="s">Assuming a</span> ${lh} mm layer height<span class="s">, the</span> estimated maximum print speed is ${max} mm/s</p>`;
    };
    for (const n of ["len", "spd"]) k(n).addEventListener("input", () => { if (lastExt) stats(lastExt); });
    // speed, flow, pressure advance: a slider and a box that agree with each other
    const named = { speed: v => gcode(`M220 S${Math.round(v)}`), flow: v => gcode(`M221 S${Math.round(v)}`),
                    pa: v => gcode(`SET_PRESSURE_ADVANCE ADVANCE=${+v}`), st: v => gcode(`SET_PRESSURE_ADVANCE SMOOTH_TIME=${+v}`) };
    const dragging = new Set(), digits = { speed: 0, flow: 0, pa: 4, st: 4 };
    const fill = r => r.style.setProperty("--p", `${(r.value - r.min) / (r.max - r.min) * 100}%`);
    for (const key of Object.keys(named)) {
      const r = k(`${key}r`), n = k(`${key}n`);
      r.oninput = () => { dragging.add(key); n.value = String(+(+r.value).toFixed(digits[key])); fill(r); };
      r.onchange = () => { dragging.delete(key); named[key](+r.value); };
      n.onkeydown = e => { if (e.key !== "Enter" || n.value === "") return; named[key](+n.value); n.blur(); };
    }
    const rv = { speed: 100, flow: 100, pa: 0, st: 0.04 };
    for (const b of all("[data-rst]")) b.onclick = () => named[b.dataset.rst](rv[b.dataset.rst]);
    // tool changer buttons and the Tools menu (as before)
    const tcBox = q(".pb-ttc"), tbtn = q("[data-a=tools]");
    let tcKey = "", toolsKey = "", extKey = "";
    tcBox.onclick = e => { const b = e.target.closest("[data-tc]"); if (b && !b.disabled) gcode(b.dataset.tc); };
    const menu = PB.el("div", "pb-toolmenu"); menu.hidden = true; document.body.append(menu);
    const HELP = { load: "Load filament", unload: "Unload filament", clean: "Clean nozzle", park: "Park toolhead" };
    const busy = new Set();
    const shut = () => { menu.hidden = true; tbtn.setAttribute("aria-expanded", "false"); };
    tbtn.onclick = () => {
      if (!menu.hidden) return shut();
      const r = tbtn.getBoundingClientRect(), below = innerHeight - r.bottom - 12;
      menu.hidden = false; tbtn.setAttribute("aria-expanded", "true");
      menu.style.left = `${Math.max(8, Math.min(r.left, innerWidth - menu.offsetWidth - 8))}px`;
      if (below >= 200 || below >= r.top) { menu.style.bottom = "auto"; menu.style.top = `${r.bottom + 4}px`; menu.style.maxHeight = `${below}px`; }
      else { menu.style.top = "auto"; menu.style.bottom = `${innerHeight - r.top + 4}px`; menu.style.maxHeight = `${r.top - 12}px`; }
    };
    menu.onclick = e => {
      const b = e.target.closest("[data-cmd]");
      if (!b || b.disabled) return;
      shut();
      const c = b.dataset.cmd;
      if (!confirm(`Run ${b.dataset.label}?`)) return;
      busy.add(c);
      gcode(c).finally(() => busy.delete(c));
      toast(`Sent ${b.dataset.label}`);
    };
    const outside = e => { if (!menu.hidden && !menu.contains(e.target) && !tbtn.contains(e.target)) shut(); };
    const onKey = e => { if (e.key === "Escape" && !menu.hidden) shut(); };
    const onScroll = e => { if (!menu.hidden && !menu.contains(e.target)) shut(); };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", onKey);
    addEventListener("scroll", onScroll, true);
    addEventListener("resize", shut);
    const left = q(".pb-tl"), right = q(".pb-tr"), zblock = q(".pb-tz"), cross = q(".pb-tx"), stepsEl = q(".pb-tsteps"), exBlock = q(".pb-tex");
    return inst = {
      open() { busy.clear(); },
      update(p) {
        const live = p.connection === "online" && p.klippy_state === "ready";
        printing = p.state === "printing" || p.state === "paused";
        homed = (p.homed_axes || "").toUpperCase(); feats = p.features || {}; lastExt = p;
        const pos = p.position || [], cold = p.can_extrude === false;
        ok = live && !printing;
        if (printing || !p.force_move) force = false;
        const canMove = a => homed.includes(a) || (force && !(p.multi_steppers || []).includes(a.toLowerCase()));
        const fb = q("[data-a=force]"); fb.hidden = !p.force_move; fb.disabled = !ok; fb.setAttribute("aria-pressed", String(force)); cross.classList.toggle("pb-force", force);
        if (p.pa_config) { rv.pa = p.pa_config.pressure_advance; rv.st = p.pa_config.smooth_time; }
        // while a print runs, Fluidd swaps the move cross for the Z offset buttons
        cross.hidden = stepsEl.hidden = exBlock.hidden = printing;
        if (printing && zblock.parentElement !== left) left.append(zblock);
        else if (!printing && zblock.parentElement !== right) right.append(zblock);
        boxes.forEach((x, i) => {
          const a = "XYZ"[i];
          q(`[data-live=${a}]`).textContent = `${a} [ ${pos[i] == null ? "--" : (+pos[i]).toFixed(i === 2 ? 3 : 2)} ]`;
          if (document.activeElement !== x) x.value = pos[i] == null ? "" : (+pos[i]).toFixed(i === 2 ? 3 : 2);
          x.disabled = !ok || !canMove(a); x.readOnly = printing;
        });
        for (const b of all("[data-home]")) {
          const need = b.dataset.home ? b.dataset.home.split(" ").some(a => !homed.includes(a)) : homed.length < 3;
          b.classList.toggle("need", need); b.disabled = !ok;
        }
        for (const b of all("[data-jog]")) b.disabled = !ok || !canMove(b.dataset.jog[0]);
        for (const b of all("[data-step], [data-zstep]")) b.disabled = !live;
        for (const b of all("[data-ex]")) b.disabled = !live || cold;
        for (const n of ["len", "spd"]) k(n).disabled = !live;
        for (const b of all("[data-zdir]")) b.disabled = !live;
        q("[data-a=zsave]").disabled = !live || printing || !p.z_offset;
        k("zo").textContent = p.z_offset == null ? "--" : `${p.z_offset.toFixed(3)}mm`;
        if (stat) stat.hidden = !(live && cold);
        q("[data-a=off]").hidden = !(ok && homed.length > 0);
        stats(p);
        // sliders
        const sets = { speed: p.speed_factor != null ? p.speed_factor * 100 : null, flow: p.extrude_factor != null ? p.extrude_factor * 100 : null,
                       pa: p.pa?.pressure_advance ?? null, st: p.pa?.smooth_time ?? null };
        q(".pb-tpa").hidden = !p.pa;
        for (const key of Object.keys(sets)) {
          const r = k(`${key}r`), n = k(`${key}n`); r.disabled = n.disabled = !live;
          if (sets[key] != null && !dragging.has(key)) { r.value = sets[key]; fill(r); if (document.activeElement !== n) n.value = String(+(+sets[key]).toFixed(digits[key])); }
        }
        for (const b of all("[data-rst]")) b.disabled = !live;
        // several extruders: pick the active one
        const exts = p.extruders || [], ek = exts.join() + p.active_extruder, et = q(".pb-tex-t");
        if (ek !== extKey) {
          extKey = ek; et.hidden = exts.length < 2;
          et.innerHTML = exts.map((e, i) => `<button type="button" data-t="${i}" aria-pressed="${e === p.active_extruder}">T${i}</button>`).join("");
          for (const b of et.querySelectorAll("[data-t]")) b.onclick = () => gcode(`T${b.dataset.t}`);
        }
        // tool changer
        const tg = p.toolchanger;
        const tsel = t => t.number >= 0 ? `SELECT_TOOL T=${t.number}` : `SELECT_TOOL TOOL=${t.name}`;
        const tc = tg ? tg.tools.map(t => ({ cmd: tsel(t), label: t.number >= 0 ? `T${t.number}` : t.name, active: !!t.active || (t.number >= 0 && t.number === tg.number),
            temp: t.temp != null, desc: `Select ${t.name}` }))
          : (p.tool_changes || []).map(x => ({ cmd: x.name, label: x.name, active: x.active, color: x.color, desc: x.description }));
        tcBox.hidden = !tc.length;
        const tstat = tg && tg.status && tg.status !== "ready" ? tg.status : "";
        const tk = JSON.stringify([tc, tstat]);
        if (tk !== tcKey) {
          tcKey = tk;
          const per = tc.length ? Math.ceil(tc.length / Math.ceil(tc.length / 6)) : 1, rows = [];
          for (let i = 0; i < tc.length; i += per) rows.push(tc.slice(i, i + per));
          const STAT = { changing: "Changing tool…", error: "Toolchanger error", uninitialized: "Toolchanger not initialized", initializing: "Initializing toolchanger…" };
          tcBox.innerHTML = (tstat ? `<div class="pb-thtcst ${esc(tstat)}">${esc(STAT[tstat] || tstat)}</div>` : "") + rows.map(r => `<div class="pb-thtcrow">${r.map(x =>
            `<button type="button" data-tc="${esc(x.cmd)}"${x.active ? ' class="on"' : ""} title="${esc(x.desc)}">${x.color ? `<i style="background:${esc(x.color)}"></i>` : ""}${esc(x.label)}${x.temp ? `<small data-tt="${esc(x.cmd)}"></small>` : ""}</button>`).join("")}</div>`).join("");
        }
        if (tg) for (const t of tg.tools) {
          const s = tcBox.querySelector(`[data-tt="${CSS.escape(tsel(t))}"]`);
          if (s) s.textContent = t.temp != null ? `${Math.round(t.temp)}°` : "";
        }
        for (const b of tcBox.querySelectorAll("button")) b.disabled = !(live && p.state !== "printing" && !(tg && tg.status === "changing"));
        const t = p.tools;
        tbtn.hidden = !t;
        if (t) {
          const kk = JSON.stringify(t);
          if (kk !== toolsKey) {
            toolsKey = kk;
            const H = Object.keys(t.helpers || {}).filter(id => HELP[id]).map(id =>
              `<button type="button" data-h="${id}" data-cmd="${esc(t.helpers[id])}" data-label="${HELP[id]}">${HELP[id]}</button>`);
            menu.innerHTML = H.join("") + (H.length ? "<hr>" : "") + (t.calibrate || []).map(c =>
              `<button type="button" data-cmd="${esc(c)}" data-label="${esc(c)}">${esc(c)}</button>`).join("");
          }
          const allHomed = ["X", "Y", "Z"].every(a => homed.includes(a)), probing = !!(p.manual_probe || {}).active, screws = !!(p.bed_screws || {}).active;
          const toolsOn = live && p.state !== "printing";
          for (const b of menu.querySelectorAll("button")) {
            const h = b.dataset.h, c = b.dataset.cmd;
            const off = h === "load" || h === "unload" ? !p.can_extrude
              : h === "park" ? !allHomed
              : h ? false
              : c === "PROBE_ACCURACY" || c === "PROBE_CALIBRATE" ? !allHomed
              : c === "BED_SCREWS_ADJUST" ? !allHomed || screws
              : !allHomed || probing;
            b.disabled = !toolsOn || off || busy.has(c);
          }
          tbtn.disabled = !toolsOn;
          if (!toolsOn) shut();
        } else shut();
      },
      destroy() {
        document.removeEventListener("pointerdown", outside, true); document.removeEventListener("keydown", onKey);
        removeEventListener("scroll", onScroll, true); removeEventListener("resize", shut); menu.remove();
      },
    };
  },
});
