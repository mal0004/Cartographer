/* timeline.js — Narrative timeline bar */
'use strict';

(function () {
  const container  = document.getElementById('timeline-container');
  const track      = document.getElementById('timeline-track');
  const btnToggle  = document.getElementById('btn-timeline-toggle');
  const btnAdd     = document.getElementById('btn-add-event');
  const inputStart = document.getElementById('timeline-start');
  const inputEnd   = document.getElementById('timeline-end');

  let events   = [];
  let worldId  = null;
  let expanded = false;

  /* ── Init ─────────────────────────────────────────────────────────────── */
  function init(wid, evts) {
    worldId = wid;
    events  = evts || [];
    render();
  }

  /* ── Expand / collapse ────────────────────────────────────────────────── */
  btnToggle.addEventListener('click', () => {
    expanded = !expanded;
    container.classList.toggle('expanded', expanded);
    btnToggle.textContent = expanded ? '▼ Timeline' : '▲ Timeline';
    if (expanded) render();
  });

  /* ── Range change ─────────────────────────────────────────────────────── */
  [inputStart, inputEnd].forEach(inp => inp.addEventListener('change', render));

  /* ── Render ───────────────────────────────────────────────────────────── */
  function render() {
    track.innerHTML = '';
    if (!expanded) return;

    const startYear = parseInt(inputStart.value, 10) || 0;
    const endYear   = parseInt(inputEnd.value,   10) || 1000;
    if (startYear >= endYear) return;

    const W = track.clientWidth || 800;
    const span = endYear - startYear;

    // Axis line
    const axis = document.createElement('div');
    axis.className = 'timeline-axis';
    track.appendChild(axis);

    // Ticks
    const tickStep = niceTick(span);
    const first = Math.ceil(startYear / tickStep) * tickStep;
    for (let yr = first; yr <= endYear; yr += tickStep) {
      const pct = (yr - startYear) / span;
      const tick = document.createElement('div');
      tick.className = 'timeline-tick';
      tick.style.left = `calc(40px + ${pct} * (100% - 80px))`;
      tick.innerHTML  = `<span>${yr}</span>`;
      track.appendChild(tick);
    }

    // Events
    for (const ev of events) {
      if (ev.date_value < startYear || ev.date_value > endYear) continue;
      const pct  = (ev.date_value - startYear) / span;
      const dot  = document.createElement('div');
      dot.className = `timeline-event event-cat-${ev.category || 'cultural'}`;
      dot.style.left = `calc(40px + ${pct} * (100% - 80px))`;
      dot.innerHTML  = `
        <div class="event-dot"></div>
        <div class="event-label" title="${escHTML(ev.title)}">${escHTML(ev.title)}</div>`;
      dot.addEventListener('click', () => handleEventClick(ev));
      track.appendChild(dot);
    }

    // Click on axis to add event at that year
    axis.addEventListener('click', (e) => {
      const rect = axis.getBoundingClientRect();
      const pct  = (e.clientX - rect.left) / rect.width;
      const yr   = Math.round(startYear + pct * span);
      openAddEventModal(yr);
    });
  }

  function niceTick(span) {
    const candidates = [1, 2, 5, 10, 25, 50, 100, 200, 500, 1000];
    const target = span / 8;
    return candidates.find(c => c >= target) || 1000;
  }

  /* ── Event click ──────────────────────────────────────────────────────── */
  function handleEventClick(ev) {
    // Centre map on first linked entity
    const entityId = ev.entity_ids?.[0];
    if (entityId) {
      const els = window.CanvasModule?.getElements() || [];
      const el  = els.find(e => e.id === entityId);
      if (el) {
        window.CanvasModule?.centerOn(el);
        window.SidebarModule?.open(el);
      }
    }
    // Show event detail in modal
    openEventDetailModal(ev);
  }

  function focusEvent(ev) {
    // Expand timeline and scroll to event
    if (!expanded) {
      expanded = true;
      container.classList.add('expanded');
      btnToggle.textContent = '▼ Timeline';
      render();
    }
    const startYear = parseInt(inputStart.value, 10) || 0;
    const endYear   = parseInt(inputEnd.value, 10)   || 1000;
    // Adjust range if event is outside
    if (ev.date_value < startYear) inputStart.value = ev.date_value - 50;
    if (ev.date_value > endYear)   inputEnd.value   = ev.date_value + 50;
    render();
  }

  /* ── Add event modal ──────────────────────────────────────────────────── */
  btnAdd.addEventListener('click', () => openAddEventModal());

  function openAddEventModal(defaultYear) {
    const els = window.CanvasModule?.getElements() || [];
    window.AppModule?.showModal('Add Timeline Event', `
      <label>Title <input id="ev-title" type="text" placeholder="Event title"/></label>
      <label>Year  <input id="ev-date"  type="number" value="${defaultYear ?? 0}"/></label>
      <label>Category
        <select id="ev-cat">
          <option value="cultural">Cultural</option>
          <option value="war">War</option>
          <option value="politics">Politics</option>
          <option value="natural">Natural</option>
        </select>
      </label>
      <label>Description <textarea id="ev-desc" rows="3" placeholder="Short description…"></textarea></label>
      <label>Linked entities
        <select id="ev-entity" multiple style="height:90px">
          ${els.map(e => `<option value="${e.id}">${escHTML(e.data.name || e.data.text || `#${e.id}`)}</option>`).join('')}
        </select>
      </label>
    `, [
      { label: 'Cancel', cls: 'btn-ghost', action: () => window.AppModule?.closeModal() },
      {
        label: 'Save', cls: 'btn-primary', action: async () => {
          const title = document.getElementById('ev-title').value.trim();
          if (!title) return alert('Title is required');
          const date_value  = parseInt(document.getElementById('ev-date').value, 10) || 0;
          const category    = document.getElementById('ev-cat').value;
          const description = document.getElementById('ev-desc').value;
          const selOpts     = [...document.getElementById('ev-entity').selectedOptions];
          const entity_ids  = selOpts.map(o => Number(o.value));
          await createEvent({ title, date_value, category, description, entity_ids });
          window.AppModule?.closeModal();
        },
      },
    ]);
  }

  function openEventDetailModal(ev) {
    const els = window.CanvasModule?.getElements() || [];
    window.AppModule?.showModal(`An ${ev.date_value} — ${ev.title}`, `
      <p><strong>Category:</strong> ${ev.category}</p>
      <p style="margin-top:8px">${escHTML(ev.description || '–')}</p>
      ${ev.entity_ids?.length ? `<p style="margin-top:8px"><strong>Linked:</strong> ${
        ev.entity_ids.map(id => {
          const el = els.find(e => e.id === id);
          return el ? escHTML(el.data.name || el.data.text || `#${id}`) : `#${id}`;
        }).join(', ')
      }</p>` : ''}
    `, [
      { label: 'Edit',   cls: 'btn-secondary', action: () => { window.AppModule?.closeModal(); openEditEventModal(ev); } },
      { label: 'Delete', cls: 'btn-danger',     action: () => { deleteEvent(ev.id); window.AppModule?.closeModal(); } },
      { label: 'Close',  cls: 'btn-ghost',      action: () => window.AppModule?.closeModal() },
    ]);
  }

  function openEditEventModal(ev) {
    const els = window.CanvasModule?.getElements() || [];
    window.AppModule?.showModal('Edit Event', `
      <label>Title <input id="ev-title" type="text" value="${escHTML(ev.title)}"/></label>
      <label>Year  <input id="ev-date"  type="number" value="${ev.date_value}"/></label>
      <label>Category
        <select id="ev-cat">
          ${['cultural','war','politics','natural'].map(c =>
            `<option value="${c}" ${c === ev.category ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`
          ).join('')}
        </select>
      </label>
      <label>Description <textarea id="ev-desc" rows="3">${escHTML(ev.description || '')}</textarea></label>
      <label>Linked entities
        <select id="ev-entity" multiple style="height:90px">
          ${els.map(e => `<option value="${e.id}" ${ev.entity_ids?.includes(e.id) ? 'selected' : ''}>${escHTML(e.data.name || e.data.text || `#${e.id}`)}</option>`).join('')}
        </select>
      </label>
    `, [
      { label: 'Cancel', cls: 'btn-ghost',    action: () => window.AppModule?.closeModal() },
      {
        label: 'Save', cls: 'btn-primary', action: async () => {
          const title       = document.getElementById('ev-title').value.trim();
          if (!title) return alert('Title required');
          const date_value  = parseInt(document.getElementById('ev-date').value, 10) || 0;
          const category    = document.getElementById('ev-cat').value;
          const description = document.getElementById('ev-desc').value;
          const selOpts     = [...document.getElementById('ev-entity').selectedOptions];
          const entity_ids  = selOpts.map(o => Number(o.value));
          await updateEvent(ev.id, { title, date_value, category, description, entity_ids });
          window.AppModule?.closeModal();
        },
      },
    ]);
  }

  /* ── CRUD ─────────────────────────────────────────────────────────────── */
  async function createEvent(data) {
    try {
      const res = await fetch(`/api/worlds/${worldId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const ev = await res.json();
      events.push(ev);
      render();
      return ev;
    } catch (err) { console.error(err); }
  }

  async function updateEvent(id, data) {
    try {
      const res = await fetch(`/api/worlds/${worldId}/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const ev  = await res.json();
      const idx = events.findIndex(e => e.id === id);
      if (idx !== -1) events[idx] = ev;
      render();
      return ev;
    } catch (err) { console.error(err); }
  }

  async function deleteEvent(id) {
    try {
      await fetch(`/api/worlds/${worldId}/events/${id}`, { method: 'DELETE' });
      events = events.filter(e => e.id !== id);
      render();
    } catch (err) { console.error(err); }
  }

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  function escHTML(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Public API ────────────────────────────────────────────────────────── */
  window.TimelineModule = { init, render, getEvents: () => events, focusEvent };
})();
