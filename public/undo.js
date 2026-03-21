/**
 * Cartographer — Undo/Redo Manager
 *
 * Implements the Command pattern for unlimited undo/redo.
 * Each action on the canvas is recorded as a command with
 * execute() and undo() capabilities.
 */

class UndoManager {
  constructor() {
    this._undoStack = [];
    this._redoStack = [];
    this.onChange = null; // callback when stacks change
  }

  /** Push a new command and execute it */
  execute(command) {
    command.execute();
    this._undoStack.push(command);
    this._redoStack = [];
    this._notify();
  }

  /** Push a command that was already executed (for wrap-around cases) */
  push(command) {
    this._undoStack.push(command);
    this._redoStack = [];
    this._notify();
  }

  async undo() {
    if (this._undoStack.length === 0) return;
    const cmd = this._undoStack.pop();
    await cmd.undo();
    this._redoStack.push(cmd);
    this._notify();
  }

  async redo() {
    if (this._redoStack.length === 0) return;
    const cmd = this._redoStack.pop();
    await cmd.execute();
    this._undoStack.push(cmd);
    this._notify();
  }

  canUndo() { return this._undoStack.length > 0; }
  canRedo() { return this._redoStack.length > 0; }
  undoCount() { return this._undoStack.length; }
  redoCount() { return this._redoStack.length; }

  clear() {
    this._undoStack = [];
    this._redoStack = [];
    this._notify();
  }

  _notify() {
    if (this.onChange) this.onChange();
  }
}

// ─── Command classes ──────────────────────────────────────────

class AddEntityCommand {
  constructor(app, entityData) {
    this.app = app;
    this.entityData = entityData; // the data to create
    this.createdEntity = null;    // filled after execute
  }
  async execute() {
    const created = await this.app._api('POST', `/api/worlds/${this.app.currentWorld.id}/entities`, this.entityData);
    this.createdEntity = created;
    this.app.entities.push(created);
    this.app.canvasEngine.setEntities(this.app.entities);
    this.app.canvasEngine.selectEntity(created);
    this.app.sidebar.open(created, this.app.entities, this.app.events);
  }
  async undo() {
    if (!this.createdEntity) return;
    await this.app._api('DELETE', `/api/entities/${this.createdEntity.id}`);
    this.app.entities = this.app.entities.filter(e => e.id !== this.createdEntity.id);
    this.app.canvasEngine.setEntities(this.app.entities);
    this.app.canvasEngine.selectEntity(null);
    this.app.sidebar.close();
  }
}

class DeleteEntityCommand {
  constructor(app, entity) {
    this.app = app;
    this.entity = JSON.parse(JSON.stringify(entity)); // deep clone
  }
  async execute() {
    await this.app._api('DELETE', `/api/entities/${this.entity.id}`);
    this.app.entities = this.app.entities.filter(e => e.id !== this.entity.id);
    this.app.canvasEngine.setEntities(this.app.entities);
    this.app.canvasEngine.selectEntity(null);
    this.app.sidebar.close();
  }
  async undo() {
    const restored = await this.app._api('POST', `/api/worlds/${this.app.currentWorld.id}/entities`, this.entity);
    this.entity.id = restored.id;
    this.app.entities.push(restored);
    this.app.canvasEngine.setEntities(this.app.entities);
    this.app.canvasEngine.selectEntity(restored);
    this.app.sidebar.open(restored, this.app.entities, this.app.events);
  }
}

class MoveEntityCommand {
  constructor(app, entity, oldData, newData) {
    this.app = app;
    this.entityId = entity.id;
    this.oldData = JSON.parse(JSON.stringify(oldData));
    this.newData = JSON.parse(JSON.stringify(newData));
  }
  async execute() {
    const entity = this.app.entities.find(e => e.id === this.entityId);
    if (!entity) return;
    Object.assign(entity.data, this.newData);
    await this.app._api('PUT', `/api/entities/${entity.id}`, { name: entity.name, data: entity.data });
    this.app.canvasEngine.render();
  }
  async undo() {
    const entity = this.app.entities.find(e => e.id === this.entityId);
    if (!entity) return;
    Object.assign(entity.data, this.oldData);
    await this.app._api('PUT', `/api/entities/${entity.id}`, { name: entity.name, data: entity.data });
    this.app.canvasEngine.render();
  }
}

class ModifyEntityCommand {
  constructor(app, entityId, oldName, oldData, newName, newData) {
    this.app = app;
    this.entityId = entityId;
    this.oldName = oldName;
    this.oldData = JSON.parse(JSON.stringify(oldData));
    this.newName = newName;
    this.newData = JSON.parse(JSON.stringify(newData));
  }
  async execute() {
    const entity = this.app.entities.find(e => e.id === this.entityId);
    if (!entity) return;
    entity.name = this.newName;
    entity.data = JSON.parse(JSON.stringify(this.newData));
    await this.app._api('PUT', `/api/entities/${entity.id}`, { name: entity.name, data: entity.data });
    this.app.canvasEngine.render();
    if (this.app.sidebar.entity && this.app.sidebar.entity.id === this.entityId) {
      this.app.sidebar.open(entity, this.app.entities, this.app.events);
    }
  }
  async undo() {
    const entity = this.app.entities.find(e => e.id === this.entityId);
    if (!entity) return;
    entity.name = this.oldName;
    entity.data = JSON.parse(JSON.stringify(this.oldData));
    await this.app._api('PUT', `/api/entities/${entity.id}`, { name: entity.name, data: entity.data });
    this.app.canvasEngine.render();
    if (this.app.sidebar.entity && this.app.sidebar.entity.id === this.entityId) {
      this.app.sidebar.open(entity, this.app.entities, this.app.events);
    }
  }
}

window.UndoManager = UndoManager;
window.AddEntityCommand = AddEntityCommand;
window.DeleteEntityCommand = DeleteEntityCommand;
window.MoveEntityCommand = MoveEntityCommand;
window.ModifyEntityCommand = ModifyEntityCommand;
