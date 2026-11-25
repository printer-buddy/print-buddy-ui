# Changelog

All changes to the Printer Buddy web UI, newest first.

################################2026-11-25 sterling m security/box-id################################

## Show the box ID in the Printer Buddy menu, and why share links don't work from outside

The Printer Buddy menu (the three-lines button on the printers page) has a **Box ID** section under Updates showing this box's share ID, the number to use with `/register` in the Printer Buddy Discord. *Why:* registering a box needs its ID, and it wasn't shown anywhere in the UI.

The Share window shows a line in orange when Printer Buddy can't run the share tunnel, with the reason from the share server (for example that another box on the network is already sharing, and how to register this box) or that Remote access isn't finished. It checks again 8 seconds after a link is made, and an answer that arrives after the window has switched to another printer is ignored. *Why:* a refused tunnel only showed in Printer Buddy's log, so share links just didn't work with no explanation.

Lines changed:
- `core/extras/system-drawer.js` — 126–127 add the Box ID section to the menu; 129 fill it from `/api/share/user-id`
- `index.html` — 674 add the share warning line; 1663–1667 fill it from the share list's `tunnel_error`, ignoring an answer for a printer the window has moved off; 1689 check again after a link is made

################################end of entry################################

################################2026-11-24 sterling m ai/photos################################

## AI photos: set how many to keep

The AI panel's "Photos for AI" box has a "Keep this many photos" number box (10 to 500) that saves with the other AI settings, and the empty-list text says photos are only collected while sending photos to the Printer Buddy project is on. *Why:* photos are now only kept while sharing is on, and the number kept is a setting instead of a fixed 500.

Lines changed:
- `index.html` — 490 add the `ai_keep` number box; 1965 reword the "No photos yet" text; 2007 fill it from the AI settings; 2021 send it when the AI settings are saved

################################end of entry################################

################################2026-11-24 sterling m cameras/screen################################

## Iframe cameras show the printer's page, like Fluidd

A camera with `service: iframe` (such as ZMOD's or Snapmaker U1 Extended firmware's touchscreen) now shows its `stream_url` page in an iframe in the quick view, the printer page and its full screen, and the Control page camera, the same way Fluidd shows it, so the printer's own page handles the picture and touches. Overview cards keep their snapshots. The page loads straight from the printer, so it shows only where the browser can reach the printer. The iframe is removed while its picture is hidden (printer offline, grid view, quick view closed) or the tab is in the background, and a WebRTC video is stopped before the iframe shows. *Why:* touches on ZMOD's screen worked in Fluidd but not in Printer Buddy.

Lines changed:
- `index.html` — 264 add the `.pb-camframe` overlay style; 1028 in `camTick`, remove iframes whose picture is hidden; 1044–1051 show an iframe camera's page in big views instead of the picture, stopping WebRTC first

################################end of entry################################

################################2026-11-24 sterling m mmu/lane-actions################################

## MMU card: per-lane actions like Fluidd and Mainsail

Clicking a lane or gate on the MMU card now opens a menu for that lane instead of loading it straight away. AFC lanes get Load or Unload (`CHANGE_TOOL` / `TOOL_UNLOAD LANE=`), Eject (`LANE_UNLOAD LANE=`, also on an empty lane when prep is detected), a Tool picker (`SET_MAP`), a Runout-to picker (`SET_RUNOUT`) and Edit filament (colour, material, weight, sending only what changed with `SET_COLOR` / `SET_MATERIAL` / `SET_WEIGHT`). Happy Hare gates get Select, Preload, Eject, Change tool (`MMU_SELECT` / `MMU_PRELOAD` / `MMU_EJECT` / `MMU_CHANGE_TOOL GATE=`) and Edit gate (name, material, colour, temperature, available, as one `MMU_GATE_MAP GATE=… QUIET=1`). The Happy Hare footer now has Load and Unload (`MMU_LOAD` / `MMU_UNLOAD`, instead of `MMU_EJECT`) and Select bypass when the unit has one. Actions are greyed out by the same rules as Fluidd and Mainsail (while printing, lane not ready, already selected, no crossload), filament moves still ask to confirm, and every motion command re-checks the printer isn't printing or paused before it's sent. Values in commands are always double-quoted with backslashes escaped, so a name like `O'Reilly` doesn't make Klipper reject the command. Saving the edit form sends a colour only if the colour picker was touched, so editing just the material or weight of a lane with no colour doesn't turn it grey. Switching to another printer closes the menu and editor, so a Save can't write one printer's gate data to another. While the editor is open the card still redraws on each update, keeping only the fields that were edited and the focus (untouched fields show the printer's latest values, so a Save can't send back a stale material or name). *Why:* the card could only load a slot and unload; per-lane control needed Fluidd or Mainsail.

