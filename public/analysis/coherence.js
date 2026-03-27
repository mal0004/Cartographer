/**
 * Cartographer — Coherence Engine
 *
 * Analyses world geography and returns issues with severity + fix suggestions.
 * Score 0-100: 100 = perfectly coherent world.
 */

import { t } from '../i18n.js';

const HIGH = 'HIGH', MEDIUM = 'MEDIUM', LOW = 'LOW';
let _uid = 0;

export class CoherenceEngine {
  constructor(entities, canvasW = 1200, canvasH = 800) {
    this.entities = entities || [];
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.issues = [];
    this.suggestions = [];
  }

  analyze() {
    this.issues = [];
    this.suggestions = [];
    _uid = 0;
    this._buildCaches();
    this.checkRivers();
    this.checkBiomes();
    this.checkEntities();
    this.checkClimatic();
    this.checkPolitical();
    return { issues: this.issues, suggestions: this.suggestions, ...this.calculateScore() };
  }

  // ── Cache helpers ──────────────────────────────────────────

  _buildCaches() {
    this.territories = this.entities.filter(e => e.type === 'territory');
    this.regions = this.entities.filter(e => e.type === 'region');
    this.cities = this.entities.filter(e => e.type === 'city');
    this.rivers = this.entities.filter(e => e.type === 'river');
    this.routes = this.entities.filter(e => e.type === 'route');
    this.symbols = this.entities.filter(e => e.type === 'symbol');
    this.allPolygons = [...this.territories, ...this.regions];
    this._adjacencyCache = null;
  }

  _center(entity) {
    const d = entity.data;
    if (d.x !== undefined) return { x: d.x, y: d.y };
    if (d.points && d.points.length > 0) {
      const cx = d.points.reduce((s, p) => s + p.x, 0) / d.points.length;
      const cy = d.points.reduce((s, p) => s + p.y, 0) / d.points.length;
      return { x: cx, y: cy };
    }
    return { x: this.canvasW / 2, y: this.canvasH / 2 };
  }

  _dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  _terrainOf(territory) {
    return territory.data.terrainType || territory.data.terrain || '';
  }

  _findContaining(px, py) {
    for (const t of this.allPolygons) {
      if (t.data.points && this._pointInPoly(px, py, t.data.points)) return t;
    }
    return null;
  }

  _pointInPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  _getAdjacentPairs() {
    if (this._adjacencyCache) return this._adjacencyCache;
    const pairs = [];
    for (let i = 0; i < this.allPolygons.length; i++) {
      for (let j = i + 1; j < this.allPolygons.length; j++) {
        const a = this.allPolygons[i], b = this.allPolygons[j];
        if (this._polygonsClose(a.data.points, b.data.points, 30)) {
          pairs.push([a, b]);
        }
      }
    }
    this._adjacencyCache = pairs;
    return pairs;
  }

  _polygonsClose(ptsA, ptsB, threshold) {
    if (!ptsA || !ptsB) return false;
    const stepA = Math.max(1, Math.floor(ptsA.length / 15));
    const stepB = Math.max(1, Math.floor(ptsB.length / 15));
    for (let i = 0; i < ptsA.length; i += stepA) {
      for (let j = 0; j < ptsB.length; j += stepB) {
        if (Math.hypot(ptsA[i].x - ptsB[j].x, ptsA[i].y - ptsB[j].y) < threshold) return true;
      }
    }
    return false;
  }

  _nearOcean(px, py, threshold = 40) {
    for (const t of this.allPolygons) {
      const terrain = this._terrainOf(t);
      if (terrain !== 'ocean') continue;
      if (!t.data.points) continue;
      for (const p of t.data.points) {
        if (Math.hypot(px - p.x, py - p.y) < threshold) return true;
      }
    }
    return false;
  }

  _addIssue(severity, category, msgKey, params = {}) {
    this.issues.push({
      id: `issue_${++_uid}`,
      severity,
      category,
      message: this._t(msgKey, params),
      messageKey: msgKey,
      entityId: params.entityId || null,
      territoryId: params.territoryId || null,
      fix: params.fix ? this._t(params.fix, params) : '',
    });
  }

