PB.parts = PB.parts || {};
PB.parts.gcode2d = S => {
    function draw2d() {
      const r = S.cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
      S.cv.width = Math.max(1, r.width * dpr); S.cv.height = Math.max(1, r.height * dpr);
      const g = S.cv.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S.cv.width, S.cv.height);
      const [x0, y0, x1, y1] = S.bed || [0, 0, 250, 250], s = Math.min(S.cv.width / (x1 - x0), S.cv.height / (y1 - y0)) * 0.96;
      const ox = (S.cv.width - (x1 - x0) * s) / 2, oy = (S.cv.height - (y1 - y0) * s) / 2;
      g.setTransform(s, 0, 0, -s, ox - x0 * s, S.cv.height - oy + y0 * s);   // printer coords, Y up
      g.lineWidth = 1.5 / s; g.strokeStyle = "#2c2c31"; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
      S.map = { s, ox, oy, x0, y0, H: S.cv.height };
      const O = S.objs, rad = Math.max(3.5, Math.max(x1 - x0, y1 - y0) / 60);
      S.map.rad = rad;
      const parts = () => {
        if (!(S.T.parts && O?.list?.length && S.partsOn())) return;
        for (const o of O.list) {
          const sk = O.excluded.includes(o.name), now = o.name === O.current;
          g.beginPath();
          if (o.polygon?.length > 2) o.polygon.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])), g.closePath();
          else if (o.center) g.arc(o.center[0], o.center[1], rad, 0, 7); else continue;
          g.fillStyle = sk ? "rgba(229,72,77,.2)" : now ? "rgba(255,138,31,.2)" : "rgba(143,139,153,.15)";
          g.strokeStyle = sk ? "#e5484d" : now ? "#ff8a1f" : "#8f8b99"; g.lineWidth = 1.2 / s; g.setLineDash(sk ? [4 / s, 3 / s] : []);
          g.fill(); g.stroke(); g.setLineDash([]);
          const c = o.center || o.polygon?.[0]; if (!c) continue;
          g.beginPath(); g.arc(c[0], c[1], rad * .8, 0, 7); g.fillStyle = sk ? "rgba(229,72,77,.35)" : "rgba(30,30,34,.85)"; g.fill();
          g.strokeStyle = "#e5484d"; g.lineWidth = 1.4 / s; g.stroke();
          const d = rad * .35; g.beginPath(); g.moveTo(c[0] - d, c[1] - d); g.lineTo(c[0] + d, c[1] + d); g.moveTo(c[0] + d, c[1] - d); g.lineTo(c[0] - d, c[1] + d); g.stroke();
        }
      };
      if (!S.layers.length) return parts();
      const li = +S.range.value, line = (arr, n = arr.length) => { g.beginPath(); for (let i = 0; i < n; i += 4) { g.moveTo(arr[i], arr[i + 1]); g.lineTo(arr[i + 2], arr[i + 3]); } g.stroke(); };
      if (S.T.prev && S.layers[li - 1]) { g.strokeStyle = "rgba(143,139,153,.35)"; g.lineWidth = 0.45; line(S.layers[li - 1].segs); }
      const L = S.layers[li]; if (!L) return parts();
      if (S.T.next && S.layers[li + 1]) { g.strokeStyle = "rgba(143,139,153,.2)"; g.lineWidth = 0.35; line(S.layers[li + 1].segs); }
      if (!S.T.cur) return parts();
      if (S.cfg.travel) { g.strokeStyle = "rgba(79,209,197,.35)"; g.lineWidth = 0.25; line(L.trav); }
      const done = S.doneOf(L);
      g.lineWidth = 0.45; g.strokeStyle = "#ff8a1f"; if (S.T.ext) line(L.segs, done);
      if (done < L.segs.length) { g.strokeStyle = "rgba(255,138,31,.25)"; const rest = L.segs.slice(done); line(rest); }
      parts();
    }
  return { draw2d };
};
