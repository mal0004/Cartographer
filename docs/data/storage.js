/**
 * Cartographer — Data Storage (Static / GitHub Pages)
 *
 * Routes API calls to the LocalDB localStorage shim so the
 * static docs/ build works without an Express backend.
 */

import { LocalDB } from '../local-db.js';

export async function api(method, url, body) {
  const m = method.toUpperCase();

  // POST /api/worlds/import
  if (m === 'POST' && url === '/api/worlds/import') return LocalDB.importWorld(body);

  // POST /api/worlds
  if (m === 'POST' && url === '/api/worlds') return LocalDB.createWorld(body);

  // GET /api/worlds
  if (m === 'GET' && url === '/api/worlds') return LocalDB.getWorlds();

  // /api/worlds/:id/entities
  const worldEntities = url.match(/^\/api\/worlds\/(\d+)\/entities$/);
  if (worldEntities) {
    const id = Number(worldEntities[1]);
    if (m === 'GET') return LocalDB.getEntities(id);
    if (m === 'POST') return LocalDB.createEntity(id, body);
  }

  // /api/worlds/:id/events
  const worldEvents = url.match(/^\/api\/worlds\/(\d+)\/events$/);
  if (worldEvents) {
    const id = Number(worldEvents[1]);
    if (m === 'GET') return LocalDB.getEvents(id);
    if (m === 'POST') return LocalDB.createEvent(id, body);
  }

  // /api/worlds/:id/export
  const worldExport = url.match(/^\/api\/worlds\/(\d+)\/export$/);
  if (worldExport) return LocalDB.exportWorld(Number(worldExport[1]));

  // /api/worlds/:id/share  — sharing unsupported in static build
  const worldShare = url.match(/^\/api\/worlds\/(\d+)\/share$/);
  if (worldShare) throw new Error('Sharing is not available in the static demo');

  // /api/worlds/:id
  const worldById = url.match(/^\/api\/worlds\/(\d+)$/);
  if (worldById) {
    const id = Number(worldById[1]);
    if (m === 'GET') return LocalDB.getWorld(id);
    if (m === 'DELETE') { LocalDB.deleteWorld(id); return {}; }
  }

  // /api/entities/:id
  const entityById = url.match(/^\/api\/entities\/(\d+)$/);
  if (entityById) {
    const id = Number(entityById[1]);
    if (m === 'PUT') return LocalDB.updateEntity(id, body);
    if (m === 'DELETE') { LocalDB.deleteEntity(id); return {}; }
  }

  throw new Error(`Unhandled static API: ${method} ${url}`);
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