  _addSuggestion(category, msgKey, params = {}) {
    this.suggestions.push({
      id: `sug_${++_uid}`,
      severity: 'SUGGESTION',
      category,
      message: this._t(msgKey, params),
      messageKey: msgKey,
      entityId: params.entityId || null,
      territoryId: params.territoryId || null,
    });
  }

  _t(key, params = {}) {
    let s = t(`analysis.coherence.${key}`);
    if (s === `analysis.coherence.${key}`) s = key;
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === 'string' || typeof v === 'number') s = s.replace(`{${k}}`, v);
    }
    return s;
  }

  // ── River checks ──────────────────────────────────────────

  checkRivers() {
    for (const river of this.rivers) {
      const d = river.data;
      const src = d.sourceX !== undefined ? { x: d.sourceX, y: d.sourceY } : null;
      if (src) {
        const srcTer = this._findContaining(src.x, src.y);
        const srcTerrain = srcTer ? this._terrainOf(srcTer) : '';
        if (srcTer && srcTerrain !== 'mountain' && srcTerrain !== 'hills') {
          this._addIssue(MEDIUM, 'rivers', 'riverSource', {
            name: river.name || '?', entityId: river.id,
            fix: 'riverSourceFix',
          });
        }
      }
    }
  }

  // ── Biome checks ──────────────────────────────────────────

  checkBiomes() {
    const pairs = this._getAdjacentPairs();
    for (const [a, b] of pairs) {
      const tA = this._terrainOf(a), tB = this._terrainOf(b);
      if ((tA === 'desert' && tB === 'marsh') || (tA === 'marsh' && tB === 'desert')) {
        this._addIssue(MEDIUM, 'biomes', 'desertSwampAdjacent', {
          territoryId: a.id, nameA: a.name || '?', nameB: b.name || '?',
        });
      }
      const elevA = a.data.terrainIntensity || 0;
      const elevB = b.data.terrainIntensity || 0;
      const isGlacier = (t, e) => t === 'mountain' && e > 85;
      const isForest = (t) => t === 'forest';
      if ((isGlacier(tA, elevA) && isForest(tB)) || (isGlacier(tB, elevB) && isForest(tA))) {
        this._addIssue(HIGH, 'biomes', 'forestGlacier', { territoryId: a.id });
      }
    }
    const mountains = this.allPolygons.filter(t => this._terrainOf(t) === 'mountain');
    for (const mt of mountains) {
      const hasNeighborPlain = pairs.some(([a, b]) => {
        const other = a === mt ? b : b === mt ? a : null;
        if (!other) return false;
        const ot = this._terrainOf(other);
        return ot === 'plain' || ot === 'hills';
      });
      if (!hasNeighborPlain && this.allPolygons.length > 2) {
        this._addSuggestion('biomes', 'mountainsNoPlains', {
          territoryId: mt.id, name: mt.name || '?',
        });
      }
    }
  }

  // ── Entity checks ─────────────────────────────────────────

  checkEntities() {
    const capitals = this.cities.filter(c => c.data.importance === 'capital');
    for (const cap of capitals) {
      const cc = this._center(cap);
      const hasRoute = this.routes.some(r => {
        const d = r.data;
        return this._dist({ x: d.x1, y: d.y1 }, cc) < 30
            || this._dist({ x: d.x2, y: d.y2 }, cc) < 30;
      });
      if (!hasRoute) {
        this._addIssue(HIGH, 'entities', 'capitalIsolated', {
          name: cap.name || '?', entityId: cap.id, fix: 'capitalIsolatedFix',
        });
      }
    }
    const ports = [...this.cities, ...this.symbols].filter(e =>
      (e.data.importance === 'port') || (e.name && e.name.toLowerCase().includes('port')));
    for (const port of ports) {
      const c = this._center(port);
      if (!this._nearOcean(c.x, c.y, 60)) {
        this._addIssue(HIGH, 'entities', 'portNotCoast', {
          name: port.name || '?', entityId: port.id,
        });
      }
    }
    const lighthouses = this.symbols.filter(e =>
      e.data.symbolId === 'lighthouse' || (e.name && e.name.toLowerCase().includes('phare')));
    for (const lh of lighthouses) {
      const c = this._center(lh);
      if (!this._nearOcean(c.x, c.y, 60)) {
        this._addIssue(MEDIUM, 'entities', 'lighthouseNotCoast', {
          name: lh.name || '?', entityId: lh.id,
        });
      }
    }
    for (const ter of this.territories) {
      const capsInside = capitals.filter(c => {
        const p = this._center(c);
        return ter.data.points && this._pointInPoly(p.x, p.y, ter.data.points);
      });
      if (capsInside.length > 1) {
        this._addIssue(HIGH, 'entities', 'twoCapitals', {
          name: ter.name || '?', territoryId: ter.id,
        });
      }
    }
    for (const city of this.cities) {
      if (!city.name || !city.name.trim()) {
        this._addIssue(LOW, 'entities', 'cityNoName', { entityId: city.id });
      }
    }
  }

  // ── Climatic checks ───────────────────────────────────────

  checkClimatic() {
    for (const ter of this.allPolygons) {
      const terrain = this._terrainOf(ter);
      const c = this._center(ter);
      const yRatio = c.y / this.canvasH;
      if (terrain === 'desert' && (yRatio < 0.1 || yRatio > 0.9)) {
        this._addIssue(MEDIUM, 'climatic', 'desertPolar', {
          name: ter.name || '?', territoryId: ter.id,
        });
      }
      const elev = ter.data.terrainIntensity || 0;
      if (terrain === 'mountain' && elev > 85 && yRatio > 0.4 && yRatio < 0.6) {
        this._addIssue(HIGH, 'climatic', 'glacierEquator', {
          name: ter.name || '?', territoryId: ter.id,
        });
      }
    }
  }

  // ── Political checks ──────────────────────────────────────

  checkPolitical() {
    for (const ter of this.territories) {
      const hasEntity = this.cities.some(c => {
        const p = this._center(c);
        return ter.data.points && this._pointInPoly(p.x, p.y, ter.data.points);
      });
      if (!hasEntity) {
        this._addSuggestion('political', 'territoryUninhabited', {
          name: ter.name || '?', territoryId: ter.id,
        });
      }
    }
    for (const route of this.routes) {
      const d = route.data;
      const mid = { x: (d.x1 + d.x2) / 2, y: (d.y1 + d.y2) / 2 };
      const midTer = this._findContaining(mid.x, mid.y);
      if (midTer && this._terrainOf(midTer) === 'ocean') {
        this._addIssue(MEDIUM, 'political', 'routeOcean', {
          entityId: route.id, fix: 'routeOceanFix',
        });
      }
    }
    const caps2 = this.cities.filter(c => c.data.importance === 'capital');
    for (const cap of caps2) {
      const c = this._center(cap);
      const ter = this._findContaining(c.x, c.y);
      if (ter) {
        const terrain = this._terrainOf(ter);
        if (terrain === 'ocean' || terrain === 'marsh') {
          this._addIssue(HIGH, 'political', 'capitalInSea', {
            name: cap.name || '?', entityId: cap.id, terrain,
          });
        }
      }
    }
  }

  // ── Scoring ───────────────────────────────────────────────

  calculateScore() {
    let score = 100;
    for (const issue of this.issues) {
      if (issue.severity === HIGH) score -= 15;
      else if (issue.severity === MEDIUM) score -= 8;
      else if (issue.severity === LOW) score -= 3;
    }
    score = Math.max(0, score);
    let grade, label;
    if (score >= 90) { grade = 'A'; label = t('analysis.coherence.gradeA'); }
    else if (score >= 70) { grade = 'B'; label = t('analysis.coherence.gradeB'); }
    else if (score >= 50) { grade = 'C'; label = t('analysis.coherence.gradeC'); }
    else { grade = 'D'; label = t('analysis.coherence.gradeD'); }
    return { score, grade, label };
  }
}
