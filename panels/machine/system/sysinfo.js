// Fluidd's System page cards: System Overview (info table + Klipper controls), SD Card Information and Disk Information.
(() => {
  const UNITS = ["kB", "MB", "GB", "TB"];
  const size = b => { if (b == null || isNaN(b)) return "?"; let i = -1; do { b /= 1024; i++; } while (b > 1024 && i < UNITS.length - 1); return `${b.toFixed(1)} ${UNITS[i]}`; };
  const rows = list => `<table class="pb-sit"><tbody>${list.filter(([, v]) => v != null && v !== "").map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(String(v))}</td></tr>`).join("")}</tbody></table>`;
  let sysInfo = null, sysId = null, sysP = null;   // one system_info request shared by the cards
  const info = async id => {
    if (sysId !== id) { sysId = id; sysInfo = null; sysP = null; }
    if (sysInfo) return sysInfo;
    sysP ||= PB.rpc("machine.system_info").then(r => { sysInfo = r?.system_info || {}; return sysInfo; }).catch(e => { sysP = null; throw e; });
    return sysP;
  };
  const hide = (host, on) => { const c = host.closest(".pb-card"); if (c) { if (on) c.dataset.empty = "1"; else delete c.dataset.empty; } };

  PB.panel("sysinfo", {
    title: "System Overview", desc: "Hostname, operating system, hardware, memory and network, with Klipper restart and log buttons", cls: "adv",
    icon: PB.icon('<path d="M5 4h14v12H5zM9 20h6M12 16v4"/>'),
    create(host) {
      host.innerHTML = `<button type="button" data-a="dev" data-head title="Devices" aria-label="Devices">${PB.icon('<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>')}</button>
        <button type="button" data-a="roll" data-head title="Rollover logs" aria-label="Rollover logs">${PB.icon('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6M14 3l6 6v2M14 3v6h6M21 15a4 4 0 1 0-1.2 2.8M21 12v3h-3"/>')}</button>
        <div class="pb-sov"><div class="pb-sib"></div><div class="pb-sovc">
          <button type="button" class="pb-pri" data-r="klipper">Restart Klipper</button><button type="button" class="pb-pri" data-r="firmware">Firmware Restart</button>
          <a class="pb-dl pb-dlw" data-log="klippy.log">${PB.ic.download}Klippy.log</a><a class="pb-dl pb-dlw" data-log="moonraker.log">${PB.ic.download}Moonraker.log</a></div></div>`;
      const box = host.querySelector(".pb-sib"); let forId = null, busy = false;
      const dlg = PB.el("dialog", "bd-lib pb-xd pb-hdlg"); document.body.append(dlg);
      async function load() {
        const id = pageId; if (id === null) return; forId = id;
        try {
          const [s, pi] = await Promise.all([info(id), PB.rpc("printer.info").catch(() => null)]);
          if (id !== pageId) return;
          const c = s.cpu_info || {}, d = s.distribution || {}, v = s.virtualization || {};
          const dn = d.name && !d.name.startsWith("0.") ? `${d.name.startsWith("#") ? d.id : d.name} ${d.release_info?.version_id ?? ""}`.trim() : null;
          const net = Object.entries(s.network || {}).map(([k, e]) => { const ips = (e.ip_addresses || []).filter(x => x.family === "ipv4"); const use = ips.length ? ips : (e.ip_addresses || []).filter(x => x.family === "ipv6");
            return use.length ? `${k} (${use.map(x => x.address).join(", ")})` : k; }).join(", ");
          box.innerHTML = rows([["Hostname", pi?.hostname], ["CPU Model", c.model], ["CPU Description", c.cpu_desc], ["Total Memory", c.total_memory ? size(c.total_memory * 1024) : null],
            ["Hardware Description", c.hardware_desc], ["Processor", c.bits && c.processor && c.cpu_count ? `${c.bits} ${c.processor} with ${c.cpu_count} cores` : null],
            ["Operating System", d.name], ["Distribution", dn], ["Distribution Like", d.like], ["Codename", d.codename], ["Network", net],
            ["Virtualization", v.virt_type && v.virt_type !== "none" ? `${v.virt_type} (${v.virt_identifier})` : null]]);
        } catch (e) { box.innerHTML = `<p class="pb-muted">${esc(e.message)}</p>`; }
      }
      for (const b of host.querySelectorAll("[data-r]")) b.onclick = () => PB.sysAction(b.dataset.r, busy);
      host.querySelector("[data-a=roll]").onclick = async () => {
        if (!confirm("Roll over the Klipper and Moonraker logs? The current logs are archived and new ones are started.")) return;
        try { await PB.rpc("server.logs.rollover"); toast("Logs rolled over"); } catch (e) { toast(e.message); }
      };
      let devInst = null;
      host.querySelector("[data-a=dev]").onclick = () => {
        dlg.innerHTML = `<h3>Devices</h3><div class="pb-devbox"></div><div class="bd-libfoot"><span class="bd-sp"></span><button type="button" data-a="no">Close</button></div>`;
        PB.unmount(devInst); devInst = PB.mount("devices", dlg.querySelector(".pb-devbox"), {});
        dlg.querySelector("[data-a=no]").onclick = () => dlg.close();
        dlg.onclose = () => { PB.unmount(devInst); devInst = null; };
        dlg.showModal(); PB.shown([devInst]);
      };
      return {
        open() { forId = null; box.innerHTML = ""; for (const a of host.querySelectorAll("[data-log]")) a.href = PB.fileUrl("logs", a.dataset.log, true); },
        shown() { if (forId !== pageId) load(); },
        update(p) { busy = p.state === "printing" || p.state === "paused"; for (const b of host.querySelectorAll("[data-r]")) b.disabled = busy; },
        destroy() { PB.unmount(devInst); dlg.remove(); },
      };
    },
  });

  PB.panel("sdinfo", {
    title: "SD Card Information", desc: "Capacity and maker of the host's SD card (hidden when there isn't one)", cls: "adv",
    icon: PB.icon('<path d="M7 3h7l4 4v14H7z"/><path d="M10 3v4M13 3v4"/>'),
    create(host) {
      host.innerHTML = `<div class="pb-sdb"></div>`;
      const box = host.querySelector(".pb-sdb"); let forId = null;
      async function load() {
        const id = pageId; if (id === null) return; forId = id;
        try {
          const sd = (await info(id)).sd_info || {};
          if (id !== pageId) return;
          const has = Object.keys(sd).length > 0; hide(host, !has);
          box.innerHTML = has ? rows([["Manufacturer", sd.manufacturer], ["Manufactured", sd.manufacturer_date], ["Product Name", sd.product_name ? `${sd.product_name} ${sd.product_revision ?? ""}`.trim() : null],
            ["Capacity", sd.capacity], ["Serial Number", sd.serial_number]]) : "";
        } catch { hide(host, true); }
      }
      return { open() { forId = null; box.innerHTML = ""; }, shown() { if (forId !== pageId) load(); } };
    },
  });

  PB.panel("diskusage", {
    title: "Disk Information", desc: "Used and free space for each storage folder (gcodes, config, logs ...)", cls: "adv",
    icon: PB.icon('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/>'),
    create(host) {
      host.innerHTML = `<div class="pb-tool"><span class="bd-seg pb-droots"></span><span class="bd-sp"></span><button type="button" data-a="ref" data-head title="Refresh" aria-label="Refresh">${PB.ic.refresh}</button></div><div class="pb-dub"></div>`;
      const tabs = host.querySelector(".pb-droots"), box = host.querySelector(".pb-dub"); let forId = null, roots = [], cur = 0, du = {};
      function draw() {
        const d = du[roots[cur]];
        const pct = d && d.total ? Math.round(d.used / d.total * 100) : 0, low = d && d.total && d.free / d.total < 0.05;
        box.innerHTML = `<div class="pb-dul">Disk Usage</div><div class="pb-dubar${low ? " low" : ""}"><i style="width:${pct}%"></i></div>
          <div class="pb-dul2"><span><b>${d ? size(d.used) : "?"}</b> <span class="pb-muted">used</span></span><span><b>${d ? size(d.free) : "?"}</b> <span class="pb-muted">free</span></span></div>`;
      }
      async function one(root) { try { du[root] = (await PB.rpc("server.files.get_directory", { path: root }))?.disk_usage || null; } catch { du[root] = null; } }
      async function load(refresh) {
        const id = pageId; if (id === null) return; forId = id;
        try {
          if (!roots.length) roots = ((await PB.rpc("server.info"))?.registered_directories || []).filter(r => r);
          if (id !== pageId) return;
          hide(host, !roots.length);
          tabs.innerHTML = roots.map((r, i) => `<button type="button" data-i="${i}" aria-pressed="${i === cur}">${esc(r)}</button>`).join("");
          for (const b of tabs.querySelectorAll("button")) b.onclick = async () => { cur = +b.dataset.i; for (const x of tabs.querySelectorAll("button")) x.setAttribute("aria-pressed", x === b); if (!du[roots[cur]]) await one(roots[cur]); draw(); };
          if (refresh || !du[roots[cur]]) await one(roots[cur]);
          if (id === pageId) draw();
        } catch (e) { box.innerHTML = `<p class="pb-muted">${esc(e.message)}</p>`; }
      }
      host.querySelector("[data-a=ref]").onclick = () => load(true);
      return { open() { forId = null; roots = []; du = {}; cur = 0; box.innerHTML = ""; tabs.innerHTML = ""; }, shown() { if (forId !== pageId) load(); } };
    },
  });
})();
