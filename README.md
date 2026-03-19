# ⚑ Cartographer

> A web-based editor for fictional world maps — forge your worlds, map your legends.

[![Node.js](https://img.shields.io/badge/Node.js-≥18-green)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Interface Overview (ASCII)](#interface-overview-ascii)
- [Roadmap](#roadmap)

---

## Features

- **Infinite canvas** — pan (click-drag) and zoom (scroll wheel, 0.2×–5×) with a subtle adaptive grid
- **Drawing tools** — Territory (polygon), City (point/icon), Route (Bézier curve), Natural Region (forest/mountain/desert/ocean), Free Text
- **Selection & editing** — click to select, drag to move, Delete key to remove, Ctrl+Z to undo
- **Side panel** — per-element info form, live Markdown editor, Relations tab (auto-detects entity mentions), Events tab
- **Narrative timeline** — collapsible bottom bar, configurable year range, colour-coded event categories, click to centre map
- **SVG export** — printable A3 parchment map with compass rose, scale bar, and old-style typography
- **World management** — home screen with world cards, create / rename / delete worlds, JSON backup & restore
- **Night mode** — toggle between parchment and dark theme, preference persisted in localStorage
- **Persistent storage** — SQLite via `better-sqlite3`, REST API, every change saved immediately

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/mal0004/Cartographer.git  # replace with your fork URL
cd Cartographer

# 2. Install dependencies
npm install

# 3. Start the server
npm start
# → Cartographer running on http://localhost:3000
```

The SQLite database (`cartographer.db`) is created automatically on first run.

---

## Project Structure

```
cartographer/
├── server.js          Express server · REST API · SVG export endpoint
├── db.js              SQLite layer (better-sqlite3) — worlds, elements, events
├── public/
│   ├── index.html     Single-page app shell — home screen + editor layout
│   ├── canvas.js      Infinite canvas engine (pan/zoom, all drawing tools, hit-testing)
│   ├── sidebar.js     Side panel — info forms, Markdown editor, Relations/Events tabs
│   ├── timeline.js    Narrative timeline bar — render, CRUD, event modals
│   ├── app.js         Global orchestration — routing, world CRUD, modal system, imports/exports
│   └── style.css      Design system — CSS custom properties, parchment + night themes
├── package.json
└── README.md
```

### File Descriptions

| File | Responsibility |
|---|---|
| `server.js` | Express app, static file serving, full REST API (`/api/worlds`, `/api/.../elements`, `/api/.../events`, SVG export, JSON import/export) |
| `db.js` | SQLite schema creation, all prepared statements, helper functions for worlds / elements / events. Pure data layer, no HTTP concerns. |
| `public/index.html` | HTML shell with home screen, editor screen (canvas + toolbar + sidebar + timeline), and modal overlay. All CSS and JS loaded here. |
| `public/canvas.js` | `CanvasModule` — draws the world map on `<canvas>`. Handles pan/zoom, tool state machine, polygon/route/city/text/region drawing, hit-testing, element selection and dragging, API persistence, undo stack. |
| `public/sidebar.js` | `SidebarModule` — opens/closes the right-hand panel. Generates type-specific info forms (city/territory/route/region/text), live Markdown preview, tags widget, relations auto-detection, events tab. |
| `public/timeline.js` | `TimelineModule` — collapsible bottom timeline. Renders axis, ticks, and event dots. Add/edit/delete event modals. Integrates with canvas (centre on entity) and sidebar (open entity panel). |
| `public/app.js` | `AppModule` — boots the app, renders world cards, handles world CRUD modals, night mode toggle, JSON backup/restore, SVG export flow, shared `showModal`/`closeModal` API. |
| `public/style.css` | All styles via CSS custom properties. Parchment palette + night mode, toolbar, sidebar, timeline, modal, buttons, scrollbars, cursor overrides per tool. No external CSS framework. |

---

## Usage

### Drawing on the canvas

| Tool | Shortcut | How to use |
|---|---|---|
| Select / Move | `V` | Click element to select; drag to move; Delete to remove |
| Territory | `T` | Click to place vertices; right-click or double-click to close polygon |
| City | `C` | Single click places a city at cursor; choose type in toolbar |
| Route | `R` | Click start point, then end point — Bézier curve drawn automatically |
| Natural Region | `N` | Same as Territory; choose terrain type in toolbar |
| Free Text | `X` | Click canvas, type label in prompt |

**Zoom/Pan:** scroll wheel to zoom · click-drag on empty canvas to pan · `0` to reset zoom

### Side panel

Click any element to open its info panel. Fill in name, properties, and a Markdown description.  
The **Relations** tab auto-detects other entity names in the description and links them.  
The **Events** tab lists timeline events linked to this entity.

### Timeline

Click **▲ Timeline** to expand the bar. Set the year range.  
Click **+ Event** or click directly on the axis to add an event at that year.  
Click an event dot to centre the map on its linked entity.

### Export

- **🖨 Export SVG** — generates a printable A3 parchment map (title, compass rose, scale bar)
- **⬇ Backup** — downloads the world as a JSON file
- **⬆ Import** (home screen) — restores a world from a JSON backup

---

## API Reference

```
GET    /api/worlds                      List all worlds
POST   /api/worlds                      Create world { name, description }
GET    /api/worlds/:id                  Get world
PUT    /api/worlds/:id                  Update world { name, description }
DELETE /api/worlds/:id                  Delete world (cascade)

GET    /api/worlds/:id/elements         List elements
POST   /api/worlds/:id/elements         Create element { type, data }
PUT    /api/worlds/:id/elements/:eid    Update element { data }
DELETE /api/worlds/:id/elements/:eid    Delete element

GET    /api/worlds/:id/events           List events
POST   /api/worlds/:id/events           Create event { title, date_value, category, description, entity_ids }
PUT    /api/worlds/:id/events/:evid     Update event
DELETE /api/worlds/:id/events/:evid     Delete event

GET    /api/worlds/:id/export           Export world as JSON
POST   /api/import                      Import world from JSON
POST   /api/worlds/:id/export-svg       Generate printable SVG { title, width, height }
```

---

## Interface Overview (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚑ Cartographer            Forge your worlds, map your legends         │
│  ┌──────────────┐ ┌──────────────┐  ┌───────────────────┐             │
│  │  + New World │ │  ⬆ Import   │  │       ☽            │             │
│  └──────────────┘ └──────────────┘  └───────────────────┘             │
│                                                                         │
│  ╔════════════╗  ╔════════════╗  ╔════════════╗                       │
│  ║ 🗺 Aethoria ║  ║ Westmarch  ║  ║  The Void  ║   (world cards)     │
│  ║ An ancient… ║  ║ Dark realm ║  ║ Empty map  ║                       │
│  ╚════════════╝  ╚════════════╝  ╚════════════╝                       │
└─────────────────────────────────────────────────────────────────────────┘

Editor view:
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Worlds    Aethoria                  🖨 Export SVG  ⬇ Backup   ☽     │
├────────────────────────────────────────────────────────────────────────┤
│              [ ↖  ⬡  ⬤  ↝  ⊕  𝐓 | ↩  ⊙  100% ]  ← toolbar          │
│                                                                         │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ┌──────────────────┐  │
│  ░  ╱‾‾‾‾‾╲  ░ ·········  ░  ~~~~~  ░         │ Territory        │  │
│  ░ ╱ NORTH  ╲ ░  FOREST  ░  OCEAN  ░  canvas  │──────────────────│  │
│  ░╱  REALM   ╲░ ·········  ░  ~~~~~  ░  area   │ Info | Rel | Evts│  │
│  ░╲           ╱░░░░░░░░░░░░░░░░░░░░░░░         │──────────────────│  │
│  ░░╲_________╱░░░░░░░░░░░░░░░░░░░░░░░░         │ Name:  _________ │  │
│  ░░░░░░●══════════════════●░░░░░░░░░░░         │ Ruler: _________ │  │
│  ░░░░ City A   (route)  City B ░░░░░░░         │ ┌──md editor──┐  │  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░         │ └─────────────┘  │  │
│                                                 └──────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│ ▲ Timeline  + Event   From [0___] To [1000_]                           │
│ ─────●─────────────────●──────────────●──── (axis)                    │
│     War      Cultural         Politics                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Roadmap

Contributions are welcome! Here are ideas for future development:

- [ ] **Fog of war** — reveal/hide regions as the story progresses
- [ ] **Multi-layer maps** — political, terrain, trade routes as toggleable layers
- [ ] **Collaborative editing** — WebSocket-based real-time multi-user editing
- [ ] **Image import** — use a scanned or AI-generated map as a background layer
- [ ] **Character tracking** — link characters to cities and routes; show movement history
- [ ] **Custom icon library** — SVG icons for castles, dungeons, ports, ruins, etc.
- [ ] **Procedural generation** — random continent shape, biome placement, city naming
- [ ] **Mobile touch support** — pinch-to-zoom, touch-drag pan
- [ ] **Versioning / snapshots** — save named snapshots of map state per era
- [ ] **Plugin API** — allow custom tools and exporters via a plugin interface
- [ ] **PDF export** — direct PDF output without SVG intermediate
- [ ] **i18n** — internationalisation for UI labels and dates

---

## Tech Stack

| Layer | Technology |
|---|---|
| Server | Node.js · Express |
| Database | SQLite via `better-sqlite3` |
| Frontend | Vanilla JS (ES2020) · Canvas API · SVG |
| Styling | Pure CSS custom properties — no framework |
| Fonts | Cinzel · IM Fell English · Source Serif 4 (Google Fonts) |

---

## License

MIT © Cartographer contributors
