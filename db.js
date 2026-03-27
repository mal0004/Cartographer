const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'cartographer.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema initialization ───────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS worlds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    time_start INTEGER DEFAULT 0,
    time_end INTEGER DEFAULT 1000,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('territory','city','route','region','text','symbol')),
    name TEXT DEFAULT '',
    data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    date INTEGER NOT NULL,
    category TEXT DEFAULT 'political' CHECK(category IN ('war','political','natural','cultural')),
    description TEXT DEFAULT '',
    entity_ids TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    world_id INTEGER NOT NULL,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_entities_world ON entities(world_id);
  CREATE INDEX IF NOT EXISTS idx_events_world ON events(world_id);
  CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token);
`);

// ─── Helpers ─────────────────────────────────────────────────────

function safeJsonParse(str, defaultValue) {
  try { return JSON.parse(str); } catch { return defaultValue; }
}

// ─── Worlds ──────────────────────────────────────────────────────

const worldStmts = {
  all: db.prepare('SELECT * FROM worlds ORDER BY updated_at DESC'),
  get: db.prepare('SELECT * FROM worlds WHERE id = ?'),
  insert: db.prepare('INSERT INTO worlds (name, description, time_start, time_end) VALUES (@name, @description, @time_start, @time_end)'),
  update: db.prepare('UPDATE worlds SET name = @name, description = @description, time_start = @time_start, time_end = @time_end, updated_at = datetime(\'now\') WHERE id = @id'),
  delete: db.prepare('DELETE FROM worlds WHERE id = ?'),
};

const Worlds = {
  all() { return worldStmts.all.all(); },
  get(id) { return worldStmts.get.get(id); },
  create(data) {
    const info = worldStmts.insert.run({
      name: data.name || 'Untitled World',
      description: data.description || '',
      time_start: data.time_start ?? 0,
      time_end: data.time_end ?? 1000,
    });
    return worldStmts.get.get(info.lastInsertRowid);
  },
  update(id, data) {
    const existing = worldStmts.get.get(id);
    if (!existing) return null;
    worldStmts.update.run({
      id,
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      time_start: data.time_start ?? existing.time_start,
      time_end: data.time_end ?? existing.time_end,
    });
    return worldStmts.get.get(id);
  },
  delete(id) { return worldStmts.delete.run(id); },
};

// ─── Entities ────────────────────────────────────────────────────

const entityStmts = {
  allForWorld: db.prepare('SELECT * FROM entities WHERE world_id = ? ORDER BY created_at'),
  get: db.prepare('SELECT * FROM entities WHERE id = ?'),
  insert: db.prepare('INSERT INTO entities (world_id, type, name, data) VALUES (@world_id, @type, @name, @data)'),
  update: db.prepare('UPDATE entities SET name = @name, data = @data, updated_at = datetime(\'now\') WHERE id = @id'),
  delete: db.prepare('DELETE FROM entities WHERE id = ?'),
};

const Entities = {
  allForWorld(worldId) {
    return entityStmts.allForWorld.all(worldId).map(row => ({
      ...row,
      data: safeJsonParse(row.data, {}),
    }));
  },
  get(id) {
    const row = entityStmts.get.get(id);
    if (!row) return null;
    return { ...row, data: safeJsonParse(row.data, {}) };
  },
  create(data) {
    const info = entityStmts.insert.run({
      world_id: data.world_id,
      type: data.type,
      name: data.name || '',
      data: JSON.stringify(data.data || {}),
    });
    return this.get(info.lastInsertRowid);
  },
  update(id, data) {
    const existing = entityStmts.get.get(id);
    if (!existing) return null;
    const existingData = safeJsonParse(existing.data, {});
    entityStmts.update.run({
      id,
      name: data.name ?? existing.name,
      data: JSON.stringify({ ...existingData, ...(data.data || {}) }),
    });
    return this.get(id);
  },
  delete(id) { return entityStmts.delete.run(id); },
};

// ─── Events ──────────────────────────────────────────────────────

const eventStmts = {
  allForWorld: db.prepare('SELECT * FROM events WHERE world_id = ? ORDER BY date'),
  get: db.prepare('SELECT * FROM events WHERE id = ?'),
  insert: db.prepare('INSERT INTO events (world_id, title, date, category, description, entity_ids) VALUES (@world_id, @title, @date, @category, @description, @entity_ids)'),
  update: db.prepare('UPDATE events SET title = @title, date = @date, category = @category, description = @description, entity_ids = @entity_ids WHERE id = @id'),
  delete: db.prepare('DELETE FROM events WHERE id = ?'),
};

const Events = {
  allForWorld(worldId) {
    return eventStmts.allForWorld.all(worldId).map(row => ({
      ...row,
      entity_ids: safeJsonParse(row.entity_ids, []),
    }));
  },
  get(id) {
    const row = eventStmts.get.get(id);
    if (!row) return null;
    return { ...row, entity_ids: safeJsonParse(row.entity_ids, []) };
  },
  create(data) {
    const info = eventStmts.insert.run({
      world_id: data.world_id,
      title: data.title,
      date: data.date,
      category: data.category || 'political',
      description: data.description || '',
      entity_ids: JSON.stringify(data.entity_ids || []),
    });
    return this.get(info.lastInsertRowid);
  },
  update(id, data) {
    const existing = eventStmts.get.get(id);
    if (!existing) return null;
    eventStmts.update.run({
      id,
      title: data.title ?? existing.title,
      date: data.date ?? existing.date,
      category: data.category ?? existing.category,
      description: data.description ?? existing.description,
      entity_ids: JSON.stringify(data.entity_ids ?? safeJsonParse(existing.entity_ids, [])),
    });
    return this.get(id);
  },
  delete(id) { return eventStmts.delete.run(id); },
};

// ─── Import / Export ─────────────────────────────────────────────

const importExport = {
  exportWorld(worldId) {
    const world = Worlds.get(worldId);
    if (!world) return null;
    return {
      world,
      entities: Entities.allForWorld(worldId),
      events: Events.allForWorld(worldId),
    };
  },
  importWorld(dump) {
    const txn = db.transaction(() => {
      const world = Worlds.create(dump.world);
      const idMap = {};
      for (const ent of (dump.entities || [])) {
        const created = Entities.create({ ...ent, world_id: world.id });
        idMap[ent.id] = created.id;
      }
      for (const evt of (dump.events || [])) {
        const mappedIds = (evt.entity_ids || []).map(eid => idMap[eid] ?? eid);
        Events.create({ ...evt, world_id: world.id, entity_ids: mappedIds });
      }
      return world;
    });
    return txn();
  },
};

// ─── Shares ─────────────────────────────────────────────────────

const shareStmts = {
  getByToken: db.prepare('SELECT * FROM shares WHERE token = ?'),
  insert: db.prepare('INSERT INTO shares (token, world_id, expires_at) VALUES (@token, @world_id, @expires_at)'),
  deleteByWorld: db.prepare('DELETE FROM shares WHERE world_id = ?'),
  deleteByToken: db.prepare('DELETE FROM shares WHERE token = ?'),
  allForWorld: db.prepare('SELECT * FROM shares WHERE world_id = ? ORDER BY created_at DESC'),
};

const Shares = {
  getByToken(token) {
    const row = shareStmts.getByToken.get(token);
    if (!row) return null;
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      shareStmts.deleteByToken.run(token);
      return null;
    }
    return row;
  },
  create(worldId, token, expiresAt) {
    shareStmts.insert.run({ token, world_id: worldId, expires_at: expiresAt || null });
    return shareStmts.getByToken.get(token);
  },
  allForWorld(worldId) { return shareStmts.allForWorld.all(worldId); },
  deleteByToken(token) { shareStmts.deleteByToken.run(token); },
};

module.exports = { db, Worlds, Entities, Events, Shares, importExport };
