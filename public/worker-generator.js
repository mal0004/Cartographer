/**
 * Cartographer — World Generator Worker
 *
 * Runs WorldGenerator off the main thread.
 * Posts progress messages for each generation step.
 *
 * Messages IN:  { type: 'generate', seed, w, h }
 * Messages OUT: { type: 'progress', step, total, key }
 *               { type: 'done', world }
 *               { type: 'error', message }
 */

// ─── Inline SimplexNoise ─────────────────────────────────

class SimplexNoise {
  constructor(seed) {
    this.seed = seed || 0;
    this._perm = new Uint8Array(512);
    this._permMod12 = new Uint8Array(512);
    this._buildPermutation();
  }
  _buildPermutation() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = this.seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const j = ((s >>> 0) % (i + 1));
      const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this._perm[i] = p[i & 255];
      this._permMod12[i] = this._perm[i] % 12;
    }
  }
  noise2D(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const grad3 = SimplexNoise._grad3;
    const perm = this._perm;
    const permMod12 = this._permMod12;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2, y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255, jj = j & 255;
    const gi0 = permMod12[ii + perm[jj]];
    const gi1 = permMod12[ii + i1 + perm[jj + j1]];
    const gi2 = permMod12[ii + 1 + perm[jj + 1]];
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * (grad3[gi0*3]*x0 + grad3[gi0*3+1]*y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * (grad3[gi1*3]*x1 + grad3[gi1*3+1]*y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * (grad3[gi2*3]*x2 + grad3[gi2*3+1]*y2); }
    return 70.0 * (n0 + n1 + n2);
  }
}
SimplexNoise._grad3 = new Float32Array([
  1,1,0, -1,1,0, 1,-1,0, -1,-1,0,
  1,0,1, -1,0,1, 1,0,-1, -1,0,-1,
  0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1,
]);

// ─── Name generation ─────────────────────────────────────

const PREFIXES = [
  'Val','Mor','Kar','Ash','Bel','Dun','El','Fal','Gor','Hal',
  'Ith','Lor','Mar','Nor','Ost','Por','Ral','Sal','Tor','Wyn',
];
const SUFFIXES = [
  'dris','math','rath','heim','ford','vale','mont','haven',
  'keep','fell','moor','wick','gate','hold','mere','crest','mark','bridge',
];

// ─── World Generator (inlined for worker) ────────────────

class WorldGenerator {
  constructor(seed, w, h) {
    this.seed = seed ?? Math.floor(Math.random() * 100000);
    this.w = w || 100;
    this.h = h || 75;
    this.noise = new SimplexNoise(this.seed);
    this._rng = this.seed;
  }

  _seededRandom() {
    this._rng = (this._rng * 1664525 + 1013904223) & 0x7fffffff;
    return this._rng / 0x7fffffff;
  }

  generateName() {
    const pi = Math.floor(this._seededRandom() * PREFIXES.length);
    const si = Math.floor(this._seededRandom() * SUFFIXES.length);
    return PREFIXES[pi] + SUFFIXES[si];
  }

