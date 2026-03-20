/**
 * Cartographer — Premium SVG Export
 *
 * Configurable export with vignette, paper grain, corner decorations,
 * compass rose styles, title cartouche, and custom scale.
 */

const SVG_EXPORT_DEFAULTS = {
  vignette: true,
  paperGrain: true,
  labelRotation: false,
  cornerDecorations: true,
  compassStyle: 'ornate', // 'simple', 'ornate', 'military'
  scaleBar: true,
  scaleUnit: 'lieues',
  scaleValue: '100',
  cartouche: true,
  cartoucheAuthor: '',
  cartoucheDate: '',
};

class SvgExportPanel {
  constructor() {
    this.options = { ...SVG_EXPORT_DEFAULTS };
  }

  showExportModal(world, entities, onExport) {
    const existing = document.getElementById('svg-export-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'svg-export-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:520px;max-height:80vh;overflow-y:auto;">
        <h2>Export SVG Premium</h2>
        <div class="svg-export-options">
          <label class="export-check"><input type="checkbox" id="exp-vignette" ${this.options.vignette ? 'checked' : ''}> Vignette (bords assombris)</label>
          <label class="export-check"><input type="checkbox" id="exp-grain" ${this.options.paperGrain ? 'checked' : ''}> Grain de papier</label>
          <label class="export-check"><input type="checkbox" id="exp-rotation" ${this.options.labelRotation ? 'checked' : ''}> Labels inclinés (±2°)</label>
          <label class="export-check"><input type="checkbox" id="exp-corners" ${this.options.cornerDecorations ? 'checked' : ''}> Décorations de coins</label>
          <label class="export-check"><input type="checkbox" id="exp-cartouche" ${this.options.cartouche ? 'checked' : ''}> Cartouche titre</label>
          <div class="export-field">
            <label>Rose des vents</label>
            <select id="exp-compass">
              <option value="simple" ${this.options.compassStyle==='simple'?'selected':''}>Simple</option>
              <option value="ornate" ${this.options.compassStyle==='ornate'?'selected':''}>Ornée</option>
              <option value="military" ${this.options.compassStyle==='military'?'selected':''}>Militaire</option>
            </select>
          </div>
          <label class="export-check"><input type="checkbox" id="exp-scale" ${this.options.scaleBar ? 'checked' : ''}> Échelle fictive</label>
          <div class="export-field-row">
            <input type="text" id="exp-scale-value" value="${this.options.scaleValue}" placeholder="100" style="width:60px">
            <input type="text" id="exp-scale-unit" value="${this.options.scaleUnit}" placeholder="lieues" style="width:100px">
          </div>
          <div class="export-field">
            <label>Auteur</label>
            <input type="text" id="exp-author" value="${this.options.cartoucheAuthor}" placeholder="Cartographe inconnu">
          </div>
          <div class="export-field">
            <label>Date fictive</label>
            <input type="text" id="exp-date" value="${this.options.cartoucheDate}" placeholder="An 1200 du Troisième Âge">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="exp-cancel">Annuler</button>
          <button class="btn btn-primary" id="exp-download">Exporter</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('exp-cancel').addEventListener('click', () => modal.remove());
    document.getElementById('exp-download').addEventListener('click', () => {
      this.options.vignette = document.getElementById('exp-vignette').checked;
      this.options.paperGrain = document.getElementById('exp-grain').checked;
      this.options.labelRotation = document.getElementById('exp-rotation').checked;
      this.options.cornerDecorations = document.getElementById('exp-corners').checked;
      this.options.cartouche = document.getElementById('exp-cartouche').checked;
      this.options.compassStyle = document.getElementById('exp-compass').value;
      this.options.scaleBar = document.getElementById('exp-scale').checked;
      this.options.scaleValue = document.getElementById('exp-scale-value').value;
      this.options.scaleUnit = document.getElementById('exp-scale-unit').value;
      this.options.cartoucheAuthor = document.getElementById('exp-author').value;
      this.options.cartoucheDate = document.getElementById('exp-date').value;
      modal.remove();
      onExport(this.options);
    });
  }

  generateSVG(world, entities, opts) {
    const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    // Compute bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of entities) {
      const d = e.data;
      if (d.x !== undefined) { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); minY = Math.min(minY, d.y); maxY = Math.max(maxY, d.y); }
      if (d.points) for (const p of d.points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
      if (d.x1 !== undefined) { minX = Math.min(minX, d.x1, d.x2); maxX = Math.max(maxX, d.x1, d.x2); minY = Math.min(minY, d.y1, d.y2); maxY = Math.max(maxY, d.y1, d.y2); }
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1000; maxY = 700; }
    const pad = 100;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const vw = maxX - minX, vh = maxY - minY;

    // Seed for rotation randomness
    const seed = world.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const pseudoRandom = (i) => (Math.sin(seed * 127 + i * 311) * 10000) % 1;

    let defs = '';
    let content = '';

    // Parchment background filter
    if (opts.paperGrain) {
      defs += `<filter id="parchment"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/><feDiffuseLighting in="noise" lighting-color="#F5F0E8" surfaceScale="2"><feDistantLight azimuth="45" elevation="55"/></feDiffuseLighting></filter>`;
    }

    // Vignette
    if (opts.vignette) {
      defs += `<radialGradient id="vignette" cx="50%" cy="50%" r="70%"><stop offset="60%" stop-color="transparent"/><stop offset="100%" stop-color="rgba(0,0,0,0.3)"/></radialGradient>`;
    }

    // Background
    content += `<rect x="${minX}" y="${minY}" width="${vw}" height="${vh}" fill="#F5F0E8"${opts.paperGrain ? ' filter="url(#parchment)"' : ''}/>`;

    // Entities
    let labelIdx = 0;
    for (const e of entities) {
      const d = e.data;
      const labelRot = opts.labelRotation ? (pseudoRandom(labelIdx++) * 4 - 2) : 0;

      if (e.type === 'territory' && d.points && d.points.length >= 3) {
        const pts = d.points.map(p => `${p.x},${p.y}`).join(' ');
        content += `<polygon points="${pts}" fill="${d.color||'#8B2635'}" fill-opacity="0.25" stroke="${d.color||'#8B2635'}" stroke-width="2.5"/>\n`;
        if (e.name) {
          const cx = d.points.reduce((s,p)=>s+p.x,0)/d.points.length;
          const cy = d.points.reduce((s,p)=>s+p.y,0)/d.points.length;
          content += `<text x="${cx}" y="${cy}" text-anchor="middle" font-family="Cinzel,serif" font-size="16" fill="#2C1810"${labelRot ? ` transform="rotate(${labelRot.toFixed(1)},${cx},${cy})"` : ''}>${esc(e.name)}</text>\n`;
        }
      } else if (e.type === 'city') {
        const r = d.importance==='capital'?8:d.importance==='city'?5:3;
        content += `<circle cx="${d.x}" cy="${d.y}" r="${r}" fill="#2C1810"/>\n`;
        if (e.name) {
          const lx = d.x+(d.labelOffsetX||10);
          const ly = d.y+(d.labelOffsetY||-10);
          content += `<text x="${lx}" y="${ly}" font-family="Cinzel,serif" font-size="${d.importance==='capital'?14:11}" fill="#2C1810"${labelRot ? ` transform="rotate(${labelRot.toFixed(1)},${lx},${ly})"` : ''}>${esc(e.name)}</text>\n`;
        }
      } else if (e.type === 'route' && d.x1 !== undefined) {
        const stroke = d.style==='royal'?'#8B2635':d.style==='road'?'#2C1810':'#888';
        const sw = d.style==='royal'?3:d.style==='road'?2:1;
        const dash = d.style==='trail'?' stroke-dasharray="6,4"':'';
        if (d.cx1 !== undefined) content += `<path d="M${d.x1},${d.y1} C${d.cx1},${d.cy1} ${d.cx2},${d.cy2} ${d.x2},${d.y2}" fill="none" stroke="${stroke}" stroke-width="${sw}"${dash}/>\n`;
        else content += `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="${stroke}" stroke-width="${sw}"${dash}/>\n`;
      } else if (e.type === 'text') {
        const lx = d.x, ly = d.y;
        content += `<text x="${lx}" y="${ly}" font-family="Cinzel,serif" font-size="${d.fontSize||16}" fill="#2C1810"${labelRot ? ` transform="rotate(${labelRot.toFixed(1)},${lx},${ly})"` : ''}>${esc(e.name||d.text||'')}</text>\n`;
      } else if (e.type === 'region' && d.points && d.points.length >= 3) {
        const pts = d.points.map(p => `${p.x},${p.y}`).join(' ');
        content += `<polygon points="${pts}" fill="#999" fill-opacity="0.15" stroke="#666" stroke-width="1"/>\n`;
      } else if (e.type === 'symbol') {
        const sym = window.ALL_SYMBOLS ? window.ALL_SYMBOLS.find(s => s.id === d.symbolId) : null;
        if (sym) {
          const sz = d.size || 32;
          content += `<g transform="translate(${d.x - sz/2},${d.y - sz/2}) scale(${sz/24})">${sym.svg.replace(/currentColor/g, d.color || '#2C1810')}</g>\n`;
          if (e.name) {
            content += `<text x="${d.x}" y="${d.y + sz/2 + 14}" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="${d.color||'#2C1810'}">${esc(e.name)}</text>\n`;
          }
        }
      }
    }

    // Vignette overlay
    if (opts.vignette) {
      content += `<rect x="${minX}" y="${minY}" width="${vw}" height="${vh}" fill="url(#vignette)"/>`;
    }

    // Corner decorations
    if (opts.cornerDecorations) {
      const cornerSvg = (tx, ty, sx, sy) =>
        `<g transform="translate(${tx},${ty}) scale(${sx},${sy})"><path d="M0 0 L40 0 L40 5 L5 5 L5 40 L0 40 Z" fill="none" stroke="#2C1810" stroke-width="2"/><path d="M8 8 L30 8 L30 11 L11 11 L11 30 L8 30 Z" fill="none" stroke="#2C1810" stroke-width="1" opacity="0.5"/></g>`;
      content += cornerSvg(minX + 15, minY + 15, 1, 1);
      content += cornerSvg(maxX - 15, minY + 15, -1, 1);
      content += cornerSvg(minX + 15, maxY - 15, 1, -1);
      content += cornerSvg(maxX - 15, maxY - 15, -1, -1);
    }

    // Compass rose
    const cx = minX + vw - 80, cy = minY + vh - 80;
    content += this._compassSvg(opts.compassStyle, cx, cy);

    // Scale bar
    if (opts.scaleBar) {
      const sx = minX + 60, sy = maxY - 40;
      const barW = 120;
      content += `<line x1="${sx}" y1="${sy}" x2="${sx + barW}" y2="${sy}" stroke="#2C1810" stroke-width="2"/>`;
      content += `<line x1="${sx}" y1="${sy - 5}" x2="${sx}" y2="${sy + 5}" stroke="#2C1810" stroke-width="2"/>`;
      content += `<line x1="${sx + barW}" y1="${sy - 5}" x2="${sx + barW}" y2="${sy + 5}" stroke="#2C1810" stroke-width="2"/>`;
      content += `<text x="${sx + barW/2}" y="${sy + 18}" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="#2C1810">${esc(opts.scaleValue)} ${esc(opts.scaleUnit)}</text>`;
    }

    // Title cartouche
    if (opts.cartouche) {
      const tcx = minX + vw / 2, tcy = minY + 55;
      const tw = Math.max(200, world.name.length * 18 + 60);
      content += `<rect x="${tcx - tw/2}" y="${tcy - 35}" width="${tw}" height="60" rx="4" fill="#F5F0E8" stroke="#2C1810" stroke-width="2.5"/>`;
      content += `<rect x="${tcx - tw/2 + 4}" y="${tcy - 31}" width="${tw - 8}" height="52" rx="2" fill="none" stroke="#2C1810" stroke-width="0.5"/>`;
      content += `<text x="${tcx}" y="${tcy}" text-anchor="middle" font-family="Cinzel,serif" font-size="24" font-weight="bold" fill="#2C1810">${esc(world.name)}</text>`;
      if (opts.cartoucheAuthor || opts.cartoucheDate) {
        const sub = [opts.cartoucheAuthor, opts.cartoucheDate].filter(Boolean).join(' — ');
        content += `<text x="${tcx}" y="${tcy + 18}" text-anchor="middle" font-family="Cinzel,serif" font-size="10" fill="#5a4a3a" font-style="italic">${esc(sub)}</text>`;
      }
    } else {
      // Simple title
      content += `<text x="${minX + vw/2}" y="${minY + 50}" text-anchor="middle" font-family="Cinzel,serif" font-size="32" font-weight="bold" fill="#2C1810">${esc(world.name)}</text>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${vw} ${vh}" width="1587" height="1123">
  <defs>${defs}</defs>
  ${content}
</svg>`;
  }

  _compassSvg(style, cx, cy) {
    if (style === 'military') {
      return `<g transform="translate(${cx},${cy})">
        <circle r="30" fill="none" stroke="#2C1810" stroke-width="1.5"/>
        <circle r="2" fill="#2C1810"/>
        <line x1="0" y1="-30" x2="0" y2="-20" stroke="#2C1810" stroke-width="2"/>
        <line x1="0" y1="20" x2="0" y2="30" stroke="#2C1810" stroke-width="1"/>
        <line x1="-30" y1="0" x2="-20" y2="0" stroke="#2C1810" stroke-width="1"/>
        <line x1="20" y1="0" x2="30" y2="0" stroke="#2C1810" stroke-width="1"/>
        <text y="-34" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="#2C1810">N</text>
        <text y="44" text-anchor="middle" font-family="monospace" font-size="8" fill="#888">S</text>
        <text x="38" y="4" text-anchor="middle" font-family="monospace" font-size="8" fill="#888">E</text>
        <text x="-38" y="4" text-anchor="middle" font-family="monospace" font-size="8" fill="#888">W</text>
      </g>`;
    }
    if (style === 'simple') {
      return `<g transform="translate(${cx},${cy})">
        <polygon points="0,-35 5,-10 -5,-10" fill="#2C1810"/>
        <polygon points="0,35 5,10 -5,10" fill="#aaa"/>
        <text y="-40" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="#2C1810">N</text>
      </g>`;
    }
    // ornate (default)
    return `<g transform="translate(${cx},${cy})">
      <polygon points="0,-40 5,-10 -5,-10" fill="#2C1810"/>
      <polygon points="0,40 5,10 -5,10" fill="#8B2635"/>
      <polygon points="-40,0 -10,5 -10,-5" fill="#aaa"/>
      <polygon points="40,0 10,5 10,-5" fill="#aaa"/>
      <circle r="6" fill="none" stroke="#2C1810" stroke-width="1"/>
      <circle r="2" fill="#2C1810"/>
      <text y="-44" text-anchor="middle" font-family="Cinzel,serif" font-size="12" fill="#2C1810">N</text>
      <text y="54" text-anchor="middle" font-family="Cinzel,serif" font-size="9" fill="#888">S</text>
      <text x="48" y="4" text-anchor="middle" font-family="Cinzel,serif" font-size="9" fill="#888">E</text>
      <text x="-48" y="4" text-anchor="middle" font-family="Cinzel,serif" font-size="9" fill="#888">O</text>
    </g>`;
  }
}

window.SvgExportPanel = SvgExportPanel;
