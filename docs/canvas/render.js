/**
 * Cartographer — Canvas Render Pipeline
 *
 * Rendering methods mixed into CanvasEngine prototype.
 * Handles grid drawing, entity rendering, drawing preview, and symbol caching.
 */

import { ALL_SYMBOLS } from '../symbols/index.js';
import { TerrainTransitions } from '../terrain/transitions.js';
import { TerrainShading } from '../terrain/shading.js';

const _transitions = new TerrainTransitions();
const _shading = new TerrainShading();

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

export function drawCityIcon(ctx, x, y, importance, color) {
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

// ─── Render mixin ────────────────────────────────────────────────

export const RenderMixin = {

  render() {
    if (this.perf) {
      this.perf.requestRender();
    } else {
      this._doRender();
    }
  },

  _doRender() {
    if (this.perfMonitor) this.perfMonitor.beginFrame();
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // Cache computed styles once per frame instead of per entity
    const style = getComputedStyle(document.documentElement);
    this._cachedStyles = {
      bg: style.getPropertyValue('--bg').trim() || '#F5F0E8',
      border: style.getPropertyValue('--border').trim() || '#C8BBAA',
      accent: style.getPropertyValue('--accent').trim() || '#8B2635',
    };
    ctx.fillStyle = this._cachedStyles.bg;
    ctx.fillRect(0, 0, w, h);

    this._drawGrid(ctx, w, h);

    const lodSettings = this.perf ? this.perf.getLODSettings(this.zoom) : null;

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.zoom, this.zoom);

    // Cache sorted entities — only re-sort when entities change
    if (this._sortedVersion !== this._entitiesVersion) {
      const order = ['region', 'territory', 'river', 'route', 'city', 'symbol', 'text'];
      this._sortedEntities = [...this.entities].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
      this._sortedVersion = this._entitiesVersion;
    }
    const sorted = this._sortedEntities;

    for (const entity of sorted) {
      if (this.layersPanel && !this.layersPanel.isEntityVisible(entity)) continue;

      if (this.perf) {
        const bbox = this.perf.getEntityBBox(entity);
        if (bbox && !this.perf.isVisible(bbox, this)) continue;
      }

      const layerOpacity = this.layersPanel ? this.layersPanel.getEntityOpacity(entity) : 1;
      if (layerOpacity < 1) ctx.globalAlpha = layerOpacity;
      this._renderEntity(ctx, entity, lodSettings);
      if (layerOpacity < 1) ctx.globalAlpha = 1;
    }

    // Terrain transitions between adjacent biomes
    const territories = this.entities.filter(e => e.type === 'territory');

    // Compute a lightweight hash to detect territory changes
    const tHash = territories.map(t => `${t.id}:${t.data.terrainType || ''}:${(t.data.points || []).length}`).join('|');
    if (tHash !== this._terrainHash) {
      this._terrainHash = tHash;
      this._cachedAdjacentPairs = territories.length > 1 ? _transitions.detectAdjacentPairs(territories) : [];
      _transitions.invalidate();
      _shading.invalidate();
    }

    if (this._cachedAdjacentPairs && this._cachedAdjacentPairs.length > 0) {
      for (const [t1, t2] of this._cachedAdjacentPairs) {
        _transitions.renderTransition(ctx, t1, t2);
      }
    }

    // Per-territory shading (mountains, deserts) — drawn from offscreen cache
    for (const t of territories) {
      _shading.renderShading(ctx, t, null);
    }

    if (this.hillShading) this.hillShading.render(ctx, this);
    if (this.atmosphere) this.atmosphere.render(ctx, this);
    if (this.snapGuides) this.snapGuides.drawSnaps(ctx);

    this._drawPreview(ctx);
    ctx.restore();

    if (this.perf) this.perf.clearDirty();
    if (this.perfMonitor) this.perfMonitor.endFrame(this.entities.length);
  },

  _drawGrid(ctx, w, h) {
    let baseSpacing = 50;
    let spacing = baseSpacing * this.zoom;
    while (spacing < 25) { spacing *= 2; baseSpacing *= 2; }
    while (spacing > 100) { spacing /= 2; baseSpacing /= 2; }

    const ox = this.offsetX % spacing;
    const oy = this.offsetY % spacing;

    ctx.strokeStyle = this._cachedStyles.border;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = ox; x < w; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = oy; y < h; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.globalAlpha = 1;
  },

  _renderEntity(ctx, entity, lodSettings) {
    const d = entity.data;
    const selected = this.selectedEntity && this.selectedEntity.id === entity.id;
    const pulse = selected ? 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(Date.now() / 400)) : 0;

    switch (entity.type) {
      case 'territory': {
        if (!d.points || d.points.length < 2) break;
        const coastPts = this.coastlines ? this.coastlines.getDeformedPoints(entity) : d.points;

        if (d.terrainType && this.terrainRenderer) {
          const drawn = this.terrainRenderer.drawTerrain(ctx, entity, this.zoom, () => this.render());
          if (!drawn) {
            this._tracePath(ctx, coastPts);
            ctx.fillStyle = (d.color || '#8B2635') + '20';
            ctx.fill();
          }
        } else {
          this._tracePath(ctx, coastPts);
          ctx.fillStyle = (d.color || '#8B2635') + '40';
          ctx.fill();
        }

        if (this.vegetationRenderer && d.terrainType && d.terrainType !== 'ocean' &&
            (!lodSettings || lodSettings.vegetation)) {
          const vegOverlay = this.vegetationRenderer.getVegetationOverlay(entity, this.terrainRenderer, this.zoom);
          if (vegOverlay) ctx.drawImage(vegOverlay.canvas, vegOverlay.bbox.x, vegOverlay.bbox.y, vegOverlay.bbox.w, vegOverlay.bbox.h);
        }

        if (this.coastlines && d.terrainType && d.terrainType !== 'ocean') {
          this.coastlines.drawCoastalEffects(ctx, coastPts, entity, this.zoom);
          if (!lodSettings || lodSettings.waveAnimation) this.coastlines.drawWaveAnimation(ctx, coastPts, this.zoom, Date.now());
        }

        this._tracePath(ctx, coastPts);
        ctx.strokeStyle = d.color || '#8B2635';
        ctx.lineWidth = selected ? 4 : 2.5;
        ctx.stroke();
        if (selected) {
          const accent = this._cachedStyles.accent;
          ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = accent; ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.restore();
        }
        if (entity.name && d.points.length >= 3) {
          const cx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
          const cy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;
          ctx.font = '600 14px Cinzel, serif'; ctx.fillStyle = d.color || '#8B2635';
          ctx.textAlign = 'center'; ctx.fillText(entity.name, cx, cy); ctx.textAlign = 'start';
        }
        break;
      }
      case 'city': {
        const color = d.color || '#2C1810';
        ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
        drawCityIcon(ctx, d.x, d.y, d.importance || 'village', color);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        if (selected) {
          const accent = this._cachedStyles.accent;
          ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = accent; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(d.x, d.y, 16 + 2 * Math.sin(Date.now() / 400), 0, Math.PI * 2);
          ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();
        }
        if (entity.name) {
          const lx = d.labelOffsetX ?? 12; const ly = d.labelOffsetY ?? -8;
          const size = d.importance === 'capital' ? 14 : d.importance === 'city' ? 12 : 10;
          ctx.font = `600 ${size}px Cinzel, serif`; ctx.fillStyle = color;
          ctx.fillText(entity.name, d.x + lx, d.y + ly);
        }
        break;
      }
      case 'route': {
        if (d.x1 === undefined) break;
        const stroke = d.style === 'royal' ? '#8B2635' : d.style === 'road' ? '#2C1810' : '#888';
        const sw = d.style === 'royal' ? 3 : d.style === 'road' ? 2 : 1;
        ctx.strokeStyle = stroke; ctx.lineWidth = selected ? sw + 2 : sw;
        if (d.style === 'trail') ctx.setLineDash([6, 4]);
        ctx.beginPath();
        if (d.cx1 !== undefined) { ctx.moveTo(d.x1, d.y1); ctx.bezierCurveTo(d.cx1, d.cy1, d.cx2, d.cy2, d.x2, d.y2); }
        else { ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); }
        ctx.stroke(); ctx.setLineDash([]);
        if (selected) {
          const accent = this._cachedStyles.accent;
          ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = accent; ctx.lineWidth = sw + 3;
          ctx.beginPath();
          if (d.cx1 !== undefined) { ctx.moveTo(d.x1, d.y1); ctx.bezierCurveTo(d.cx1, d.cy1, d.cx2, d.cy2, d.x2, d.y2); }
          else { ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); }
          ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();
          ctx.fillStyle = '#fff'; ctx.strokeStyle = stroke; ctx.lineWidth = 2;
          for (const [px, py] of [[d.x1, d.y1], [d.x2, d.y2]]) {
            ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
        }
        break;
      }
      case 'region': {
        if (!d.points || d.points.length < 2) break;
        const regionCoastPts = this.coastlines ? this.coastlines.getDeformedPoints(entity) : d.points;
        const regionTerrainMap = { forest: 'plain', mountain: 'mountain', desert: 'desert', ocean: 'ocean' };
        const proceduralType = regionTerrainMap[d.terrain] || d.terrain;

        if (this.terrainRenderer && proceduralType) {
          const origType = d.terrainType;
          d.terrainType = proceduralType;
          const drawn = this.terrainRenderer.drawTerrain(ctx, entity, this.zoom, () => this.render());
          d.terrainType = origType;
          if (!drawn) {
            this._tracePath(ctx, regionCoastPts);
            const terrain = d.terrain || 'forest';
            if (!this._textureCache[terrain]) this._textureCache[terrain] = createTexturePattern(ctx, terrain);
            ctx.fillStyle = this._textureCache[terrain]; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
          }
        } else {
          this._tracePath(ctx, regionCoastPts);
          const terrain = d.terrain || 'forest';
          if (!this._textureCache[terrain]) this._textureCache[terrain] = createTexturePattern(ctx, terrain);
          ctx.fillStyle = this._textureCache[terrain]; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
        }

        if (this.vegetationRenderer && proceduralType && proceduralType !== 'ocean' &&
            (!lodSettings || lodSettings.vegetation)) {
          const origVegType = d.terrainType;
          d.terrainType = proceduralType;
          const vegOverlay = this.vegetationRenderer.getVegetationOverlay(entity, this.terrainRenderer, this.zoom);
          d.terrainType = origVegType;
          if (vegOverlay) ctx.drawImage(vegOverlay.canvas, vegOverlay.bbox.x, vegOverlay.bbox.y, vegOverlay.bbox.w, vegOverlay.bbox.h);
        }

        if (this.coastlines && d.terrain !== 'ocean') {
          this.coastlines.drawCoastalEffects(ctx, regionCoastPts, entity, this.zoom);
          if (!lodSettings || lodSettings.waveAnimation) this.coastlines.drawWaveAnimation(ctx, regionCoastPts, this.zoom, Date.now());
        }

        this._tracePath(ctx, regionCoastPts);
        ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.stroke();
        if (selected) {
          const accent = this._cachedStyles.accent;
          ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = accent; ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.restore();
        }
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
          const accent = this._cachedStyles.accent;
          ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = accent; ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]); ctx.strokeRect(d.x - 2, d.y - size, metrics.width + 4, size + 4);
          ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.restore();
        }
        break;
      }
      case 'symbol': {
        const symSize = d.size || 32;
        const rotation = d.rotation || 0;
        const color = d.color || '#2C1810';
        ctx.save();
        ctx.translate(d.x, d.y);
        if (rotation) ctx.rotate(rotation * Math.PI / 180);
        ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
        this._drawSymbol(ctx, d.symbolId, -symSize / 2, -symSize / 2, symSize, color);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        if (selected) {
          const accent = this._cachedStyles.accent;
          ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(0, 0, symSize / 2 + 6 + 2 * Math.sin(Date.now() / 400), 0, Math.PI * 2);
          ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();
        }
        ctx.restore();
        if (entity.name) {
          ctx.font = '11px Cinzel, serif'; ctx.fillStyle = color;
          ctx.textAlign = 'center'; ctx.fillText(entity.name, d.x, d.y + symSize / 2 + 14); ctx.textAlign = 'start';
        }
        break;
      }
      case 'river': {
        if (this.riverEngine && d.sourceX !== undefined) {
          const riverData = this.riverEngine.getRiverPath(entity, this.terrainRenderer, this.entities);
          if (riverData) {
            this.riverEngine.drawRiver(ctx, riverData, entity, this.zoom, selected);
          } else {
            ctx.beginPath(); ctx.arc(d.sourceX, d.sourceY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#4A7A9A'; ctx.fill();
          }
        }
        break;
      }
    }
  },

  _drawPreview(ctx) {
    if (this.tool === 'territory' || this.tool === 'region') {
      if (this.drawingPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(this.drawingPoints[0].x, this.drawingPoints[0].y);
        for (let i = 1; i < this.drawingPoints.length; i++) ctx.lineTo(this.drawingPoints[i].x, this.drawingPoints[i].y);
        ctx.strokeStyle = this.toolColor; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        ctx.stroke(); ctx.setLineDash([]);
        for (const p of this.drawingPoints) {
          ctx.fillStyle = this.toolColor; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    if (this.tool === 'route' && this.routeStart) {
      ctx.fillStyle = this.toolColor; ctx.beginPath();
      ctx.arc(this.routeStart.x, this.routeStart.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (this.tool === 'brush' && this.brush) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);
      this.brush.drawPreview(ctx, this.zoom, this.offsetX, this.offsetY);
      ctx.restore();
    }
  },

  _drawSymbol(ctx, symbolId, x, y, size, color) {
    const cacheKey = `${symbolId}_${size}_${color}`;
    if (!this._symbolCache) this._symbolCache = {};
    if (!this._symbolCache[cacheKey]) {
      const sym = ALL_SYMBOLS ? ALL_SYMBOLS.find(s => s.id === symbolId) : null;
      if (!sym) return;
      const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}"><g color="${color}" fill="${color}" stroke="${color}">${sym.svg.replace(/currentColor/g, color)}</g></svg>`;
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { this._symbolCache[cacheKey] = img; URL.revokeObjectURL(url); this.render(); };
      img.src = url;
      return;
    }
    ctx.drawImage(this._symbolCache[cacheKey], x, y, size, size);
  },

  _tracePath(ctx, points) {
    if (!points || points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
  },
};
