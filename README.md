# Cartographer

**Fictional World Map Editor** — Create, annotate, and narrate the maps of your imaginary worlds.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← World Name                          [Export SVG] [JSON] [🌙]   │
├────┬────────────────────────────────────────────────────┬───────────┤
│ 🔍 │                                                    │ Entity    │
│ △  │          ·  ·  ·  ·  ·  ·  ·  ·  ·  ·            │ ─────────│
│ ●  │          ·        ╔══════════╗     ·              │ Name: ... │
│ ⌇  │          ·        ║ TERRITORY║  ★  ·              │ Type: ... │
│ ▲  │          ·        ║          ║Capital              │ Pop: ...  │
│ A  │          ·        ╚══════════╝     ·              │           │
│────│          ·     ●──────────●        ·              │ [Details] │
│ 🎨 │          ·   City    Route   City  ·              │ [Related] │
│    │          ·  ·  ·  ·  ·  ·  ·  ·  ·  ·            │ [Events]  │
│    │                                                    │           │
│    │             INFINITE CANVAS                        │ Markdown  │
│    │             pan · zoom · draw                      │ editor &  │
│    │                                                    │ preview   │
├────┴────────────────────────────────────────────────────┴───────────┤
│  ▲ Timeline    ◆ War   ◆ Treaty     ◆ Flood      ◆ Festival       │
│  ───────────●──────────●────────────●─────────────●──────────►     │
│  An 0       An 200     An 450       An 680        An 900   An 1200 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

- **Infinite Canvas** — Pan (click-drag / Alt+click), zoom (scroll wheel, 0.2x–5x), adaptive background grid
- **Drawing Tools** — Territory polygons, cities (capital/city/village), Bézier routes, natural regions with textures (forest/mountain/desert/ocean), free text labels
- **Selection & Drag** — Click to select, drag to move, Delete/Backspace to remove
- **Side Panel** — Context-aware form fields per entity type, markdown editor with toolbar & live preview, relations tab (auto-detected from description mentions), linked events tab
- **Narrative Timeline** — Collapsible horizontal bar, configurable fictional years, color-coded events (war/political/natural/cultural), click to navigate map
- **SVG Export** — Parchment-textured SVG with compass rose, old-style typography, A3 landscape
- **JSON Import/Export** — Full world backup & restore
- **Night Mode** — Toggle between parchment (#F5F0E8) and dark (#1A1A2E) themes
- **Persistence** — Every change saved to SQLite via REST API

---

## Installation

```bash
# Clone the repo
git clone <repo-url> cartographer
cd cartographer

# Install dependencies
npm install

# Start the server
npm start
```

The app runs at **http://localhost:3000** by default.

For development with auto-reload:

```bash
npm run dev
```

---

## Project Structure

```
cartographer/
├── server.js          Express server: REST API, SVG export, static serving
├── db.js              SQLite layer (better-sqlite3): worlds, entities, events
├── public/
│   ├── index.html     App shell: home + editor screens, modals, toolbar
│   ├── canvas.js      Infinite canvas engine: pan/zoom, drawing tools, rendering
│   ├── sidebar.js     Side panel: entity forms, markdown editor, relations, events
│   ├── timeline.js    Narrative timeline: axis, event markers, tooltips
│   ├── app.js         Orchestration: routing, API calls, wiring modules together
│   └── style.css      Full theme: CSS variables, parchment & night modes
├── package.json
└── README.md
```

### File Details

| File | Description |
|------|-------------|
| `server.js` | Express app with full REST API for worlds, entities, and events. Serves static files from `public/`. Includes SVG export endpoint that renders all map entities with parchment texture filter, compass rose, and Cinzel typography. |
| `db.js` | SQLite database with `better-sqlite3`. Three tables: `worlds`, `entities` (with JSON `data` column), `events`. Prepared statements for all CRUD operations. Import/export with ID remapping. |
| `canvas.js` | `CanvasEngine` class. Handles coordinate transforms (screen ↔ world), adaptive grid, entity rendering by type (polygons, icons, Bézier curves, texture patterns, text), hit testing (point-in-polygon, distance-to-segment), and all mouse/keyboard interaction for drawing and selection. |
| `sidebar.js` | `Sidebar` class. Three tabs: Details (form fields per entity type), Relations (auto-detected from description text), Events (linked timeline events). Includes simple markdown renderer (bold, italic, headings). |
| `timeline.js` | `Timeline` class. Canvas-rendered horizontal axis with adaptive ticks, diamond event markers color-coded by category, tooltips on hover, scroll by drag. |
| `app.js` | `App` singleton. Manages screen transitions, world CRUD, entity/event lifecycle, toolbar binding, theme toggle. All API calls go through `_api()` helper. |
| `style.css` | CSS custom properties for theming (`--bg`, `--ink`, `--accent`). Night mode via `[data-theme="night"]`. Cinzel for titles, Source Serif 4 for body. No framework — pure CSS. |

---

## API Endpoints

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

### Import / Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/worlds/:id/export` | Export world as JSON |
| POST | `/api/worlds/import` | Import world from JSON |
| GET | `/api/worlds/:id/svg` | Export world as printable SVG |

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
| `Delete` / `Backspace` | Delete selected entity |
| `Escape` | Cancel current drawing / deselect |
| `Alt + Click` | Pan the canvas |
| Right-click | Close polygon (territory/region) |

---

## Tech Stack

- **Backend**: Node.js, Express, better-sqlite3
- **Frontend**: Vanilla JavaScript, Canvas API, CSS custom properties
- **Fonts**: Cinzel (titles), Source Serif 4 (body) via Google Fonts
- **No frameworks** — zero build step, zero dependencies on the frontend

---

## Roadmap

- [ ] Undo/redo system (command pattern)
- [ ] Multi-select and group operations
- [ ] Bezier control point editing for routes
- [ ] Custom SVG icons for cities
- [ ] Layers system (toggle visibility of entity types)
- [ ] Collaborative editing (WebSocket)
- [ ] Image import as background layer (scanned maps)
- [ ] Search/filter entities by name or type
- [ ] Print-optimized CSS for the sidebar
- [ ] PWA support for offline use