  generateHeightmap() {
    const { w, h, noise } = this;
    const hm = new Float32Array(w * h);
    const cx = w / 2, cy = h / 2;
    let min = Infinity, max = -Infinity;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let val = noise.noise2D(x * 0.04, y * 0.04) * 0.5
                + noise.noise2D(x * 0.08, y * 0.08) * 0.3
                + noise.noise2D(x * 0.16, y * 0.16) * 0.2;
        const dx = (x - cx) / cx, dy = (y - cy) / cy;
        val *= Math.max(0, 1 - Math.pow(Math.sqrt(dx*dx+dy*dy), 1.5));
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
    const visited = new Uint8Array(w * h);
    const masses = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (visited[idx] || heightmap[idx] < 0.45) continue;
        const cells = [];
        const queue = [idx];
        visited[idx] = 1;
        while (queue.length > 0) {
          const ci = queue.pop();
          cells.push(ci);
          const cx2 = ci % w, cy2 = (ci - cx2) / w;
          for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const nx = cx2+dx, ny = cy2+dy;
            if (nx<0||nx>=w||ny<0||ny>=h) continue;
            const ni = ny*w+nx;
            if (!visited[ni] && heightmap[ni] >= 0.45) { visited[ni]=1; queue.push(ni); }
          }
        }
        masses.push(cells);
      }
    }
    masses.sort((a,b) => b.length - a.length);
    return masses.slice(0,3).filter(m => m.length > 20).map(c => this._cellsToTerritory(c, heightmap));
  }

  _cellsToTerritory(cells, heightmap) {
    const { w } = this;
    const scale = 5;
    const cellSet = new Set(cells);
    const edgeArr = cells.filter(ci => {
      const cx2 = ci % w, cy2 = (ci - cx2) / w;
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if (!cellSet.has((cy2+dy)*w+(cx2+dx))) return true;
      }
      return false;
    });
    const points = this._orderEdge(edgeArr, w);
    const scaled = points.map(ci => ({ x: (ci%w)*scale+100, y: Math.floor(ci/w)*scale+100 }));
    const simplified = this._simplifyPoints(scaled, 8);
    const smooth = this._chaikin(this._limitPoints(simplified, 800), 3);
    let elevSum = 0;
    for (const ci of cells) elevSum += heightmap[ci];
    return {
      type: 'territory', name: this.generateName(),
      data: { points: smooth, color: '#8B7355', ruler: '', capitalName: '',
        resources: [], description: '', terrainType: 'plain',
        terrainSeed: Math.floor(this._seededRandom()*100000), terrainIntensity: 50 },
      _cells: cells, _avgElev: elevSum / cells.length,
    };
  }

  _limitPoints(pts, max) {
    if (pts.length <= max) return pts;
    const step = pts.length / max;
    const result = [];
    for (let i = 0; i < max; i++) result.push(pts[Math.floor(i * step)]);
    return result;
  }

  _orderEdge(edgeIndices, w) {
    if (!edgeIndices.length) return [];
    const set = new Set(edgeIndices);
    const ordered = [edgeIndices[0]]; set.delete(edgeIndices[0]);
    while (set.size > 0) {
      const last = ordered[ordered.length-1];
      const lx = last%w, ly = Math.floor(last/w);
      let best = -1, bestDist = Infinity;
      for (const ci of set) {
        const d = Math.abs(ci%w-lx) + Math.abs(Math.floor(ci/w)-ly);
        if (d < bestDist) { bestDist = d; best = ci; }
      }
      if (best < 0) break;
      ordered.push(best); set.delete(best);
    }
    return ordered;
  }

  _simplifyPoints(pts, tol) {
    if (pts.length <= 2) return pts;
    const r = [pts[0]];
    for (let i=1; i<pts.length; i++) {
      const l = r[r.length-1], dx = pts[i].x-l.x, dy = pts[i].y-l.y;
      if (dx*dx+dy*dy > tol*tol) r.push(pts[i]);
    }
    return r;
  }

  _chaikin(pts, passes) {
    let result = pts;
    for (let p=0; p<passes; p++) {
      const next = [];
      for (let i=0; i<result.length; i++) {
        const a=result[i], b=result[(i+1)%result.length];
        next.push({x:a.x*0.75+b.x*0.25, y:a.y*0.75+b.y*0.25});
        next.push({x:a.x*0.25+b.x*0.75, y:a.y*0.25+b.y*0.75});
      }
      result = next;
    }
    return result;
  }

  assignBiomes(territories, heightmap) {
    const { w, noise } = this;
    for (const ter of territories) {
      const e = ter._avgElev;
      const cells = ter._cells;
      const isCoastal = cells.some(ci => {
        const cx2 = ci%w, cy2 = Math.floor(ci/w);
        for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const ni = (cy2+dy)*w+(cx2+dx);
          if (heightmap[ni] !== undefined && heightmap[ni] < 0.45) return true;
        }
        return false;
      });
      if (e > 0.70) { ter.data.terrainType='mountain'; ter.data.color='#8B8682'; }
      else if (e > 0.55) { ter.data.terrainType='hills'; ter.data.color='#A0926B'; }
      else if (isCoastal && e<0.50 && this._seededRandom()<0.3) {
        ter.data.terrainType='marsh'; ter.data.color='#5B7B5B';
      } else if (noise.noise2D(e*10,this.seed*0.01) > 0.3) {
        ter.data.terrainType='desert'; ter.data.color='#C4A35A';
      } else {
        ter.data.terrainType='plain';
        ter.data.color=this._seededRandom()>0.5?'#8B9B6B':'#6B8B6B';
      }
    }
  }

  generateRivers(territories, heightmap) {
    const { w, h } = this;
    const rivers = [], sources = [];
    for (let y=0; y<h; y++) for (let x=0; x<w; x++)
      if (heightmap[y*w+x] > 0.65) sources.push({x, y, elev: heightmap[y*w+x]});
    sources.sort((a,b) => b.elev-a.elev);
    const picked = sources.slice(0, 3), scale = 5;
    for (const src of picked) {
      const path = [];
      let cx2 = src.x, cy2 = src.y;
      for (let step=0; step<200; step++) {
        path.push({x: cx2*scale+100, y: cy2*scale+100});
        if (heightmap[cy2*w+cx2] < 0.45) break;
        let bx=cx2, by=cy2, be=heightmap[cy2*w+cx2];
        for (const [ddx,ddy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
          const nx=cx2+ddx, ny=cy2+ddy;
          if (nx<0||nx>=w||ny<0||ny>=h) continue;
          if (heightmap[ny*w+nx] < be) { be=heightmap[ny*w+nx]; bx=nx; by=ny; }
        }
        if (bx===cx2 && by===cy2) break;
        cx2=bx; cy2=by;
      }
      if (path.length > 3) rivers.push({
        type:'river', name: this.generateName(),
        data: {sourceX:path[0].x, sourceY:path[0].y, color:'#6B8FA8', widthScale:1.0, path}
      });
    }
    return rivers;
  }

  placeEntities(territories) {
    const entities = [];
    if (!territories.length) return entities;
    const mainT = territories[0], pts = mainT.data.points;
    const center = this._centroid(pts);
    entities.push({type:'city', name:this.generateName(),
      data:{x:center.x,y:center.y,importance:'capital',color:'#8B2635',
        labelOffsetX:12,labelOffsetY:-8,population:0,founded:'',description:''}});
    const coastPts = pts.filter((_,i) => i%Math.max(1,Math.floor(pts.length/6))===0);
    const cityCount = Math.min(2+Math.floor(this._seededRandom()*2), coastPts.length, 4);
    for (let i=0; i<cityCount; i++) {
      const p = coastPts[i];
      entities.push({type:'city', name:this.generateName(),
        data:{x:p.x+(this._seededRandom()-0.5)*40,y:p.y+(this._seededRandom()-0.5)*40,
          importance:'city',color:'#8B2635',labelOffsetX:12,labelOffsetY:-8,
          population:0,founded:'',description:''}});
    }
    for (const ter of territories.slice(0,3)) {
      const c = this._centroid(ter.data.points);
      entities.push({type:'city', name:this.generateName(),
        data:{x:c.x+30+this._seededRandom()*50,y:c.y+30+this._seededRandom()*50,
          importance:'village',color:'#8B2635',labelOffsetX:12,labelOffsetY:-8,
          population:0,founded:'',description:''}});
    }
    return entities.slice(0, 8);
  }

  _centroid(pts) {
    let sx=0, sy=0;
    for (const p of pts) { sx+=p.x; sy+=p.y; }
    return {x: sx/pts.length, y: sy/pts.length};
  }
}

// ─── Worker message handler ──────────────────────────────

self.onmessage = function(ev) {
  const { type, seed, w, h } = ev.data;
  if (type !== 'generate') return;
  try {
    const gen = new WorldGenerator(seed, w, h);
    self.postMessage({type:'progress', step:1, total:5, key:'heightmap'});
    const heightmap = gen.generateHeightmap();
    self.postMessage({type:'progress', step:2, total:5, key:'landmasses'});
    const territories = gen.extractLandmasses(heightmap);
    self.postMessage({type:'progress', step:3, total:5, key:'biomes'});
    gen.assignBiomes(territories, heightmap);
    self.postMessage({type:'progress', step:4, total:5, key:'rivers'});
    const rivers = gen.generateRivers(territories, heightmap);
    self.postMessage({type:'progress', step:5, total:5, key:'entities'});
    const entities = gen.placeEntities(territories);
    for (const t of territories) { delete t._cells; delete t._avgElev; }
    self.postMessage({type:'done', world:{seed:gen.seed, territories, rivers, entities, routes:[]}});
  } catch(err) {
    self.postMessage({type:'error', message: err.message});
  }
};
