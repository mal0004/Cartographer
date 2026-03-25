/**
 * Cartographer — Editor Wiring
 *
 * Opens worlds, manages entity CRUD with undo,
 * exports, theme switching, and undo/redo UI.
 */

import { CanvasEngine } from '../canvas/engine.js';
import { SymbolLibrary } from '../symbols/index.js';
import { SnapGuides } from '../snap.js';
import { Minimap } from '../minimap.js';
import { Onboarding } from '../onboarding.js';
import { SvgExportPanel } from '../svg-export.js';
import { AddEntityCommand, DeleteEntityCommand, MoveEntityCommand, ModifyEntityCommand } from '../undo.js';
import { api, showToast } from '../data/storage.js';
import { t } from '../i18n.js';
import { EmptyState } from './empty-state.js';
import { WorldGenerator } from '../terrain/generator.js';

// ─── Open world ──────────────────────────────────────────

export async function openWorld(app) {
  const worldId = app._pendingWorldId;
  app.currentWorld = await api('GET', `/api/worlds/${worldId}`);
  document.getElementById('world-title').textContent = app.currentWorld.name;
  showScreen('editor-screen');

  if (!app.canvasEngine) {
    app.canvasEngine = new CanvasEngine(document.getElementById('main-canvas'));
    app.canvasEngine.onEntitySelected = (entity) => onEntitySelected(app, entity);
    app.canvasEngine.onEntityCreated = (entity) => createEntity(app, entity).catch(err => { console.error('Entity creation failed:', err); showToast(err.message, 'error'); });
    app.canvasEngine.onEntityUpdated = (entity) => updateEntity(app, entity).catch(err => { console.error('Entity update failed:', err); showToast(err.message, 'error'); });
    app.canvasEngine.onEntityDeleted = (entity) => deleteEntity(app, entity).catch(err => { console.error('Entity delete failed:', err); showToast(err.message, 'error'); });
    app.canvasEngine.onEntityMoved = (entity, oldData) => moveEntityWithUndo(app, entity, oldData);
    app.canvasEngine.layersPanel = app.layersPanel;

    app.symbolLibrary = new SymbolLibrary();
    app.canvasEngine.symbolLibrary = app.symbolLibrary;

    const snapGuides = new SnapGuides(app.canvasEngine);
    app.canvasEngine.snapGuides = snapGuides;
    document.getElementById('btn-snap').addEventListener('click', () => {
      const on = snapGuides.toggleSnap();
      document.getElementById('btn-snap').classList.toggle('active', on);
      document.getElementById('btn-snap').title = `Snap to elements (${on ? 'on' : 'off'})`;
    });
    document.getElementById('btn-grid-snap').addEventListener('click', () => {
      const on = snapGuides.toggleGridSnap();
      document.getElementById('btn-grid-snap').classList.toggle('active', on);
      document.getElementById('btn-grid-snap').title = `Snap to grid (${on ? 'on' : 'off'})`;
    });

    app.minimap = new Minimap(app.canvasEngine);
    const origRender = app.canvasEngine.render.bind(app.canvasEngine);
    app.canvasEngine.render = () => { origRender(); if (app.minimap) app.minimap.render(); };
  }

  const worldSeed = typeof app.currentWorld.id === 'number'
    ? app.currentWorld.id
    : Array.from(String(app.currentWorld.id)).reduce((s, c) => s * 31 + c.charCodeAt(0), 0);
  app.canvasEngine.setWorldSeed(worldSeed);

  await loadEntities(app);
  await loadEvents(app);
  app.undoManager.clear();

  if (!app._emptyState) {
    const canvasContainer = document.getElementById('main-canvas').parentElement;
    app._emptyState = new EmptyState(canvasContainer, {
      onGenerate: () => generateWorld(app),
      onStartDrawing: () => {
        app._emptyState.hide();
        app.canvasEngine.setTool('brush');
      },
    });
  }
  app._emptyState.check(app.entities);

  if (!app._onboarding) app._onboarding = new Onboarding();
  if (app._onboarding.shouldShow(app.currentWorld.id)) {
    setTimeout(() => app._onboarding.start(app.currentWorld.id), 500);
  }

  app.canvasEngine.offsetX = app.canvasEngine.width / 2;
  app.canvasEngine.offsetY = app.canvasEngine.height / 2;
  app.canvasEngine.zoom = 1;
  app.canvasEngine.setTool('select');
  app.canvasEngine.render();
}

// ─── Screen navigation ───────────────────────────────────

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── World Generation ────────────────────────────────────

