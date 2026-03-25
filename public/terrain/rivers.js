/**
 * Cartographer — Auto-Generated Rivers
 *
 * User places a "Source" point; the river flows downhill via gradient
 * descent on the combined elevation of all terrain territories.
 *
 * Features:
 * - Gradient descent with random perturbation (±15°)
 * - Chaikin curve smoothing (3 passes)
 * - Progressive width (source → mouth)
 * - Delta branching at ocean/lake
 * - Meanders on flat terrain
 * - Selectable, nameable, draggable source
 * - Tributary branching (click on existing river)
 * - Persistence via entity system (type: 'river')
 *
 * Zero dependencies beyond noise.js (SimplexNoise) and terrain-renderer.js cache.
 */

import { SimplexNoise } from './noise.js';

class RiverEngine {
  constructor() {
    // Cache: entityId → { path, width[], hash }
    this._cache = new Map();
    this._noise = null;
    this._seed = 0;
  }

  /**
   * Set the world seed for river perturbation noise.
   */
  setSeed(seed) {
    if (this._seed !== seed) {
      this._seed = seed;
      this._noise = new SimplexNoise(seed + 13331);
      this._cache.clear();
    }
  }

  /**
   * Generate or retrieve the river path for a river entity.
   *
   * @param {object} entity - river entity with data.sourceX, data.sourceY
   * @param {object} terrainRenderer - TerrainRenderer instance for elevation sampling
   * @param {Array} allEntities - all entities (for finding terrain territories)
   * @returns {{ path: Array<{x,y}>, widths: number[], delta: Array<Array<{x,y}>> } | null}
   */
  getRiverPath(entity, terrainRenderer, allEntities) {
    const d = entity.data;
    if (d.sourceX === undefined || d.sourceY === undefined) return null;

    const hash = this._computeHash(entity, allEntities);
    const cached = this._cache.get(entity.id);
    if (cached && cached.hash === hash) return cached;

    // Build combined elevation sampler from all terrain territories
    const sampler = this._buildElevationSampler(terrainRenderer, allEntities);

    // Run gradient descent
    const rawPath = this._traceRiver(d.sourceX, d.sourceY, sampler, entity);

    if (rawPath.length < 2) return null;

    // Chaikin smoothing (3 passes)
    let smoothed = rawPath;
    for (let i = 0; i < 3; i++) {
      smoothed = this._chaikinSmooth(smoothed);
    }

    // Calculate progressive widths
    const widths = this._calcWidths(smoothed, d.widthScale || 1.0);

    // Generate delta at mouth
    const delta = this._generateDelta(smoothed, sampler, entity);

    const result = { path: smoothed, widths, delta, hash };
    this._cache.set(entity.id, result);
    return result;
  }

  /**
   * Invalidate cache for a specific river or all.
   */
  invalidate(entityId) {
    if (entityId) {
      this._cache.delete(entityId);
    } else {
      this._cache.clear();
    }
  }

  // ─── Elevation sampling ──────────────────────────────────────

  /**
   * Build a function that samples elevation at any world (x, y).
   * Uses the terrain renderer's cached canvases, extracting luminance.
   */
  _buildElevationSampler(terrainRenderer, allEntities) {
    if (!terrainRenderer) return () => 0.5;

    // Collect all terrain entities with cached renders
    const terrainCaches = [];
    for (const e of allEntities) {
      if ((e.type === 'territory' && e.data.terrainType) ||
          (e.type === 'region' && e.data.terrain)) {
        const cached = terrainRenderer._cache.get(e.id);
        if (cached && cached.canvas && cached.bbox) {
          terrainCaches.push(cached);
        }
      }
    }

    if (terrainCaches.length === 0) return () => 0.5;

    return (wx, wy) => {
      for (const tc of terrainCaches) {
        const { canvas, bbox } = tc;
        if (wx < bbox.x || wx > bbox.x + bbox.w ||
            wy < bbox.y || wy > bbox.y + bbox.h) continue;

        const tx = Math.floor(((wx - bbox.x) / bbox.w) * canvas.width);
        const ty = Math.floor(((wy - bbox.y) / bbox.h) * canvas.height);
        if (tx < 0 || tx >= canvas.width || ty < 0 || ty >= canvas.height) continue;

        try {
          const ctx = canvas.getContext('2d');
          const pixel = ctx.getImageData(tx, ty, 1, 1).data;
          if (pixel[3] < 10) continue; // transparent = no terrain
          return (pixel[0] * 0.299 + pixel[1] * 0.587 + pixel[2] * 0.114) / 255;
        } catch (e) { continue; }
      }
      return -1; // no terrain found → will stop river
    };
  }

