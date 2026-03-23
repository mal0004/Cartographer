/**
 * Cartographer — Minimap
 *
 * Small fixed canvas in bottom-right showing all entities
 * at reduced scale, with viewport rectangle and click-to-navigate.
 */

class Minimap {
  constructor(canvasEngine) {
    this.engine = canvasEngine;
    this.visible = true;
    this.width = 200;
    this.height = 150;

    this._build();
    this._isDragging = false;
  }

  _build() {
    this.el = document.createElement('div');
    this.el.className = 'minimap';
    this.el.innerHTML = `
      <canvas id="minimap-canvas" width="400" height="300"></canvas>
      <button class="minimap-toggle" title="Masquer la minimap">&times;</button>
    `;

    const container = document.getElementById('canvas-container');
    container.appendChild(this.el);

    this.canvas = this.el.querySelector('#minimap-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';

    this.el.querySelector('.minimap-toggle').addEventListener('click', () => this.toggle());

    // Navigation by click/drag
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this._isDragging = false);
    this.canvas.addEventListener('mouseleave', () => this._isDragging = false);
  }

  toggle() {
    this.visible = !this.visible;
    this.el.classList.toggle('hidden', !this.visible);
  }

  render() {
    if (!this.visible) return;
    const ctx = this.ctx;
    const w = 400; // canvas pixel width (2x for clarity)
    const h = 300;
    const entities = this.engine.entities;

    ctx.clearRect(0, 0, w, h);

    // Background
    const style = getComputedStyle(document.documentElement);
    ctx.fillStyle = style.getPropertyValue('--bg-alt').trim() || '#EDE7DA';
    ctx.fillRect(0, 0, w, h);

    if (entities.length === 0) {
      ctx.fillStyle = style.getPropertyValue('--ink-light').trim() || '#888';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No entities', w/2, h/2);
      return;
    }

    // Compute world bounds
    const bounds = this._getWorldBounds(entities);
    const pad = 50;
    bounds.minX -= pad; bounds.minY -= pad;
    bounds.maxX += pad; bounds.maxY += pad;
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    if (bw === 0 || bh === 0) return;

    // Scale to fit minimap
    const scale = Math.min(w / bw, h / bh);
    const ox = (w - bw * scale) / 2;
    const oy = (h - bh * scale) / 2;

    this._mapScale = scale;
    this._mapOx = ox;
    this._mapOy = oy;
    this._bounds = bounds;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.translate(-bounds.minX, -bounds.minY);

    // Draw entities simplified
    const ink = style.getPropertyValue('--ink').trim() || '#2C1810';
    const accent = style.getPropertyValue('--accent').trim() || '#8B2635';

    for (const e of entities) {
      const d = e.data;
      // Layer filter
      if (this.engine.layersPanel && !this.engine.layersPanel.isEntityVisible(e)) continue;

      switch (e.type) {
        case 'territory':
        case 'region':
          if (d.points && d.points.length >= 3) {
            ctx.beginPath();
            ctx.moveTo(d.points[0].x, d.points[0].y);
            for (let i = 1; i < d.points.length; i++) ctx.lineTo(d.points[i].x, d.points[i].y);
            ctx.closePath();
            ctx.fillStyle = (d.color || accent) + '30';
            ctx.fill();
            ctx.strokeStyle = d.color || accent;
            ctx.lineWidth = 1 / scale;
            ctx.stroke();
          }
          break;
        case 'city':
        case 'symbol':
          ctx.fillStyle = d.color || ink;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 3 / scale, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'route':
          if (d.x1 !== undefined) {
            ctx.strokeStyle = ink;
            ctx.lineWidth = 1 / scale;
            ctx.beginPath();
            ctx.moveTo(d.x1, d.y1);
            ctx.lineTo(d.x2, d.y2);
            ctx.stroke();
          }
          break;
      }
    }

    ctx.restore();

    // Draw viewport rectangle
    const eng = this.engine;
    const vpLeft = -eng.offsetX / eng.zoom;
    const vpTop = -eng.offsetY / eng.zoom;
    const vpW = eng.width / eng.zoom;
    const vpH = eng.height / eng.zoom;

    const rx = ox + (vpLeft - bounds.minX) * scale;
    const ry = oy + (vpTop - bounds.minY) * scale;
    const rw = vpW * scale;
    const rh = vpH * scale;

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.fillStyle = accent + '15';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeRect(rx, ry, rw, rh);
  }

  _getWorldBounds(entities) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of entities) {
      const d = e.data;
      if (d.x !== undefined) { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); minY = Math.min(minY, d.y); maxY = Math.max(maxY, d.y); }
      if (d.points) for (const p of d.points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
      if (d.x1 !== undefined) { minX = Math.min(minX, d.x1, d.x2); maxX = Math.max(maxX, d.x1, d.x2); minY = Math.min(minY, d.y1, d.y2); maxY = Math.max(maxY, d.y1, d.y2); }
    }
    if (!isFinite(minX)) { minX = -500; minY = -500; maxX = 500; maxY = 500; }
    return { minX, minY, maxX, maxY };
  }

  _onMouseDown(e) {
    this._isDragging = true;
    this._navigateTo(e);
  }

  _onMouseMove(e) {
    if (!this._isDragging) return;
    this._navigateTo(e);
  }

  _navigateTo(e) {
    if (!this._bounds || !this._mapScale) return;
    const rect = this.canvas.getBoundingClientRect();
    // Account for CSS scaling (canvas is 400x300, display is 200x150)
    const mx = (e.clientX - rect.left) * (400 / rect.width);
    const my = (e.clientY - rect.top) * (300 / rect.height);

    const worldX = this._bounds.minX + (mx - this._mapOx) / this._mapScale;
    const worldY = this._bounds.minY + (my - this._mapOy) / this._mapScale;

    this.engine.offsetX = this.engine.width / 2 - worldX * this.engine.zoom;
    this.engine.offsetY = this.engine.height / 2 - worldY * this.engine.zoom;
    this.engine.render();
    this.render();
  }
}

export { Minimap };
