/**
 * Cartographer — Layers Panel
 *
 * Manages layers (calques) with visibility, opacity, ordering.
 * Each entity belongs to the layer that was active when it was created.
 */

import { t } from '../i18n.js';

const DEFAULT_LAYERS = [
  { id: 'relief', name: 'Relief', visible: true, opacity: 1 },
  { id: 'political', name: 'Political', visible: true, opacity: 1 },
  { id: 'routes', name: 'Routes', visible: true, opacity: 1 },
  { id: 'annotations', name: 'Annotations', visible: true, opacity: 1 },
];

class LayersPanel {
  constructor() {
    this.layers = JSON.parse(JSON.stringify(DEFAULT_LAYERS));
    this.activeLayerId = 'political';
    this.collapsed = true;

    // Callbacks
    this.onChange = null; // called when visibility/opacity/order changes

    this._buildPanel();
  }

  _buildPanel() {
    this.el = document.createElement('div');
    this.el.id = 'layers-panel';
    this.el.className = 'layers-panel collapsed';
    this.el.innerHTML = `
      <button id="layers-toggle" class="layers-toggle" title="${t('editor.layers.title')}">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2L2 7l10 5 10-5-10-5zm0 7.5L4 5l8 4 8-4-8 4zm-10 3L12 17l10-4.5-2-1-8 3.5-8-3.5-2 1z" fill="currentColor"/><path d="M2 16.5L12 21l10-4.5-2-1-8 3.5-8-3.5-2 1z" fill="currentColor" opacity="0.6"/></svg>
        <span class="layers-toggle-label">${t('editor.layers.title')}</span>
      </button>
      <div class="layers-content">
        <div class="layers-header">
          <h4>${t('editor.layers.title')}</h4>
          <button class="btn-icon layers-add" title="${t('editor.layers.newLayer')}">+</button>
        </div>
        <div class="layers-list" id="layers-list"></div>
        <div class="layers-active-indicator" id="layers-active-indicator"></div>
      </div>
    `;

    const container = document.getElementById('editor-body');
    container.appendChild(this.el);

    this.el.querySelector('#layers-toggle').addEventListener('click', () => this.toggle());
    this.el.querySelector('.layers-add').addEventListener('click', () => this._addLayer());

    this._render();
  }

  toggle() {
    this.collapsed = !this.collapsed;
    this.el.classList.toggle('collapsed', this.collapsed);
  }

  setLayers(layers) {
    if (layers && layers.length > 0) {
      this.layers = layers;
    } else {
      this.layers = JSON.parse(JSON.stringify(DEFAULT_LAYERS));
    }
    if (!this.layers.find(l => l.id === this.activeLayerId)) {
      this.activeLayerId = this.layers[0]?.id || 'political';
    }
    this._render();
  }

  getLayers() {
    return this.layers;
  }

  getActiveLayerId() {
    return this.activeLayerId;
  }

  isEntityVisible(entity) {
    const layerId = entity.data?._layer || 'political';
    const layer = this.layers.find(l => l.id === layerId);
    return layer ? layer.visible : true;
  }

  getEntityOpacity(entity) {
    const layerId = entity.data?._layer || 'political';
    const layer = this.layers.find(l => l.id === layerId);
    return layer ? layer.opacity : 1;
  }

  _render() {
    const list = this.el.querySelector('#layers-list');
    list.innerHTML = '';

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const item = document.createElement('div');
      item.className = `layer-item${layer.id === this.activeLayerId ? ' active' : ''}`;
      item.draggable = true;
      item.dataset.layerId = layer.id;
      item.dataset.index = i;

      item.innerHTML = `
        <button class="layer-visibility ${layer.visible ? 'visible' : ''}" title="${t('editor.layers.visibility')}">
          <svg viewBox="0 0 24 24" width="16" height="16">
            ${layer.visible
              ? '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>'
              : '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>'
            }
          </svg>
        </button>
        <span class="layer-name" data-layer-id="${layer.id}">${this._escapeHtml(layer.name)}</span>
        <input type="range" class="layer-opacity" min="0" max="1" step="0.05" value="${layer.opacity}" title="${t('editor.layers.opacity').replace('{n}', Math.round(layer.opacity * 100))}">
        <button class="layer-delete btn-icon" title="${t('editor.layers.delete')}">&times;</button>
      `;

      // Activate layer on click
      item.querySelector('.layer-name').addEventListener('click', () => {
        this.activeLayerId = layer.id;
        this._render();
        this._notify();
      });

      // Toggle visibility
      item.querySelector('.layer-visibility').addEventListener('click', (e) => {
        e.stopPropagation();
        layer.visible = !layer.visible;
        this._render();
        this._notify();
      });

      // Opacity slider
      item.querySelector('.layer-opacity').addEventListener('input', (e) => {
        layer.opacity = parseFloat(e.target.value);
        e.target.title = t('editor.layers.opacity').replace('{n}', Math.round(layer.opacity * 100));
        this._notify();
      });

      // Delete layer
      item.querySelector('.layer-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.layers.length <= 1) return;
        this.layers.splice(i, 1);
        if (this.activeLayerId === layer.id) {
          this.activeLayerId = this.layers[0].id;
        }
        this._render();
        this._notify();
      });

      // Rename on double-click
      item.querySelector('.layer-name').addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const span = e.target;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = layer.name;
        input.className = 'layer-rename-input';
        span.replaceWith(input);
        input.focus();
        input.select();
        const finish = () => {
          layer.name = input.value.trim() || layer.name;
          this._render();
          this._notify();
        };
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (ke) => {
          if (ke.key === 'Enter') input.blur();
          if (ke.key === 'Escape') { input.value = layer.name; input.blur(); }
        });
      });

      // Drag & drop reorder
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', i);
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const toIdx = i;
        if (fromIdx === toIdx) return;
        const [moved] = this.layers.splice(fromIdx, 1);
        this.layers.splice(toIdx, 0, moved);
        this._render();
        this._notify();
      });

      list.appendChild(item);
    }

    // Active layer indicator
    const indicator = this.el.querySelector('#layers-active-indicator');
    const activeLayer = this.layers.find(l => l.id === this.activeLayerId);
    indicator.textContent = activeLayer ? t('editor.layers.activeLayer').replace('{name}', activeLayer.name) : '';
  }

  _addLayer() {
    const name = prompt(t('editor.layers.layerNamePrompt'));
    if (!name) return;
    const id = 'layer_' + Date.now();
    this.layers.push({ id, name, visible: true, opacity: 1 });
    this.activeLayerId = id;
    this._render();
    this._notify();
  }

  _notify() {
    if (this.onChange) this.onChange();
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

export { LayersPanel, DEFAULT_LAYERS };
