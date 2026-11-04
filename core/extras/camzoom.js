(() => {
  const MAX = 8;

  function attach(box, img) {
    if (!box || !img || box.dataset.zoom) return;
    box.dataset.zoom = "1";
    let z = 1, x = 0, y = 0;
    const pts = new Map();
    let last = null;

    const ctl = document.createElement("div");
    ctl.className = "pb-zoom";
    ctl.innerHTML = '<button type="button" data-z="in" title="Zoom in" aria-label="Zoom in">+</button>'
      + '<button type="button" data-z="out" title="Zoom out" aria-label="Zoom out">−</button>'
      + '<button type="button" data-z="reset" title="Back to normal" aria-label="Reset zoom" hidden></button>';
    box.append(ctl);
    const label = ctl.querySelector("[data-z=reset]");

    function apply() {
      const r = box.getBoundingClientRect();
      const mx = r.width * (z - 1) / 2, my = r.height * (z - 1) / 2;
      x = Math.min(mx, Math.max(-mx, x));
      y = Math.min(my, Math.max(-my, y));
      img.style.scale = z > 1 ? String(z) : "";
      img.style.translate = z > 1 ? x + "px " + y + "px" : "";
      box.classList.toggle("zoomed", z > 1);
      label.hidden = z <= 1;
      label.textContent = (Math.round(z * 10) / 10) + "×";
    }
    function reset() { z = 1; x = 0; y = 0; apply(); }
    function zoomAt(f, px, py) {
      const r = box.getBoundingClientRect();
      const cx = px - r.left - r.width / 2, cy = py - r.top - r.height / 2;
      const nz = Math.min(MAX, Math.max(1, z * f));
      if (nz === z) return;
      x = cx - (cx - x) * nz / z;
      y = cy - (cy - y) * nz / z;
      z = nz;
      if (z === 1) { x = 0; y = 0; }
      apply();
    }
    const busy = () => box.classList.contains("drawing") || img.hidden;

    box.addEventListener("wheel", e => {
      if (busy()) return;
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    }, { passive: false });

    box.addEventListener("pointerdown", e => {
      if (busy() || z <= 1 || e.target.closest("button")) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      box.setPointerCapture(e.pointerId);
      last = null;
    });
    box.addEventListener("pointermove", e => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) {
        x += e.clientX - p.x; y += e.clientY - p.y;
        p.x = e.clientX; p.y = e.clientY;
        apply();
        return;
      }
      p.x = e.clientX; p.y = e.clientY;
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (last) {
        x += mx - last.mx; y += my - last.my;
        zoomAt(d / last.d, mx, my);
      }
      last = { d, mx, my };
    });
    const up = e => { pts.delete(e.pointerId); last = null; };
    box.addEventListener("pointerup", up);
    box.addEventListener("pointercancel", up);

    box.addEventListener("dblclick", e => {
      if (busy() || e.target.closest("button")) return;
      if (z > 1) reset(); else zoomAt(2.5, e.clientX, e.clientY);
    });
    ctl.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      const r = box.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (b.dataset.z === "in") zoomAt(1.5, cx, cy);
      else if (b.dataset.z === "out") zoomAt(1 / 1.5, cx, cy);
      else reset();
    });
    ctl.hidden = img.hidden;

    new MutationObserver(() => { ctl.hidden = img.hidden; if (img.hidden) reset(); })
      .observe(img, { attributes: true, attributeFilter: ["hidden"] });
    const which = () => img.dataset.camPid + "|" + img.dataset.camIdx;
    let was = which();
    new MutationObserver(() => { const now = which(); if (now !== was) { was = now; reset(); } })
      .observe(img, { attributes: true, attributeFilter: ["data-cam-idx", "data-cam-pid"] });
    new MutationObserver(() => { if (box.classList.contains("drawing") && z > 1) reset(); })
      .observe(box, { attributes: true, attributeFilter: ["class"] });
    box.addEventListener("campick", reset);
    addEventListener("resize", apply);
  }

  function init() {
    attach(document.querySelector("#pgCam"), document.querySelector("#pgImg"));
    attach(document.querySelector(".ctl-cam"), document.querySelector("#ctlImg"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
