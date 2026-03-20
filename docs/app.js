/**
 * Cartographer — App Orchestration
 *
 * Handles routing between home/editor screens, API communication,
 * and wiring all modules together.
 */

/* global CanvasEngine, Sidebar, Timeline, LocalDB */

const App = {
  currentWorld: null,
  entities: [],
  events: [],
  canvasEngine: null,
  sidebar: null,
  timeline: null,

  // ─── Initialization ─────────────────────────────────────────

  init() {
    this.sidebar = new Sidebar();
    this.timeline = new Timeline();

    // Home screen
    document.getElementById('btn-new-world').addEventListener('click', () => this._showNewWorldModal());
    document.getElementById('modal-cancel').addEventListener('click', () => this._hideNewWorldModal());
    document.getElementById('modal-create').addEventListener('click', () => this._createWorld());
    document.getElementById('import-file').addEventListener('change', (e) => this._importWorld(e));

    // Editor
    document.getElementById('btn-back').addEventListener('click', () => this._goHome());
    document.getElementById('btn-export-svg').addEventListener('click', () => this._exportSVG());
    document.getElementById('btn-export-json').addEventListener('click', () => this._exportJSON());
    document.getElementById('btn-toggle-theme').addEventListener('click', () => this._toggleTheme());

    // Toolbar
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.canvasEngine) this.canvasEngine.setTool(btn.dataset.tool);
      });
    });
    document.getElementById('tool-color').addEventListener('input', (e) => {
      if (this.canvasEngine) this.canvasEngine.toolColor = e.target.value;
    });

    // Sidebar callbacks
    this.sidebar.onEntityUpdated = (entity) => this._updateEntity(entity);
    this.sidebar.onEntityDeleted = (entity) => this._deleteEntity(entity);
    this.sidebar.onNavigateTo = (entityId) => this._navigateToEntity(entityId);

    // Timeline callbacks
    this.timeline.onEventClick = (event) => this._onEventClick(event);
    this.timeline.onAddEvent = () => this._showAddEventModal();

    // Load worlds
    this._loadWorlds();

    // Theme from localStorage
    if (localStorage.getItem('cartographer-theme') === 'night') {
      document.documentElement.setAttribute('data-theme', 'night');
    }
  },

  // ─── Screen navigation ─────────────────────────────────────

  _showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },

  _goHome() {
    this.currentWorld = null;
    this.sidebar.close();
    this._showScreen('home-screen');
    this._loadWorlds();
  },

  // ─── Worlds ─────────────────────────────────────────────────

  async _loadWorlds() {
    const worlds = await this._api('GET', '/api/worlds');
    const grid = document.getElementById('worlds-grid');
    grid.innerHTML = '';

    for (const w of worlds) {
      const card = document.createElement('div');
      card.className = 'world-card';
      card.innerHTML = `
        <button class="btn-icon delete-world" data-id="${w.id}" title="Delete">&times;</button>
        <h3>${this._escapeHtml(w.name)}</h3>
        <p>${this._escapeHtml(w.description || 'No description')}</p>
        <div class="world-card-meta">Timeline: ${w.time_start} → ${w.time_end}</div>
      `;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.delete-world')) return;
        this._openWorld(w.id);
      });
      card.querySelector('.delete-world').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${w.name}"? This cannot be undone.`)) {
          await this._api('DELETE', `/api/worlds/${w.id}`);
          this._loadWorlds();
        }
      });
      grid.appendChild(card);
    }
  },

  _showNewWorldModal() {
    document.getElementById('modal-new-world').hidden = false;
    document.getElementById('new-world-name').focus();
  },

  _hideNewWorldModal() {
    document.getElementById('modal-new-world').hidden = true;
  },

  async _createWorld() {
    const name = document.getElementById('new-world-name').value.trim();
    if (!name) return;
    const world = await this._api('POST', '/api/worlds', {
      name,
      description: document.getElementById('new-world-desc').value.trim(),
      time_start: Number(document.getElementById('new-world-tstart').value) || 0,
      time_end: Number(document.getElementById('new-world-tend').value) || 1000,
    });
    this._hideNewWorldModal();
    // Clear form
    document.getElementById('new-world-name').value = '';
    document.getElementById('new-world-desc').value = '';
    this._openWorld(world.id);
  },

  async _importWorld(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    await this._api('POST', '/api/worlds/import', data);
    e.target.value = '';
    this._loadWorlds();
  },

  // ─── Editor ─────────────────────────────────────────────────

  async _openWorld(worldId) {
    this.currentWorld = await this._api('GET', `/api/worlds/${worldId}`);
    document.getElementById('world-title').textContent = this.currentWorld.name;

    this._showScreen('editor-screen');

    // Initialize canvas
    if (!this.canvasEngine) {
      this.canvasEngine = new CanvasEngine(document.getElementById('main-canvas'));
      this.canvasEngine.onEntitySelected = (entity) => this._onEntitySelected(entity);
      this.canvasEngine.onEntityCreated = (entity) => this._createEntity(entity);
      this.canvasEngine.onEntityUpdated = (entity) => this._updateEntity(entity);
      this.canvasEngine.onEntityDeleted = (entity) => this._deleteEntity(entity);
    }

    // Load entities and events
    await this._loadEntities();
    await this._loadEvents();

    // Reset view
    this.canvasEngine.offsetX = this.canvasEngine.width / 2;
    this.canvasEngine.offsetY = this.canvasEngine.height / 2;
    this.canvasEngine.zoom = 1;
    this.canvasEngine.setTool('select');
    this.canvasEngine.render();
  },

  async _loadEntities() {
    this.entities = await this._api('GET', `/api/worlds/${this.currentWorld.id}/entities`);
    if (this.canvasEngine) this.canvasEngine.setEntities(this.entities);
  },

  async _loadEvents() {
    this.events = await this._api('GET', `/api/worlds/${this.currentWorld.id}/events`);
    this.timeline.setData(this.events, this.currentWorld.time_start, this.currentWorld.time_end);
  },

  // ─── Entity CRUD ────────────────────────────────────────────

  _onEntitySelected(entity) {
    if (entity) {
      this.sidebar.open(entity, this.entities, this.events);
    } else {
      this.sidebar.close();
    }
  },

  async _createEntity(entityData) {
    const created = await this._api('POST', `/api/worlds/${this.currentWorld.id}/entities`, entityData);
    this.entities.push(created);
    this.canvasEngine.setEntities(this.entities);
    this.canvasEngine.selectEntity(created);
    this.sidebar.open(created, this.entities, this.events);
  },

  async _updateEntity(entity) {
    await this._api('PUT', `/api/entities/${entity.id}`, {
      name: entity.name,
      data: entity.data,
    });
    this.canvasEngine.render();
  },

  async _deleteEntity(entity) {
    await this._api('DELETE', `/api/entities/${entity.id}`);
    this.entities = this.entities.filter(e => e.id !== entity.id);
    this.canvasEngine.setEntities(this.entities);
    this.canvasEngine.selectEntity(null);
    this.sidebar.close();
  },

  _navigateToEntity(entityId) {
    const entity = this.entities.find(e => e.id === entityId);
    if (!entity) return;
    const pos = this._getEntityCenter(entity);
    if (pos) {
      this.canvasEngine.centerOn(pos.x, pos.y);
      this.canvasEngine.selectEntity(entity);
      this.sidebar.open(entity, this.entities, this.events);
    }
  },

  _getEntityCenter(entity) {
    const d = entity.data;
    switch (entity.type) {
      case 'city':
      case 'text':
        return { x: d.x, y: d.y };
      case 'territory':
      case 'region':
        if (d.points && d.points.length > 0) {
          const cx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
          const cy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;
          return { x: cx, y: cy };
        }
        return null;
      case 'route':
        return { x: (d.x1 + d.x2) / 2, y: (d.y1 + d.y2) / 2 };
    }
    return null;
  },

  // ─── Events ─────────────────────────────────────────────────

  _onEventClick(event) {
    // Center map on first linked entity
    if (event.entity_ids && event.entity_ids.length > 0) {
      this._navigateToEntity(event.entity_ids[0]);
    }
    // Open timeline if collapsed
    if (this.timeline.collapsed) this.timeline.toggle();
  },

  _showAddEventModal() {
    // Create a simple modal for adding events
    const existing = document.getElementById('event-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'event-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Add Event</h2>
        <div class="event-modal-fields">
          <label>Title<input type="text" id="evt-title" placeholder="Battle of the Plains"></label>
          <label>Year<input type="number" id="evt-date" value="${this.currentWorld.time_start}"></label>
          <label>Category
            <select id="evt-category">
              <option value="political">Political</option>
              <option value="war">War</option>
              <option value="natural">Natural</option>
              <option value="cultural">Cultural</option>
            </select>
          </label>
          <label>Description<textarea id="evt-desc" rows="3"></textarea></label>
          <label>Linked entities
            <select id="evt-entities" multiple style="height:80px">
              ${this.entities.filter(e => e.name).map(e => `<option value="${e.id}">${this._escapeHtml(e.name)} (${e.type})</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="evt-cancel">Cancel</button>
          <button class="btn btn-primary" id="evt-create">Add</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    document.getElementById('evt-cancel').addEventListener('click', () => modal.remove());
    document.getElementById('evt-create').addEventListener('click', async () => {
      const title = document.getElementById('evt-title').value.trim();
      if (!title) return;
      const selected = Array.from(document.getElementById('evt-entities').selectedOptions).map(o => Number(o.value));
      await this._api('POST', `/api/worlds/${this.currentWorld.id}/events`, {
        title,
        date: Number(document.getElementById('evt-date').value),
        category: document.getElementById('evt-category').value,
        description: document.getElementById('evt-desc').value.trim(),
        entity_ids: selected,
      });
      modal.remove();
      await this._loadEvents();
    });
  },

  // ─── Export ─────────────────────────────────────────────────

  _exportSVG() {
    if (!this.currentWorld) return;
    // Generate SVG client-side for the static demo
    const entities = this.entities;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of entities) {
      const d = e.data;
      if (d.x !== undefined) { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); minY = Math.min(minY, d.y); maxY = Math.max(maxY, d.y); }
      if (d.points) for (const p of d.points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
      if (d.x1 !== undefined) { minX = Math.min(minX, d.x1, d.x2); maxX = Math.max(maxX, d.x1, d.x2); minY = Math.min(minY, d.y1, d.y2); maxY = Math.max(maxY, d.y1, d.y2); }
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1000; maxY = 700; }
    const pad = 80; minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const vw = maxX - minX, vh = maxY - minY;
    const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    let content = '';
    for (const e of entities) {
      const d = e.data;
      if (e.type === 'territory' && d.points && d.points.length >= 3) {
        const pts = d.points.map(p => `${p.x},${p.y}`).join(' ');
        content += `<polygon points="${pts}" fill="${d.color||'#8B2635'}" fill-opacity="0.25" stroke="${d.color||'#8B2635'}" stroke-width="2.5"/>\n`;
        const cx = d.points.reduce((s,p)=>s+p.x,0)/d.points.length;
        const cy = d.points.reduce((s,p)=>s+p.y,0)/d.points.length;
        if (e.name) content += `<text x="${cx}" y="${cy}" text-anchor="middle" font-family="Cinzel,serif" font-size="16" fill="#2C1810">${esc(e.name)}</text>\n`;
      } else if (e.type === 'city') {
        const r = d.importance==='capital'?8:d.importance==='city'?5:3;
        content += `<circle cx="${d.x}" cy="${d.y}" r="${r}" fill="#2C1810"/>\n`;
        if (e.name) content += `<text x="${d.x+(d.labelOffsetX||10)}" y="${d.y+(d.labelOffsetY||-10)}" font-family="Cinzel,serif" font-size="${d.importance==='capital'?14:11}" fill="#2C1810">${esc(e.name)}</text>\n`;
      } else if (e.type === 'route' && d.x1!==undefined) {
        const stroke = d.style==='royal'?'#8B2635':d.style==='road'?'#2C1810':'#888';
        const sw = d.style==='royal'?3:d.style==='road'?2:1;
        if (d.cx1!==undefined) content += `<path d="M${d.x1},${d.y1} C${d.cx1},${d.cy1} ${d.cx2},${d.cy2} ${d.x2},${d.y2}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>\n`;
        else content += `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="${stroke}" stroke-width="${sw}"/>\n`;
      } else if (e.type === 'text') {
        content += `<text x="${d.x}" y="${d.y}" font-family="Cinzel,serif" font-size="${d.fontSize||16}" fill="#2C1810">${esc(e.name||d.text||'')}</text>\n`;
      }
    }
    const compassX = minX+vw-60, compassY = minY+vh-60;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${vw} ${vh}" width="1587" height="1123">
  <defs><filter id="parchment"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/><feDiffuseLighting in="noise" lighting-color="#F5F0E8" surfaceScale="2"><feDistantLight azimuth="45" elevation="55"/></feDiffuseLighting></filter></defs>
  <rect x="${minX}" y="${minY}" width="${vw}" height="${vh}" fill="#F5F0E8" filter="url(#parchment)"/>
  <text x="${minX+vw/2}" y="${minY+50}" text-anchor="middle" font-family="Cinzel,serif" font-size="32" font-weight="bold" fill="#2C1810">${esc(this.currentWorld.name)}</text>
  ${content}
  <g transform="translate(${compassX},${compassY})"><polygon points="0,-40 5,-10 -5,-10" fill="#2C1810"/><polygon points="0,40 5,10 -5,10" fill="#8B2635"/><text y="-44" text-anchor="middle" font-family="Cinzel,serif" font-size="12" fill="#2C1810">N</text></g>
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${this.currentWorld.name}.svg`; a.click();
    URL.revokeObjectURL(url);
  },

  async _exportJSON() {
    if (!this.currentWorld) return;
    const data = await this._api('GET', `/api/worlds/${this.currentWorld.id}/export`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentWorld.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ─── Theme ──────────────────────────────────────────────────

  _toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'night' ? '' : 'night';
    if (next) {
      document.documentElement.setAttribute('data-theme', next);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('cartographer-theme', next);
    if (this.canvasEngine) {
      this.canvasEngine._textureCache = {};
      this.canvasEngine.render();
    }
    this.timeline.render();
  },

  // ─── API helpers (localStorage-backed for static demo) ─────

  async _api(method, url, body) {
    // Route all API calls through LocalDB (no server needed)
    const db = LocalDB;
    const m = method.toUpperCase();

    // Worlds
    if (url === '/api/worlds' && m === 'GET') return db.getWorlds();
    if (url === '/api/worlds' && m === 'POST') return db.createWorld(body);
    if (url === '/api/worlds/import' && m === 'POST') return db.importWorld(body);

    let match;
    if ((match = url.match(/^\/api\/worlds\/(\d+)\/entities$/))) {
      const wid = Number(match[1]);
      if (m === 'GET') return db.getEntities(wid);
      if (m === 'POST') return db.createEntity(wid, body);
    }
    if ((match = url.match(/^\/api\/worlds\/(\d+)\/events$/))) {
      const wid = Number(match[1]);
      if (m === 'GET') return db.getEvents(wid);
      if (m === 'POST') return db.createEvent(wid, body);
    }
    if ((match = url.match(/^\/api\/worlds\/(\d+)\/export$/))) {
      return db.exportWorld(Number(match[1]));
    }
    if ((match = url.match(/^\/api\/worlds\/(\d+)$/))) {
      const id = Number(match[1]);
      if (m === 'GET') return db.getWorld(id);
      if (m === 'PUT') return db.updateWorld(id, body);
      if (m === 'DELETE') { db.deleteWorld(id); return { ok: true }; }
    }
    if ((match = url.match(/^\/api\/entities\/(\d+)$/))) {
      const id = Number(match[1]);
      if (m === 'GET') return db.getEntity(id);
      if (m === 'PUT') return db.updateEntity(id, body);
      if (m === 'DELETE') { db.deleteEntity(id); return { ok: true }; }
    }
    if ((match = url.match(/^\/api\/events\/(\d+)$/))) {
      const id = Number(match[1]);
      if (m === 'GET') return db.getEvent(id);
      if (m === 'PUT') return db.updateEvent(id, body);
      if (m === 'DELETE') { db.deleteEvent(id); return { ok: true }; }
    }

    console.warn('Unhandled API call:', method, url);
    return null;
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
