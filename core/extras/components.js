PB.components = (() => {
  const LABEL = { ui: "Interface", notify: "Notifications", timelapse: "Timelapse", streamer: "Camera streamer" };
  const rpc = (pid, method, params) => api(`/api/printers/${pid}/rpc`, { method: "POST", body: JSON.stringify({ method, params }) }).then(r => r.result);

  async function act(box, body, text) {
    if (!confirm(text)) return false;
    const msg = box.querySelector(".pb-compmsg");
    for (const b of box.querySelectorAll("button, select")) b.disabled = true;
    msg.textContent = "Working… this can take a minute.";
    try {
      const r = await api("/api/components", { method: "POST", body: JSON.stringify(body) });
      if (!r.ok) throw new Error(r.output.split("\n").pop() || "failed");
      if (!r.restarting) { toast("Done"); load(box); return true; }
      msg.textContent = "Done. Printer Buddy is restarting, this page reloads by itself.";
      return true;
    } catch (e) {
      msg.textContent = `Failed: ${e.message}`;
      for (const b of box.querySelectorAll("button, select")) b.disabled = false;
      return false;
    }
  }

  // dev = { key, on, locked }: hold (or right-click) the name for a dev/beta builds checkbox
  const row = (name, installed, latest, update, extra, btn, needs, dev) => `<div class="pb-li"><div class="pb-lmain">
      <div class="pb-lname"${dev ? ` data-devkey="${dev.key}" title="Hold for dev/beta builds"` : ""}>${esc(name)}${dev?.on || dev?.locked ? ` <span class="pb-devtag">dev</span>` : ""}</div>
      ${dev ? `<label class="pb-chk pb-devopt" hidden><input type="checkbox" data-devpart="${dev.key}"${dev.on || dev.locked ? " checked" : ""}${dev.locked ? " disabled" : ""}>
        Dev/beta builds${dev.locked ? " (the whole channel is nightly)" : ""}</label>` : ""}
      <div class="pb-lsub">${esc(installed || "not installed")}${(update || needs?.length) && latest ? ` → ${esc(latest)}` : ""}${needs?.length ? ` · needs ${esc(needs.join(", "))} first` : ""}</div></div>
      <div class="pb-lbtn">${extra || ""}${update ? btn : needs?.length ? `<span class="pb-chip failed">Waiting</span>` : `<span class="pb-chip done">Up to date</span>`}</div></div>`;
  const select = (attrs, value, options) => `<select ${attrs}>${options.map(o => `<option${o === value ? " selected" : ""}>${o}</option>`).join("")}</select>`;

  async function load(box, fresh = false) {
    box.innerHTML = `<p class="pb-muted">Checking…</p>`;
    let c;
    try { c = await api(fresh ? "/api/components?fresh=1" : "/api/components"); } catch (e) { box.innerHTML = `<p class="pb-muted">${esc(e.message)}</p>`; return; }
    const nightly = c.channel === "nightly";
    const any = c.core.update || c.parts.some(p => p.update) || c.ai.update;
    box.innerHTML = `<div class="pb-tool"><span class="bd-sp"></span>
        <button type="button" data-a="check">Check now</button>${any ? `<button type="button" class="pb-pri" data-a="all">Update all</button>` : ""}</div>
      <p class="pb-compmsg pb-muted"></p>
      <div class="pb-sub-h">Printer Buddy</div>
      ${row("Printer Buddy", c.core.installed, c.core.latest, c.core.update, "", `<button type="button" data-up="core">Update</button>`, c.core.needs,
          { key: "core", on: c.core.dev, locked: nightly })}
      ${c.parts.map(p => row(LABEL[p.name] || p.name, p.installed, p.latest, p.update,
          p.tiers.length ? select(`data-tier="${p.name}"`, p.tier, p.tiers) : "", `<button type="button" data-up="${p.name === "streamer" ? "streamer" : "parts"}">Update</button>`, p.needs,
          { key: p.name, on: p.dev, locked: nightly })).join("")}
      ${row("AI model", c.ai.installed || (c.ai.kind === "off" ? "off" : ""), c.ai.latest, c.ai.update,
          select("data-ai", c.ai.kind, c.ai.kinds), `<button type="button" data-up="ai">Update</button>`, c.ai.needs)}
      <div class="pb-sub-h">Printers</div><div class="pb-compprinters"><p class="pb-muted">Checking printers…</p></div>`;
    box.querySelector("[data-a=check]").onclick = () => load(box, true);
    box.querySelector("[data-a=all]")?.addEventListener("click", () => act(box, { update: c.core.update ? "core" : c.parts.some(p => p.update) ? "parts" : "ai" }, "Update Printer Buddy now? It restarts when done."));
    for (const b of box.querySelectorAll("[data-up]")) b.onclick = () => act(box, { update: b.dataset.up }, "Update now? Printer Buddy restarts when done.");
    for (const s of box.querySelectorAll("[data-tier]")) s.onchange = () => act(box, { part: s.dataset.tier, tier: s.value },
      s.dataset.tier === "streamer" ? `Set the camera streamer to ${s.value}?` : `Switch ${LABEL[s.dataset.tier]} to ${s.value}? Printer Buddy restarts.`);
    box.querySelector("[data-ai]").onchange = e => act(box, { ai: e.target.value }, `Set AI to ${e.target.value}? Printer Buddy restarts.`);
    for (const n of box.querySelectorAll("[data-devkey]")) {
      const opt = n.parentElement.querySelector(".pb-devopt");
      let t = null;
      const reveal = () => { opt.hidden = false; };
      n.onpointerdown = () => { t = setTimeout(reveal, 500); };
      n.onpointerup = n.onpointerleave = n.onpointercancel = () => clearTimeout(t);
      n.oncontextmenu = e => { e.preventDefault(); reveal(); };
    }
    for (const cb of box.querySelectorAll("[data-devpart]")) cb.onchange = () => {
      const k = cb.dataset.devpart, name = k === "core" ? "Printer Buddy" : LABEL[k] || k;
      act(box, { part: k, dev: cb.checked }, `Switch ${name} to ${cb.checked ? "dev/beta (nightly)" : "stable"} builds? Printer Buddy restarts.`)
        .then(ok => { if (!ok) cb.checked = !cb.checked; });
    };
    printersList(box.querySelector(".pb-compprinters"));
  }

  async function printersList(el) {
    const online = [...printers.values()].filter(p => p.connection === "online");
    if (!online.length) { el.innerHTML = `<p class="pb-muted">No printers online.</p>`; return; }
    const parts = await Promise.all(online.map(async p => {
      try {
        const vi = (await rpc(p.id, "machine.update.status"))?.version_info || {};
        const rows = Object.entries(vi).filter(([n]) => n !== "system").map(([n, v]) => {
          const cur = v.version || "?", next = v.remote_version || "?";
          const out = v.is_valid !== false && ((v.commits_behind?.length || 0) > 0 || (next !== "?" && cur.replace(/^v/, "") !== next.replace(/^v/, "")));
          return row(n, cur, next, out, "", `<button type="button" data-pid="${p.id}" data-name="${esc(n)}">Update</button>`);
        });
        return `<div class="pb-lname pb-prnname">${esc(p.name)}</div>${rows.join("") || `<p class="pb-muted">No update manager on this printer.</p>`}`;
      } catch (e) { return `<div class="pb-lname pb-prnname">${esc(p.name)}</div><p class="pb-muted">${esc(e.message)}</p>`; }
    }));
    el.innerHTML = parts.join("");
    for (const b of el.querySelectorAll("[data-pid]")) b.onclick = async () => {
      const p = printers.get(+b.dataset.pid);
      if (p && (p.state === "printing" || p.state === "paused")) return toast(`${p.name} is printing`);
      if (!confirm(`Update ${b.dataset.name} on ${p?.name}? It may restart services.`)) return;
      b.disabled = true; b.textContent = "Updating…";
      try { await rpc(+b.dataset.pid, "machine.update.upgrade", { name: b.dataset.name }); toast(`Updated ${b.dataset.name} on ${p?.name}`); }
      catch (e) { toast(`Update failed: ${e.message}`); }
      printersList(el);
    };
  }

  return { load };
})();
