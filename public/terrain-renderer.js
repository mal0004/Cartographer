/**
 * Cartographer — Procedural Terrain Renderer
 *
 * Generates and caches offscreen canvas renders for each territory/region
 * based on terrain type (plain, hills, mountains, desert, marsh, ocean).
 * Uses HeightMap from noise.js for elevation data, contour lines, and hill shading.
 *
 * Integrates into CanvasEngine's render pipeline.
 */

/* global HeightMap, SimplexNoise */

const TERRAIN_TYPES = {
  plain:    { label: 'Plains',    elevMin: 0.3,  elevMax: 0.5,  contours: 2,  color: '#C8D8A0', colorDark: '#8FA860' },
  hills:    { label: 'Hills',     elevMin: 0.4,  elevMax: 0.65, contours: 5,  color: '#A8C070', colorDark: '#6B8B3A' },
  mountain: { label: 'Mountains', elevMin: 0.65, elevMax: 1.0,  contours: 10, color: '#9A8B78', colorDark: '#5A4B3A' },
  desert:   { label: 'Desert',    elevMin: 0.2,  elevMax: 0.45, contours: 2,  color: '#D4A96A', colorDark: '#B08040' },
  marsh:    { label: 'Marsh',     elevMin: 0.1,  elevMax: 0.3,  contours: 2,  color: '#7A9A6A', colorDark: '#4A6A3A' },
  ocean:    { label: 'Ocean/Lake',elevMin: 0.0,  elevMax: 0.3,  contours: 4,  color: '#4A8AB5', colorDark: '#2A5A85' },
};

class TerrainRenderer {
  constructor() {
    // Cache: entityId → { canvas, seed, terrainType, intensity, hash }
    this._cache = new Map();
    // Worker for background generation (optional)
    this._worker = null;
    this._pendingWorker = new Map();
    this._initWorker();
  }

  _initWorker() {
    try {
      this._worker = new Worker('/worker-noise.js');
      this._worker.onmessage = (e) => this._onWorkerResult(e.data);
    } catch (err) {
      // Fallback: generate on main thread
      this._worker = null;
    }
  }

  _onWorkerResult(msg) {
    if (msg.type !== 'result') return;
    const pending = this._pendingWorker.get(msg.id);
    if (!pending) return;
    this._pendingWorker.delete(msg.id);

    const data = new Float32Array(msg.data);
    const hillshade = new Float32Array(msg.hillshade);
    const { entity, polygon, bbox, terrainType, intensity, zoom, callback } = pending;

    const canvas = this._renderTerrainToCanvas(
      data, hillshade, msg.width, msg.height,
      polygon, bbox, terrainType, intensity, entity
    );

    const hash = this._cacheKey(entity, terrainType, intensity, zoom);
    this._cache.set(entity.id, { canvas, hash, bbox });

    if (callback) callback();
  }

