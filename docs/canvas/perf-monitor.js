/** Cartographer — PerfMonitor: dev-mode FPS/frame-time overlay. Toggle with Alt+P. */

export class PerfMonitor {
  constructor() {
    this.enabled = false;
    this.fps = 0;
    this.frameTime = 0;
    this.entityCount = 0;
    this.drawCalls = 0;
    this._frames = [];
    this._lastTime = 0;
    this._el = null;
    this._listen();
  }

  _listen() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'p' && e.altKey) {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this._createOverlay();
    else this._removeOverlay();
  }

  _createOverlay() {
    if (this._el) return;
    this._el = document.createElement('div');
    this._el.className = 'perf-monitor';
    Object.assign(this._el.style, {
      position: 'fixed', top: '8px', right: '8px', zIndex: '9999',
      background: 'rgba(0,0,0,0.75)', color: '#0f0', fontFamily: 'monospace',
      fontSize: '11px', padding: '6px 10px', borderRadius: '4px',
      pointerEvents: 'none', lineHeight: '1.5',
    });
    document.body.appendChild(this._el);
  }

  _removeOverlay() {
    if (this._el) { this._el.remove(); this._el = null; }
  }

  beginFrame() {
    if (!this.enabled) return;
    this._frameStart = performance.now();
    this.drawCalls = 0;
  }

  endFrame(entityCount) {
    if (!this.enabled) return;
    const now = performance.now();
    this.frameTime = now - this._frameStart;
    this.entityCount = entityCount || 0;
    this._frames.push(now);
    // Keep last 60 timestamps for FPS calculation
    while (this._frames.length > 60) this._frames.shift();
    if (this._frames.length >= 2) {
      const elapsed = this._frames[this._frames.length - 1] - this._frames[0];
      this.fps = elapsed > 0 ? Math.round((this._frames.length - 1) * 1000 / elapsed) : 0;
    }
    this._updateOverlay();
  }

  countDraw() {
    if (this.enabled) this.drawCalls++;
  }

  _updateOverlay() {
    if (!this._el) return;
    const color = this.fps >= 55 ? '#0f0' : this.fps >= 30 ? '#ff0' : '#f00';
    this._el.innerHTML =
      `<span style="color:${color}">${this.fps} FPS</span> ` +
      `${this.frameTime.toFixed(1)}ms<br>` +
      `${this.entityCount} entities · ${this.drawCalls} draws`;
  }

  getStats() {
    return {
      fps: this.fps,
      frameTime: this.frameTime,
      entityCount: this.entityCount,
      drawCalls: this.drawCalls,
    };
  }
}
