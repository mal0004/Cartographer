/**
 * Cartographer — App Orchestration
 *
 * Handles routing between home/editor screens, API communication,
 * and wiring all modules together.
 */

/* global CanvasEngine, Sidebar, Timeline, UndoManager, AddEntityCommand, DeleteEntityCommand, MoveEntityCommand, ModifyEntityCommand, LayersPanel, SymbolLibrary, ThemeManager, MAP_THEMES, Minimap */

const App = {
  currentWorld: null,
  entities: [],
  events: [],
  canvasEngine: null,
  sidebar: null,
  timeline: null,
  undoManager: null,
  layersPanel: null,
  symbolLibrary: null,
  themeManager: null,
  minimap: null,

  // ─── Initialization ─────────────────────────────────────────

  init() {
    this.sidebar = new Sidebar();
    this.timeline = new Timeline();
    this.undoManager = new UndoManager();

    // Undo/Redo buttons
    this._btnUndo = document.getElementById('btn-undo');
    this._btnRedo = document.getElementById('btn-redo');
    this._btnUndo.addEventListener('click', () => this.undoManager.undo());
    this._btnRedo.addEventListener('click', () => this.undoManager.redo());
    this.undoManager.onChange = () => this._updateUndoButtons();

    // Ctrl+Z / Ctrl+Shift+Z
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undoManager.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.undoManager.redo();
      }
    });

    // Home screen
    document.getElementById('btn-new-world').addEventListener('click', () => this._showNewWorldModal());
    document.getElementById('modal-cancel').addEventListener('click', () => this._hideNewWorldModal());
    document.getElementById('modal-create').addEventListener('click', () => this._createWorld());
    document.getElementById('import-file').addEventListener('change', (e) => this._importWorld(e));

    // Editor
    document.getElementById('btn-back').addEventListener('click', () => this._goHome());
    document.getElementById('btn-share').addEventListener('click', () => this._showShareModal());
    document.getElementById('btn-export-svg').addEventListener('click', () => this._exportSVG());
    document.getElementById('btn-export-json').addEventListener('click', () => this._exportJSON());
    // Mode toggle (simple/advanced)
    this._modeToggle = new ModeToggle();

    // Golden Hour toggle
    document.getElementById('btn-golden-hour').addEventListener('click', () => {
      if (this.canvasEngine && this.canvasEngine.atmosphere) {
        const atm = this.canvasEngine.atmosphere;
        atm.goldenHour = !atm.goldenHour;
        document.getElementById('btn-golden-hour').classList.toggle('active', atm.goldenHour);
        this.canvasEngine.render();
      }
    });

    // Help button (relaunch onboarding)
    document.getElementById('btn-help').addEventListener('click', () => {
      if (this.currentWorld) {
        if (!this._onboarding) this._onboarding = new Onboarding();
        this._onboarding.start(this.currentWorld.id);
      }
    });

    // Theme switcher
    this.themeManager = new ThemeManager();
    document.getElementById('btn-toggle-theme').addEventListener('click', () => this._toggleThemeDropdown());
    this._buildThemeDropdown();

    // Toolbar
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.canvasEngine) this.canvasEngine.setTool(btn.dataset.tool);
      });
    });
    document.getElementById('tool-color').addEventListener('input', (e) => {
      if (this.canvasEngine) this.canvasEngine.toolColor = e.target.value;
    });

    // Layers panel
    this.layersPanel = new LayersPanel();
    this.layersPanel.onChange = () => {
      if (this.canvasEngine) this.canvasEngine.render();
    };

    // Sidebar callbacks
    this.sidebar.onEntityUpdated = (entity) => this._updateEntity(entity);
    this.sidebar.onEntityDeleted = (entity) => this._deleteEntity(entity);
    this.sidebar.onNavigateTo = (entityId) => this._navigateToEntity(entityId);

    // Timeline callbacks
    this.timeline.onEventClick = (event) => this._onEventClick(event);
    this.timeline.onAddEvent = () => this._showAddEventModal();

    // Render hero background
    this._renderHeroMap();

    // Render templates
    this._renderTemplates();

    // Load worlds
    this._loadWorlds();

    // Theme from localStorage
    const savedTheme = localStorage.getItem('cartographer-theme');
    if (savedTheme && MAP_THEMES[savedTheme]) {
      this.themeManager.applyTheme(savedTheme);
    } else if (savedTheme === 'night') {
      this.themeManager.applyTheme('nightgold');
    }

    // Landing page scroll animations
    this._initLandingAnimations();
  },

  // ─── Hero procedural map ───────────────────────────────────

  _renderHeroMap() {
    const svg = document.getElementById('hero-map-bg');
    if (!svg) return;
    const seed = 4892;
    const rand = (i) => ((Math.sin(seed * 127.1 + i * 311.7) * 43758.5453) % 1 + 1) % 1;

    const W = 1400, H = 700;
    let out = '';

    // Graticule
    for (let x = 0; x <= W; x += 100)
      out += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#C4A882" stroke-width="0.3" stroke-opacity="0.08"/>\n`;
    for (let y = 0; y <= H; y += 80)
      out += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#C4A882" stroke-width="0.3" stroke-opacity="0.08"/>\n`;

    // Landmass blobs helper
    const landmasses = [];
    function makeBlob(k, cx, cy, baseR, nPts) {
      const pts = [];
      const n = nPts || (7 + Math.floor(rand(k * 10 + 2) * 5));
      const r = baseR || (50 + rand(k * 10 + 3) * 140);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r * (0.65 + rand(k * 100 + i) * 0.7);
        pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
      }
      landmasses.push({ cx, cy, r, pts });
      let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        d += ` Q${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
      }
      d += ' Z';
      return d;
    }

    // 10 organic landmasses
    const blobs = [
      [0, 250, 250, 140], [1, 550, 180, 110], [2, 800, 350, 160],
      [3, 1050, 200, 100], [4, 350, 480, 90],  [5, 700, 520, 80],
      [6, 1200, 450, 120], [7, 150, 500, 70],  [8, 950, 550, 65],
      [9, 480, 350, 55],
    ];
    for (const [k, cx, cy, r] of blobs) {
      const d = makeBlob(k, cx, cy, r);
      out += `<path d="${d}" fill="#C4A882" fill-opacity="0.12" stroke="#C4A882" stroke-width="1.2" stroke-opacity="0.2"/>\n`;
      // Inner contour line
      const dInner = makeBlob(k + 50, cx, cy, r * 0.55);
      out += `<path d="${dInner}" fill="none" stroke="#C4A882" stroke-width="0.5" stroke-opacity="0.12" stroke-dasharray="4,3"/>\n`;
    }

    // Rivers
    const rivers = [
      { x1: 280, y1: 170, cx: 320, cy: 280, x2: 380, y2: 480 },
      { x1: 780, y1: 260, cx: 820, cy: 380, x2: 720, y2: 520 },
      { x1: 1020, y1: 140, cx: 1080, cy: 250, x2: 1050, y2: 380 },
      { x1: 530, y1: 160, cx: 560, cy: 240, x2: 490, y2: 350 },
    ];
    for (const rv of rivers)
      out += `<path d="M${rv.x1},${rv.y1} Q${rv.cx},${rv.cy} ${rv.x2},${rv.y2}" fill="none" stroke="#5A7A9A" stroke-width="1" stroke-opacity="0.2" stroke-linecap="round"/>\n`;

    // City dots
    const cities = [
      [220, 220, 4], [290, 300, 3], [560, 180, 4], [520, 200, 2.5],
      [810, 320, 5], [850, 370, 2.5], [770, 400, 3], [1060, 190, 3.5],
      [1040, 240, 2], [370, 450, 3], [700, 500, 2.5], [1180, 420, 3],
      [160, 480, 2], [950, 530, 2], [480, 340, 2.5],
    ];
    for (const [cx, cy, r] of cities)
      out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#C4A882" fill-opacity="0.25"/>\n`;

    // Small cross markers on some cities (map symbols)
    const markers = [[220, 220], [560, 180], [810, 320], [1060, 190]];
    for (const [mx, my] of markers)
      out += `<path d="M${mx-4},${my} L${mx+4},${my} M${mx},${my-4} L${mx},${my+4}" stroke="#C4A882" stroke-width="0.6" stroke-opacity="0.3"/>\n`;

    svg.innerHTML = out;

    // Parallax on scroll
    const homeScreen = document.getElementById('home-screen');
    const heroMap = document.getElementById('lp-hero-map');
    if (homeScreen && heroMap) {
      homeScreen.addEventListener('scroll', () => {
        const scrollY = homeScreen.scrollTop;
        heroMap.style.transform = `translateY(${scrollY * 0.3}px)`;
      }, { passive: true });
    }
  },

  // ─── Landing page scroll animations ───────────────────────────

  _initLandingAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const siblings = el.parentNode.querySelectorAll('.lp-stats-item');
          const idx = Array.from(siblings).indexOf(el);
          el.style.transitionDelay = (idx * 0.12) + 's';
          el.classList.add('lp-visible');
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('.lp-stats-item').forEach(el => observer.observe(el));

    // Feature rows scroll reveal
    const featureObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          featureObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.lp-feature').forEach((el, i) => {
      el.style.transitionDelay = (i % 2 === 0 ? '0s' : '0.1s');
      featureObserver.observe(el);
    });
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
    const grid = document.getElementById('worlds-grid');
    this._showSkeletons(grid);
    const worlds = await this._api('GET', '/api/worlds');
    grid.innerHTML = '';

    // "New world" dashed card
    const newCard = document.createElement('div');
    newCard.className = 'world-card world-card-new';
    newCard.innerHTML = `<div class="world-card-new-inner">
      <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <path d="M12 2a10 10 0 000 20" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <ellipse cx="12" cy="12" rx="4" ry="10" fill="none" stroke="currentColor" stroke-width="0.8"/>
        <line x1="2" y1="9" x2="22" y2="9" stroke="currentColor" stroke-width="0.6"/>
        <line x1="2" y1="15" x2="22" y2="15" stroke="currentColor" stroke-width="0.6"/>
      </svg>
      <span>Nouveau monde</span>
    </div>`;
    newCard.addEventListener('click', () => this._showNewWorldModal());
    grid.appendChild(newCard);

    for (const w of worlds) {
      const card = document.createElement('div');
      card.className = 'world-card';
      const entities = await this._api('GET', `/api/worlds/${w.id}/entities`);
      const events = await this._api('GET', `/api/worlds/${w.id}/events`);
      const date = w.updated_at ? new Date(w.updated_at).toLocaleDateString('fr-FR') : '';

      card.innerHTML = `
        <div class="world-card-thumb">
          <canvas class="world-card-preview" width="640" height="360"></canvas>
          <div class="world-card-overlay">
            <button class="btn btn-sm card-open" aria-label="Ouvrir ${this._escapeHtml(w.name)}">Ouvrir</button>
            <button class="btn btn-sm card-export" aria-label="Exporter ${this._escapeHtml(w.name)}">Exporter</button>
            <button class="btn-icon delete-world" data-id="${w.id}" title="Supprimer" aria-label="Supprimer ${this._escapeHtml(w.name)}">
              <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 6h18M8 6V4h8v2m1 0v14H7V6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
        <div class="world-card-body">
          <h3>${this._escapeHtml(w.name)}</h3>
          <p>${this._escapeHtml(w.description || 'Aucune description')}</p>
          <div class="world-card-meta">
            <span><svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><polygon points="8,1 10,6 15,6 11,9 12.5,14 8,11 3.5,14 5,9 1,6 6,6"/></svg> ${entities.length} entité${entities.length !== 1 ? 's' : ''}</span>
            <span><svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6"/><path d="M8 4.5v4l2.5 2" stroke-linecap="round"/></svg> ${events.length} événement${events.length !== 1 ? 's' : ''}</span>
            ${date ? `<span>modifié le ${date}</span>` : ''}
          </div>
        </div>
      `;

      // Draw preview
      const canvas = card.querySelector('.world-card-preview');
      this._drawWorldPreview(canvas, entities);

      card.addEventListener('click', (e) => {
        if (e.target.closest('.delete-world') || e.target.closest('.card-export') || e.target.closest('.card-open')) return;
        this._openWorld(w.id);
      });
      card.querySelector('.card-open').addEventListener('click', (e) => {
        e.stopPropagation();
        this._openWorld(w.id);
      });
      card.querySelector('.card-export').addEventListener('click', async (e) => {
        e.stopPropagation();
        const data = await this._api('GET', `/api/worlds/${w.id}/export`);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${w.name}.json`; a.click();
        URL.revokeObjectURL(url);
      });
      card.querySelector('.delete-world').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Supprimer "${w.name}" ? Action irréversible.`)) {
          await this._api('DELETE', `/api/worlds/${w.id}`);
          this._loadWorlds();
        }
      });
      grid.appendChild(card);
    }
    this._observeCards();
  },

  _drawWorldPreview(canvas, entities) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#1A1208';
    ctx.fillRect(0, 0, w, h);

    if (entities.length === 0) {
      ctx.fillStyle = '#5A4A3A';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Monde vide', w / 2, h / 2);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of entities) {
      const d = e.data;
      if (d.x !== undefined) { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); minY = Math.min(minY, d.y); maxY = Math.max(maxY, d.y); }
      if (d.points) for (const p of d.points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
      if (d.x1 !== undefined) { minX = Math.min(minX, d.x1, d.x2); maxX = Math.max(maxX, d.x1, d.x2); minY = Math.min(minY, d.y1, d.y2); maxY = Math.max(maxY, d.y1, d.y2); }
    }
    const pad = 40;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const bw = maxX - minX, bh = maxY - minY;
    if (bw === 0 || bh === 0) return;
    const scale = Math.min(w / bw, h / bh);
    const ox = (w - bw * scale) / 2, oy = (h - bh * scale) / 2;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.translate(-minX, -minY);

    const ink = '#C4A882';
    const accent = '#8B2635';
    for (const e of entities) {
      const d = e.data;
      if ((e.type === 'territory' || e.type === 'region') && d.points && d.points.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(d.points[0].x, d.points[0].y);
        for (let i = 1; i < d.points.length; i++) ctx.lineTo(d.points[i].x, d.points[i].y);
        ctx.closePath();
        ctx.fillStyle = (d.color || accent) + '25'; ctx.fill();
        ctx.strokeStyle = d.color || accent; ctx.lineWidth = 2 / scale; ctx.stroke();
      } else if (e.type === 'city') {
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(d.x, d.y, (d.importance === 'capital' ? 4 : 2.5) / scale, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'route' && d.x1 !== undefined) {
        ctx.strokeStyle = ink + '80'; ctx.lineWidth = 1.5 / scale;
        ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
      }
    }
    ctx.restore();
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
    this._showToast('Monde importé avec succès', 'success');
  },

  // ─── Templates ─────────────────────────────────────────────

  _renderTemplates() {
    const grid = document.getElementById('templates-grid');
    if (!grid || !window.WORLD_TEMPLATES) return;
    grid.innerHTML = '';

    // Tag map per template id
    const tagMap = {
      'fantasy-continent': ['Fantasy', 'Royaumes', 'Villes'],
      'mysterious-archipelago': ['Îles', 'Maritime', 'Mystère'],
      'desert-empire': ['Désert', 'Empire', 'Antique'],
      'medieval-region': ['Médiéval', 'Régional', 'Comté'],
      'post-apocalyptic': ['Sci-Fi', 'Ruines', 'Survie'],
    };

    for (const tpl of WORLD_TEMPLATES) {
      const card = document.createElement('div');
      card.className = 'lp-tpl-card';
      const tags = (tagMap[tpl.id] || []).map(t => `<span class="lp-tpl-tag">${t}</span>`).join('');
      card.innerHTML = `
        <canvas class="lp-tpl-preview" width="280" height="160"></canvas>
        <div class="lp-tpl-info">
          <h4 class="lp-tpl-name">${this._escapeHtml(tpl.name)}</h4>
          <p class="lp-tpl-desc">${this._escapeHtml(tpl.description)}</p>
          <div class="lp-tpl-tags">${tags}</div>
          <button class="lp-tpl-use">Utiliser ce template</button>
        </div>
      `;
      card.addEventListener('click', () => this._loadTemplate(tpl));
      grid.appendChild(card);

      const canvas = card.querySelector('.lp-tpl-preview');
      this._drawTemplatePreview(canvas, tpl);
    }

    // Carousel arrow handlers
    const prev = document.querySelector('.lp-carousel-prev');
    const next = document.querySelector('.lp-carousel-next');
    if (prev && next && grid) {
      prev.addEventListener('click', () => {
        grid.scrollBy({ left: -300, behavior: 'smooth' });
      });
      next.addEventListener('click', () => {
        grid.scrollBy({ left: 300, behavior: 'smooth' });
      });
    }

    this._observeCards();
  },

  _drawTemplatePreview(canvas, tpl) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#1A1208';
    ctx.fillRect(0, 0, w, h);

    // Compute bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of tpl.entities) {
      const d = e.data;
      if (d.x !== undefined) { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); minY = Math.min(minY, d.y); maxY = Math.max(maxY, d.y); }
      if (d.points) for (const p of d.points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
      if (d.x1 !== undefined) { minX = Math.min(minX, d.x1, d.x2); maxX = Math.max(maxX, d.x1, d.x2); minY = Math.min(minY, d.y1, d.y2); maxY = Math.max(maxY, d.y1, d.y2); }
    }
    const pad = 30;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const bw = maxX - minX, bh = maxY - minY;
    const scale = Math.min(w / bw, h / bh);
    const ox = (w - bw * scale) / 2, oy = (h - bh * scale) / 2;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.translate(-minX, -minY);

    for (const e of tpl.entities) {
      const d = e.data;
      if ((e.type === 'territory' || e.type === 'region') && d.points && d.points.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(d.points[0].x, d.points[0].y);
        for (let i = 1; i < d.points.length; i++) ctx.lineTo(d.points[i].x, d.points[i].y);
        ctx.closePath();
        ctx.fillStyle = (d.color || '#8B2635') + '30';
        ctx.fill();
        ctx.strokeStyle = d.color || '#8B2635';
        ctx.lineWidth = 1.5 / scale;
        ctx.stroke();
      } else if (e.type === 'city') {
        ctx.fillStyle = d.color || '#2C1810';
        const r = d.importance === 'capital' ? 4 / scale : 2.5 / scale;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'route' && d.x1 !== undefined) {
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1 / scale;
        ctx.beginPath();
        ctx.moveTo(d.x1, d.y1);
        ctx.lineTo(d.x2, d.y2);
        ctx.stroke();
      }
    }

    ctx.restore();
  },

  async _loadTemplate(tpl) {
    // Create world from template data (as a copy)
    const importData = {
      world: { ...tpl.world },
      entities: tpl.entities.map(e => ({ ...e, data: { ...e.data } })),
      events: (tpl.events || []).map(ev => ({ ...ev })),
    };
    const world = await this._api('POST', '/api/worlds/import', importData);
    this._openWorld(world.id);
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
      this.canvasEngine.onEntityMoved = (entity, oldData) => this._moveEntityWithUndo(entity, oldData);
      this.canvasEngine.layersPanel = this.layersPanel;
      // Symbol library
      this.symbolLibrary = new SymbolLibrary();
      this.canvasEngine.symbolLibrary = this.symbolLibrary;

      // Snap & guides
      const snapGuides = new SnapGuides(this.canvasEngine);
      this.canvasEngine.snapGuides = snapGuides;
      document.getElementById('btn-snap').addEventListener('click', () => {
        const on = snapGuides.toggleSnap();
        document.getElementById('btn-snap').classList.toggle('active', on);
        document.getElementById('btn-snap').title = `Snap to elements (${on ? 'on' : 'off'})`;
      });
      document.getElementById('btn-grid-snap').addEventListener('click', () => {
        const on = snapGuides.toggleGridSnap();
        document.getElementById('btn-grid-snap').classList.toggle('active', on);
        document.getElementById('btn-grid-snap').title = `Snap to grid (${on ? 'on' : 'off'})`;
      });

      // Minimap
      this.minimap = new Minimap(this.canvasEngine);
      // Hook minimap render to canvas render
      const origRender = this.canvasEngine.render.bind(this.canvasEngine);
      this.canvasEngine.render = () => {
        origRender();
        if (this.minimap) this.minimap.render();
      };
    }

    // Set world seed for coastline deformation
    // Use world ID as a simple deterministic seed
    const worldSeed = typeof this.currentWorld.id === 'number'
      ? this.currentWorld.id
      : Array.from(String(this.currentWorld.id)).reduce((s, c) => s * 31 + c.charCodeAt(0), 0);
    this.canvasEngine.setWorldSeed(worldSeed);

    // Load entities and events
    await this._loadEntities();
    await this._loadEvents();

    // Clear undo stack for new world
    this.undoManager.clear();

    // Onboarding check
    if (!this._onboarding) this._onboarding = new Onboarding();
    if (this._onboarding.shouldShow(this.currentWorld.id)) {
      setTimeout(() => this._onboarding.start(this.currentWorld.id), 500);
    }

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
    const cmd = new AddEntityCommand(this, entityData);
    await cmd.execute();
    this.undoManager.push(cmd);
  },

  async _updateEntity(entity) {
    await this._api('PUT', `/api/entities/${entity.id}`, {
      name: entity.name,
      data: entity.data,
    });
    this.canvasEngine.render();
  },

  /** Called by sidebar when a field changes — records undo snapshot */
  _updateEntityWithUndo(entity, oldName, oldData) {
    const cmd = new ModifyEntityCommand(this, entity.id, oldName, oldData, entity.name, entity.data);
    this.undoManager.push(cmd);
    this._updateEntity(entity);
  },

  async _deleteEntity(entity) {
    const cmd = new DeleteEntityCommand(this, entity);
    await cmd.execute();
    this.undoManager.push(cmd);
  },

  /** Called by canvas after drag — records undo move */
  _moveEntityWithUndo(entity, oldData) {
    const cmd = new MoveEntityCommand(this, entity, oldData, entity.data);
    this.undoManager.push(cmd);
    this._updateEntity(entity);
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
    if (!this._svgExport) this._svgExport = new SvgExportPanel();
    this._svgExport.showExportModal(this.currentWorld, this.entities, (opts) => {
      const svg = this._svgExport.generateSVG(this.currentWorld, this.entities, opts);
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${this.currentWorld.name}.svg`; a.click();
      URL.revokeObjectURL(url);
      this._showToast('Export SVG téléchargé', 'success');
    });
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
    this._showToast('Export JSON téléchargé', 'success');
  },

  // ─── Share ──────────────────────────────────────────────────

  async _showShareModal() {
    if (!this.currentWorld) return;
    const existing = document.getElementById('share-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'share-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:480px;">
        <h2>Partager ce monde</h2>
        <div class="share-options">
          <label class="export-field">
            <span>Expiration</span>
            <select id="share-expires">
              <option value="">Jamais</option>
              <option value="24h">24 heures</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
            </select>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="share-cancel">Annuler</button>
          <button class="btn btn-primary" id="share-generate">Générer le lien</button>
        </div>
        <div id="share-result" hidden>
          <label class="export-field" style="margin-top:12px;">
            <span>Lien de partage (lecture seule)</span>
            <div style="display:flex;gap:6px;">
              <input type="text" id="share-url" readonly style="flex:1;font-size:0.85rem;">
              <button class="btn btn-sm" id="share-copy">Copier</button>
            </div>
          </label>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('share-cancel').addEventListener('click', () => modal.remove());
    document.getElementById('share-generate').addEventListener('click', async () => {
      const expires = document.getElementById('share-expires').value;
      const share = await this._api('POST', `/api/worlds/${this.currentWorld.id}/share`, { expires });
      if (share && share.token) {
        const url = `${location.origin}/share/${share.token}`;
        document.getElementById('share-url').value = url;
        document.getElementById('share-result').hidden = false;
      }
    });
    document.getElementById('share-copy').addEventListener('click', () => {
      const input = document.getElementById('share-url');
      navigator.clipboard.writeText(input.value).then(() => {
        document.getElementById('share-copy').textContent = 'Copié !';
        setTimeout(() => document.getElementById('share-copy').textContent = 'Copier', 2000);
      });
    });
  },

  // ─── Theme ──────────────────────────────────────────────────

  _buildThemeDropdown() {
    const dropdown = document.getElementById('theme-dropdown');
    dropdown.innerHTML = '';
    for (const theme of this.themeManager.getAllThemes()) {
      const item = document.createElement('button');
      item.className = 'theme-option';
      item.dataset.themeId = theme.id;
      // Color preview swatch
      item.innerHTML = `
        <span class="theme-swatch" style="background:${theme.vars['--bg']};border-color:${theme.vars['--accent']}">
          <span style="background:${theme.vars['--accent']}"></span>
        </span>
        <span>${theme.name}</span>
      `;
      item.addEventListener('click', () => {
        this._applyTheme(theme.id);
        dropdown.hidden = true;
      });
      dropdown.appendChild(item);
    }
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.theme-switcher')) {
        dropdown.hidden = true;
      }
    });
  },

  _toggleThemeDropdown() {
    const dropdown = document.getElementById('theme-dropdown');
    dropdown.hidden = !dropdown.hidden;
  },

  _applyTheme(themeId) {
    this.themeManager.applyTheme(themeId);
    localStorage.setItem('cartographer-theme', themeId);
    if (this.canvasEngine) {
      this.canvasEngine._textureCache = {};
      this.canvasEngine._symbolCache = {};
      this.canvasEngine.render();
    }
    this.timeline.render();
  },

  // ─── Undo/Redo UI ──────────────────────────────────────────

  _updateUndoButtons() {
    this._btnUndo.disabled = !this.undoManager.canUndo();
    this._btnRedo.disabled = !this.undoManager.canRedo();
    this._btnUndo.title = this.undoManager.canUndo()
      ? `Undo (Ctrl+Z) — ${this.undoManager.undoCount()} action${this.undoManager.undoCount() > 1 ? 's' : ''}`
      : 'Nothing to undo';
    this._btnRedo.title = this.undoManager.canRedo()
      ? `Redo (Ctrl+Shift+Z) — ${this.undoManager.redoCount()} action${this.undoManager.redoCount() > 1 ? 's' : ''}`
      : 'Nothing to redo';
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

  // ─── Toast notifications ──────────────────────────────────────
  _showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    const bar = document.createElement('div');
    bar.className = 'toast-progress';
    bar.style.animationDuration = duration + 'ms';
    toast.appendChild(bar);
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('dismissing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ─── Stagger cards on scroll ──────────────────────────────────
  _observeCards() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const idx = Array.from(el.parentNode.children).indexOf(el);
          el.style.animationDelay = (idx * 0.07) + 's';
          el.classList.add('visible');
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.world-card, .world-card-new, .template-card, .lp-tpl-card').forEach(c => observer.observe(c));
  },

  // ─── Skeleton screens ─────────────────────────────────────────
  _showSkeletons(grid, count = 3) {
    grid.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const sk = document.createElement('div');
      sk.className = 'world-card skeleton-card';
      sk.innerHTML = '<div class="skeleton-preview"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div>';
      grid.appendChild(sk);
    }
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
