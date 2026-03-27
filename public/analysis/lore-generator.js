/**
 * Cartographer — Lore Generator
 *
 * Deterministic lore generation from geography. No external API.
 * Same seed = same lore every time.
 */

import { t } from '../i18n.js';
import { SeededRandom } from '../utils/seeded-random.js';

export class LoreGenerator {
  constructor(entities, seed = 1234) {
    this.entities = entities || [];
    this.seed = seed;
    this.rng = new SeededRandom(seed);
  }

  generate() {
    this.rng = new SeededRandom(this.seed);
    const geo = this.analyzeGeography();
    const history = this.generateWorldHistory(geo);
    const territoryLore = this.generateAllTerritoryLore(geo);
    const entityLore = this.generateAllEntityLore(geo);
    return { geo, history, territoryLore, entityLore };
  }

  // ── Geography analysis ─────────────────────────────────────

  analyzeGeography() {
    const territories = this.entities.filter(e => e.type === 'territory');
    const regions = this.entities.filter(e => e.type === 'region');
    const cities = this.entities.filter(e => e.type === 'city');
    const rivers = this.entities.filter(e => e.type === 'river');
    const routes = this.entities.filter(e => e.type === 'route');
    const allPolygons = [...territories, ...regions];
    const terrainOf = (t) => t.data.terrainType || t.data.terrain || '';
    const hasType = (type) => allPolygons.some(t => terrainOf(t) === type);
    const center = (e) => {
      const d = e.data;
      if (d.x !== undefined) return { x: d.x, y: d.y };
      if (d.points && d.points.length) {
        return {
          x: d.points.reduce((s, p) => s + p.x, 0) / d.points.length,
          y: d.points.reduce((s, p) => s + p.y, 0) / d.points.length,
        };
      }
      return { x: 600, y: 400 };
    };
    const capitalCity = cities.find(c => c.data.importance === 'capital') || null;
    const largest = territories.reduce((best, t) => {
      const area = t.data.points ? t.data.points.length : 0;
      return area > (best ? best.data.points?.length || 0 : 0) ? t : best;
    }, null);
    const coastalEntities = cities.filter(c => {
      const cc = center(c);
      return allPolygons.some(t => {
        if (terrainOf(t) !== 'ocean') return false;
        return (t.data.points || []).some(p => Math.hypot(cc.x - p.x, cc.y - p.y) < 60);
      });
    });
    const crossroads = cities.filter(c => {
      const cc = center(c);
      return routes.filter(r => {
        const d = r.data;
        return Math.hypot(d.x1 - cc.x, d.y1 - cc.y) < 30
            || Math.hypot(d.x2 - cc.x, d.y2 - cc.y) < 30;
      }).length >= 2;
    });
    return {
      territories, regions, cities, rivers, routes, allPolygons,
      hasOcean: hasType('ocean'), hasMountains: hasType('mountain'),
      hasDesert: hasType('desert'), hasForest: hasType('forest'),
      hasSwamp: hasType('marsh') || hasType('swamp'),
      hasPlains: hasType('plain'), hasHills: hasType('hills'),
      riverCount: rivers.length, capitalCity, largestTerritory: largest,
      coastalEntities, crossroads, center, terrainOf,
    };
  }

  // ── World history ──────────────────────────────────────────

  generateWorldHistory(geo) {
    const events = [];
    const y = (base) => this.rng.int(base, base + 200);

    if (geo.hasMountains && geo.hasPlains) {
      events.push({
        year: y(100), title: t('lorebook.history.warOfPasses'),
        description: t('lorebook.history.warOfPassesDesc'),
        category: 'war', generated: true,
      });
    }
    if (geo.riverCount >= 2 && geo.capitalCity) {
      events.push({
        year: y(50),
        title: t('lorebook.history.founding').replace('{name}', geo.capitalCity.name || '?'),
        description: t('lorebook.history.foundingDesc'),
        category: 'political', generated: true,
      });
    }
    if (geo.hasOcean && geo.coastalEntities.length > 0) {
      events.push({
        year: y(300), title: t('lorebook.history.goldenAge'),
        description: t('lorebook.history.goldenAgeDesc'),
        category: 'cultural', generated: true,
      });
    }
    if (geo.hasDesert) {
      events.push({
        year: y(200), title: t('lorebook.history.caravanRoute'),
        description: t('lorebook.history.caravanRouteDesc'),
        category: 'cultural', generated: true,
      });
    }
    if (geo.hasSwamp) {
      events.push({
        year: y(400), title: t('lorebook.history.swampExile'),
        description: t('lorebook.history.swampExileDesc'),
        category: 'political', generated: true,
      });
    }
    if (geo.hasMountains && geo.hasOcean) {
      events.push({
        year: y(600), title: t('lorebook.history.greatFlood'),
        description: t('lorebook.history.greatFloodDesc'),
        category: 'natural', generated: true,
      });
    }
    if (geo.crossroads.length > 0) {
      const city = geo.crossroads[0];
      events.push({
        year: y(350),
        title: t('lorebook.history.tradeFair').replace('{name}', city.name || '?'),
        description: t('lorebook.history.tradeFairDesc'),
        category: 'cultural', generated: true,
      });
    }
    return events.sort((a, b) => a.year - b.year);
  }

