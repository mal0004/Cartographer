/**
 * Cartographer — Infinite Canvas Engine
 *
 * Handles pan/zoom, grid drawing, entity rendering, drawing tools,
 * selection, and drag. Exposes a CanvasEngine class.
 */

/* global app */

// ─── SVG texture patterns for regions (drawn onto offscreen canvases) ────

const REGION_TEXTURES = {
  forest: (ctx) => {
    ctx.strokeStyle = '#2d5016'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, 18); ctx.lineTo(10, 10); ctx.stroke();
    ctx.fillStyle = '#3a7a1a';
    ctx.beginPath(); ctx.arc(10, 7, 4, 0, Math.PI * 2); ctx.fill();
  },
  mountain: (ctx) => {
    ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(12, 4); ctx.lineTo(24, 20); ctx.stroke();
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(6, 20); ctx.lineTo(14, 8); ctx.lineTo(22, 20); ctx.stroke();
  },
  desert: (ctx) => {
    ctx.fillStyle = '#c4a35a';
    ctx.beginPath(); ctx.arc(3, 3, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, 9, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d4b36a';
    ctx.beginPath(); ctx.arc(9, 3, 0.8, 0, Math.PI * 2); ctx.fill();
  },
  ocean: (ctx) => {
    ctx.strokeStyle = '#2266aa'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.quadraticCurveTo(7.5, 0, 15, 5);
    ctx.quadraticCurveTo(22.5, 10, 30, 5);
    ctx.stroke();
  },
};

function createTexturePattern(canvasCtx, terrain) {
  const sizes = { forest: [20, 20], mountain: [24, 20], desert: [12, 12], ocean: [30, 10] };
  const [w, h] = sizes[terrain] || [20, 20];
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const octx = off.getContext('2d');
  if (REGION_TEXTURES[terrain]) REGION_TEXTURES[terrain](octx);
  return canvasCtx.createPattern(off, 'repeat');
}

// ─── City icons ──────────────────────────────────────────────────

