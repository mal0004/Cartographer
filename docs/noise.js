/**
 * Cartographer — Procedural Noise Engine
 *
 * Simplex Noise 2D/3D (Stefan Gustavson algorithm, public domain)
 * NoiseMap: generates normalized Float32Array from octave noise
 * HeightMap: extends NoiseMap with island mask, custom polygon mask,
 *            bilinear interpolation, and contour line extraction.
 *
 * Zero dependencies.
 */

// ─── Simplex Noise ──────────────────────────────────────────────

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
    // Fisher-Yates shuffle with seed
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

  // ─── 2D Simplex Noise ─────────────────────────────────────────

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
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = permMod12[ii + perm[jj]];
    const gi1 = permMod12[ii + i1 + perm[jj + j1]];
    const gi2 = permMod12[ii + 1 + perm[jj + 1]];

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0 * 3] * x0 + grad3[gi0 * 3 + 1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1 * 3] * x1 + grad3[gi1 * 3 + 1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2 * 3] * x2 + grad3[gi2 * 3 + 1] * y2);
    }

    // Scale to [−1, 1]
    return 70.0 * (n0 + n1 + n2);
  }

  // ─── 3D Simplex Noise ─────────────────────────────────────────

  noise3D(xin, yin, zin) {
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;
    const grad3 = SimplexNoise._grad3;
    const perm = this._perm;
    const permMod12 = this._permMod12;

    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    const z0 = zin - Z0;

    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
      else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
      else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
    } else {
      if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
      else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
      else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const gi0 = permMod12[ii + perm[jj + perm[kk]]];
    const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]];
    const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]];
    const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]];

    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;

    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * (grad3[gi0*3]*x0 + grad3[gi0*3+1]*y0 + grad3[gi0*3+2]*z0); }

    let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * (grad3[gi1*3]*x1 + grad3[gi1*3+1]*y1 + grad3[gi1*3+2]*z1); }

    let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * (grad3[gi2*3]*x2 + grad3[gi2*3+1]*y2 + grad3[gi2*3+2]*z2); }

    let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if (t3 >= 0) { t3 *= t3; n3 = t3 * t3 * (grad3[gi3*3]*x3 + grad3[gi3*3+1]*y3 + grad3[gi3*3+2]*z3); }

    return 32.0 * (n0 + n1 + n2 + n3);
  }
}

// Gradient vectors for 2D/3D
SimplexNoise._grad3 = new Float32Array([
   1, 1, 0,  -1, 1, 0,   1,-1, 0,  -1,-1, 0,
   1, 0, 1,  -1, 0, 1,   1, 0,-1,  -1, 0,-1,
   0, 1, 1,   0,-1, 1,   0, 1,-1,   0,-1,-1,
]);

// ─── NoiseMap ────────────────────────────────────────────────────

class NoiseMap {
  /**
   * @param {number} width  - map width in pixels
   * @param {number} height - map height in pixels
   * @param {number} seed   - deterministic seed
   */
  constructor(width, height, seed) {
    this.width = width;
    this.height = height;
    this.seed = seed || 0;
    this.data = null; // Float32Array, set after generate()
    this._simplex = new SimplexNoise(this.seed);
  }

  /**
   * Generate multi-octave simplex noise, normalized to [0, 1].
   * @param {number} scale       - base frequency (lower = smoother, typical 0.005→0.05)
   * @param {number} octaves     - number of detail layers (typical 4→8)
   * @param {number} persistence - amplitude decay per octave (typical 0.5)
   * @param {number} lacunarity  - frequency multiplier per octave (typical 2.0)
   * @returns {Float32Array} normalized 0→1
   */
  generate(scale, octaves, persistence, lacunarity) {
    scale = scale || 0.01;
    octaves = octaves || 6;
    persistence = persistence || 0.5;
    lacunarity = lacunarity || 2.0;

    const w = this.width;
    const h = this.height;
    const data = new Float32Array(w * h);
    const simplex = this._simplex;

    let min = Infinity, max = -Infinity;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let amplitude = 1.0;
        let frequency = scale;
        let value = 0;

        for (let o = 0; o < octaves; o++) {
          value += simplex.noise2D(x * frequency, y * frequency) * amplitude;
          amplitude *= persistence;
          frequency *= lacunarity;
        }

        const idx = y * w + x;
        data[idx] = value;
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }

    // Normalize to [0, 1]
    const range = max - min || 1;
    for (let i = 0; i < data.length; i++) {
      data[i] = (data[i] - min) / range;
    }

    this.data = data;
    return data;
  }
}

// ─── HeightMap ───────────────────────────────────────────────────

class HeightMap extends NoiseMap {
  constructor(width, height, seed) {
    super(width, height, seed);
  }

