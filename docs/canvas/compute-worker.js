/** Cartographer — Compute Worker: off-thread heavy calculations. */

self.onmessage = function(e) {
  const { type, id, payload } = e.data;
  let result;
  try {
    switch (type) {
      case 'simplifyPolygon':
        result = douglasPeucker(payload.points, payload.tolerance);
        break;
      case 'computeShading':
        result = computeShadingData(payload.points, payload.intensity, payload.terrain);
        break;
      case 'detectAdjacency':
        result = detectAdjacentPairs(payload.polygons, payload.threshold);
        break;
      case 'computeVegetation':
        result = computeVegetationPositions(payload.points, payload.density, payload.seed);
        break;
      default:
        result = null;
    }
    self.postMessage({ id, type, result, error: null });
  } catch (err) {
    self.postMessage({ id, type, result: null, error: err.message });
  }
};

function douglasPeucker(pts, tolerance) {
  if (!pts || pts.length <= 2) return pts;
  let maxDist = 0, maxIdx = 0;
  const first = pts[0], last = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], first, last);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > tolerance) {
    const left = douglasPeucker(pts.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(pts.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function perpDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / Math.sqrt(lenSq);
}

function computeShadingData(points, intensity, terrain) {
  if (!points || points.length < 3) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const w = Math.ceil(maxX - minX), h = Math.ceil(maxY - minY);
  if (w <= 0 || h <= 0) return null;
  const factor = terrain === 'mountain' ? 0.4 : terrain === 'desert' ? 0.2 : 0.1;
  const data = new Float32Array(w * h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const dist = distToEdge(px + minX, py + minY, points);
      data[py * w + px] = Math.min(1, dist * factor * (intensity / 100));
    }
  }
  return { data: data.buffer, w, h, minX, minY };
}

function distToEdge(x, y, pts) {
  let minD = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) { minD = Math.min(minD, Math.hypot(x - pts[i].x, y - pts[i].y)); continue; }
    const t = Math.max(0, Math.min(1, ((x - pts[j].x) * dx + (y - pts[j].y) * dy) / lenSq));
    const d = Math.hypot(x - (pts[j].x + t * dx), y - (pts[j].y + t * dy));
    if (d < minD) minD = d;
  }
  return minD;
}

function detectAdjacentPairs(polygons, threshold) {
  const pairs = [];
  for (let i = 0; i < polygons.length; i++) {
    for (let j = i + 1; j < polygons.length; j++) {
      const ptsA = polygons[i].points, ptsB = polygons[j].points;
      if (!ptsA || !ptsB) continue;
      if (polygonsClose(ptsA, ptsB, threshold)) {
        pairs.push([polygons[i].id, polygons[j].id]);
      }
    }
  }
  return pairs;
}

function polygonsClose(ptsA, ptsB, threshold) {
  const stepA = Math.max(1, Math.floor(ptsA.length / 12));
  const stepB = Math.max(1, Math.floor(ptsB.length / 12));
  for (let i = 0; i < ptsA.length; i += stepA) {
    for (let j = 0; j < ptsB.length; j += stepB) {
      if (Math.hypot(ptsA[i].x - ptsB[j].x, ptsA[i].y - ptsB[j].y) < threshold) return true;
    }
  }
  return false;
}

function computeVegetationPositions(points, density, seed) {
  if (!points || points.length < 3) return [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const spacing = Math.max(8, Math.floor(40 / density));
  const positions = [];
  let s = seed | 0;
  for (let y = minY; y < maxY; y += spacing) {
    for (let x = minX; x < maxX; x += spacing) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const jx = x + (s % spacing) - spacing / 2;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const jy = y + (s % spacing) - spacing / 2;
      if (pointInPoly(jx, jy, points)) positions.push({ x: jx, y: jy });
    }
  }
  return positions;
}

function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
