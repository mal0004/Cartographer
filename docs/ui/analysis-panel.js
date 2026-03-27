/**
 * Cartographer — Analysis Panel
 *
 * Retractable right panel showing coherence analysis results.
 * Filters by category, locate on map, animated score.
 */

import { t } from '../i18n.js';
import { CoherenceEngine } from '../analysis/coherence.js';

const GRADE_COLORS = { A: '#4A9A5A', B: '#8B8B2E', C: '#C4742A', D: '#8B2635' };
const SEVERITY_COLORS = { HIGH: '#8B2635', MEDIUM: '#C4742A', LOW: '#8B8B2E', SUGGESTION: '#5A7A9A' };
const CATEGORIES = ['all', 'rivers', 'biomes', 'entities', 'climatic', 'political'];

export class AnalysisPanel {
  constructor(app) {
    this.app = app;
    this.result = null;
    this.filter = 'all';
    this.ignored = this._loadIgnored();
    this.el = null;
    this.open = false;
    this._build();
  }

  _build() {
    this.el = document.createElement('div');
    this.el.className = 'analysis-panel';
    this.el.innerHTML = `
      <div class="analysis-header">
        <h3 data-i18n="analysis.panel.title">${t('analysis.panel.title')}</h3>
        <button class="analysis-close btn-icon">&times;</button>
      </div>
      <div class="analysis-score-row">
        <span class="analysis-score-num">—</span>
        <span class="analysis-grade">—</span>
        <button class="analysis-rerun btn-icon" title="${t('analysis.panel.rerun')}">&#8635;</button>
      </div>
      <div class="analysis-filters"></div>
      <div class="analysis-list"></div>`;
    document.body.appendChild(this.el);
    this.el.querySelector('.analysis-close').addEventListener('click', () => this.hide());
    this.el.querySelector('.analysis-rerun').addEventListener('click', () => this.run());
  }

  toggle() { this.open ? this.hide() : this.show(); }

  show() {
    this.open = true;
    this.el.classList.add('open');
    if (!this.result) this.run();
  }

  hide() {
    this.open = false;
    this.el.classList.remove('open');
  }

  run() {
    const engine = new CoherenceEngine(
      this.app.entities,
      this.app.canvasEngine ? this.app.canvasEngine.width : 1200,
      this.app.canvasEngine ? this.app.canvasEngine.height : 800,
    );
    this.result = engine.analyze();
    this._render();
    return this.result;
  }

  getScore() { return this.result ? this.result.score : null; }
  getGrade() { return this.result ? this.result.grade : null; }

  _render() {
    if (!this.result) return;
    const { score, grade, issues, suggestions } = this.result;
    // Animated score
    const numEl = this.el.querySelector('.analysis-score-num');
    this._animateScore(numEl, score);
    const gradeEl = this.el.querySelector('.analysis-grade');
    gradeEl.textContent = grade;
    gradeEl.style.color = GRADE_COLORS[grade] || '#888';
    // Filters
    const all = [...issues, ...suggestions];
    this._renderFilters(all);
    this._renderList(all);
  }

  _animateScore(el, target) {
    let current = 0;
    const step = () => {
      current += Math.ceil((target - current) / 8);
      if (current >= target) { el.textContent = target; return; }
      el.textContent = current;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _renderFilters(all) {
    const box = this.el.querySelector('.analysis-filters');
    box.innerHTML = '';
    for (const cat of CATEGORIES) {
      const count = cat === 'all' ? all.length
        : all.filter(i => i.category === cat).length;
      const btn = document.createElement('button');
      btn.className = 'analysis-filter-btn' + (this.filter === cat ? ' active' : '');
      btn.textContent = `${t('analysis.categories.' + cat)} (${count})`;
      btn.addEventListener('click', () => { this.filter = cat; this._render(); });
      box.appendChild(btn);
    }
  }

  _renderList(all) {
    const box = this.el.querySelector('.analysis-list');
    box.innerHTML = '';
    const filtered = this.filter === 'all' ? all
      : all.filter(i => i.category === this.filter);
    const visible = filtered.filter(i => !this.ignored[i.id]);
    if (visible.length === 0) {
      box.innerHTML = `<div class="analysis-empty">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#8B2635" stroke-width="1.5">
          <path d="M20 6L9 17l-5-5"/></svg>
        <p data-i18n="analysis.panel.allGood">${t('analysis.panel.allGood')}</p></div>`;
      return;
    }
    visible.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'analysis-card';
      card.style.animationDelay = (idx * 0.05) + 's';
      const sev = item.severity || 'SUGGESTION';
      card.innerHTML = `
        <span class="analysis-dot" style="background:${SEVERITY_COLORS[sev]}"></span>
        <div class="analysis-card-body">
          <p class="analysis-msg">${item.message}</p>
          ${item.fix ? `<p class="analysis-fix">${item.fix}</p>` : ''}
          <div class="analysis-card-actions">
            ${(item.entityId || item.territoryId) ? `<button class="analysis-locate btn-sm">${t('analysis.panel.locate')}</button>` : ''}
            <button class="analysis-ignore btn-sm">${t('analysis.panel.ignore')}</button>
          </div>
        </div>`;
      const locateBtn = card.querySelector('.analysis-locate');
      if (locateBtn) {
        locateBtn.addEventListener('click', () => this._locate(item));
      }
      card.querySelector('.analysis-ignore').addEventListener('click', () => {
        this.ignored[item.id] = true;
        this._saveIgnored();
        this._render();
      });
      box.appendChild(card);
    });
  }

  _locate(item) {
    const id = item.entityId || item.territoryId;
    if (!id || !this.app.canvasEngine) return;
    const entity = this.app.entities.find(e => e.id === id);
    if (!entity) return;
    const d = entity.data;
    let x, y;
    if (d.x !== undefined) { x = d.x; y = d.y; }
    else if (d.points && d.points.length) {
      x = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
      y = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;
    }
    if (x !== undefined) {
      this.app.canvasEngine.centerOn(x, y);
      this.app.canvasEngine.selectEntity(entity);
    }
  }

  _loadIgnored() {
    const wid = this.app.currentWorld ? this.app.currentWorld.id : '';
    try { return JSON.parse(localStorage.getItem(`analysis_ignored_${wid}`)) || {}; }
    catch { return {}; }
  }

  _saveIgnored() {
    const wid = this.app.currentWorld ? this.app.currentWorld.id : '';
    localStorage.setItem(`analysis_ignored_${wid}`, JSON.stringify(this.ignored));
  }
}
