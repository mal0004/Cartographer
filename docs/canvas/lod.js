/** Cartographer — Level of Detail: 4 levels with polygon simplification. */

const LOD_LEVELS = [
  { name: 'MINIMAL', minZoom: 0,    maxZoom: 0.25, tolerance: 12, skipLabels: true,  skipSymbols: true  },
  { name: 'LOW',     minZoom: 0.25, maxZoom: 0.5,  tolerance: 6,  skipLabels: true,  skipSymbols: false },
  { name: 'MEDIUM',  minZoom: 0.5,  maxZoom: 1.0,  tolerance: 2,  skipLabels: false, skipSymbols: false },
  { name: 'HIGH',    minZoom: 1.0,  maxZoom: Infinity, tolerance: 0, skipLabels: false, skipSymbols: false },
];

export class LODManager {
  constructor() {
    this.currentLevel = LOD_LEVELS[3];
    this._simplifyCache = new Map();
    this._cacheCapacity = 256;
  }

  getLOD(zoom) {
    for (const level of LOD_LEVELS) {
      if (zoom >= level.minZoom && zoom < level.maxZoom) {
        this.currentLevel = level;
        return level;
      }
    }
    this.currentLevel = LOD_LEVELS[3];
    return this.currentLevel;
  }

  shouldRenderLabels() { return !this.currentLevel.skipLabels; }
  shouldRenderSymbols() { return !this.currentLevel.skipSymbols; }

  simplifyPoints(points, entityId) {
    if (!points || points.length < 3) return points;
    const tol = this.currentLevel.tolerance;
    if (tol === 0) return points;

    const key = `${entityId}_${tol}`;
    const cached = this._simplifyCache.get(key);
    if (cached) return cached;

    const result = this._douglasPeucker(points, tol);
    if (this._simplifyCache.size >= this._cacheCapacity) {
      const first = this._simplifyCache.keys().next().value;
      this._simplifyCache.delete(first);
    }
    this._simplifyCache.set(key, result);
    return result;
  }

  _douglasPeucker(pts, tolerance) {
    if (pts.length <= 2) return pts;
    let maxDist = 0, maxIdx = 0;
    const first = pts[0], last = pts[pts.length - 1];

    for (let i = 1; i < pts.length - 1; i++) {
      const d = this._perpDist(pts[i], first, last);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }

    if (maxDist > tolerance) {
      const left = this._douglasPeucker(pts.slice(0, maxIdx + 1), tolerance);
      const right = this._douglasPeucker(pts.slice(maxIdx), tolerance);
      return left.slice(0, -1).concat(right);
    }
    return [first, last];
  }

  _perpDist(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    const num = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
    return num / Math.sqrt(lenSq);
  }

  invalidateCache(entityId) {
    if (entityId) {
      for (const key of [...this._simplifyCache.keys()]) {
        if (key.startsWith(entityId + '_')) this._simplifyCache.delete(key);
      }
    } else {
      this._simplifyCache.clear();
    }
  }

  getEntityDetail(entity, zoom) {
    const lod = this.getLOD(zoom);
    if (entity.type === 'symbol' && lod.skipSymbols) return null;
    if (entity.type === 'text' && lod.skipLabels) return null;

    if (entity.data && entity.data.points) {
      return {
        ...entity,
        data: {
          ...entity.data,
          points: this.simplifyPoints(entity.data.points, entity.id),
        },
      };
    }
    return entity;
  }

  static get LEVELS() { return LOD_LEVELS; }
}
