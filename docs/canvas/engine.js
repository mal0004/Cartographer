/**
 * Cartographer — Canvas Engine Core
 *
 * Central CanvasEngine class: constructor, state, coordinate transforms,
 * and public API. Rendering, tools, and event handling are mixed in
 * from separate modules.
 */

import { TerrainRenderer } from '../terrain-renderer.js';
import { HillShading } from '../hill-shading.js';
import { Coastlines } from '../coastlines.js';
import { RiverEngine } from '../rivers.js';
import { VegetationRenderer } from '../vegetation.js';
import { Atmosphere } from '../atmosphere.js';
import { PerformanceManager } from '../performance.js';
import { RenderMixin } from './render.js';
import { ToolsMixin } from './tools.js';
import { EventsMixin } from './events.js';
import { TerritoryBrush } from './brush.js';

class CanvasEngine {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');

    // View state
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
    this.MIN_ZOOM = 0.2;
    this.MAX_ZOOM = 5;

    // Entities
    this.entities = [];

    // Current tool & state
    this.tool = 'select';
    this.toolColor = '#8B2635';
    this.toolOptions = {};
    this.symbolLibrary = null;

    // Selection
    this.selectedEntity = null;

    // Drawing state
    this.drawingPoints = [];
    this.routeStart = null;

    // Drag state
    this.isPanning = false;
    this.isDragging = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragEntityOrigData = null;

    // Resize observer
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this.canvas.parentElement);
    this._resize();

    // Event listeners
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    window.addEventListener('mousemove', (e) => this._onMouseMove(e));
    window.addEventListener('mouseup', (e) => this._onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => this._onContextMenu(e));
    document.addEventListener('keydown', (e) => this._onKeyDown(e));

    // Callbacks
    this.onEntitySelected = null;
    this.onEntityCreated = null;
    this.onEntityUpdated = null;
    this.onEntityDeleted = null;
    this.onEntityMoved = null;

    // External references (set by App)
    this.layersPanel = null;
    this.snapGuides = null;

    this._textureCache = {};

    // Brush tool
    this.brush = new TerritoryBrush(canvasEl, {
      onEntityCreated: (entity) => {
        if (this.onEntityCreated) this.onEntityCreated(entity);
      },
      stampLayer: (data) => this._stampLayer ? this._stampLayer(data) : data,
    });

    // Procedural sub-systems
    this.terrainRenderer = new TerrainRenderer();
    this.hillShading = new HillShading();
    this.coastlines = new Coastlines();
    this.riverEngine = new RiverEngine();
    this.vegetationRenderer = new VegetationRenderer();
    this.atmosphere = new Atmosphere();

    // Performance manager
    this.perf = new PerformanceManager();
    this.perf.setRenderFunction(() => this._doRender());
  }

  // ─── Coordinate transforms ──────────────────────────────────

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.zoom,
      y: (sy - this.offsetY) / this.zoom,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.zoom + this.offsetX,
      y: wy * this.zoom + this.offsetY,
    };
  }

  // ─── Resize ─────────────────────────────────────────────────

  _resize() {
    const parent = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = parent.clientWidth * dpr;
    this.canvas.height = parent.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = parent.clientWidth;
    this.height = parent.clientHeight;
    if (this.atmosphere) this.atmosphere.invalidate();
    this.render();
  }

  // ─── Public API ─────────────────────────────────────────────

  setEntities(entities) {
    this.entities = entities;
    this._textureCache = {};
    if (this.terrainRenderer) this.terrainRenderer.clearCache();
    if (this.hillShading) this.hillShading.invalidate();
    if (this.coastlines) this.coastlines.invalidate();
    if (this.riverEngine) this.riverEngine.invalidate();
    if (this.vegetationRenderer) this.vegetationRenderer.invalidate();
    if (this.perf) { this.perf.clearTileCache(); this.perf.markAllDirty(); }
    this.render();
  }

  setWorldSeed(seed) {
    if (this.coastlines) this.coastlines.setSeed(seed);
    if (this.riverEngine) this.riverEngine.setSeed(seed);
    if (this.vegetationRenderer) this.vegetationRenderer.setSeed(seed);
  }

  centerOn(x, y, targetZoom) {
    if (targetZoom) this.zoom = targetZoom;
    this.offsetX = this.width / 2 - x * this.zoom;
    this.offsetY = this.height / 2 - y * this.zoom;
    this._textureCache = {};
    this.render();
  }
}

// Mix in methods from sub-modules
Object.assign(CanvasEngine.prototype, RenderMixin, ToolsMixin, EventsMixin);

export { CanvasEngine };
