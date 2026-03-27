/**
 * Cartographer — World & Entity CRUD
 *
 * Handles loading, creating, importing, deleting worlds,
 * entity CRUD, and world preview rendering.
 */

import { api, escapeHtml, showToast } from './storage.js';
import { t, getLang } from '../i18n.js';

// ─── World list ──────────────────────────────────────────

export async function loadWorlds(app) {
  const grid = document.getElementById('worlds-grid');
  showSkeletons(grid);
  const worlds = await api('GET', '/api/worlds');
  grid.innerHTML = '';

  // "New world" dashed card
  const newCard = document.createElement('div');
  newCard.className = 'world-card world-card-new';
  newCard.innerHTML = `<div class="world-card-new-inner">
    <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.2"/>
      <path d="M12 2a10 10 0 000 20" fill="none" stroke="currentColor" stroke-width="1.2"/>
      <ellipse cx="12" cy="12" rx="4" ry="10" fill="none" stroke="currentColor" stroke-width="0.8"/>
      <line x1="2" y1="9" x2="22" y2="9" stroke="currentColor" stroke-width="0.6"/>
      <line x1="2" y1="15" x2="22" y2="15" stroke="currentColor" stroke-width="0.6"/>
    </svg>
    <span>${t('landing.worlds.newWorld')}</span>
  </div>`;
  newCard.addEventListener('click', () => {
    document.getElementById('modal-new-world').hidden = false;
    document.getElementById('new-world-name').focus();
  });
  grid.appendChild(newCard);

  for (const w of worlds) {
    const card = document.createElement('div');
    card.className = 'world-card';
    const entities = await api('GET', `/api/worlds/${w.id}/entities`);
    const events = await api('GET', `/api/worlds/${w.id}/events`);
    const date = w.updated_at ? new Date(w.updated_at).toLocaleDateString(getLang() === 'fr' ? 'fr-FR' : 'en-GB') : '';

    card.innerHTML = `
      <div class="world-card-thumb">
        <canvas class="world-card-preview" width="640" height="360"></canvas>
        <div class="world-card-overlay">
          <button class="btn btn-sm card-open" aria-label="${t('landing.worlds.open')} ${escapeHtml(w.name)}">${t('landing.worlds.open')}</button>
          <button class="btn btn-sm card-export" aria-label="${t('common.export')} ${escapeHtml(w.name)}">${t('common.export')}</button>
          <button class="btn-icon delete-world" data-id="${w.id}" title="${t('common.delete')}" aria-label="${t('common.delete')} ${escapeHtml(w.name)}">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 6h18M8 6V4h8v2m1 0v14H7V6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
      <div class="world-card-body">
        <h3>${escapeHtml(w.name)}</h3>
        <p>${escapeHtml(w.description || t('landing.worlds.noDescription'))}</p>
        <div class="world-card-meta">
          <span><svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><polygon points="8,1 10,6 15,6 11,9 12.5,14 8,11 3.5,14 5,9 1,6 6,6"/></svg> ${t('landing.worlds.entityCount').replace('{n}', entities.length).replace('{s}', entities.length !== 1 ? 's' : '')}</span>
          <span><svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="6"/><path d="M8 4.5v4l2.5 2" stroke-linecap="round"/></svg> ${t('landing.worlds.eventCount').replace('{n}', events.length).replace('{s}', events.length !== 1 ? 's' : '')}</span>
          ${date ? `<span>${t('landing.worlds.modifiedOn').replace('{date}', date)}</span>` : ''}
        </div>
      </div>
    `;

    drawWorldPreview(card.querySelector('.world-card-preview'), entities);

    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-world') || e.target.closest('.card-export') || e.target.closest('.card-open')) return;
      app.openWorld(w.id);
    });
    card.querySelector('.card-open').addEventListener('click', (e) => {
      e.stopPropagation(); app.openWorld(w.id);
    });
    card.querySelector('.card-export').addEventListener('click', async (e) => {
      e.stopPropagation();
      const data = await api('GET', `/api/worlds/${w.id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${w.name}.json`; a.click();
      URL.revokeObjectURL(url);
    });
    card.querySelector('.delete-world').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(t('landing.worlds.deleteConfirm').replace('{name}', w.name))) {
        await api('DELETE', `/api/worlds/${w.id}`);
        loadWorlds(app);
      }
    });
    grid.appendChild(card);
  }
  observeCards();
}