Lines changed:
- `panels/control/mmu/mmu.js` — 45–46 add `_q` (quotes values with spaces for Klipper, strips comment characters) and `_hex`; 47–48 panel description; 52–66 lanes open the menu (no longer disabled when empty), selected lane outlined; 67–100 add `menu()` with the AFC and Happy Hare actions and edit forms; 101–135 add `act()` sending the commands; 136–161 `draw()` adds the menu, the Happy Hare footer buttons and their handlers; 164–165 skip redraws while editing
- `panels/control/mmu/mmu.css` — 32–42 styles for the selected lane, the menu, its rows and the edit form
- `panels/control/mmu/mmu.js`, review fixes — 44–45 `_q` always quotes and escapes backslashes; 54 add `busyNow`; 104, 159–162 re-check `busyNow()` before sending motion commands; 114, 130 send the colour only when touched; 156 mark every edit field as touched on input or change; 164–177 add `redrawKeepingForm`, restoring only touched fields; 179 `open()` clears the selected lane and editor; 180–187 `update()` redraws while editing via `redrawKeepingForm`

################################end of entry################################

################################2026-11-23 sterling m cameras/overlay-card################################

## Print info card over the camera in full screen and Quick View

Full-screening the printer-page camera, or opening Quick View, now overlays a card in the bottom-left with the gcode thumbnail, printer name, progress %, layer, time left and nozzle/bed temps — so the print stats stay visible when the rest of the page is hidden. It shows only while printing or paused. *Why:* full screen left just the video with no stats.

Lines changed:
- `index.html` — 550, 717 add the `.cam-ovl` card to the page and Quick View cameras; 199–207 its style (shown only in `#pgCam:fullscreen` or the Quick View; 202 shifts it to the right when the multi-camera switcher shares the bottom-left); 188 pins the camera FPS badge top-left; 1245 add `setCamOverlay` (gcode thumbnail via `/api/printers/<id>/thumbnail`, retried after a failed load; name, %/layer/time/temps); 1274, 1334 populate it each render

################################end of entry################################

################################2026-11-23 sterling m overview/layer################################

## Show the current layer on the printers overview

A printing card on the printers overview now shows `Layer <n> / <total>` next to the status/filename, using the layer Printer Buddy already reports (from `SET_PRINT_STATS_INFO` or derived from Z height). *Why:* the overview showed progress percent but not which layer the print was on.

Lines changed:
- `index.html` — 856–858 append `Layer n / total` to a printing card's status line when the layer is known

################################end of entry################################

################################2026-11-23 sterling m cameras/snapshot-per-layer################################

## Refresh overview camera thumbnails once per layer

On the multi-printer overview, a printing card's camera snapshot now refreshes when the print's layer advances instead of every 5 seconds, with a 45s fallback for idle prints or files with no layer info. *Why:* a timed snapshot caught the toolhead at a random spot each time so the thumbnails jumped around; layers change at a repeatable toolhead position, so a per-layer frame looks calm and also cuts the snapshot load.

Lines changed:
- `index.html` — 1041–1050 refresh an overview card's snapshot on `p.layer` change (with a 45s idle fallback and an immediate first frame); the focused "big" view keeps its timed refresh

################################end of entry################################

################################2026-11-23 sterling m thermals/flame-colour################################

## Tint each extruder flame with its loaded filament's colour

