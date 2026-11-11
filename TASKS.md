# Rebuild v2

From-scratch rewrite. Branch `rebuild`. Helium/Chromium is the reference build; Firefox + Safari via feature detection.

## Decisions
- Stack: WXT, React 19, Tailwind v4, Base UI, TanStack Query, bun
- API calls from UI pages directly (host_permissions bypass CORS; RD sends no CORS headers). Safari may need background proxy: verify on device
- Background owns: context menus (registered in onInstalled, listeners top-level), add+auto-select flow, alarm polling, badge, notifications, expiry reminder
- Token refresh serialized with Web Locks (`navigator.locks`) across popup/manager/worker
- Auth: device code flow (open-source client) + paste private API token
- Magnet interception on all sites is opt-in (optional host permission + dynamic content script)
- Cache probe opt-in, off by default

## Milestones
- [x] M0 scaffold: WXT, Tailwind v4, icons, tsconfig, vitest
- [x] M1 core lib: RD client + errors, auth + refresh lock, typed storage/settings, link parsing, file auto-select rules
- [x] M2 background: context menus, add flow + auto-select, polling alarm, badge, notifications, commands
- [x] M3 design system: tokens, light/dark, primitives (button, list row, segmented, switch, sheet, menu, toast)
- [x] M4 popup: login, paste/drop box, clipboard chip, active torrents, scan page results, account glance
- [x] M5 manager: library (torrents + downloads, search/filter/sort, bulk, virtualized), torrent detail + file picker, reinsert, dedupe/cleanup
- [x] M6 manager: account (days, points convert, traffic + history chart, RD settings, website links), extension settings, Cmd+K palette
- [x] M7 outputs: browser download, stream player (hls.js + media infos), copy, open in IINA/VLC/Infuse
- [x] M8 capture: page scan (activeTab), magnet intercept content script, hash detection, hoster regex, omnibox
- [x] M9 QA: unit tests, e2e with mocked API + screenshots, Firefox + Safari builds, README/CLAUDE.md

## Needs measuring / unconfirmed
- Access token lifetime (read expires_in)
- Whether open-source client token can call /settings, /traffic, /streaming
- Safari CORS from extension pages
- vlc:// and infuse:// URL schemes on macOS
- /traffic `left`/`limit` units when `type` is "gigabytes" (UI formats as bytes)
- Whether /torrents?filter=active includes magnet_conversion and waiting_files_selection
- Real popup window behavior and actions that mutate data (select, delete, reinsert, convert) against the live API

## Next
- [ ] Test against a real account in Helium (sign-in, add, auto-select, stream, notifications)
- [ ] Safari on-device check (CORS from extension pages, popup, context menu)
- [ ] Popup clipboard auto-detect chip (currently a Paste button)

## Found
- WXT defaults Firefox/Safari to MV2; scripts pass --mv3 (MV2 drops optional_host_permissions)
- Runtime content scripts declared via defineContentScript add <all_urls> to required host_permissions; intercept is an unlisted script instead
- Old Safari Xcode project referenced Plasmo hashed files; regenerated with converter, references .output/safari-mv3
- Chart green #B7D995 fails dataviz lightness/chroma on dark; charts use #6FA544 (dark) / #4F8A2B (light)
