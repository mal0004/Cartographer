/**
 * Cartographer — Global Hill Shading
 *
 * Unified directional lighting overlay across all terrain entities.
 * Light source: NW (315°, elevation 45°).
 * Composited as a multiply-style overlay on the main canvas:
 *   - Sun-facing slopes: +15% brightness
 *   - Shadow slopes: -25% brightness
 *
 * Uses an offscreen canvas sized to the visible viewport,
 * sampling combined elevation data from all territory HeightMaps.
 */

import { HeightMap } from './noise.js';

class HillShading {
  constructor() {
    // Light parameters
    this.azimuth = 315;     // degrees, 0=N, 90=E, 315=NW
    this.elevation = 45;    // degrees above horizon
    this.sunStrength = 0.15; // brightness boost for lit faces
    this.shadowStrength = 0.25; // darkness for shadow faces
    this.enabled = true;

    // Offscreen canvas for the overlay
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');

    // Cache
    this._lastHash = '';
    this._dirty = true;

    // Resolution scaling (render at lower res for performance)
    this._scale = 0.25; // 1/4 resolution
  }

  /**
   * Render the global hill shading overlay onto the main canvas.
   * Called after all entities are drawn, before UI elements.
   *
   * @param {CanvasRenderingContext2D} mainCtx - main canvas context (world-transformed)
   * @param {object} engine - CanvasEngine reference for viewport info
   */
  render(mainCtx, engine) {
    if (!this.enabled) return;

    const terrainRenderer = engine.terrainRenderer;
    if (!terrainRenderer) return;

    // Collect all territories with terrain
    const terrainEntities = engine.entities.filter(e =>
      (e.type === 'territory' && e.data.terrainType) ||
      (e.type === 'region' && e.data.terrain)
    );
    if (terrainEntities.length === 0) return;

    // Compute world-space bounds of all terrain entities
    const bounds = this._getCombinedBounds(terrainEntities);
    if (!bounds) return;

    // Size the offscreen canvas
    const w = Math.max(32, Math.ceil(bounds.w * this._scale));
    const h = Math.max(32, Math.ceil(bounds.h * this._scale));

    if (this._canvas.width !== w || this._canvas.height !== h) {
      this._canvas.width = w;
      this._canvas.height = h;
      this._dirty = true;
    }

    // Check if we need to regenerate
    const hash = this._computeHash(terrainEntities, bounds);
    if (hash !== this._lastHash) {
      this._dirty = true;
      this._lastHash = hash;
    }

    if (this._dirty) {
      this._generateOverlay(terrainEntities, bounds, w, h, terrainRenderer);
      this._dirty = false;
    }

    // Composite the overlay onto the main canvas
    mainCtx.save();
    mainCtx.globalCompositeOperation = 'multiply';
    mainCtx.drawImage(this._canvas, bounds.x, bounds.y, bounds.w, bounds.h);
    mainCtx.globalCompositeOperation = 'source-over';
    mainCtx.restore();
  }

