/**
 * Cartographer — Noise Web Worker
 *
 * Runs HeightMap generation off the main thread.
 * Messages:
 *   { type: 'generate', id, width, height, seed, scale, octaves, persistence, lacunarity, polygon, feather, terrainType }
 *   → { type: 'result', id, data: Float32Array, width, height, contours, hillshade }
 */

// ─── Inline SimplexNoise (same as noise.js) ──────────────────────

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
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    let i1, j1;
    if (x0 > y0) { i1=1; j1=0; } else { i1=0; j1=1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0*G2, y2 = y0 - 1.0 + 2.0*G2;
    const ii = i & 255, jj = j & 255;
    const gi0 = permMod12[ii + perm[jj]];
    const gi1 = permMod12[ii + i1 + perm[jj + j1]];
    const gi2 = permMod12[ii + 1 + perm[jj + 1]];
    let n0=0, n1=0, n2=0;
    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 >= 0) { t0*=t0; n0 = t0*t0*(grad3[gi0*3]*x0+grad3[gi0*3+1]*y0); }
    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 >= 0) { t1*=t1; n1 = t1*t1*(grad3[gi1*3]*x1+grad3[gi1*3+1]*y1); }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 >= 0) { t2*=t2; n2 = t2*t2*(grad3[gi2*3]*x2+grad3[gi2*3+1]*y2); }
    return 70.0 * (n0 + n1 + n2);
  }
}
SimplexNoise._grad3 = new Float32Array([
  1,1,0, -1,1,0, 1,-1,0, -1,-1,0,
  1,0,1, -1,0,1, 1,0,-1, -1,0,-1,
  0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1,
]);

// ─── Point-in-polygon ───────────────────────────────────────────

function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y;
    const xj = pts[j].x, yj = pts[j].y;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2-x1, dy = y2-y1;
  const lenSq = dx*dx + dy*dy;
  if (lenSq === 0) return Math.hypot(px-x1, py-y1);
  let t = ((px-x1)*dx + (py-y1)*dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1+t*dx), py - (y1+t*dy));
}

function distToPolygonEdge(x, y, pts) {
  let minDist = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const d = distToSegment(x, y, pts[i].x, pts[i].y, pts[j].x, pts[j].y);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// ─── Generate heightmap ──────────────────────────────────────────

function generateHeightmap(msg) {
  const { width, height, seed, scale, octaves, persistence, lacunarity, polygon, feather } = msg;
  const simplex = new SimplexNoise(seed);
  const data = new Float32Array(width * height);

  let min = Infinity, max = -Infinity;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let amplitude = 1.0, freq = scale || 0.01, value = 0;
      for (let o = 0; o < (octaves || 6); o++) {
        value += simplex.noise2D(x * freq, y * freq) * amplitude;
        amplitude *= (persistence || 0.5);
        freq *= (lacunarity || 2.0);
      }
      const idx = y * width + x;
      data[idx] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  // Normalize
  const range = max - min || 1;
  for (let i = 0; i < data.length; i++) {
    data[i] = (data[i] - min) / range;
  }

  // Apply polygon mask with feathering
  if (polygon && polygon.length >= 3) {
    const f = feather || 10;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!pointInPolygon(x, y, polygon)) {
          data[y * width + x] = 0;
        } else {
          const dist = distToPolygonEdge(x, y, polygon);
          if (dist < f) {
            data[y * width + x] *= dist / f;
          }
        }
      }
    }
  }

  // Compute hillshade
  const hillshade = new Float32Array(width * height);
  const azimuth = 315 * Math.PI / 180;
  const elevation = 45 * Math.PI / 180;
  const lx = Math.sin(azimuth) * Math.cos(elevation);
  const ly = -Math.cos(azimuth) * Math.cos(elevation);
  const lz = Math.sin(elevation);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const dzdx = (data[y * width + x + 1] - data[y * width + x - 1]) * 2.0;
      const dzdy = (data[(y + 1) * width + x] - data[(y - 1) * width + x]) * 2.0;
      const nx = -dzdx, ny = -dzdy, nz = 1.0;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
      const dot = (nx/len)*lx + (ny/len)*ly + (nz/len)*lz;
      hillshade[y * width + x] = Math.max(0, Math.min(1, dot));
    }
  }

  return { data, hillshade };
}

// ─── Message handler ─────────────────────────────────────────────

self.onmessage = function(e) {
  const msg = e.data;
  if (msg.type === 'generate') {
    const result = generateHeightmap(msg);
    self.postMessage({
      type: 'result',
      id: msg.id,
      data: result.data.buffer,
      hillshade: result.hillshade.buffer,
      width: msg.width,
      height: msg.height,
    }, [result.data.buffer, result.hillshade.buffer]);
  }
};
