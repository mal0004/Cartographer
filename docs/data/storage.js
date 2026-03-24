/**
 * Cartographer — Data Storage (Static Demo)
 *
 * LocalStorage-backed API shim for GitHub Pages.
 * Same interface as public/data/storage.js but no server needed.
 */

import { LocalDB } from '../local-db.js';

export async function api(method, url, body) {
  const db = LocalDB;
  const m = method.toUpperCase();

  // Worlds
  if (url === '/api/worlds' && m === 'GET') return db.getWorlds();
  if (url === '/api/worlds' && m === 'POST') return db.createWorld(body);
  if (url === '/api/worlds/import' && m === 'POST') return db.importWorld(body);

  let match;
  if ((match = url.match(/^\/api\/worlds\/(\d+)\/entities$/))) {
    const wid = Number(match[1]);
    if (m === 'GET') return db.getEntities(wid);
    if (m === 'POST') return db.createEntity(wid, body);
  }
  if ((match = url.match(/^\/api\/worlds\/(\d+)\/events$/))) {
    const wid = Number(match[1]);
    if (m === 'GET') return db.getEvents(wid);
    if (m === 'POST') return db.createEvent(wid, body);
  }
  if ((match = url.match(/^\/api\/worlds\/(\d+)\/export$/))) {
    return db.exportWorld(Number(match[1]));
  }
  if ((match = url.match(/^\/api\/worlds\/(\d+)\/share$/))) {
    // Share not supported in static demo — return a fake token
    return { token: 'demo-' + Date.now() };
  }
  if ((match = url.match(/^\/api\/worlds\/(\d+)$/))) {
    const id = Number(match[1]);
    if (m === 'GET') return db.getWorld(id);
    if (m === 'PUT') return db.updateWorld(id, body);
    if (m === 'DELETE') { db.deleteWorld(id); return { ok: true }; }
  }
  if ((match = url.match(/^\/api\/entities\/(\d+)$/))) {
    const id = Number(match[1]);
    if (m === 'GET') return db.getEntity(id);
    if (m === 'PUT') return db.updateEntity(id, body);
    if (m === 'DELETE') { db.deleteEntity(id); return { ok: true }; }
  }
  if ((match = url.match(/^\/api\/events\/(\d+)$/))) {
    const id = Number(match[1]);
    if (m === 'GET') return db.getEvent(id);
    if (m === 'PUT') return db.updateEvent(id, body);
    if (m === 'DELETE') { db.deleteEvent(id); return { ok: true }; }
  }

  console.warn('Unhandled API call:', method, url);
  return null;
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  const bar = document.createElement('div');
  bar.className = 'toast-progress';
  bar.style.animationDuration = duration + 'ms';
  toast.appendChild(bar);
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('dismissing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
