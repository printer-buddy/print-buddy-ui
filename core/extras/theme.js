//LICENSE
//
//Copyright (C) 2026  sterling motuz <Sterling@dexabyte.ca>
//
//for https://github.com/printer-buddy/printer-buddy
//
//SPDX-License-Identifier: AGPL-3.0-only
//
//Additional term (AGPL-3.0 section 7b, keep author credit): keep this header
//
//Additional term (AGPL-3.0 section 7c, mark changed versions): if you make any changes, you must include a CHANGELOG with all changes and their dates
(() => {
  const { el } = PB;
  let theme = {};
  let logobg = PB.store.get("pb-logobg", false), shown = () => {};
  let camsee = PB.store.get("pb-camsee", 18);
  const seeThrough = () => document.documentElement.style.setProperty("--pb-camovl", String((100 - camsee) / 100));
  seeThrough();
  const style = el("style"); document.head.append(style);
  const sheet = el("link"); sheet.rel = "stylesheet";
  const imp = decls => decls.split(";").filter(d => d.trim()).map(d => `${d.trim()} !important`).join("; ");
  function use() {
    const root = document.documentElement, url = n => `/api/ui/theme/${encodeURIComponent(n)}?v=${Date.now()}`;
    if (theme.color) root.style.setProperty("--orange", theme.color); else root.style.removeProperty("--orange");
    document.body.classList.toggle("pb-hasbg", !!theme.background);
    if (theme.background) root.style.setProperty("--pb-bgimg", `url("${url(theme.background)}")`); else root.style.removeProperty("--pb-bgimg");
    if (theme.sidebar) root.style.setProperty("--pb-railimg", `url("${url(theme.sidebar)}")`); else root.style.removeProperty("--pb-railimg");
    document.body.classList.toggle("pb-hasrail", !!theme.sidebar);
    const css = theme.css || {}, colors = theme.colors || {}, fonts = theme.fonts || {};
    document.body.classList.toggle("pb-thmpage", !!css.page);
    const face = f => f?.file ? `@font-face { font-family: "${f.family}"; src: url("${url(f.file)}"); }` : "";
    style.textContent = [
      css.page && `html body.pb-thmpage { ${imp(css.page)} }`,
      css.panel && `:is(#page, #home).bd :is(.pb-card, .bd-rail), .panel, .card { ${imp(css.panel)} }`,
      css.head && `:is(#page, #home).bd .pb-card > header, .bd-top { ${imp(css.head)} }`,
      css.over && `body::before { content: ""; position: fixed; pointer-events: none; z-index: -1; ${imp(css.over)} }`,
      ...["dark", "light"].filter(m => colors[m]).map(m => `html[data-theme="${m}"], html[data-theme="${m}"] :is(#page, #home).bd { ${Object.entries(colors[m]).map(([k, v]) => `--${k}: ${v} !important`).join("; ")} }`),
      face(fonts.text), face(fonts.mono),
      fonts.text && `body, :is(#page, #home).bd { font-family: "${fonts.text.family}", Lato, system-ui, -apple-system, "Segoe UI", sans-serif !important; }`,
      fonts.mono && `:is(#page, #home).bd { --bd-mono: "${fonts.mono.family}", ui-monospace, Consolas, monospace !important; }`,
    ].filter(Boolean).join("\n");
    if (theme.stylesheet) { sheet.href = url(theme.stylesheet); document.head.append(sheet); } else sheet.remove();
    for (const h of document.querySelectorAll(".top h1, #pgName")) {
      let img = h.previousElementSibling?.classList.contains("pb-logo") ? h.previousElementSibling : null;
      if (!theme.logo) { img?.remove(); continue; }
      if (!img) { img = el("img", "pb-logo"); img.alt = ""; h.before(img); }
      img.src = url(theme.logo);
    }
    let bgl = document.querySelector(".pb-bglogo");
    if (logobg && theme.logo) {
      if (!bgl) { bgl = el("div", "pb-bglogo"); document.body.append(bgl); }
      bgl.style.backgroundImage = `url("${url(theme.logo)}")`;
    } else bgl?.remove();
  }
  api("/api/ui/theme").then(r => { theme = r.theme || {}; use(); shown(); }).catch(() => {});

  const look = document.querySelector('.pb-settings [data-body="look"]'); if (!look) return;
  const box = el("div", "pb-thm", `<h4>Themes</h4>
    <p class="pb-muted">Pick a look for Printer Buddy on every device. To add your own, open a pull request on
      <a href="https://github.com/printer-buddy/printer-buddy-themes" target="_blank" rel="noopener">printer-buddy-themes</a>.</p>
    <div class="pb-thmlist"></div>
    <div class="pb-thmrow"><span class="pb-muted pb-thmnow"></span><span class="bd-sp"></span><button type="button" data-t="reset">Back to Printer Buddy's own look</button></div>
    <label class="bd-check pb-thmlogobg"><input type="checkbox"${logobg ? " checked" : ""}> Show the logo faintly behind the dashboard</label>
    <label class="pb-thmcam">Camera overlay see-through <input type="range" min="0" max="100" step="5" value="${camsee}"> <span>${camsee}%</span></label>`);
  look.append(box);
  box.querySelector(".pb-thmlogobg input").onchange = e => { logobg = e.target.checked; PB.store.set("pb-logobg", logobg); use(); };
  box.querySelector(".pb-thmcam input").oninput = e => {
    camsee = +e.target.value; PB.store.set("pb-camsee", camsee); seeThrough();
    box.querySelector(".pb-thmcam span").textContent = `${camsee}%`;
  };
  const q = s => box.querySelector(s), list = q(".pb-thmlist");
  const now = () => {
    q(".pb-thmnow").textContent = theme.source === "list" ? `Using ${theme.name}.`
      : theme.source ? `Using the ${theme.source === "fluidd" ? "Fluidd" : "Mainsail"} theme copied before.` : "Using Printer Buddy's own look.";
    q("[data-t=reset]").hidden = !theme.source;
    for (const c of list.querySelectorAll(".pb-thmcard")) c.classList.toggle("on", theme.source === "list" && c.dataset.id === theme.id);
  };
  const load = async () => {
    list.innerHTML = `<p class="pb-muted">Loading the themes…</p>`;
    let items;
    try { items = (await api("/api/ui/themes")).themes || []; }
    catch (e) {
      list.innerHTML = `<p class="pb-muted">${esc(e.message)} <button type="button" data-t="retry">Try again</button></p>`;
      list.querySelector("[data-t=retry]").onclick = load;
      return;
    }
    list.innerHTML = items.length ? items.map(t => `<button type="button" class="pb-thmcard" data-id="${esc(t.id)}">
        ${t.preview ? `<img alt="" src="${esc(t.preview)}">` : `<span class="pb-thmsws">${t.swatch.map(c => `<i style="background:${esc(c)}"></i>`).join("")}</span>`}
        <b>${esc(t.name)}</b><span class="pb-muted">${esc(t.author)}</span></button>`).join("") : `<p class="pb-muted">No themes in the list yet.</p>`;
    now();
  };
  new IntersectionObserver((seen, obs) => { if (seen.some(s => s.isIntersecting)) { obs.disconnect(); load(); } }).observe(box);
  shown = now; now();
  list.onclick = async e => {
    const card = e.target.closest(".pb-thmcard"); if (!card) return;
    card.disabled = true;
    try { theme = (await api("/api/ui/theme/pick", { method: "POST", body: JSON.stringify({ id: card.dataset.id }) })).theme; }
    catch (err) { card.disabled = false; return toast(err.message); }
    card.disabled = false;
    if (theme.mode) PB.setTheme(theme.mode);
    use(); now(); toast(`Using ${theme.name}`);
  };
  q("[data-t=reset]").onclick = async () => {
    if (!confirm("Go back to Printer Buddy's own look on every device?")) return;
    try { theme = (await api("/api/ui/theme", { method: "DELETE" })).theme || {}; } catch (e) { return toast(e.message); }
    use(); now(); toast("Back to Printer Buddy's own look");
  };
})();
