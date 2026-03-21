# Cartographer

**Fictional World Map Editor** — Create, annotate, and narrate the maps of your imaginary worlds.

**[Live Demo](https://mal0004.github.io/Cartographer/)**

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

- **Infinite Canvas** — Pan, zoom (0.2x–5x), adaptive grid with theme-aware styling
- **Drawing Tools** — Territory polygons, cities (capital/city/village), Bezier routes, natural regions (forest/mountain/desert/ocean), free text labels, symbol library
- **Selection & Drag** — Click to select with animated pulsing halo, drag to move, Delete to remove
- **Side Panel** — Context-aware fields per entity type, markdown editor with live preview, relations (auto-detected), linked events
- **Narrative Timeline** — Collapsible horizontal bar, fictional year range, color-coded events (war/political/natural/cultural)
- **Layers** — Toggle visibility and opacity per entity type
- **Undo/Redo** — Full command-pattern history (Ctrl+Z / Ctrl+Shift+Z)
- **Themes** — 6 built-in themes (Parchment, Night Gold, Sepia, Ocean, Forest, Frost)
- **SVG Export** — Premium export with parchment texture, compass rose, old-style typography
- **JSON Import/Export** — Full world backup & restore
- **Share** — Generate shareable read-only links
- **Templates** — Start from pre-built world templates
- **Snap & Guides** — Snap to elements or grid for precise placement
- **Minimap** — Draggable overview, repositionable on canvas
- **Responsive** — Fluid layout, resizable sidebar/timeline, toolbar wrapping, touch support

---

## Getting Started

### Full version (Node.js + SQLite)

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

### Static demo (no server needed)

Open `demo/index.html` directly in your browser, or visit the **[live demo](https://mal0004.github.io/Cartographer/)**.

The demo uses `localStorage` instead of SQLite — same features, data stays in your browser.

---

## Two Versions

| | Full version (`public/`) | Static demo (`demo/`) |
|---|---|---|
| **Backend** | Express + SQLite | None (client-only) |
| **Storage** | Server-side database | Browser localStorage |
| **Persistence** | Survives browser changes | Browser-local only |
| **Share** | Token-based server links | Base64-encoded URL hash |
| **Setup** | `npm install && npm start` | Open `index.html` |

### Key differences in `demo/`

- `local-db.js` replaces SQLite with a localStorage-backed CRUD interface
- `app.js` routes API calls to `LocalDB` instead of `fetch()`
- `index.html` uses relative paths and loads `local-db.js`
- All other files (canvas, sidebar, timeline, styles) are identical copies

---

## Project Structure

```
Cartographer/
├── server.js             Express server: REST API + static files
├── db.js                 SQLite layer (better-sqlite3)
├── package.json          Node.js dependencies
│
├── public/               Frontend (served by Express)
│   ├── index.html        App shell
│   ├── app.js            Orchestration & API calls
│   ├── canvas.js         Infinite canvas engine
│   ├── sidebar.js        Side panel + markdown editor
│   ├── timeline.js       Narrative timeline
│   ├── style.css         Theming (CSS custom properties)
│   ├── responsive.js     Resize handles, minimap drag
│   ├── layers.js         Layer visibility & opacity
│   ├── symbols.js        Symbol library
│   ├── themes.js         Theme manager (6 themes)
│   ├── undo.js           Undo/redo (command pattern)
│   ├── snap.js           Snap to elements/grid
│   ├── minimap.js        Minimap overlay
│   ├── templates.js      World templates
│   ├── onboarding.js     First-run tutorial
│   ├── mode-toggle.js    Simple/advanced mode
│   ├── svg-export.js     Premium SVG export panel
│   └── viewer.html       Read-only shared map viewer
│
├── demo/                 Static demo (GitHub Pages)
│   ├── local-db.js       ★ localStorage replacement for SQLite
│   ├── app.js            ★ Routes to LocalDB instead of fetch
│   ├── index.html        ★ Relative paths + local-db.js
│   └── ...               Identical copies of public/ files
│
└── README.md
```

Files marked ★ differ between `public/` and `demo/`.

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
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected entity |
| `Escape` | Cancel drawing / deselect |
| `Alt + Click` | Pan the canvas |
| Right-click | Close polygon |

---

## Tech Stack

- **Backend**: Node.js, Express, better-sqlite3, nanoid
- **Frontend**: Vanilla JavaScript, Canvas API, CSS custom properties
- **Fonts**: Cinzel (titles), Source Serif 4 (body) via Google Fonts
- **Zero frameworks** — no build step, no frontend dependencies

---

## License

MIT