  // ─── Gradient descent ────────────────────────────────────────

  /**
   * Trace a river path via steepest gradient descent.
   */
  _traceRiver(startX, startY, sampler, entity) {
    const path = [{ x: startX, y: startY }];
    const stepSize = 8; // pixels per step
    const maxSteps = 2000;
    const perturbAngle = 15 * Math.PI / 180; // ±15° random perturbation
    const seaLevel = 0.15;

    let cx = startX;
    let cy = startY;

    for (let step = 0; step < maxSteps; step++) {
      const currentElev = sampler(cx, cy);

      // Stop conditions
      if (currentElev < 0) break; // off terrain
      if (currentElev < seaLevel) break; // reached sea/lake

      // Sample 16 directions to find steepest descent
      let bestDx = 0, bestDy = 0, bestDrop = 0;
      const directions = 16;
      for (let d = 0; d < directions; d++) {
        const angle = (d / directions) * Math.PI * 2;
        const sx = cx + Math.cos(angle) * stepSize;
        const sy = cy + Math.sin(angle) * stepSize;
        const elev = sampler(sx, sy);
        if (elev < 0) continue; // off terrain
        const drop = currentElev - elev;
        if (drop > bestDrop) {
          bestDrop = drop;
          bestDx = Math.cos(angle);
          bestDy = Math.sin(angle);
        }
      }

      // If no downhill direction found, stop
      if (bestDrop <= 0) break;

      // Add random perturbation for natural look
      if (this._noise) {
        const n = this._noise.noise2D(cx * 0.01, cy * 0.01);
        const perturbation = n * perturbAngle;
        const cosP = Math.cos(perturbation);
        const sinP = Math.sin(perturbation);
        const newDx = bestDx * cosP - bestDy * sinP;
        const newDy = bestDx * sinP + bestDy * cosP;
        bestDx = newDx;
        bestDy = newDy;
      }

      // Meander amplification on flat terrain (gradient < 0.05)
      const gradient = bestDrop / stepSize;
      let actualStep = stepSize;
      if (gradient < 0.05 && this._noise) {
        // Add sinusoidal meander
        const meanderPhase = step * 0.15;
        const meanderAmp = (0.05 - gradient) * 200; // stronger on flatter terrain
        const perpX = -bestDy;
        const perpY = bestDx;
        const meander = Math.sin(meanderPhase) * meanderAmp;
        cx += bestDx * actualStep + perpX * meander * 0.3;
        cy += bestDy * actualStep + perpY * meander * 0.3;
      } else {
        cx += bestDx * actualStep;
        cy += bestDy * actualStep;
      }

      // Avoid revisiting (simple distance check)
      const lastPt = path[path.length - 1];
      const dist = Math.sqrt((cx - lastPt.x) ** 2 + (cy - lastPt.y) ** 2);
      if (dist < stepSize * 0.5) break; // stuck

      path.push({ x: cx, y: cy });
    }

    return path;
  }

  // ─── Chaikin smoothing ───────────────────────────────────────

