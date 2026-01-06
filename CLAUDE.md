# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-Debrid browser extension built with Plasmo framework. Provides link unrestriction, torrent management, and account dashboard functionality. Safari is the primary target, also supports Chrome and Firefox.

## Commands

```bash
# Development
bun run dev              # Start development server
bun run dev:safari       # Dev for Safari (--target=safari-mv3)

# Production
bun run build            # Production build
bun run build:safari     # Safari production build
bun run package          # Package for store submission
```

Load the dev build from `build/chrome-mv3-dev` in browser.

## Tech Stack

- **Framework**: Plasmo (browser extension framework)
- **UI**: React 18 + TypeScript + Tailwind CSS
- **Package Manager**: bun
- **Icons**: lucide-react

## Architecture

### Entry Points

- `src/popup.tsx` - Extension popup UI with quick actions
- `src/background.ts` - Service worker handling all API calls and state
- `src/tabs/dashboard.tsx` - Full-page dashboard (opens in new tab)
- `src/contents/link-scanner.ts` - Content script for on-demand page scanning

### Core Libraries (`src/lib/`)

- `api/client.ts` - Base API client with rate limiting (250 req/min) and auth headers
- `api/` - Typed wrappers for Real-Debrid API endpoints (user, unrestrict, torrents, downloads, hosts)
- `auth.ts` - OAuth device code flow implementation
- `storage.ts` - Type-safe Chrome storage wrapper with caching (5 min TTL)
- `messaging.ts` - Type-safe message passing between background/popup/content scripts

### Data Flow

1. **Popup/Dashboard** sends typed messages via `messages.*` functions
2. **Background script** receives via `createMessageListener()`, calls API with token
3. **API client** handles auth headers, rate limiting, error transformation
4. **Storage** caches responses and manages auth data in Chrome sync/local storage

### Background Service Features

- Token refresh on expiry (5 min buffer)
- Torrent polling every 30s when active torrents exist
- Badge count for active torrents
- Notifications on torrent completion (toggleable)
- Context menu: "Add to Real-Debrid" on any link

### Path Alias

Use `~` prefix for imports from `src/`: `import { messages } from "~lib/messaging"`

## Brand Colors

- Primary green: #B7D995
- Accent blue: #9ED1EC

## API Notes

- Base URL: `https://api.real-debrid.com/rest/1.0`
- Rate limit: 250 requests/minute (tracked client-side)
- Auth: Bearer token in Authorization header
- POST body format: URL-encoded form data
