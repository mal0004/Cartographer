'use strict';

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'cartographer.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS worlds (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    description TEXT  DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS elements (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    world_id  INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
    type      TEXT    NOT NULL,  -- territory | city | route | region | text
    data      TEXT    NOT NULL DEFAULT '{}',  -- JSON blob
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    world_id    INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    date_value  INTEGER NOT NULL DEFAULT 0,
    category    TEXT    NOT NULL DEFAULT 'cultural',
    description TEXT    DEFAULT '',
    entity_ids  TEXT    NOT NULL DEFAULT '[]',
    created_at  INTEGER DEFAULT (strftime('%s','now')),
    updated_at  INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_elements_world ON elements(world_id);
  CREATE INDEX IF NOT EXISTS idx_events_world   ON events(world_id);
`);

// ── Worlds ────────────────────────────────────────────────────────────────

const stmts = {
  getAllWorlds:    db.prepare('SELECT * FROM worlds ORDER BY updated_at DESC'),
  getWorld:       db.prepare('SELECT * FROM worlds WHERE id = ?'),
  createWorld:    db.prepare('INSERT INTO worlds (name, description) VALUES (?, ?)'),
  updateWorld:    db.prepare(`UPDATE worlds SET name = ?, description = ?,
                               updated_at = strftime('%s','now') WHERE id = ?`),
  deleteWorld:    db.prepare('DELETE FROM worlds WHERE id = ?'),

  // Elements
  getElements:    db.prepare('SELECT * FROM elements WHERE world_id = ? ORDER BY id'),
  getElement:     db.prepare('SELECT * FROM elements WHERE id = ? AND world_id = ?'),
  createElement:  db.prepare(`INSERT INTO elements (world_id, type, data) VALUES (?, ?, ?)`),
  updateElement:  db.prepare(`UPDATE elements SET data = ?,
                               updated_at = strftime('%s','now') WHERE id = ? AND world_id = ?`),
  deleteElement:  db.prepare('DELETE FROM elements WHERE id = ? AND world_id = ?'),

  // Events
  getEvents:      db.prepare('SELECT * FROM events WHERE world_id = ? ORDER BY date_value'),
  getEvent:       db.prepare('SELECT * FROM events WHERE id = ? AND world_id = ?'),
  createEvent:    db.prepare(`INSERT INTO events (world_id, title, date_value, category, description, entity_ids)
                               VALUES (?, ?, ?, ?, ?, ?)`),
  updateEvent:    db.prepare(`UPDATE events SET title = ?, date_value = ?, category = ?,
                               description = ?, entity_ids = ?,
                               updated_at = strftime('%s','now') WHERE id = ? AND world_id = ?`),
  deleteEvent:    db.prepare('DELETE FROM events WHERE id = ? AND world_id = ?'),
};

// ── API helpers ───────────────────────────────────────────────────────────

module.exports = {
  // Worlds
  getAllWorlds() {
    return stmts.getAllWorlds.all();
  },
  getWorld(id) {
    return stmts.getWorld.get(id);
  },
  createWorld(name, description = '') {
    const info = stmts.createWorld.run(name, description);
    return stmts.getWorld.get(info.lastInsertRowid);
  },
  updateWorld(id, name, description) {
    stmts.updateWorld.run(name, description, id);
    return stmts.getWorld.get(id);
  },
  deleteWorld(id) {
    stmts.deleteWorld.run(id);
  },

  // Elements
  getElements(worldId) {
    return stmts.getElements.all(worldId).map(parseElement);
  },
  getElement(worldId, id) {
    const row = stmts.getElement.get(id, worldId);
    return row ? parseElement(row) : null;
  },
  createElement(worldId, type, data) {
    const info = stmts.createElement.run(worldId, type, JSON.stringify(data));
    const row  = stmts.getElement.get(info.lastInsertRowid, worldId);
    return parseElement(row);
  },
  updateElement(worldId, id, data) {
    stmts.updateElement.run(JSON.stringify(data), id, worldId);
    const row = stmts.getElement.get(id, worldId);
    return row ? parseElement(row) : null;
  },
  deleteElement(worldId, id) {
    stmts.deleteElement.run(id, worldId);
  },

  // Events
  getEvents(worldId) {
    return stmts.getEvents.all(worldId).map(parseEvent);
  },
  getEvent(worldId, id) {
    const row = stmts.getEvent.get(id, worldId);
    return row ? parseEvent(row) : null;
  },
  createEvent(worldId, { title, date_value = 0, category = 'cultural', description = '', entity_ids = [] }) {
    const info = stmts.createEvent.run(worldId, title, date_value, category, description, JSON.stringify(entity_ids));
    const row  = stmts.getEvent.get(info.lastInsertRowid, worldId);
    return parseEvent(row);
  },
  updateEvent(worldId, id, { title, date_value, category, description, entity_ids }) {
    stmts.updateEvent.run(title, date_value, category, description, JSON.stringify(entity_ids), id, worldId);
    const row = stmts.getEvent.get(id, worldId);
    return row ? parseEvent(row) : null;
  },
  deleteEvent(worldId, id) {
    stmts.deleteEvent.run(id, worldId);
  },

  // Full world export/import
  exportWorld(worldId) {
    const world    = stmts.getWorld.get(worldId);
    const elements = stmts.getElements.all(worldId).map(parseElement);
    const events   = stmts.getEvents.all(worldId).map(parseEvent);
    return { world, elements, events };
  },

  importWorld: db.transaction(function(data) {
    const { world, elements = [], events = [] } = data;
    const info = stmts.createWorld.run(world.name, world.description || '');
    const newWorldId = info.lastInsertRowid;
    for (const el of elements) {
      stmts.createElement.run(newWorldId, el.type, JSON.stringify(el.data));
    }
    for (const ev of events) {
      stmts.createEvent.run(
        newWorldId, ev.title, ev.date_value, ev.category,
        ev.description, JSON.stringify(ev.entity_ids)
      );
    }
    return stmts.getWorld.get(newWorldId);
  }),

  close() {
    db.close();
  },
};

function parseElement(row) {
  return { ...row, data: JSON.parse(row.data) };
}

function parseEvent(row) {
  return { ...row, entity_ids: JSON.parse(row.entity_ids) };
}
