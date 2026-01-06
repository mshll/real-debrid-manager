# Real-Debrid Browser Extension

## Overview

A Plasmo-based browser extension for Real-Debrid with full link unrestriction, torrent management, and account dashboard. Safari-first development, open source for personal use.

## Tech Stack

- **Framework**: Plasmo (browser extension framework)
- **UI**: React + TypeScript + Tailwind CSS
- **Targets**: Safari (primary), Chrome, Firefox
- **Package Manager**: bun

## Brand Colors

- Primary green: #B7D995
- Accent blue: #9ED1EC
- Theme: System light/dark mode

## Project Structure

```
real-debrid-extension/
├── src/
│   ├── popup.tsx                 # Quick actions popup
│   ├── background.ts             # Service worker
│   ├── contents/
│   │   └── link-scanner.ts       # On-demand page scanning
│   ├── components/
│   │   ├── AccountBar.tsx
│   │   ├── UnrestrictInput.tsx
│   │   ├── DetectedLinks.tsx
│   │   ├── TorrentList.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts         # Base fetch with auth
│   │   │   ├── user.ts           # User endpoints
│   │   │   ├── unrestrict.ts     # Unrestrict endpoints
│   │   │   ├── torrents.ts       # Torrent endpoints
│   │   │   └── downloads.ts      # Downloads endpoints
│   │   ├── auth.ts               # OAuth flow
│   │   ├── storage.ts            # Type-safe storage
│   │   └── messaging.ts          # Background messaging
│   └── tabs/
│       └── dashboard.tsx         # Full management dashboard
├── assets/
│   └── icon.png
├── package.json
└── tailwind.config.js
```

## Features

### 1. Popup (Quick Actions)

```
┌─────────────────────────────────────┐
│  [RD Logo]  meshal                  │
│  Premium: 47 days  •  1,250 pts     │
├─────────────────────────────────────┤
│  ┌─────────────────────────┐  [→]   │
│  │ Paste link...           │        │
│  └─────────────────────────┘        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ✓ filename.zip     124 MB   │    │
│  │   [Download]  [Copy Link]   │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  Detected on page          [Scan]   │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 1F  │ │ MG  │ │ UP  │  +2 more  │
│  └─────┘ └─────┘ └─────┘           │
│  [Unrestrict All]  [Download All]   │
├─────────────────────────────────────┤
│  Active Torrents                 3  │
│  ├─ Ubuntu.iso         ████░ 78%   │
│  ├─ Movie.mkv          ██░░░ 34%   │
│  └─ View all →                      │
├─────────────────────────────────────┤
│  [Dashboard]               [⚙]     │
└─────────────────────────────────────┘
```

- Account bar: username, days remaining, points
- Quick unrestrict input with result card (download + copy)
- On-demand page scan for detected links
- Batch unrestrict and download all
- Active torrents summary with progress

### 2. Full Dashboard (Single Page)

Sidebar navigation with sections:

**Account**
- Stats cards: Premium days, Points, Traffic remaining
- Account details: email, type, expiration

**Torrents**
- Full list with status filters
- Add torrent button (magnet paste or .torrent upload)
- File selection modal with checkboxes
- Actions: Select Files, Unrestrict, Delete

**Downloads**
- History of unrestricted links
- Re-download, copy link, delete

**Settings**
- Notifications toggle
- Clear cache
- Sign out

### 3. Context Menus

- **"Unrestrict with Real-Debrid"** - on any link
- **"Add Torrent to Real-Debrid"** - on magnet links only

### 4. Authentication

OAuth flow:
1. User clicks Sign In
2. Opens Real-Debrid auth page
3. User logs in, redirects with auth code
4. Background script exchanges code for token
5. Token stored in extension storage

### 5. Background Features

- API communication (keeps token secure)
- Torrent polling every 30s when active torrents exist
- Optional notifications for torrent completion
- Badge count for active torrents

### 6. Link Detection

On-demand scan (not automatic):
1. User clicks Scan button in popup
2. Content script scans page for supported hoster links
3. Results shown as clickable chips
4. Batch unrestrict and download available

## Implementation Phases

### Phase 1: Project Setup
- Initialize Plasmo project with bun
- Configure Tailwind with brand colors
- Set up project structure
- Configure Safari build target

### Phase 2: API Layer
- Implement base API client with auth headers
- Add all endpoint wrappers (user, unrestrict, torrents, downloads)
- Type-safe storage wrapper
- Background/popup messaging system

### Phase 3: Authentication
- OAuth flow implementation
- Token storage and refresh
- Sign in/out UI

### Phase 4: Popup UI
- Account bar component
- Unrestrict input with result cards
- Detected links section (chips)
- Active torrents summary
- Apply design-principles skill for clean UI

### Phase 5: Dashboard
- Sidebar navigation
- Account section with stats
- Torrents section with full management
- Downloads history section
- Settings section

### Phase 6: Context Menus & Content Scripts
- Context menu registration
- Link scanner content script
- Magnet link detection

### Phase 7: Background Features
- Torrent polling logic
- Notification system (optional toggle)
- Badge updates

### Phase 8: Safari Finalization
- Test Safari-specific behavior
- Xcode wrapper configuration
- Self-signing for personal use

## API Endpoints Used

**User**
- GET /user - profile info
- GET /settings - current settings

**Unrestrict**
- POST /unrestrict/link - generate download link
- POST /unrestrict/folder - unrestrict folder links

**Torrents**
- GET /torrents - list all
- GET /torrents/info/{id} - torrent details
- POST /torrents/addMagnet - add magnet
- PUT /torrents/addTorrent - upload .torrent file
- POST /torrents/selectFiles/{id} - select files
- DELETE /torrents/delete/{id} - remove torrent

**Downloads**
- GET /downloads - history
- DELETE /downloads/delete/{id} - remove entry

**Hosts**
- GET /hosts/regex - patterns for link detection

## Notes

- Rate limit: 250 requests/minute
- Use design-principles skill for all UI work
- Safari-first testing throughout development
