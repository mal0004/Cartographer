/**
 * Cartographer — Modal Dialogs
 *
 * New world, add event, share, and export modal creation and management.
 */

import { api, escapeHtml } from '../data/storage.js';

export function showNewWorldModal() {
  document.getElementById('modal-new-world').hidden = false;
  document.getElementById('new-world-name').focus();
}

export function hideNewWorldModal() {
  document.getElementById('modal-new-world').hidden = true;
}

export async function createWorldFromModal() {
  const name = document.getElementById('new-world-name').value.trim();
  if (!name) return null;
  const world = await api('POST', '/api/worlds', {
    name,
    description: document.getElementById('new-world-desc').value.trim(),
    time_start: Number(document.getElementById('new-world-tstart').value) || 0,
    time_end: Number(document.getElementById('new-world-tend').value) || 1000,
  });
  hideNewWorldModal();
  document.getElementById('new-world-name').value = '';
  document.getElementById('new-world-desc').value = '';
  return world;
}

export function showAddEventModal(currentWorld, entities, onCreated) {
  const existing = document.getElementById('event-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'event-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Add Event</h2>
      <div class="event-modal-fields">
        <label>Title<input type="text" id="evt-title" placeholder="Battle of the Plains"></label>
        <label>Year<input type="number" id="evt-date" value="${currentWorld.time_start}"></label>
        <label>Category
          <select id="evt-category">
            <option value="political">Political</option>
            <option value="war">War</option>
            <option value="natural">Natural</option>
            <option value="cultural">Cultural</option>
          </select>
        </label>
        <label>Description<textarea id="evt-desc" rows="3"></textarea></label>
        <label>Linked entities
          <select id="evt-entities" multiple style="height:80px">
            ${entities.filter(e => e.name).map(e => `<option value="${e.id}">${escapeHtml(e.name)} (${e.type})</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="evt-cancel">Cancel</button>
        <button class="btn btn-primary" id="evt-create">Add</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  document.getElementById('evt-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('evt-create').addEventListener('click', async () => {
    const title = document.getElementById('evt-title').value.trim();
    if (!title) return;
    const selected = Array.from(document.getElementById('evt-entities').selectedOptions).map(o => Number(o.value));
    await api('POST', `/api/worlds/${currentWorld.id}/events`, {
      title,
      date: Number(document.getElementById('evt-date').value),
      category: document.getElementById('evt-category').value,
      description: document.getElementById('evt-desc').value.trim(),
      entity_ids: selected,
    });
    modal.remove();
    if (onCreated) onCreated();
  });
}

export function showShareModal(currentWorld) {
  const existing = document.getElementById('share-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'share-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:480px;">
      <h2>Partager ce monde</h2>
      <div class="share-options">
        <label class="export-field">
          <span>Expiration</span>
          <select id="share-expires">
            <option value="">Jamais</option>
            <option value="24h">24 heures</option>
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
          </select>
        </label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="share-cancel">Annuler</button>
        <button class="btn btn-primary" id="share-generate">Générer le lien</button>
      </div>
      <div id="share-result" hidden>
        <label class="export-field" style="margin-top:12px;">
          <span>Lien de partage (lecture seule)</span>
          <div style="display:flex;gap:6px;">
            <input type="text" id="share-url" readonly style="flex:1;font-size:0.85rem;">
            <button class="btn btn-sm" id="share-copy">Copier</button>
          </div>
        </label>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('share-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('share-generate').addEventListener('click', async () => {
    const expires = document.getElementById('share-expires').value;
    const share = await api('POST', `/api/worlds/${currentWorld.id}/share`, { expires });
    if (share && share.token) {
      const url = `${location.origin}/share/${share.token}`;
      document.getElementById('share-url').value = url;
      document.getElementById('share-result').hidden = false;
    }
  });
  document.getElementById('share-copy').addEventListener('click', () => {
    const input = document.getElementById('share-url');
    navigator.clipboard.writeText(input.value).then(() => {
      document.getElementById('share-copy').textContent = 'Copié !';
      setTimeout(() => document.getElementById('share-copy').textContent = 'Copier', 2000);
    });
  });
}
