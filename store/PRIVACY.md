# Privacy Policy

Last updated: November 2026

Real-Debrid Manager is a browser extension for your Real-Debrid account. It has no server of its own, no analytics and no tracking. This policy covers version 2.0 and later.

## What the extension collects

Nothing. The developer receives no data from the extension, and the extension sends nothing to the developer or to any third party.

## What it stores in your browser

- **Your Real-Debrid sign-in.** The access and refresh tokens from browser sign-in, or the API token you paste in. Stored in the browser's local extension storage on this device only.
- **Your settings.** File selection rule, notifications, player choice and similar preferences. Stored in the browser's sync storage, so they follow your browser account if you use browser sync.
- **Working data.** A short-lived list of torrents waiting for file selection, the last known torrent states (to notify you when one finishes), Real-Debrid's list of supported hosts, and a sign-in session in progress.

Signing out removes your sign-in. Removing the extension removes everything it stored.

## What it sends, and where

The extension talks only to Real-Debrid's official API (`api.real-debrid.com`), directly from your browser. It sends the links, magnets and .torrent files you choose to add, and the requests needed to show your torrents, downloads and account. See [Real-Debrid's privacy policy](https://real-debrid.com/privacy) for how Real-Debrid handles that data.

Two cases fetch from somewhere else, both started by you:

- **Adding a .torrent link.** The extension downloads that .torrent file from the site it is on, so it can upload it to Real-Debrid.
- **Opening a stream in an external player.** IINA, VLC or Infuse receive the stream link from Real-Debrid.

## Reading pages

- **Find links on a page.** When you open the popup or side panel, the extension reads the links and visible text of the current page to list magnets and supported hoster links. This happens in your browser. Only the links you choose to add are sent to Real-Debrid. You can turn the automatic scan off in Settings.
- **Catch magnet links.** Off by default. When you turn it on, the browser asks you to allow access to all sites. A small script then watches for clicks on magnet links and sends only the clicked magnet to Real-Debrid. It reads nothing else on the page.
- **Clipboard.** The paste button reads your clipboard once, when you click it, after the browser asks for permission.

## Permissions

| Permission | Why |
| --- | --- |
| Storage | Keep your sign-in, settings and working data. |
| Alarms | Check progress every 30 seconds while torrents are active, and once a day for premium expiry. |
| Context menus | "Send to Real-Debrid" on links and selected text. |
| Active tab, scripting | Read links on the page you are viewing, when you open the popup. |
| Notifications | Tell you when a torrent finishes or an add fails. |
| Downloads | Save files from Real-Debrid through the browser's download manager. |
| Side panel | Show the extension in the browser's side panel (Chromium). |
| real-debrid.com | Talk to the Real-Debrid API. |
| All sites (optional) | Only when you turn on magnet catching, or allow the side panel to read pages. |
| Clipboard (optional) | Only when you click the paste button. |

## Open source

The full source is on [GitHub](https://github.com/mshll/real-debrid-manager), so you can check every point above.

## Changes

Changes to this policy appear on this page with a new date.

## Contact

Open an issue on [GitHub](https://github.com/mshll/real-debrid-manager/issues).
