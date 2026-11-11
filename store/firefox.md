# Firefox Add-ons (AMO) listing

Add-on: https://addons.mozilla.org/firefox/addon/realdebrid-manager/
Add-on ID: `real-debrid@meshal` (unchanged from 1.x, so this uploads as a new version of the same listing)
Upload: `.output/real-debrid-manager-2.0.0-firefox.zip` from `bun run zip:firefox`
Source code: `.output/real-debrid-manager-2.0.0-sources.zip` (same command). AMO asks for it because the build is bundled and minified.

## Listing

**Name:** Real-Debrid Manager

**Summary** (175 of 250):

> Add magnets and links to Real-Debrid from any page, follow your torrents, and download or stream them without opening the site. Includes a sidebar that follows the active tab.

**Categories:** Download Management; Tabs

**Description:** use the Chrome description in `store/chrome.md`, with these changes:

- "the popup, the side panel" reads "the popup, the sidebar".
- Keep everything else.

**Homepage:** https://rdmanager.mshl.me
**Support site:** https://github.com/mshll/real-debrid-manager/issues
**Privacy policy:** paste `store/PRIVACY.md`, or link https://rdmanager.mshl.me/privacy

**Screenshots:** all six in `store/screenshots/` named `01-*.png` to `06-*.png` (1280x800).

## Version notes

Paste the "What's new" list from `store/RELEASE.md`.

## Notes for reviewers

```
Source build
- Requirements: bun 1.4.4 (https://bun.sh), macOS or Linux.
- Steps, from the root of the attached sources zip:
    bun install --frozen-lockfile
    bun run build:firefox
- Output: .output/firefox-mv3, identical to the uploaded package.
- The project uses WXT (https://wxt.dev) with Vite; nothing is fetched or generated at build time beyond npm packages pinned in bun.lock.

Testing
- A Real-Debrid account is needed for most features. Sign in from the popup with "Continue with Real-Debrid" (device code), or paste a private API token from https://real-debrid.com/apitoken.

Permissions
- <all_urls> is optional and requested only when the user turns on "Catch magnet links on every site" in Settings, or allows the sidebar to read pages.
- clipboardRead is optional and requested only when the user clicks the paste button.
- The extension talks only to api.real-debrid.com. No analytics, no remote code.
```

## Compatibility change

`strict_min_version` rose from 109.0 (1.x) to 128.0. Firefox 115 ESR users stay on 1.1.0; AMO will not offer them 2.0.
