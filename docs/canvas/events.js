/**
 * Cartographer — Canvas Input Events
 *
 * Mouse, keyboard, and wheel event handlers mixed into CanvasEngine prototype.
 * Also includes hit testing and entity movement.
 */

export const EventsMixin = {

  _onMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.panStartX = e.clientX - this.offsetX;
      this.panStartY = e.clientY - this.offsetY;
      this.canvas.classList.add('cursor-grabbing');
      return;
    }

    if (e.button !== 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = this.screenToWorld(sx, sy);

    if (this.tool === 'select') {
      const hit = this.hitTest(wx, wy);
      if (hit) {
        this.selectEntity(hit);
        this.isDragging = true;
        this.dragStartX = wx;
        this.dragStartY = wy;
        this.dragEntityOrigData = JSON.parse(JSON.stringify(hit.data));
      } else {
        this.selectEntity(null);
        this.isPanning = true;
        this.panStartX = e.clientX - this.offsetX;
        this.panStartY = e.clientY - this.offsetY;
        this.canvas.classList.add('cursor-grabbing');
      }
    } else if (this.tool === 'territory' || this.tool === 'region') {
      this.drawingPoints.push({ x: wx, y: wy });
      this.render();
    } else if (this.tool === 'city') {
      this._createCity(wx, wy);
    } else if (this.tool === 'route') {
      if (!this.routeStart) {
        this.routeStart = { x: wx, y: wy };
        this.render();
      } else {
        this._createRoute(this.routeStart.x, this.routeStart.y, wx, wy);
        this.routeStart = null;
      }
    } else if (this.tool === 'text') {
      this._createText(wx, wy);
    } else if (this.tool === 'symbol') {
      this._createSymbol(wx, wy);
    } else if (this.tool === 'river') {
      this._createRiver(wx, wy);
    }
  },

  _onMouseMove(e) {
    if (this.isPanning) {
      this.offsetX = e.clientX - this.panStartX;
      this.offsetY = e.clientY - this.panStartY;
      this.render();
      return;
    }
    if (this.isDragging && this.selectedEntity) {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { x: wx, y: wy } = this.screenToWorld(sx, sy);
      let dx = wx - this.dragStartX;
      let dy = wy - this.dragStartY;
      this._moveEntity(this.selectedEntity, this.dragEntityOrigData, dx, dy);
      if (this.snapGuides) {
        const center = this._getEntityCenter(this.selectedEntity);
        if (center) {
          const snapped = this.snapGuides.snap(center.x, center.y, this.selectedEntity.id, e.altKey);
          const snapDx = snapped.x - center.x;
          const snapDy = snapped.y - center.y;
          if (snapDx !== 0 || snapDy !== 0) {
            this._moveEntity(this.selectedEntity, this.dragEntityOrigData, dx + snapDx, dy + snapDy);
          }
        }
      }
      this.render();
    }
  },

  _onMouseUp() {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.classList.remove('cursor-grabbing');
      return;
    }
    if (this.isDragging && this.selectedEntity) {
      this.isDragging = false;
      if (this.snapGuides) this.snapGuides.clearActiveSnaps();
      if (this.onEntityMoved) {
        this.onEntityMoved(this.selectedEntity, this.dragEntityOrigData);
      } else if (this.onEntityUpdated) {
        this.onEntityUpdated(this.selectedEntity);
      }
    }
  },

  _onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const oldZoom = this.zoom;
    const delta = -e.deltaY * 0.001;
    this.zoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.zoom * (1 + delta)));

    this.offsetX = mx - (mx - this.offsetX) * (this.zoom / oldZoom);
    this.offsetY = my - (my - this.offsetY) * (this.zoom / oldZoom);

    this._textureCache = {};
    this.render();
  },

  _onContextMenu(e) {
    e.preventDefault();
    if ((this.tool === 'territory' || this.tool === 'region') && this.drawingPoints.length >= 3) {
      this._createPolygon(this.tool, this.drawingPoints);
      this.drawingPoints = [];
      this.render();
    }
  },

  _onKeyDown(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedEntity) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (this.onEntityDeleted) this.onEntityDeleted(this.selectedEntity);
      this.selectedEntity = null;
      this.render();
    }

    if (e.key === 'Escape') {
      this.drawingPoints = [];
      this.routeStart = null;
      this.selectEntity(null);
      this.render();
    }

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const shortcuts = { v: 'select', t: 'territory', c: 'city', r: 'route', n: 'region', x: 'text', s: 'symbol', w: 'river' };
    if (shortcuts[e.key]) this.setTool(shortcuts[e.key]);
  },

  // ─── Hit testing ────────────────────────────────────────────

  hitTest(wx, wy) {
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (this._hitEntity(e, wx, wy)) return e;
    }
    return null;
  },

  _hitEntity(e, wx, wy) {
    const d = e.data;
    switch (e.type) {
      case 'city':
        return Math.hypot(wx - d.x, wy - d.y) < 15;
      case 'text': {
        const size = d.fontSize || 16;
        const approxWidth = (e.name || d.text || '').length * size * 0.6;
        return wx >= d.x - 2 && wx <= d.x + approxWidth && wy >= d.y - size && wy <= d.y + 4;
      }
      case 'territory':
      case 'region':
        return d.points && d.points.length >= 3 && this._pointInPolygon(wx, wy, d.points);
      case 'route':
        if (d.x1 === undefined) return false;
        return this._distToSegment(wx, wy, d.x1, d.y1, d.x2, d.y2) < 10;
      case 'symbol': {
        const s = (d.size || 32) / 2 + 4;
        return Math.abs(wx - d.x) < s && Math.abs(wy - d.y) < s;
      }
      case 'river': {
        if (d.sourceX === undefined) return false;
        if (Math.hypot(wx - d.sourceX, wy - d.sourceY) < 10) return true;
        if (this.riverEngine) {
          const hit = this.riverEngine.hitTest(wx, wy, [e], this.terrainRenderer, this.entities, 8);
          return !!hit;
        }
        return false;
      }
    }
    return false;
  },

  _pointInPolygon(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  },

  _distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  },

  // ─── Entity movement ───────────────────────────────────────

  _moveEntity(entity, origData, dx, dy) {
    const d = entity.data;
    switch (entity.type) {
      case 'city': case 'text': case 'symbol':
        d.x = origData.x + dx;
        d.y = origData.y + dy;
        break;
      case 'territory': case 'region':
        if (origData.points) d.points = origData.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        break;
      case 'route':
        d.x1 = origData.x1 + dx; d.y1 = origData.y1 + dy;
        d.x2 = origData.x2 + dx; d.y2 = origData.y2 + dy;
        if (origData.cx1 !== undefined) {
          d.cx1 = origData.cx1 + dx; d.cy1 = origData.cy1 + dy;
          d.cx2 = origData.cx2 + dx; d.cy2 = origData.cy2 + dy;
        }
        break;
      case 'river':
        d.sourceX = origData.sourceX + dx;
        d.sourceY = origData.sourceY + dy;
        if (this.riverEngine) this.riverEngine.invalidate(entity.id);
        break;
    }
  },

  _getEntityCenter(entity) {
    const d = entity.data;
    switch (entity.type) {
      case 'city': case 'text': case 'symbol':
        return { x: d.x, y: d.y };
      case 'territory': case 'region':
        if (d.points && d.points.length > 0) {
          return { x: d.points.reduce((s, p) => s + p.x, 0) / d.points.length, y: d.points.reduce((s, p) => s + p.y, 0) / d.points.length };
        }
        return null;
      case 'route':
        return d.x1 !== undefined ? { x: (d.x1 + d.x2) / 2, y: (d.y1 + d.y2) / 2 } : null;
      case 'river':
        return d.sourceX !== undefined ? { x: d.sourceX, y: d.sourceY } : null;
    }
    return null;
  },

  selectEntity(entity) {
    this.selectedEntity = entity;
    if (this.onEntitySelected) this.onEntitySelected(entity);
    this.render();
  },
};
