'use strict';

const express = require('express');
const path    = require('path');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Worlds ────────────────────────────────────────────────────────────────

app.get('/api/worlds', (req, res) => {
  res.json(db.getAllWorlds());
});

app.post('/api/worlds', (req, res) => {
  const { name, description } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  res.status(201).json(db.createWorld(name.trim(), description || ''));
});

app.get('/api/worlds/:worldId', (req, res) => {
  const world = db.getWorld(Number(req.params.worldId));
  if (!world) return res.status(404).json({ error: 'not found' });
  res.json(world);
});

app.put('/api/worlds/:worldId', (req, res) => {
  const world = db.getWorld(Number(req.params.worldId));
  if (!world) return res.status(404).json({ error: 'not found' });
  const { name, description } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  res.json(db.updateWorld(Number(req.params.worldId), name.trim(), description || ''));
});

app.delete('/api/worlds/:worldId', (req, res) => {
  const world = db.getWorld(Number(req.params.worldId));
  if (!world) return res.status(404).json({ error: 'not found' });
  db.deleteWorld(Number(req.params.worldId));
  res.status(204).end();
});

// ── Elements ──────────────────────────────────────────────────────────────

app.get('/api/worlds/:worldId/elements', (req, res) => {
  const worldId = Number(req.params.worldId);
  if (!db.getWorld(worldId)) return res.status(404).json({ error: 'world not found' });
  res.json(db.getElements(worldId));
});

app.post('/api/worlds/:worldId/elements', (req, res) => {
  const worldId = Number(req.params.worldId);
  if (!db.getWorld(worldId)) return res.status(404).json({ error: 'world not found' });
  const { type, data } = req.body;
  if (!type) return res.status(400).json({ error: 'type is required' });
  res.status(201).json(db.createElement(worldId, type, data || {}));
});

app.put('/api/worlds/:worldId/elements/:id', (req, res) => {
  const worldId = Number(req.params.worldId);
  const id      = Number(req.params.id);
  if (!db.getWorld(worldId)) return res.status(404).json({ error: 'world not found' });
  const element = db.updateElement(worldId, id, req.body.data || req.body);
  if (!element) return res.status(404).json({ error: 'element not found' });
  res.json(element);
});

app.delete('/api/worlds/:worldId/elements/:id', (req, res) => {
  const worldId = Number(req.params.worldId);
  const id      = Number(req.params.id);
  if (!db.getWorld(worldId)) return res.status(404).json({ error: 'world not found' });
  db.deleteElement(worldId, id);
  res.status(204).end();
});

// ── Events ─────────────────────────────────────────────────────────────────

app.get('/api/worlds/:worldId/events', (req, res) => {
  const worldId = Number(req.params.worldId);
  if (!db.getWorld(worldId)) return res.status(404).json({ error: 'world not found' });
  res.json(db.getEvents(worldId));
});

app.post('/api/worlds/:worldId/events', (req, res) => {
  const worldId = Number(req.params.worldId);
  if (!db.getWorld(worldId)) return res.status(404).json({ error: 'world not found' });
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  res.status(201).json(db.createEvent(worldId, req.body));
});

app.put('/api/worlds/:worldId/events/:id', (req, res) => {
  const worldId = Number(req.params.worldId);
  const id      = Number(req.params.id);
  if (!db.getWorld(worldId)) return res.status(404).json({ error: 'world not found' });
  const event = db.updateEvent(worldId, id, req.body);
  if (!event) return res.status(404).json({ error: 'event not found' });
  res.json(event);
});

app.delete('/api/worlds/:worldId/events/:id', (req, res) => {
  const worldId = Number(req.params.worldId);
  const id      = Number(req.params.id);
  if (!db.getWorld(worldId)) return res.status(404).json({ error: 'world not found' });
  db.deleteEvent(worldId, id);
  res.status(204).end();
});

// ── Export / Import ───────────────────────────────────────────────────────

app.get('/api/worlds/:worldId/export', (req, res) => {
  const worldId = Number(req.params.worldId);
  if (!db.getWorld(worldId)) return res.status(404).json({ error: 'world not found' });
  const data = db.exportWorld(worldId);
  res.setHeader('Content-Disposition',
    `attachment; filename="world-${worldId}.json"`);
  res.json(data);
});

