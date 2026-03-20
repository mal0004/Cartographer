/**
 * Cartographer — Cartographic Symbol Library
 *
 * 50+ inline SVG symbols in old engraving style.
 * Floating palette with search, placement, resize & rotate.
 */

const SYMBOL_CATEGORIES = {
  'Villes': [
    { id: 'capital', name: 'Capitale', svg: '<polygon points="12,1 15,9 23,9 17,14 19,22 12,18 5,22 7,14 1,9 9,9" fill="currentColor"/>' },
    { id: 'city', name: 'Ville', svg: '<circle cx="12" cy="12" r="7" fill="currentColor"/>' },
    { id: 'village', name: 'Village', svg: '<circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2"/>' },
    { id: 'port', name: 'Port', svg: '<path d="M12 2v10m0 0c-3 0-6 2-6 5h12c0-3-3-5-6-5zm-4 5c0 2 1.5 4 4 5 2.5-1 4-3 4-5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 20h10" stroke="currentColor" stroke-width="1.5"/>' },
    { id: 'fortress', name: 'Forteresse', svg: '<path d="M4 22V10h3V7h2V4h6v3h2v3h3v12zm4-5h2v5H8zm6 0h2v5h-2z" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="6" y="7" width="2" height="2" fill="currentColor"/><rect x="16" y="7" width="2" height="2" fill="currentColor"/><rect x="10" y="4" width="4" height="2" fill="currentColor"/>' },
  ],
  'Nature': [
    { id: 'volcano', name: 'Volcan', svg: '<path d="M2 22L9 8l3 4 3-4 7 14z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 6c0-2 1-4 2-4s2 2 2 4" stroke="currentColor" stroke-width="1" fill="none"/><path d="M9 4c0-2 .5-3 1-3" stroke="currentColor" stroke-width="0.8" fill="none"/>' },
    { id: 'mountain', name: 'Montagne', svg: '<path d="M2 20L8 6l4 6 4-6 6 14z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 6l2 3h-4z" fill="currentColor" opacity="0.3"/>' },
    { id: 'tree-dense', name: 'Forêt dense', svg: '<circle cx="8" cy="8" r="5" fill="currentColor" opacity="0.7"/><circle cx="16" cy="8" r="5" fill="currentColor" opacity="0.7"/><circle cx="12" cy="5" r="5" fill="currentColor" opacity="0.8"/><line x1="8" y1="13" x2="8" y2="20" stroke="currentColor" stroke-width="1.5"/><line x1="16" y1="13" x2="16" y2="20" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="10" x2="12" y2="22" stroke="currentColor" stroke-width="1.5"/>' },
    { id: 'tree-sparse', name: 'Forêt clairsemée', svg: '<circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="17" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="12" x2="8" y2="20" stroke="currentColor" stroke-width="1.2"/><line x1="17" y1="13" x2="17" y2="20" stroke="currentColor" stroke-width="1.2"/>' },
    { id: 'marsh', name: 'Marais', svg: '<path d="M3 16h18M3 20h18" stroke="currentColor" stroke-width="1"/><line x1="6" y1="12" x2="6" y2="16" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="10" x2="12" y2="16" stroke="currentColor" stroke-width="1.5"/><line x1="18" y1="12" x2="18" y2="16" stroke="currentColor" stroke-width="1.5"/><path d="M5 12h2M11 10h2M17 12h2" stroke="currentColor" stroke-width="1"/>' },
    { id: 'desert', name: 'Désert (dunes)', svg: '<path d="M1 20Q6 14 12 18Q18 14 23 20" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 16Q7 12 11 14" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="8" cy="7" r="0.8" fill="currentColor"/><circle cx="15" cy="9" r="0.8" fill="currentColor"/><circle cx="11" cy="11" r="0.6" fill="currentColor"/>' },
    { id: 'waterfall', name: 'Cascade', svg: '<path d="M8 4v6c0 2-3 3-3 6s2 4 2 4h10s2-2 2-4-3-4-3-6V4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 8v4M14 6v6" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2"/>' },
    { id: 'cave', name: 'Grotte', svg: '<path d="M4 20Q4 10 12 6Q20 10 20 20" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 20Q8 14 12 12Q16 14 16 20" fill="currentColor" opacity="0.3"/><ellipse cx="12" cy="20" rx="4" ry="1" fill="currentColor" opacity="0.5"/>' },
  ],
  'Civilisation': [
    { id: 'temple', name: 'Temple', svg: '<path d="M4 20h16M5 16h14v4H5zM7 10h10v6H7zM12 4l-6 6h12z" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="9" y1="10" x2="9" y2="16" stroke="currentColor" stroke-width="1.2"/><line x1="12" y1="10" x2="12" y2="16" stroke="currentColor" stroke-width="1.2"/><line x1="15" y1="10" x2="15" y2="16" stroke="currentColor" stroke-width="1.2"/>' },
    { id: 'ruins', name: 'Ruines', svg: '<path d="M3 20V12h2v-3h2V6h2V4M10 20V14h2v-4h2V8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 20V16M19 20V14" stroke="currentColor" stroke-width="1.5"/><path d="M14 12h3" stroke="currentColor" stroke-width="1" stroke-dasharray="1,1"/>' },
    { id: 'mine', name: 'Mine', svg: '<path d="M12 4L4 20h16zM12 4v16" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="14" r="1.5" fill="currentColor"/>' },
    { id: 'lighthouse', name: 'Phare', svg: '<path d="M10 22h4M9 22V10l3-6 3 6v12" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 10h8" stroke="currentColor" stroke-width="1.2"/><path d="M5 8h4M15 8h4" stroke="currentColor" stroke-width="1" stroke-dasharray="1,2"/><circle cx="12" cy="6" r="2" fill="currentColor" opacity="0.5"/>' },
    { id: 'bridge', name: 'Pont', svg: '<path d="M2 14Q7 8 12 14Q17 8 22 14" fill="none" stroke="currentColor" stroke-width="2"/><line x1="7" y1="11" x2="7" y2="20" stroke="currentColor" stroke-width="1.5"/><line x1="17" y1="11" x2="17" y2="20" stroke="currentColor" stroke-width="1.5"/>' },
    { id: 'inn', name: 'Auberge', svg: '<path d="M4 22V10L12 4l8 6v12z" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="14" width="6" height="8" fill="none" stroke="currentColor" stroke-width="1"/><path d="M9 14h6" stroke="currentColor" stroke-width="1"/><circle cx="12" cy="8" r="1" fill="currentColor"/>' },
    { id: 'farm', name: 'Champ cultivé', svg: '<rect x="3" y="6" width="18" height="14" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M3 10h18M3 14h18M3 18h18" stroke="currentColor" stroke-width="0.8"/><path d="M7 6v14M11 6v14M15 6v14M19 6v14" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2,2"/>' },
    { id: 'cemetery', name: 'Cimetière', svg: '<rect x="4" y="4" width="16" height="16" rx="1" fill="none" stroke="currentColor" stroke-width="1"/><path d="M8 10v5M6 12h4" stroke="currentColor" stroke-width="1.5"/><path d="M15 10v5M13 12h4" stroke="currentColor" stroke-width="1.5"/><path d="M11 15v4M10 17h3" stroke="currentColor" stroke-width="1.2"/>' },
  ],
  'Fantastique': [
    { id: 'dragon', name: 'Dragon (danger)', svg: '<path d="M4 18C4 12 8 6 12 4c2 1 4 3 5 6l3-2c-1 4-2 6-4 8 1 1 2 3 1 4l-4-2c-2 1-5 2-8 1" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="14" cy="10" r="1" fill="currentColor"/><path d="M8 16l2-2 2 2" stroke="currentColor" stroke-width="1"/>' },
    { id: 'eye', name: 'Œil (mystique)', svg: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>' },
    { id: 'crystal', name: 'Cristal (magie)', svg: '<path d="M12 2l-4 8 4 12 4-12z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 10h8" stroke="currentColor" stroke-width="1"/><path d="M6 8l6 4 6-4" fill="none" stroke="currentColor" stroke-width="0.8"/><path d="M10 4l2 6 2-6" fill="currentColor" opacity="0.2"/>' },
    { id: 'skull', name: 'Crâne (maudit)', svg: '<path d="M6 14c-2-2-3-5-1-8 1-2 3-3 7-3s6 1 7 3c2 3 1 6-1 8v3h-2v-2h-2v2h-2v-2h-2v2H8v-3z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="10" r="2" fill="currentColor"/><circle cx="15" cy="10" r="2" fill="currentColor"/><path d="M10 15h4" stroke="currentColor" stroke-width="1"/>' },
  ],
};

// Flatten for search
const ALL_SYMBOLS = [];
for (const [cat, syms] of Object.entries(SYMBOL_CATEGORIES)) {
  for (const sym of syms) {
    ALL_SYMBOLS.push({ ...sym, category: cat });
  }
}

class SymbolLibrary {
  constructor() {
    this.selectedSymbol = null;
    this.visible = false;
    this._buildPalette();
  }

  _buildPalette() {
    this.el = document.createElement('div');
    this.el.id = 'symbol-palette';
    this.el.className = 'symbol-palette';
    this.el.hidden = true;

    let html = `
      <div class="symbol-palette-header">
        <h4>Symboles</h4>
        <input type="text" id="symbol-search" placeholder="Rechercher..." class="symbol-search">
        <button class="btn-icon symbol-close" title="Fermer">&times;</button>
      </div>
      <div class="symbol-palette-body" id="symbol-palette-body">
    `;

    for (const [cat, syms] of Object.entries(SYMBOL_CATEGORIES)) {
      html += `<div class="symbol-category"><h5>${cat}</h5><div class="symbol-grid">`;
      for (const sym of syms) {
        html += `<button class="symbol-item" data-symbol-id="${sym.id}" title="${sym.name}">
          <svg viewBox="0 0 24 24" width="28" height="28">${sym.svg}</svg>
          <span>${sym.name}</span>
        </button>`;
      }
      html += `</div></div>`;
    }

    html += `</div>`;
    this.el.innerHTML = html;

    const container = document.getElementById('canvas-container');
    container.appendChild(this.el);

    // Close button
    this.el.querySelector('.symbol-close').addEventListener('click', () => this.hide());

    // Search
    this.el.querySelector('#symbol-search').addEventListener('input', (e) => {
      this._filterSymbols(e.target.value.toLowerCase());
    });

    // Symbol selection
    this.el.querySelectorAll('.symbol-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.el.querySelectorAll('.symbol-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedSymbol = btn.dataset.symbolId;
        if (this.onSymbolSelected) this.onSymbolSelected(this.selectedSymbol);
      });
    });

    this.onSymbolSelected = null;
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

  show() {
    this.el.hidden = false;
    this.visible = true;
  }

  hide() {
    this.el.hidden = true;
    this.visible = false;
    this.selectedSymbol = null;
    this.el.querySelectorAll('.symbol-item').forEach(b => b.classList.remove('active'));
  }

  toggle() {
    if (this.visible) this.hide(); else this.show();
  }

  getSymbolById(id) {
    return ALL_SYMBOLS.find(s => s.id === id) || null;
  }
}

window.SymbolLibrary = SymbolLibrary;
window.ALL_SYMBOLS = ALL_SYMBOLS;
