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
  const { el } = PB, { onPage, cur, send, live, dialog, pageHook } = PB.x;
  const drop = el("div", "pb-drop", `<div>Drop G-code to upload</div>`); drop.hidden = true; document.body.append(drop);
  const own = e => e.target.closest?.("[data-drop]");
  const isFiles = e => [...(e.dataTransfer?.types || [])].includes("Files") && !own(e);
  let dragN = 0;
  addEventListener("dragenter", e => {
    if (own(e)) { dragN = 0; drop.hidden = true; return; }
    if (!isFiles(e) || !onPage()) return; e.preventDefault(); dragN++;
    const p = cur(); drop.firstChild.textContent = `Drop G-code to upload to ${p ? p.name : "this printer"}`; drop.hidden = false;
  });
  addEventListener("dragover", e => { if (isFiles(e) && onPage()) e.preventDefault(); });
  addEventListener("dragleave", e => { if (isFiles(e) && --dragN <= 0) { dragN = 0; drop.hidden = true; } });
  addEventListener("drop", e => {
    if (!isFiles(e) || !onPage()) return;
    e.preventDefault(); dragN = 0; drop.hidden = true;
    const all = [...e.dataTransfer.files], ok = all.filter(f => /\.(gcode|g|gc|gco|ufp|nc|3mf)$/i.test(f.name));
    if (all.length > ok.length) toast(`Skipped ${all.length - ok.length} file(s) that aren't G-code`);
    if (!ok.length) return;
    if (PB.uploadFiles) return PB.uploadFiles(ok);
    (async () => {
      const id = pageId;
      for (const f of ok) {
        try { await fetch(`/api/printers/${id}/files/upload?name=${encodeURIComponent(f.name)}`, { method: "POST", body: f })
          .then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`); }); toast(`Uploaded ${f.name}`); }
        catch (err) { toast(`${f.name}: upload failed: ${err.message}`); }
      }
    })();
  });
})();
