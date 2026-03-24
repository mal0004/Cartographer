/**
 * Template 4 — Les Terres Verdoyantes
 * Une région fertile traversée de rivières
 */

const TEMPLATE_TERRES_VERDOYANTES = {
  id: 'terres-verdoyantes',
  name: 'Les Terres Verdoyantes',
  seed: 7124,
  theme: 'watercolor',
  description: "Une région fertile traversée de rivières",
  tags: ['Médiéval', 'Région', 'Rural'],

  territories: [
    { id: 't1', name: 'Plaines Centrales', type: 'plains', color: '#6B8C3A',
      points: [{x:0.25,y:0.30},{x:0.70,y:0.28},{x:0.72,y:0.70},{x:0.28,y:0.72}],
      relief: { intensity: 0.25, roughness: 0.15 } },
    { id: 't2', name: 'Forêt Ancienne', type: 'forest', color: '#3A6B2E',
      points: [{x:0.08,y:0.25},{x:0.28,y:0.22},{x:0.30,y:0.60},{x:0.10,y:0.62}],
      relief: { intensity: 0.35, roughness: 0.3 } },
    { id: 't3', name: 'Collines du Nord', type: 'hills', color: '#7A8C5A',
      points: [{x:0.25,y:0.05},{x:0.75,y:0.05},{x:0.70,y:0.28},{x:0.25,y:0.30}],
      relief: { intensity: 0.55, roughness: 0.4 } },
    { id: 't4', name: 'Basses Terres', type: 'swamp', color: '#5A7A4A',
      points: [{x:0.50,y:0.65},{x:0.85,y:0.60},{x:0.90,y:0.90},{x:0.55,y:0.90}],
      relief: { intensity: 0.1, roughness: 0.2 } },
  ],

  rivers: [
    { id: 'r1', name: 'Rivière Claire', source: { x: 0.35, y: 0.20 } },
    { id: 'r2', name: 'Rivière Brune', source: { x: 0.60, y: 0.15 } },
    { id: 'r3', name: 'Ruisseau du Moulin', source: { x: 0.45, y: 0.35 } },
  ],

  entities: [
    { id: 'e1', type: 'city', name: 'Millhaven', x: 0.48, y: 0.52, importance: 'capital', population: 15000,
      description: { fr: "Chaque semaine, les marchés de Millhaven drainent toute la région. Son pont de pierre en est le symbole.",
        en: "Every week, Millhaven's markets draw the entire region. Its stone bridge is its symbol." } },
    { id: 'e2', type: 'village', name: 'Chênaie', x: 0.28, y: 0.40, importance: 'village' },
    { id: 'e3', type: 'village', name: 'Rivebasse', x: 0.62, y: 0.60, importance: 'village' },
    { id: 'e4', type: 'village', name: 'Hautcolline', x: 0.40, y: 0.22, importance: 'village' },
    { id: 'e5', type: 'village', name: 'Boisvert', x: 0.22, y: 0.58, importance: 'village' },
    { id: 'e6', type: 'village', name: 'Maréchin', x: 0.70, y: 0.72, importance: 'village' },
    { id: 'e7', type: 'temple', name: 'Monastère des Collines', x: 0.52, y: 0.18 },
    { id: 'e8', type: 'ruins', name: 'Vieux Moulin', x: 0.44, y: 0.48 },
    { id: 'e9', type: 'fortress', name: 'Château de Millhaven', x: 0.46, y: 0.44, importance: 'city' },
  ],

  routes: [
    { from: 'e1', to: 'e2', type: 'road' },
    { from: 'e1', to: 'e3', type: 'road' },
    { from: 'e1', to: 'e4', type: 'road' },
    { from: 'e4', to: 'e7', type: 'path' },
    { from: 'e2', to: 'e5', type: 'path' },
  ],

  timeline: [
    { year: 0, title: { fr: "Défrichage de la Grande Forêt", en: "Clearing of the Great Forest" },
      category: 'cultural' },
    { year: 180, title: { fr: "Construction du Pont de Millhaven", en: "Construction of Millhaven Bridge" },
      category: 'cultural', entityId: 'e1' },
    { year: 340, title: { fr: "Inondation des Basses Terres", en: "Flooding of the Lowlands" },
      category: 'natural', entityId: 't4' },
    { year: 512, title: { fr: "Révolte des Villages du Nord", en: "Revolt of the Northern Villages" },
      category: 'war', entityId: 'e4' },
    { year: 680, title: { fr: "Année de la Grande Récolte", en: "Year of the Great Harvest" },
      category: 'cultural', entityId: 'e1' },
  ],
};

export { TEMPLATE_TERRES_VERDOYANTES };
