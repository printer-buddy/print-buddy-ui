PB.panel("gcodeview", {
  title: "G-code preview", desc: "2D layer view or 3D view of a print file; follows the print", cls: "adv",
  icon: PB.icon('<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 12l8 4 8-4M4 17l8 4 8-4"/>'),
  gear: true,
  settings: [
    { k: "view", label: "Start in", type: "select", def: "2d", options: [["2d", "2D (layer)"], ["3d", "3D"]] },
    { k: "quality", label: "3D quality", type: "select", def: "auto", options: [["auto", "Auto"], ["solid", "Solid (lit)"], ["lines", "Lines (fast)"]] },
    { k: "color", label: "3D colours", type: "select", def: "feature", options: [["feature", "By feature (walls, infill…)"], ["tool", "By tool"], ["single", "One colour"]] },
    { k: "toolhead", label: "Show the nozzle in 3D", type: "check", def: true },
    { k: "specular", label: "Shiny lighting in 3D", type: "check", def: true },
    { k: "travel", label: "Show travel moves", type: "check", def: false },
    { k: "height", label: "Height", type: "select", def: 320, options: [[220, "Small"], [320, "Medium"], [480, "Tall"]] },
  ],
  create(host, cfg) {
    const I = d => PB.icon(d);
    host.innerHTML = `<div class="pb-tool"><select data-a="pick" aria-label="Preview a file"><option value="">Preview a file…</option></select>
        <button type="button" data-a="load">Load current file</button><span class="bd-sp"></span>
        <span class="bd-seg pb-gmode"><button type="button" data-m="2d">2D</button><button type="button" data-m="3d">3D</button></span>
        <span class="pb-gmsg pb-muted"></span></div>
      <input type="checkbox" data-a="follow" checked hidden>
      <div class="pb-gtop"><div class="pb-gsl">
          <label class="pb-gslr"><span>Layer</span><input type="range" data-a="layer" min="0" max="0" value="0"><output data-o="layer">0</output></label>
          <label class="pb-gslr"><span>Progress</span><input type="range" data-a="prog" min="0" max="0" value="0"><output data-o="prog">0</output></label></div>
        <div class="pb-gside"><div class="pb-gstat"><div>Layers</div><b data-o="n">0</b><div>Current layer height</div><b data-o="z">0</b></div>
          <button type="button" data-a="reset">Reset file</button></div></div>
      <div class="pb-gwrap"><canvas class="pb-gcv"></canvas><div class="pb-g3" hidden><div class="pb-g3legend"></div><span class="pb-g3help pb-muted">Drag: rotate · Right-drag / Shift: pan · Wheel / pinch: zoom · Double-click: reset</span></div>
        <div class="pb-gopts" hidden>
          <button type="button" data-t="follow" aria-pressed="true" title="Follow progress">${I('<path d="M8 5v14l11-7z"/>')}</button>
          <button type="button" data-t="prev" aria-pressed="true" title="Show previous layer">${I('<path d="M12 4l8 4-8 4-8-4z" opacity=".4"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>')}</button>
          <button type="button" data-t="cur" aria-pressed="true" title="Show current layer">${I('<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4" opacity=".4"/>')}</button>
          <button type="button" data-t="next" aria-pressed="false" title="Show next layer">${I('<path d="M4 8l8 4 8-4M4 12l8 4 8-4" opacity=".4"/><path d="M12 4l8 4-8 4-8-4z"/>')}</button>
          <button type="button" data-t="moves" aria-pressed="false" title="Show moves">${I('<path d="M5 19L19 5M19 5h-6M19 5v6" stroke-dasharray="3 3"/>')}</button>
          <button type="button" data-t="ext" aria-pressed="true" title="Show extrusions">${I('<path d="M4 18c4-10 8 4 16-12"/>')}</button>
          <button type="button" data-t="parts" aria-pressed="true" title="Show objects (click one to skip it)">${I('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14l7 7M21 14l-7 7"/>')}</button></div></div>`;
    const q = s => host.querySelector(s), cv = q("canvas"), range = q("[data-a=layer]"), prog = q("[data-a=prog]"), gmsg = q(".pb-gmsg");
    const o = k => q(`[data-o=${k}]`), opts = q(".pb-gopts");
    const g3 = q(".pb-g3"); cv.style.height = g3.style.height = `${cfg.height}px`;
    let mode = cfg.view === "3d" ? "3d" : "2d";
    let layers = [], file = null, bed = null, pos = null, loading = false;
    const TG = { prev: true, cur: true, next: false, ext: true, parts: true };
    let objs = null, printing = false, okey = "";
    const S = {
      T: TG, prog: null, map: null,
      get objs() { return objs; }, get printing() { return printing; },
      partsOn: () => !file || file === cur,
      doneOf(L) {
        const n = L.segs.length / 4, live = q("[data-a=follow]").checked && pos != null && pos >= L.start;
        if (live) { let d = 0; while (d < n && L.offs[d] < pos) d++; return d * 4; }
        return (this.prog == null ? n : Math.min(n, this.prog)) * 4;
      },
      cv, q, cfg, g3, gmsg, range, draw: () => draw(),
      get layers() { return layers; }, get file() { return file; }, get bed() { return bed; }, get pos() { return pos; },
      get mode() { return mode; }, set mode(v) { mode = v; },
    };
    const v2 = PB.parts.gcode2d(S), v3 = PB.parts.gcode3d(S), parse = PB.parts.gcodeParse;
    const draw = () => {
      const L = layers[+range.value], n = L ? L.segs.length / 4 : 0, d = L ? S.doneOf(L) / 4 : 0;
      prog.max = n; prog.value = d; o("prog").textContent = d; o("n").textContent = layers.length; o("z").textContent = L ? L.z.toFixed(2) : "0";
      o("layer").textContent = L ? +range.value + 1 : 0; range.disabled = prog.disabled = !L; opts.hidden = !file;
      mode === "3d" ? v3.draw3d() : v2.draw2d();
    };
    const setMode = m => v3.setMode(m);
    function setLayer(i) { range.value = i; S.prog = null; draw(); }
    async function load(name) {
      if (!name || loading) return;
      loading = true; gmsg.textContent = `Loading ${name}…`;
      try {
        const r = await fetch(PB.fileUrl("gcodes", name)); if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        gmsg.textContent = "Reading the G-code…"; await new Promise(res => setTimeout(res, 20));
        layers = parse(text); file = name;
        range.max = Math.max(0, layers.length - 1);
        gmsg.textContent = `${name} · ${layers.length} layers`;
        setLayer(0); follow();
      } catch (e) { gmsg.textContent = `Couldn't load: ${e.message}`; }
      loading = false;
    }
    function follow() {
      if (!q("[data-a=follow]").checked || pos == null || !layers.length) return;
      let i = 0; while (i + 1 < layers.length && layers[i + 1].start <= pos) i++;
      if (i !== +range.value) setLayer(i); else draw();
    }
    let cur = null, manual = false, listed = false;
    async function listFiles() {
      try {
        const files = (await PB.rpc("server.files.list", { root: "gcodes" })) || [];
        const sel = q("[data-a=pick]");
        sel.innerHTML = `<option value="">Preview a file…</option>` + files.filter(f => /\.(gcode|gco|g)$/i.test(f.path || ""))
          .sort((a, b) => (b.modified || 0) - (a.modified || 0)).slice(0, 300).map(f => `<option>${esc(f.path)}</option>`).join("");
        listed = true;
      } catch {}
    }
    const pick = name => { manual = true; setFollow(false); load(name); };
    q("[data-a=pick]").onchange = e => { if (e.target.value) pick(e.target.value); };
    q("[data-a=load]").onclick = () => { manual = false; setFollow(true); load(cur); };
    PB.previewFile = name => { PB.reveal(host); pick(name); };
    const setFollow = on => { q("[data-a=follow]").checked = on; q("[data-t=follow]").setAttribute("aria-pressed", on); };
    range.oninput = () => { setFollow(false); setLayer(+range.value); };
    prog.oninput = () => { setFollow(false); S.prog = +prog.value; draw(); };
    cv.addEventListener("click", e => {
      const m = S.map; if (!m || !TG.parts || !objs?.list?.length || !printing || mode !== "2d") return;
      const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1, px = (e.clientX - r.left) * d, py = (e.clientY - r.top) * d;
      const x = (px - m.ox + m.x0 * m.s) / m.s, y = (m.H - m.oy + m.y0 * m.s - py) / m.s;
      const hit = S.partsOn() && objs.list.find(o => { const c = o.center || o.polygon?.[0]; return c && !objs.excluded.includes(o.name) && Math.hypot(c[0] - x, c[1] - y) < (m.rad || 4) * 1.2; });
      if (!hit || !confirm(`Skip "${hit.name}" for the rest of this print? This can't be undone.`)) return;
      gcode(`EXCLUDE_OBJECT NAME=${hit.name}`); toast(`Skipping ${hit.name}`);
    });
    q("[data-a=reset]").onclick = () => { layers = []; file = null; manual = false; gmsg.textContent = ""; range.max = 0; S.prog = null; draw(); };
    q("[data-t=follow]").onclick = () => { setFollow(!q("[data-a=follow]").checked); if (q("[data-a=follow]").checked) follow(); else draw(); };
    for (const b of opts.querySelectorAll("[data-t]")) if (b.dataset.t !== "follow") b.onclick = () => {
      const k = b.dataset.t, on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on);
      if (k === "moves") cfg.travel = on; else TG[k] = on; draw();
    };
    q("[data-t=moves]").setAttribute("aria-pressed", !!cfg.travel);
    for (const b of q(".pb-gmode").querySelectorAll("button")) b.onclick = () => setMode(b.dataset.m);
    new ResizeObserver(() => draw()).observe(host);
    setMode(mode);
    return {
      open() { layers = []; file = null; pos = null; manual = false; listed = false; gmsg.textContent = ""; range.max = 0; S.prog = null; draw(); },
      shown() { draw(); if (!listed) listFiles(); },
      destroy() { v3.destroy(); },
      update(p) {
        bed = p.bed_area; cur = (p.state === "printing" || p.state === "paused" || p.state === "complete") ? p.filename : null;
        q("[data-a=load]").disabled = !cur || loading;
        if (!manual && cur && file !== cur && !loading && host.offsetParent && (p.state === "printing" || p.state === "paused")) load(cur);
        objs = p.objects; printing = p.state === "printing" || p.state === "paused";
        const ok = JSON.stringify([objs?.list?.map(x => x.name), objs?.excluded, objs?.current, printing]); if (ok !== okey) { okey = ok; draw(); }
        if (p.file_position !== pos) { pos = p.file_position; if (file === cur) follow(); }
      },
    };
  },
});