app.post('/api/import', (req, res) => {
  const data = req.body;
  if (!data || !data.world || !data.world.name) {
    return res.status(400).json({ error: 'invalid world data' });
  }
  try {
    const world = db.importWorld(data);
    res.status(201).json(world);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SVG Export ────────────────────────────────────────────────────────────

app.post('/api/worlds/:worldId/export-svg', (req, res) => {
  const worldId = Number(req.params.worldId);
  const world   = db.getWorld(worldId);
  if (!world) return res.status(404).json({ error: 'world not found' });

  const elements = db.getElements(worldId);
  const { width = 1587, height = 1122, title = world.name } = req.body; // A3 landscape px @96dpi

  const svg = buildSVG({ world, elements, width, height, title });
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Content-Disposition',
    `attachment; filename="${world.name.replace(/\s+/g, '-')}.svg"`);
  res.send(svg);
});

function buildSVG({ world, elements, width, height, title }) {
  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  lines.push(`<defs>`);
  lines.push(`  <filter id="parchment">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
    <feBlend in="SourceGraphic" mode="multiply"/>
  </filter>`);
  lines.push(`  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&amp;family=IM+Fell+English&amp;display=swap');
    text { font-family: 'IM Fell English', serif; }
    .title { font-family: 'Cinzel', serif; font-size: 48px; font-weight: 700; }
    .label { font-size: 13px; }
    .city-label { font-size: 11px; }
  </style>`);
  lines.push(`</defs>`);
  // Parchment background
  lines.push(`<rect width="${width}" height="${height}" fill="#F5F0E8" filter="url(#parchment)"/>`);
  lines.push(`<rect width="${width}" height="${height}" fill="none" stroke="#2C1810" stroke-width="8"/>`);
  // Border decoration
  lines.push(`<rect x="16" y="16" width="${width - 32}" height="${height - 32}" fill="none" stroke="#8B2635" stroke-width="2" opacity="0.6"/>`);

  // Render elements
  for (const el of elements) {
    renderElementSVG(el, lines);
  }

  // Title
  lines.push(`<text x="${width / 2}" y="60" text-anchor="middle" class="title" fill="#2C1810">${escXML(title)}</text>`);

  // Scale bar
  lines.push(`<g transform="translate(${width - 220}, ${height - 60})">`);
  lines.push(`  <line x1="0" y1="0" x2="160" y2="0" stroke="#2C1810" stroke-width="2"/>`);
  lines.push(`  <line x1="0" y1="-8" x2="0" y2="8" stroke="#2C1810" stroke-width="2"/>`);
  lines.push(`  <line x1="160" y1="-8" x2="160" y2="8" stroke="#2C1810" stroke-width="2"/>`);
  lines.push(`  <text x="80" y="-12" text-anchor="middle" font-size="11" fill="#2C1810">100 leagues</text>`);
  lines.push(`</g>`);

  // Rose des vents
  lines.push(compassRose(60, height - 80));

  lines.push(`</svg>`);
  return lines.join('\n');
}

function renderElementSVG(el, lines) {
  const d = el.data;
  switch (el.type) {
    case 'territory': {
      if (!d.points || d.points.length < 2) break;
      const pts = d.points.map(p => `${p.x},${p.y}`).join(' ');
      const fill   = d.color || '#8B2635';
      const stroke = shadeColor(fill, -40);
      lines.push(`<polygon points="${pts}" fill="${fill}" fill-opacity="0.25" stroke="${stroke}" stroke-width="3"/>`);
      if (d.name) {
        const cx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
        const cy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;
        lines.push(`<text x="${cx}" y="${cy}" text-anchor="middle" class="label" fill="${stroke}">${escXML(d.name)}</text>`);
      }
      break;
    }
    case 'city': {
      const r = d.importance === 'capital' ? 8 : d.importance === 'city' ? 5 : 3;
      lines.push(`<circle cx="${d.x}" cy="${d.y}" r="${r}" fill="#2C1810" stroke="#F5F0E8" stroke-width="1.5"/>`);
      if (d.name) {
        lines.push(`<text x="${d.x + r + 4}" y="${d.y + 4}" class="city-label" fill="#2C1810">${escXML(d.name)}</text>`);
      }
      break;
    }
    case 'route': {
      if (!d.x1) break;
      const dash = d.style === 'track' ? '4,4' : d.style === 'road' ? 'none' : 'none';
      const sw   = d.style === 'royal' ? 3 : 2;
      const col  = d.style === 'royal' ? '#8B2635' : '#2C1810';
      lines.push(`<path d="M${d.x1},${d.y1} C${d.cx1 || d.x1},${d.cy1 || d.y1} ${d.cx2 || d.x2},${d.cy2 || d.y2} ${d.x2},${d.y2}"
        fill="none" stroke="${col}" stroke-width="${sw}" stroke-dasharray="${dash}" opacity="0.7"/>`);
      break;
    }
    case 'region': {
      if (!d.points || d.points.length < 2) break;
      const pts = d.points.map(p => `${p.x},${p.y}`).join(' ');
      const col = regionColor(d.subtype);
      lines.push(`<polygon points="${pts}" fill="${col}" fill-opacity="0.3" stroke="${col}" stroke-width="1" stroke-dasharray="5,3"/>`);
      break;
    }
    case 'text': {
      lines.push(`<text x="${d.x}" y="${d.y}" font-size="${d.fontSize || 14}" fill="#2C1810">${escXML(d.text || '')}</text>`);
      break;
    }
  }
}

function compassRose(cx, cy) {
  return `<g transform="translate(${cx},${cy})" fill="#2C1810">
    <polygon points="0,-28 5,-5 0,-10 -5,-5" fill="#2C1810"/>
    <polygon points="0,28 5,5 0,10 -5,5" fill="#2C1810" opacity="0.5"/>
    <polygon points="-28,0 -5,-5 -10,0 -5,5" fill="#2C1810" opacity="0.5"/>
    <polygon points="28,0 5,-5 10,0 5,5" fill="#2C1810" opacity="0.5"/>
    <circle cx="0" cy="0" r="4" fill="#8B2635"/>
    <text x="0" y="-34" text-anchor="middle" font-size="11" font-weight="bold">N</text>
  </g>`;
}

function regionColor(subtype) {
  switch (subtype) {
    case 'forest':   return '#2D6A2D';
    case 'mountain': return '#8B6914';
    case 'desert':   return '#C9A84C';
    case 'ocean':    return '#1A5276';
    default:         return '#666666';
  }
}

function shadeColor(hex, pct) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 0xff) + pct));
  const g = Math.min(255, Math.max(0, ((n >> 8)  & 0xff) + pct));
  const b = Math.min(255, Math.max(0, (n & 0xff) + pct));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function escXML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Cartographer running on http://localhost:${PORT}`);
});

module.exports = app; // for testing
