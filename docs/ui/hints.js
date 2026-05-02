/**
 * Cartographer — Contextual Hint System
 *
 * Shows helpful hints based on user context after 3s inactivity.
 * Persists shown hints in localStorage to avoid repetition.
 */

import { t } from '../i18n.js';

const HINT_DELAY = 3000;
const STORAGE_KEY = 'cartographer_shown_hints';

export class HintSystem {
  constructor(container) {
    this.container = container;
    this.shownHints = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    this._timer = null;
    this._currentHint = null;
    this._el = null;
    this._boundDismiss = () => this._dismiss();
    this._checklistEl = null;
    this.container.addEventListener('mousemove', this._boundDismiss);
  }

  checkContext(appState) {
    const { tool, entities } = appState;
    const territories = entities.filter(e => e.type === 'territory');
    const cities = entities.filter(e => e.type === 'city');
    const rivers = entities.filter(e => e.type === 'river');

    let key = null;
    if (territories.length === 0 && tool === 'brush') key = 'emptyBrush';
    else if (territories.length === 0 && (tool === 'territory' || tool === 'region')) key = 'emptyPolygon';
    else if (territories.length >= 1 && cities.length === 0) key = 'addCity';
    else if (cities.length >= 1 && rivers.length === 0) key = 'addRiver';

    if (key && !this.shownHints.has(key)) {
      this._scheduleHint(key);
    }
    this._renderChecklist({ territories, cities, rivers, entities });
  }

  _scheduleHint(key) {
    this._clearTimer();
    this._timer = setTimeout(() => this._showHint(key), HINT_DELAY);
  }

  _renderChecklist({ territories, cities, rivers, entities }) {
    const routes = entities.filter(e => e.type === 'route');
    const regions = entities.filter(e => e.type === 'region');
    const steps = [
      { label: '1. Relief & continents', done: territories.length > 0 },
      { label: '2. Hydrography', done: rivers.length > 0 },
      { label: '3. Settlements', done: cities.length > 0 },
      { label: '4. Routes & trade', done: routes.length > 0 },
      { label: '5. Biomes & regions', done: regions.length > 0 },
    ];
    if (!this._checklistEl) { this._checklistEl = document.createElement('aside'); this._checklistEl.className = 'hint-checklist'; this.container.appendChild(this._checklistEl); }
    const completed = steps.filter(s => s.done).length;
    this._checklistEl.innerHTML = `<div class="hint-checklist-title">Worldbuilding checklist (${completed}/${steps.length})</div><ul>${steps.map(s => `<li class="${s.done ? 'done' : ''}">${s.done ? '✓' : '○'} ${s.label}</li>`).join('')}</ul>`;
  }

  _showHint(key) {
    if (this.shownHints.has(key)) return;
    this._dismiss();

    this._el = document.createElement('div');
    this._el.className = 'hint-toast';
    this._el.setAttribute('data-i18n', `editor.hints.${key}`);
    this._el.textContent = t(`editor.hints.${key}`);
    this._el.style.opacity = '0';
    this.container.appendChild(this._el);
    requestAnimationFrame(() => { this._el.style.opacity = '1'; });

    this._currentHint = key;
    this.shownHints.add(key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.shownHints]));
  }

  _dismiss() {
    this._clearTimer();
    if (this._el) {
      this._el.style.opacity = '0';
      const el = this._el;
      setTimeout(() => el.remove(), 300);
      this._el = null;
      this._currentHint = null;
    }
  }

  _clearTimer() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  }

  destroy() {
    this._dismiss();
    if (this._checklistEl) this._checklistEl.remove();
    this.container.removeEventListener('mousemove', this._boundDismiss);
  }
}
