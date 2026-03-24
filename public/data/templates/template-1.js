/**
 * Template 1 — Le Continent Brisé
 * Un ancien empire fracturé par un cataclysme
 */

const TEMPLATE_CONTINENT_BRISE = {
  id: 'continent-brise',
  name: 'Le Continent Brisé',
  seed: 1847,
  theme: 'parchment',
  description: "Un ancien empire fracturé par un cataclysme",
  tags: ['Fantasy', 'Continent', 'Empire'],

  territories: [
    { id: 't1', name: 'Plaines du Nord', type: 'plains', color: '#8B7355',
      points: [{x:0.15,y:0.08},{x:0.55,y:0.05},{x:0.60,y:0.30},{x:0.35,y:0.35},{x:0.10,y:0.28}],
      relief: { intensity: 0.3, roughness: 0.2 } },
    { id: 't2', name: 'Monts Mordan', type: 'mountains', color: '#6B5B45',
      points: [{x:0.30,y:0.25},{x:0.65,y:0.20},{x:0.70,y:0.50},{x:0.45,y:0.55},{x:0.25,y:0.45}],
      relief: { intensity: 0.85, roughness: 0.7 } },
    { id: 't3', name: 'Marais du Sud', type: 'swamp', color: '#4A5E3A',
      points: [{x:0.40,y:0.55},{x:0.75,y:0.50},{x:0.80,y:0.80},{x:0.55,y:0.85},{x:0.35,y:0.72}],
      relief: { intensity: 0.15, roughness: 0.4 } },
    { id: 't4', name: "Océan de l'Ouest", type: 'ocean', color: '#2A4A6B',
      points: [{x:0.0,y:0.0},{x:0.15,y:0.0},{x:0.10,y:0.28},{x:0.08,y:0.60},{x:0.0,y:0.90},{x:0.0,y:0.0}],
      relief: { intensity: 0.1, roughness: 0.6 } },
  ],

  rivers: [
    { id: 'r1', name: "Rivière d'Argent", source: { x: 0.45, y: 0.35 } },
    { id: 'r2', name: 'Fleuve Mordan', source: { x: 0.52, y: 0.28 } },
  ],

  entities: [
    { id: 'e1', type: 'capital', name: 'Valdris', x: 0.38, y: 0.42, importance: 'capital', population: 45000,
      description: { fr: "Fondée sur les ruines de l'Ancien Empire, Valdris domine la plaine centrale depuis trois siècles.",
        en: "Built on the ruins of the Ancient Empire, Valdris has dominated the central plain for three centuries." } },
    { id: 'e2', type: 'city', name: 'Port-Amar', x: 0.22, y: 0.31, importance: 'city', population: 12000,
      description: { fr: "Principal port du continent, carrefour des échanges maritimes.",
        en: "The continent's main port and center of maritime trade." } },
    { id: 'e3', type: 'fortress', name: 'Fort Mordan', x: 0.48, y: 0.25, importance: 'city' },
    { id: 'e4', type: 'ruins', name: 'Palais Impérial', x: 0.50, y: 0.38, importance: 'village',
      description: { fr: "Vestiges de l'ancien empire, lieu de pèlerinage et de mystère.",
        en: "Remnants of the ancient empire, a place of pilgrimage and mystery." } },
    { id: 'e5', type: 'city', name: 'Marchebas', x: 0.55, y: 0.48, importance: 'city', population: 8000 },
    { id: 'e6', type: 'village', name: 'Roseaux', x: 0.58, y: 0.62, importance: 'village' },
    { id: 'e7', type: 'village', name: 'Bourbier', x: 0.64, y: 0.58, importance: 'village' },
    { id: 'e8', type: 'city', name: 'Hautmont', x: 0.42, y: 0.20, importance: 'city', population: 6000 },
    { id: 'e9', type: 'lighthouse', name: "Phare de l'Amar", x: 0.18, y: 0.28 },
  ],

  routes: [
    { from: 'e1', to: 'e2', type: 'royal' },
    { from: 'e1', to: 'e5', type: 'royal' },
    { from: 'e1', to: 'e8', type: 'road' },
    { from: 'e2', to: 'e9', type: 'road' },
  ],

  timeline: [
    { year: 0, title: { fr: "La Grande Fracture", en: "The Great Fracture" },
      category: 'natural', entityId: 't2',
      description: { fr: "Cataclysme géologique qui brisa le continent en trois.",
        en: "A geological cataclysm that split the continent in three." } },
    { year: 124, title: { fr: "Fondation de Valdris", en: "Foundation of Valdris" },
      category: 'political', entityId: 'e1' },
    { year: 340, title: { fr: "Guerre des Trois Royaumes", en: "War of the Three Kingdoms" },
      category: 'war', entityId: 'e1' },
    { year: 612, title: { fr: "Traité de la Rivière d'Argent", en: "Silver River Treaty" },
      category: 'political', entityId: 'r1' },
    { year: 801, title: { fr: "Éruption du Pic Mordan", en: "Mount Mordan Eruption" },
      category: 'natural', entityId: 't2' },
    { year: 847, title: { fr: "Présent", en: "Present Day" },
      category: 'cultural', entityId: 'e1' },
  ],
};

export { TEMPLATE_CONTINENT_BRISE };
