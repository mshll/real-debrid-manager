# Real-Debrid Manager Extension

A browser extension for [Real-Debrid](https://real-debrid.com) that provides quick link unrestriction, torrent management, and account monitoring.

## Features

- **Quick Unrestrict** - Paste any supported link to get a premium download link instantly
- **Page Scanner** - Scan any webpage for supported hoster links and unrestrict them in batch
- **Torrent Management** - Add magnets, monitor progress, and manage your torrent queue
- **Download History** - View and re-download previously unrestricted links
- **Context Menu** - Right-click any link to unrestrict or add magnets directly
- **Notifications** - Get notified when torrents finish downloading
- **Dashboard** - Full account overview with stats, settings, and management tools

## Installation

### Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# For Safari
bun run dev:safari
```

Load the extension from `build/chrome-mv3-dev` in your browser's extension settings.

### Production Build

```bash
# Build for Chrome/Firefox
bun run build

# Build for Safari
bun run build:safari

# Package for store submission
bun run package
```

## Setup

1. Install the extension
2. Click the extension icon
3. Sign in with your Real-Debrid account (OAuth)
4. Start unrestricting links

## Tech Stack

- [Plasmo](https://plasmo.com) - Browser extension framework
- React 18 + TypeScript
- Tailwind CSS
- [Lucide React](https://lucide.dev) - Icons

## Browser Support

- Safari
- Chrome
- Firefox

## License

MIT
