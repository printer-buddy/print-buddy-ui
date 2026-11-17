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
PB.panel("ai", {
  title: "AI watch", desc: "AI failure watch: mode, check now, was it right", single: true, cls: "ai",
  icon: PB.icon('<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 15l.8 1.7 1.7.8-1.7.8L19 20l-.8-1.7-1.7-.8 1.7-.8z"/>'),
  create(host) {
    const box = document.querySelector("#pgAi");   // renderPageAI shows / hides it itself
    host.append(box);
    return { destroy() { PB.park(box); } };
  },
});
