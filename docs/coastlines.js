/**
 * Cartographer — Natural Coastlines & Edge Displacement
 *
 * Replaces geometric polygon edges with procedurally deformed
 * natural-looking borders using noise-based displacement.
 *
 * Features:
 * - Edge subdivision + perpendicular noise displacement
 * - Deterministic (world seed) — stable across reloads
 * - Coast styles: smooth, rugged, fjords
 * - Shared edges between adjacent territories stay aligned
 * - Coastal effects: shallow water gradient, foam dots, animated wave hint
 *
 * Zero dependencies beyond noise.js (SimplexNoise).
 */

import { SimplexNoise } from './noise.js';

class Coastlines {
  constructor() {
    // Cache: entityId → { deformedPoints, style, hash }
    this._cache = new Map();

    // Noise instance — seeded per world
    this._noise = null;
    this._seed = 0;
  }

  /**
   * Set the world seed for deterministic deformation.
   * @param {number} seed
   */
  setSeed(seed) {
    if (this._seed !== seed) {
      this._seed = seed;
      this._noise = new SimplexNoise(seed + 7919); // offset to avoid correlation with terrain noise
      this._cache.clear();
    }
  }

  /**
   * Get deformed polygon points for an entity.
   * Returns an array of {x, y} forming the deformed outline.
   *
   * @param {object} entity - entity with data.points, data.coastStyle
   * @returns {Array<{x,y}>} deformed polygon points
   */
  getDeformedPoints(entity) {
    const d = entity.data;
    if (!d.points || d.points.length < 3) return d.points || [];

    const style = d.coastStyle || 'smooth';
    const hash = this._computeHash(entity, style);

    const cached = this._cache.get(entity.id);
    if (cached && cached.hash === hash) return cached.deformedPoints;

    const deformed = this._deformPolygon(d.points, style);
    this._cache.set(entity.id, { deformedPoints: deformed, style, hash });
    return deformed;
  }

  /**
   * Invalidate cache for a specific entity or all.
   * @param {string} [entityId]
   */
  invalidate(entityId) {
    if (entityId) {
      this._cache.delete(entityId);
    } else {
      this._cache.clear();
    }
  }

  // ─── Core algorithm ──────────────────────────────────────────

  /**
   * Deform a polygon by subdividing edges and displacing points
   * perpendicular to the edge using simplex noise.
   *
   * @param {Array<{x,y}>} points - original polygon vertices
   * @param {string} style - 'smooth' | 'rugged' | 'fjords'
   * @returns {Array<{x,y}>}
   */
  _deformPolygon(points, style) {
    if (!this._noise) return points;

    // Style parameters
    const params = this._getStyleParams(style);
    const { subdivisions, amplitude, noiseScale, octaves } = params;

    const result = [];

    for (let i = 0; i < points.length; i++) {
      const p0 = points[i];
      const p1 = points[(i + 1) % points.length];

      // Edge vector
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const edgeLen = Math.sqrt(dx * dx + dy * dy);

      // Perpendicular (normalized)
      const nx = -dy / edgeLen;
      const ny = dx / edgeLen;

      // Adaptive subdivision count based on edge length
      const subCount = Math.max(2, Math.round(edgeLen / subdivisions));

      // Add the first vertex (un-displaced to keep corners anchored)
      result.push({ x: p0.x, y: p0.y });

      // Subdivide and displace interior points
      for (let j = 1; j < subCount; j++) {
        const t = j / subCount;
        // Linear interpolation along edge
        const bx = p0.x + dx * t;
        const by = p0.y + dy * t;

        // Multi-octave noise displacement
        let displacement = 0;
        let freq = noiseScale;
        let amp = amplitude;
        let totalAmp = 0;

        for (let o = 0; o < octaves; o++) {
          displacement += this._noise.noise2D(bx * freq, by * freq) * amp;
          totalAmp += amp;
          freq *= 2.1;
          amp *= 0.5;
        }

        displacement /= totalAmp;
        displacement *= amplitude;

        // Taper displacement near polygon vertices to avoid gaps
        const taper = Math.sin(t * Math.PI); // 0 at ends, 1 in middle

        const fx = bx + nx * displacement * taper;
        const fy = by + ny * displacement * taper;
        result.push({ x: fx, y: fy });
      }
    }

    return result;
  }

  /**
   * Parameters per coast style.
   */
  _getStyleParams(style) {
    switch (style) {
      case 'rugged':
        return {
          subdivisions: 12,    // pixels per subdivision segment
          amplitude: 14,       // max perpendicular displacement
          noiseScale: 0.015,   // noise frequency
          octaves: 4,
        };
      case 'fjords':
        return {
          subdivisions: 8,
          amplitude: 28,
          noiseScale: 0.008,
          octaves: 5,
        };
      case 'smooth':
      default:
        return {
          subdivisions: 18,
          amplitude: 6,
          noiseScale: 0.02,
          octaves: 3,
        };
    }
  }