  // ── Territory lore ─────────────────────────────────────────

  generateAllTerritoryLore(geo) {
    return geo.territories.map(ter => ({
      id: ter.id,
      name: ter.name || '?',
      lore: this._territoryLore(ter, geo),
    }));
  }

  _territoryLore(ter, geo) {
    const rawTerrain = geo.terrainOf(ter);
    const terrain = rawTerrain === 'swamp' ? 'marsh' : rawTerrain;
    const name = ter.name || '?';
    const prefixes = {
      mountain: ['lorebook.prefix.impassable', 'lorebook.prefix.majestic', 'lorebook.prefix.ancient', 'lorebook.prefix.frozen'],
      plain: ['lorebook.prefix.vast', 'lorebook.prefix.golden', 'lorebook.prefix.fertile'],
      desert: ['lorebook.prefix.scorching', 'lorebook.prefix.endless', 'lorebook.prefix.forbidden'],
      forest: ['lorebook.prefix.ancient', 'lorebook.prefix.dark', 'lorebook.prefix.enchanted'],
      marsh: ['lorebook.prefix.treacherous', 'lorebook.prefix.misty', 'lorebook.prefix.forgotten'],
    };
    const pList = prefixes[terrain] || prefixes.plain;
    const prefix = t(this.rng.pick(pList));
    const key = `lorebook.territory.${terrain || 'plain'}`;
    let lore = t(key).replace('{prefix}', prefix).replace('{name}', name);
    // Contextual additions
    const c = geo.center(ter);
    const nearRiver = geo.rivers.find(r => {
      const d = r.data;
      return d.sourceX !== undefined && Math.hypot(c.x - d.sourceX, c.y - d.sourceY) < 100;
    });
    if (nearRiver && terrain === 'mountain') {
      lore += ' ' + t('lorebook.territory.riverBorn').replace('{river}', nearRiver.name || '?');
    }
    const capitalInside = geo.cities.find(city => {
      if (city.data.importance !== 'capital') return false;
      const cc = geo.center(city);
      return ter.data.points && this._pointInPoly(cc.x, cc.y, ter.data.points);
    });
    if (capitalInside) {
      lore += ' ' + t('lorebook.territory.hasCapital').replace('{capital}', capitalInside.name || '?');
    }
    return lore;
  }

  // ── Entity lore ────────────────────────────────────────────

  generateAllEntityLore(geo) {
    return geo.cities.filter(c => !c.data.description || !c.data.description.trim()).map(city => {
      const cc = geo.center(city);
      const terrain = this._findTerrain(cc, geo);
      const isCoastal = geo.coastalEntities.includes(city);
      const isCrossroad = geo.crossroads.includes(city);
      const nearRiver = geo.rivers.find(r => {
        const d = r.data;
        return d.sourceX !== undefined && Math.hypot(cc.x - d.sourceX, cc.y - d.sourceY) < 120;
      });
      let key = 'lorebook.entity.default';
      if (city.data.importance === 'capital' && nearRiver) key = 'lorebook.entity.capitalRiver';
      else if (city.data.importance === 'capital') key = 'lorebook.entity.capital';
      else if (isCoastal) key = 'lorebook.entity.coastal';
      else if (isCrossroad) key = 'lorebook.entity.crossroad';
      else if (terrain === 'mountain') key = 'lorebook.entity.mountain';
      else if (terrain === 'forest') key = 'lorebook.entity.forest';
      else if (terrain === 'desert') key = 'lorebook.entity.desert';
      else if (terrain === 'marsh') key = 'lorebook.entity.swamp';
      return {
        id: city.id,
        name: city.name || '?',
        lore: t(key).replace('{name}', city.name || '?'),
      };
    });
  }

  _findTerrain(pos, geo) {
    for (const ter of geo.allPolygons) {
      if (ter.data.points && this._pointInPoly(pos.x, pos.y, ter.data.points)) {
        return geo.terrainOf(ter);
      }
    }
    return '';
  }

  _pointInPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
}
