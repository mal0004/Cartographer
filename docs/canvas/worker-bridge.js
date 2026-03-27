/** Cartographer — Worker Bridge: async interface to compute-worker. */

export class WorkerBridge {
  constructor() {
    this._worker = null;
    this._pending = new Map();
    this._nextId = 0;
    this._init();
  }

  _init() {
    try {
      const url = new URL('./compute-worker.js', import.meta.url);
      this._worker = new Worker(url);
      this._worker.onmessage = (e) => this._onMessage(e);
      this._worker.onerror = () => { this._worker = null; };
    } catch {
      this._worker = null;
    }
  }

  get available() { return !!this._worker; }

  _onMessage(e) {
    const { id, result, error } = e.data;
    const cb = this._pending.get(id);
    if (!cb) return;
    this._pending.delete(id);
    if (error) cb.reject(new Error(error));
    else cb.resolve(result);
  }

  _send(type, payload, transfer) {
    return new Promise((resolve, reject) => {
      if (!this._worker) { reject(new Error('Worker unavailable')); return; }
      const id = this._nextId++;
      this._pending.set(id, { resolve, reject });
      this._worker.postMessage({ type, id, payload }, transfer || []);
    });
  }

  simplifyPolygon(points, tolerance) {
    return this._send('simplifyPolygon', { points, tolerance });
  }

  computeShading(points, intensity, terrain) {
    return this._send('computeShading', { points, intensity, terrain });
  }

  detectAdjacency(polygons, threshold = 30) {
    const data = polygons.map(p => ({ id: p.id, points: p.data ? p.data.points : p.points }));
    return this._send('detectAdjacency', { polygons: data, threshold });
  }

  computeVegetation(points, density = 1, seed = 42) {
    return this._send('computeVegetation', { points, density, seed });
  }

  terminate() {
    if (this._worker) { this._worker.terminate(); this._worker = null; }
    for (const cb of this._pending.values()) cb.reject(new Error('Terminated'));
    this._pending.clear();
  }
}
