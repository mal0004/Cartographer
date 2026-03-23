/**
 * Cartographer — Performance Optimizations
 *
 * Coordinates rendering performance across all subsystems:
 *
 * 1. Render throttling: coalesces multiple render() calls into a single
 *    requestAnimationFrame, preventing redundant redraws.
 *
 * 2. Tile cache: caches rendered terrain+vegetation into 256×256 tiles
 *    keyed by (tileX, tileY, zoomLevel, entityHash). Only visible tiles
 *    are drawn; off-screen tiles are skipped entirely.
 *
 * 3. OffscreenCanvas helper: uses OffscreenCanvas when available for
 *    creating offscreen render targets, with fallback to regular canvas.
 *
 * 4. Idle scheduler: queues non-urgent work (vegetation, post-processing
 *    cache warming) via requestIdleCallback with fallback to setTimeout.
 *
 * 5. LOD manager: coordinates level-of-detail across renderers based
 *    on current zoom level.
 *
 * 6. Viewport culling: provides fast AABB-in-viewport checks.
 *
 * Zero dependencies.
 */

class PerformanceManager {
  constructor() {
    // ─── Render throttling ─────────────────────────────────────
    this._renderQueued = false;
    this._renderFn = null;

    // ─── Tile cache ────────────────────────────────────────────
    this.TILE_SIZE = 256;
    // Map: "tileX_tileY_zoomBucket" → { canvas, hash, timestamp }
    this._tileCache = new Map();
    this._tileCacheLimit = 200;

    // ─── Idle work queue ───────────────────────────────────────
    this._idleQueue = [];
    this._idleRunning = false;

    // ─── LOD state ─────────────────────────────────────────────
    this._currentLOD = 'medium'; // 'low', 'medium', 'high'

    // ─── Dirty tracking per entity ─────────────────────────────
    this._dirtyEntities = new Set();
    this._globalDirty = true;

    // ─── Frame timing ──────────────────────────────────────────
    this._lastFrameTime = 0;
    this._frameCount = 0;
    this._fps = 60;
    this._fpsUpdateTime = 0;
  }

  // ═══ Render Throttling ═══════════════════════════════════════

  /**
   * Set the render function to be throttled.
   * @param {Function} fn
   */
  setRenderFunction(fn) {
    this._renderFn = fn;
  }

  /**
   * Request a render. Multiple calls within the same frame are coalesced.
   */
  requestRender() {
    if (this._renderQueued) return;
    this._renderQueued = true;
    requestAnimationFrame((timestamp) => {
      this._renderQueued = false;
      this._updateFPS(timestamp);
      if (this._renderFn) this._renderFn();
    });
  }

  _updateFPS(timestamp) {
    this._frameCount++;
    if (timestamp - this._fpsUpdateTime >= 1000) {
      this._fps = this._frameCount;
      this._frameCount = 0;
      this._fpsUpdateTime = timestamp;
    }
    this._lastFrameTime = timestamp;
  }

  /**
   * Get current FPS estimate.
   */
  getFPS() {
    return this._fps;
  }

  // ═══ Viewport Culling ════════════════════════════════════════

  /**
   * Check if a world-space bounding box is visible in the current viewport.
   *
   * @param {object} bbox - { x, y, w, h } in world coords
   * @param {object} engine - CanvasEngine with offsetX, offsetY, zoom, width, height
   * @returns {boolean}
   */
  isVisible(bbox, engine) {
    const z = engine.zoom;
    const screenX = bbox.x * z + engine.offsetX;
    const screenY = bbox.y * z + engine.offsetY;
    const screenW = bbox.w * z;
    const screenH = bbox.h * z;

    // AABB intersection with viewport [0, 0, width, height]
    return (
      screenX + screenW > 0 &&
      screenY + screenH > 0 &&
      screenX < engine.width &&
      screenY < engine.height
    );
  }

  /**
   * Check if a world-space point is visible in the viewport.
   */
  isPointVisible(wx, wy, engine, margin) {
    margin = margin || 50;
    const sx = wx * engine.zoom + engine.offsetX;
    const sy = wy * engine.zoom + engine.offsetY;
    return sx > -margin && sy > -margin && sx < engine.width + margin && sy < engine.height + margin;
  }

  /**
   * Get the visible world-space bounding box for the current viewport.
   */
  getVisibleBounds(engine) {
    const z = engine.zoom;
    return {
      x: -engine.offsetX / z,
      y: -engine.offsetY / z,
      w: engine.width / z,
      h: engine.height / z,
    };
  }

  // ═══ Tile Cache ══════════════════════════════════════════════

  /**
   * Get the zoom bucket for tile caching.
   * Groups nearby zoom levels to avoid cache thrashing.
   */
  getZoomBucket(zoom) {
    if (zoom < 0.35) return 0.25;
    if (zoom < 0.6) return 0.5;
    if (zoom < 1.2) return 1.0;
    if (zoom < 2.5) return 2.0;
    return 4.0;
  }

  /**
   * Get a cached tile or null.
   *
   * @param {number} tileX - tile column
   * @param {number} tileY - tile row
   * @param {number} zoomBucket
   * @param {string} contentHash - hash of entity data in this tile
   * @returns {HTMLCanvasElement|null}
   */
  getTile(tileX, tileY, zoomBucket, contentHash) {
    const key = `${tileX}_${tileY}_${zoomBucket}`;
    const cached = this._tileCache.get(key);
    if (cached && cached.hash === contentHash) {
      cached.timestamp = Date.now();
      return cached.canvas;
    }
    return null;
  }

