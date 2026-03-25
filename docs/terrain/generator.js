/**
 * Cartographer — World Generator
 *
 * Procedural continent generation: heightmap, landmass extraction,
 * biome assignment, rivers, and entity placement.
 */

import { SimplexNoise } from '../noise.js';

const PREFIXES = [
  'Val','Mor','Kar','Ash','Bel','Dun','El','Fal','Gor','Hal',
  'Ith','Lor','Mar','Nor','Ost','Por','Ral','Sal','Tor','Wyn',
];
const SUFFIXES = [
  'dris','math','rath','heim','ford','vale','mont','haven',
  'keep','fell','moor','wick','gate','hold','mere','crest','mark','bridge',
];

export class WorldGenerator {
  constructor(seed, w, h) {
    this.seed = seed ?? Math.floor(Math.random() * 100000);
    this.w = w || 200;
    this.h = h || 150;
    this.noise = new SimplexNoise(this.seed);
    this._rng = this.seed;
  }

  _seededRandom() {
    this._rng = (this._rng * 1664525 + 1013904223) & 0x7fffffff;
    return this._rng / 0x7fffffff;
  }

  generate() {
    const heightmap = this.generateHeightmap();
    const territories = this.extractLandmasses(heightmap);
    this.assignBiomes(territories, heightmap);
    const rivers = this.generateRivers(territories, heightmap);
    const entities = this.placeEntities(territories, rivers);
    return { seed: this.seed, territories, rivers, entities, routes: [] };
  }

