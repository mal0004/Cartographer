const express = require('express');
const path = require('path');
const { Worlds, Entities, Events, Shares, importExport } = require('./db');
const { nanoid } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Worlds ──────────────────────────────────────────────────────

app.get('/api/worlds', (_req, res) => {
  res.json(Worlds.all());
});

app.get('/api/worlds/:id', (req, res) => {
  const world = Worlds.get(Number(req.params.id));
  if (!world) return res.status(404).json({ error: 'World not found' });
  res.json(world);
});

app.post('/api/worlds', (req, res) => {
  const world = Worlds.create(req.body);
  res.status(201).json(world);
});

app.put('/api/worlds/:id', (req, res) => {
  const world = Worlds.update(Number(req.params.id), req.body);
  if (!world) return res.status(404).json({ error: 'World not found' });
  res.json(world);
});

app.delete('/api/worlds/:id', (req, res) => {
  Worlds.delete(Number(req.params.id));
  res.json({ ok: true });
});

// ─── Entities ────────────────────────────────────────────────────

app.get('/api/worlds/:wid/entities', (req, res) => {
  res.json(Entities.allForWorld(Number(req.params.wid)));
});

app.get('/api/entities/:id', (req, res) => {
  const entity = Entities.get(Number(req.params.id));
  if (!entity) return res.status(404).json({ error: 'Entity not found' });
  res.json(entity);
});

app.post('/api/worlds/:wid/entities', (req, res) => {
  const entity = Entities.create({ ...req.body, world_id: Number(req.params.wid) });
  res.status(201).json(entity);
});

app.put('/api/entities/:id', (req, res) => {
  const entity = Entities.update(Number(req.params.id), req.body);
  if (!entity) return res.status(404).json({ error: 'Entity not found' });
  res.json(entity);
});

app.delete('/api/entities/:id', (req, res) => {
  Entities.delete(Number(req.params.id));
  res.json({ ok: true });
});

// ─── Events ──────────────────────────────────────────────────────

app.get('/api/worlds/:wid/events', (req, res) => {
  res.json(Events.allForWorld(Number(req.params.wid)));
});

