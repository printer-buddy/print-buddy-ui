PB.parts = PB.parts || {};
PB.parts.macroParams = () => {
  const menu = PB.el("form", "pb-macmenu"); menu.hidden = true; document.body.append(menu);
  let anchor = null;
  const close = () => { menu.hidden = true; anchor = null; };
  const away = e => { if (!menu.hidden && !menu.contains(e.target) && !anchor?.contains(e.target)) close(); };
  document.addEventListener("pointerdown", away, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  addEventListener("resize", close);
  addEventListener("scroll", close, true);
  function form(m, btn) {
    if (!menu.hidden && anchor === btn) return close();
    anchor = btn;
    menu.innerHTML = `${m.params.map(x => `<label>${esc(x.name)}<input name="${esc(x.name)}" placeholder="${esc(x.default ?? "")}" autocomplete="off" spellcheck="false"></label>`).join("")}<button type="submit" class="bd-primary">Send</button>`;
    menu.onsubmit = e => {
      e.preventDefault();
      const args = [...menu.querySelectorAll("input")].filter(i => i.value.trim()).map(i => `${i.name}=${/\s/.test(i.value.trim()) ? `"${i.value.trim()}"` : i.value.trim()}`);
      const cmd = [m.name, ...args].join(" "); close(); gcode(cmd); toast(`Sent ${cmd}`);
    };
    menu.hidden = false;
    const r = btn.getBoundingClientRect(), w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = `${Math.max(8, Math.min(r.right - w, innerWidth - w - 8))}px`;
    menu.style.top = `${r.bottom + h + 8 > innerHeight && r.top > h + 8 ? r.top - h - 4 : r.bottom + 4}px`;
    menu.querySelector("input")?.focus();
  }
  return { form, destroy() { document.removeEventListener("pointerdown", away, true); menu.remove(); } };
};
