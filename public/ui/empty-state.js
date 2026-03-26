/**
 * Cartographer — Empty State Overlay
 *
 * Card-style overlay when canvas has 0 territories.
 * Shows generate/draw buttons + progress bar during generation.
 */

import { t } from '../i18n.js';

const COMPASS_SVG = `<svg viewBox="0 0 100 100" width="48" height="48" class="empty-state-compass">
  <circle cx="50" cy="50" r="45" fill="none" stroke="#8B2635" stroke-width="1.5"/>
  <polygon points="50,10 54,45 50,40 46,45" fill="#8B2635" opacity="0.7"/>
  <polygon points="50,90 54,55 50,60 46,55" fill="#8B2635" opacity="0.3"/>
  <polygon points="10,50 45,46 40,50 45,54" fill="#8B2635" opacity="0.3"/>
  <polygon points="90,50 55,46 60,50 55,54" fill="#8B2635" opacity="0.3"/>
  <circle cx="50" cy="50" r="3" fill="#8B2635" opacity="0.5"/>
</svg>`;

const SPINNER_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" class="empty-state-spinner">
  <circle cx="12" cy="12" r="10" fill="none" stroke="#8B2635" stroke-width="2"
    stroke-dasharray="50" stroke-dashoffset="15" stroke-linecap="round"/>
</svg>`;

export class EmptyState {
  constructor(container, options = {}) {
    this.container = container;
    this.onGenerate = options.onGenerate || null;
    this.onStartDrawing = options.onStartDrawing || null;
    this.el = null;
    this.visible = false;
    this._progressEl = null;
    this._actionsEl = null;
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
        <button id="btn-generate-world" class="es-btn-primary"
          data-i18n="editor.emptyState.generate">${t('editor.emptyState.generate')}</button>
        <button id="btn-start-drawing" class="es-btn-secondary"
          data-i18n="editor.emptyState.startDrawing">${t('editor.emptyState.startDrawing')}</button>
      </div>
      <div class="empty-state-progress" style="display:none">
        ${SPINNER_SVG}
        <span class="es-progress-text" data-i18n="editor.generate.progress.heightmap"></span>
        <div class="es-progress-bar"><div class="es-progress-fill"></div></div>
      </div>`;
    this.container.style.position = 'relative';
    this.container.appendChild(this.el);
    this._actionsEl = this.el.querySelector('.empty-state-actions');
    this._progressEl = this.el.querySelector('.empty-state-progress');

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
    setTimeout(() => { if (!this.visible) this.el.style.display = 'none'; }, 300);
  }

  check(entities) {
    const has = entities && entities.length > 0;
    if (has) this.hide(); else this.show();
  }

  showProgress(fraction, stepKey) {
    this.show();
    this._actionsEl.style.display = 'none';
    this._progressEl.style.display = 'flex';
    const fill = this._progressEl.querySelector('.es-progress-fill');
    fill.style.width = Math.round(fraction * 100) + '%';
    const txt = this._progressEl.querySelector('.es-progress-text');
    const key = `editor.generate.progress.${stepKey}`;
    txt.setAttribute('data-i18n', key);
    txt.textContent = t(key);
  }

  hideProgress() {
    this._actionsEl.style.display = '';
    this._progressEl.style.display = 'none';
  }
}
