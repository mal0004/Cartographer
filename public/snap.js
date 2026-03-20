/**
 * Cartographer — Snap & Guides System
 *
 * Auto-snap to nearby entities, optional grid snap,
 * and manual guide lines (drag from screen edges).
 */

class SnapGuides {
  constructor(canvasEngine) {
    this.engine = canvasEngine;
    this.snapEnabled = true;
    this.gridSnapEnabled = false;
    this.snapThreshold = 8; // px in screen space
    this.guides = []; // { axis: 'h'|'v', pos: number (world coords) }
    this.activeSnaps = []; // current snap lines to draw

    // Guide creation state
    this._creatingGuide = false;
    this._guidePreview = null;
  }

  /** Toggle snap to elements */
  toggleSnap() {
    this.snapEnabled = !this.snapEnabled;
    return this.snapEnabled;
  }

  /** Toggle grid snap */
  toggleGridSnap() {
    this.gridSnapEnabled = !this.gridSnapEnabled;
    return this.gridSnapEnabled;
  }

  /**
   * Given a world position being dragged, compute snapped position.
   * Returns { x, y, snaps: [{axis, pos}] }
   */
  snap(wx, wy, excludeEntityId, altPressed) {
    if (altPressed || !this.snapEnabled) {
      return { x: wx, y: wy, snaps: [] };
    }

    const snaps = [];
    let sx = wx, sy = wy;
    const threshold = this.snapThreshold / this.engine.zoom;

    // Snap to other entities
    for (const e of this.engine.entities) {
      if (e.id === excludeEntityId) continue;
      // Layer visibility
      if (this.engine.layersPanel && !this.engine.layersPanel.isEntityVisible(e)) continue;

      const centers = this._getEntitySnapPoints(e);
      for (const pt of centers) {
        if (Math.abs(wx - pt.x) < threshold) {
          sx = pt.x;
          snaps.push({ axis: 'v', pos: pt.x });
        }
        if (Math.abs(wy - pt.y) < threshold) {
          sy = pt.y;
          snaps.push({ axis: 'h', pos: pt.y });
        }
      }
    }

    // Snap to manual guides
    for (const g of this.guides) {
      if (g.axis === 'v' && Math.abs(wx - g.pos) < threshold) {
        sx = g.pos;
        snaps.push({ axis: 'v', pos: g.pos });
      }
      if (g.axis === 'h' && Math.abs(wy - g.pos) < threshold) {
        sy = g.pos;
        snaps.push({ axis: 'h', pos: g.pos });
      }
    }

    // Snap to grid
    if (this.gridSnapEnabled) {
      let gridSize = 50;
      let spacing = gridSize * this.engine.zoom;
      while (spacing < 25) { spacing *= 2; gridSize *= 2; }
      while (spacing > 100) { spacing /= 2; gridSize /= 2; }

      const gx = Math.round(wx / gridSize) * gridSize;
      const gy = Math.round(wy / gridSize) * gridSize;
      if (Math.abs(wx - gx) < threshold) {
        sx = gx;
        snaps.push({ axis: 'v', pos: gx });
      }
      if (Math.abs(wy - gy) < threshold) {
        sy = gy;
        snaps.push({ axis: 'h', pos: gy });
      }
    }

    this.activeSnaps = snaps;
    return { x: sx, y: sy, snaps };
  }

  _getEntitySnapPoints(e) {
    const d = e.data;
    const pts = [];
    switch (e.type) {
      case 'city':
      case 'text':
      case 'symbol':
        pts.push({ x: d.x, y: d.y });
        break;
      case 'territory':
      case 'region':
        if (d.points && d.points.length >= 3) {
          const cx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
          const cy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;
          pts.push({ x: cx, y: cy });
        }
        break;
      case 'route':
        if (d.x1 !== undefined) {
          pts.push({ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 });
          pts.push({ x: (d.x1 + d.x2) / 2, y: (d.y1 + d.y2) / 2 });
        }
        break;
    }
    return pts;
  }

  /** Draw snap guide lines on the canvas */
  drawSnaps(ctx) {
    if (this.activeSnaps.length === 0 && this.guides.length === 0 && !this._guidePreview) return;

    ctx.save();

    // Draw persistent manual guides
    ctx.strokeStyle = '#F06292';
    ctx.lineWidth = 1 / this.engine.zoom;
    ctx.setLineDash([6 / this.engine.zoom, 4 / this.engine.zoom]);
    for (const g of this.guides) {
      ctx.beginPath();
      if (g.axis === 'v') {
        ctx.moveTo(g.pos, -10000);
        ctx.lineTo(g.pos, 10000);
      } else {
        ctx.moveTo(-10000, g.pos);
        ctx.lineTo(10000, g.pos);
      }
      ctx.stroke();
    }

    // Draw active snap lines
    if (this.activeSnaps.length > 0) {
      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 1 / this.engine.zoom;
      ctx.setLineDash([4 / this.engine.zoom, 4 / this.engine.zoom]);
      const drawn = new Set();
      for (const snap of this.activeSnaps) {
        const key = `${snap.axis}_${snap.pos}`;
        if (drawn.has(key)) continue;
        drawn.add(key);
        ctx.beginPath();
        if (snap.axis === 'v') {
          ctx.moveTo(snap.pos, -10000);
          ctx.lineTo(snap.pos, 10000);
        } else {
          ctx.moveTo(-10000, snap.pos);
          ctx.lineTo(10000, snap.pos);
        }
        ctx.stroke();
      }
    }

    // Guide preview during creation
    if (this._guidePreview) {
      ctx.strokeStyle = '#F06292';
      ctx.lineWidth = 1.5 / this.engine.zoom;
      ctx.setLineDash([4 / this.engine.zoom, 2 / this.engine.zoom]);
      ctx.beginPath();
      if (this._guidePreview.axis === 'v') {
        ctx.moveTo(this._guidePreview.pos, -10000);
        ctx.lineTo(this._guidePreview.pos, 10000);
      } else {
        ctx.moveTo(-10000, this._guidePreview.pos);
        ctx.lineTo(10000, this._guidePreview.pos);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  addGuide(axis, worldPos) {
    this.guides.push({ axis, pos: worldPos });
  }

  removeGuide(index) {
    this.guides.splice(index, 1);
  }

  clearActiveSnaps() {
    this.activeSnaps = [];
  }
}

window.SnapGuides = SnapGuides;
