/** Cartographer — Spatial Hash Grid for O(1) entity lookups. */

const DEFAULT_CELL_SIZE = 128;

export class SpatialIndex {
  constructor(cellSize = DEFAULT_CELL_SIZE) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.entityCells = new Map();
  }

  _cellKey(cx, cy) { return `${cx},${cy}`; }

  _getCells(bounds) {
    const { x, y, w, h } = bounds;
    const c0 = Math.floor(x / this.cellSize);
    const r0 = Math.floor(y / this.cellSize);
    const c1 = Math.floor((x + w) / this.cellSize);
    const r1 = Math.floor((y + h) / this.cellSize);
    const cells = [];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        cells.push(this._cellKey(c, r));
      }
    }
    return cells;
  }

  _entityBounds(entity) {
    const d = entity.data;
    if (d.x !== undefined && d.y !== undefined) {
      const size = d.radius || d.size || 20;
      return { x: d.x - size, y: d.y - size, w: size * 2, h: size * 2 };
    }
    if (d.points && d.points.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of d.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    if (d.x1 !== undefined && d.x2 !== undefined) {
      const minX = Math.min(d.x1, d.x2), minY = Math.min(d.y1, d.y2);
      return { x: minX, y: minY, w: Math.abs(d.x2 - d.x1), h: Math.abs(d.y2 - d.y1) };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  insert(entity) {
    const bounds = this._entityBounds(entity);
    const cells = this._getCells(bounds);
    this.entityCells.set(entity.id, cells);
    for (const key of cells) {
      if (!this.grid.has(key)) this.grid.set(key, new Set());
      this.grid.get(key).add(entity);
    }
  }

  remove(entity) {
    const cells = this.entityCells.get(entity.id);
    if (!cells) return;
    for (const key of cells) {
      const set = this.grid.get(key);
      if (set) {
        set.delete(entity);
        if (set.size === 0) this.grid.delete(key);
      }
    }
    this.entityCells.delete(entity.id);
  }

  update(entity) {
    this.remove(entity);
    this.insert(entity);
  }

  buildFromEntities(entities) {
    this.clear();
    for (const e of entities) this.insert(e);
  }

  clear() {
    this.grid.clear();
    this.entityCells.clear();
  }

  queryPoint(px, py) {
    const key = this._cellKey(
      Math.floor(px / this.cellSize),
      Math.floor(py / this.cellSize)
    );
    const set = this.grid.get(key);
    return set ? [...set] : [];
  }

  queryRect(x, y, w, h) {
    const cells = this._getCells({ x, y, w, h });
    const seen = new Set();
    const result = [];
    for (const key of cells) {
      const set = this.grid.get(key);
      if (!set) continue;
      for (const entity of set) {
        if (!seen.has(entity.id)) {
          seen.add(entity.id);
          result.push(entity);
        }
      }
    }
    return result;
  }

  queryViewport(viewport) {
    const { x, y, width, height, zoom } = viewport;
    const invZoom = 1 / (zoom || 1);
    return this.queryRect(
      (x || 0) * invZoom,
      (y || 0) * invZoom,
      (width || 0) * invZoom,
      (height || 0) * invZoom
    );
  }

  getStats() {
    let totalEntries = 0;
    for (const set of this.grid.values()) totalEntries += set.size;
    return {
      cells: this.grid.size,
      entities: this.entityCells.size,
      totalEntries,
      avgPerCell: this.grid.size ? (totalEntries / this.grid.size).toFixed(1) : 0,
    };
  }
}
