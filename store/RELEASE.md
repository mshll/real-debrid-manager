# Real-Debrid Manager 2.0.1

## Fixes

- Sign-in and every other request failed with "NetworkError" on networks that block `api.real-debrid.com`, such as some ISPs in Turkey (#6). The extension now talks to `app.real-debrid.com`, the same API under another name, and switches to the other host when one is unreachable.

## Install

- Chrome Web Store: https://chromewebstore.google.com/detail/real-debrid-manager/fengaeiifddaadaibopcibcdakiaaian
- Firefox Add-ons: https://addons.mozilla.org/firefox/addon/realdebrid-manager/
- Or load the attached zip unpacked.