  /**
   * Generate the hill shading overlay into the offscreen canvas.
   */
  _generateOverlay(entities, bounds, w, h, terrainRenderer) {
    const ctx = this._ctx;
    const imgData = ctx.createImageData(w, h);
    const pixels = imgData.data;

    // Pre-compute light direction vector
    const azRad = this.azimuth * Math.PI / 180;
    const elRad = this.elevation * Math.PI / 180;
    const lx = Math.sin(azRad) * Math.cos(elRad);
    const ly = -Math.cos(azRad) * Math.cos(elRad);
    const lz = Math.sin(elRad);

    // Build a combined elevation sample function
    // For each pixel in the overlay, find the elevation from the
    // territory whose heightmap covers that world position
    const elevationGrid = new Float32Array(w * h);
    const hasData = new Uint8Array(w * h);

    for (const entity of entities) {
      const cached = terrainRenderer._cache.get(entity.id);
      if (!cached || !cached.canvas || !cached.bbox) continue;

      const bbox = cached.bbox;
      const terrainCanvas = cached.canvas;

      // Get the terrain canvas pixel data to extract elevation info
      // We approximate elevation from luminance of the terrain render
      const tCtx = terrainCanvas.getContext('2d');
      const tW = terrainCanvas.width;
      const tH = terrainCanvas.height;

      let tData;
      try {
        tData = tCtx.getImageData(0, 0, tW, tH).data;
      } catch (e) { continue; }

      // Map from overlay coords to terrain canvas coords
      for (let oy = 0; oy < h; oy++) {
        for (let ox = 0; ox < w; ox++) {
          // World position
          const wx = bounds.x + (ox / w) * bounds.w;
          const wy = bounds.y + (oy / h) * bounds.h;

          // Check if inside this territory's bbox
          if (wx < bbox.x || wx > bbox.x + bbox.w ||
              wy < bbox.y || wy > bbox.y + bbox.h) continue;

          // Map to terrain canvas coords
          const tx = Math.floor(((wx - bbox.x) / bbox.w) * tW);
          const ty = Math.floor(((wy - bbox.y) / bbox.h) * tH);
          if (tx < 0 || tx >= tW || ty < 0 || ty >= tH) continue;

          const tIdx = (ty * tW + tx) * 4;
          const alpha = tData[tIdx + 3];
          if (alpha < 10) continue; // skip transparent pixels

          // Extract pseudo-elevation from pixel luminance
          const r = tData[tIdx];
          const g = tData[tIdx + 1];
          const b = tData[tIdx + 2];
          const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

          const oIdx = oy * w + ox;
          elevationGrid[oIdx] = luminance;
          hasData[oIdx] = 1;
        }
      }
    }

    // Compute normals and shading from the elevation grid
    for (let oy = 0; oy < h; oy++) {
      for (let ox = 0; ox < w; ox++) {
        const idx = oy * w + ox;
        const pi = idx * 4;

        if (!hasData[idx]) {
          // No terrain here — neutral (128,128,128 in multiply = no change)
          pixels[pi]     = 128;
          pixels[pi + 1] = 128;
          pixels[pi + 2] = 128;
          pixels[pi + 3] = 255;
          continue;
        }

        // Compute gradient via finite differences
        const eL = (ox > 0 && hasData[idx - 1]) ? elevationGrid[idx - 1] : elevationGrid[idx];
        const eR = (ox < w - 1 && hasData[idx + 1]) ? elevationGrid[idx + 1] : elevationGrid[idx];
        const eU = (oy > 0 && hasData[idx - w]) ? elevationGrid[idx - w] : elevationGrid[idx];
        const eD = (oy < h - 1 && hasData[idx + w]) ? elevationGrid[idx + w] : elevationGrid[idx];

        const dzdx = (eR - eL) * 4.0; // amplify gradient
        const dzdy = (eD - eU) * 4.0;

        // Surface normal
        const nx = -dzdx;
        const ny = -dzdy;
        const nz = 1.0;
        const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);

        // Dot product with light direction
        const dot = (nx / nLen) * lx + (ny / nLen) * ly + (nz / nLen) * lz;

        // Map dot product to brightness modifier
        // dot > 0.5: lit face → brighter
        // dot < 0.5: shadow face → darker
        let brightness;
        if (dot > 0.5) {
          // Lit: blend from neutral (128) towards white
          const litAmount = (dot - 0.5) * 2.0; // 0→1
          brightness = 128 + Math.round(litAmount * this.sunStrength * 255);
        } else {
          // Shadow: blend from neutral towards dark
          const shadowAmount = (0.5 - dot) * 2.0; // 0→1
          brightness = 128 - Math.round(shadowAmount * this.shadowStrength * 255);
        }

        brightness = Math.max(0, Math.min(255, brightness));
        pixels[pi]     = brightness;
        pixels[pi + 1] = brightness;
        pixels[pi + 2] = brightness;
        pixels[pi + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Blur slightly for smooth transitions
    ctx.save();
    ctx.filter = 'blur(2px)';
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(this._canvas, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
  }

  /**
   * Mark the overlay as needing regeneration.
   */
  invalidate() {
    this._dirty = true;
    this._lastHash = '';
  }

  // ─── Helpers ───────────────────────────────────────────────────

  _getCombinedBounds(entities) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of entities) {
      const pts = e.data.points;
      if (!pts) continue;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
    if (!isFinite(minX)) return null;
    const pad = 20;
    return {
      x: minX - pad,
      y: minY - pad,
      w: (maxX - minX) + pad * 2,
      h: (maxY - minY) + pad * 2,
    };
  }

  _computeHash(entities, bounds) {
    // Simple hash to detect when we need to regenerate
    let h = `${bounds.x|0}_${bounds.y|0}_${bounds.w|0}_${bounds.h|0}_${entities.length}`;
    for (const e of entities) {
      const d = e.data;
      h += `_${e.id}_${d.terrainType || d.terrain || ''}_${d.terrainIntensity || 50}`;
    }
    return h;
  }
}

export { HillShading };
