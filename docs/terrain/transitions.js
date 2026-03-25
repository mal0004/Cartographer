/**
 * Cartographer — Terrain Transitions
 *
 * Detects adjacent territory pairs and renders gradient transitions
 * between different biomes for smoother visual blending.
 */

const TRANSITION_WIDTHS = {
  'plain_mountain':  35,
  'plain_forest':    25,
  'plain_desert':    40,
  'plain_ocean':     30,
  'hills_mountain':  25,
  'hills_plain':     30,
  'desert_ocean':    35,
  'marsh_ocean':     25,
  'forest_mountain': 30,
};

const TRANSITION_COLORS = {
  'plain_mountain':  ['#8B9B6B', '#8B8682'],
  'plain_forest':    ['#8B9B6B', '#4A6B4A'],
  'plain_desert':    ['#8B9B6B', '#C4A35A'],
  'plain_ocean':     ['#8B9B6B', '#4A6B8B'],
  'hills_mountain':  ['#A0926B', '#8B8682'],
  'hills_plain':     ['#A0926B', '#8B9B6B'],
  'desert_ocean':    ['#C4A35A', '#4A6B8B'],
  'marsh_ocean':     ['#5B7B5B', '#4A6B8B'],
  'forest_mountain': ['#4A6B4A', '#8B8682'],
};

export class TerrainTransitions {
  constructor() {
    this._cache = new Map();
  }

  invalidate() {
    this._cache.clear();
  }

  detectAdjacentPairs(territories) {
    const pairs = [];
    for (let i = 0; i < territories.length; i++) {
      for (let j = i + 1; j < territories.length; j++) {
        const t1 = territories[i], t2 = territories[j];
        if (!t1.data.points || !t2.data.points) continue;
        if (this._minDistance(t1.data.points, t2.data.points) < 30) {
          pairs.push([t1, t2]);
        }
      }
    }
    return pairs;
  }

  _minDistance(pts1, pts2) {
    let min = Infinity;
    const step1 = Math.max(1, Math.floor(pts1.length / 20));
    const step2 = Math.max(1, Math.floor(pts2.length / 20));
    for (let i = 0; i < pts1.length; i += step1) {
      for (let j = 0; j < pts2.length; j += step2) {
        const dx = pts1[i].x - pts2[j].x, dy = pts1[i].y - pts2[j].y;
        const d = dx * dx + dy * dy;
        if (d < min) min = d;
      }
    }
    return Math.sqrt(min);
  }

  renderTransition(ctx, t1, t2) {
    const biome1 = t1.data.terrainType || 'plain';
    const biome2 = t2.data.terrainType || 'plain';
    if (biome1 === biome2) return;

    const key = [biome1, biome2].sort().join('_');
    const width = TRANSITION_WIDTHS[key] || 30;
    const colors = TRANSITION_COLORS[key] || [t1.data.color, t2.data.color];

    const closest = this._closestPoints(t1.data.points, t2.data.points);
    if (!closest) return;

    const { p1, p2 } = closest;
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    ctx.save();
    ctx.globalAlpha = 0.5;
    const grad = ctx.createLinearGradient(
      mx - (dx / len) * width, my - (dy / len) * width,
      mx + (dx / len) * width, my + (dy / len) * width,
    );
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.5, 'transparent');
    grad.addColorStop(1, colors[1]);

    ctx.fillStyle = grad;
    const perpX = -dy / len, perpY = dx / len;
    const spread = width * 2;
    ctx.beginPath();
    ctx.moveTo(mx - perpX * spread - (dx / len) * width, my - perpY * spread - (dy / len) * width);
    ctx.lineTo(mx + perpX * spread - (dx / len) * width, my + perpY * spread - (dy / len) * width);
    ctx.lineTo(mx + perpX * spread + (dx / len) * width, my + perpY * spread + (dy / len) * width);
    ctx.lineTo(mx - perpX * spread + (dx / len) * width, my - perpY * spread + (dy / len) * width);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _closestPoints(pts1, pts2) {
    let min = Infinity, best = null;
    const step1 = Math.max(1, Math.floor(pts1.length / 30));
    const step2 = Math.max(1, Math.floor(pts2.length / 30));
    for (let i = 0; i < pts1.length; i += step1) {
      for (let j = 0; j < pts2.length; j += step2) {
        const dx = pts1[i].x - pts2[j].x, dy = pts1[i].y - pts2[j].y;
        const d = dx * dx + dy * dy;
        if (d < min) { min = d; best = { p1: pts1[i], p2: pts2[j] }; }
      }
    }
    return best;
  }

  renderAll(ctx, territories) {
    const pairs = this.detectAdjacentPairs(territories);
    for (const [t1, t2] of pairs) {
      this.renderTransition(ctx, t1, t2);
    }
  }
}
