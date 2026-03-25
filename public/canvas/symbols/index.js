/**
 * Cartographer — Symbol Library Index
 *
 * Aggregates all symbol categories and provides the SymbolLibrary
 * palette UI with search, selection and canvas drawing.
 */

import { CITY_SYMBOLS, drawCitySymbol } from './cities.js';
import { NATURE_SYMBOLS, drawNatureSymbol } from './nature.js';
import { FANTASY_SYMBOLS, drawFantasySymbol } from './fantasy.js';
import { POSTAPOC_SYMBOLS, drawPostapocSymbol } from './postapoc.js';
import { t } from '../i18n.js';

const SYMBOL_CATEGORY_KEYS = [
  { key: 'cities', symbols: CITY_SYMBOLS },
  { key: 'nature', symbols: NATURE_SYMBOLS },
  { key: 'fantasy', symbols: FANTASY_SYMBOLS },
  { key: 'postapoc', symbols: POSTAPOC_SYMBOLS },
];

// Flat list for lookups (category stored as key, not display name)
const ALL_SYMBOLS = [];
for (const cat of SYMBOL_CATEGORY_KEYS) {
  for (const sym of cat.symbols) ALL_SYMBOLS.push({ ...sym, category: cat.key });
}

// Legacy compat: keyed by translated name (rebuilt on lang change)
let SYMBOL_CATEGORIES = {};
function rebuildCategories() {
  SYMBOL_CATEGORIES = {};
  for (const cat of SYMBOL_CATEGORY_KEYS) {
    const label = t(`editor.symbols.categories.${cat.key}`);
    SYMBOL_CATEGORIES[label] = cat.symbols;
  }
}

const DRAW_FNS = {
  ...Object.fromEntries(CITY_SYMBOLS.map(s => [s.id, drawCitySymbol])),
  ...Object.fromEntries(NATURE_SYMBOLS.map(s => [s.id, drawNatureSymbol])),
  ...Object.fromEntries(FANTASY_SYMBOLS.map(s => [s.id, drawFantasySymbol])),
  ...Object.fromEntries(POSTAPOC_SYMBOLS.map(s => [s.id, drawPostapocSymbol])),
};

function drawSymbol(ctx, id, x, y, size, color) {
  const fn = DRAW_FNS[id];
  if (fn) fn(ctx, x, y, size, color, id);
}

function symName(id) {
  const key = `editor.symbols.names.${id}`;
  const val = t(key);
  return val !== key ? val : id;
}

class SymbolLibrary {
  constructor() {
    this.selectedSymbol = null;
    this.visible = false;
    this.onSymbolSelected = null;
    this._buildPalette();
    document.addEventListener('langchange', () => this._rebuildContent());
  }

  _buildPalette() {
    this.el = document.createElement('div');
    this.el.id = 'symbol-palette';
    this.el.className = 'symbol-palette';
    this.el.hidden = true;
    this._rebuildContent();
    const container = document.getElementById('canvas-container');
    container.appendChild(this.el);
  }

  _rebuildContent() {
    rebuildCategories();
    let html = `
      <div class="symbol-palette-header">
        <h4>${t('editor.symbols.title')}</h4>
        <input type="text" id="symbol-search" placeholder="${t('editor.symbols.search')}" class="symbol-search">
        <button class="btn-icon symbol-close" title="${t('common.close')}">&times;</button>
      </div>
      <div class="symbol-palette-body" id="symbol-palette-body">`;
    for (const cat of SYMBOL_CATEGORY_KEYS) {
      const catLabel = t(`editor.symbols.categories.${cat.key}`);
      html += `<div class="symbol-category"><h5>${catLabel}</h5><div class="symbol-grid">`;
      for (const sym of cat.symbols) {
        const name = symName(sym.id);
        html += `<button class="symbol-item" data-symbol-id="${sym.id}" title="${name}">
          <svg viewBox="0 0 24 24" width="28" height="28">${sym.svg}</svg>
          <span>${name}</span>
        </button>`;
      }
      html += `</div></div>`;
    }
    html += `</div>`;
    this.el.innerHTML = html;
    this.el.querySelector('.symbol-close').addEventListener('click', () => this.hide());
    this.el.querySelector('#symbol-search').addEventListener('input', (e) => {
      this._filterSymbols(e.target.value.toLowerCase());
    });
    this.el.querySelectorAll('.symbol-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.el.querySelectorAll('.symbol-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedSymbol = btn.dataset.symbolId;
        if (this.onSymbolSelected) this.onSymbolSelected(this.selectedSymbol);
      });
    });
  }

  _filterSymbols(query) {
    const body = this.el.querySelector('#symbol-palette-body');
    body.querySelectorAll('.symbol-item').forEach(btn => {
      const name = btn.title.toLowerCase();
      btn.style.display = !query || name.includes(query) ? '' : 'none';
    });
    body.querySelectorAll('.symbol-category').forEach(cat => {
      const visible = cat.querySelectorAll('.symbol-item[style=""], .symbol-item:not([style])');
      cat.style.display = visible.length > 0 ? '' : 'none';
    });
  }

  show() { this.el.hidden = false; this.visible = true; }
  hide() {
    this.el.hidden = true; this.visible = false; this.selectedSymbol = null;
    this.el.querySelectorAll('.symbol-item').forEach(b => b.classList.remove('active'));
  }
  toggle() { if (this.visible) this.hide(); else this.show(); }
  getSymbolById(id) { return ALL_SYMBOLS.find(s => s.id === id) || null; }
}

export { SymbolLibrary, ALL_SYMBOLS, SYMBOL_CATEGORIES, drawSymbol };
