# Changelog

All changes to the Printer Buddy web UI, newest first.

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
