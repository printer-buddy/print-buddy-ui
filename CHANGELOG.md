# Changelog

All changes to the Printer Buddy web UI, newest first.

################################2026-11-21 sterling m ui/other-files-drop################################

## Fix the Other-files panel still blanking the dashboard

The previous blank-dashboard fix added the hidden file inputs but the Other-files panel still threw and blanked the dashboard: `.pb-cwrap` was missing the `data-drop` attribute, so the shared config actions hit a null wiring up drag-and-drop. *Why:* `PB.parts.cfgActions` looks up `[data-drop]` for the drop target, and that element wasn't marked.

Lines changed:
- `panels/machine/otherfiles/otherfiles.js` — 27 add `data-drop` to `.pb-cwrap`

################################end of entry################################

################################2026-11-21 sterling m ui/blank-dashboard-fix################################

## Fix a blank dashboard from the new Other-files panel and WebRTC tick

Two bugs introduced with the recent camera/Other-files work could blank the dashboard: the Other-files panel left out the two hidden file `<input>`s the shared config actions expect, so building it threw and aborted the page; and the camera tick referenced a bare `PB` before `window.PB` was assigned, throwing `PB is not defined`. *Why:* a thrown error in `build()` stops the dashboard from rendering, and the tick fires on an interval that can run before `PB` exists.

Lines changed:
- `panels/machine/otherfiles/otherfiles.js` — 28 add the hidden `data-u="files"`/`data-u="dir"` file inputs the shared `PB.parts.cfgActions` wires up
- `index.html` — 1014, 1018, 1030, 1032 guard the camera-tick WebRTC calls with `window.PB?.` so they don't throw before `PB` is defined

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

A new read-only file browser for the logs, docs and config-examples roots, like Fluidd's "Other Files"; it reuses the Config panel's browser (list, preview, download) and shows on the Configure page under Config files. *Why:* those roots could only be reached piecemeal (logs via Print → Files, docs/examples via Config files), not in one place.

Lines changed:
- `panels/machine/otherfiles/otherfiles.js` — new: the "Other files" panel (roots logs/docs/config_examples, read-only, reusing `PB.parts.cfg*`)
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

################################2026-11-21 sterling m cameras/webrtc-zoom################################

## WebRTC: zoom and pan the video, not just the image

Zoom/pan now also scales the live WebRTC `<video>` overlay, so it works on WebRTC cameras the same as MJPEG. *Why:* zoom only transformed the `<img>`, which sits behind the video, so nothing visibly zoomed on a WebRTC camera.

Lines changed:
- `core/extras/camzoom.js` — 37–38 in `apply()`, mirror the zoom `scale`/`translate` onto the `.pb-camvid` video overlay when one is present (cleared on reset via the same path)

################################end of entry################################

################################2026-11-21 sterling m cameras/webrtc-fullscreen################################

## WebRTC: stop the video covering the camera buttons

Dropped the `z-index` on the live WebRTC `<video>` so it no longer paints over the full-screen button and FPS badge. *Why:* the overlay sat on top of the full-screen control on WebRTC cameras, so there was no way to go full screen.

Lines changed:
- `index.html` — 251 remove `z-index: 1` from the `.pb-camvid` rule

################################end of entry################################

################################2026-11-21 sterling m cameras/webrtc-cors################################

## WebRTC: run the handshake through Printer Buddy, not the camera

The player now sends its WebRTC signalling to Printer Buddy (same origin) instead of straight to the camera, so it isn't blocked by the camera's missing CORS header. *Why:* a cross-origin handshake to the camera was refused, leaving only snapshots.

Lines changed:
- `core/extras/webrtc.js` — 20 `go2rtc` takes a ready WebSocket URL; 48 `camerastreamer` posts to a given URL; 76 `mediamtx` builds its WHEP/session URLs from the proxy base and uses the rewritten `Location`; 136–157 `play` points every service at `/api/printers/<id>/webrtc…` (go2rtc at `/webrtc-ws`)

################################end of entry################################

################################2026-11-21 sterling m cameras/webrtc################################

## Live WebRTC cameras on the local network

A WebRTC camera (go2rtc, camera-streamer or MediaMTX) now plays live when you're on the same network, instead of only showing snapshots; it falls back to snapshots on any failure, including over a share link. *Why:* the camera editor offered WebRTC but the viewer never rendered it.

Lines changed:
- `core/extras/webrtc.js` — 1–172 new: `PB.webrtc` with the three handshakes (go2rtc WebSocket, camera-streamer POST, MediaMTX WHEP), overlaying a `<video>` on the camera and tearing it down on failure
- `index.html` — 251 add the `.pb-camvid` overlay style; 1012, 1016 stop/prune WebRTC videos each tick; 1026–1030 play WebRTC for a `webrtc`-mode camera, else the snapshot path; 2078 load `webrtc.js`

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