  /**
   * Radial island mask — forces edges to 0, creating island/continent shapes.
   * @param {number} falloff - 0→1, how aggressive the falloff is (0.3 = gentle, 0.8 = steep)
   */
  applyIslandMask(falloff) {
    if (!this.data) return;
    falloff = falloff || 0.5;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        const dist = Math.sqrt(dx * dx + dy * dy); // 0 at center, ~1.41 at corners
        const mask = Math.max(0, 1.0 - Math.pow(dist, 2.0 / falloff));
        this.data[y * w + x] *= mask;
      }
    }
  }

  /**
   * Polygon mask — forces heightmap to 0 outside the polygon.
   * Polygon is specified in the heightmap's local coordinate space
   * (0,0 = top-left of the bounding box that created this heightmap).
   * @param {Array<{x:number, y:number}>} polygon - array of {x, y} points
   */
  applyCustomMask(polygon) {
    if (!this.data || !polygon || polygon.length < 3) return;
    const w = this.width;
    const h = this.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!HeightMap._pointInPolygon(x, y, polygon)) {
          this.data[y * w + x] = 0;
        }
      }
    }
  }

  /**
   * Smooth polygon mask — forces to 0 outside, with a feathered edge inside.
   * @param {Array<{x:number, y:number}>} polygon
   * @param {number} feather - pixels of feathering inside the border
   */
  applyCustomMaskSmooth(polygon, feather) {
    if (!this.data || !polygon || polygon.length < 3) return;
    feather = feather || 10;
    const w = this.width;
    const h = this.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!HeightMap._pointInPolygon(x, y, polygon)) {
          this.data[y * w + x] = 0;
        } else {
          // Distance to nearest edge
          const dist = HeightMap._distToPolygonEdge(x, y, polygon);
          if (dist < feather) {
            this.data[y * w + x] *= dist / feather;
          }
        }
      }
    }
  }

  /**
   * Bilinear interpolation for sub-pixel elevation lookup.
   * @param {number} x - x coordinate (can be fractional)
   * @param {number} y - y coordinate (can be fractional)
   * @returns {number} interpolated value 0→1
   */
  getElevationAt(x, y) {
    if (!this.data) return 0;
    const w = this.width;
    const h = this.height;

    // Clamp to bounds
    x = Math.max(0, Math.min(w - 1.001, x));
    y = Math.max(0, Math.min(h - 1.001, y));

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, w - 1);
    const y1 = Math.min(y0 + 1, h - 1);
    const fx = x - x0;
    const fy = y - y0;

    const v00 = this.data[y0 * w + x0];
    const v10 = this.data[y0 * w + x1];
    const v01 = this.data[y1 * w + x0];
    const v11 = this.data[y1 * w + x1];

    const top = v00 * (1 - fx) + v10 * fx;
    const bot = v01 * (1 - fx) + v11 * fx;
    return top * (1 - fy) + bot * fy;
  }

  /**
   * Extract contour lines at specified elevation levels.
   * Uses marching squares to produce polylines.
   * @param {number[]} levels - array of elevation thresholds (e.g. [0.2, 0.4, 0.6, 0.8])
   * @returns {Array<{level: number, lines: Array<Array<{x:number, y:number}>>}>}
   */
  toContourLines(levels) {
    if (!this.data) return [];
    const w = this.width;
    const h = this.height;
    const result = [];

    for (const level of levels) {
      const segments = [];

      // Marching squares
      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
          const v00 = this.data[y * w + x];
          const v10 = this.data[y * w + x + 1];
          const v01 = this.data[(y + 1) * w + x];
          const v11 = this.data[(y + 1) * w + x + 1];

          const b00 = v00 >= level ? 1 : 0;
          const b10 = v10 >= level ? 1 : 0;
          const b01 = v01 >= level ? 1 : 0;
          const b11 = v11 >= level ? 1 : 0;
          const code = b00 | (b10 << 1) | (b01 << 2) | (b11 << 3);

          if (code === 0 || code === 15) continue;

          // Interpolate edge crossings
          const top    = { x: x + HeightMap._lerp(v00, v10, level), y: y };
          const bottom = { x: x + HeightMap._lerp(v01, v11, level), y: y + 1 };
          const left   = { x: x, y: y + HeightMap._lerp(v00, v01, level) };
          const right  = { x: x + 1, y: y + HeightMap._lerp(v10, v11, level) };

          // Cases → line segments
          const segs = HeightMap._marchingSquaresSegments(code, top, right, bottom, left);
          for (const seg of segs) {
            segments.push(seg);
          }
        }
      }

      // Chain segments into polylines
      const lines = HeightMap._chainSegments(segments);
      result.push({ level, lines });
    }

    return result;
  }

  /**
   * Compute gradient (slope direction) at a point.
   * Returns { dx, dy } — the direction of steepest ascent.
   * @param {number} x
   * @param {number} y
   * @returns {{dx: number, dy: number}}
   */
  getGradientAt(x, y) {
    const e = 1.0;
    const ex = this.getElevationAt(x + e, y) - this.getElevationAt(x - e, y);
    const ey = this.getElevationAt(x, y + e) - this.getElevationAt(x, y - e);
    return { dx: ex / (2 * e), dy: ey / (2 * e) };
  }

  /**
   * Compute normal vector for hill shading.
   * Light from azimuth (degrees, 0=N, 90=E) at elevation (degrees).
   * Returns illumination factor 0→1.
   * @param {number} x
   * @param {number} y
   * @param {number} azimuth   - light direction in degrees (315 = NW)
   * @param {number} elevation - light elevation in degrees (45 typical)
   * @param {number} strength  - height exaggeration factor
   * @returns {number} 0→1
   */
  getHillshadeAt(x, y, azimuth, elevation, strength) {
    azimuth = (azimuth || 315) * Math.PI / 180;
    elevation = (elevation || 45) * Math.PI / 180;
    strength = strength || 2.0;

    const grad = this.getGradientAt(x, y);
    const dx = grad.dx * strength;
    const dy = grad.dy * strength;

    // Surface normal
    const nx = -dx;
    const ny = -dy;
    const nz = 1.0;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

    // Light direction
    const lx = Math.sin(azimuth) * Math.cos(elevation);
    const ly = -Math.cos(azimuth) * Math.cos(elevation);
    const lz = Math.sin(elevation);

    // Dot product
    const dot = (nx / len) * lx + (ny / len) * ly + (nz / len) * lz;
    return Math.max(0, Math.min(1, dot));
  }

  // ─── Static helpers ───────────────────────────────────────────

  static _pointInPolygon(x, y, pts) {
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

  static _distToPolygonEdge(x, y, pts) {
    let minDist = Infinity;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const dist = HeightMap._distToSegment(x, y, pts[i].x, pts[i].y, pts[j].x, pts[j].y);
      if (dist < minDist) minDist = dist;
    }
    return minDist;
  }

  static _distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  static _lerp(v0, v1, threshold) {
    if (Math.abs(v1 - v0) < 1e-10) return 0.5;
    return (threshold - v0) / (v1 - v0);
  }

  static _marchingSquaresSegments(code, top, right, bottom, left) {
    // Returns array of [{a, b}] segments
    switch (code) {
      case  1: return [{ a: top, b: left }];
      case  2: return [{ a: right, b: top }];
      case  3: return [{ a: right, b: left }];
      case  4: return [{ a: left, b: bottom }];
      case  5: return [{ a: top, b: bottom }]; // ambiguous — simple resolution
      case  6: return [{ a: right, b: top }, { a: left, b: bottom }];
      case  7: return [{ a: right, b: bottom }];
      case  8: return [{ a: bottom, b: right }];
      case  9: return [{ a: top, b: left }, { a: bottom, b: right }];
      case 10: return [{ a: bottom, b: top }]; // ambiguous — simple resolution
      case 11: return [{ a: bottom, b: left }];
      case 12: return [{ a: left, b: right }];
      case 13: return [{ a: top, b: right }];
      case 14: return [{ a: left, b: top }];
      default: return [];
    }
  }

  static _chainSegments(segments) {
    if (segments.length === 0) return [];
    const lines = [];
    const eps = 0.01;

    // Simple greedy chaining
    const used = new Uint8Array(segments.length);
    for (let s = 0; s < segments.length; s++) {
      if (used[s]) continue;
      used[s] = 1;
      const line = [segments[s].a, segments[s].b];

      let changed = true;
      while (changed) {
        changed = false;
        for (let i = 0; i < segments.length; i++) {
          if (used[i]) continue;
          const seg = segments[i];
          const last = line[line.length - 1];
          const first = line[0];

          if (Math.abs(seg.a.x - last.x) < eps && Math.abs(seg.a.y - last.y) < eps) {
            line.push(seg.b); used[i] = 1; changed = true;
          } else if (Math.abs(seg.b.x - last.x) < eps && Math.abs(seg.b.y - last.y) < eps) {
            line.push(seg.a); used[i] = 1; changed = true;
          } else if (Math.abs(seg.a.x - first.x) < eps && Math.abs(seg.a.y - first.y) < eps) {
            line.unshift(seg.b); used[i] = 1; changed = true;
          } else if (Math.abs(seg.b.x - first.x) < eps && Math.abs(seg.b.y - first.y) < eps) {
            line.unshift(seg.a); used[i] = 1; changed = true;
          }
        }
      }

      // Only keep lines with at least 2 points
      if (line.length >= 2) lines.push(line);
    }

    return lines;
  }
}

// ─── Exports ─────────────────────────────────────────────────────

window.SimplexNoise = SimplexNoise;
window.NoiseMap = NoiseMap;
window.HeightMap = HeightMap;
