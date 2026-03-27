/** Cartographer — Tile System: 256×256 tile cache with LRU eviction. */

const TILE_SIZE = 256;
const DEFAULT_CAPACITY = 128;

export class TileSystem {
  constructor(mapWidth, mapHeight, capacity = DEFAULT_CAPACITY) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.tileSize = TILE_SIZE;
    this.capacity = capacity;
    this.cols = Math.ceil(mapWidth / TILE_SIZE);
    this.rows = Math.ceil(mapHeight / TILE_SIZE);
    /** @type {Map<string, {canvas: OffscreenCanvas|HTMLCanvasElement, lastUsed: number}>} */
    this.cache = new Map();
    this._tick = 0;
  }

  getTileKey(col, row, layer) {
    return `${layer}_${col}_${row}`;
  }

  _parseTileKey(key) {
    const [layer, col, row] = key.split('_');
    return { layer, col: +col, row: +row };
  }

  getVisibleTiles(viewport) {
    const { x, y, width, height, zoom } = viewport;
    const invZoom = 1 / (zoom || 1);
    const left = Math.max(0, Math.floor((x * invZoom) / this.tileSize));
    const top = Math.max(0, Math.floor((y * invZoom) / this.tileSize));
    const right = Math.min(this.cols - 1,
      Math.floor(((x + width) * invZoom) / this.tileSize));
    const bottom = Math.min(this.rows - 1,
      Math.floor(((y + height) * invZoom) / this.tileSize));

    const tiles = [];
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        tiles.push({ col: c, row: r, x: c * this.tileSize, y: r * this.tileSize });
      }
    }
    return tiles;
  }

  getTile(col, row, layer) {
    const key = this.getTileKey(col, row, layer);
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastUsed = ++this._tick;
      return entry.canvas;
    }
    return null;
  }

  setTile(col, row, layer, canvas) {
    const key = this.getTileKey(col, row, layer);
    if (this.cache.size >= this.capacity && !this.cache.has(key)) {
      this._evict();
    }
    this.cache.set(key, { canvas, lastUsed: ++this._tick });
  }

  createTileCanvas() {
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(this.tileSize, this.tileSize);
    }
    const c = document.createElement('canvas');
    c.width = this.tileSize;
    c.height = this.tileSize;
    return c;
  }

  _evict() {
    let oldest = Infinity, oldestKey = null;
    for (const [key, entry] of this.cache) {
      if (entry.lastUsed < oldest) {
        oldest = entry.lastUsed;
        oldestKey = key;
      }
    }
    if (oldestKey) this.cache.delete(oldestKey);
  }

  invalidateTile(col, row, layer) {
    if (layer) {
      this.cache.delete(this.getTileKey(col, row, layer));
    } else {
      for (const key of [...this.cache.keys()]) {
        const p = this._parseTileKey(key);
        if (p.col === col && p.row === row) this.cache.delete(key);
      }
    }
  }

  invalidateRegion(x, y, w, h) {
    const c0 = Math.max(0, Math.floor(x / this.tileSize));
    const r0 = Math.max(0, Math.floor(y / this.tileSize));
    const c1 = Math.min(this.cols - 1, Math.floor((x + w) / this.tileSize));
    const r1 = Math.min(this.rows - 1, Math.floor((y + h) / this.tileSize));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        this.invalidateTile(c, r);
      }
    }
  }

  invalidateAll() {
    this.cache.clear();
  }

  renderVisibleTiles(mainCtx, viewport, layer, renderFn) {
    const tiles = this.getVisibleTiles(viewport);
    const zoom = viewport.zoom || 1;
    for (const tile of tiles) {
      let cached = this.getTile(tile.col, tile.row, layer);
      if (!cached) {
        cached = this.createTileCanvas();
        const tCtx = cached.getContext('2d');
        tCtx.save();
        tCtx.setTransform(1, 0, 0, 1, 0, 0);
        tCtx.clearRect(0, 0, this.tileSize, this.tileSize);
        tCtx.translate(-tile.x, -tile.y);
        renderFn(tCtx, tile.x, tile.y, this.tileSize, this.tileSize);
        tCtx.restore();
        this.setTile(tile.col, tile.row, layer, cached);
      }
      mainCtx.drawImage(cached,
        tile.x * zoom - (viewport.x || 0),
        tile.y * zoom - (viewport.y || 0),
        this.tileSize * zoom,
        this.tileSize * zoom);
    }
  }

  resize(mapWidth, mapHeight) {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.cols = Math.ceil(mapWidth / this.tileSize);
    this.rows = Math.ceil(mapHeight / this.tileSize);
    this.invalidateAll();
  }
}
