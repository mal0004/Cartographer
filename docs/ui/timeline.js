/**
 * Cartographer — Narrative Timeline
 *
 * Horizontal time bar with events, drag to scroll,
 * click events to navigate on the map.
 */

const EVENT_COLORS = {
  war: '#c0392b',
  political: '#8B2635',
  natural: '#27ae60',
  cultural: '#C9A84C',
};

class Timeline {
  constructor() {
    this.container = document.getElementById('timeline');
    this.body = document.getElementById('timeline-body');
    this.canvas = document.getElementById('timeline-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.toggleBtn = document.getElementById('timeline-toggle');
    this.addBtn = document.getElementById('btn-add-event');

    this.events = [];
    this.timeStart = 0;
    this.timeEnd = 1000;
    this.scrollOffset = 0;
    this.collapsed = true;

    this.hoveredEvent = null;
    this.tooltip = null;

    // Callbacks
    this.onEventClick = null;
    this.onAddEvent = null;

    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.addBtn.addEventListener('click', () => {
      if (this.onAddEvent) this.onAddEvent();
    });

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this.body);

    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this._onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this._hideTooltip());
    this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this.canvas.addEventListener('click', (e) => this._onClick(e));

    this._isPanning = false;
    this._panStartX = 0;
    this._panStartOffset = 0;
  }

  toggle() {
    this.collapsed = !this.collapsed;
    this.container.classList.toggle('collapsed', this.collapsed);
    if (!this.collapsed) {
      requestAnimationFrame(() => this._resize());
    }
  }

  setData(events, timeStart, timeEnd) {
    this.events = events;
    this.timeStart = timeStart;
    this.timeEnd = timeEnd;
    this.render();
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.body.clientWidth * dpr;
    this.canvas.height = this.body.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = this.body.clientWidth;
    this.height = this.body.clientHeight;
    this.render();
  }

  render() {
    if (this.collapsed || !this.width) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const style = getComputedStyle(document.documentElement);
    const bg = style.getPropertyValue('--bg-alt').trim();
    const ink = style.getPropertyValue('--ink').trim();
    const inkLight = style.getPropertyValue('--ink-light').trim();
    const border = style.getPropertyValue('--border').trim();

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const range = this.timeEnd - this.timeStart;
    if (range <= 0) return;

    // Pixels per year — scale so the full range occupies at least the canvas width
    const totalWidth = Math.max(w, range * 2);
    const pxPerYear = totalWidth / range;
    const axisY = h - 30;

    ctx.save();
    ctx.translate(this.scrollOffset, 0);

    // Axis line
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(totalWidth, axisY);
    ctx.stroke();

    // Tick marks
    let tickInterval = 1;
    const intervals = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
    for (const iv of intervals) {
      if (pxPerYear * iv >= 60) { tickInterval = iv; break; }
    }

    ctx.fillStyle = inkLight;
    ctx.font = '11px "Source Serif 4", Georgia, serif';
    ctx.textAlign = 'center';

    const startTick = Math.ceil(this.timeStart / tickInterval) * tickInterval;
    for (let year = startTick; year <= this.timeEnd; year += tickInterval) {
      const x = (year - this.timeStart) * pxPerYear;
      ctx.beginPath();
      ctx.moveTo(x, axisY - 6);
      ctx.lineTo(x, axisY + 6);
      ctx.stroke();
      ctx.fillText(`${year}`, x, axisY + 20);
    }

    // Events
    for (const ev of this.events) {
      const x = (ev.date - this.timeStart) * pxPerYear;
      const color = EVENT_COLORS[ev.category] || EVENT_COLORS.political;
      const hovered = this.hoveredEvent && this.hoveredEvent.id === ev.id;

      // Vertical line
      ctx.strokeStyle = color;
      ctx.globalAlpha = hovered ? 1 : 0.6;
      ctx.lineWidth = hovered ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, axisY);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Diamond marker
      const my = axisY;
      const mr = hovered ? 7 : 5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, my - mr);
      ctx.lineTo(x + mr, my);
      ctx.lineTo(x, my + mr);
      ctx.lineTo(x - mr, my);
      ctx.closePath();
      ctx.fill();

      // Title label
      ctx.save();
      ctx.translate(x, axisY - 16);
      ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = ink;
      ctx.font = `${hovered ? '600 ' : ''}12px "Source Serif 4", Georgia, serif`;
      ctx.textAlign = 'left';
      ctx.fillText(ev.title, 4, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  // ─── Interaction ────────────────────────────────────────────

  _getEventAtX(clientX) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = clientX - rect.left - this.scrollOffset;
    const range = this.timeEnd - this.timeStart;
    const totalWidth = Math.max(this.width, range * 2);
    const pxPerYear = totalWidth / range;

    let closest = null;
    let closestDist = Infinity;

    for (const ev of this.events) {
      const x = (ev.date - this.timeStart) * pxPerYear;
      const dist = Math.abs(mx - x);
      if (dist < 15 && dist < closestDist) {
        closest = ev;
        closestDist = dist;
      }
    }
    return closest;
  }

  _onMouseDown(e) {
    this._isPanning = true;
    this._panStartX = e.clientX;
    this._panStartOffset = this.scrollOffset;
  }

  _onMouseMove(e) {
    if (this._isPanning) {
      this.scrollOffset = this._panStartOffset + (e.clientX - this._panStartX);
      this.render();
      return;
    }
    const ev = this._getEventAtX(e.clientX);
    if (ev !== this.hoveredEvent) {
      this.hoveredEvent = ev;
      this.render();
      if (ev) this._showTooltip(e, ev);
      else this._hideTooltip();
    }
  }

  _onMouseUp() {
    this._isPanning = false;
  }

  _onWheel(e) {
    e.preventDefault();
    this.scrollOffset -= e.deltaX || e.deltaY;
    this.render();
  }

  _onClick(e) {
    const ev = this._getEventAtX(e.clientX);
    if (ev && this.onEventClick) {
      this.onEventClick(ev);
    }
  }

  _showTooltip(e, ev) {
    this._hideTooltip();
    const tip = document.createElement('div');
    tip.className = 'timeline-event-tooltip';
    tip.innerHTML = `<strong>${ev.title}</strong><br>
      <span style="color:var(--ink-light)">Year ${ev.date}</span><br>
      ${ev.description || ''}`;
    tip.style.left = (e.clientX + 12) + 'px';
    tip.style.top = (e.clientY - 60) + 'px';
    document.body.appendChild(tip);
    this.tooltip = tip;
  }

  _hideTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
    if (this.hoveredEvent) {
      this.hoveredEvent = null;
      this.render();
    }
  }
}

export { Timeline, EVENT_COLORS };