  /**
   * Store a tile in the cache.
   */
  setTile(tileX, tileY, zoomBucket, contentHash, canvas) {
    const key = `${tileX}_${tileY}_${zoomBucket}`;
    this._tileCache.set(key, {
      canvas,
      hash: contentHash,
      timestamp: Date.now(),
    });

    // Evict oldest tiles if over limit
    if (this._tileCache.size > this._tileCacheLimit) {
      this._evictOldTiles();
    }
  }

  /**
   * Invalidate tiles overlapping a world-space bounding box.
   */
  invalidateTilesInBBox(bbox) {
    const ts = this.TILE_SIZE;
    const keys = [];
    this._tileCache.forEach((val, key) => {
      keys.push(key);
    });
    // Simple approach: clear all (tile invalidation is complex)
    // In practice, tiles auto-invalidate via contentHash mismatch
    // so this is mainly for forced clears
    this._tileCache.clear();
  }

  /**
   * Clear all tiles.
   */
  clearTileCache() {
    this._tileCache.clear();
  }

  _evictOldTiles() {
    // Sort by timestamp, remove oldest 25%
    const entries = [...this._tileCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const removeCount = Math.floor(entries.length * 0.25);
    for (let i = 0; i < removeCount; i++) {
      this._tileCache.delete(entries[i][0]);
    }
  }

  // ═══ OffscreenCanvas Helper ══════════════════════════════════

  /**
   * Create an offscreen canvas (OffscreenCanvas if supported, else regular).
   */
  createOffscreen(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        return new OffscreenCanvas(width, height);
      } catch (e) {
        // Fallback
      }
    }
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  }

  // ═══ Idle Scheduler ══════════════════════════════════════════

  /**
   * Schedule non-urgent work to run during idle time.
   * @param {Function} fn - work function
   * @param {number} [priority=0] - lower = runs first
   */
  scheduleIdle(fn, priority) {
    this._idleQueue.push({ fn, priority: priority || 0 });
    this._idleQueue.sort((a, b) => a.priority - b.priority);
    this._processIdleQueue();
  }

  _processIdleQueue() {
    if (this._idleRunning || this._idleQueue.length === 0) return;
    this._idleRunning = true;

    const schedule = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback
      : (fn) => setTimeout(fn, 16);

    schedule((deadline) => {
      const hasTime = deadline && deadline.timeRemaining
        ? () => deadline.timeRemaining() > 2
        : () => true;

      while (this._idleQueue.length > 0 && hasTime()) {
        const item = this._idleQueue.shift();
        try {
          item.fn();
        } catch (e) {
          console.warn('Idle task error:', e);
        }
      }

      this._idleRunning = false;
      if (this._idleQueue.length > 0) {
        this._processIdleQueue();
      }
    });
  }

  // ═══ LOD Manager ═════════════════════════════════════════════

  /**
   * Get the current LOD level based on zoom.
   * @param {number} zoom
   * @returns {'low'|'medium'|'high'}
   */
  getLOD(zoom) {
    if (zoom < 0.5) return 'low';
    if (zoom > 1.5) return 'high';
    return 'medium';
  }

  /**
   * Get LOD-specific settings for renderers.
   */
  getLODSettings(zoom) {
    const lod = this.getLOD(zoom);

    switch (lod) {
      case 'low':
        return {
          lod,
          vegetation: false,       // skip vegetation entirely
          contourSimplify: true,   // simplified contour lines
          maxTerrainRes: 128,      // max terrain canvas dimension
          coastlineDetail: 0.5,    // reduced subdivision
          hillShading: true,       // keep hill shading (fast)
          atmosphere: true,        // keep atmosphere (fast)
          waveAnimation: false,    // skip wave animation
        };
      case 'high':
        return {
          lod,
          vegetation: true,
          contourSimplify: false,
          maxTerrainRes: 512,
          coastlineDetail: 1.0,
          hillShading: true,
          atmosphere: true,
          waveAnimation: true,
        };
      case 'medium':
      default:
        return {
          lod,
          vegetation: true,
          contourSimplify: false,
          maxTerrainRes: 256,
          coastlineDetail: 1.0,
          hillShading: true,
          atmosphere: true,
          waveAnimation: true,
        };
    }
  }

  // ═══ Dirty Tracking ══════════════════════════════════════════

  /**
   * Mark a specific entity as needing re-render.
   */
  markDirty(entityId) {
    this._dirtyEntities.add(entityId);
  }

  /**
   * Mark everything as dirty (e.g. theme change, zoom change).
   */
  markAllDirty() {
    this._globalDirty = true;
    this._dirtyEntities.clear();
  }

  /**
   * Check if an entity needs re-render.
   */
  isDirty(entityId) {
    return this._globalDirty || this._dirtyEntities.has(entityId);
  }

  /**
   * Clear dirty flags after a full render.
   */
  clearDirty() {
    this._globalDirty = false;
    this._dirtyEntities.clear();
  }

  // ═══ Entity Spatial Index (simple grid) ══════════════════════

  /**
   * Get bounding box for an entity.
   */
  getEntityBBox(entity) {
    const d = entity.data;
    switch (entity.type) {
      case 'territory':
      case 'region': {
        if (!d.points || d.points.length < 2) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of d.points) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      }
      case 'city':
      case 'text':
      case 'symbol':
        return { x: d.x - 20, y: d.y - 20, w: 40, h: 40 };
      case 'route':
        if (d.x1 === undefined) return null;
        return {
          x: Math.min(d.x1, d.x2) - 10,
          y: Math.min(d.y1, d.y2) - 10,
          w: Math.abs(d.x2 - d.x1) + 20,
          h: Math.abs(d.y2 - d.y1) + 20,
        };
      case 'river':
        if (d.sourceX === undefined) return null;
        // River bbox is approximate — use source with generous margin
        return { x: d.sourceX - 200, y: d.sourceY - 200, w: 400, h: 400 };
    }
    return null;
  }
}

export { PerformanceManager };
