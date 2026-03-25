/**
 * Cartographer — Canvas Tools & Entity Creation
 *
 * Tool switching, tool options UI, and entity creation methods
 * mixed into CanvasEngine prototype.
 */

export const ToolsMixin = {

  _stampLayer(data) {
    if (this.layersPanel) data._layer = this.layersPanel.getActiveLayerId();
    return data;
  },

  _createCity(x, y) {
    const importance = this.toolOptions.importance || 'village';
    const entity = {
      type: 'city',
      name: '',
      data: this._stampLayer({
        x, y, importance,
        color: this.toolColor,
        labelOffsetX: 12,
        labelOffsetY: -8,
        population: 0,
        founded: '',
        description: '',
      }),
    };
    if (this.onEntityCreated) this.onEntityCreated(entity);
  },

  _createRoute(x1, y1, x2, y2) {
    const style = this.toolOptions.routeStyle || 'road';
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const entity = {
      type: 'route',
      name: '',
      data: this._stampLayer({
        x1, y1, x2, y2,
        cx1: mx - dy * 0.2, cy1: my + dx * 0.2,
        cx2: mx + dy * 0.2, cy2: my - dx * 0.2,
        style, length: '', description: '',
      }),
    };
    if (this.onEntityCreated) this.onEntityCreated(entity);
  },

  _createPolygon(type, points) {
    const entityData = {
      type,
      name: '',
      data: this._stampLayer({
        points: points.map(p => ({ x: p.x, y: p.y })),
        color: this.toolColor,
      }),
    };
    if (type === 'territory') {
      entityData.data.ruler = '';
      entityData.data.capitalName = '';
      entityData.data.resources = [];
      entityData.data.description = '';
      entityData.data.terrainType = this.toolOptions.terrainType || '';
      entityData.data.terrainSeed = Math.floor(Math.random() * 100000);
      entityData.data.terrainIntensity = 50;
    } else {
      entityData.data.terrain = this.toolOptions.terrain || 'forest';
    }
    if (this.onEntityCreated) this.onEntityCreated(entityData);
  },

  _createText(x, y) {
    const text = prompt('Enter label text:');
    if (!text) return;
    const entity = {
      type: 'text',
      name: text,
      data: this._stampLayer({
        x, y, text,
        fontSize: Number(this.toolOptions.fontSize) || 16,
        fontStyle: this.toolOptions.fontStyle || 'normal',
        color: this.toolColor,
      }),
    };
    if (this.onEntityCreated) this.onEntityCreated(entity);
  },

  _createSymbol(x, y) {
    if (!this.symbolLibrary || !this.symbolLibrary.selectedSymbol) return;
    const entity = {
      type: 'symbol',
      name: '',
      data: this._stampLayer({
        x, y,
        symbolId: this.symbolLibrary.selectedSymbol,
        size: 32, rotation: 0, color: this.toolColor,
      }),
    };
    if (this.onEntityCreated) this.onEntityCreated(entity);
  },

  _createRiver(x, y) {
    const entity = {
      type: 'river',
      name: '',
      data: this._stampLayer({
        sourceX: x, sourceY: y,
        color: '#6B8FA8', widthScale: 1.0,
      }),
    };
    if (this.onEntityCreated) this.onEntityCreated(entity);
  },

  setTool(tool) {
    if (this.brush && this.tool === 'brush' && tool !== 'brush') {
      this.brush.deactivate();
    }
    this.tool = tool;
    this.drawingPoints = [];
    this.routeStart = null;
    if (this.brush && tool === 'brush') {
      this.brush.activate();
    }
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    const container = this.canvas.parentElement;
    // Remove any existing cursor-* class and set the new one
    container.className = container.className.replace(/\bcursor-\S+/g, '').trim();
    container.classList.add('cursor-' + tool);
    this._updateToolOptions();
    if (this.symbolLibrary) {
      if (tool === 'symbol') this.symbolLibrary.show();
      else this.symbolLibrary.hide();
    }
    this.render();
  },

  _updateToolOptions() {
    const optionsEl = document.getElementById('tool-options');
    optionsEl.innerHTML = '';
    optionsEl.hidden = true;

    if (this.tool === 'territory') {
      optionsEl.hidden = false;
      optionsEl.innerHTML = `
        <label>Terrain:
          <select id="opt-territory-terrain">
            <option value="">None (flat)</option>
            <option value="plain">Plains</option>
            <option value="hills">Hills</option>
            <option value="mountain">Mountains</option>
            <option value="desert">Desert</option>
            <option value="marsh">Marsh</option>
            <option value="ocean">Ocean / Lake</option>
          </select>
        </label>`;
      optionsEl.querySelector('#opt-territory-terrain').value = this.toolOptions.terrainType || '';
      optionsEl.querySelector('#opt-territory-terrain').addEventListener('change', (e) => {
        this.toolOptions.terrainType = e.target.value;
      });
    } else if (this.tool === 'city') {
      optionsEl.hidden = false;
      optionsEl.innerHTML = `
        <label>Type:
          <select id="opt-importance">
            <option value="village">Village</option>
            <option value="city">City</option>
            <option value="capital">Capital</option>
          </select>
        </label>`;
      optionsEl.querySelector('#opt-importance').value = this.toolOptions.importance || 'village';
      optionsEl.querySelector('#opt-importance').addEventListener('change', (e) => {
        this.toolOptions.importance = e.target.value;
      });
    } else if (this.tool === 'route') {
      optionsEl.hidden = false;
      optionsEl.innerHTML = `
        <label>Style:
          <select id="opt-route-style">
            <option value="trail">Trail</option>
            <option value="road">Road</option>
            <option value="royal">Royal Road</option>
          </select>
        </label>`;
      optionsEl.querySelector('#opt-route-style').value = this.toolOptions.routeStyle || 'road';
      optionsEl.querySelector('#opt-route-style').addEventListener('change', (e) => {
        this.toolOptions.routeStyle = e.target.value;
      });
    } else if (this.tool === 'region') {
      optionsEl.hidden = false;
      optionsEl.innerHTML = `
        <label>Terrain:
          <select id="opt-terrain">
            <option value="forest">Forest</option>
            <option value="mountain">Mountain</option>
            <option value="desert">Desert</option>
            <option value="ocean">Ocean</option>
            <option value="plain">Plains</option>
            <option value="hills">Hills</option>
            <option value="marsh">Marsh</option>
          </select>
        </label>`;
      optionsEl.querySelector('#opt-terrain').value = this.toolOptions.terrain || 'forest';
      optionsEl.querySelector('#opt-terrain').addEventListener('change', (e) => {
        this.toolOptions.terrain = e.target.value;
      });
    } else if (this.tool === 'brush') {
      optionsEl.hidden = false;
      optionsEl.innerHTML = `
        <label><span data-i18n="editor.brush.radius">Radius</span>:
          <input type="range" id="opt-brush-radius" min="20" max="120"
            value="${this.brush ? this.brush.radius : 40}" style="width:100px">
          <span id="brush-radius-val">${this.brush ? this.brush.radius : 40}</span>
        </label>
        <label><span data-i18n="editor.brush.biome">Biome</span>:
          <select id="opt-brush-biome">
            <option value="plain">Plains</option>
            <option value="forest">Forest</option>
            <option value="hills">Hills</option>
            <option value="mountain">Mountains</option>
            <option value="desert">Desert</option>
            <option value="marsh">Marsh</option>
          </select>
        </label>`;
      optionsEl.querySelector('#opt-brush-radius').addEventListener('input', (e) => {
        const v = Number(e.target.value);
        if (this.brush) this.brush.setRadius(v);
        optionsEl.querySelector('#brush-radius-val').textContent = v;
      });
      const biomeSelect = optionsEl.querySelector('#opt-brush-biome');
      biomeSelect.value = this.brush ? this.brush.currentBiome : 'plain';
      biomeSelect.addEventListener('change', (e) => {
        if (this.brush) this.brush.setBiome(e.target.value);
      });
    } else if (this.tool === 'text') {
      optionsEl.hidden = false;
      optionsEl.innerHTML = `
        <label>Size:
          <input type="number" id="opt-font-size" value="${this.toolOptions.fontSize || 16}" min="8" max="72" style="width:60px">
        </label>
        <label>Style:
          <select id="opt-font-style">
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
        </label>`;
      optionsEl.querySelector('#opt-font-size').addEventListener('change', (e) => {
        this.toolOptions.fontSize = e.target.value;
      });
      optionsEl.querySelector('#opt-font-style').value = this.toolOptions.fontStyle || 'normal';
      optionsEl.querySelector('#opt-font-style').addEventListener('change', (e) => {
        this.toolOptions.fontStyle = e.target.value;
      });
    }
  },
};
