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
// Right-hand drawers: printer page = that printer's restarts, power and services; home = Printer Buddy's own.
(() => {
  const { el } = PB;
  const ACT = {
    klipper: ["Restart Klipper?", "printer.restart"], firmware: ["Firmware restart (MCU reset)?", "printer.firmware_restart"],
    moonraker: ["Restart Moonraker?", "machine.services.restart", { service: "moonraker" }],
    reboot: ["Reboot the printer's computer? It goes offline for a minute.", "machine.reboot"],
    shutdown: ["Shut down the printer's computer? You'll need to power it on by hand.", "machine.shutdown"],
  };
  PB.sysAction = async (key, busy) => {
    const [text, method, params] = ACT[key];
    if (busy && !confirm("A print is running. Really?")) return;
    if (!confirm(text)) return;
    try { await PB.rpc(method, params); toast("Done"); } catch (e) { toast(e.message); }
  };
  const svcRow = (n, s, canStop = true) => {
    const on = s.active_state === "active";
    return `<div class="pb-li"><div class="pb-lmain"><div class="pb-lname">${esc(n)}</div>
        <div class="pb-lsub">${esc([s.active_state, s.sub_state].filter(Boolean).join(" · ") || "unknown")}</div></div>
      <div class="pb-lbtn"><button type="button" data-svc="${esc(n)}" data-act="restart">Restart</button>
        ${canStop ? `<button type="button" data-svc="${esc(n)}" data-act="${on ? "stop" : "start"}">${on ? "Stop" : "Start"}</button>` : ""}</div></div>`;
  };
  const ask = (act, what, busy) => act === "start" && !busy || confirm(`${act[0].toUpperCase() + act.slice(1)} ${what}?${busy ? " A print is running." : ""}`);
  PB.services = async (box, busy, after) => {
    try {
      const si = (await PB.rpc("machine.system_info"))?.system_info || {}, st = si.service_state || {};
      box.innerHTML = [...(si.available_services || [])].sort().map(n => svcRow(n, st[n] || {})).join("")
        || `<p class="pb-muted">Moonraker doesn't list any services.</p>`;
      for (const b of box.querySelectorAll("[data-svc]")) b.onclick = async () => {
        const { svc, act } = b.dataset;
        if (!ask(act, svc, busy())) return;
        try { await PB.rpc(`machine.services.${act}`, { service: svc }); toast(`${svc}: ${act} sent`); } catch (e) { toast(e.message); }
        after?.();
      };
    } catch (e) { box.innerHTML = `<p class="pb-muted">${esc(e.message)}</p>`; }
  };

  const scrim = el("div", "pb-scrim"), dr = el("aside", "pb-sysdrawer");
  scrim.hidden = dr.hidden = true; dr.setAttribute("aria-label", "Services and power");
  document.body.append(scrim, dr);
  const close = () => { scrim.hidden = dr.hidden = true; };
  scrim.onclick = close;
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !dr.hidden) close(); });
  const menuBtn = cls => {
    const b = el("button", cls, PB.icon('<path d="M4 6h16M4 12h16M4 18h16"/>'));
    b.type = "button"; b.title = "Services and power"; b.setAttribute("aria-label", "Services and power");
    return b;
  };
  const show = (title, body, wide) => {
    dr.classList.toggle("wide", !!wide);
    dr.innerHTML = `<div class="pb-sdhead"><b>${esc(title)}</b><button type="button" class="pb-sdx" aria-label="Close">${PB.ic.x}</button></div>${body}`;
    dr.querySelector(".pb-sdx").onclick = close;
    scrim.hidden = dr.hidden = false;
  };

  // ---- printer page
  const busy = () => { const s = printers.get(pageId)?.state; return s === "printing" || s === "paused"; };
  async function power(box) {
    try {
      const devs = (await PB.rpc("machine.device_power.devices"))?.devices || [];
      if (!devs.length) return;
      box.querySelector(".pb-sdlist").innerHTML = devs.map(d => `<button type="button" data-dev="${esc(d.device)}" data-on="${d.status === "on"}">
          ${esc(d.device)}: ${d.status === "on" ? "turn off" : "turn on"}</button>`).join("");
      for (const b of box.querySelectorAll("[data-dev]")) b.onclick = async () => {
        const on = b.dataset.on === "true";
        if (on && !confirm(`Turn off ${b.dataset.dev}?${busy() ? " A print is running." : ""}`)) return;
        close();
        try { await PB.rpc("machine.device_power.post_device", { device: b.dataset.dev, action: on ? "off" : "on" }); toast(`${b.dataset.dev}: ${on ? "off" : "on"}`); }
        catch (e) { toast(e.message); }
      };
      box.hidden = false;
    } catch { }   // no [power] section in moonraker.conf
  }
  const pageActions = $("#page .bd-actions");
  if (pageActions) {
    const btn = menuBtn("bd-ghost pb-sysbtn");
    pageActions.append(btn);
    btn.onclick = () => {
      const p = printers.get(pageId);
      if (!p) return;
      const off = p.connection !== "online" ? " disabled" : "";
      show(p.name, `<div class="pb-sub-h">Restart</div>
        <div class="pb-sdlist"><button type="button" data-r="klipper"${off}>Klipper</button><button type="button" data-r="firmware"${off}>Firmware</button>
          <button type="button" data-r="moonraker"${off}>Moonraker</button></div>
        <div class="pb-sub-h">Host</div>
        <div class="pb-sdlist"><button type="button" data-r="reboot"${off}>Reboot</button><button type="button" data-r="shutdown"${off}>Shut down</button></div>
        <div class="pb-sdpower" hidden><div class="pb-sub-h">Power</div><div class="pb-sdlist"></div></div>
        <div class="pb-sub-h">Services</div><div class="pb-svcs"><p class="pb-muted">Loading…</p></div>`);
      for (const b of dr.querySelectorAll("[data-r]")) b.onclick = () => { close(); PB.sysAction(b.dataset.r, busy()); };
      if (!off) { power(dr.querySelector(".pb-sdpower")); PB.services(dr.querySelector(".pb-svcs"), busy, close); }
      else dr.querySelector(".pb-svcs").innerHTML = `<p class="pb-muted">${esc(p.name)} is offline.</p>`;
    };
  }

  // ---- home page: Printer Buddy's own box
  const homeRow = $(".top .row");
  if (!homeRow) return;
  const HOST = { reboot: "Reboot the computer Printer Buddy runs on? It goes offline for a minute.",
                 shutdown: "Shut down the computer Printer Buddy runs on? You'll need to power it on by hand." };
  async function system(body) {
    try {
      const r = await api("/api/system", { method: "POST", body: JSON.stringify(body) });
      if (!r.ok) throw new Error(r.output || "failed");
      toast(r.restarting ? "Printer Buddy is restarting, this page reloads by itself." : "Done");
    } catch (e) { toast(e.message); }
  }
  const homeBtn = menuBtn("pb-iconbtn pb-sysbtn");
  homeRow.append(homeBtn);
  homeBtn.onclick = async () => {
    show("Printer Buddy", `<div class="pb-sub-h">Restart</div>
      <div class="pb-sdlist"><button type="button" data-h="restart">Printer Buddy</button></div>
      <div class="pb-sub-h">Host</div>
      <div class="pb-sdlist"><button type="button" data-h="reboot">Reboot</button><button type="button" data-h="shutdown">Shut down</button></div>
      <div class="pb-sub-h">Services</div><div class="pb-svcs"><p class="pb-muted">Loading…</p></div>
      <div class="pb-sub-h">Updates</div><div class="pb-sdcomp"></div>
      <div class="pb-sub-h">Box ID</div><p class="pb-sdboxid pb-muted">…</p>`, true);
    PB.components?.load(dr.querySelector(".pb-sdcomp"));
    api("/api/share/user-id").then(r => { dr.querySelector(".pb-sdboxid").textContent = r.user_id; }).catch(() => {});
    dr.querySelector("[data-h=restart]").onclick = () => {
      if (!confirm("Restart Printer Buddy? Prints keep going on the printers.")) return;
      close(); system({ action: "restart", service: "printer-buddy" });
    };
    for (const b of dr.querySelectorAll("[data-h=reboot], [data-h=shutdown]")) b.onclick = () => {
      if (!confirm(HOST[b.dataset.h])) return;
      close(); system({ action: b.dataset.h });
    };
    const box = dr.querySelector(".pb-svcs");
    try {
      const r = await api("/api/system");
      box.innerHTML = r.services.map(s => svcRow(s.name, s, s.name !== "printer-buddy")).join("")
        || `<p class="pb-muted">Printer Buddy isn't running as a service here.</p>`;
      for (const b of box.querySelectorAll("[data-svc]")) b.onclick = () => {
        const { svc, act } = b.dataset;
        if (!ask(act, svc, false)) return;
        close(); system({ action: act, service: svc });
      };
    } catch (e) { box.innerHTML = `<p class="pb-muted">${esc(e.message)}</p>`; }
  };
})();
