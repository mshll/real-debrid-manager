# CLAUDE.md

Real-Debrid browser extension: capture links, manage torrents, run the account. Chromium (Helium) is the primary target and reference build; Firefox and Safari are secondary and get feature-detected fallbacks.

## Commands

```bash
bun run dev              # Chromium dev build with HMR (.output/chrome-mv3-dev)
bun run dev:firefox      # Firefox MV3
bun run build            # Chromium production build (.output/chrome-mv3)
bun run build:firefox    # Firefox MV3
bun run build:safari     # Safari MV3; Xcode project in safari-extension/ references .output/safari-mv3
bun run compile          # tsc --noEmit
bun run test             # vitest (src/lib/__tests__)
bun run format           # prettier
```

## Stack

WXT, React 19, Tailwind v4, Base UI, TanStack Query, sonner, cmdk, hls.js, Phosphor icons, Inter Variable. bun only.

WXT auto-imports are off (`imports: false`); import `browser` from `wxt/browser` and helpers from `wxt/utils/*`.

## Layout

- `src/entrypoints/` - `background.ts`, `popup/`, `manager/` (full-page app, hash routes), `intercept.ts` (unlisted script registered at runtime)
- `src/background/` - worker modules: capture (context menu, omnibox), sync (alarm polling, badge, notifications, auto-select sweep), login (device flow), notify
- `src/lib/rd/` - API client, endpoints, auth, errors, types
- `src/lib/` - add flow, link parsing, file auto-select rules, storage items, queries, outputs (download, players)
- `src/components/` - shared UI; `src/components/ui/` - primitives
- `src/popup/`, `src/manager/` - surface-specific views

## Rules

- Register every worker listener synchronously in `defineBackground`. Context menus are created in `onInstalled`/`onStartup`. Never make a feature depend on the popup having been opened.
- UI pages call the API directly (host permission bypasses CORS; RD sends no CORS headers). Anything that must survive the popup closing (adding, auto-select, login polling) runs in the worker via `lib/messaging.ts`.
- Token refresh goes through `refreshAccessToken`, serialized with a Web Lock. Only clear auth after a refresh actually fails.
- Adds are sequential; RD rate-limits parallel adds (250 req/min).
- `<all_urls>` stays optional. Magnet interception requests it at opt-in time.
- No aria2 or external downloader support; it was removed on purpose.
- Safari lacks notifications, downloads, omnibox and side panel. Guard those APIs.

## Design

Linear-style: flat sidebar on the window background, content in an inset rounded panel, Inter Variable at a 14px base, borders over shadows, Linear-like status rings (`components/status-icon.tsx`). Account and settings pages are width-capped (`Page` in `manager/toolbar.tsx`). Icons are Phosphor (`*Icon` exports, bold weight via `IconContext`). No native `<select>`; use `components/ui/select.tsx`. Radius: 6px small controls, 8px buttons and inputs, 12px cards, dialogs and panel. Lists use two-line rows (name, then meta) with quick actions always visible, no overflow menu (delete is the last icon), and content capped at 960px via `.gutter`. Scroll areas get edge fades via `.scroll-fade` (not on bordered cards). Clickable elements get a pointer cursor. No pill buttons, no cream backgrounds. Tokens live in `src/styles/app.css` (light and dark). Brand green `#B7D995` is the dark-mode accent; light mode uses `#4F8A2B`. Accent blue `#9ED1EC`.

## API notes

- Base `https://api.real-debrid.com/rest/1.0`, OAuth `https://api.real-debrid.com/oauth/v2`, open-source client id `X245A4XAIBGVM`
- `instantAvailability` is disabled (error 37); the "only cached" setting probes by adding and checking status instead
- Torrent `links[]` map 1:1 to selected files only when every selected file is media; otherwise RD returns one archive link
- Old links fail with `hoster_unavailable` (19); fix by reinserting with the same file selection
