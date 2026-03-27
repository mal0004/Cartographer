/**
 * Cartographer — Lorebook Panel
 *
 * Shows generated lore: history, territory descriptions, entity lore.
 * Lore can be accepted (copied to real entity) or regenerated.
 */

import { t } from '../i18n.js';
import { LoreGenerator } from '../analysis/lore-generator.js';
import { api } from '../data/storage.js';

const TABS = ['history', 'territories', 'entities'];
const CAT_COLORS = { war: '#8B2635', political: '#5A7A9A', cultural: '#8B8B2E', natural: '#4A9A5A' };

export class LorebookPanel {
  constructor(app) {
    this.app = app;
    this.lore = null;
    this.tab = 'history';
    this.open = false;
    this.el = null;
    this._build();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.className = 'lorebook-panel';
    this.el.innerHTML = `
      <div class="lorebook-header">
        <div>
          <h3 data-i18n="lorebook.panel.title">${t('lorebook.panel.title')}</h3>
          <small data-i18n="lorebook.panel.subtitle">${t('lorebook.panel.subtitle')}</small>
        </div>
        <div class="lorebook-header-actions">
          <button class="lorebook-generate btn-icon" title="${t('lorebook.panel.generate')}">&#8635;</button>
          <button class="lorebook-close btn-icon">&times;</button>
        </div>
      </div>
      <div class="lorebook-tabs"></div>
      <div class="lorebook-content"></div>`;
    document.body.appendChild(this.el);
    this.el.querySelector('.lorebook-close').addEventListener('click', () => this.hide());
    this.el.querySelector('.lorebook-generate').addEventListener('click', () => this._generate());
  }

  toggle() { this.open ? this.hide() : this.show(); }

  show() {
    this.open = true;
    this.el.classList.add('open');
    if (!this.lore) this._generate();
    else this._render();
  }

  hide() {
    this.open = false;
    this.el.classList.remove('open');
  }

  _generate() {
    const seed = this.app.currentWorld
      ? (typeof this.app.currentWorld.id === 'number'
        ? this.app.currentWorld.id
        : Array.from(String(this.app.currentWorld.id)).reduce((s, c) => s * 31 + c.charCodeAt(0), 0))
      : Date.now();
    const gen = new LoreGenerator(this.app.entities, seed);
    this.lore = gen.generate();
    this._render();
  }

  _render() {
    this._renderTabs();
    if (this.tab === 'history') this._renderHistory();
    else if (this.tab === 'territories') this._renderTerritories();
    else this._renderEntities();
  }

  _renderTabs() {
    const box = this.el.querySelector('.lorebook-tabs');
    box.innerHTML = '';
    for (const tab of TABS) {
      const btn = document.createElement('button');
      btn.className = 'lorebook-tab' + (this.tab === tab ? ' active' : '');
      btn.textContent = t('lorebook.tabs.' + tab);
      btn.addEventListener('click', () => { this.tab = tab; this._render(); });
      box.appendChild(btn);
    }
  }

  _renderHistory() {
    const box = this.el.querySelector('.lorebook-content');
    if (!this.lore || this.lore.history.length === 0) {
      box.innerHTML = `<div class="lorebook-empty" data-i18n="lorebook.panel.empty">${t('lorebook.panel.empty')}</div>`;
      return;
    }
    box.innerHTML = '';
    for (const ev of this.lore.history) {
      const card = document.createElement('div');
      card.className = 'lorebook-event-card';
      const color = CAT_COLORS[ev.category] || '#888';

      const header = document.createElement('div');
      header.className = 'lorebook-ev-header';

      const badge = document.createElement('span');
      badge.className = 'lorebook-ev-badge';
      badge.style.background = color;
      badge.textContent = t('lorebook.categories.' + ev.category);

      const year = document.createElement('span');
      year.className = 'lorebook-ev-year';
      year.textContent = `${t('lorebook.year')} ${ev.year}`;

      header.appendChild(badge);
      header.appendChild(year);

      const titleEl = document.createElement('h4');
      titleEl.textContent = ev.title;

      const descEl = document.createElement('p');
      descEl.textContent = ev.description;

      const addBtn = document.createElement('button');
      addBtn.className = 'lorebook-add-timeline btn-sm';
      addBtn.textContent = t('lorebook.addToTimeline');
      addBtn.addEventListener('click', async () => {
        if (!this.app.currentWorld) return;
        await api('POST', `/api/worlds/${this.app.currentWorld.id}/events`, {
          title: ev.title, date: ev.year, category: ev.category,
          description: ev.description, entity_ids: [],
        });
        addBtn.textContent = '✓';
        addBtn.disabled = true;
      });

      card.appendChild(header);
      card.appendChild(titleEl);
      card.appendChild(descEl);
      card.appendChild(addBtn);
      box.appendChild(card);
    }
  }

  _renderTerritories() {
    const box = this.el.querySelector('.lorebook-content');
    if (!this.lore || this.lore.territoryLore.length === 0) {
      box.innerHTML = `<div class="lorebook-empty" data-i18n="lorebook.panel.empty">${t('lorebook.panel.empty')}</div>`;
      return;
    }
    box.innerHTML = '';
    for (const tl of this.lore.territoryLore) {
      const card = document.createElement('div');
      card.className = 'lorebook-territory-card';

      const titleEl = document.createElement('h4');
      titleEl.textContent = tl.name;

      const loreEl = document.createElement('p');
      loreEl.className = 'lorebook-lore-text';
      loreEl.textContent = tl.lore;

      card.appendChild(titleEl);
      card.appendChild(loreEl);
      box.appendChild(card);
    }
  }

  _renderEntities() {
    const box = this.el.querySelector('.lorebook-content');
    if (!this.lore || this.lore.entityLore.length === 0) {
      box.innerHTML = `<div class="lorebook-empty">${t('lorebook.panel.noSuggestions')}</div>`;
      return;
    }
    box.innerHTML = '';
    for (const el of this.lore.entityLore) {
      const card = document.createElement('div');
      card.className = 'lorebook-entity-card';

      const titleEl = document.createElement('h4');
      titleEl.textContent = el.name;

      const loreEl = document.createElement('p');
      loreEl.className = 'lorebook-lore-text';
      loreEl.textContent = el.lore;

      const actionsEl = document.createElement('div');
      actionsEl.className = 'lorebook-entity-actions';

      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'lorebook-accept btn-sm';
      acceptBtn.textContent = t('lorebook.accept');
      acceptBtn.addEventListener('click', async () => {
        const entity = this.app.entities.find(e => e.id === el.id);
        if (entity) {
          entity.data.description = el.lore;
          await api('PUT', `/api/entities/${entity.id}`, { name: entity.name, data: entity.data });
          acceptBtn.textContent = '✓';
          acceptBtn.disabled = true;
        }
      });

      const regenBtn = document.createElement('button');
      regenBtn.className = 'lorebook-regen btn-sm';
      regenBtn.textContent = t('lorebook.regenerate');
      regenBtn.addEventListener('click', () => {
        this._generate();
      });

      actionsEl.appendChild(acceptBtn);
      actionsEl.appendChild(regenBtn);
      card.appendChild(titleEl);
      card.appendChild(loreEl);
      card.appendChild(actionsEl);
      box.appendChild(card);
    }
  }
}
