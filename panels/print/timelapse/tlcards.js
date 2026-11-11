// Fluidd's Timelapse page has a Status card and a Settings card next to the list; these two take the matching boxes from the legacy markup.
PB.panel("tlstatus", {
  title: "Timelapse Status", desc: "Whether a timelapse is recording and how many pictures it has", single: true, cls: "vtl",
  icon: PB.icon('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/><path d="M9.5 9.5v3l2 1"/>'),
  create(host) {
    const box = PB.take("#tlStatusBox");
    host.append(box);
    return { open() { this.loaded = false; }, shown() { if (!this.loaded) { this.loaded = true; loadTimelapses(); } }, destroy() { PB.park(box); } };
  },
});
PB.panel("tlsettings", {
  title: "Timelapse Settings", desc: "When to take a picture, video speed, how many to keep", single: true, cls: "vtl",
  icon: PB.icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  create(host) {
    const box = PB.take("#tlSettingsBox");
    host.append(box);
    return { open() { this.loaded = false; }, shown() { if (!this.loaded) { this.loaded = true; loadTimelapseSettings(); } }, destroy() { PB.park(box); } };
  },
});
