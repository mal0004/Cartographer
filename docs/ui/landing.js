/**
 * Cartographer — Landing Page
 *
 * Hero procedural map, scroll animations, GitHub stats,
 * template carousel rendering.
 */

import { WORLD_TEMPLATES } from '../data/templates.js';
import { api, escapeHtml } from '../data/storage.js';
import { drawWorldPreview, observeCards } from '../data/worlds.js';
import { t } from '../i18n.js';

// ─── Hero procedural SVG map ─────────────────────────────

export function renderHeroMap() {
  const svg = document.getElementById('hero-map-bg');
  if (!svg) return;
  const seed = 4892;
  const rand = (i) => ((Math.sin(seed * 127.1 + i * 311.7) * 43758.5453) % 1 + 1) % 1;
  const W = 1400, H = 700;
  let out = '';

  for (let x = 0; x <= W; x += 100)
    out += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#C4A882" stroke-width="0.3" stroke-opacity="0.08"/>\n`;
  for (let y = 0; y <= H; y += 80)
    out += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#C4A882" stroke-width="0.3" stroke-opacity="0.08"/>\n`;

  const landmasses = [];
  function makeBlob(k, cx, cy, baseR, nPts) {
    const pts = [];
    const n = nPts || (7 + Math.floor(rand(k * 10 + 2) * 5));
    const r = baseR || (50 + rand(k * 10 + 3) * 140);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.65 + rand(k * 100 + i) * 0.7);
      pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    }
    landmasses.push({ cx, cy, r, pts });
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      d += ` Q${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
    }
    return d + ' Z';
  }

  const blobs = [
    [0,250,250,140],[1,550,180,110],[2,800,350,160],[3,1050,200,100],[4,350,480,90],
    [5,700,520,80],[6,1200,450,120],[7,150,500,70],[8,950,550,65],[9,480,350,55],
  ];
  for (const [k, cx, cy, r] of blobs) {
    out += `<path d="${makeBlob(k, cx, cy, r)}" fill="#C4A882" fill-opacity="0.12" stroke="#C4A882" stroke-width="1.2" stroke-opacity="0.2"/>\n`;
    out += `<path d="${makeBlob(k + 50, cx, cy, r * 0.55)}" fill="none" stroke="#C4A882" stroke-width="0.5" stroke-opacity="0.12" stroke-dasharray="4,3"/>\n`;
  }

  const rivers = [
    {x1:280,y1:170,cx:320,cy:280,x2:380,y2:480},{x1:780,y1:260,cx:820,cy:380,x2:720,y2:520},
    {x1:1020,y1:140,cx:1080,cy:250,x2:1050,y2:380},{x1:530,y1:160,cx:560,cy:240,x2:490,y2:350},
  ];
  for (const rv of rivers)
    out += `<path d="M${rv.x1},${rv.y1} Q${rv.cx},${rv.cy} ${rv.x2},${rv.y2}" fill="none" stroke="#5A7A9A" stroke-width="1" stroke-opacity="0.2" stroke-linecap="round"/>\n`;

  const cities = [
    [220,220,4],[290,300,3],[560,180,4],[520,200,2.5],[810,320,5],[850,370,2.5],[770,400,3],
    [1060,190,3.5],[1040,240,2],[370,450,3],[700,500,2.5],[1180,420,3],[160,480,2],[950,530,2],[480,340,2.5],
  ];
  for (const [cx, cy, r] of cities)
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#C4A882" fill-opacity="0.25"/>\n`;

  const markers = [[220,220],[560,180],[810,320],[1060,190]];
  for (const [mx, my] of markers)
    out += `<path d="M${mx-4},${my} L${mx+4},${my} M${mx},${my-4} L${mx},${my+4}" stroke="#C4A882" stroke-width="0.6" stroke-opacity="0.3"/>\n`;

  svg.innerHTML = out;

  const homeScreen = document.getElementById('home-screen');
  const heroMap = document.getElementById('lp-hero-map');
  if (homeScreen && heroMap) {
    homeScreen.addEventListener('scroll', () => {
      heroMap.style.transform = `translateY(${homeScreen.scrollTop * 0.3}px)`;
    }, { passive: true });
  }
}

// ─── Scroll animations ───────────────────────────────────

export function initLandingAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const siblings = el.parentNode.querySelectorAll('.lp-stats-item');
        el.style.transitionDelay = (Array.from(siblings).indexOf(el) * 0.12) + 's';
        el.classList.add('lp-visible');
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.lp-stats-item').forEach(el => obs.observe(el));

  const featObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); featObs.unobserve(entry.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.lp-feature').forEach((el, i) => { el.style.transitionDelay = (i % 2 === 0 ? '0s' : '0.1s'); featObs.observe(el); });

  const osSection = document.querySelector('.lp-opensource-section');
  if (osSection) {
    const osObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); osObs.unobserve(entry.target); } });
    }, { threshold: 0.2 });
    osObs.observe(osSection);
  }

  fetch('https://api.github.com/repos/mal0004/Cartographer')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data) return;
      const s = document.getElementById('lp-gh-stars'), f = document.getElementById('lp-gh-forks'), i = document.getElementById('lp-gh-issues');
      if (s) s.textContent = data.stargazers_count ?? '—';
      if (f) f.textContent = data.forks_count ?? '—';
      if (i) i.textContent = data.open_issues_count ?? '—';
    }).catch(() => {});
}

// ─── Template carousel ───────────────────────────────────

export function renderTemplates(app) {
  const grid = document.getElementById('templates-grid');
  if (!grid || !WORLD_TEMPLATES) return;
  grid.innerHTML = '';

  const tagMap = {
    'fantasy-continent': ['Fantasy', 'Royaumes', 'Villes'],
    'mysterious-archipelago': ['Îles', 'Maritime', 'Mystère'],
    'desert-empire': ['Désert', 'Empire', 'Antique'],
    'medieval-region': ['Médiéval', 'Régional', 'Comté'],
    'post-apocalyptic': ['Sci-Fi', 'Ruines', 'Survie'],
  };

  for (const tpl of WORLD_TEMPLATES) {
    const card = document.createElement('div');
    card.className = 'lp-tpl-card';
    const tags = (tagMap[tpl.id] || []).map(t => `<span class="lp-tpl-tag">${t}</span>`).join('');
    card.innerHTML = `
      <canvas class="lp-tpl-preview" width="280" height="160"></canvas>
      <div class="lp-tpl-info">
        <h4 class="lp-tpl-name">${escapeHtml(tpl.name)}</h4>
        <p class="lp-tpl-desc">${escapeHtml(tpl.description)}</p>
        <div class="lp-tpl-tags">${tags}</div>
        <button class="lp-tpl-use">${t('landing.templates.useTemplate')}</button>
      </div>`;
    card.addEventListener('click', async () => {
      const importData = {
        world: { ...tpl.world },
        entities: tpl.entities.map(e => ({ ...e, data: { ...e.data } })),
        events: (tpl.events || []).map(ev => ({ ...ev })),
      };
      const world = await api('POST', '/api/worlds/import', importData);
      app.openWorld(world.id);
    });
    grid.appendChild(card);
    drawWorldPreview(card.querySelector('.lp-tpl-preview'), tpl.entities);
  }

  const prev = document.querySelector('.lp-carousel-prev');
  const next = document.querySelector('.lp-carousel-next');
  if (prev && next) {
    prev.addEventListener('click', () => grid.scrollBy({ left: -300, behavior: 'smooth' }));
    next.addEventListener('click', () => grid.scrollBy({ left: 300, behavior: 'smooth' }));
  }
  observeCards();
}
