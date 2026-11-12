// Fluidd's error screens: "Klippy: <state>" card (restart buttons on the left, the message and warnings in red / yellow alerts on the right),
// and the "No Moonraker connection" block when the printer can't be reached.
(() => {
  const { el } = PB, { pageHook } = PB.x;
  const page = $("#page");
  const ban = el("div", "pb-kban"); ban.hidden = true;
  (page.querySelector(".bd-top") || page.firstChild).after(ban);
  let key = "";
  const ERR = PB.icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>');
  const WARN = PB.icon('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>');
  const run = async (method, params, what) => { try { await PB.rpc(method, params); toast(what); } catch (e) { toast(e.message); } };
  const ul = list => `<ul>${list.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`;

  pageHook(p => {
    if (p.connection !== "online") {   // Moonraker can't be reached
      const connecting = p.connection === "connecting", k = `off|${p.id}|${connecting}`;
      ban.hidden = false;
      if (k === key) return; key = k;
      const at = `${p.host || ""}${p.port ? ":" + p.port : ""}`;
      ban.className = "pb-kban pb-koff";
      ban.innerHTML = `${at ? `<div>${esc(at)}</div>` : ""}<div>${connecting ? "Connecting to Moonraker..." : "No Moonraker connection. Please check Moonraker status and / or refresh."}</div>
        ${connecting ? `<div class="pb-kprog"><i></i></div>` : ""}<button type="button" data-k="reload">Force refresh</button>`;
      ban.querySelector("[data-k=reload]").onclick = () => location.reload();
      return;
    }
    const state = p.klippy_state || "ready", ready = state === "ready";
    const msg = !ready && p.klippy_message && p.klippy_message !== "Printer is ready" ? p.klippy_message : "";
    const pw = (p.printer_warnings || []).map(String), kw = (p.klipper_warnings || []).map(String), mw = (p.moonraker_warnings || []).map(String), fc = (p.failed_components || []).map(String);
    const warned = pw.length || kw.length || mw.length || fc.length;
    const k = JSON.stringify([p.id, state, msg, pw, kw, mw, fc]);
    ban.hidden = ready && !warned;
    if (ban.hidden) { key = ""; return; }
    if (k === key) return; key = k;
    ban.className = "pb-kban pb-kcard";
    const buttons = state === "disconnected"
      ? `<button type="button" class="pb-pri" data-k="svc">Restart Klipper</button>`
      : `<button type="button" class="pb-pri" data-k="restart">Restart Klipper</button><button type="button" class="pb-pri" data-k="fw">Firmware Restart</button>`;
    ban.innerHTML = `<header>${ERR}<span>Klippy: ${esc(state)}</span></header>
      <div class="pb-kbody"><div class="pb-kctl">${buttons}
          <a class="pb-dl pb-dlw" href="${PB.fileUrl("logs", "klippy.log", 1)}">${PB.ic.download}Klippy.log</a><a class="pb-dl pb-dlw" href="${PB.fileUrl("logs", "moonraker.log", 1)}">${PB.ic.download}Moonraker.log</a></div>
        <div class="pb-kmsg">${msg ? `<div class="pb-kal err">${ERR}<span>${esc(msg)}</span></div>` : ""}
          ${warned ? `<div class="pb-kal warn">${WARN}<div>${pw.length ? `<div>Printer warnings found.</div>${ul(pw)}` : ""}${mw.length ? `<div>Moonraker warnings found.</div>${ul(mw)}` : ""}${kw.length ? `<div>Klipper warnings found.</div>${ul(kw)}` : ""}
            ${fc.length ? `<div>Moonraker has failed plugins, please check your logs, update your configuration and restart Moonraker.</div>${ul(fc)}` : ""}</div></div>` : ""}</div></div>`;
    ban.querySelector("[data-k=restart]")?.addEventListener("click", () => run("printer.restart", undefined, "Restarting Klipper…"));
    ban.querySelector("[data-k=fw]")?.addEventListener("click", () => run("printer.firmware_restart", undefined, "Firmware restart…"));
    ban.querySelector("[data-k=svc]")?.addEventListener("click", () => run("machine.services.restart", { service: "klipper" }, "Restarting the Klipper service…"));
  });
})();
