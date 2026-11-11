PB.panel("histats", {
  title: "Statistics", desc: "Totals for the printer's print history", cls: "adv", gear: true,
  icon: PB.icon('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
  settings: [
    { k: "days", label: "Show time in days", type: "check", def: false },
    { k: "km", label: "Show length in kilometres", type: "check", def: false },
  ],
  create(host, cfg) {
    host.innerHTML = `<div class="pb-st"></div><button type="button" data-a="reset" data-head title="Reset the statistics" aria-label="Reset the statistics">${PB.ic.trash}</button>`;
    const box = host.querySelector(".pb-st"); let loaded = false, forId = null;
    const two = n => String(n).padStart(2, "0");
    const dur = s => {
      if (s == null) return "—"; s = Math.round(s);
      const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), r = s % 60;
      return cfg.days ? `${d ? d + "d " : ""}${two(h)}:${two(m)}:${two(r)}` : `${two(Math.floor(s / 3600))}:${two(m)}:${two(r)}`;
    };
    const fil = mm => mm == null ? "—" : cfg.km ? `${(mm / 1e6).toFixed(3)} km` : mm >= 1000 ? `${(mm / 1000).toFixed(2)} m` : `${Math.round(mm)} mm`;
    function draw(t) {
      const n = t.total_jobs || 0, avg = v => n && v != null ? v / n : null;
      const sq = (a, av, b, bv) => `<div class="pb-stsq"><div>${a}</div><b>${av}</b><div>${b}</div><b>${bv}</b></div>`;
      box.innerHTML = sq("Total Jobs", n, "Longest Job", dur(t.longest_job))
        + sq("Total Time", dur(t.total_time), "Average Time", dur(avg(t.total_time)))
        + sq("Total Print Time", dur(t.total_print_time), "Average Print Time", dur(avg(t.total_print_time)))
        + sq("Total Filament", fil(t.total_filament_used), "Average Filament", fil(avg(t.total_filament_used)));
    }
    let last = null;
    async function load() {
      const id = pageId; if (id === null) return; forId = id; loaded = true;
      try { const t = await api(`/api/printers/${id}/history/totals`); if (id !== pageId) return; last = t || {}; draw(last); }
      catch (e) { if (id === pageId) box.innerHTML = `<p class="pb-muted">${esc(e.message.includes("history") ? "This printer's Moonraker has no print history turned on." : e.message)}</p>`; }
    }
    host.querySelector("[data-a=reset]").onclick = async () => {
      const id = pageId; if (id === null || !confirm("Reset the print statistics? The history list stays.")) return;
      try { await api(`/api/printers/${id}/history/reset`, { method: "POST", body: JSON.stringify({ what: "totals" }) }); toast("Statistics reset"); load(); } catch (e) { toast(e.message); }
    };
    return {
      open() { loaded = false; last = null; box.innerHTML = ""; },
      shown() { if (!loaded || forId !== pageId) load(); else if (last) draw(last); },
    };
  },
});