// ─── Create / Import ─────────────────────────────────────

export async function createWorld(app) {
  const name = document.getElementById('new-world-name').value.trim();
  if (!name) return;
  const world = await api('POST', '/api/worlds', {
    name,
    description: document.getElementById('new-world-desc').value.trim(),
    time_start: Number(document.getElementById('new-world-tstart').value) || 0,
    time_end: Number(document.getElementById('new-world-tend').value) || 1000,
  });
  document.getElementById('modal-new-world').hidden = true;
  document.getElementById('new-world-name').value = '';
  document.getElementById('new-world-desc').value = '';
  app.openWorld(world.id);
}

export async function importWorld(app, e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.name.endsWith('.json')) {
    showToast(t('toasts.importInvalidFile'), 'error');
    e.target.value = '';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast(t('toasts.importFileTooLarge'), 'error');
    e.target.value = '';
    return;
  }
  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    showToast(t('toasts.importInvalidJSON'), 'error');
    e.target.value = '';
    return;
  }
  await api('POST', '/api/worlds/import', data);
  e.target.value = '';
  loadWorlds(app);
  showToast(t('toasts.worldImported'), 'success');
}

// ─── Preview rendering ───────────────────────────────────

export function drawWorldPreview(canvas, entities) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#1A1208'; ctx.fillRect(0, 0, w, h);
  if (entities.length === 0) {
    ctx.fillStyle = '#5A4A3A'; ctx.font = '14px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(t('landing.worlds.emptyWorld'), w / 2, h / 2);
    return;
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const e of entities) {
    const d = e.data;
    if (d.x !== undefined) { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); minY = Math.min(minY, d.y); maxY = Math.max(maxY, d.y); }
    if (d.points) for (const p of d.points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    if (d.x1 !== undefined) { minX = Math.min(minX, d.x1, d.x2); maxX = Math.max(maxX, d.x1, d.x2); minY = Math.min(minY, d.y1, d.y2); maxY = Math.max(maxY, d.y1, d.y2); }
  }
  const pad = 40; minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const bw = maxX - minX, bh = maxY - minY;
  if (bw === 0 || bh === 0) return;
  const scale = Math.min(w / bw, h / bh);
  const ox = (w - bw * scale) / 2, oy = (h - bh * scale) / 2;
  ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale); ctx.translate(-minX, -minY);
  const ink = '#C4A882', accent = '#8B2635';
  for (const e of entities) {
    const d = e.data;
    if ((e.type === 'territory' || e.type === 'region') && d.points && d.points.length >= 3) {
      ctx.beginPath(); ctx.moveTo(d.points[0].x, d.points[0].y);
      for (let i = 1; i < d.points.length; i++) ctx.lineTo(d.points[i].x, d.points[i].y);
      ctx.closePath(); ctx.fillStyle = (d.color || accent) + '25'; ctx.fill();
      ctx.strokeStyle = d.color || accent; ctx.lineWidth = 2 / scale; ctx.stroke();
    } else if (e.type === 'city') {
      ctx.fillStyle = ink; ctx.beginPath();
      ctx.arc(d.x, d.y, (d.importance === 'capital' ? 4 : 2.5) / scale, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'route' && d.x1 !== undefined) {
      ctx.strokeStyle = ink + '80'; ctx.lineWidth = 1.5 / scale;
      ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
    }
  }
  ctx.restore();
}

// ─── Helpers ─────────────────────────────────────────────

function showSkeletons(grid, count = 3) {
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = 'world-card skeleton-card';
    sk.innerHTML = '<div class="skeleton-preview"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div>';
    grid.appendChild(sk);
  }
}

export function observeCards() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const idx = Array.from(el.parentNode.children).indexOf(el);
        el.style.animationDelay = (idx * 0.07) + 's';
        el.classList.add('visible');
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.world-card, .world-card-new, .template-card, .lp-tpl-card').forEach(c => observer.observe(c));
}