  /**
   * Chaikin's corner cutting algorithm for smooth curves.
   */
  _chaikinSmooth(points) {
    if (points.length < 3) return points;

    const result = [points[0]]; // keep start

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      result.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
      });
      result.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
      });
    }

    result.push(points[points.length - 1]); // keep end
    return result;
  }

  // ─── Width calculation ───────────────────────────────────────

  /**
   * Progressive width: 1px at source → 8-15px at mouth.
   */
  _calcWidths(path, widthScale) {
    const n = path.length;
    if (n === 0) return [];

    // Total path length
    let totalLen = 0;
    for (let i = 1; i < n; i++) {
      totalLen += Math.sqrt(
        (path[i].x - path[i - 1].x) ** 2 +
        (path[i].y - path[i - 1].y) ** 2
      );
    }

    const minWidth = 1;
    const maxWidth = Math.min(15, Math.max(8, totalLen / 80)) * widthScale;

    const widths = new Array(n);
    let accLen = 0;
    widths[0] = minWidth;

    for (let i = 1; i < n; i++) {
      accLen += Math.sqrt(
        (path[i].x - path[i - 1].x) ** 2 +
        (path[i].y - path[i - 1].y) ** 2
      );
      const t = totalLen > 0 ? accLen / totalLen : 0;
      // Ease-in curve for natural widening
      widths[i] = minWidth + (maxWidth - minWidth) * (t * t);
    }

    return widths;
  }

  // ─── Delta generation ───────────────────────────────────────

  /**
   * Generate delta branches at the river mouth.
   * Returns array of branch paths (each is [{x,y}, ...]).
   */
  _generateDelta(path, sampler, entity) {
    if (path.length < 5) return [];

    const mouth = path[path.length - 1];
    const mouthElev = sampler(mouth.x, mouth.y);

    // Only create delta if river ends near sea level
    if (mouthElev > 0.2 && mouthElev >= 0) return [];

    // Get direction at mouth
    const prev = path[path.length - 3];
    const dirX = mouth.x - prev.x;
    const dirY = mouth.y - prev.y;
    const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
    if (dirLen < 1) return [];

    const ux = dirX / dirLen;
    const uy = dirY / dirLen;

    // Generate 2-4 branches
    const branchCount = 2 + Math.floor(Math.abs(
      this._noise ? this._noise.noise2D(mouth.x * 0.1, mouth.y * 0.1) : 0
    ) * 2.5);

    const delta = [];
    const spreadAngle = Math.PI / 4; // 45° total spread

    for (let b = 0; b < branchCount; b++) {
      const angleOffset = (b / (branchCount - 1 || 1) - 0.5) * spreadAngle;
      const cosA = Math.cos(angleOffset);
      const sinA = Math.sin(angleOffset);
      const bux = ux * cosA - uy * sinA;
      const buy = ux * sinA + uy * cosA;

      const branchLen = 20 + Math.random() * 30;
      const steps = 5;
      const branch = [{ x: mouth.x, y: mouth.y }];

      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        branch.push({
          x: mouth.x + bux * branchLen * t,
          y: mouth.y + buy * branchLen * t,
        });
      }

      // Smooth the branch
      delta.push(this._chaikinSmooth(branch));
    }

    return delta;
  }

  // ─── Rendering ───────────────────────────────────────────────

  /**
   * Draw a river entity on the canvas.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} riverData - { path, widths, delta }
   * @param {object} entity
   * @param {number} zoom
   * @param {boolean} selected
   */
  drawRiver(ctx, riverData, entity, zoom, selected) {
    if (!riverData || !riverData.path || riverData.path.length < 2) return;

    const { path, widths, delta } = riverData;
    const d = entity.data;
    const color = d.color || '#6B8FA8';

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw the main river as a series of segments with varying width
    // Draw darker edge first, then lighter center
    this._drawRiverStroke(ctx, path, widths, color, zoom, false);
    this._drawRiverStroke(ctx, path, widths, color, zoom, true);

    // Draw delta branches
    if (delta && delta.length > 0) {
      const mouthWidth = widths[widths.length - 1] || 4;
      for (let b = 0; b < delta.length; b++) {
        const branch = delta[b];
        const branchWidths = branch.map((_, i) =>
          mouthWidth * (1 - i / branch.length) * 0.6
        );
        this._drawRiverStroke(ctx, branch, branchWidths, color, zoom, false);
        this._drawRiverStroke(ctx, branch, branchWidths, color, zoom, true);
      }
    }

    // Draw source marker
    ctx.beginPath();
    ctx.arc(d.sourceX, d.sourceY, 3 / zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#4A7A9A';
    ctx.fill();

    // Draw label
    if (entity.name) {
      // Place label at ~30% of river length
      const labelIdx = Math.floor(path.length * 0.3);
      const lp = path[labelIdx];
      if (lp) {
        const size = Math.max(9, 11 / zoom);
        ctx.font = `italic ${size}px "Source Serif 4", serif`;
        ctx.fillStyle = '#4A7A9A';
        ctx.textAlign = 'center';

        // Compute angle for text rotation
        const nextPt = path[Math.min(labelIdx + 3, path.length - 1)];
        const angle = Math.atan2(nextPt.y - lp.y, nextPt.x - lp.x);
        ctx.save();
        ctx.translate(lp.x, lp.y);
        ctx.rotate(angle);
        ctx.fillText(entity.name, 0, -4 / zoom);
        ctx.restore();
        ctx.textAlign = 'start';
      }
    }

    // Selection highlight
    if (selected) {
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#00AAFF';
      ctx.lineWidth = (widths[Math.floor(widths.length / 2)] || 3) + 4;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /**
   * Draw river with varying width using segment-by-segment strokes.
   */
  _drawRiverStroke(ctx, path, widths, color, zoom, isCenter) {
    for (let i = 0; i < path.length - 1; i++) {
      const p0 = path[i];
      const p1 = path[i + 1];
      const w0 = widths[i] || 1;
      const w1 = widths[i + 1] || 1;
      const w = (w0 + w1) / 2;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);

      if (isCenter) {
        // Lighter center stroke
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = w * 0.6;
      } else {
        // Darker edge stroke
        ctx.strokeStyle = this._darkenColor(color, 0.7);
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = w;
      }

      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ─── Hit testing ─────────────────────────────────────────────

  /**
   * Check if a world point is near a river path.
   * Returns the entity ID or null.
   */
  hitTest(wx, wy, entities, terrainRenderer, allEntities, threshold) {
    threshold = threshold || 8;

    for (const entity of entities) {
      if (entity.type !== 'river') continue;

      const riverData = this.getRiverPath(entity, terrainRenderer, allEntities);
      if (!riverData || !riverData.path) continue;

      for (let i = 0; i < riverData.path.length - 1; i++) {
        const p0 = riverData.path[i];
        const p1 = riverData.path[i + 1];
        const dist = this._pointToSegmentDist(wx, wy, p0.x, p0.y, p1.x, p1.y);
        const w = (riverData.widths[i] || 2) / 2;
        if (dist < w + threshold) return entity;
      }

      // Check source point
      const d = entity.data;
      const srcDist = Math.sqrt((wx - d.sourceX) ** 2 + (wy - d.sourceY) ** 2);
      if (srcDist < threshold) return entity;
    }

    return null;
  }

  _pointToSegmentDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  // ─── Helpers ─────────────────────────────────────────────────

  _darkenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
  }

  _computeHash(entity, allEntities) {
    const d = entity.data;
    let h = `${entity.id}_${d.sourceX|0}_${d.sourceY|0}_${this._seed}`;
    // Include terrain entity count + types as terrain changes affect the path
    for (const e of allEntities) {
      if (e.type === 'territory' && e.data.terrainType) {
        h += `_${e.id}_${e.data.terrainType}`;
      }
    }
    return h;
  }
}

export { RiverEngine };
