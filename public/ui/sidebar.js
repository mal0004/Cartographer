/**
 * Cartographer — Sidebar Panel
 *
 * Renders entity details, markdown editor with preview,
 * relations tab, and events tab.
 */

import { t } from '../i18n.js';

class Sidebar {
  constructor() {
    this.el = document.getElementById('sidebar');
    this.titleEl = document.getElementById('sidebar-title');
    this.contentEl = document.getElementById('sidebar-content');
    this.closeBtn = document.getElementById('sidebar-close');
    this.entity = null;
    this.activeTab = 'details';

    this.closeBtn.addEventListener('click', () => this.close());

    // Callbacks
    this.onEntityUpdated = null;
    this.onEntityDeleted = null;
    this.onNavigateTo = null;
  }

  open(entity, allEntities, events) {
    this.entity = entity;
    this.allEntities = allEntities || [];
    this.events = events || [];
    this.el.hidden = false;
    // Trigger reflow before adding class so transition plays
    void this.el.offsetWidth;
    this.el.classList.add('open');
    this.activeTab = 'details';
    this._render();
  }

  close() {
    this.el.classList.remove('open');
    const onEnd = () => {
      this.el.hidden = true;
      this.el.removeEventListener('transitionend', onEnd);
    };
    this.el.addEventListener('transitionend', onEnd);
    // Fallback in case transitionend doesn't fire
    setTimeout(() => { this.el.hidden = true; }, 350);
    this.entity = null;
  }

  isOpen() {
    return !this.el.hidden;
  }

