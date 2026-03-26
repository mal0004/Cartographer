/**
 * Cartographer — Interactive Tutorial (8-step)
 *
 * Action-validated steps with spotlight overlay.
 * Persists progress in localStorage. Never overlaps with empty-state.
 */

import { t } from '../i18n.js';

const STORAGE_DONE = 'tutorialCompleted';
const STORAGE_STEP = 'tutorialStep';
const TOTAL_STEPS = 8;

const STEPS = [
  { key: 'step1', target: '#main-canvas', pos: 'bottom',
    validate: (app) => app._tutorialPanned || app._tutorialZoomed },
  { key: 'step2', target: '[data-tool="brush"]', pos: 'right',
    validate: (app) => app.canvasEngine && app.canvasEngine.tool === 'brush' },
  { key: 'step3', target: '#main-canvas', pos: 'bottom',
    validate: (app) => app.entities && app.entities.some(e => e.type === 'territory') },
  { key: 'step4', target: '#tool-options', pos: 'bottom',
    validate: (app) => {
      if (app._tutorialBiomeChanged) return true;
      const sel = document.getElementById('opt-brush-biome') || document.getElementById('opt-territory-terrain');
      if (sel && sel.value && sel.value !== 'plain' && sel.value !== '') {
        app._tutorialBiomeChanged = true; return true;
      }
      return false;
    }},
  { key: 'step5', target: '[data-tool="city"]', pos: 'right',
    validate: (app) => app.entities && app.entities.some(e => e.type === 'city') },
  { key: 'step6', target: '#main-canvas', pos: 'bottom',
    validate: (app) => app.sidebar && (app.sidebar._isOpen || (typeof app.sidebar.isOpen === 'function' && app.sidebar.isOpen())) },
  { key: 'step7', target: '#timeline-toggle', pos: 'top',
    validate: (app) => app._tutorialTimelineOpened },
  { key: 'step8', target: '#btn-export-svg', pos: 'bottom',
    validate: (app) => app._tutorialExportClicked },
];

export class Tutorial {
  constructor(app) {
    this.app = app;
    this.currentStep = 0;
    this.active = false;
    this._overlay = null;
    this._tooltip = null;
    this._checkInterval = null;
    this._boundCheck = () => this._checkValidation();
  }

  shouldStart() {
    if (localStorage.getItem(STORAGE_DONE) === 'true') return false;
    if (this.app._emptyState && this.app._emptyState.visible) return false;
    return true;
  }

  start(fromStep) {
    if (this.active) return;
    const saved = fromStep ?? parseInt(localStorage.getItem(STORAGE_STEP) || '0', 10);
    this.currentStep = Math.min(saved, TOTAL_STEPS - 1);
    this.active = true;
    this._initTrackers();
    this._createOverlay();
    this._showStep();
    this._checkInterval = setInterval(this._boundCheck, 500);
  }

  _initTrackers() {
    const app = this.app;
    app._tutorialPanned = false;
    app._tutorialZoomed = false;
    app._tutorialBiomeChanged = false;
    app._tutorialTimelineOpened = false;
    app._tutorialExportClicked = false;

    const engine = app.canvasEngine;
    if (engine) {
      const origWheel = engine._onWheel.bind(engine);
      engine._onWheel = function(e) {
        origWheel(e); app._tutorialZoomed = true;
      };
      const origPan = engine._onMouseUp.bind(engine);
      engine._onMouseUp = function(e) {
        if (engine.isPanning) app._tutorialPanned = true;
        origPan(e);
      };
    }
    const timelineBtn = document.getElementById('timeline-toggle');
    if (timelineBtn) timelineBtn.addEventListener('click',
      () => { app._tutorialTimelineOpened = true; }, { once: true });
    const exportBtn = document.getElementById('btn-export-svg');
    if (exportBtn) exportBtn.addEventListener('click',
      () => { app._tutorialExportClicked = true; }, { once: true });
  }

  _createOverlay() {
    this._overlay = document.createElement('div');
    this._overlay.className = 'tutorial-overlay';
    this._tooltip = document.createElement('div');
    this._tooltip.className = 'tutorial-tooltip';
    document.body.appendChild(this._overlay);
    document.body.appendChild(this._tooltip);
  }

