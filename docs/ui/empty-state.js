/**
 * Cartographer — Empty State Overlay
 *
 * Shows when canvas has 0 territories. Offers generate or draw options.
 * Fades out on first action, reappears if all territories deleted.
 */

import { t } from '../i18n.js';

const COMPASS_SVG = `<svg viewBox="0 0 100 100" width="80" height="80" class="empty-state-compass">
  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
  <polygon points="50,10 54,45 50,40 46,45" fill="currentColor" opacity="0.6"/>
  <polygon points="50,90 54,55 50,60 46,55" fill="currentColor" opacity="0.3"/>
  <polygon points="10,50 45,46 40,50 45,54" fill="currentColor" opacity="0.3"/>
  <polygon points="90,50 55,46 60,50 55,54" fill="currentColor" opacity="0.3"/>
  <circle cx="50" cy="50" r="3" fill="currentColor" opacity="0.5"/>
</svg>`;

export class EmptyState {
  constructor(container, options = {}) {
    this.container = container;
    this.onGenerate = options.onGenerate || null;
    this.onStartDrawing = options.onStartDrawing || null;
    this.el = null;
    this.visible = false;
    this._build();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.id = 'canvas-empty-state';
    this.el.innerHTML = `
      ${COMPASS_SVG}
      <h2 data-i18n="editor.emptyState.title">${t('editor.emptyState.title')}</h2>
      <p data-i18n="editor.emptyState.subtitle">${t('editor.emptyState.subtitle')}</p>
      <div class="empty-state-actions">
        <button id="btn-generate-world" class="btn-primary"
          data-i18n="editor.emptyState.generate">${t('editor.emptyState.generate')}</button>
        <button id="btn-start-drawing" class="btn-secondary"
          data-i18n="editor.emptyState.startDrawing">${t('editor.emptyState.startDrawing')}</button>
      </div>`;
    this.el.style.cssText =
      'position:absolute;inset:0;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;z-index:50;' +
      'background:rgba(0,0,0,0.3);color:var(--color-text,#C4A882);' +
      'transition:opacity 0.3s ease;pointer-events:auto;';
    this.container.style.position = 'relative';
    this.container.appendChild(this.el);

    this.el.querySelector('#btn-generate-world').addEventListener('click', () => {
      if (this.onGenerate) this.onGenerate();
    });
    this.el.querySelector('#btn-start-drawing').addEventListener('click', () => {
      if (this.onStartDrawing) this.onStartDrawing();
    });
  }

  show() {
    if (this.visible) return;
    this.visible = true;
    this.el.style.display = 'flex';
    this.el.style.opacity = '0';
    requestAnimationFrame(() => { this.el.style.opacity = '1'; });
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.el.style.opacity = '0';
    setTimeout(() => {
      if (!this.visible) this.el.style.display = 'none';
    }, 300);
  }

  check(entities) {
    const hasTerritories = entities && entities.some(e => e.type === 'territory');
    if (hasTerritories) this.hide();
    else this.show();
  }
}