On a printer with an MMU/AFC, each extruder row's flame icon on the Thermals panel takes the colour of the filament loaded in that nozzle, so a loaded red PLA shows a red flame. On a multi-nozzle toolchanger each nozzle is matched to the lane loaded into it (via the lane's `extruder`/`tool_loaded` from core); it falls back to the one active slot for a single nozzle, and to the usual orange when nothing is loaded or there's no MMU. *Why:* the flame was always orange and gave no hint of what's loaded. (A U1/AFC user's idea.)

Lines changed:
- `panels/control/thermals/thermals.js` — 44–49 add `loadedColor` (the colour of the lane loaded into a given extruder, with a single-nozzle fallback); 147 tint every `extruder*` flame with it each tick (DOM property; falls back to the palette colour)

################################end of entry################################

################################2026-11-23 sterling m mmu/spool-art################################

## Draw the MMU/AMS slots as real filament spools

Each slot now renders an SVG filament spool — a translucent flange with a spoke hub and the filament wound as a ring in the slot colour that recedes toward the hub as the slot empties — in place of the flat gradient dot. Applies to every MMU/AMS type (AFC, Happy Hare, CFS, Bambu AMS); an empty slot shows a bare spool. *Why:* the flat dot didn't read as filament or show how full a slot is at a glance.

Lines changed:
- `panels/control/mmu/mmu.js` — 12–41 add `_spool` (the filament-spool SVG) with small colour helpers `_px`/`_mix`; 59 render it per slot in place of the flat `<span class="pb-mmu-spool">`
- `panels/control/mmu/mmu.css` — 22 size the spool SVG (replaces the flat-circle `.pb-mmu-spool` background/border rules)

################################end of entry################################

################################2026-11-21 sterling m mmu/spool-look################################

## Nicer filament spools and a remaining bar

The MMU/AMS slots now show a bigger reel-style spool (filament colour wound on a hub) and a full-width remaining bar in the filament colour, labelled with the grams left (when the printer reports a weight, e.g. AFC) and the percent, instead of a flat 30px dot and a thin grey line. Applies to every MMU type (AFC, Happy Hare, CFS, Bambu AMS). *Why:* the slots were small and plain; a roll graphic + grams/percent reads at a glance.

Lines changed:
- `panels/control/mmu/mmu.css` — 22–24 reel-style spool (52px, radial gradient hub/filament/rim); 25 empty-slot spool; 28–29 full-width remaining bar filled in the filament colour; 30 add the `.pb-mmu-pct` label
- `panels/control/mmu/mmu.js` — 21–23 label the bar with the grams left (when known) and the percent remaining

################################end of entry################################

################################2026-11-21 sterling m theme/logo-background################################

## Show the logo faintly behind the dashboard

A per-device "Show the logo faintly behind the dashboard" toggle in the theme settings renders the configured logo as a faint centered watermark, like Fluidd's "Show logo on background". *Why:* Printer Buddy only used the copied logo in the header; the watermark is a Fluidd setting (not custom.css), so copying a theme never brought it across.

Lines changed:
- `core/extras/theme.js` — 17 read the `pb-logobg` device flag; 41–45 render/remove a `.pb-bglogo` element using `theme.logo`; 58, 60 add the toggle to the theme panel and persist it
- `core/extras/extras.css` — 52 add the `.pb-bglogo` watermark style (fixed, faint, centered, behind panels)

################################end of entry################################

################################2026-11-21 sterling m machine/other-files################################

## Add an "Other files" panel (logs, docs, config examples)

A new read-only file browser for the logs, docs and config-examples roots, like Fluidd's "Other Files"; it reuses the Config panel's browser (list, preview, download) and shows on the Configure page under Config files. It carries the two hidden file `<input>`s and the `data-drop` mark the shared config actions (`PB.parts.cfgActions`) expect, since building the panel without them threw and blanked the dashboard. *Why:* those roots could only be reached piecemeal (logs via Print → Files, docs/examples via Config files), not in one place.

Lines changed:
- `panels/machine/otherfiles/otherfiles.js` — new: the "Other files" panel (roots logs/docs/config_examples, read-only, reusing `PB.parts.cfg*`); 27 `data-drop` on `.pb-cwrap`; 28 the hidden `data-u="files"`/`data-u="dir"` file inputs
- `panels/machine/config/browse.js` — 14 add `logs: "Logs"` to the shared `ROOTS` labels
- `core/builder.js` — 49 add the panel to the default Configure page (second row)
- `index.html` — load `otherfiles.js`

################################end of entry################################

################################2026-11-21 sterling m ui/firmware-restart################################

## Add Firmware Restart to the Klippy-disconnected card

The "Klippy: disconnected" error card now offers Firmware Restart alongside Restart Klipper, like the other Klippy error states. *Why:* the disconnected state only showed Restart Klipper, so Firmware Restart was missing there.

Lines changed:
- `core/extras/error-card.js` — 52 add the `data-k="fw"` Firmware Restart button to the `disconnected` branch (handler already wired)

################################end of entry################################

################################2026-11-21 sterling m ui/dropdowns################################

## Theme the dropdowns that weren't styled

Added a base `select` style so dropdowns outside a specially-styled toolbar (e.g. the Config files folder picker) use the theme colours instead of the browser's white default. *Why:* only container-scoped `select` rules existed, so any other `<select>` rendered white with invisible text in the dark theme.

Lines changed:
- `index.html` — 92–93 add base `select` and `select option` theming (`background: var(--card)`, `color: var(--text)`)

################################end of entry################################

################################2026-11-21 sterling m mmu/spacing################################

## MMU: more room per filament slot

Widened the filament-slot tiles and gave them more padding so the slots (e.g. the U1's four nozzles) aren't squished together. *Why:* at `minmax(64px)` with tight padding the slots were cramped.

Lines changed:
- `panels/control/mmu/mmu.css` — 16 widen the slot grid to `minmax(88px, 1fr)` and gap 6→8; 17 pad each slot `12px 8px 10px` and gap 3→6

################################end of entry################################

################################2026-11-21 sterling m cameras/webrtc################################

## Live WebRTC cameras on the local network

A WebRTC camera (go2rtc, camera-streamer or MediaMTX) now plays live when you're on the same network, instead of only showing snapshots; it falls back to snapshots on any failure, including over a share link. The signalling goes to Printer Buddy (same origin) rather than straight to the camera, since the camera sends no CORS header. Zoom/pan scales the video the same as an MJPEG picture, the video doesn't cover the full-screen button and FPS badge, and the camera tick calls the player through `window.PB?.` so it can't throw before `PB` exists. *Why:* the camera editor offered WebRTC but the viewer never rendered it.

Lines changed:
- `core/extras/webrtc.js` — 1–172 new: `PB.webrtc` with the three handshakes (go2rtc WebSocket, camera-streamer POST, MediaMTX WHEP), overlaying a `<video>` on the camera and tearing it down on failure
- `index.html` — 251 add the `.pb-camvid` overlay style; 1012, 1016 stop/prune WebRTC videos each tick; 1026–1030 play WebRTC for a `webrtc`-mode camera, else the snapshot path; 2078 load `webrtc.js`
- `core/extras/webrtc.js`, follow-ups — 20 `go2rtc` takes a ready WebSocket URL; 48 `camerastreamer` posts to a given URL; 76 `mediamtx` builds its WHEP/session URLs from the proxy base and uses the rewritten `Location`; 136–157 `play` points every service at `/api/printers/<id>/webrtc…` (go2rtc at `/webrtc-ws`)
- `index.html`, follow-ups — 251 drop `z-index: 1` from the `.pb-camvid` rule; 1014, 1018, 1030, 1032 call the WebRTC player through `window.PB?.`
- `core/extras/camzoom.js` — 37–38 in `apply()`, mirror the zoom `scale`/`translate` onto the `.pb-camvid` video overlay when one is present (cleared on reset via the same path)

################################end of entry################################

################################2026-11-20 sterling m security/ai################################

## Security: remove the dead push-notification control

The share chat options no longer offer "Notify me with a push", and the section is now just "Blocked words". *Why:* chat and flags no longer leave the box, so that control did nothing.

Lines changed:
- `index.html` — 669 drop the push `<select>` and its hint and rename the section to "Blocked words"; 1597, 1601 stop reading/sending the `alert` setting

## AI: detection-area hint, pause-pending note, drop "as crack"

Nudges you to draw a detection area (the AI reads a cropped print far better), shows when an alert is waiting to confirm an auto-pause, and drops the retired "crack" label. *Why:* a whole-picture view reads small prints weakly; an alert that may still auto-pause wasn't shown; "crack" is no longer collected.

Lines changed:
- `index.html` — 108–109 add the `.ai-hint` styles; 555 reword the "Detection area" tooltip; 560 remove "as crack" from Save-for-AI; 566 add the hint banner; 1749–1752 add the ask-for-an-area logic; 1771–1773 reword the alert note for `pause_pending`

################################end of entry################################
