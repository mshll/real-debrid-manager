# Chrome Web Store listing

Item: `fengaeiifddaadaibopcibcdakiaaian` (update of the existing listing, 1.1.0 to 2.0.0).
Upload: `.output/real-debrid-manager-2.0.0-chrome.zip` from `bun run zip`.

## Store listing

**Name:** Real-Debrid Manager

**Short description** (127 of 132):

> Add magnets and links to Real-Debrid from any page, follow your torrents, and download or stream them without opening the site.

**Category:** Productivity > Tools

**Language:** English

**Description:**

```
Real-Debrid Manager puts your Real-Debrid account in the browser toolbar.

Add from anywhere
- Paste magnets, info hashes, hoster links and folders into the popup.
- Open the popup on a page and it lists every magnet and supported link on it. Pick a few, or add them all.
- Right-click a link or selected text and send it to Real-Debrid.
- Type "rd" and a space in the address bar to add from there.
- Drop .torrent files on the popup or the manager.
- Optional: catch magnet links on every site, so a click goes to Real-Debrid instead of a torrent app.

Torrents that start on their own
- Picks the main video files and skips samples and extras. You can choose all files, the largest, or pick each time.
- Skips torrents already in your library.
- Optional: keep only torrents Real-Debrid already has cached.
- Reinsert a torrent with one click when its links expire.

Follow and finish
- Live progress in the popup, the side panel and a full manager page.
- A badge and a notification when a torrent finishes.
- Download in the browser, copy links, stream in the built-in player, or open in IINA, VLC or Infuse.

Your account
- Premium days left, points, traffic and host limits in one place.

Open source, no tracking, no server of its own. Talks only to the Real-Debrid API.
Not affiliated with Real-Debrid.
```

**Homepage URL:** https://rdmanager.mshl.me
**Support URL:** https://github.com/mshll/real-debrid-manager/issues

## Graphics

- Icon 128x128: `.output/chrome-mv3/icons/128.png`
- Screenshots 1280x800 (Chrome takes up to 5): `store/screenshots/01-torrents.png` to `05-account.png`
- Small promo tile 440x280: `store/screenshots/promo-440x280.png`

## Privacy practices

**Single purpose:**

> Manage a Real-Debrid account from the browser: add links and torrents to it, follow their progress, and download or stream the results.

**Permission justifications:**

| Permission | Justification |
| --- | --- |
| `storage` | Stores the user's Real-Debrid sign-in, their settings, and short-lived state such as torrents waiting for file selection. |
| `alarms` | Polls Real-Debrid every 30 seconds while torrents are active to update progress, start torrents and notify on completion; a daily alarm checks premium expiry. |
| `contextMenus` | Adds "Send to Real-Debrid" for links and selected text, "Find links on this page", and "Open Manager" on the toolbar button. |
| `activeTab` | When the user opens the popup, reads the current tab to list magnets and supported hoster links on it. No access to tabs the user has not opened the popup on. |
| `scripting` | Runs the link scan in the active tab (with activeTab), fetches a .torrent file from the page the user right-clicked so the site's cookies apply, and registers the optional magnet-click handler after the user turns it on. |
| `notifications` | Tells the user when a torrent finishes, when an add from the context menu or address bar succeeds or fails, and when premium is about to expire. Torrent and premium notifications can be turned off in Settings. |
| `downloads` | Saves files from Real-Debrid through the browser's download manager when the user clicks Download. |
| `sidePanel` | Offers the same interface in the side panel, so it stays open while the user browses. |
| Host `https://real-debrid.com/*`, `https://*.real-debrid.com/*` | The Real-Debrid API (`api.real-debrid.com`) and sign-in. RD sends no CORS headers, so the extension needs host access to call it. |
| Optional host `<all_urls>` | Requested only when the user turns on magnet catching (a click handler for magnet links on every site), or allows the side panel to read pages. Not granted at install. |
| Optional `clipboardRead` | Requested only when the user clicks the paste button in the popup. |

**Remote code:** No. All code is in the package.

**Data usage** (check these boxes):

- Authentication information: **Yes**. The Real-Debrid access token, stored locally and sent only to Real-Debrid.
- Website content: **Yes**. Links on the current page are read locally when the user opens the popup; only links the user chooses are sent to Real-Debrid.
- Personally identifiable information, health, financial and payment, personal communications, location, web history, user activity: **No**.

Certify all three:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://rdmanager.mshl.me/privacy

## Notes for this update

- No new install warnings compared with 1.1.0. Host access narrowed from `https://*/*` to real-debrid.com; all-sites access is now optional and requested at use. Existing users are not disabled by the update. (Chrome decides this on upload; check the warning shown in the dashboard.)
- `sidePanel` is new and shows no install warning.
- `scripting` is back. 1.0.1 removed it because it was unused; 2.0 uses it for the page scan, .torrent fetches from the page, and the opt-in magnet handler. It shows no install warning on its own. Expect the reviewer to check its justification.
- The v1 sign-in carries over on update.
