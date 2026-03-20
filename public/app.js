/**
 * Cartographer — App Orchestration
 *
 * Handles routing between home/editor screens, API communication,
 * and wiring all modules together.
 */

/* global CanvasEngine, Sidebar, Timeline */

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
    window.open(`/api/worlds/${this.currentWorld.id}/svg`, '_blank');
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

  // ─── API helpers ────────────────────────────────────────────

  async _api(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`API ${method} ${url}: ${res.status}`);
    return res.json();
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
