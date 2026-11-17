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
  const { el } = PB, { cur, send, dialog, pageHook } = PB.x;
  const actions = $("#page .bd-actions");
  if (!actions) return;
  const btn = el("button", "pb-savecfg", "Save config");
  btn.type = "button"; btn.hidden = true; btn.title = "Klipper has unsaved config changes (from a calibration, mesh or offset)";
  actions.prepend(btn);
  const dlg = dialog("pb-savedlg");
  pageHook(p => { btn.hidden = !(p.connection === "online" && p.save_pending); });
  btn.onclick = () => {
    const p = cur(); if (!p) return;
    const text = Object.entries(p.save_pending_items || {}).map(([sec, kv]) =>
      `[${sec}]\n${Object.entries(kv || {}).map(([k, v]) => `${k}: ${v}`).join("\n")}`).join("\n\n");
    const busy = p.state === "printing" || p.state === "paused";
    dlg.innerHTML = `<h3>Unsaved config changes</h3>
      <p class="pb-muted">Saving writes these to printer.cfg and restarts Klipper.${busy ? " <b>A print is running: save once it's done.</b>" : ""}</p>
      <pre class="pb-savelist">${esc(text || "Klipper didn't list the changes.")}</pre>
      <div class="bd-libfoot"><span class="bd-sp"></span><button type="button" data-a="no">Cancel</button>
        <button type="button" class="bd-primary" data-a="ok"${busy ? " disabled" : ""}>Save config &amp; restart</button></div>`;
    dlg.querySelector("[data-a=no]").onclick = () => dlg.close();
    dlg.querySelector("[data-a=ok]").onclick = () => { send("SAVE_CONFIG"); dlg.close(); toast("Saving config, Klipper restarts…"); };
    dlg.showModal();
  };
})();
