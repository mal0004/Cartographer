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
      card.innerHTML = `
        <div class="lorebook-ev-header">
          <span class="lorebook-ev-badge" style="background:${color}">${t('lorebook.categories.' + ev.category)}</span>
          <span class="lorebook-ev-year">${t('lorebook.year')} ${ev.year}</span>
        </div>
        <h4>${ev.title}</h4>
        <p>${ev.description}</p>
        <button class="lorebook-add-timeline btn-sm">${t('lorebook.addToTimeline')}</button>`;
      card.querySelector('.lorebook-add-timeline').addEventListener('click', async () => {
        if (!this.app.currentWorld) return;
        await api('POST', `/api/worlds/${this.app.currentWorld.id}/events`, {
          title: ev.title, date: ev.year, category: ev.category,
          description: ev.description, entity_ids: [],
        });
        card.querySelector('.lorebook-add-timeline').textContent = '✓';
        card.querySelector('.lorebook-add-timeline').disabled = true;
      });
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
      card.innerHTML = `
        <h4>${tl.name}</h4>
        <p class="lorebook-lore-text">${tl.lore}</p>`;
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
      card.innerHTML = `
        <h4>${el.name}</h4>
        <p class="lorebook-lore-text">${el.lore}</p>
        <div class="lorebook-entity-actions">
          <button class="lorebook-accept btn-sm">${t('lorebook.accept')}</button>
          <button class="lorebook-regen btn-sm">${t('lorebook.regenerate')}</button>
        </div>`;
      card.querySelector('.lorebook-accept').addEventListener('click', async () => {
        const entity = this.app.entities.find(e => e.id === el.id);
        if (entity) {
          entity.data.description = el.lore;
          await api('PUT', `/api/entities/${entity.id}`, { name: entity.name, data: entity.data });
          card.querySelector('.lorebook-accept').textContent = '✓';
          card.querySelector('.lorebook-accept').disabled = true;
        }
      });
      card.querySelector('.lorebook-regen').addEventListener('click', () => {
        this._generate();
      });
      box.appendChild(card);
    }
  }
}
