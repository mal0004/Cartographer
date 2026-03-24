/**
 * Cartographer — WorldThumbnail
 * Procedural thumbnail renderer for template cards on the landing page.
 */
const THEME_BG = {
  parchment: { ocean: '#2A4A6B', ink: '#C4A882' },
  blueprint: { ocean: '#0A1520', ink: '#4FC3F7' },
  watercolor: { ocean: '#3A5A7A', ink: '#7B8FB2' },
  nightgold: { ocean: '#0A0A1A', ink: '#C9A84C' },
  modern: { ocean: '#2C3E50', ink: '#333333' },
};

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s & 0x7fffffff) / 0x7fffffff; };
}

function simpleNoise(x, y, seed) {
  const n = Math.sin(seed * 127.1 + x * 311.7 + y * 183.3) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function fbm(x, y, seed, oct) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < oct; i++) { val += simpleNoise(x * freq, y * freq, seed + i * 31) * amp; amp *= 0.5; freq *= 2; }
  return val;
}

class WorldThumbnail {
  constructor(canvas, worldData) {
    this.ctx = canvas.getContext('2d');
    this.world = worldData;
    this.w = canvas.width;
    this.h = canvas.height;
    this.seed = worldData.seed || 42;
    this.colors = THEME_BG[worldData.theme] || THEME_BG.parchment;
  }
  render() {
    this.renderOcean(); this.renderTerritories(); this.renderRivers();
    this.renderRoutes(); this.renderCities(); this.renderVignette();
  }
  renderOcean() {
    const { ctx, w, h, colors, seed } = this;
    ctx.fillStyle = colors.ocean; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.06;
    for (let y = 0; y < h; y += 4)
      for (let x = 0; x < w; x += 4) {
        if (fbm(x / 60, y / 60, seed, 2) > 0.1) { ctx.fillStyle = colors.ink; ctx.fillRect(x, y, 4, 4); }
      }
    ctx.globalAlpha = 1;
  }
  renderTerritories() {
    const { ctx, w, h, seed } = this;
    for (const t of (this.world.territories || [])) {
      if (t.type === 'ocean' || !t.points || t.points.length < 3) continue;
      const path = () => { ctx.beginPath(); ctx.moveTo(t.points[0].x * w, t.points[0].y * h); for (let i = 1; i < t.points.length; i++) ctx.lineTo(t.points[i].x * w, t.points[i].y * h); ctx.closePath(); };
      ctx.save(); path(); ctx.clip();
      ctx.fillStyle = t.color + 'CC'; ctx.fill();
      const rl = t.relief || { intensity: 0.3 };
      const step = 6;
      for (let y = 0; y < h; y += step)
        for (let x = 0; x < w; x += step) {
          const shade = 0.5 + fbm(x / 40, y / 40, seed + 100, 3) * rl.intensity * 0.5;
          if (shade > 0.55) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, step, step); }
          else if (shade < 0.45) { ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x, y, step, step); }
        }
      ctx.strokeStyle = t.color; ctx.lineWidth = 1; path(); ctx.stroke();
      ctx.restore();
    }
  }
  renderRivers() {
    const { ctx, w, h, seed } = this;
    ctx.strokeStyle = '#5A8AAA'; ctx.lineWidth = 1; ctx.lineCap = 'round';
    const rand = seededRand(seed + 200);
    for (const r of (this.world.rivers || [])) {
      let cx = r.source.x * w, cy = r.source.y * h;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      for (let i = 0; i < 8; i++) { cx += (rand() - 0.3) * w * 0.08; cy += rand() * h * 0.06; ctx.lineTo(cx, cy); }
      ctx.stroke();
    }
  }
  renderRoutes() {
    const { ctx, w, h } = this;
    const ents = this.world.entities || [];
    ctx.strokeStyle = '#8A7A6A'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 3]);
    for (const rt of (this.world.routes || [])) {
      const a = ents.find(e => e.id === rt.from), b = ents.find(e => e.id === rt.to);
      if (!a || !b) continue;
      ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  renderCities() {
    const { ctx, w, h, colors } = this;
    for (const e of (this.world.entities || [])) {
      if (e.x === undefined) continue;
      const px = e.x * w, py = e.y * h;
      ctx.fillStyle = colors.ink;
      if (e.importance === 'capital') {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 - Math.PI / 2, r = i % 2 === 0 ? 3 : 1.5;
          i === 0 ? ctx.moveTo(px + Math.cos(a) * r, py + Math.sin(a) * r) : ctx.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
      } else if (e.importance === 'city') {
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
      } else if (e.importance === 'village') {
        ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = colors.ink; ctx.lineWidth = 0.8; ctx.stroke();
      }
    }
  }
  renderVignette() {
    const { ctx, w, h } = this;
    const r = Math.max(w, h) * 0.65;
    const grad = ctx.createRadialGradient(w / 2, h / 2, r * 0.4, w / 2, h / 2, r);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  }
}

export { WorldThumbnail };
