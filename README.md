<p align="center">
  <img src=".github/assets/logo.png" width="120" alt="Real-Debrid Manager">
</p>

<h1 align="center">Real-Debrid Manager</h1>

<p align="center">
  Capture links, manage torrents and run your Real-Debrid account from the browser.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/real-debrid-manager/fengaeiifddaadaibopcibcdakiaaian"><img src="https://img.shields.io/badge/Chrome-Install-4285F4?logo=googlechrome&logoColor=white" alt="Chrome Web Store"></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/realdebrid-manager/"><img src="https://img.shields.io/badge/Firefox-Install-FF7139?logo=firefox&logoColor=white" alt="Firefox Add-ons"></a>
  <img src="https://img.shields.io/badge/Safari-supported-006CFF?logo=safari&logoColor=white" alt="Safari Supported">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License">
</p>

---

<p align="center">
  <img src=".github/assets/manager-torrents-light.png" width="720" alt="Manager">
</p>

<details>
<summary>More screenshots</summary>
<br>

| | |
|:---:|:---:|
| <img src=".github/assets/popup-dark.png" height="360" alt="Popup"> | <img src=".github/assets/manager-torrent-detail-dark.png" height="360" alt="Torrent details"> |
| Popup | Torrent details |
| <img src=".github/assets/manager-file-picker-light.png" height="300" alt="File picker"> | <img src=".github/assets/manager-account-light.png" height="300" alt="Account"> |
| File picker | Account and traffic |
| <img src=".github/assets/manager-settings-dark.png" height="300" alt="Settings"> | <img src=".github/assets/manager-command-palette-dark.png" height="300" alt="Command palette"> |
| Settings | Command palette |

</details>

## Features

**Capture**
- Paste magnets, info hashes, hoster links or folders; drop `.torrent` files
- Right-click any link or selected text, or type `rd` in the address bar
- The popup finds every magnet and supported link on the current page
- Optionally catch magnet clicks on every site

**Torrents**
- Starts automatically: picks the main video files and skips samples, extras and junk (or all, largest, or ask)
- Skips torrents already in your library; optional "only keep cached"
- Live progress, badge count, and notifications when torrents finish or fail
- Search, filter, sort, bulk actions, dedupe, cleanup of failed torrents, and one-click reinsert for expired links

**Downloads**
- Download in the browser, stream in a built-in player, copy links, or open in IINA, VLC or Infuse

**Account**
- Premium days, fidelity points conversion, 31-day traffic chart, host quotas, Real-Debrid streaming settings
- Premium expiry reminder

## Install from source

```bash
bun install
bun run build            # Chromium: load .output/chrome-mv3 unpacked
bun run build:firefox    # .output/firefox-mv3
bun run build:safari     # then build safari-extension/Real-Debrid Manager in Xcode
```

## Development

```bash
bun run dev       # HMR dev build
bun run test      # unit tests
bun run e2e       # screenshots and smoke checks against a mocked API
bun run compile   # typecheck
```

## License

MIT
