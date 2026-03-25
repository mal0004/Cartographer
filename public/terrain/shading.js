/**
 * Cartographer — Terrain Shading
 *
 * Dramatic lighting from NW (315°, 35° elevation).
 * Sobel filter for slope detection, mountain faces, desert dunes.
 */

import { SimplexNoise } from '../noise.js';

const LIGHT_DIR = { x: -0.707, y: -0.707 }; // NW 315°
const LIGHT_ELEV = Math.tan(35 * Math.PI / 180);

export class TerrainShading {
  constructor() {
    this.noise = new SimplexNoise(42);
  }

  renderShading(ctx, territory, heightmap) {
    if (!territory.data.points || territory.data.points.length < 3) return;
    const terrainType = territory.data.terrainType || '';
    if (terrainType === 'mountain' || terrainType === 'hills') {
      this.renderMountainFaces(ctx, territory);
    }
    if (terrainType === 'desert') {
      this.renderDesertShading(ctx, territory);
    }
    this._renderGeneralShading(ctx, territory);
  }

  _renderGeneralShading(ctx, territory) {
    const pts = territory.data.points;
    if (!pts || pts.length < 3) return;
    const bbox = this._bbox(pts);
    const step = 12;

    ctx.save();
    this._clipToTerritory(ctx, pts);

    for (let y = bbox.minY; y < bbox.maxY; y += step) {
      for (let x = bbox.minX; x < bbox.maxX; x += step) {
        const n = this.noise.noise2D(x * 0.01, y * 0.01);
        const slope = this.noise.noise2D(x * 0.02 + 50, y * 0.02 + 50);
        const dot = n * LIGHT_DIR.x + slope * LIGHT_DIR.y;

        if (dot > 0.3) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(x, y, step, step);
        } else if (dot < -0.2) {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(x, y, step, step);
        }
      }
    }
    ctx.restore();
  }

  renderMountainFaces(ctx, territory) {
    const pts = territory.data.points;
    if (!pts || pts.length < 3) return;
    const bbox = this._bbox(pts);
    const seed = territory.data.terrainSeed || 0;
    const noise = new SimplexNoise(seed);

    ctx.save();
    this._clipToTerritory(ctx, pts);

    const peaks = [];
    const step = 30;
    for (let y = bbox.minY; y < bbox.maxY; y += step) {
      for (let x = bbox.minX; x < bbox.maxX; x += step) {
        const val = noise.noise2D(x * 0.015, y * 0.015);
        if (val > 0.35) peaks.push({ x, y, h: val });
      }
    }

    for (const peak of peaks) {
      const size = peak.h * 20 + 8;
      ctx.fillStyle = 'rgba(40,35,30,0.35)';
      ctx.beginPath();
      ctx.moveTo(peak.x, peak.y - size);
      ctx.lineTo(peak.x + size * 0.6, peak.y + size * 0.3);
      ctx.lineTo(peak.x + size * 0.1, peak.y + size * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255,250,240,0.15)';
      ctx.beginPath();
      ctx.moveTo(peak.x, peak.y - size);
      ctx.lineTo(peak.x - size * 0.5, peak.y + size * 0.3);
      ctx.lineTo(peak.x - size * 0.05, peak.y + size * 0.1);
      ctx.closePath();
      ctx.fill();

      // Ridge line
      ctx.strokeStyle = 'rgba(40,35,30,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(peak.x, peak.y - size);
      ctx.lineTo(peak.x, peak.y + size * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderDesertShading(ctx, territory) {
    const pts = territory.data.points;
    if (!pts || pts.length < 3) return;
    const bbox = this._bbox(pts);
    const seed = territory.data.terrainSeed || 0;
    const noise = new SimplexNoise(seed + 100);

    ctx.save();
    this._clipToTerritory(ctx, pts);

    const step = 15;
    for (let y = bbox.minY; y < bbox.maxY; y += step) {
      for (let x = bbox.minX; x < bbox.maxX; x += step) {
        const dune = noise.noise2D(x * 0.02, y * 0.01);
        if (dune > 0.1) {
          ctx.fillStyle = 'rgba(255,220,150,0.2)';
          ctx.fillRect(x, y, step, step);
        } else if (dune < -0.1) {
          ctx.fillStyle = 'rgba(180,120,50,0.2)';
          ctx.fillRect(x, y, step, step);
        }
      }
    }
    ctx.restore();
  }

  _bbox(pts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }

  _clipToTerritory(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.clip();
  }
}