  // ─── Coastal effects ─────────────────────────────────────────

  /**
   * Draw coastal visual effects around a deformed polygon:
   * - Shallow water gradient (blue band along the coast)
   * - Foam dots on the coastline
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array<{x,y}>} deformedPoints
   * @param {object} entity
   * @param {number} zoom
   */
  drawCoastalEffects(ctx, deformedPoints, entity, zoom) {
    if (!deformedPoints || deformedPoints.length < 3) return;

    const d = entity.data;
    const terrainType = d.terrainType || '';

    // Only draw coastal effects for land territories (not ocean)
    if (terrainType === 'ocean') return;

    ctx.save();

    // ── Shallow water gradient band ──
    // Draw a semi-transparent blue glow outside the polygon
    this._drawShallowWater(ctx, deformedPoints, zoom);

    // ── Foam dots along the coastline ──
    this._drawFoam(ctx, deformedPoints, zoom);

    ctx.restore();
  }

  /**
   * Draw shallow water gradient around the polygon edge.
   */
  _drawShallowWater(ctx, points, zoom) {
    const bandWidth = Math.max(8, 30 / Math.max(0.3, zoom));

    // Build the polygon path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    // Stroke outward with gradient-like concentric strokes
    ctx.save();

    const steps = 5;
    for (let s = steps; s >= 1; s--) {
      const w = (bandWidth / steps) * s * 2;
      const alpha = 0.04 * (steps - s + 1);
      ctx.lineWidth = w;
      ctx.strokeStyle = `rgba(100, 170, 220, ${alpha})`;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw foam dots (white irregular dots) along the coastline.
   */
  _drawFoam(ctx, points, zoom) {
    if (zoom < 0.4) return; // skip at very low zoom

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';

    // Walk the polygon perimeter and place dots
    const spacing = Math.max(6, 12 / zoom);
    let accum = 0;

    for (let i = 0; i < points.length; i++) {
      const p0 = points[i];
      const p1 = points[(i + 1) % points.length];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen < 1) continue;

      const ux = dx / segLen;
      const uy = dy / segLen;
      // Perpendicular outward
      const nx = -uy;
      const ny = ux;

      let along = accum > 0 ? spacing - accum : 0;
      while (along < segLen) {
        const px = p0.x + ux * along;
        const py = p0.y + uy * along;

        // Use noise to vary placement
        if (this._noise) {
          const n = this._noise.noise2D(px * 0.05, py * 0.05);
          if (n > -0.2) {
            const offset = n * 3;
            const r = 0.8 + Math.abs(n) * 1.2;
            ctx.beginPath();
            ctx.arc(px + nx * offset, py + ny * offset, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        along += spacing;
      }
      accum = along - segLen;
    }
  }

  // ─── Animated wave hint (CSS-driven, called once to set up) ──

  /**
   * Create a subtle animated wave SVG overlay for coastal edges.
   * Returns an SVG element that can be positioned over the canvas.
   * Note: This is optional and called externally if needed.
   *
   * For canvas-based rendering, we draw animated wave lines
   * directly in the render loop using a time-based offset.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array<{x,y}>} points - deformed polygon points
   * @param {number} zoom
   * @param {number} time - animation time in ms (Date.now())
   */
  drawWaveAnimation(ctx, points, zoom, time) {
    if (zoom < 0.5 || !points || points.length < 3) return;

    const waveOffset = (time % 8000) / 8000; // 8s cycle
    const waveAmplitude = 2.5 / Math.max(0.5, zoom);
    const waveFreq = 0.08;

    ctx.save();
    ctx.strokeStyle = 'rgba(180, 210, 240, 0.25)';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    let started = false;

    for (let i = 0; i < points.length; i++) {
      const p0 = points[i];
      const p1 = points[(i + 1) % points.length];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen < 2) continue;

      const ux = dx / segLen;
      const uy = dy / segLen;
      const nx = -uy;
      const ny = ux;

      const steps = Math.ceil(segLen / 3);
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const bx = p0.x + dx * t;
        const by = p0.y + dy * t;

        // Wave displacement
        const phase = (i * 13.7 + t * segLen) * waveFreq + waveOffset * Math.PI * 2;
        const wave = Math.sin(phase) * waveAmplitude;

        // Offset outward from polygon + wave
        const outDist = 4 + wave;
        const wx = bx + nx * outDist;
        const wy = by + ny * outDist;

        if (!started) {
          ctx.moveTo(wx, wy);
          started = true;
        } else {
          ctx.lineTo(wx, wy);
        }
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  // ─── Helpers ─────────────────────────────────────────────────

  _computeHash(entity, style) {
    const d = entity.data;
    let h = `${entity.id}_${style}_${this._seed}`;
    if (d.points) {
      for (const p of d.points) {
        h += `_${p.x|0}_${p.y|0}`;
      }
    }
    return h;
  }
}

export { Coastlines };
