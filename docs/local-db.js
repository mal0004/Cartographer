/**
 * Cartographer — LocalStorage Database Shim
 *
 * Drop-in replacement for the server API, storing everything
 * in localStorage so the app works as a static site (GitHub Pages).
 */

const LocalDB = {
  _key(ns) { return `cartographer_${ns}`; },

  _read(ns) {
    try { return JSON.parse(localStorage.getItem(this._key(ns))) || []; }
    catch { return []; }
  },

  _write(ns, data) {
    localStorage.setItem(this._key(ns), JSON.stringify(data));
  },

  _nextId(ns) {
    const key = this._key(ns + '_seq');
    const id = (parseInt(localStorage.getItem(key)) || 0) + 1;
    localStorage.setItem(key, id);
    return id;
  },

  // ─── Worlds ───────────────────────────────────────────────

  getWorlds() {
    return this._read('worlds').sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  },

  getWorld(id) {
    return this._read('worlds').find(w => w.id === id) || null;
  },

  createWorld(data) {
    const worlds = this._read('worlds');
    const world = {
      id: this._nextId('worlds'),
      name: data.name || 'Untitled World',
      description: data.description || '',
      time_start: data.time_start ?? 0,
      time_end: data.time_end ?? 1000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    worlds.push(world);
    this._write('worlds', worlds);
    return world;
  },

  updateWorld(id, data) {
    const worlds = this._read('worlds');
    const idx = worlds.findIndex(w => w.id === id);
    if (idx === -1) return null;
    Object.assign(worlds[idx], data, { updated_at: new Date().toISOString() });
    this._write('worlds', worlds);
    return worlds[idx];
  },

  deleteWorld(id) {
    this._write('worlds', this._read('worlds').filter(w => w.id !== id));
    this._write('entities', this._read('entities').filter(e => e.world_id !== id));
    this._write('events', this._read('events').filter(e => e.world_id !== id));
  },

  // ─── Entities ─────────────────────────────────────────────

  getEntities(worldId) {
    return this._read('entities').filter(e => e.world_id === worldId);
  },

  getEntity(id) {
    return this._read('entities').find(e => e.id === id) || null;
  },

  createEntity(worldId, data) {
    const entities = this._read('entities');
    const entity = {
      id: this._nextId('entities'),
      world_id: worldId,
      type: data.type,
      name: data.name || '',
      data: data.data || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    entities.push(entity);
    this._write('entities', entities);
    return entity;
  },

  updateEntity(id, data) {
    const entities = this._read('entities');
    const idx = entities.findIndex(e => e.id === id);
    if (idx === -1) return null;
    if (data.name !== undefined) entities[idx].name = data.name;
    if (data.data) entities[idx].data = { ...entities[idx].data, ...data.data };
    entities[idx].updated_at = new Date().toISOString();
    this._write('entities', entities);
    return entities[idx];
  },

  deleteEntity(id) {
    this._write('entities', this._read('entities').filter(e => e.id !== id));
  },

  // ─── Events ───────────────────────────────────────────────

  getEvents(worldId) {
    return this._read('events').filter(e => e.world_id === worldId).sort((a, b) => a.date - b.date);
  },

  getEvent(id) {
    return this._read('events').find(e => e.id === id) || null;
  },

  createEvent(worldId, data) {
    const events = this._read('events');
    const event = {
      id: this._nextId('events'),
      world_id: worldId,
      title: data.title,
      date: data.date,
      category: data.category || 'political',
      description: data.description || '',
      entity_ids: data.entity_ids || [],
      created_at: new Date().toISOString(),
    };
    events.push(event);
    this._write('events', events);
    return event;
  },

  updateEvent(id, data) {
    const events = this._read('events');
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) return null;
    Object.assign(events[idx], data);
    this._write('events', events);
    return events[idx];
  },

  deleteEvent(id) {
    this._write('events', this._read('events').filter(e => e.id !== id));
  },

  // ─── Import / Export ──────────────────────────────────────

  exportWorld(worldId) {
    const world = this.getWorld(worldId);
    if (!world) return null;
    return {
      world,
      entities: this.getEntities(worldId),
      events: this.getEvents(worldId),
    };
  },

  importWorld(dump) {
    const world = this.createWorld(dump.world);
    const idMap = {};
    for (const ent of (dump.entities || [])) {
      const created = this.createEntity(world.id, ent);
      idMap[ent.id] = created.id;
    }
    for (const evt of (dump.events || [])) {
      const mappedIds = (evt.entity_ids || []).map(eid => idMap[eid] ?? eid);
      this.createEvent(world.id, { ...evt, entity_ids: mappedIds });
    }
    return world;
  },
};

export { LocalDB };
