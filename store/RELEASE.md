# Real-Debrid Manager 2.0.0

A rebuild from scratch: new code, new interface, and the features that were unreliable in 1.x now work. Your sign-in carries over from 1.1.0.

## What's in 2.0

- **Popup opens on the page's links.** It lists every magnet and supported hoster link on the page you are on. Filter them, select a few with Cmd/Ctrl-click or Shift-click, or add them all.
- **Side panel** (Chrome) and **sidebar** (Firefox): the same view, kept open while you browse. It follows the active tab.
- **Full manager page:** torrents with live progress, search, filters, bulk actions and a detail panel; downloads; account; settings; a command palette (Cmd/Ctrl-K).
- **Torrents start on their own.** Picks the main video files and skips samples and extras, or choose all, the largest, or ask every time. Skips duplicates. Optional: keep only cached torrents.
- **Reinsert** a torrent with the same files when its links expire.
- **Capture from anywhere:** right-click links or selected text, type `rd` in the address bar, drop .torrent files, or turn on magnet catching on every site.
- **Download, copy, or stream:** built-in player, or IINA, VLC and Infuse.
- **Account page:** premium days, points, a 31-day traffic chart, host limits and Real-Debrid settings.
- **Light and dark themes.**

## Changes

- Host access narrowed from all HTTPS sites to real-debrid.com. All-sites access is optional and asked for only when a feature needs it.
- Firefox 128 or later is now required (was 109).
- Adding, uploads and reinserts run in the background, so closing the popup does not interrupt them.

## Install

- Chrome Web Store: https://chromewebstore.google.com/detail/real-debrid-manager/fengaeiifddaadaibopcibcdakiaaian
- Firefox Add-ons: https://addons.mozilla.org/firefox/addon/realdebrid-manager/
- Or load the attached zip unpacked.