async function generateWorld(app, seed) {
  if (app.entities && app.entities.length > 0) {
    if (!confirm(t('editor.generate.confirmReplace'))) return;
    for (const e of [...app.entities]) {
      await api('DELETE', `/api/entities/${e.id}`);
    }
  }
  const gen = new WorldGenerator(seed);
  const result = gen.generate();
  for (const t of result.territories) {
    await api('POST', `/api/worlds/${app.currentWorld.id}/entities`, t);
  }
  for (const r of result.rivers) {
    await api('POST', `/api/worlds/${app.currentWorld.id}/entities`, r);
  }
  for (const e of result.entities) {
    await api('POST', `/api/worlds/${app.currentWorld.id}/entities`, e);
  }
  await loadEntities(app);
  if (app._emptyState) app._emptyState.check(app.entities);
  if (app.entities.length > 0) {
    const first = app.entities.find(e => e.type === 'territory');
    if (first && first.data.points && first.data.points.length > 0) {
      const cx = first.data.points.reduce((s, p) => s + p.x, 0) / first.data.points.length;
      const cy = first.data.points.reduce((s, p) => s + p.y, 0) / first.data.points.length;
      app.canvasEngine.centerOn(cx, cy, 0.8);
    }
  }
  showToast(t('editor.generate.title') + ' — seed: ' + result.seed, 'success');
}

export { generateWorld };

// ─── Entity CRUD ─────────────────────────────────────────

async function loadEntities(app) {
  app.entities = await api('GET', `/api/worlds/${app.currentWorld.id}/entities`);
  if (app.canvasEngine) app.canvasEngine.setEntities(app.entities);
}

export async function loadEvents(app) {
  app.events = await api('GET', `/api/worlds/${app.currentWorld.id}/events`);
  app.timeline.setData(app.events, app.currentWorld.time_start, app.currentWorld.time_end);
}

function onEntitySelected(app, entity) {
  if (entity) app.sidebar.open(entity, app.entities, app.events);
  else app.sidebar.close();
}

async function createEntity(app, entityData) {
  const cmd = new AddEntityCommand(app, entityData);
  await cmd.execute();
  app.undoManager.push(cmd);
  if (app._emptyState) app._emptyState.check(app.entities);
}

export async function updateEntity(app, entity) {
  await api('PUT', `/api/entities/${entity.id}`, { name: entity.name, data: entity.data });
  app.canvasEngine.render();
}

export async function deleteEntity(app, entity) {
  const cmd = new DeleteEntityCommand(app, entity);
  await cmd.execute();
  app.undoManager.push(cmd);
  if (app._emptyState) app._emptyState.check(app.entities);
}

function moveEntityWithUndo(app, entity, oldData) {
  const cmd = new MoveEntityCommand(app, entity, oldData, entity.data);
  app.undoManager.push(cmd);
  updateEntity(app, entity);
}

export function navigateToEntity(app, entityId) {
  const entity = app.entities.find(e => e.id === entityId);
  if (!entity) return;
  const pos = getEntityCenter(entity);
  if (pos) {
    app.canvasEngine.centerOn(pos.x, pos.y);
    app.canvasEngine.selectEntity(entity);
    app.sidebar.open(entity, app.entities, app.events);
  }
}

function getEntityCenter(entity) {
  const d = entity.data;
  if (entity.type === 'city' || entity.type === 'text') return { x: d.x, y: d.y };
  if ((entity.type === 'territory' || entity.type === 'region') && d.points && d.points.length > 0) {
    return { x: d.points.reduce((s, p) => s + p.x, 0) / d.points.length, y: d.points.reduce((s, p) => s + p.y, 0) / d.points.length };
  }
  if (entity.type === 'route') return { x: (d.x1 + d.x2) / 2, y: (d.y1 + d.y2) / 2 };
  return null;
}

// ─── Export ──────────────────────────────────────────────

export function exportSVG(app) {
  if (!app.currentWorld) return;
  if (!app._svgExport) app._svgExport = new SvgExportPanel();
  app._svgExport.showExportModal(app.currentWorld, app.entities, (opts) => {
    const svg = app._svgExport.generateSVG(app.currentWorld, app.entities, opts);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${app.currentWorld.name}.svg`; a.click();
    URL.revokeObjectURL(url);
    showToast(t('toasts.svgExported'), 'success');
  });
}

export async function exportJSON(app) {
  if (!app.currentWorld) return;
  const data = await api('GET', `/api/worlds/${app.currentWorld.id}/export`);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${app.currentWorld.name}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast(t('toasts.jsonExported'), 'success');
}
