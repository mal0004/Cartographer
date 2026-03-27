# Cartographer

**Fictional World Map Editor** — Create, annotate, and narrate the maps of your imaginary worlds.

**[Live Demo](https://mal0004.github.io/Cartographer/)** • **[GitHub](https://github.com/mal0004/Cartographer)**

---

## Overview

Cartographer is a comprehensive web-based tool for world builders, game designers, and fantasy authors to create and manage detailed fictional maps. Draw territories and regions, place cities and landmarks, design trade routes, document historical timelines, and generate world lore using AI-powered analysis.

**Performance-optimized** for 60 FPS rendering on complex maps with 20+ territories and 50+ entities.

---

## Features

### Map Editing
- **Infinite Canvas** — Pan, zoom (0.2x–5x), adaptive grid with theme-aware styling
- **Drawing Tools** — Territory polygons, cities (capital/city/village), Bezier routes, natural regions (forest/mountain/desert/ocean), free text labels, symbol library
- **Procedural Generation** — Coastlines, hill shading, river systems, vegetation overlays with deterministic seeding
- **Selection & Drag** — Click to select with animated halo, drag to move, delete to remove
- **Layers Panel** — Toggle visibility and opacity per entity type

### World Documentation
- **Narrative Timeline** — Collapsible horizontal bar with fictional year range, color-coded events (war/political/natural/cultural)
- **Side Panel** — Context-aware fields per entity type, markdown editor with live preview, relations, linked events
- **Snap & Guides** — Snap to elements or grid for precise placement
- **Undo/Redo** — Full command-pattern history (Ctrl+Z / Ctrl+Shift+Z)

### AI-Powered Features
- **Geographic Coherence Engine** — Analyzes map coherence across 5 categories (rivers, biomes, entities, climate, political) with letter grades
- **Lore Generator** — Deterministic lore generation from geography: world history, territory descriptions, entity narratives
- **Analysis Panel** — Inspect coherence issues, filter by severity, locate on map

### Themes & Export
- **6 Built-in Themes** — Parchment, Night Gold, Sepia, Ocean, Forest, Frost
- **SVG Export** — Premium export with parchment texture, compass rose, old-style typography
- **JSON Import/Export** — Full world backup & restore
- **Share** — Generate shareable read-only links

### Additional
- **Templates** — Start from pre-built world templates
- **Minimap** — Draggable overview with repositioning
- **Responsive** — Fluid layout, resizable sidebar/timeline, touch support

---

## Performance

**10-phase optimization pipeline:**
- LayerManager: 5 offscreen canvas layers with dirty tracking
- TileSystem: 256×256 tile cache with LRU eviction
- LOD: 4 detail levels with polygon simplification
- SpatialIndex: O(1) hit testing via spatial hash grid
- PathCache: Path2D object reuse
- Web Worker: Off-thread polygon simplification, shading, vegetation
- Cached styles & entity sort orders
- Capped devicePixelRatio (2x max)

**Monitor performance in dev mode:** Press `Alt+P` to toggle FPS overlay.

---

## Getting Started

### Full Version (Node.js + SQLite)

```bash
git clone https://github.com/mal0004/Cartographer.git
cd Cartographer
npm install
npm start
# → http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev
```

### Static Demo (No Server Required)

Open `docs/index.html` directly in your browser, or visit the **[live demo](https://mal0004.github.io/Cartographer/)**.

The demo uses `localStorage` instead of SQLite — same features, data stays in your browser.

---

## Two Deployment Options

| | Full Version (`public/`) | Static Demo (`docs/`) |
|---|---|---|
| **Backend** | Express + SQLite | None (client-only) |
| **Storage** | Server-side database | Browser localStorage |
| **Persistence** | Survives browser changes | Local storage only |
| **Share Links** | Token-based server | Base64-encoded URL hash |
| **Setup** | `npm install && npm start` | Open `index.html` |

### Key Differences in `docs/`

- `local-db.js` replaces SQLite with localStorage CRUD
- `app.js` routes API calls to `LocalDB` instead of `fetch()`
- `index.html` uses relative paths
- All other files (canvas, sidebar, timeline, styles) are identical

---

## Project Structure

```
Cartographer/
├── server.js                    Express server: REST API
├── db.js                        SQLite layer (better-sqlite3)
├── package.json
│
├── public/                      Full version frontend
│   ├── index.html               App shell
│   ├── app.js                   Orchestration & API
│   ├── style.css                Theme system
│   ├── canvas/
│   │   ├── engine.js            Canvas rendering core
│   │   ├── render.js            Render pipeline
│   │   ├── layer-manager.js     5 offscreen layers
│   │   ├── tile-system.js       256×256 tile cache
│   │   ├── lod.js               Level of detail
│   │   ├── spatial-index.js     Hit testing grid
│   │   ├── path-cache.js        Path2D reuse
│   │   ├── compute-worker.js    Web Worker tasks
│   │   ├── worker-bridge.js     Worker interface
│   │   ├── perf-monitor.js      FPS overlay
│   │   └── ...                  Tools, events, brush
│   ├── ui/                      Sidebar, panels
│   ├── terrain/                 Procedural generation
│   ├── analysis/                Coherence, lore
│   ├── translations/            i18n (FR/EN)
│   └── ...
│
├── docs/                        Static demo (GitHub Pages)
│   ├── local-db.js              ★ localStorage replacement
│   ├── app.js                   ★ Routes to LocalDB
│   ├── index.html               ★ Relative paths
│   └── ...                      Copies of public/ files
│
└── README.md
```

Files marked ★ differ between `public/` and `docs/`.

---

## API Reference

*Full version only — the static demo has no server.*

### Worlds

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/worlds` | List all worlds |
| GET | `/api/worlds/:id` | Get a world |
| POST | `/api/worlds` | Create a world |
| PUT | `/api/worlds/:id` | Update a world |
| DELETE | `/api/worlds/:id` | Delete a world |

### Entities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/worlds/:wid/entities` | List entities for a world |
| GET | `/api/entities/:id` | Get an entity |
| POST | `/api/worlds/:wid/entities` | Create an entity |
| PUT | `/api/entities/:id` | Update an entity |
| DELETE | `/api/entities/:id` | Delete an entity |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/worlds/:wid/events` | List events for a world |
| GET | `/api/events/:id` | Get an event |
| POST | `/api/worlds/:wid/events` | Create an event |
| PUT | `/api/events/:id` | Update an event |
| DELETE | `/api/events/:id` | Delete an event |

### Import / Export / Share

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/worlds/:id/export` | Export world as JSON |
| POST | `/api/worlds/import` | Import world from JSON |
| POST | `/api/worlds/:id/share` | Create a share link |
| GET | `/api/share/:token` | Get shared world data |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `T` | Territory tool |
| `C` | City tool |
| `R` | Route tool |
| `N` | Natural region tool |
| `X` | Text label tool |
| `S` | Symbol tool |
| `Shift+A` | Analysis panel |
| `Shift+L` | Lorebook panel |
| `Alt+P` | Performance monitor (dev) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected |
| `Escape` | Cancel / deselect |
| `Alt + Click` | Pan canvas |
| Right-click | Close polygon |

---

## Tech Stack

- **Backend**: Node.js, Express, better-sqlite3, nanoid
- **Frontend**: Vanilla JavaScript (ES modules), Canvas 2D API, CSS custom properties
- **Workers**: Web Worker for heavy computations
- **Fonts**: Cinzel (titles), Source Serif 4 (body) via Google Fonts
- **i18n**: French & English with key-based translation system
- **Zero frameworks** — no build step, no npm dependencies on frontend

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Supports OffscreenCanvas (with fallback to regular canvas)

---

## Development

### Running Tests

```bash
npm test
```

### Building for Production

The static demo is always up-to-date via GitHub Pages; the full version runs directly from `public/`.

### Contributing

Feel free to open issues and pull requests on [GitHub](https://github.com/mal0004/Cartographer).

---

## License

MIT