function drawCityIcon(ctx, x, y, importance, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (importance === 'capital') {
    const r = 8;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
      const outerX = x + r * Math.cos(angle);
      const outerY = y + r * Math.sin(angle);
      const innerAngle = angle + Math.PI / 5;
      const innerX = x + (r * 0.4) * Math.cos(innerAngle);
      const innerY = y + (r * 0.4) * Math.sin(innerAngle);
      if (i === 0) ctx.moveTo(outerX, outerY);
      else ctx.lineTo(outerX, outerY);
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
  } else if (importance === 'city') {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ─── CanvasEngine ────────────────────────────────────────────────

class CanvasEngine {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');

    // View state
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
    this.MIN_ZOOM = 0.2;
    this.MAX_ZOOM = 5;

    // Entities (loaded from API)
    this.entities = [];

    // Current tool & state
    this.tool = 'select';
    this.toolColor = '#8B2635';
    this.toolOptions = {};

    // Selection
    this.selectedEntity = null;

    // Drawing state
    this.drawingPoints = [];
    this.routeStart = null;

    // Drag state
    this.isPanning = false;
    this.isDragging = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragEntityOrigData = null;

    // Resize observer
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this.canvas.parentElement);
    this._resize();

    // Event listeners
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => this._onContextMenu(e));
    document.addEventListener('keydown', (e) => this._onKeyDown(e));

    // Callbacks
    this.onEntitySelected = null;
    this.onEntityCreated = null;
    this.onEntityUpdated = null;
    this.onEntityDeleted = null;

    this._textureCache = {};
  }

  // ─── Coordinate transforms ──────────────────────────────────

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.zoom,
      y: (sy - this.offsetY) / this.zoom,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.zoom + this.offsetX,
      y: wy * this.zoom + this.offsetY,
    };
  }

  // ─── Resize ─────────────────────────────────────────────────

  _resize() {
    const parent = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = parent.clientWidth * dpr;
    this.canvas.height = parent.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = parent.clientWidth;
    this.height = parent.clientHeight;
    this.render();
  }

  // ─── Rendering ──────────────────────────────────────────────

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    const style = getComputedStyle(document.documentElement);
    ctx.fillStyle = style.getPropertyValue('--bg').trim() || '#F5F0E8';
    ctx.fillRect(0, 0, w, h);

    // Grid
    this._drawGrid(ctx, w, h);

    // Transform for world coords
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.zoom, this.zoom);

    // Render entities in order: regions → territories → routes → cities → text
    const order = ['region', 'territory', 'route', 'city', 'text'];
    const sorted = [...this.entities].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

    for (const entity of sorted) {
      this._renderEntity(ctx, entity);
    }

    // Drawing preview
    this._drawPreview(ctx);

    ctx.restore();
  }

  _drawGrid(ctx, w, h) {
    // Adaptive grid spacing
    let baseSpacing = 50;
    let spacing = baseSpacing * this.zoom;
    while (spacing < 25) { spacing *= 2; baseSpacing *= 2; }
    while (spacing > 100) { spacing /= 2; baseSpacing /= 2; }

    const ox = this.offsetX % spacing;
    const oy = this.offsetY % spacing;

    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#C8BBAA';
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = ox; x < w; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = oy; y < h; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  _renderEntity(ctx, entity) {
    const d = entity.data;
    const selected = this.selectedEntity && this.selectedEntity.id === entity.id;

    switch (entity.type) {
      case 'territory': {
        if (!d.points || d.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(d.points[0].x, d.points[0].y);
        for (let i = 1; i < d.points.length; i++) ctx.lineTo(d.points[i].x, d.points[i].y);
        ctx.closePath();
        ctx.fillStyle = (d.color || '#8B2635') + '40';
        ctx.fill();
        ctx.strokeStyle = d.color || '#8B2635';
        ctx.lineWidth = selected ? 4 : 2.5;
        ctx.stroke();
        if (selected) {
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // Label
        if (entity.name && d.points.length >= 3) {
          const cx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
          const cy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;
          ctx.font = '600 14px Cinzel, serif';
          ctx.fillStyle = d.color || '#8B2635';
          ctx.textAlign = 'center';
          ctx.fillText(entity.name, cx, cy);
          ctx.textAlign = 'start';
        }
        break;
      }
      case 'city': {
        const color = d.color || '#2C1810';
        drawCityIcon(ctx, d.x, d.y, d.importance || 'village', color);
        if (selected) {
          ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 14, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Label
        if (entity.name) {
          const lx = d.labelOffsetX ?? 12;
          const ly = d.labelOffsetY ?? -8;
          const size = d.importance === 'capital' ? 14 : d.importance === 'city' ? 12 : 10;
          ctx.font = `600 ${size}px Cinzel, serif`;
          ctx.fillStyle = color;
          ctx.fillText(entity.name, d.x + lx, d.y + ly);
        }
        break;
      }
      case 'route': {
        if (d.x1 === undefined) break;
        const stroke = d.style === 'royal' ? '#8B2635' : d.style === 'road' ? '#2C1810' : '#888';
        const sw = d.style === 'royal' ? 3 : d.style === 'road' ? 2 : 1;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = selected ? sw + 2 : sw;
        if (d.style === 'trail') ctx.setLineDash([6, 4]);
        ctx.beginPath();
        if (d.cx1 !== undefined) {
          ctx.moveTo(d.x1, d.y1);
          ctx.bezierCurveTo(d.cx1, d.cy1, d.cx2, d.cy2, d.x2, d.y2);
        } else {
          ctx.moveTo(d.x1, d.y1);
          ctx.lineTo(d.x2, d.y2);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        if (selected) {
          // Draw endpoints
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 2;
          for (const [px, py] of [[d.x1, d.y1], [d.x2, d.y2]]) {
            ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
        }
        break;
      }
      case 'region': {
        if (!d.points || d.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(d.points[0].x, d.points[0].y);
        for (let i = 1; i < d.points.length; i++) ctx.lineTo(d.points[i].x, d.points[i].y);
        ctx.closePath();
        // Texture fill
        const terrain = d.terrain || 'forest';
        if (!this._textureCache[terrain]) {
          this._textureCache[terrain] = createTexturePattern(ctx, terrain);
        }
        ctx.fillStyle = this._textureCache[terrain];
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
        // Border
        ctx.strokeStyle = selected ? '#fff' : '#666';
        ctx.lineWidth = selected ? 2 : 1;
        ctx.stroke();
        break;
      }
      case 'text': {
        const size = d.fontSize || 16;
        const italic = d.fontStyle === 'italic' ? 'italic ' : '';
        ctx.font = `${italic}${size}px Cinzel, serif`;
        ctx.fillStyle = d.color || '#2C1810';
        ctx.fillText(entity.name || d.text || '', d.x, d.y);
        if (selected) {
          const metrics = ctx.measureText(entity.name || d.text || '');
          ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(d.x - 2, d.y - size, metrics.width + 4, size + 4);
          ctx.setLineDash([]);
        }
        break;
      }
    }
  }

  _drawPreview(ctx) {
    if (this.tool === 'territory' || this.tool === 'region') {
      if (this.drawingPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(this.drawingPoints[0].x, this.drawingPoints[0].y);
        for (let i = 1; i < this.drawingPoints.length; i++) {
          ctx.lineTo(this.drawingPoints[i].x, this.drawingPoints[i].y);
        }
        ctx.strokeStyle = this.toolColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        // Draw points
        for (const p of this.drawingPoints) {
          ctx.fillStyle = this.toolColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    if (this.tool === 'route' && this.routeStart) {
      ctx.fillStyle = this.toolColor;
      ctx.beginPath();
      ctx.arc(this.routeStart.x, this.routeStart.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── Hit testing ────────────────────────────────────────────

  hitTest(wx, wy) {
    // Test in reverse order (top-most first)
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (this._hitEntity(e, wx, wy)) return e;
    }
    return null;
  }

  _hitEntity(e, wx, wy) {
    const d = e.data;
    switch (e.type) {
      case 'city':
        return Math.hypot(wx - d.x, wy - d.y) < 15;
      case 'text': {
        const size = d.fontSize || 16;
        const approxWidth = (e.name || d.text || '').length * size * 0.6;
        return wx >= d.x - 2 && wx <= d.x + approxWidth && wy >= d.y - size && wy <= d.y + 4;
      }
      case 'territory':
      case 'region':
        return d.points && d.points.length >= 3 && this._pointInPolygon(wx, wy, d.points);
      case 'route': {
        if (d.x1 === undefined) return false;
        return this._distToSegment(wx, wy, d.x1, d.y1, d.x2, d.y2) < 10;
      }
    }
    return false;
  }

  _pointInPolygon(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  _distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  // ─── Event handlers ─────────────────────────────────────────

  _onMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle button or Alt+click → pan
      this.isPanning = true;
      this.panStartX = e.clientX - this.offsetX;
      this.panStartY = e.clientY - this.offsetY;
      this.canvas.classList.add('cursor-grabbing');
      return;
    }

    if (e.button !== 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = this.screenToWorld(sx, sy);

    if (this.tool === 'select') {
      const hit = this.hitTest(wx, wy);
      if (hit) {
        this.selectEntity(hit);
        // Start drag
        this.isDragging = true;
        this.dragStartX = wx;
        this.dragStartY = wy;
        this.dragEntityOrigData = JSON.parse(JSON.stringify(hit.data));
      } else {
        this.selectEntity(null);
        // Start panning
        this.isPanning = true;
        this.panStartX = e.clientX - this.offsetX;
        this.panStartY = e.clientY - this.offsetY;
        this.canvas.classList.add('cursor-grabbing');
      }
    } else if (this.tool === 'territory' || this.tool === 'region') {
      this.drawingPoints.push({ x: wx, y: wy });
      this.render();
    } else if (this.tool === 'city') {
      this._createCity(wx, wy);
    } else if (this.tool === 'route') {
      if (!this.routeStart) {
        this.routeStart = { x: wx, y: wy };
        this.render();
      } else {
        this._createRoute(this.routeStart.x, this.routeStart.y, wx, wy);
        this.routeStart = null;
      }
    } else if (this.tool === 'text') {
      this._createText(wx, wy);
    }
  }

  _onMouseMove(e) {
    if (this.isPanning) {
      this.offsetX = e.clientX - this.panStartX;
      this.offsetY = e.clientY - this.panStartY;
      this.render();
      return;
    }
    if (this.isDragging && this.selectedEntity) {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { x: wx, y: wy } = this.screenToWorld(sx, sy);
      const dx = wx - this.dragStartX;
      const dy = wy - this.dragStartY;
      this._moveEntity(this.selectedEntity, this.dragEntityOrigData, dx, dy);
      this.render();
    }
  }

  _onMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.classList.remove('cursor-grabbing');
      return;
    }
    if (this.isDragging && this.selectedEntity) {
      this.isDragging = false;
      // Persist position
      if (this.onEntityUpdated) this.onEntityUpdated(this.selectedEntity);
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const oldZoom = this.zoom;
    const delta = -e.deltaY * 0.001;
    this.zoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.zoom * (1 + delta)));

    // Zoom towards cursor
    this.offsetX = mx - (mx - this.offsetX) * (this.zoom / oldZoom);
    this.offsetY = my - (my - this.offsetY) * (this.zoom / oldZoom);

    this._textureCache = {};
    this.render();
  }

  _onContextMenu(e) {
    e.preventDefault();
    // Close polygon for territory / region
    if ((this.tool === 'territory' || this.tool === 'region') && this.drawingPoints.length >= 3) {
      this._createPolygon(this.tool, this.drawingPoints);
      this.drawingPoints = [];
      this.render();
    }
  }

  _onKeyDown(e) {
    // Delete selected entity
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedEntity) {
      // Don't delete if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (this.onEntityDeleted) this.onEntityDeleted(this.selectedEntity);
      this.selectedEntity = null;
      this.render();
    }

    // Escape: cancel drawing / deselect
    if (e.key === 'Escape') {
      this.drawingPoints = [];
      this.routeStart = null;
      this.selectEntity(null);
      this.render();
    }

    // Tool shortcuts
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const shortcuts = { v: 'select', t: 'territory', c: 'city', r: 'route', n: 'region', x: 'text' };
    if (shortcuts[e.key]) {
      this.setTool(shortcuts[e.key]);
    }
  }

  // ─── Entity creation ───────────────────────────────────────

  _createCity(x, y) {
    const importance = this.toolOptions.importance || 'village';
    const entity = {
      type: 'city',
      name: '',
      data: {
        x, y,
        importance,
        color: this.toolColor,
        labelOffsetX: 12,
        labelOffsetY: -8,
        population: 0,
        founded: '',
        description: '',
      },
    };
    if (this.onEntityCreated) this.onEntityCreated(entity);
  }

  _createRoute(x1, y1, x2, y2) {
    const style = this.toolOptions.routeStyle || 'road';
    // Auto-generate Bézier control points
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const entity = {
      type: 'route',
      name: '',
      data: {
        x1, y1, x2, y2,
        cx1: mx - dy * 0.2,
        cy1: my + dx * 0.2,
        cx2: mx + dy * 0.2,
        cy2: my - dx * 0.2,
        style,
        length: '',
        description: '',
      },
    };
    if (this.onEntityCreated) this.onEntityCreated(entity);
  }

  _createPolygon(type, points) {
    const entityData = {
      type,
      name: '',
      data: {
        points: points.map(p => ({ x: p.x, y: p.y })),
        color: this.toolColor,
      },
    };
    if (type === 'territory') {
      entityData.data.ruler = '';
      entityData.data.capitalName = '';
      entityData.data.resources = [];
      entityData.data.description = '';
    } else {
      entityData.data.terrain = this.toolOptions.terrain || 'forest';
    }
    if (this.onEntityCreated) this.onEntityCreated(entityData);
  }

  _createText(x, y) {
    const text = prompt('Enter label text:');
    if (!text) return;
    const entity = {
      type: 'text',
      name: text,
      data: {
        x, y,
        text,
        fontSize: Number(this.toolOptions.fontSize) || 16,
        fontStyle: this.toolOptions.fontStyle || 'normal',
        color: this.toolColor,
      },
    };
    if (this.onEntityCreated) this.onEntityCreated(entity);
  }

  _moveEntity(entity, origData, dx, dy) {
    const d = entity.data;
    switch (entity.type) {
      case 'city':
      case 'text':
        d.x = origData.x + dx;
        d.y = origData.y + dy;
        break;
      case 'territory':
      case 'region':
        if (origData.points) {
          d.points = origData.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        }
        break;
      case 'route':
        d.x1 = origData.x1 + dx; d.y1 = origData.y1 + dy;
        d.x2 = origData.x2 + dx; d.y2 = origData.y2 + dy;
        if (origData.cx1 !== undefined) {
          d.cx1 = origData.cx1 + dx; d.cy1 = origData.cy1 + dy;
          d.cx2 = origData.cx2 + dx; d.cy2 = origData.cy2 + dy;
        }
        break;
    }
  }

  // ─── Public API ─────────────────────────────────────────────

  setTool(tool) {
    this.tool = tool;
    this.drawingPoints = [];
    this.routeStart = null;
    // Update toolbar UI
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    // Update cursor
    const container = this.canvas.parentElement;
    container.className = 'canvas-container cursor-' + tool;
    // Show/hide tool options
    this._updateToolOptions();
    this.render();
  }

  _updateToolOptions() {
    const optionsEl = document.getElementById('tool-options');
    optionsEl.innerHTML = '';
    optionsEl.hidden = true;

    if (this.tool === 'city') {
      optionsEl.hidden = false;
      optionsEl.innerHTML = `
        <label>Type:
          <select id="opt-importance">
            <option value="village">Village</option>
            <option value="city">City</option>
            <option value="capital">Capital</option>
          </select>
        </label>`;
      optionsEl.querySelector('#opt-importance').value = this.toolOptions.importance || 'village';
      optionsEl.querySelector('#opt-importance').addEventListener('change', (e) => {
        this.toolOptions.importance = e.target.value;
      });
    } else if (this.tool === 'route') {
      optionsEl.hidden = false;
      optionsEl.innerHTML = `
        <label>Style:
          <select id="opt-route-style">
            <option value="trail">Trail</option>
            <option value="road">Road</option>
            <option value="royal">Royal Road</option>
          </select>
        </label>`;
      optionsEl.querySelector('#opt-route-style').value = this.toolOptions.routeStyle || 'road';
      optionsEl.querySelector('#opt-route-style').addEventListener('change', (e) => {
        this.toolOptions.routeStyle = e.target.value;
      });
    } else if (this.tool === 'region') {
      optionsEl.hidden = false;
      optionsEl.innerHTML = `
        <label>Terrain:
          <select id="opt-terrain">
            <option value="forest">Forest</option>
            <option value="mountain">Mountain</option>
            <option value="desert">Desert</option>
            <option value="ocean">Ocean</option>
          </select>
        </label>`;
      optionsEl.querySelector('#opt-terrain').value = this.toolOptions.terrain || 'forest';
      optionsEl.querySelector('#opt-terrain').addEventListener('change', (e) => {
        this.toolOptions.terrain = e.target.value;
      });
    } else if (this.tool === 'text') {
      optionsEl.hidden = false;
      optionsEl.innerHTML = `
        <label>Size:
          <input type="number" id="opt-font-size" value="${this.toolOptions.fontSize || 16}" min="8" max="72" style="width:60px">
        </label>
        <label>Style:
          <select id="opt-font-style">
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
        </label>`;
      optionsEl.querySelector('#opt-font-size').addEventListener('change', (e) => {
        this.toolOptions.fontSize = e.target.value;
      });
      optionsEl.querySelector('#opt-font-style').value = this.toolOptions.fontStyle || 'normal';
      optionsEl.querySelector('#opt-font-style').addEventListener('change', (e) => {
        this.toolOptions.fontStyle = e.target.value;
      });
    }
  }

  selectEntity(entity) {
    this.selectedEntity = entity;
    if (this.onEntitySelected) this.onEntitySelected(entity);
    this.render();
  }

  setEntities(entities) {
    this.entities = entities;
    this._textureCache = {};
    this.render();
  }

  centerOn(x, y, targetZoom) {
    if (targetZoom) this.zoom = targetZoom;
    this.offsetX = this.width / 2 - x * this.zoom;
    this.offsetY = this.height / 2 - y * this.zoom;
    this._textureCache = {};
    this.render();
  }
}

// Export globally
window.CanvasEngine = CanvasEngine;
