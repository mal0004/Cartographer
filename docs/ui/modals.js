/**
 * Cartographer — Modal Dialogs
 *
 * New world, add event, share, and export modal creation and management.
 */

import { api, escapeHtml } from '../data/storage.js';
import { t } from '../i18n.js';

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
      <h2>${t('editor.modals.addEvent')}</h2>
      <div class="event-modal-fields">
        <label>${t('editor.modals.eventTitle')}<input type="text" id="evt-title" placeholder="${t('editor.modals.eventTitlePlaceholder')}"></label>
        <label>${t('editor.modals.eventYear')}<input type="number" id="evt-date" value="${currentWorld.time_start}"></label>
        <label>${t('editor.modals.eventCategory')}
          <select id="evt-category">
            <option value="political">${t('editor.modals.categoryPolitical')}</option>
            <option value="war">${t('editor.modals.categoryWar')}</option>
            <option value="natural">${t('editor.modals.categoryNatural')}</option>
            <option value="cultural">${t('editor.modals.categoryCultural')}</option>
          </select>
        </label>
        <label>${t('editor.modals.eventDescription')}<textarea id="evt-desc" rows="3"></textarea></label>
        <label>${t('editor.modals.eventLinkedEntities')}
          <select id="evt-entities" multiple style="height:80px">
            ${entities.filter(e => e.name).map(e => `<option value="${e.id}">${escapeHtml(e.name)} (${e.type})</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="evt-cancel">${t('common.cancel')}</button>
        <button class="btn btn-primary" id="evt-create">${t('editor.modals.add')}</button>
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
      <h2>${t('editor.modals.share')}</h2>
      <div class="share-options">
        <label class="export-field">
          <span>${t('editor.modals.shareExpiration')}</span>
          <select id="share-expires">
            <option value="">${t('editor.modals.shareNever')}</option>
            <option value="24h">${t('editor.modals.share24h')}</option>
            <option value="7d">${t('editor.modals.share7d')}</option>
            <option value="30d">${t('editor.modals.share30d')}</option>
          </select>
        </label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="share-cancel">${t('common.cancel')}</button>
        <button class="btn btn-primary" id="share-generate">${t('editor.modals.shareGenerate')}</button>
      </div>
      <div id="share-result" hidden>
        <label class="export-field" style="margin-top:12px;">
          <span>${t('editor.modals.shareLink')}</span>
          <div style="display:flex;gap:6px;">
            <input type="text" id="share-url" readonly style="flex:1;font-size:0.85rem;">
            <button class="btn btn-sm" id="share-copy">${t('editor.modals.shareCopy')}</button>
          </div>
        </label>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('share-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('share-generate').addEventListener('click', async () => {
    const expires = document.getElementById('share-expires').value;
    try {
      const share = await api('POST', `/api/worlds/${currentWorld.id}/share`, { expires });
      if (share && share.token) {
        const url = `${location.origin}/share/${share.token}`;
        document.getElementById('share-url').value = url;
        document.getElementById('share-result').hidden = false;
      }
    } catch (err) {
      const resultEl = document.getElementById('share-result');
      resultEl.hidden = false;
      resultEl.innerHTML = `<p style="color:var(--accent);margin-top:12px;font-size:0.9rem;">${escapeHtml(err.message)}</p>`;
    }
  });
  document.getElementById('share-copy').addEventListener('click', () => {
    const input = document.getElementById('share-url');
    navigator.clipboard.writeText(input.value).then(() => {
      document.getElementById('share-copy').textContent = t('editor.modals.shareCopied');
      setTimeout(() => document.getElementById('share-copy').textContent = t('editor.modals.shareCopy'), 2000);
    });
  });
}
