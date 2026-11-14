PB.panel("limits", {
  title: "Limits", desc: "Velocity and acceleration, live", cls: "adv",
  icon: PB.icon('<path d="M3 17a9 9 0 0 1 18 0"/><path d="M12 17l4-6"/>'),
  create(host) {
    const RESET = PB.icon('<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/>');
    // key, SET_VELOCITY_LIMIT name, label, unit, min, step, scale (the cruise ratio is shown as a percent)
    const ALL = {
      max_velocity: ["VELOCITY", "Velocity", "mm/s", 1, 1, 1], square_corner_velocity: ["SQUARE_CORNER_VELOCITY", "Square corner velocity", "mm/s", 0, 0.1, 1],
      max_accel: ["ACCEL", "Acceleration", "mm/s²", 1, 1, 1], minimum_cruise_ratio: ["MINIMUM_CRUISE_RATIO", "Minimum cruise ratio", "%", 0, 1, 100],
      max_accel_to_decel: ["ACCEL_TO_DECEL", "Accel to decel", "mm/s²", 1, 1, 1],
    };
    host.innerHTML = `<div class="pb-lim"></div>`;
    const box = host.querySelector(".pb-lim"); let key = "", last = {};
    const num = (v, sc) => +(v * sc).toFixed(sc === 1 ? 3 : 0);
    function build(keys) {
      box.innerHTML = keys.map(k => { const [, name, unit, , step] = ALL[k];
        return `<label class="pb-fo" data-k="${k}"><span class="pb-lab">${name}</span><input type="range" step="${step}">
          <span class="pb-fv"><input type="number" class="pb-fnum pb-fnumw" step="${step}"><i>${unit}</i></span>
          <button type="button" class="pb-rst" title="Reset to the configured value" aria-label="Reset ${name}">${RESET}</button></label>`; }).join("");
      for (const row of box.querySelectorAll("[data-k]")) {
        const k = row.dataset.k, [cmd, , , mn, , sc] = ALL[k], r = row.querySelector("input[type=range]"), nf = row.querySelector(".pb-fnum");
        const send = v => { v = Math.max(mn, +v); if (isNaN(v)) return; gcode(`SET_VELOCITY_LIMIT ${cmd}=${sc === 1 ? v : v / sc}`); };
        r.oninput = () => { row.dataset.busy = 1; nf.value = r.value; };
        r.onchange = () => { delete row.dataset.busy; send(r.value); };
        nf.onfocus = () => { row.dataset.busy = 1; };
        nf.onblur = () => { delete row.dataset.busy; };
        nf.onchange = () => { r.max = Math.max(+r.max, +nf.value); r.value = nf.value; send(nf.value); };
        row.querySelector(".pb-rst").onclick = () => { const d = (last.d || {})[k]; if (d != null) send(d * sc); };
      }
    }
    return {
      update(p) {
        const l = p.limits || {}, d = p.limits_default || {}, live = p.connection === "online" && p.klippy_state === "ready";
        last = { d };
        const keys = ["max_velocity", "square_corner_velocity", "max_accel", l.minimum_cruise_ratio != null ? "minimum_cruise_ratio" : "max_accel_to_decel"].filter(k => l[k] != null);
        const kk = keys.join("|"); if (kk !== key) { key = kk; build(keys); }
        for (const k of keys) {
          const row = box.querySelector(`[data-k=${k}]`), [, , , mn, , sc] = ALL[k], r = row.querySelector("input[type=range]"), nf = row.querySelector(".pb-fnum");
          const cur = num(l[k], sc), def = d[k] != null ? num(d[k], sc) : cur;
          r.min = mn; r.max = k === "minimum_cruise_ratio" ? 99 : Math.max(def, cur);
          for (const e of [r, nf, row.querySelector(".pb-rst")]) e.disabled = !live;
          if (!row.dataset.busy) { r.value = cur; nf.value = cur; }
        }
      },
    };
  },
});