  _render() {
    if (!this.entity) return;
    const e = this.entity;
    this.titleEl.textContent = e.name || `${e.type} #${e.id}`;

    // Show Terrain tab for territory/region entities
    const showTerrainTab = (e.type === 'territory' || e.type === 'region');
    const tabs = `
      <div class="sidebar-tabs">
        <button class="sidebar-tab ${this.activeTab === 'details' ? 'active' : ''}" data-tab="details">${t('editor.sidebar.details')}</button>
        ${showTerrainTab ? `<button class="sidebar-tab ${this.activeTab === 'terrain' ? 'active' : ''}" data-tab="terrain">${t('editor.sidebar.terrain')}</button>` : ''}
        <button class="sidebar-tab ${this.activeTab === 'relations' ? 'active' : ''}" data-tab="relations">${t('editor.sidebar.relations')}</button>
        <button class="sidebar-tab ${this.activeTab === 'events' ? 'active' : ''}" data-tab="events">${t('editor.sidebar.events')}</button>
      </div>`;

    let body = '';
    if (this.activeTab === 'details') body = this._renderDetails(e);
    else if (this.activeTab === 'terrain' && showTerrainTab) body = this._renderTerrainPanel(e);
    else if (this.activeTab === 'relations') body = this._renderRelations(e);
    else if (this.activeTab === 'events') body = this._renderEvents(e);

    this.contentEl.innerHTML = tabs + body;

    // Tab listeners
    this.contentEl.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        this._render();
      });
    });

    this._bindFields();
  }

  // ─── Details tab ────────────────────────────────────────────

  _renderDetails(e) {
    const d = e.data;
    let html = '';

    // Common: name
    html += this._field('name', 'Name', 'text', e.name);

    switch (e.type) {
      case 'city':
        html += this._selectField('importance', 'Type', [
          ['village', 'Village'], ['city', 'City'], ['capital', 'Capital']
        ], d.importance || 'village');
        html += this._field('population', 'Population', 'number', d.population || '');
        html += this._field('founded', 'Founded (year)', 'text', d.founded || '');
        html += this._markdownField('description', 'Description', d.description || '');
        break;

      case 'territory':
        html += this._selectField('terrainType', 'Terrain', [
          ['', 'None (flat)'], ['plain', 'Plains'], ['hills', 'Hills'], ['mountain', 'Mountains'],
          ['desert', 'Desert'], ['marsh', 'Marsh'], ['ocean', 'Ocean / Lake']
        ], d.terrainType || '');
        html += this._selectField('coastStyle', 'Coast Style', [
          ['smooth', 'Smooth'], ['rugged', 'Rugged'], ['fjords', 'Fjords']
        ], d.coastStyle || 'smooth');
        html += this._rangeField('vegetationDensity', 'Vegetation Density', d.vegetationDensity ?? 50, 0, 100);
        html += this._field('ruler', 'Ruler', 'text', d.ruler || '');
        html += this._field('capitalName', 'Capital', 'text', d.capitalName || '');
        html += this._field('resources', 'Resources (comma-separated)', 'text', (d.resources || []).join(', '));
        html += this._colorField('color', 'Color', d.color || '#8B2635');
        html += this._markdownField('description', 'Description', d.description || '');
        break;

      case 'route':
        html += this._selectField('style', 'Style', [
          ['trail', 'Trail'], ['road', 'Road'], ['royal', 'Royal Road']
        ], d.style || 'road');
        html += this._field('length', 'Estimated Length', 'text', d.length || '');
        html += this._markdownField('description', 'Description', d.description || '');
        break;

      case 'region':
        html += this._selectField('terrain', 'Terrain', [
          ['forest', 'Forest'], ['mountain', 'Mountain'], ['desert', 'Desert'], ['ocean', 'Ocean']
        ], d.terrain || 'forest');
        html += this._markdownField('description', 'Description', d.description || '');
        break;

      case 'river':
        html += this._colorField('color', 'Color', d.color || '#6B8FA8');
        html += this._field('widthScale', 'Width Scale', 'number', d.widthScale || 1.0);
        html += this._markdownField('description', 'Description', d.description || '');
        break;

      case 'text':
        html += this._field('fontSize', 'Font Size', 'number', d.fontSize || 16);
        html += this._selectField('fontStyle', 'Font Style', [
          ['normal', 'Normal'], ['italic', 'Italic']
        ], d.fontStyle || 'normal');
        html += this._colorField('color', 'Color', d.color || '#2C1810');
        break;

      case 'symbol':
        html += this._field('size', 'Size', 'number', d.size || 32);
        html += this._field('rotation', 'Rotation (°)', 'number', d.rotation || 0);
        html += this._colorField('color', 'Color', d.color || '#2C1810');
        break;
    }

    // Delete button
    html += `<div class="sidebar-delete"><button class="btn btn-danger btn-sm" id="btn-delete-entity">${t('common.delete')}</button></div>`;

    return html;
  }

  _field(key, label, type, value) {
    return `<div class="sidebar-field">
      <label>${label}</label>
      <input type="${type}" data-key="${key}" value="${this._escapeAttr(String(value || ''))}" />
    </div>`;
  }

  _selectField(key, label, options, current) {
    const opts = options.map(([val, lbl]) =>
      `<option value="${val}" ${val === current ? 'selected' : ''}>${lbl}</option>`
    ).join('');
    return `<div class="sidebar-field">
      <label>${label}</label>
      <select data-key="${key}">${opts}</select>
    </div>`;
  }

  _rangeField(key, label, value, min, max) {
    return `<div class="sidebar-field">
      <label>${label} <span class="range-value">${value}</span></label>
      <input type="range" data-key="${key}" value="${value}" min="${min}" max="${max}" />
    </div>`;
  }

  _colorField(key, label, value) {
    return `<div class="sidebar-field">
      <label>${label}</label>
      <input type="color" data-key="${key}" value="${value}" />
    </div>`;
  }

  _markdownField(key, label, value) {
    return `<div class="sidebar-field">
      <label>${label}</label>
      <div class="md-toolbar">
        <button data-md="bold" title="Bold"><b>B</b></button>
        <button data-md="italic" title="Italic"><i>I</i></button>
        <button data-md="h1" title="Heading 1">H1</button>
        <button data-md="h2" title="Heading 2">H2</button>
      </div>
      <textarea data-key="${key}" data-markdown="true" rows="5">${this._escapeHtml(value)}</textarea>
      <div class="md-preview" id="md-preview-${key}"></div>
    </div>`;
  }

  _escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  _escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Terrain control panel ──────────────────────────────────

  _renderTerrainPanel(e) {
    const d = e.data;
    const terrainType = d.terrainType || d.terrain || '';
    const seed = d.terrainSeed ?? (e.id * 7919);
    const intensity = d.terrainIntensity ?? 50;
    const coastStyle = d.coastStyle || 'smooth';
    const vegDensity = d.vegetationDensity ?? 50;
    const terrainColor = d.terrainColor || '';

    let html = '<div class="terrain-panel">';

    // Preview canvas
    html += `<div class="terrain-preview-wrap">
      <canvas id="terrain-preview" width="200" height="150"></canvas>
      <div class="terrain-preview-label">${t('editor.sidebar.preview')}</div>
    </div>`;

    // Terrain type
    html += this._selectField('terrainType', 'Terrain Type', [
      ['', 'None (flat)'], ['plain', 'Plains'], ['hills', 'Hills'], ['mountain', 'Mountains'],
      ['desert', 'Desert'], ['marsh', 'Marsh'], ['ocean', 'Ocean / Lake']
    ], terrainType);

    // Seed + regenerate button
    html += `<div class="sidebar-field terrain-seed-row">
      <label>${t('editor.sidebar.seed')}</label>
      <div class="seed-controls">
        <input type="number" data-key="terrainSeed" value="${seed}" />
        <button id="btn-regen-seed" class="btn btn-sm" title="${t('editor.sidebar.randomSeed')}">&#x21BB;</button>
      </div>
    </div>`;

    // Intensity
    html += this._rangeField('terrainIntensity', t('editor.sidebar.reliefIntensity'), intensity, 0, 100);

    // Coast roughness (maps to coastStyle internally but as a slider)
    const coastRoughness = coastStyle === 'fjords' ? 100 : coastStyle === 'rugged' ? 60 : 20;
    html += this._rangeField('coastRoughness', t('editor.sidebar.coastRoughness'), coastRoughness, 0, 100);

    // Vegetation density
    html += this._rangeField('vegetationDensity', t('editor.sidebar.vegetationDensity'), vegDensity, 0, 100);

    // Base color override
    html += this._colorField('terrainColor', t('editor.sidebar.baseColorOverride'), terrainColor || '#C8D8A0');

    // Reset color button
    html += `<div class="sidebar-field">
      <button id="btn-reset-terrain-color" class="btn btn-sm btn-secondary">${t('editor.sidebar.resetColor')}</button>
    </div>`;

    html += '</div>';
    return html;
  }

  // ─── Relations tab ──────────────────────────────────────────

  _renderRelations(e) {
    const desc = e.data.description || '';
    const related = [];

    for (const other of this.allEntities) {
      if (other.id === e.id) continue;
      if (other.name && desc.includes(other.name)) {
        related.push(other);
      }
    }

    if (related.length === 0) {
      return `<p style="color:var(--ink-light);font-size:13px;">${t('editor.sidebar.noRelations')}</p>`;
    }

    return related.map(r => `
      <a class="relation-link" data-entity-id="${r.id}">
        <strong>${this._escapeHtml(r.name)}</strong>
        <span style="color:var(--ink-light);font-size:12px;margin-left:8px;">${r.type}</span>
      </a>
    `).join('');
  }

  // ─── Events tab ─────────────────────────────────────────────

  _renderEvents(e) {
    const linked = this.events.filter(ev =>
      ev.entity_ids && ev.entity_ids.includes(e.id)
    );

    if (linked.length === 0) {
      return `<p style="color:var(--ink-light);font-size:13px;">${t('editor.sidebar.noEvents')}</p>`;
    }

    return linked.map(ev => `
      <div style="margin-bottom:10px;padding:8px;border:1px solid var(--border);border-radius:4px;">
        <strong>${this._escapeHtml(ev.title)}</strong>
        <span class="tag">${ev.category}</span>
        <div style="font-size:12px;color:var(--ink-light);margin-top:4px;">Year ${ev.date}</div>
        <div style="font-size:13px;margin-top:4px;">${this._escapeHtml(ev.description || '')}</div>
      </div>
    `).join('');
  }

  // ─── Field binding ──────────────────────────────────────────

  _bindFields() {
    // Input/select change handlers
    this.contentEl.querySelectorAll('[data-key]').forEach(input => {
      const handler = (e) => this._onFieldChange(input.dataset.key, input);
      input.addEventListener('change', handler);
      if (input.tagName === 'TEXTAREA' || input.type === 'text' || input.type === 'number') {
        input.addEventListener('input', handler);
      }
      if (input.type === 'range') {
        input.addEventListener('input', (e) => {
          const valSpan = input.closest('.sidebar-field').querySelector('.range-value');
          if (valSpan) valSpan.textContent = input.value;
          handler(e);
        });
      }
    });

    // Markdown toolbar buttons
    this.contentEl.querySelectorAll('[data-md]').forEach(btn => {
      btn.addEventListener('click', () => {
        const textarea = btn.closest('.sidebar-field').querySelector('textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        let replacement = selected;
        switch (btn.dataset.md) {
          case 'bold': replacement = `**${selected || 'bold'}**`; break;
          case 'italic': replacement = `*${selected || 'italic'}*`; break;
          case 'h1': replacement = `\n# ${selected || 'Heading'}\n`; break;
          case 'h2': replacement = `\n## ${selected || 'Heading'}\n`; break;
        }
        textarea.value = text.substring(0, start) + replacement + text.substring(end);
        textarea.dispatchEvent(new Event('input'));
        textarea.focus();
      });
    });

    // Markdown previews
    this.contentEl.querySelectorAll('[data-markdown="true"]').forEach(ta => {
      this._updateMarkdownPreview(ta);
    });

    // Relation links
    this.contentEl.querySelectorAll('.relation-link').forEach(link => {
      link.addEventListener('click', () => {
        const id = Number(link.dataset.entityId);
        if (this.onNavigateTo) this.onNavigateTo(id);
      });
    });

    // Delete button
    const delBtn = this.contentEl.querySelector('#btn-delete-entity');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        if (this.entity && this.onEntityDeleted) {
          this.onEntityDeleted(this.entity);
          this.close();
        }
      });
    }

    // ─── Terrain panel bindings ────────────────────────────────
    const regenBtn = this.contentEl.querySelector('#btn-regen-seed');
    if (regenBtn) {
      regenBtn.addEventListener('click', () => {
        const newSeed = Math.floor(Math.random() * 100000);
        const seedInput = this.contentEl.querySelector('[data-key="terrainSeed"]');
        if (seedInput) {
          seedInput.value = newSeed;
          this._onFieldChange('terrainSeed', seedInput);
        }
      });
    }

    const resetColorBtn = this.contentEl.querySelector('#btn-reset-terrain-color');
    if (resetColorBtn) {
      resetColorBtn.addEventListener('click', () => {
        this.entity.data.terrainColor = '';
        this._invalidateAllTerrain();
        if (this.onEntityUpdated) this.onEntityUpdated(this.entity);
        this._render();
      });
    }

    // Render terrain preview if the tab is active
    if (this.activeTab === 'terrain') {
      this._renderTerrainPreview();
    }
  }

  /**
   * Render a miniature terrain preview in the sidebar canvas.
   */
  _renderTerrainPreview() {
    const canvas = this.contentEl.querySelector('#terrain-preview');
    if (!canvas || !this.entity) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const d = this.entity.data;
    const terrainType = d.terrainType || d.terrain || '';

    // Clear
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#F5F0E8';
    ctx.fillRect(0, 0, w, h);

    if (!terrainType) {
      ctx.fillStyle = '#999';
      ctx.font = '12px "Source Serif 4", serif';
      ctx.textAlign = 'center';
      ctx.fillText('Select a terrain type', w / 2, h / 2);
      ctx.textAlign = 'start';
      return;
    }

    // Try to get the cached terrain canvas from the renderer
    const engine = window.app && window.app.canvasEngine;
    if (!engine || !engine.terrainRenderer) return;

    const cached = engine.terrainRenderer._cache.get(this.entity.id);
    if (cached && cached.canvas) {
      // Draw the terrain canvas scaled to preview size
      ctx.drawImage(cached.canvas, 0, 0, w, h);

      // Overlay vegetation preview if available
      if (engine.vegetationRenderer && terrainType !== 'ocean') {
        const vegCached = engine.vegetationRenderer._cache.get(this.entity.id);
        if (vegCached && vegCached.canvas) {
          ctx.drawImage(vegCached.canvas, 0, 0, w, h);
        }
      }

      // Draw terrain type label
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, h - 22, w, 22);
      ctx.fillStyle = '#fff';
      ctx.font = '11px "Source Serif 4", serif';
      ctx.textAlign = 'center';
      const label = terrainType.charAt(0).toUpperCase() + terrainType.slice(1);
      const intensity = d.terrainIntensity ?? 50;
      ctx.fillText(`${label} — Intensity: ${intensity}%`, w / 2, h - 7);
      ctx.textAlign = 'start';
    } else {
      // Terrain not yet generated — show placeholder
      ctx.fillStyle = '#ccc';
      ctx.font = '12px "Source Serif 4", serif';
      ctx.textAlign = 'center';
      ctx.fillText('Generating terrain...', w / 2, h / 2);
      ctx.textAlign = 'start';

      // Schedule a preview re-render after terrain generates
      setTimeout(() => this._renderTerrainPreview(), 500);
    }
  }

  /**
   * Invalidate all terrain-related caches for the current entity.
   */
  _invalidateAllTerrain() {
    const engine = window.app && window.app.canvasEngine;
    if (!engine) return;
    const id = this.entity.id;
    if (engine.terrainRenderer) engine.terrainRenderer.invalidate(id);
    if (engine.hillShading) engine.hillShading.invalidate();
    if (engine.coastlines) engine.coastlines.invalidate(id);
    if (engine.vegetationRenderer) engine.vegetationRenderer.invalidate(id);
    if (engine.perf) { engine.perf.clearTileCache(); engine.perf.markDirty(id); }
    engine.render();
  }

  _onFieldChange(key, input) {
    if (!this.entity) return;

    const value = input.value;

    if (key === 'name') {
      this.entity.name = value;
      this.titleEl.textContent = value || `${this.entity.type} #${this.entity.id}`;
    } else if (key === 'resources') {
      this.entity.data.resources = value.split(',').map(s => s.trim()).filter(Boolean);
    } else if (key === 'population') {
      this.entity.data[key] = Number(value) || 0;
    } else if (key === 'fontSize') {
      this.entity.data[key] = Number(value) || 16;
    } else if (key === 'terrainIntensity' || key === 'terrainSeed') {
      this.entity.data[key] = Number(value) || 0;
    } else if (key === 'coastRoughness') {
      // Map roughness slider (0-100) to coastStyle enum
      const roughness = Number(value);
      this.entity.data.coastStyle = roughness > 80 ? 'fjords' : roughness > 40 ? 'rugged' : 'smooth';
      this.entity.data.coastRoughness = roughness;
    } else {
      this.entity.data[key] = value;
    }

    // Invalidate terrain cache when terrain properties change
    if (key === 'terrainType' || key === 'terrain' || key === 'terrainSeed' || key === 'terrainIntensity' || key === 'terrainColor') {
      this._invalidateAllTerrain();
      // Update preview
      setTimeout(() => this._renderTerrainPreview(), 100);
    }
    // Invalidate coastline cache when coast style/roughness changes
    if (key === 'coastStyle' || key === 'coastRoughness') {
      if (window.app && window.app.canvasEngine && window.app.canvasEngine.coastlines) {
        window.app.canvasEngine.coastlines.invalidate(this.entity.id);
      }
    }
    // Invalidate river cache when river properties change
    if (key === 'widthScale' || key === 'color') {
      if (this.entity.type === 'river' && window.app && window.app.canvasEngine && window.app.canvasEngine.riverEngine) {
        window.app.canvasEngine.riverEngine.invalidate(this.entity.id);
      }
    }
    // Invalidate vegetation cache when density changes
    if (key === 'vegetationDensity') {
      if (window.app && window.app.canvasEngine && window.app.canvasEngine.vegetationRenderer) {
        window.app.canvasEngine.vegetationRenderer.invalidate(this.entity.id);
      }
      setTimeout(() => this._renderTerrainPreview(), 100);
    }

    // Update markdown preview
    if (input.dataset.markdown === 'true') {
      this._updateMarkdownPreview(input);
    }

    if (this.onEntityUpdated) this.onEntityUpdated(this.entity);
  }

  _updateMarkdownPreview(textarea) {
    const previewEl = this.contentEl.querySelector(`#md-preview-${textarea.dataset.key}`);
    if (!previewEl) return;
    previewEl.innerHTML = this._renderMarkdown(textarea.value);
  }

  _renderMarkdown(md) {
    if (!md) return '';
    let html = this._escapeHtml(md);
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    // Bold / Italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Line breaks → paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    return '<p>' + html + '</p>';
  }
}

export { Sidebar };
