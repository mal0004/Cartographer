/**
 * Cartographer — Territory Brush Tool
 *
 * Freehand brush for painting organic territory shapes.
 * Uses Graham scan + Chaikin smoothing + noise displacement.
 */

import { SimplexNoise } from '../noise.js';
import { t } from '../i18n.js';

const DEFAULTS = {
  radius: 40,
  smoothing: 0.6,
  minDistance: 8,
};

export class TerritoryBrush {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.radius = options.radius || DEFAULTS.radius;
    this.smoothing = DEFAULTS.smoothing;
    this.minDistance = DEFAULTS.minDistance;
    this.rawPoints = [];
    this.isDrawing = false;
    this.currentBiome = 'plain';
    this.color = '#8B2635';
    this.noise = new SimplexNoise(Date.now() & 0xffff);
    this._cursorEl = null;
    this._onEntityCreated = options.onEntityCreated || null;
    this._stampLayer = options.stampLayer || (d => d);
    this._initCursor();
  }

  _initCursor() {
    this._cursorEl = document.getElementById('brush-cursor');
    if (!this._cursorEl) {
      this._cursorEl = document.createElement('div');
      this._cursorEl.id = 'brush-cursor';
      this._cursorEl.style.cssText =
        'position:absolute;pointer-events:none;border:2px solid currentColor;' +
        'border-radius:50%;display:none;z-index:999;transform:translate(-50%,-50%);';
      this.canvas.parentElement.appendChild(this._cursorEl);
    }
  }

  setRadius(r) {
    this.radius = Math.max(20, Math.min(120, r));
    this._updateCursorSize();
  }

  setBiome(biome) { this.currentBiome = biome; }
  setColor(c) { this.color = c; }

  activate() {
    this.canvas.style.cursor = 'none';
    this._cursorEl.style.display = 'block';
    this._updateCursorSize();
  }

  deactivate() {
    this.canvas.style.cursor = '';
    this._cursorEl.style.display = 'none';
    this.isDrawing = false;
    this.rawPoints = [];
  }

  _updateCursorSize() {
    const sz = this.radius * 2;
    this._cursorEl.style.width = sz + 'px';
    this._cursorEl.style.height = sz + 'px';
  }

  updateCursor(clientX, clientY) {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this._cursorEl.style.left = (clientX - rect.left) + 'px';
    this._cursorEl.style.top = (clientY - rect.top) + 'px';
    this._cursorEl.style.color = this.color;
  }

  onMouseDown(wx, wy, clientX, clientY) {
    this.isDrawing = true;
    this.rawPoints = [{ x: wx, y: wy }];
    this.updateCursor(clientX, clientY);
  }

  onMouseMove(wx, wy, clientX, clientY) {
    this.updateCursor(clientX, clientY);
    if (!this.isDrawing) return;
    const last = this.rawPoints[this.rawPoints.length - 1];
    const dx = wx - last.x, dy = wy - last.y;
    if (Math.sqrt(dx * dx + dy * dy) > this.minDistance) {
      this.rawPoints.push({ x: wx, y: wy });
    }
  }

  onMouseUp() {
    this.isDrawing = false;
    if (this.rawPoints.length < 3) { this.rawPoints = []; return; }
    const hull = this._grahamScan(this._expandPoints(this.rawPoints));
    const smooth = this._chaikin(hull, 4);
    const displaced = this._noiseDisplace(smooth);
    this._emitTerritory(displaced);
    this.rawPoints = [];
  }

  _expandPoints(pts) {
    const expanded = [];
    for (const p of pts) {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n;
        expanded.push({
          x: p.x + Math.cos(a) * this.radius,
          y: p.y + Math.sin(a) * this.radius,
        });
      }
    }
    return expanded;
  }

  _grahamScan(points) {
    if (points.length < 3) return points;
    let lowest = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].y < points[lowest].y ||
        (points[i].y === points[lowest].y && points[i].x < points[lowest].x)) {
        lowest = i;
      }
    }
    [points[0], points[lowest]] = [points[lowest], points[0]];
    const pivot = points[0];
    points.sort((a, b) => {
      const aa = Math.atan2(a.y - pivot.y, a.x - pivot.x);
      const ab = Math.atan2(b.y - pivot.y, b.x - pivot.x);
      return aa - ab || this._dist2(pivot, a) - this._dist2(pivot, b);
    });
    const stack = [points[0], points[1]];
    for (let i = 2; i < points.length; i++) {
      while (stack.length > 1 && this._cross(
        stack[stack.length - 2], stack[stack.length - 1], points[i]) <= 0) {
        stack.pop();
      }
      stack.push(points[i]);
    }
    return stack;
  }

  _cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  _dist2(a, b) {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  }

  _chaikin(pts, passes) {
    let result = pts;
    for (let p = 0; p < passes; p++) {
      const next = [];
      for (let i = 0; i < result.length; i++) {
        const a = result[i];
        const b = result[(i + 1) % result.length];
        next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
        next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
      }
      result = next;
    }
    return result;
  }

  _noiseDisplace(pts) {
    return pts.map(p => ({
      x: p.x + this.noise.noise2D(p.x * 0.02, p.y * 0.02) * 15,
      y: p.y + this.noise.noise2D(p.x * 0.02 + 100, p.y * 0.02) * 15,
    }));
  }

  _emitTerritory(points) {
    const entityData = {
      type: 'territory',
      name: '',
      data: this._stampLayer({
        points: points.map(p => ({ x: p.x, y: p.y })),
        color: this.color,
        ruler: '',
        capitalName: '',
        resources: [],
        description: '',
        terrainType: this.currentBiome,
        terrainSeed: Math.floor(Math.random() * 100000),
        terrainIntensity: 50,
      }),
    };
    if (this._onEntityCreated) this._onEntityCreated(entityData);
  }

  drawPreview(ctx, zoom, offsetX, offsetY) {
    if (this.rawPoints.length < 2) return;
    const hull = this._grahamScan(this._expandPoints(this.rawPoints));
    const smooth = this._chaikin(hull, 3);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);
    ctx.beginPath();
    ctx.moveTo(smooth[0].x, smooth[0].y);
    for (let i = 1; i < smooth.length; i++) {
      ctx.lineTo(smooth[i].x, smooth[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();
    ctx.restore();
  }
}