  _showStep() {
    if (this.currentStep >= TOTAL_STEPS) { this._complete(); return; }
    const step = STEPS[this.currentStep];
    const targetEl = document.querySelector(step.target);

    this._updateOverlay(targetEl);
    const stepKey = `editor.tutorial.${step.key}`;
    this._tooltip.innerHTML = `
      <span class="tutorial-step-num">${this.currentStep + 1} / ${TOTAL_STEPS}</span>
      <p data-i18n="${stepKey}">${t(stepKey)}</p>
      <div class="tutorial-dots">${this._renderDots()}</div>
      <button class="tutorial-skip" data-i18n="editor.tutorial.skip">${t('editor.tutorial.skip')}</button>`;
    this._tooltip.querySelector('.tutorial-skip').addEventListener('click', () => this.skip());
    this._positionTooltip(targetEl, step.pos);
    this._tooltip.style.opacity = '0';
    requestAnimationFrame(() => { this._tooltip.style.opacity = '1'; });
    localStorage.setItem(STORAGE_STEP, String(this.currentStep));
  }

  _updateOverlay(targetEl) {
    if (!targetEl) {
      this._overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;' +
        'background:rgba(0,0,0,0.6);pointer-events:auto;transition:opacity 0.2s;';
      return;
    }
    const r = targetEl.getBoundingClientRect();
    const pad = 8;
    this._overlay.style.cssText = `position:fixed;inset:0;z-index:9998;pointer-events:auto;
      transition:opacity 0.2s;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.6);
      clip-path: polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%,
        0% ${r.top - pad}px,
        ${r.left - pad}px ${r.top - pad}px,
        ${r.left - pad}px ${r.bottom + pad}px,
        ${r.right + pad}px ${r.bottom + pad}px,
        ${r.right + pad}px ${r.top - pad}px,
        0% ${r.top - pad}px
      );`;
  }

  _positionTooltip(targetEl, pos) {
    const tt = this._tooltip;
    tt.style.position = 'fixed';
    tt.style.zIndex = '9999';
    if (!targetEl) {
      tt.style.top = '50%'; tt.style.left = '50%';
      tt.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const r = targetEl.getBoundingClientRect();
    tt.style.transform = '';
    if (pos === 'bottom') {
      tt.style.top = (r.bottom + 16) + 'px';
      tt.style.left = Math.max(16, Math.min(r.left, window.innerWidth - 320)) + 'px';
    } else if (pos === 'top') {
      tt.style.top = (r.top - 16) + 'px';
      tt.style.left = Math.max(16, r.left) + 'px';
      tt.style.transform = 'translateY(-100%)';
    } else if (pos === 'right') {
      tt.style.top = r.top + 'px';
      tt.style.left = (r.right + 16) + 'px';
    } else {
      tt.style.top = r.top + 'px';
      tt.style.left = (r.left - 320) + 'px';
    }
  }

  _renderDots() {
    let html = '';
    for (let i = 0; i < TOTAL_STEPS; i++) {
      const cls = i === this.currentStep ? 'tutorial-dot active' : 'tutorial-dot';
      html += `<span class="${cls}"></span>`;
    }
    return html;
  }

  _checkValidation() {
    if (!this.active || this.currentStep >= TOTAL_STEPS) return;
    const step = STEPS[this.currentStep];
    if (step.validate(this.app)) {
      this.currentStep++;
      this._tooltip.style.opacity = '0';
      setTimeout(() => this._showStep(), 200);
    }
  }

  _complete() {
    this.active = false;
    if (this._checkInterval) { clearInterval(this._checkInterval); this._checkInterval = null; }
    localStorage.setItem(STORAGE_DONE, 'true');
    localStorage.removeItem(STORAGE_STEP);
    this._tooltip.innerHTML = `
      <p data-i18n="editor.tutorial.complete">${t('editor.tutorial.complete')}</p>
      <button class="tutorial-finish" data-i18n="editor.tutorial.start">${t('editor.tutorial.start')}</button>`;
    this._tooltip.querySelector('.tutorial-finish').addEventListener('click', () => this.destroy());
    this._tooltip.style.position = 'fixed';
    this._tooltip.style.top = '50%'; this._tooltip.style.left = '50%';
    this._tooltip.style.transform = 'translate(-50%, -50%)';
  }

  skip() {
    this.active = false;
    if (this._checkInterval) { clearInterval(this._checkInterval); this._checkInterval = null; }
    localStorage.setItem(STORAGE_DONE, 'true');
    localStorage.removeItem(STORAGE_STEP);
    this.destroy();
  }

  destroy() {
    if (this._overlay) { this._overlay.remove(); this._overlay = null; }
    if (this._tooltip) { this._tooltip.remove(); this._tooltip = null; }
    if (this._checkInterval) { clearInterval(this._checkInterval); this._checkInterval = null; }
  }

  static reset() {
    localStorage.removeItem(STORAGE_DONE);
    localStorage.removeItem(STORAGE_STEP);
  }
}
