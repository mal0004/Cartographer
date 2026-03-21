/**
 * Cartographer — Procedural Vegetation & Biomes
 *
 * Generates terrain-aware vegetation overlays:
 * - Forests: procedural trees (broadleaf canopy / conifer triangles)
 * - Prairies: light green hatching + scattered vegetation dots
 * - Desert: stylized cacti + rock clusters
 * - Snow/Tundra: ice crystals + bluish texture at high elevation
 *
 * Vegetation type is determined by territory terrain type + elevation.
 * Density is controlled by noise (natural clearings) + user slider.
 *
 * Zero dependencies beyond noise.js (SimplexNoise).
 */

/* global SimplexNoise */

class VegetationRenderer {
  constructor() {
    // Cache: entityId → { canvas, hash }
    this._cache = new Map();
    this._noise = null;
    this._seed = 0;
  }

  /**
   * Set the world seed.
   */
  setSeed(seed) {
    if (this._seed !== seed) {
      this._seed = seed;
      this._noise = new SimplexNoise(seed + 24571);
      this._cache.clear();
    }
  }

  /**
   * Render vegetation overlay for a territory entity.
   * Returns an offscreen canvas or null.
   *
   * @param {object} entity
   * @param {object} terrainRenderer - for elevation data
   * @param {number} zoom
   * @returns {{ canvas: HTMLCanvasElement, bbox: object } | null}
   */
  getVegetationOverlay(entity, terrainRenderer, zoom) {
    const d = entity.data;
    if (!d.points || d.points.length < 3) return null;

    const terrainType = d.terrainType || '';
    if (!terrainType) return null;

    // LOD: skip vegetation at very low zoom
    if (zoom < 0.4) return null;

    const density = (d.vegetationDensity ?? 50) / 100;
    if (density <= 0) return null;

    const hash = this._computeHash(entity, zoom, density);
    const cached = this._cache.get(entity.id);
    if (cached && cached.hash === hash) return cached;

    const bbox = this._getBBox(d.points);
    const padding = 10;
    bbox.x -= padding;
    bbox.y -= padding;
    bbox.w += padding * 2;
    bbox.h += padding * 2;

    // Scale based on zoom LOD
    const lodScale = zoom > 1.5 ? 1.0 : zoom > 0.8 ? 0.7 : 0.5;
    const maxDim = 512;
    const scale = Math.min(maxDim / bbox.w, maxDim / bbox.h, lodScale);
    const w = Math.max(16, Math.ceil(bbox.w * scale));
    const h = Math.max(16, Math.ceil(bbox.h * scale));

    // Build local polygon
    const polygon = d.points.map(p => ({
      x: (p.x - bbox.x) * scale,
      y: (p.y - bbox.y) * scale,
    }));

    // Get elevation sampler from terrain cache
    const elevFn = this._buildElevationFn(entity, terrainRenderer, bbox, scale);

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Clip to polygon
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) ctx.lineTo(polygon[i].x, polygon[i].y);
    ctx.closePath();
    ctx.clip();

    // Generate vegetation based on terrain type
    const seed = d.terrainSeed ?? (entity.id * 7919);
    const vegNoise = new SimplexNoise(seed + 5003);

    switch (terrainType) {
      case 'plain':
        this._renderPrairie(ctx, w, h, vegNoise, density, elevFn);
        break;
      case 'hills':
        this._renderForest(ctx, w, h, vegNoise, density, elevFn, 'mixed', scale);
        break;
      case 'mountain':
        this._renderMountainVeg(ctx, w, h, vegNoise, density, elevFn, scale);
        break;
      case 'desert':
        this._renderDesert(ctx, w, h, vegNoise, density, elevFn, scale);
        break;
      case 'marsh':
        this._renderMarsh(ctx, w, h, vegNoise, density, elevFn, scale);
        break;
      // ocean: no vegetation
    }

    ctx.restore();

