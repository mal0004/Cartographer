/**
 * Cartographer — App Orchestrator
 *
 * Thin entry point: imports modules, holds shared state,
 * wires DOM listeners, and boots.
 */

import { renderHeroMap, initLandingAnimations, renderTemplates } from './ui/landing.js';
import { openWorld, showScreen, loadEvents, updateEntity, deleteEntity, navigateToEntity, exportSVG, exportJSON, generateWorld } from './ui/editor.js';
import { showNewWorldModal, hideNewWorldModal, showAddEventModal, showShareModal } from './ui/modals.js';
import { api } from './data/storage.js';
import { loadWorlds, createWorld, importWorld } from './data/worlds.js';
import { Sidebar } from './ui/sidebar.js';
import { Timeline } from './ui/timeline.js';
import { UndoManager } from './undo.js';
import { LayersPanel } from './layers.js';
import { ThemeManager, MAP_THEMES } from './themes.js';
import { ModeToggle } from './mode-toggle.js';
import { Onboarding } from './onboarding.js';
import { initI18n, t } from './i18n.js';

// ─── Shared application state ────────────────────────────

const App = {
  currentWorld: null,
  entities: [],
  events: [],
  canvasEngine: null,
  sidebar: null,
  timeline: null,
  undoManager: null,
  layersPanel: null,
  symbolLibrary: null,
  themeManager: null,
  minimap: null,

  // ─── Convenience wrappers used by child modules ────────

  _api(method, url, body) {
    return api(method, url, body);
  },

  openWorld(worldId) {
    this._pendingWorldId = worldId;
    openWorld(this);
  },

  // ─── Initialization ────────────────────────────────────

  init() {
    // i18n — must run before any UI renders
    initI18n();

    // Subsystems
    this.sidebar = new Sidebar();
    this.timeline = new Timeline();
    this.undoManager = new UndoManager();
    this.layersPanel = new LayersPanel();
    this.themeManager = new ThemeManager();

    // Undo / Redo buttons + keyboard
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    btnUndo.addEventListener('click', () => this.undoManager.undo());
    btnRedo.addEventListener('click', () => this.undoManager.redo());
    this.undoManager.onChange = () => {
      btnUndo.disabled = !this.undoManager.canUndo();
      btnRedo.disabled = !this.undoManager.canRedo();
      btnUndo.title = this.undoManager.canUndo()
        ? t('editor.toolbar.undoCount').replace('{n}', this.undoManager.undoCount()).replace('{s}', this.undoManager.undoCount() > 1 ? 's' : '')
        : t('editor.toolbar.nothingToUndo');
      btnRedo.title = this.undoManager.canRedo()
        ? t('editor.toolbar.redoCount').replace('{n}', this.undoManager.redoCount()).replace('{s}', this.undoManager.redoCount() > 1 ? 's' : '')
        : t('editor.toolbar.nothingToRedo');
    };
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); this.undoManager.undo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); this.undoManager.redo(); }
    });

    // Home screen
    document.getElementById('btn-new-world').addEventListener('click', () => showNewWorldModal());
    document.getElementById('modal-cancel').addEventListener('click', () => hideNewWorldModal());
    document.getElementById('modal-create').addEventListener('click', () => createWorld(this));
    document.getElementById('import-file').addEventListener('change', (e) => importWorld(this, e));

    // Editor toolbar
    document.getElementById('btn-back').addEventListener('click', () => {
      this.currentWorld = null;
      this.sidebar.close();
      showScreen('home-screen');
      loadWorlds(this);
    });
    document.getElementById('btn-share').addEventListener('click', () => {
      if (this.currentWorld) showShareModal(this.currentWorld);
    });
    document.getElementById('btn-export-svg').addEventListener('click', () => exportSVG(this));
    document.getElementById('btn-export-json').addEventListener('click', () => exportJSON(this));

    // Mode toggle
    this._modeToggle = new ModeToggle();

    // Golden Hour
    document.getElementById('btn-golden-hour').addEventListener('click', () => {
      if (this.canvasEngine && this.canvasEngine.atmosphere) {
        const atm = this.canvasEngine.atmosphere;
        atm.goldenHour = !atm.goldenHour;
        document.getElementById('btn-golden-hour').classList.toggle('active', atm.goldenHour);
        this.canvasEngine.render();
      }
    });

    // Help (re-launch tutorial)
    document.getElementById('btn-help').addEventListener('click', () => {
      if (this.currentWorld) {
        if (this._tutorial) {
          this._tutorial.constructor.reset();
          this._tutorial.destroy();
          this._tutorial.start(0);
        } else {
          if (!this._onboarding) this._onboarding = new Onboarding();
          this._onboarding.start(this.currentWorld.id);
        }
      }
    });

    // Theme switcher
    document.getElementById('btn-toggle-theme').addEventListener('click', () => {
      document.getElementById('theme-dropdown').hidden = !document.getElementById('theme-dropdown').hidden;
    });
    this._buildThemeDropdown();

    // Toolbar tools
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => { if (this.canvasEngine) this.canvasEngine.setTool(btn.dataset.tool); });
    });
    document.getElementById('tool-color').addEventListener('input', (e) => {
      if (this.canvasEngine) {
        this.canvasEngine.toolColor = e.target.value;
        if (this.canvasEngine.brush) this.canvasEngine.brush.setColor(e.target.value);
      }
    });

    // Generate button
    document.getElementById('btn-generate').addEventListener('click', () => generateWorld(this));

    // Layers panel
    this.layersPanel.onChange = () => { if (this.canvasEngine) this.canvasEngine.render(); };

    // Sidebar callbacks
    this.sidebar.onEntityUpdated = (entity) => updateEntity(this, entity);
    this.sidebar.onEntityDeleted = (entity) => deleteEntity(this, entity);
    this.sidebar.onNavigateTo = (entityId) => navigateToEntity(this, entityId);

    // Timeline callbacks
    this.timeline.onEventClick = (event) => {
      if (event.entity_ids && event.entity_ids.length > 0) navigateToEntity(this, event.entity_ids[0]);
      if (this.timeline.collapsed) this.timeline.toggle();
    };
    this.timeline.onAddEvent = () => {
      showAddEventModal(this.currentWorld, this.entities, () => loadEvents(this));
    };

    // Landing page
    renderHeroMap();
    renderTemplates(this);
    initLandingAnimations();

    // Re-render dynamic sections on language switch
    document.addEventListener('langchange', async () => {
      renderTemplates(this);
      await loadWorlds(this);
      // Cards are recreated with opacity:0 and need .visible to appear.
      // Force-add .visible immediately since they are already in viewport.
      document.querySelectorAll('.world-card, .world-card-new, .lp-tpl-card').forEach(c => {
        c.classList.add('visible');
      });
    });

    // Saved theme
    const savedTheme = localStorage.getItem('cartographer-theme');
    if (savedTheme && MAP_THEMES[savedTheme]) this.themeManager.applyTheme(savedTheme);
    else if (savedTheme === 'night') this.themeManager.applyTheme('nightgold');

    // Load worlds
    loadWorlds(this);
  },

  // ─── Theme dropdown ────────────────────────────────────

  _buildThemeDropdown() {
    const dropdown = document.getElementById('theme-dropdown');
    dropdown.innerHTML = '';
    for (const theme of this.themeManager.getAllThemes()) {
      const item = document.createElement('button');
      item.className = 'theme-option';
      item.dataset.themeId = theme.id;
      item.innerHTML = `
        <span class="theme-swatch" style="background:${theme.vars['--bg']};border-color:${theme.vars['--accent']}">
          <span style="background:${theme.vars['--accent']}"></span>
        </span>
        <span>${theme.name}</span>`;
      item.addEventListener('click', () => {
        this.themeManager.applyTheme(theme.id);
        localStorage.setItem('cartographer-theme', theme.id);
        if (this.canvasEngine) { this.canvasEngine._textureCache = {}; this.canvasEngine._symbolCache = {}; this.canvasEngine.render(); }
        this.timeline.render();
        dropdown.hidden = true;
      });
      dropdown.appendChild(item);
    }
    document.addEventListener('click', (e) => { if (!e.target.closest('.theme-switcher')) dropdown.hidden = true; });
  },
};

// ─── Boot ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => App.init());
