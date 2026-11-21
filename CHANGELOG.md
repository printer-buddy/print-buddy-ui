# Changelog

All changes to the Printer Buddy web UI, newest first.

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
