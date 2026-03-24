/**
 * Template 3 — Les Sables Pourpres
 * Un empire désertique autour d'une oasis sacrée
 */

const TEMPLATE_SABLES_POURPRES = {
  id: 'sables-pourpres',
  name: 'Les Sables Pourpres',
  seed: 5573,
  theme: 'blueprint',
  description: "Un empire désertique autour d'une oasis sacrée",
  tags: ['Désert', 'Empire', 'Caravanes'],

  territories: [
    { id: 't1', name: 'Grand Désert', type: 'desert', color: '#8B6914',
      points: [{x:0.10,y:0.10},{x:0.90,y:0.10},{x:0.90,y:0.90},{x:0.10,y:0.90}],
      relief: { intensity: 0.4, roughness: 0.6 } },
    { id: 't2', name: 'Oasis Centrale', type: 'plains', color: '#4A7A3A',
      points: [{x:0.40,y:0.40},{x:0.60,y:0.38},{x:0.62,y:0.58},{x:0.42,y:0.60}],
      relief: { intensity: 0.2, roughness: 0.1 } },
    { id: 't3', name: 'Monts du Nord', type: 'mountains', color: '#5C4A2E',
      points: [{x:0.20,y:0.05},{x:0.80,y:0.05},{x:0.75,y:0.22},{x:0.25,y:0.22}],
      relief: { intensity: 0.8, roughness: 0.8 } },
    { id: 't4', name: 'Sables Mouvants', type: 'desert', color: '#A0522D',
      points: [{x:0.10,y:0.65},{x:0.35,y:0.60},{x:0.38,y:0.90},{x:0.10,y:0.90}],
      relief: { intensity: 0.3, roughness: 0.9 } },
  ],

  rivers: [
    { id: 'r1', name: 'Source Souterraine', source: { x: 0.50, y: 0.40 }, underground: true },
  ],

  entities: [
    { id: 'e1', type: 'capital', name: 'Kharrath', x: 0.50, y: 0.50, importance: 'capital', population: 62000,
      description: { fr: "Bâtie autour de la seule source permanente des Sables, Kharrath contrôle tout le commerce caravanier.",
        en: "Built around the only permanent spring in the Sands, Kharrath controls all caravan trade." } },
    { id: 'e2', type: 'village', name: "Oasis d'Al-Rim", x: 0.28, y: 0.55, importance: 'village' },
    { id: 'e3', type: 'village', name: 'Oasis de Farad', x: 0.68, y: 0.45, importance: 'village' },
    { id: 'e4', type: 'ruins', name: 'Pyramides Enfouies', x: 0.42, y: 0.62, importance: 'city',
      description: { fr: "Structures colossales à moitié englouties par les sables. Leur origine reste un mystère.",
        en: "Colossal structures half-swallowed by the sands. Their origin remains a mystery." } },
    { id: 'e5', type: 'fortress', name: 'Fort du Col Nord', x: 0.38, y: 0.18 },
    { id: 'e6', type: 'fortress', name: 'Fort du Col Est', x: 0.72, y: 0.22 },
    { id: 'e7', type: 'skull', name: 'Sables Mouvants', x: 0.25, y: 0.75,
      description: { fr: "Zone mortelle. Aucune caravane ne tente de la traverser.",
        en: "Deadly zone. No caravan attempts to cross it." } },
  ],

  routes: [
    { from: 'e1', to: 'e2', type: 'caravan' },
    { from: 'e1', to: 'e3', type: 'caravan' },
    { from: 'e1', to: 'e5', type: 'road' },
    { from: 'e1', to: 'e6', type: 'road' },
  ],

  timeline: [
    { year: 0, title: { fr: "L'Assèchement", en: "The Great Drying" }, category: 'natural' },
    { year: 312, title: { fr: "Fondation de Kharrath", en: "Foundation of Kharrath" },
      category: 'political', entityId: 'e1' },
    { year: 589, title: { fr: "Guerre des Oasis", en: "War of the Oases" }, category: 'war' },
    { year: 744, title: { fr: "Découverte des Pyramides", en: "Discovery of the Pyramids" },
      category: 'cultural', entityId: 'e4' },
    { year: 901, title: { fr: "Grande Caravane de l'Est", en: "Great Eastern Caravan" },
      category: 'cultural', entityId: 'e1' },
  ],
};

export { TEMPLATE_SABLES_POURPRES };