  /**
   * Get or generate the terrain canvas for a territory/region entity.
   * Returns { canvas, bbox } or null if not ready yet.
   */
  getTerrainCanvas(entity, zoom, onReady) {
    const d = entity.data;
    if (!d.points || d.points.length < 3) return null;

    const terrainType = d.terrainType || d.terrain || 'plain';
    const intensity = d.terrainIntensity ?? 50;
    const seed = d.terrainSeed ?? (entity.id * 7919);

    // LOD: reduce resolution at low zoom
    const lodZoom = zoom < 0.5 ? 0.5 : zoom > 1.5 ? 1.5 : 1.0;

    const hash = this._cacheKey(entity, terrainType, intensity, lodZoom);
    const cached = this._cache.get(entity.id);
    if (cached && cached.hash === hash) {
      return cached;
    }

    // Compute bounding box
    const bbox = this._getBBox(d.points);
    const padding = 10;
    bbox.x -= padding;
    bbox.y -= padding;
    bbox.w += padding * 2;
    bbox.h += padding * 2;

    // Resolution based on LOD
    const maxDim = 256;
    const scale = Math.min(maxDim / bbox.w, maxDim / bbox.h, lodZoom);
    const w = Math.max(16, Math.ceil(bbox.w * scale));
    const h = Math.max(16, Math.ceil(bbox.h * scale));

    // Polygon in local coordinates
    const polygon = d.points.map(p => ({
      x: (p.x - bbox.x) * scale,
      y: (p.y - bbox.y) * scale,
    }));

    // Noise parameters based on terrain type
    const cfg = TERRAIN_TYPES[terrainType] || TERRAIN_TYPES.plain;
    const noiseScale = 0.02 + (intensity / 100) * 0.03;
    const octaves = terrainType === 'mountain' ? 8 : terrainType === 'hills' ? 6 : 4;

    if (this._worker) {
      const id = `${entity.id}_${Date.now()}`;
      this._pendingWorker.set(id, {
        entity, polygon, bbox, terrainType, intensity, zoom: lodZoom, callback: onReady,
      });
      this._worker.postMessage({
        type: 'generate',
        id,
        width: w,
        height: h,
        seed,
        scale: noiseScale,
        octaves,
        persistence: 0.5,
        lacunarity: 2.0,
        polygon,
        feather: Math.min(w, h) * 0.15,
      });
      return null; // not ready yet
    }

    // Fallback: generate on main thread
    const hm = new HeightMap(w, h, seed);
    hm.generate(noiseScale, octaves, 0.5, 2.0);
    hm.applyCustomMaskSmooth(polygon, Math.min(w, h) * 0.15);

    // Compute hillshade
    const hillshade = new Float32Array(w * h);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        hillshade[py * w + px] = hm.getHillshadeAt(px, py, 315, 45, 2.0);
      }
    }

    const canvas = this._renderTerrainToCanvas(
      hm.data, hillshade, w, h,
      polygon, bbox, terrainType, intensity, entity
    );

    this._cache.set(entity.id, { canvas, hash, bbox });
    return { canvas, bbox };
  }

  /**
   * Render heightmap data to an offscreen canvas with terrain-specific styling.
   */
  _renderTerrainToCanvas(data, hillshade, w, h, polygon, bbox, terrainType, intensity, entity) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const cfg = TERRAIN_TYPES[terrainType] || TERRAIN_TYPES.plain;
    const baseColor = entity.data.terrainColor || cfg.color;
    const seed = entity.data.terrainSeed ?? (entity.id * 7919);
    const simplex = new SimplexNoise(seed + 1000);

    // 1. Base fill with elevation-mapped color
    this._renderBaseColor(ctx, data, w, h, terrainType, baseColor, cfg, simplex);

    // 2. Hill shading overlay
    this._renderHillshade(ctx, hillshade, w, h, intensity);

    // 3. Terrain-specific decorations
    switch (terrainType) {
      case 'plain':    this._decoratePlain(ctx, data, w, h, simplex); break;
      case 'hills':    this._decorateHills(ctx, data, w, h, simplex, cfg); break;
      case 'mountain': this._decorateMountain(ctx, data, w, h, simplex, cfg); break;
      case 'desert':   this._decorateDesert(ctx, data, w, h, simplex); break;
      case 'marsh':    this._decorateMarsh(ctx, data, w, h, simplex); break;
      case 'ocean':    this._decorateOcean(ctx, data, w, h, simplex, cfg); break;
    }

    // 4. Contour lines
    this._renderContours(ctx, data, w, h, terrainType, cfg);

    // 5. Clip to polygon
    this._clipToPolygon(ctx, polygon, w, h);

    return canvas;
  }

  // ─── Base Color ────────────────────────────────────────────────

  _renderBaseColor(ctx, data, w, h, terrainType, baseColor, cfg, simplex) {
    const imgData = ctx.createImageData(w, h);
    const pixels = imgData.data;
    const base = this._parseColor(baseColor);
    const dark = this._parseColor(cfg.colorDark);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const elev = data[idx];
        if (elev <= 0.001) {
          // Transparent outside mask
          const pi = idx * 4;
          pixels[pi] = pixels[pi+1] = pixels[pi+2] = pixels[pi+3] = 0;
          continue;
        }

        // Remap elevation to terrain range
        const t = Math.max(0, Math.min(1,
          (elev - cfg.elevMin) / (cfg.elevMax - cfg.elevMin)
        ));

        // Noise variation for natural look
        const nv = simplex.noise2D(x * 0.08, y * 0.08) * 0.1;

        let r, g, b;
        if (terrainType === 'ocean') {
          // Depth gradient: lighter at edges, darker at center
          const depth = Math.min(1, elev * 2);
          r = Math.round(base.r + (dark.r - base.r) * depth + nv * 20);
          g = Math.round(base.g + (dark.g - base.g) * depth + nv * 20);
          b = Math.round(base.b + (dark.b - base.b) * depth + nv * 15);
        } else if (terrainType === 'mountain' && elev > 0.85) {
          // Snow cap
          const snowT = (elev - 0.85) / 0.15;
          r = Math.round(base.r + (245 - base.r) * snowT + nv * 10);
          g = Math.round(base.g + (240 - base.g) * snowT + nv * 10);
          b = Math.round(base.b + (235 - base.b) * snowT + nv * 10);
        } else {
          // Standard elevation color blend
          r = Math.round(base.r + (dark.r - base.r) * t + nv * 25);
          g = Math.round(base.g + (dark.g - base.g) * t + nv * 25);
          b = Math.round(base.b + (dark.b - base.b) * t + nv * 15);
        }

        const pi = idx * 4;
        pixels[pi]     = Math.max(0, Math.min(255, r));
        pixels[pi + 1] = Math.max(0, Math.min(255, g));
        pixels[pi + 2] = Math.max(0, Math.min(255, b));
        pixels[pi + 3] = Math.round(200 + elev * 55); // semi-transparent edges
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // ─── Hill Shading ──────────────────────────────────────────────

  _renderHillshade(ctx, hillshade, w, h, intensity) {
    const strength = (intensity / 100) * 0.4;
    ctx.save();

    const imgData = ctx.getImageData(0, 0, w, h);
    const pixels = imgData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const pi = idx * 4;
        if (pixels[pi + 3] === 0) continue; // skip transparent

        const shade = hillshade[idx];
        // shade: 0 = shadow, 1 = fully lit
        // Apply as brightness modifier
        const factor = 1.0 + (shade - 0.5) * 2.0 * strength;
        pixels[pi]     = Math.max(0, Math.min(255, Math.round(pixels[pi] * factor)));
        pixels[pi + 1] = Math.max(0, Math.min(255, Math.round(pixels[pi + 1] * factor)));
        pixels[pi + 2] = Math.max(0, Math.min(255, Math.round(pixels[pi + 2] * factor)));
      }
    }

    ctx.putImageData(imgData, 0, 0);
    ctx.restore();
  }

  // ─── Contour Lines ─────────────────────────────────────────────

  _renderContours(ctx, data, w, h, terrainType, cfg) {
    const numContours = cfg.contours;
    if (numContours <= 0) return;

    // Build a mini HeightMap just for contour extraction
    const hm = new HeightMap(w, h, 0);
    hm.data = data;

    const step = 1.0 / (numContours + 1);
    const levels = [];
    for (let i = 1; i <= numContours; i++) {
      levels.push(i * step);
    }

    const contours = hm.toContourLines(levels);

    ctx.save();
    for (const { level, lines } of contours) {
      const opacity = terrainType === 'plain' ? 0.15 : terrainType === 'ocean' ? 0.25 : 0.35;
      const lw = terrainType === 'mountain' ? 1.0 : 0.6;
      ctx.strokeStyle = terrainType === 'ocean'
        ? `rgba(20, 60, 120, ${opacity})`
        : `rgba(60, 40, 20, ${opacity})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (const line of lines) {
        if (line.length < 2) continue;
        ctx.moveTo(line[0].x, line[0].y);
        for (let i = 1; i < line.length; i++) {
          ctx.lineTo(line[i].x, line[i].y);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─── Terrain Decorations ──────────────────────────────────────

  _decoratePlain(ctx, data, w, h, simplex) {
    // Light horizontal hachures
    ctx.save();
    ctx.strokeStyle = 'rgba(80, 120, 50, 0.08)';
    ctx.lineWidth = 0.5;
    for (let y = 4; y < h; y += 8) {
      ctx.beginPath();
      for (let x = 0; x < w; x += 2) {
        const idx = y * w + x;
        if (data[idx] < 0.01) continue;
        const offset = simplex.noise2D(x * 0.05, y * 0.05) * 3;
        if (x === 0 || data[idx - 2] < 0.01) ctx.moveTo(x, y + offset);
        else ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  _decorateHills(ctx, data, w, h, simplex, cfg) {
    // Directional hachures following slope
    ctx.save();
    ctx.strokeStyle = 'rgba(60, 40, 20, 0.12)';
    ctx.lineWidth = 0.6;

    for (let y = 3; y < h - 3; y += 6) {
      for (let x = 3; x < w - 3; x += 6) {
        const idx = y * w + x;
        if (data[idx] < 0.1) continue;

        // Compute local slope direction
        const dx = (data[idx + 1] || 0) - (data[idx - 1] || 0);
        const dy = (data[(y+1)*w+x] || 0) - (data[(y-1)*w+x] || 0);
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len < 0.01) continue;

        // Draw short hachure perpendicular to slope
        const px = -dy / len * 3;
        const py = dx / len * 3;
        const hLen = len * 20 + simplex.noise2D(x * 0.1, y * 0.1) * 2;

        ctx.beginPath();
        ctx.moveTo(x - px * hLen * 0.5, y - py * hLen * 0.5);
        ctx.lineTo(x + px * hLen * 0.5, y + py * hLen * 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _decorateMountain(ctx, data, w, h, simplex, cfg) {
    // Peak symbols at high elevations
    ctx.save();
    const peaks = [];
    const spacing = 12;

    for (let y = spacing; y < h - spacing; y += spacing) {
      for (let x = spacing; x < w - spacing; x += spacing) {
        const idx = y * w + x;
        const elev = data[idx];
        if (elev < 0.6) continue;

        // Check if local maximum
        let isMax = true;
        const radius = 4;
        for (let dy = -radius; dy <= radius && isMax; dy++) {
          for (let dx = -radius; dx <= radius && isMax; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              if (data[ny * w + nx] > elev + 0.01) isMax = false;
            }
          }
        }

        if (isMax || simplex.noise2D(x * 0.15, y * 0.15) > 0.3) {
          peaks.push({ x, y, elev });
        }
      }
    }

    // Draw mountain ridge symbols (irregular triangles)
    for (const peak of peaks) {
      const size = 3 + (peak.elev - 0.5) * 12;
      const wobble = simplex.noise2D(peak.x * 0.2, peak.y * 0.2);

      ctx.fillStyle = peak.elev > 0.85
        ? `rgba(240, 235, 230, ${0.5 + peak.elev * 0.3})`
        : `rgba(80, 60, 40, ${0.2 + peak.elev * 0.2})`;
      ctx.strokeStyle = `rgba(60, 40, 20, ${0.3 + peak.elev * 0.3})`;
      ctx.lineWidth = 0.6;

      ctx.beginPath();
      ctx.moveTo(peak.x + wobble * 2, peak.y - size);
      ctx.lineTo(peak.x + size * 0.6 + wobble, peak.y + size * 0.4);
      ctx.lineTo(peak.x - size * 0.6 + wobble, peak.y + size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Secondary smaller peak
      if (peak.elev > 0.7 && size > 5) {
        ctx.beginPath();
        ctx.moveTo(peak.x + size * 0.4, peak.y - size * 0.5);
        ctx.lineTo(peak.x + size * 0.8, peak.y + size * 0.3);
        ctx.lineTo(peak.x + size * 0.2, peak.y + size * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Strong directional shadow on east/south sides
    ctx.globalCompositeOperation = 'multiply';
    const shadowData = ctx.getImageData(0, 0, w, h);
    const sp = shadowData.data;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const pi = idx * 4;
        if (sp[pi + 3] === 0) continue;
        const elev = data[idx];
        if (elev < 0.5) continue;
        // Check if east/south facing (shadow side)
        const dx = (data[idx + 1] || 0) - (data[idx - 1] || 0);
        const dy = (data[(y+1)*w+x] || 0) - (data[(y-1)*w+x] || 0);
        if (dx > 0.02 || dy > 0.02) {
          const shadowStrength = Math.min(0.2, (dx + dy) * 2);
          sp[pi]     = Math.max(0, sp[pi] - shadowStrength * 40);
          sp[pi + 1] = Math.max(0, sp[pi + 1] - shadowStrength * 40);
          sp[pi + 2] = Math.max(0, sp[pi + 2] - shadowStrength * 30);
        }
      }
    }
    ctx.putImageData(shadowData, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();
  }

  _decorateDesert(ctx, data, w, h, simplex) {
    ctx.save();

    // Dune wave lines
    ctx.strokeStyle = 'rgba(180, 140, 80, 0.2)';
    ctx.lineWidth = 0.8;
    for (let y = 5; y < h; y += 10) {
      ctx.beginPath();
      let started = false;
      for (let x = 0; x < w; x += 2) {
        const idx = y * w + Math.min(x, w - 1);
        if (data[idx] < 0.01) { started = false; continue; }
        const wave = Math.sin(x * 0.08 + simplex.noise2D(x * 0.03, y * 0.03) * 4) * 3;
        if (!started) { ctx.moveTo(x, y + wave); started = true; }
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    // Crescent dune shapes
    ctx.fillStyle = 'rgba(200, 170, 100, 0.15)';
    for (let i = 0; i < w * h / 800; i++) {
      const px = simplex.noise2D(i * 0.7, 0) * 0.5 + 0.5;
      const py = simplex.noise2D(0, i * 0.7) * 0.5 + 0.5;
      const x = px * w;
      const y = py * h;
      const idx = Math.floor(y) * w + Math.floor(x);
      if (idx < 0 || idx >= data.length || data[idx] < 0.05) continue;

      const size = 3 + simplex.noise2D(i * 1.3, i * 0.7) * 3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }

    ctx.restore();
  }

  _decorateMarsh(ctx, data, w, h, simplex) {
    ctx.save();

    // Small pond circles
    ctx.fillStyle = 'rgba(60, 100, 80, 0.2)';
    ctx.strokeStyle = 'rgba(40, 80, 60, 0.25)';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < w * h / 400; i++) {
      const px = (simplex.noise2D(i * 0.5, 0.5) * 0.5 + 0.5) * w;
      const py = (simplex.noise2D(0.5, i * 0.5) * 0.5 + 0.5) * h;
      const ix = Math.floor(px), iy = Math.floor(py);
      if (ix < 0 || ix >= w || iy < 0 || iy >= h) continue;
      if (data[iy * w + ix] < 0.03) continue;

      const r = 1.5 + simplex.noise2D(i * 2, i) * 2;
      ctx.beginPath();
      ctx.ellipse(px, py, r * 1.3, r, simplex.noise2D(i, i) * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Reed hachures (vertical lines on edges)
    ctx.strokeStyle = 'rgba(50, 80, 40, 0.18)';
    ctx.lineWidth = 0.4;
    for (let y = 2; y < h - 4; y += 4) {
      for (let x = 2; x < w - 2; x += 3) {
        const idx = y * w + x;
        if (data[idx] < 0.02 || data[idx] > 0.25) continue;
        const reedH = 2 + simplex.noise2D(x * 0.2, y * 0.2) * 3;
        if (reedH < 1) continue;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + simplex.noise2D(x, y) * 0.8, y - reedH);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _decorateOcean(ctx, data, w, h, simplex, cfg) {
    ctx.save();

    // Bathymetry lines (depth contours) already handled by _renderContours

    // Subtle wave patterns near coast (where elevation transitions)
    ctx.strokeStyle = 'rgba(180, 210, 240, 0.2)';
    ctx.lineWidth = 0.6;
    for (let y = 3; y < h; y += 7) {
      ctx.beginPath();
      let started = false;
      for (let x = 0; x < w; x += 2) {
        const idx = y * w + Math.min(x, w - 1);
        const elev = data[idx];
        if (elev < 0.01) { started = false; continue; }
        // Only near edges (low elevation = near coast)
        if (elev > 0.5) { started = false; continue; }
        const wave = Math.sin(x * 0.15 + y * 0.05 + simplex.noise2D(x * 0.04, y * 0.04) * 3) * 2;
        if (!started) { ctx.moveTo(x, y + wave); started = true; }
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  // ─── Polygon Clipping ──────────────────────────────────────────

  _clipToPolygon(ctx, polygon, w, h) {
    // Use destination-in to clip rendered content to polygon shape
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) {
      ctx.lineTo(polygon[i].x, polygon[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ─── Draw onto main canvas ─────────────────────────────────────

  /**
   * Render the terrain for an entity onto the main canvas context.
   * Called from CanvasEngine._renderEntity().
   * @param {CanvasRenderingContext2D} ctx - main canvas context (already transformed)
   * @param {object} entity
   * @param {number} zoom - current zoom level
   * @param {function} onReady - callback when async generation completes
   */
  drawTerrain(ctx, entity, zoom, onReady) {
    const result = this.getTerrainCanvas(entity, zoom, onReady);
    if (!result) return false; // not ready yet (async generation)

    const { canvas, bbox } = result;
    ctx.save();
    ctx.drawImage(canvas, bbox.x, bbox.y, bbox.w, bbox.h);
    ctx.restore();
    return true;
  }

  /**
   * Invalidate cache for a specific entity (e.g. after editing).
   */
  invalidate(entityId) {
    this._cache.delete(entityId);
  }

  /**
   * Clear all cached terrain renders.
   */
  clearCache() {
    this._cache.clear();
  }

  // ─── Utility ───────────────────────────────────────────────────

  _getBBox(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  _cacheKey(entity, terrainType, intensity, zoom) {
    const d = entity.data;
    const seed = d.terrainSeed ?? (entity.id * 7919);
    const ptsHash = d.points ? d.points.length + '_' + (d.points[0]?.x|0) : '0';
    return `${entity.id}_${terrainType}_${intensity}_${seed}_${zoom}_${ptsHash}`;
  }

  _parseColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }
}

window.TerrainRenderer = TerrainRenderer;
window.TERRAIN_TYPES = TERRAIN_TYPES;
