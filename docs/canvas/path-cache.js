/** Cartographer — Path2D Cache: reuse Path2D objects for repeated polygon paths. */

const DEFAULT_CAPACITY = 256;

export class PathCache {
  constructor(capacity = DEFAULT_CAPACITY) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  _key(entityId, version) {
    return `${entityId}_${version || 0}`;
  }

  getPath(entityId, points, version) {
    if (!points || points.length < 2) return null;
    const key = this._key(entityId, version);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const path = new Path2D();
    path.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      path.lineTo(points[i].x, points[i].y);
    }
    path.closePath();

    if (this.cache.size >= this.capacity) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
    this.cache.set(key, path);
    return path;
  }

  getRoutePath(entityId, d, version) {
    const key = this._key(entityId, version);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const path = new Path2D();
    if (d.cx1 !== undefined) {
      path.moveTo(d.x1, d.y1);
      path.bezierCurveTo(d.cx1, d.cy1, d.cx2, d.cy2, d.x2, d.y2);
    } else {
      path.moveTo(d.x1, d.y1);
      path.lineTo(d.x2, d.y2);
    }

    if (this.cache.size >= this.capacity) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
    this.cache.set(key, path);
    return path;
  }

  invalidate(entityId) {
    if (entityId) {
      for (const key of [...this.cache.keys()]) {
        if (key.startsWith(entityId + '_')) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  }

  clear() {
    this.cache.clear();
  }
}

/** Batch similar draw operations to minimize state changes. */
export class DrawBatcher {
  constructor() {
    this._batches = new Map();
  }

  add(styleKey, drawFn) {
    if (!this._batches.has(styleKey)) {
      this._batches.set(styleKey, []);
    }
    this._batches.get(styleKey).push(drawFn);
  }

  flush(ctx) {
    for (const [, fns] of this._batches) {
      for (const fn of fns) fn(ctx);
    }
    this._batches.clear();
  }

  clear() {
    this._batches.clear();
  }
}

/** Cap devicePixelRatio to avoid perf issues on high-DPI screens. */
export function cappedDPR(max = 2) {
  return Math.min(window.devicePixelRatio || 1, max);
}