    const result = { canvas, bbox, hash };
    this._cache.set(entity.id, result);
    return result;
  }

  /**
   * Invalidate cache.
   */
  invalidate(entityId) {
    if (entityId) {
      this._cache.delete(entityId);
    } else {
      this._cache.clear();
    }
  }

  // ─── Prairie / Plains ────────────────────────────────────────

  _renderPrairie(ctx, w, h, noise, density, elevFn) {
    // Light green hatching with variable direction
    const spacing = Math.max(4, 10 * (1 - density * 0.5));

    ctx.strokeStyle = 'rgba(100, 160, 60, 0.12)';
    ctx.lineWidth = 0.8;

    for (let y = 0; y < h; y += spacing) {
      for (let x = 0; x < w; x += spacing) {
        const n = noise.noise2D(x * 0.05, y * 0.05);
        if (n < -0.3) continue; // clearings

        const angle = noise.noise2D(x * 0.02, y * 0.02) * Math.PI * 0.3;
        const len = spacing * 0.7;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
      }
    }

    // Scattered vegetation dots
    ctx.fillStyle = 'rgba(80, 140, 50, 0.15)';
    const dotSpacing = Math.max(6, 14 * (1 - density * 0.5));

    for (let y = 0; y < h; y += dotSpacing) {
      for (let x = 0; x < w; x += dotSpacing) {
        const n = noise.noise2D(x * 0.08, y * 0.08);
        if (n > 0.1) {
          const r = 1 + n * 2;
          ctx.beginPath();
          ctx.arc(x + n * 3, y + noise.noise2D(y * 0.08, x * 0.08) * 3, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // ─── Forest (hills) ──────────────────────────────────────────

  _renderForest(ctx, w, h, noise, density, elevFn, style, scale) {
    const treeSpacing = Math.max(5, 12 * (1 - density * 0.6));

    for (let y = treeSpacing; y < h - treeSpacing; y += treeSpacing) {
      for (let x = treeSpacing; x < w - treeSpacing; x += treeSpacing) {
        const n = noise.noise2D(x * 0.04, y * 0.04);
        // Density gate: creates natural clearings
        if (n < -0.2 * density) continue;

        const elev = elevFn(x, y);

        // Jitter position
        const jx = x + noise.noise2D(x * 0.1, y * 0.1) * treeSpacing * 0.4;
        const jy = y + noise.noise2D(y * 0.1, x * 0.1) * treeSpacing * 0.4;

        // Size varies with noise + position (edge trees larger, interior smaller)
        const edgeDist = this._edgeDistance(jx, jy, w, h);
        const isEdge = edgeDist < treeSpacing * 3;
        const baseSize = isEdge ? 4.5 : 3;
        const size = baseSize + Math.abs(n) * 2;

        // Choose tree type based on elevation
        if (elev > 0.7) {
          this._drawConifer(ctx, jx, jy, size, 0.6);
        } else {
          this._drawBroadleaf(ctx, jx, jy, size, 0.5);
        }
      }
    }
  }

  // ─── Mountain vegetation ─────────────────────────────────────

  _renderMountainVeg(ctx, w, h, noise, density, elevFn, scale) {
    const spacing = Math.max(6, 14 * (1 - density * 0.5));

    for (let y = spacing; y < h - spacing; y += spacing) {
      for (let x = spacing; x < w - spacing; x += spacing) {
        const n = noise.noise2D(x * 0.04, y * 0.04);
        if (n < -0.15 * density) continue;

        const elev = elevFn(x, y);

        const jx = x + noise.noise2D(x * 0.1, y * 0.1) * spacing * 0.3;
        const jy = y + noise.noise2D(y * 0.1, x * 0.1) * spacing * 0.3;

        if (elev > 0.85) {
          // Snow zone: ice crystals
          this._drawSnowCrystal(ctx, jx, jy, 2 + Math.abs(n) * 2);
        } else if (elev > 0.65) {
          // Alpine zone: sparse small conifers
          if (n > 0.1) {
            this._drawConifer(ctx, jx, jy, 2.5 + Math.abs(n), 0.4);
          }
        } else {
          // Lower slopes: mixed forest
          if (n > -0.05) {
            const size = 3 + Math.abs(n) * 1.5;
            if (elev > 0.5) {
              this._drawConifer(ctx, jx, jy, size, 0.5);
            } else {
              this._drawBroadleaf(ctx, jx, jy, size, 0.4);
            }
          }
        }
      }
    }
  }

  // ─── Desert ──────────────────────────────────────────────────

  _renderDesert(ctx, w, h, noise, density, elevFn, scale) {
    const spacing = Math.max(12, 30 * (1 - density * 0.5));

    for (let y = spacing; y < h - spacing; y += spacing) {
      for (let x = spacing; x < w - spacing; x += spacing) {
        const n = noise.noise2D(x * 0.03, y * 0.03);

        const jx = x + noise.noise2D(x * 0.08, y * 0.08) * spacing * 0.4;
        const jy = y + noise.noise2D(y * 0.08, x * 0.08) * spacing * 0.4;

        if (n > 0.3) {
          // Cactus
          this._drawCactus(ctx, jx, jy, 3 + Math.abs(n) * 3);
        } else if (n > 0.05) {
          // Rock cluster
          this._drawRockCluster(ctx, jx, jy, noise, 2 + Math.abs(n) * 2);
        }
      }
    }
  }

  // ─── Marsh ───────────────────────────────────────────────────

  _renderMarsh(ctx, w, h, noise, density, elevFn, scale) {
    const spacing = Math.max(5, 10 * (1 - density * 0.5));

    for (let y = spacing; y < h; y += spacing) {
      for (let x = spacing; x < w; x += spacing) {
        const n = noise.noise2D(x * 0.05, y * 0.05);

        const jx = x + noise.noise2D(x * 0.1, y * 0.1) * spacing * 0.3;
        const jy = y + noise.noise2D(y * 0.1, x * 0.1) * spacing * 0.3;

        if (n > 0.2) {
          // Reeds: thin vertical hatching
          this._drawReeds(ctx, jx, jy, 3 + Math.abs(n) * 3);
        } else if (n < -0.2) {
          // Small ponds: irregular circles
          this._drawPond(ctx, jx, jy, 2 + Math.abs(n) * 3);
        }
      }
    }
  }

  // ─── Tree drawing primitives ─────────────────────────────────

  /**
   * Draw a broadleaf tree (circle canopy).
   */
  _drawBroadleaf(ctx, x, y, size, opacity) {
    // Trunk
    ctx.fillStyle = `rgba(80, 60, 30, ${opacity * 0.6})`;
    ctx.fillRect(x - 0.5, y, 1, size * 0.5);

    // Canopy: circle
    ctx.fillStyle = `rgba(50, 120, 30, ${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y - size * 0.1, size * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = `rgba(90, 160, 50, ${opacity * 0.4})`;
    ctx.beginPath();
    ctx.arc(x - size * 0.15, y - size * 0.25, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw a conifer tree (triangle).
   */
  _drawConifer(ctx, x, y, size, opacity) {
    // Trunk
    ctx.fillStyle = `rgba(70, 50, 25, ${opacity * 0.6})`;
    ctx.fillRect(x - 0.5, y, 1, size * 0.3);

    // Triangle canopy
    ctx.fillStyle = `rgba(30, 90, 40, ${opacity})`;
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.8);
    ctx.lineTo(x - size * 0.4, y + size * 0.1);
    ctx.lineTo(x + size * 0.4, y + size * 0.1);
    ctx.closePath();
    ctx.fill();
  }

  // ─── Snow / Tundra ───────────────────────────────────────────

  /**
   * Draw a stylized snow crystal.
   */
  _drawSnowCrystal(ctx, x, y, size) {
    ctx.strokeStyle = 'rgba(180, 210, 240, 0.35)';
    ctx.lineWidth = 0.6;

    // 6-pointed star
    for (let a = 0; a < 6; a++) {
      const angle = (a / 6) * Math.PI * 2;
      const ex = x + Math.cos(angle) * size;
      const ey = y + Math.sin(angle) * size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Small branch
      const mx = x + Math.cos(angle) * size * 0.6;
      const my = y + Math.sin(angle) * size * 0.6;
      const branchAngle1 = angle + Math.PI / 6;
      const branchAngle2 = angle - Math.PI / 6;
      const bl = size * 0.3;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(branchAngle1) * bl, my + Math.sin(branchAngle1) * bl);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(branchAngle2) * bl, my + Math.sin(branchAngle2) * bl);
      ctx.stroke();
    }
  }

  // ─── Desert primitives ──────────────────────────────────────

  /**
   * Draw a stylized cactus (3-5 arms).
   */
  _drawCactus(ctx, x, y, size) {
    ctx.strokeStyle = 'rgba(60, 120, 50, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';

    // Main trunk
    const trunkH = size * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - trunkH);
    ctx.stroke();

    // Arms (2-3)
    const armCount = 2 + Math.floor(Math.abs(this._noise ? this._noise.noise2D(x * 0.3, y * 0.3) : 0) * 2);
    for (let a = 0; a < armCount; a++) {
      const armY = y - trunkH * (0.3 + a * 0.25);
      const dir = a % 2 === 0 ? 1 : -1;
      const armLen = size * 0.6;
      const armUp = size * 0.5;

      ctx.beginPath();
      ctx.moveTo(x, armY);
      ctx.lineTo(x + dir * armLen, armY);
      ctx.lineTo(x + dir * armLen, armY - armUp);
      ctx.stroke();
    }

    ctx.lineCap = 'butt';
  }

  /**
   * Draw a cluster of rock ellipses.
   */
  _drawRockCluster(ctx, x, y, noise, size) {
    ctx.fillStyle = 'rgba(140, 120, 90, 0.25)';

    const count = 2 + Math.floor(Math.abs(noise.noise2D(x * 0.2, y * 0.2)) * 3);
    for (let i = 0; i < count; i++) {
      const ox = noise.noise2D(x * 0.3 + i, y * 0.3) * size * 1.5;
      const oy = noise.noise2D(y * 0.3 + i, x * 0.3) * size;
      const rx = size * (0.5 + Math.abs(noise.noise2D(i * 7, x * 0.1)) * 0.5);
      const ry = rx * 0.6;

      ctx.beginPath();
      ctx.ellipse(x + ox, y + oy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── Marsh primitives ───────────────────────────────────────

  /**
   * Draw reed/rushes: thin vertical lines.
   */
  _drawReeds(ctx, x, y, height) {
    ctx.strokeStyle = 'rgba(60, 100, 50, 0.3)';
    ctx.lineWidth = 0.5;

    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const ox = (i - count / 2) * 1.5;
      const h = height * (0.7 + Math.random() * 0.3);
      ctx.beginPath();
      ctx.moveTo(x + ox, y);
      ctx.lineTo(x + ox + (Math.random() - 0.5) * 1.5, y - h);
      ctx.stroke();
    }
  }

  /**
   * Draw a small irregular pond.
   */
  _drawPond(ctx, x, y, size) {
    ctx.fillStyle = 'rgba(70, 120, 100, 0.2)';
    ctx.beginPath();
    // Slightly irregular ellipse
    ctx.ellipse(x, y, size * 1.2, size * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(120, 170, 160, 0.12)';
    ctx.beginPath();
    ctx.ellipse(x - size * 0.2, y - size * 0.15, size * 0.5, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── Helpers ─────────────────────────────────────────────────

  _buildElevationFn(entity, terrainRenderer, bbox, scale) {
    if (!terrainRenderer) return () => 0.5;

    const cached = terrainRenderer._cache.get(entity.id);
    if (!cached || !cached.canvas) return () => 0.5;

    const tc = cached.canvas;
    let tData;
    try {
      const tCtx = tc.getContext('2d');
      tData = tCtx.getImageData(0, 0, tc.width, tc.height).data;
    } catch (e) {
      return () => 0.5;
    }

    return (lx, ly) => {
      // lx, ly are in local scaled coords; map to terrain canvas coords
      const wx = bbox.x + (lx / scale);
      const wy = bbox.y + (ly / scale);

      const tb = cached.bbox;
      if (!tb) return 0.5;
      const tx = Math.floor(((wx - tb.x) / tb.w) * tc.width);
      const ty = Math.floor(((wy - tb.y) / tb.h) * tc.height);
      if (tx < 0 || tx >= tc.width || ty < 0 || ty >= tc.height) return 0.5;

      const idx = (ty * tc.width + tx) * 4;
      if (tData[idx + 3] < 10) return 0.5;
      return (tData[idx] * 0.299 + tData[idx + 1] * 0.587 + tData[idx + 2] * 0.114) / 255;
    };
  }

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

  _edgeDistance(x, y, w, h) {
    return Math.min(x, y, w - x, h - y);
  }

  _computeHash(entity, zoom, density) {
    const d = entity.data;
    const lod = zoom > 1.5 ? 'hi' : zoom > 0.8 ? 'med' : 'lo';
    return `${entity.id}_${d.terrainType}_${d.terrainSeed || ''}_${lod}_${(density * 100) | 0}_${this._seed}`;
  }
}

window.VegetationRenderer = VegetationRenderer;
