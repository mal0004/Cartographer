/* app.js — Global orchestration + routing for Cartographer */
'use strict';

(function () {
  /* ── State ─────────────────────────────────────────────────────────────── */
  let worlds    = [];
  let activeWorldId = null;

  /* ── DOM refs ──────────────────────────────────────────────────────────── */
  const homeScreen   = document.getElementById('home-screen');
  const editorScreen = document.getElementById('editor-screen');
  const worldsGrid   = document.getElementById('worlds-grid');
  const emptyState   = document.getElementById('empty-state');
  const worldTitleNav= document.getElementById('world-title');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalTitle   = document.getElementById('modal-title');
  const modalBody    = document.getElementById('modal-body');
  const modalFooter  = document.getElementById('modal-footer');
  const modalClose   = document.getElementById('modal-close');
  const importFile   = document.getElementById('import-file');

  /* ── Night mode ────────────────────────────────────────────────────────── */
  function applyNightMode(on) {
    document.body.classList.toggle('night', on);
    localStorage.setItem('cartographer-night', on ? '1' : '0');
  }

  // Restore preference
  applyNightMode(localStorage.getItem('cartographer-night') === '1');

  document.getElementById('btn-toggle-night').addEventListener('click', () =>
    applyNightMode(!document.body.classList.contains('night')));
  document.getElementById('btn-toggle-night-editor').addEventListener('click', () =>
    applyNightMode(!document.body.classList.contains('night')));

  /* ── Navigation ────────────────────────────────────────────────────────── */
  function showHome() {
    homeScreen.classList.add('active');
    editorScreen.classList.remove('active');
    activeWorldId = null;
    loadWorlds();
  }

  async function showEditor(worldId) {
    activeWorldId = worldId;
    homeScreen.classList.remove('active');
    editorScreen.classList.add('active');

    const world = worlds.find(w => w.id === worldId) || await fetchWorld(worldId);
    worldTitleNav.textContent = world?.name || 'World';

    // Load elements and events
    const [elements, events] = await Promise.all([
      fetchElements(worldId),
      fetchEvents(worldId),
    ]);

    // Initialize modules
    window.CanvasModule?.resizeCanvas();
    window.CanvasModule?.init(worldId, elements);
    window.TimelineModule?.init(worldId, events);
  }

  document.getElementById('btn-back').addEventListener('click', showHome);

  /* ── Worlds list ───────────────────────────────────────────────────────── */
  async function loadWorlds() {
    worlds = await apiFetch('/api/worlds') || [];
    renderWorlds();
  }

  function renderWorlds() {
    worldsGrid.innerHTML = '';
    if (!worlds.length) {
      worldsGrid.appendChild(emptyState);
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;
    for (const w of worlds) {
      worldsGrid.appendChild(worldCard(w));
    }
  }

  function worldCard(w) {
    const card = document.createElement('div');
    card.className = 'world-card';
    card.innerHTML = `
      <div class="world-card-title">${escHTML(w.name)}</div>
      <div class="world-card-desc">${escHTML(w.description || 'No description.')}</div>
      <div class="world-card-meta">Created ${formatDate(w.created_at)}</div>
      <div class="world-card-actions">
        <button class="btn btn-ghost btn-sm" data-action="edit" title="Rename">✎</button>
        <button class="btn btn-ghost btn-sm" data-action="delete" title="Delete">🗑</button>
        <button class="btn btn-ghost btn-sm" data-action="export" title="Export JSON">⬇</button>
      </div>`;

    card.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) { showEditor(w.id); return; }
      if (action === 'edit')   editWorldModal(w);
      if (action === 'delete') deleteWorldConfirm(w);
      if (action === 'export') exportWorldJSON(w.id);
    });
    return card;
  }

  /* ── New world ─────────────────────────────────────────────────────────── */
  document.getElementById('btn-new-world').addEventListener('click', () => {
    showModal('New World', `
      <label>Name
        <input id="wld-name" type="text" placeholder="e.g. Aethoria" autofocus/>
      </label>
      <label>Description
        <textarea id="wld-desc" rows="3" placeholder="A brief description of your world…"></textarea>
      </label>`,
    [
      { label: 'Cancel', cls: 'btn-ghost', action: closeModal },
      {
        label: 'Create', cls: 'btn-primary', action: async () => {
          const name = document.getElementById('wld-name').value.trim();
          if (!name) { document.getElementById('wld-name').focus(); return; }
          const desc = document.getElementById('wld-desc').value;
          const world = await apiFetch('/api/worlds', {
            method: 'POST',
            body: JSON.stringify({ name, description: desc }),
          });
          if (world?.id) {
            worlds.push(world);
            closeModal();
            showEditor(world.id);
          }
        },
      },
    ]);
  });

  /* ── Edit world ────────────────────────────────────────────────────────── */
  function editWorldModal(w) {
    showModal('Rename World', `
      <label>Name <input id="wld-name" type="text" value="${escHTML(w.name)}" autofocus/></label>
      <label>Description <textarea id="wld-desc" rows="3">${escHTML(w.description || '')}</textarea></label>`,
    [
      { label: 'Cancel', cls: 'btn-ghost', action: closeModal },
      {
        label: 'Save', cls: 'btn-primary', action: async () => {
          const name = document.getElementById('wld-name').value.trim();
          if (!name) return;
          const desc = document.getElementById('wld-desc').value;
          const updated = await apiFetch(`/api/worlds/${w.id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, description: desc }),
          });
          if (updated) {
            const idx = worlds.findIndex(x => x.id === w.id);
            if (idx !== -1) worlds[idx] = updated;
            closeModal();
            renderWorlds();
          }
        },
      },
    ]);
  }

  /* ── Delete world ──────────────────────────────────────────────────────── */
  function deleteWorldConfirm(w) {
    showModal('Delete World', `
      <p>Are you sure you want to delete <strong>${escHTML(w.name)}</strong>?</p>
      <p style="margin-top:8px;color:var(--c-accent)">This action cannot be undone.</p>`,
    [
      { label: 'Cancel', cls: 'btn-ghost',  action: closeModal },
      {
        label: 'Delete', cls: 'btn-danger', action: async () => {
          await apiFetch(`/api/worlds/${w.id}`, { method: 'DELETE' });
          worlds = worlds.filter(x => x.id !== w.id);
          closeModal();
          renderWorlds();
        },
      },
    ]);
  }

  /* ── Import / Export ────────────────────────────────────────────────────── */
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const world = await apiFetch('/api/import', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (world?.id) {
        worlds.push(world);
        renderWorlds();
        showEditor(world.id);
      }
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
    importFile.value = '';
  });

  async function exportWorldJSON(worldId) {
    const data = await apiFetch(`/api/worlds/${worldId}/export`);
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `world-${worldId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  document.getElementById('btn-export-json').addEventListener('click', () => {
    if (activeWorldId) exportWorldJSON(activeWorldId);
  });

  document.getElementById('btn-export-svg').addEventListener('click', async () => {
    if (!activeWorldId) return;
    const world = await fetchWorld(activeWorldId);
    showModal('Export as SVG', `
      <label>Map Title <input id="svg-title" type="text" value="${escHTML(world?.name || '')}"/></label>
      <label>Width (px) <input id="svg-w" type="number" value="1587"/></label>
      <label>Height (px)<input id="svg-h" type="number" value="1122"/></label>`,
    [
      { label: 'Cancel', cls: 'btn-ghost', action: closeModal },
      {
        label: 'Export', cls: 'btn-primary', action: async () => {
          const title  = document.getElementById('svg-title').value;
          const width  = Number(document.getElementById('svg-w').value) || 1587;
          const height = Number(document.getElementById('svg-h').value) || 1122;
          const svgText = await apiFetch(`/api/worlds/${activeWorldId}/export-svg`, {
            method: 'POST',
            body: JSON.stringify({ title, width, height }),
            rawResponse: true,
          });
          if (!svgText) return;
          const blob = new Blob([svgText], { type: 'image/svg+xml' });
          const a    = document.createElement('a');
          a.href     = URL.createObjectURL(blob);
          a.download = `${(world?.name || 'world').replace(/\s+/g,'-')}.svg`;
          a.click();
          URL.revokeObjectURL(a.href);
          closeModal();
        },
      },
    ]);
  });

  /* ── Modal system ──────────────────────────────────────────────────────── */
  function showModal(title, bodyHTML, buttons = []) {
    modalTitle.textContent = title;
    modalBody.innerHTML    = bodyHTML;
    modalFooter.innerHTML  = '';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.className   = `btn ${b.cls || 'btn-secondary'}`;
      btn.textContent = b.label;
      btn.addEventListener('click', b.action);
      modalFooter.appendChild(btn);
    }
    modalOverlay.classList.remove('hidden');
    // Focus first input
    setTimeout(() => modalBody.querySelector('input,textarea,select')?.focus(), 50);
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
  }

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  /* ── API helpers ────────────────────────────────────────────────────────── */
  async function apiFetch(url, options = {}) {
    const { rawResponse, ...fetchOpts } = options;
    const headers = { 'Content-Type': 'application/json', ...(fetchOpts.headers || {}) };
    try {
      const res = await fetch(url, { ...fetchOpts, headers });
      if (!res.ok) {
        console.error(`API ${url} → ${res.status}`);
        return null;
      }
      if (res.status === 204) return true;
      return rawResponse ? res.text() : res.json();
    } catch (err) {
      console.error('apiFetch error:', err);
      return null;
    }
  }

  async function fetchWorld(id) {
    return apiFetch(`/api/worlds/${id}`);
  }

  async function fetchElements(worldId) {
    return apiFetch(`/api/worlds/${worldId}/elements`) || [];
  }

  async function fetchEvents(worldId) {
    return apiFetch(`/api/worlds/${worldId}/events`) || [];
  }

  /* ── Utility ────────────────────────────────────────────────────────────── */
  function escHTML(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(ts) {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  }

  /* ── Public API ────────────────────────────────────────────────────────── */
  window.AppModule = { showModal, closeModal };

  /* ── Boot ────────────────────────────────────────────────────────────────── */
  showHome();
})();