  generateHeightmap() {
    const { w, h, noise } = this;
    const hm = new Float32Array(w * h);
    const cx = w / 2, cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    let min = Infinity, max = -Infinity;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = noise.noise2D(x * 0.04, y * 0.04) * 0.5
                + noise.noise2D(x * 0.08, y * 0.08) * 0.3
                + noise.noise2D(x * 0.16, y * 0.16) * 0.2;
        const dx = (x - cx) / cx, dy = (y - cy) / cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        val *= Math.max(0, 1 - Math.pow(dist, 1.5));
        hm[y * w + x] = val;
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }
    const range = max - min || 1;
    for (let i = 0; i < hm.length; i++) hm[i] = (hm[i] - min) / range;
    return hm;
  }

  extractLandmasses(heightmap) {
    const { w, h } = this;
    const threshold = 0.45;
    const visited = new Uint8Array(w * h);
    const masses = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (visited[idx] || heightmap[idx] < threshold) continue;
        const cells = [];
        const queue = [idx];
        visited[idx] = 1;
        while (queue.length > 0) {
          const ci = queue.pop();
          cells.push(ci);
          const cx = ci % w, cy = (ci - cx) / w;
          for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const ni = ny * w + nx;
            if (!visited[ni] && heightmap[ni] >= threshold) {
              visited[ni] = 1;
              queue.push(ni);
            }
          }
        }
        masses.push(cells);
      }
    }

    masses.sort((a, b) => b.length - a.length);
    const kept = masses.slice(0, 3).filter(m => m.length > 20);
    return kept.map(cells => this._cellsToTerritory(cells, heightmap));
  }

  _cellsToTerritory(cells, heightmap) {
    const { w } = this;
    const scale = 5;
    const edge = new Set();
    for (const ci of cells) {
      const cx = ci % w, cy = (ci - cx) / w;
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const ni = (cy + dy) * w + (cx + dx);
        if (!cells.includes(ni) || cx + dx < 0 || cx + dx >= w) {
          edge.add(ci); break;
        }
      }
    }
    const edgeArr = [...edge];
    const points = this._orderEdge(edgeArr, w);
    const scaled = points.map(ci => ({
      x: (ci % w) * scale + 100,
      y: Math.floor(ci / w) * scale + 100,
    }));
    const simplified = this._simplifyPoints(scaled, 8);
    const smooth = this._chaikin(simplified, 3);

    let elevSum = 0;
    for (const ci of cells) elevSum += heightmap[ci];
    const avgElev = elevSum / cells.length;

    return {
      type: 'territory',
      name: this.generateName(),
      data: {
        points: smooth,
        color: '#8B7355',
        ruler: '',
        capitalName: '',
        resources: [],
        description: '',
        terrainType: 'plains',
        terrainSeed: Math.floor(this._seededRandom() * 100000),
        terrainIntensity: 50,
      },
      _cells: cells,
      _avgElev: avgElev,
    };
  }

  _orderEdge(edgeIndices, w) {
    if (edgeIndices.length === 0) return [];
    const set = new Set(edgeIndices);
    const ordered = [edgeIndices[0]];
    set.delete(edgeIndices[0]);
    while (set.size > 0) {
      const last = ordered[ordered.length - 1];
      const lx = last % w, ly = Math.floor(last / w);
      let best = -1, bestDist = Infinity;
      for (const ci of set) {
        const cx = ci % w, cy = Math.floor(ci / w);
        const d = Math.abs(cx - lx) + Math.abs(cy - ly);
        if (d < bestDist) { bestDist = d; best = ci; }
      }
      if (best < 0) break;
      ordered.push(best);
      set.delete(best);
    }
    return ordered;
  }

  _simplifyPoints(pts, tolerance) {
    if (pts.length <= 2) return pts;
    const result = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const last = result[result.length - 1];
      const dx = pts[i].x - last.x, dy = pts[i].y - last.y;
      if (dx * dx + dy * dy > tolerance * tolerance) result.push(pts[i]);
    }
    return result;
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

  assignBiomes(territories, heightmap) {
    const { w, noise } = this;
    for (const t of territories) {
      const e = t._avgElev;
      const cells = t._cells;
      const isCoastal = cells.some(ci => {
        const cx = ci % w, cy = Math.floor(ci / w);
        for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const ni = (cy + dy) * w + (cx + dx);
          if (heightmap[ni] !== undefined && heightmap[ni] < 0.45) return true;
        }
        return false;
      });

      if (e > 0.70) {
        t.data.terrainType = 'mountain';
        t.data.color = '#8B8682';
      } else if (e > 0.55) {
        t.data.terrainType = 'hills';
        t.data.color = '#A0926B';
      } else if (isCoastal && e < 0.50 && this._seededRandom() < 0.3) {
        t.data.terrainType = 'marsh';
        t.data.color = '#5B7B5B';
      } else if (noise.noise2D(e * 10, this.seed * 0.01) > 0.3) {
        t.data.terrainType = 'desert';
        t.data.color = '#C4A35A';
      } else if (this._seededRandom() > 0.5) {
        t.data.terrainType = 'plain';
        t.data.color = '#8B9B6B';
      } else {
        t.data.terrainType = 'plain';
        t.data.color = '#6B8B6B';
      }
    }
  }

  generateRivers(territories, heightmap) {
    const { w, h } = this;
    const rivers = [];
    const sources = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (heightmap[y * w + x] > 0.65) sources.push({ x, y, elev: heightmap[y * w + x] });
      }
    }
    sources.sort((a, b) => b.elev - a.elev);
    const picked = sources.slice(0, Math.min(3, sources.length));
    const scale = 5;

    for (const src of picked) {
      const path = [];
      let cx = src.x, cy = src.y;
      for (let step = 0; step < 200; step++) {
        path.push({ x: cx * scale + 100, y: cy * scale + 100 });
        if (heightmap[cy * w + cx] < 0.45) break;
        let bestX = cx, bestY = cy, bestE = heightmap[cy * w + cx];
        for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (heightmap[ny * w + nx] < bestE) {
            bestE = heightmap[ny * w + nx];
            bestX = nx; bestY = ny;
          }
        }
        if (bestX === cx && bestY === cy) break;
        cx = bestX; cy = bestY;
      }
      if (path.length > 3) {
        rivers.push({
          type: 'river',
          name: this.generateName(),
          data: { sourceX: path[0].x, sourceY: path[0].y, color: '#6B8FA8', widthScale: 1.0, path },
        });
      }
    }
    return rivers;
  }

  placeEntities(territories, rivers) {
    const entities = [];
    if (territories.length === 0) return entities;

    const mainT = territories[0];
    const pts = mainT.data.points;
    const center = this._centroid(pts);

    entities.push({
      type: 'city',
      name: this.generateName(),
      data: {
        x: center.x, y: center.y,
        importance: 'capital',
        color: '#8B2635',
        labelOffsetX: 12, labelOffsetY: -8,
        population: 0, founded: '', description: '',
      },
    });

    const coastPts = pts.filter((_, i) => i % Math.max(1, Math.floor(pts.length / 6)) === 0);
    const cityCount = 2 + Math.floor(this._seededRandom() * 2);
    for (let i = 0; i < Math.min(cityCount, coastPts.length); i++) {
      const p = coastPts[i];
      entities.push({
        type: 'city',
        name: this.generateName(),
        data: {
          x: p.x + (this._seededRandom() - 0.5) * 40,
          y: p.y + (this._seededRandom() - 0.5) * 40,
          importance: 'city',
          color: '#8B2635',
          labelOffsetX: 12, labelOffsetY: -8,
          population: 0, founded: '', description: '',
        },
      });
    }

    for (const t of territories.slice(0, 3)) {
      const c = this._centroid(t.data.points);
      const off = 30 + this._seededRandom() * 50;
      entities.push({
        type: 'city',
        name: this.generateName(),
        data: {
          x: c.x + off, y: c.y + off,
          importance: 'village',
          color: '#8B2635',
          labelOffsetX: 12, labelOffsetY: -8,
          population: 0, founded: '', description: '',
        },
      });
    }

    return entities;
  }

  _centroid(pts) {
    let sx = 0, sy = 0;
    for (const p of pts) { sx += p.x; sy += p.y; }
    return { x: sx / pts.length, y: sy / pts.length };
  }

  generateName() {
    const pi = Math.floor(this._seededRandom() * PREFIXES.length);
    const si = Math.floor(this._seededRandom() * SUFFIXES.length);
    return PREFIXES[pi] + SUFFIXES[si];
  }
}