app.get('/api/events/:id', (req, res) => {
  const event = Events.get(Number(req.params.id));
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

app.post('/api/worlds/:wid/events', (req, res) => {
  const event = Events.create({ ...req.body, world_id: Number(req.params.wid) });
  res.status(201).json(event);
});

app.put('/api/events/:id', (req, res) => {
  const event = Events.update(Number(req.params.id), req.body);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

app.delete('/api/events/:id', (req, res) => {
  Events.delete(Number(req.params.id));
  res.json({ ok: true });
});

// ─── Import / Export ─────────────────────────────────────────────

app.get('/api/worlds/:id/export', (req, res) => {
  const dump = importExport.exportWorld(Number(req.params.id));
  if (!dump) return res.status(404).json({ error: 'World not found' });
  res.setHeader('Content-Disposition', `attachment; filename="${dump.world.name}.json"`);
  res.json(dump);
});

app.post('/api/worlds/import', (req, res) => {
  const world = importExport.importWorld(req.body);
  res.status(201).json(world);
});

// ─── SVG Export ──────────────────────────────────────────────────

app.get('/api/worlds/:id/svg', (req, res) => {
  const world = Worlds.get(Number(req.params.id));
  if (!world) return res.status(404).json({ error: 'World not found' });
  const entities = Entities.allForWorld(world.id);

  const width = Number(req.query.width) || 1587;   // A3 landscape mm→px ~
  const height = Number(req.query.height) || 1123;

  // Compute bounds from entities
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const e of entities) {
    const d = e.data;
    if (d.x !== undefined) { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); minY = Math.min(minY, d.y); maxY = Math.max(maxY, d.y); }
    if (d.points) for (const p of d.points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    if (d.x1 !== undefined) { minX = Math.min(minX, d.x1, d.x2); maxX = Math.max(maxX, d.x1, d.x2); minY = Math.min(minY, d.y1, d.y2); maxY = Math.max(maxY, d.y1, d.y2); }
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1000; maxY = 700; }
  const pad = 80;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const vw = maxX - minX;
  const vh = maxY - minY;

  let svgContent = '';

  // Render each entity
  for (const e of entities) {
    const d = e.data;
    switch (e.type) {
      case 'territory': {
        if (!d.points || d.points.length < 3) break;
        const pts = d.points.map(p => `${p.x},${p.y}`).join(' ');
        const fill = d.color || '#8B2635';
        svgContent += `<polygon points="${pts}" fill="${fill}" fill-opacity="0.25" stroke="${fill}" stroke-width="2.5" />\n`;
        if (e.name) {
          const cx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
          const cy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;
          svgContent += `<text x="${cx}" y="${cy}" text-anchor="middle" font-family="Cinzel, serif" font-size="16" fill="#2C1810">${escapeXml(e.name)}</text>\n`;
        }
        break;
      }
      case 'city': {
        const r = d.importance === 'capital' ? 8 : d.importance === 'city' ? 5 : 3;
        const shape = d.importance === 'capital'
          ? `<polygon points="${d.x},${d.y - r} ${d.x + r},${d.y + r} ${d.x - r},${d.y + r}" fill="#2C1810" />`
          : `<circle cx="${d.x}" cy="${d.y}" r="${r}" fill="#2C1810" />`;
        svgContent += shape + '\n';
        if (e.name) {
          const lx = d.labelOffsetX || 10;
          const ly = d.labelOffsetY || -10;
          svgContent += `<text x="${d.x + lx}" y="${d.y + ly}" font-family="Cinzel, serif" font-size="${d.importance === 'capital' ? 14 : 11}" fill="#2C1810">${escapeXml(e.name)}</text>\n`;
        }
        break;
      }
      case 'route': {
        const stroke = d.style === 'royal' ? '#8B2635' : d.style === 'road' ? '#2C1810' : '#888';
        const sw = d.style === 'royal' ? 3 : d.style === 'road' ? 2 : 1;
        const dash = d.style === 'trail' ? ' stroke-dasharray="6,4"' : '';
        if (d.cx1 !== undefined) {
          svgContent += `<path d="M${d.x1},${d.y1} C${d.cx1},${d.cy1} ${d.cx2},${d.cy2} ${d.x2},${d.y2}" fill="none" stroke="${stroke}" stroke-width="${sw}"${dash} />\n`;
        } else {
          svgContent += `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="${stroke}" stroke-width="${sw}"${dash} />\n`;
        }
        break;
      }
      case 'region': {
        if (!d.points || d.points.length < 3) break;
        const pts = d.points.map(p => `${p.x},${p.y}`).join(' ');
        const patternId = `pat-${e.id}`;
        const patternSvg = regionPattern(d.terrain, patternId);
        svgContent += patternSvg;
        svgContent += `<polygon points="${pts}" fill="url(#${patternId})" fill-opacity="0.5" stroke="#666" stroke-width="1" />\n`;
        break;
      }
      case 'text': {
        const size = d.fontSize || 16;
        const style = d.fontStyle === 'italic' ? ' font-style="italic"' : '';
        svgContent += `<text x="${d.x}" y="${d.y}" font-family="Cinzel, serif" font-size="${size}"${style} fill="#2C1810">${escapeXml(e.name || d.text || '')}</text>\n`;
        break;
      }
    }
  }

  // Compass rose
  const compassX = minX + vw - 60;
  const compassY = minY + vh - 60;
  const compass = `
    <g transform="translate(${compassX},${compassY})">
      <polygon points="0,-40 5,-10 -5,-10" fill="#2C1810"/>
      <polygon points="0,40 5,10 -5,10" fill="#8B2635"/>
      <polygon points="-40,0 -10,5 -10,-5" fill="#aaa"/>
      <polygon points="40,0 10,5 10,-5" fill="#aaa"/>
      <text y="-44" text-anchor="middle" font-family="Cinzel,serif" font-size="12" fill="#2C1810">N</text>
    </g>`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${vw} ${vh}" width="${width}" height="${height}">
  <defs>
    <filter id="parchment">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/>
      <feDiffuseLighting in="noise" lighting-color="#F5F0E8" surfaceScale="2">
        <feDistantLight azimuth="45" elevation="55"/>
      </feDiffuseLighting>
    </filter>
  </defs>
  <rect x="${minX}" y="${minY}" width="${vw}" height="${vh}" fill="#F5F0E8" filter="url(#parchment)"/>
  <text x="${minX + vw / 2}" y="${minY + 50}" text-anchor="middle" font-family="Cinzel, serif" font-size="32" font-weight="bold" fill="#2C1810">${escapeXml(world.name)}</text>
  ${svgContent}
  ${compass}
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Content-Disposition', `attachment; filename="${world.name}.svg"`);
  res.send(svg);
});

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function regionPattern(terrain, id) {
  switch (terrain) {
    case 'forest':
      return `<pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse">
        <line x1="10" y1="18" x2="10" y2="8" stroke="#2d5016" stroke-width="2"/>
        <circle cx="10" cy="6" r="5" fill="#3a7a1a" opacity="0.6"/>
      </pattern>\n`;
    case 'mountain':
      return `<pattern id="${id}" width="24" height="20" patternUnits="userSpaceOnUse">
        <polyline points="0,20 12,4 24,20" fill="none" stroke="#555" stroke-width="1.5"/>
        <polyline points="8,20 16,8 24,20" fill="none" stroke="#777" stroke-width="1"/>
      </pattern>\n`;
    case 'desert':
      return `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="1" fill="#c4a35a"/>
        <circle cx="9" cy="9" r="1" fill="#c4a35a"/>
        <circle cx="9" cy="3" r="0.5" fill="#d4b36a"/>
      </pattern>\n`;
    case 'ocean':
      return `<pattern id="${id}" width="30" height="10" patternUnits="userSpaceOnUse">
        <path d="M0,5 Q7.5,0 15,5 Q22.5,10 30,5" fill="none" stroke="#2266aa" stroke-width="1.5"/>
      </pattern>\n`;
    default:
      return `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse">
        <line x1="0" y1="10" x2="10" y2="0" stroke="#aaa" stroke-width="0.5"/>
      </pattern>\n`;
  }
}

// ─── Sharing ────────────────────────────────────────────────────

app.post('/api/worlds/:id/share', (req, res) => {
  const world = Worlds.get(Number(req.params.id));
  if (!world) return res.status(404).json({ error: 'World not found' });
  const token = nanoid(12);
  const { expires } = req.body || {};
  let expiresAt = null;
  if (expires === '24h') expiresAt = new Date(Date.now() + 86400000).toISOString();
  else if (expires === '7d') expiresAt = new Date(Date.now() + 604800000).toISOString();
  else if (expires === '30d') expiresAt = new Date(Date.now() + 2592000000).toISOString();
  const share = Shares.create(world.id, token, expiresAt);
  res.status(201).json(share);
});

app.get('/api/worlds/:id/shares', (req, res) => {
  res.json(Shares.allForWorld(Number(req.params.id)));
});

app.delete('/api/shares/:token', (req, res) => {
  Shares.deleteByToken(req.params.token);
  res.json({ ok: true });
});

app.get('/share/:token', (req, res) => {
  const share = Shares.getByToken(req.params.token);
  if (!share) return res.status(404).send('Share link expired or not found.');
  res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

app.get('/api/share/:token', (req, res) => {
  const share = Shares.getByToken(req.params.token);
  if (!share) return res.status(404).json({ error: 'Share not found or expired' });
  const world = Worlds.get(share.world_id);
  if (!world) return res.status(404).json({ error: 'World not found' });
  const entities = Entities.allForWorld(share.world_id);
  const events = Events.allForWorld(share.world_id);
  res.json({ world, entities, events });
});

// ─── SPA fallback ────────────────────────────────────────────────

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🗺️  Cartographer running at http://localhost:${PORT}`);
});
