/**
 * Cartographer — Layer Manager
 *
 * 5 offscreen canvas layers composited onto the main canvas.
 * Only dirty layers are redrawn, saving GPU/CPU time.
 */

const LAYER_ORDER = ['background', 'terrain', 'entities', 'ui', 'overlay'];

export class LayerManager {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.layers = {};
    this.dirty = {};
    this.ctxCache = {};
    for (const name of LAYER_ORDER) {
      this.layers[name] = this._createCanvas(width, height);
      this.dirty[name] = true;
      this.ctxCache[name] = null;
    }
  }

  _createCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(w, h);
    }
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  getCtx(name) {
    if (!this.ctxCache[name]) {
      this.ctxCache[name] = this.layers[name].getContext('2d');
    }
    return this.ctxCache[name];
  }

  markDirty(name) {
    if (name) this.dirty[name] = true;
    else for (const n of LAYER_ORDER) this.dirty[n] = true;
  }

  markClean(name) {
    this.dirty[name] = false;
  }

  anyDirty() {
    for (const name of LAYER_ORDER) {
      if (this.dirty[name]) return true;
    }
    return false;
  }

  clearLayer(name) {
    const ctx = this.getCtx(name);
    ctx.clearRect(0, 0, this.width, this.height);
  }

  composite(mainCtx) {
    mainCtx.clearRect(0, 0, this.width, this.height);
    for (const name of LAYER_ORDER) {
      const layer = this.layers[name];
      if (layer.width > 0 && layer.height > 0) {
        mainCtx.drawImage(layer, 0, 0);
      }
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    for (const name of LAYER_ORDER) {
      const canvas = this.layers[name];
      canvas.width = width;
      canvas.height = height;
      this.ctxCache[name] = null;
      this.dirty[name] = true;
    }
  }

  getDirtyLayers() {
    return LAYER_ORDER.filter(n => this.dirty[n]);
  }
}
