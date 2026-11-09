// Per-nozzle filament info and a Top Cover / purifier accessory, seen on the Snapmaker U1. Unverified on real
// hardware - the data shapes come from reading Snapmaker's open-sourced Klipper fork, not from a live printer.
PB.panel("topcover", {
  title: "Top cover", desc: "Per-nozzle filament and a purifier/top cover accessory, if the printer reports one", cls: "adv",
  icon: PB.icon('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>'),
  create(host) {
    host.innerHTML = `<div class="pb-tc"></div>`;
    const box = host.querySelector(".pb-tc");
    let key = "", busy = new Set();
    function draw(p) {
      const mats = p.materials, pur = p.purifier;
      if (!mats && !pur) { box.innerHTML = `<p class="pb-muted">No per-nozzle filament info or top cover on this printer.</p>`; return; }
      let html = "";
      if (mats) html += `<div class="pb-tc-mats">${mats.map(m => `<div class="pb-tc-mat" title="${esc(m.vendor || "Empty")}">
          <span class="pb-tc-swatch" style="--c:${esc(m.color || "transparent")}"></span>
          <span class="pb-tc-no">${m.index + 1}</span><span class="pb-tc-v">${esc(m.vendor || "Empty")}</span></div>`).join("")}</div>`;
      if (pur) {
        const fan = (id, label, v) => `<label class="pb-speed" data-fan="${id}"><span class="pb-lab">${label}</span>
            <input type="range" min="0" max="100" step="1" value="${Math.round((v || 0) * 100)}" ${pur.present ? "" : "disabled"}>
            <output>${Math.round((v || 0) * 100)}%</output></label>`;
        html += `<div class="pb-tc-pur">${pur.present ? "" : `<p class="pb-muted">No top cover detected.</p>`}
            ${fan("exhaust", "Exhaust fan", pur.exhaust)}${fan("inner", "Inner fan", pur.inner)}</div>`;
      }
      box.innerHTML = html;
      for (const row of box.querySelectorAll("[data-fan]")) {
        const fan = row.dataset.fan, r = row.querySelector("input"), o = row.querySelector("output");
        r.oninput = () => { busy.add(fan); o.textContent = `${r.value}%`; };
        r.onchange = () => { busy.delete(fan); command("purifier", { fan, speed: r.value / 100 }); };
      }
    }
    return {
      open() { key = ""; busy.clear(); },
      update(p) {
        const k = JSON.stringify([p.materials, p.purifier]);
        if (k === key) return;
        key = k;
        draw(p);
      },
    };
  },
});
