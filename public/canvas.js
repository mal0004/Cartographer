/* canvas.js — Infinite canvas engine for Cartographer
   Pan, zoom, tool-based drawing, selection, persistence via REST API
*/
'use strict';

(function () {
  /* ── State ─────────────────────────────────────────────────────────────── */
  let worldId   = null;
  let elements  = [];   // [{id, type, data}]
  let tool      = 'select';
  let zoom      = 1;
  let panX      = 0, panY = 0;
  let dragging  = false;
  let dragStart = null;
  let selectedId= null;
  let dragEl    = null;
  let undoStack = [];

  // Tool-specific in-progress state
  let polyPoints  = [];   // territory / region drawing
  let routeStart  = null; // first click for a route

  // Options configurable per tool
  const toolOpts = {
    territory: { color: '#8B2635' },
    city:      { importance: 'city' },
    route:     { style: 'road' },
    region:    { subtype: 'forest' },
    text:      { fontSize: 16, bold: false, italic: false },
  };

  const canvas  = document.getElementById('map-canvas');
  const ctx     = canvas.getContext('2d');

  /* ── Init ─────────────────────────────────────────────────────────────── */
  function init(wid, els) {
    worldId  = wid;
    elements = els || [];
    panX = 0; panY = 0; zoom = 1;
    undoStack = [];
    resizeCanvas();
    render();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  || canvas.offsetWidth;
    canvas.height = rect.height || canvas.offsetHeight;
  }

  window.addEventListener('resize', () => { resizeCanvas(); render(); });

  /* ── Coordinate helpers ───────────────────────────────────────────────── */
  function toWorld(cx, cy) {
    return {
      x: (cx - panX) / zoom,
      y: (cy - panY) / zoom,
    };
  }
  function toCanvas(wx, wy) {
    return { x: wx * zoom + panX, y: wy * zoom + panY };
  }
  function clientToCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  function render() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Draw saved elements
    for (const el of elements) {
      drawElement(el, el.id === selectedId);
    }

    // Draw in-progress polygon / region
    if ((tool === 'territory' || tool === 'region') && polyPoints.length > 0) {
      drawInProgressPoly();
    }
    // Draw in-progress route
    if (tool === 'route' && routeStart) {
      drawInProgressRoute();
    }

    ctx.restore();
  }

  /* ── Grid ─────────────────────────────────────────────────────────────── */
  function drawGrid() {
    const step    = Math.max(20, 80 * zoom);
    const offsetX = panX % step;
    const offsetY = panY % step;
    const night   = document.body.classList.contains('night');
    ctx.strokeStyle = night ? 'rgba(232,224,208,0.06)' : 'rgba(44,24,16,0.06)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = offsetX; x < canvas.width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    for (let y = offsetY; y < canvas.height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
  }

  /* ── Element drawing ──────────────────────────────────────────────────── */
  function drawElement(el, selected) {
    const d = el.data;
    ctx.save();
    if (selected) {
      ctx.shadowColor  = '#C9A84C';
      ctx.shadowBlur   = 12 / zoom;
    }
    switch (el.type) {
      case 'territory': drawTerritory(d, selected); break;
      case 'city':      drawCity(d, selected);      break;
      case 'route':     drawRoute(d, selected);     break;
      case 'region':    drawRegion(d, selected);    break;
      case 'text':      drawText(d, selected);      break;
    }
    ctx.restore();
  }

  function drawTerritory(d, sel) {
    if (!d.points || d.points.length < 2) return;
    const col = d.color || '#8B2635';
    ctx.beginPath();
    ctx.moveTo(d.points[0].x, d.points[0].y);
    for (let i = 1; i < d.points.length; i++) {
      ctx.lineTo(d.points[i].x, d.points[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = hexAlpha(col, 0.25);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth   = sel ? 3 / zoom : 2 / zoom;
    ctx.stroke();

    if (d.name) {
      const cx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
      const cy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;
      ctx.fillStyle = col;
      ctx.font = `600 ${14 / zoom}px Cinzel, serif`;
      ctx.textAlign = 'center';
      ctx.fillText(d.name, cx, cy);
    }
  }

  function drawCity(d, sel) {
    const r = (d.importance === 'capital' ? 8 : d.importance === 'village' ? 4 : 6) / zoom;
    ctx.beginPath();
    ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
    ctx.fillStyle   = '#2C1810';
    ctx.strokeStyle = '#F5F0E8';
    ctx.lineWidth   = 1.5 / zoom;
    ctx.fill();
    ctx.stroke();

    if (d.importance === 'capital') {
      // Star for capital
      drawStar(d.x, d.y, r * 1.8, 5, ctx);
      ctx.fillStyle = '#8B2635';
      ctx.fill();
    }

    if (d.name) {
      ctx.fillStyle  = document.body.classList.contains('night') ? '#E8E0D0' : '#2C1810';
      ctx.font       = `${12 / zoom}px 'IM Fell English', serif`;
      ctx.textAlign  = 'left';
      ctx.fillText(d.name, d.x + r + 4 / zoom, d.y + 4 / zoom);
    }
    if (sel) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, r + 4 / zoom, 0, Math.PI * 2);
      ctx.strokeStyle = '#C9A84C';
      ctx.lineWidth   = 1.5 / zoom;
      ctx.stroke();
    }
  }

  function drawRoute(d, sel) {
    if (d.x1 === undefined) return;
    const dash = d.style === 'track' ? [6 / zoom, 4 / zoom] : [];
    const sw   = (d.style === 'royal' ? 3 : 2) / zoom;
    const col  = d.style === 'royal' ? '#8B2635' : (document.body.classList.contains('night') ? '#A09080' : '#2C1810');
    ctx.beginPath();
    ctx.moveTo(d.x1, d.y1);
    ctx.bezierCurveTo(
      d.cx1 ?? d.x1, d.cy1 ?? d.y1,
      d.cx2 ?? d.x2, d.cy2 ?? d.y2,
      d.x2, d.y2
    );
    ctx.strokeStyle = col;
    ctx.lineWidth   = sw;
    ctx.setLineDash(dash);
    ctx.globalAlpha = 0.75;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    if (sel) {
      ctx.beginPath();
      ctx.arc(d.x1, d.y1, 5 / zoom, 0, Math.PI * 2);
      ctx.arc(d.x2, d.y2, 5 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#C9A84C';
      ctx.fill();
    }
  }

  function drawRegion(d, sel) {
    if (!d.points || d.points.length < 2) return;
    const col = regionColor(d.subtype);
    ctx.beginPath();
    ctx.moveTo(d.points[0].x, d.points[0].y);
    for (let i = 1; i < d.points.length; i++) ctx.lineTo(d.points[i].x, d.points[i].y);
    ctx.closePath();
    ctx.fillStyle   = hexAlpha(col, 0.2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth   = 1.5 / zoom;
    ctx.setLineDash([8 / zoom, 4 / zoom]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Texture overlay
    drawRegionTexture(d);

    if (d.name) {
      const cx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
      const cy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;
      ctx.fillStyle  = col;
      ctx.font       = `italic ${13 / zoom}px 'IM Fell English', serif`;
      ctx.textAlign  = 'center';
      ctx.fillText(d.name, cx, cy);
    }
  }

  function drawRegionTexture(d) {
    if (!d.points || d.points.length < 3) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(d.points[0].x, d.points[0].y);
    for (let i = 1; i < d.points.length; i++) ctx.lineTo(d.points[i].x, d.points[i].y);
    ctx.closePath();
    ctx.clip();
    const col = regionColor(d.subtype);
    ctx.strokeStyle = hexAlpha(col, 0.35);
    ctx.lineWidth   = 1 / zoom;
    const spacing   = 18 / zoom;
    // Simple hatch lines
    const bb = bbox(d.points);
    switch (d.subtype) {
      case 'mountain':
        for (let x = bb.minX; x < bb.maxX; x += spacing * 2) {
          for (let y = bb.minY; y < bb.maxY; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, y + spacing);
            ctx.lineTo(x + spacing, y);
            ctx.lineTo(x + spacing * 2, y + spacing);
            ctx.stroke();
          }
        }
        break;
      case 'forest':
        for (let x = bb.minX; x < bb.maxX; x += spacing * 1.5) {
          for (let y = bb.minY; y < bb.maxY; y += spacing * 1.5) {
            ctx.beginPath();
            ctx.arc(x, y, spacing * 0.4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        break;
      case 'desert':
        for (let y = bb.minY; y < bb.maxY; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(bb.minX, y);
          for (let x = bb.minX; x < bb.maxX; x += spacing * 0.5) {
            ctx.lineTo(x, y + (Math.sin(x * 0.2) * spacing * 0.3));
          }
          ctx.stroke();
        }
        break;
      case 'ocean':
        for (let y = bb.minY; y < bb.maxY; y += spacing * 0.7) {
          ctx.beginPath();
          ctx.moveTo(bb.minX, y);
          for (let x = bb.minX; x < bb.maxX; x += spacing) {
            ctx.bezierCurveTo(x + spacing * 0.3, y - spacing * 0.3, x + spacing * 0.7, y + spacing * 0.3, x + spacing, y);
          }
          ctx.stroke();
        }
        break;
    }
    ctx.restore();
  }

  function drawText(d, sel) {
    ctx.font      = `${d.italic ? 'italic ' : ''}${d.bold ? '700 ' : ''}${(d.fontSize || 16) / zoom}px 'IM Fell English', serif`;
    ctx.fillStyle = document.body.classList.contains('night') ? '#E8E0D0' : '#2C1810';
    ctx.textAlign = 'left';
    ctx.fillText(d.text || '', d.x, d.y);
    if (sel) {
      const m = ctx.measureText(d.text || '');
      const h = (d.fontSize || 16) / zoom;
      ctx.strokeStyle = '#C9A84C';
      ctx.lineWidth   = 1 / zoom;
      ctx.strokeRect(d.x - 2 / zoom, d.y - h - 2 / zoom, m.width + 4 / zoom, h + 6 / zoom);
    }
  }

  /* ── In-progress drawing helpers ──────────────────────────────────────── */
  function drawInProgressPoly() {
    if (polyPoints.length === 0) return;
    const col = tool === 'territory'
      ? (toolOpts.territory.color || '#8B2635')
      : regionColor(toolOpts.region.subtype);
    ctx.beginPath();
    ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
    for (let i = 1; i < polyPoints.length; i++) ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
    ctx.strokeStyle = col;
    ctx.lineWidth   = 2 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const p of polyPoints) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
    }
  }

  function drawInProgressRoute() {
    ctx.beginPath();
    ctx.arc(routeStart.x, routeStart.y, 6 / zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#C9A84C';
    ctx.fill();
  }

  /* ── Hit-testing ──────────────────────────────────────────────────────── */
  function hitTest(wx, wy) {
    // Iterate in reverse so top elements get priority
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (elementContains(el, wx, wy)) return el;
    }
    return null;
  }

  function elementContains(el, wx, wy) {
    const d = el.data;
    switch (el.type) {
      case 'territory':
      case 'region': {
        if (!d.points || d.points.length < 3) return false;
        return pointInPolygon(wx, wy, d.points);
      }
      case 'city': {
        const r = (d.importance === 'capital' ? 10 : 7) / zoom;
        return Math.hypot(wx - d.x, wy - d.y) < r;
      }
      case 'route': {
        if (d.x1 === undefined) return false;
        return distToBezier(wx, wy, d) < 8 / zoom;
      }
      case 'text': {
        return wx > d.x - 4 && wy > d.y - (d.fontSize || 16) - 4 && wx < d.x + 200 && wy < d.y + 4;
      }
    }
    return false;
  }

  function pointInPolygon(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function distToBezier(px, py, d) {
    let minD = Infinity;
    for (let t = 0; t <= 1; t += 0.05) {
      const bx = cubicBezier(d.x1, d.cx1 ?? d.x1, d.cx2 ?? d.x2, d.x2, t);
      const by = cubicBezier(d.y1, d.cy1 ?? d.y1, d.cy2 ?? d.y2, d.y2, t);
      const dist = Math.hypot(px - bx, py - by);
      if (dist < minD) minD = dist;
    }
    return minD;
  }

  function cubicBezier(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
  }

  /* ── Mouse / pointer events ───────────────────────────────────────────── */
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup',   onMouseUp);
  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('wheel',     onWheel, { passive: false });
  canvas.addEventListener('dblclick',  onDblClick);

  function onMouseDown(e) {
    const cp  = clientToCanvas(e);
    const wp  = toWorld(cp.x, cp.y);

    if (e.button === 1 || (e.button === 0 && tool === 'select' && !hitTest(wp.x, wp.y))) {
      dragging   = true;
      dragStart  = cp;
      document.body.setAttribute('data-dragging', 'true');
      return;
    }

    if (e.button === 0) {
      handleToolDown(wp, cp, e);
    }
  }

  function onMouseMove(e) {
    const cp = clientToCanvas(e);
    const wp = toWorld(cp.x, cp.y);

    if (dragging && dragStart) {
      // Are we panning the canvas or moving a selected element?
      if (dragEl) {
        moveElement(dragEl, cp, wp);
      } else {
        panX += cp.x - dragStart.x;
        panY += cp.y - dragStart.y;
        dragStart = cp;
      }
      render();
      return;
    }
    // Live-draw cursor position for poly tools
    if ((tool === 'territory' || tool === 'region') && polyPoints.length > 0) {
      render();
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);
      const col = tool === 'territory' ? (toolOpts.territory.color || '#8B2635') : regionColor(toolOpts.region.subtype);
      ctx.beginPath();
      ctx.moveTo(polyPoints[polyPoints.length - 1].x, polyPoints[polyPoints.length - 1].y);
      ctx.lineTo(wp.x, wp.y);
      ctx.strokeStyle = hexAlpha(col, 0.5);
      ctx.lineWidth   = 1.5 / zoom;
      ctx.setLineDash([5 / zoom, 3 / zoom]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  function onMouseUp(e) {
    if (dragging && dragEl) {
      persistElement(dragEl);
    }
    dragging  = false;
    dragStart = null;
    dragEl    = null;
    document.body.removeAttribute('data-dragging');
    render();
  }

  function onContextMenu(e) {
    e.preventDefault();
    if (tool === 'territory' || tool === 'region') {
      closePolygon();
    }
  }

  function onDblClick(e) {
    const cp = clientToCanvas(e);
    const wp = toWorld(cp.x, cp.y);
    if ((tool === 'territory' || tool === 'region') && polyPoints.length >= 3) {
      closePolygon();
    }
  }

  function onWheel(e) {
    e.preventDefault();
    const cp    = clientToCanvas(e);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZ  = Math.min(5, Math.max(0.2, zoom * delta));
    panX = cp.x - (cp.x - panX) * (newZ / zoom);
    panY = cp.y - (cp.y - panY) * (newZ / zoom);
    zoom = newZ;
    document.getElementById('zoom-level').textContent = Math.round(zoom * 100) + '%';
    render();
  }

  /* ── Tool actions ──────────────────────────────────────────────────────── */
  function handleToolDown(wp, cp, e) {
    switch (tool) {
      case 'select': {
        const hit = hitTest(wp.x, wp.y);
        if (hit) {
          selectedId = hit.id;
          dragging   = true;
          dragStart  = cp;
          dragEl     = hit;
          window.SidebarModule?.open(hit);
        } else {
          selectedId = null;
          window.SidebarModule?.close();
        }
        render();
        break;
      }
      case 'territory':
      case 'region':
        polyPoints.push({ x: wp.x, y: wp.y });
        render();
        break;

      case 'city':
        createCityAt(wp);
        break;

      case 'route':
        handleRouteClick(wp);
        break;

      case 'text':
        promptText(wp);
        break;
    }
  }

  function moveElement(el, cp, wp) {
    const d = el.data;
    const dx = (cp.x - (dragStart?.x ?? cp.x)) / zoom;
    const dy = (cp.y - (dragStart?.y ?? cp.y)) / zoom;
    dragStart = cp;

    switch (el.type) {
      case 'city':
      case 'text':
        d.x += dx;
        d.y += dy;
        break;
      case 'territory':
      case 'region':
        for (const p of d.points) { p.x += dx; p.y += dy; }
        break;
      case 'route':
        d.x1 += dx; d.y1 += dy;
        d.x2 += dx; d.y2 += dy;
        if (d.cx1 !== undefined) { d.cx1 += dx; d.cy1 += dy; d.cx2 += dx; d.cy2 += dy; }
        break;
    }
    render();
  }

  function closePolygon() {
    if (polyPoints.length < 3) { polyPoints = []; render(); return; }
    const data = { points: polyPoints.slice() };
    if (tool === 'territory') {
      data.color = toolOpts.territory.color;
      data.name  = '';
    } else {
      data.subtype = toolOpts.region.subtype;
      data.name    = '';
    }
    saveNew(tool, data);
    polyPoints = [];
  }

  async function createCityAt(wp) {
    const data = {
      x: wp.x, y: wp.y,
      importance: toolOpts.city.importance,
      name: 'New City',
      population: '', founded: '', description: '',
    };
    const el = await saveNew('city', data);
    selectedId = el.id;
    render();
    window.SidebarModule?.open(el);
  }

  function handleRouteClick(wp) {
    if (!routeStart) {
      routeStart = { x: wp.x, y: wp.y };
      render();
    } else {
      const x1 = routeStart.x, y1 = routeStart.y;
      const x2 = wp.x,         y2 = wp.y;
      const cx1 = x1 + (x2 - x1) / 3;
      const cy1 = y1;
      const cx2 = x1 + 2 * (x2 - x1) / 3;
      const cy2 = y2;
      const data = { x1, y1, x2, y2, cx1, cy1, cx2, cy2, style: toolOpts.route.style, name: '' };
      saveNew('route', data);
      routeStart = null;
    }
  }

  function promptText(wp) {
    const text = window.prompt('Enter label text:');
    if (!text) return;
    const data = {
      x: wp.x, y: wp.y,
      text,
      fontSize: toolOpts.text.fontSize,
      bold: toolOpts.text.bold,
      italic: toolOpts.text.italic,
    };
    saveNew('text', data);
  }

  /* ── Persistence ──────────────────────────────────────────────────────── */
  async function saveNew(type, data) {
    try {
      const res = await fetch(`/api/worlds/${worldId}/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      });
      const el = await res.json();
      undoStack.push({ action: 'create', id: el.id });
      elements.push(el);
      render();
      return el;
    } catch (err) {
      console.error('saveNew failed', err);
    }
  }

  async function persistElement(el) {
    try {
      await fetch(`/api/worlds/${worldId}/elements/${el.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: el.data }),
      });
    } catch (err) {
      console.error('persistElement failed', err);
    }
  }

  async function updateElement(id, data) {
    try {
      const res = await fetch(`/api/worlds/${worldId}/elements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const updated = await res.json();
      const idx = elements.findIndex(e => e.id === id);
      if (idx !== -1) elements[idx] = updated;
      render();
      return updated;
    } catch (err) {
      console.error('updateElement failed', err);
    }
  }

  async function deleteSelected() {
    if (!selectedId) return;
    try {
      await fetch(`/api/worlds/${worldId}/elements/${selectedId}`, { method: 'DELETE' });
      undoStack.push({ action: 'delete', id: selectedId, el: elements.find(e => e.id === selectedId) });
      elements = elements.filter(e => e.id !== selectedId);
      selectedId = null;
      render();
      window.SidebarModule?.close();
    } catch (err) {
      console.error('deleteSelected failed', err);
    }
  }

  async function undo() {
    const last = undoStack.pop();
    if (!last) return;
    if (last.action === 'create') {
      await fetch(`/api/worlds/${worldId}/elements/${last.id}`, { method: 'DELETE' });
      elements = elements.filter(e => e.id !== last.id);
    }
    render();
  }

  /* ── Keyboard shortcuts ────────────────────────────────────────────────── */
  document.addEventListener('keydown', (e) => {
    // Only active in editor screen
    if (!document.getElementById('editor-screen').classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    if (e.ctrlKey && e.key === 'z') undo();
    if (e.key === '0') resetZoom();

    const toolKeys = { v: 'select', t: 'territory', c: 'city', r: 'route', n: 'region', x: 'text' };
    if (toolKeys[e.key.toLowerCase()]) setTool(toolKeys[e.key.toLowerCase()]);
  });

  /* ── Tool switching ────────────────────────────────────────────────────── */
  function setTool(t) {
    tool       = t;
    polyPoints = [];
    routeStart = null;
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === t);
    });
    document.body.setAttribute('data-tool', t);
    updateToolOptions();
    render();
  }

  function updateToolOptions() {
    const el = document.getElementById('tool-options');
    el.innerHTML = '';
    switch (tool) {
      case 'territory':
        el.innerHTML = `
          <label class="tool-option-label">Color</label>
          <input type="color" value="${toolOpts.territory.color}" id="opt-terr-color"/>`;
        el.querySelector('#opt-terr-color').addEventListener('input', e => {
          toolOpts.territory.color = e.target.value;
        });
        break;
      case 'city':
        el.innerHTML = `
          <label class="tool-option-label">Type</label>
          <select class="tool-select" id="opt-city-imp">
            <option value="village">Village</option>
            <option value="city" selected>City</option>
            <option value="capital">Capital</option>
          </select>`;
        el.querySelector('#opt-city-imp').value = toolOpts.city.importance;
        el.querySelector('#opt-city-imp').addEventListener('change', e => {
          toolOpts.city.importance = e.target.value;
        });
        break;
      case 'route':
        el.innerHTML = `
          <label class="tool-option-label">Style</label>
          <select class="tool-select" id="opt-route-style">
            <option value="track">Track</option>
            <option value="road" selected>Road</option>
            <option value="royal">Royal Road</option>
          </select>`;
        el.querySelector('#opt-route-style').value = toolOpts.route.style;
        el.querySelector('#opt-route-style').addEventListener('change', e => {
          toolOpts.route.style = e.target.value;
        });
        break;
      case 'region':
        el.innerHTML = `
          <label class="tool-option-label">Type</label>
          <select class="tool-select" id="opt-region-sub">
            <option value="forest">Forest</option>
            <option value="mountain">Mountain</option>
            <option value="desert">Desert</option>
            <option value="ocean">Ocean</option>
          </select>`;
        el.querySelector('#opt-region-sub').value = toolOpts.region.subtype;
        el.querySelector('#opt-region-sub').addEventListener('change', e => {
          toolOpts.region.subtype = e.target.value;
        });
        break;
      case 'text':
        el.innerHTML = `
          <label class="tool-option-label">Size</label>
          <input type="number" value="${toolOpts.text.fontSize}" min="8" max="72" step="2"
            id="opt-text-size" style="width:52px;background:var(--c-bg-alt);border:1px solid var(--c-border-str);border-radius:4px;color:var(--c-ink);padding:4px 6px;font-size:.8rem;"/>`;
        el.querySelector('#opt-text-size').addEventListener('input', e => {
          toolOpts.text.fontSize = Number(e.target.value);
        });
        break;
    }
  }

  /* ── Zoom reset ────────────────────────────────────────────────────────── */
  function resetZoom() {
    zoom = 1; panX = 0; panY = 0;
    document.getElementById('zoom-level').textContent = '100%';
    render();
  }

  /* ── Center on element ─────────────────────────────────────────────────── */
  function centerOn(el) {
    let wx, wy;
    const d = el.data;
    switch (el.type) {
      case 'city':
      case 'text':
        wx = d.x; wy = d.y; break;
      case 'territory':
      case 'region':
        if (!d.points || !d.points.length) return;
        wx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
        wy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;
        break;
      case 'route':
        wx = (d.x1 + d.x2) / 2;
        wy = (d.y1 + d.y2) / 2;
        break;
      default: return;
    }
    panX = canvas.width  / 2 - wx * zoom;
    panY = canvas.height / 2 - wy * zoom;
    render();
  }

  /* ── Utility ────────────────────────────────────────────────────────────── */
  function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function regionColor(subtype) {
    switch (subtype) {
      case 'forest':   return '#2D6A2D';
      case 'mountain': return '#8B6914';
      case 'desert':   return '#C9A84C';
      case 'ocean':    return '#1A5276';
      default:         return '#666666';
    }
  }

  function bbox(pts) {
    return {
      minX: Math.min(...pts.map(p => p.x)),
      minY: Math.min(...pts.map(p => p.y)),
      maxX: Math.max(...pts.map(p => p.x)),
      maxY: Math.max(...pts.map(p => p.y)),
    };
  }

  function drawStar(cx, cy, r, n, ctx2) {
    ctx2.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const angle = (i * Math.PI) / n - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.4;
      ctx2.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    }
    ctx2.closePath();
  }

  /* ── Public API ────────────────────────────────────────────────────────── */
  window.CanvasModule = {
    init,
    setTool,
    resetZoom,
    updateElement,
    deleteSelected,
    undo,
    centerOn,
    getElements: () => elements,
    getWorldId:  () => worldId,
    render,
    resizeCanvas,
  };

  // Wire toolbar buttons
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });
  document.getElementById('btn-undo')?.addEventListener('click', undo);
  document.getElementById('btn-zoom-reset')?.addEventListener('click', resetZoom);

})();
