/**
 * Template 2 — L'Archipel d'Ambre
 * Sept îles mystérieuses baignées d'or
 */

const TEMPLATE_ARCHIPEL_AMBRE = {
  id: 'archipel-ambre',
  name: "L'Archipel d'Ambre",
  seed: 3291,
  theme: 'nightgold',
  description: "Sept îles mystérieuses baignées d'or",
  tags: ['Archipel', 'Maritime', 'Volcanique'],

  territories: [
    { id: 't1', name: 'Île Principale', type: 'mountains', color: '#5C3D1E',
      points: [{x:0.25,y:0.30},{x:0.45,y:0.25},{x:0.50,y:0.45},{x:0.40,y:0.60},{x:0.22,y:0.55}],
      relief: { intensity: 0.9, roughness: 0.8 } },
    { id: 't2', name: 'Île des Marais', type: 'swamp', color: '#3A5C2E',
      points: [{x:0.55,y:0.55},{x:0.68,y:0.50},{x:0.72,y:0.65},{x:0.60,y:0.70}],
      relief: { intensity: 0.2, roughness: 0.5 } },
    { id: 't3', name: 'Île Rocheuse', type: 'desert', color: '#7A6040',
      points: [{x:0.65,y:0.20},{x:0.78,y:0.18},{x:0.82,y:0.32},{x:0.70,y:0.35}],
      relief: { intensity: 0.6, roughness: 0.9 } },
    { id: 't4', name: 'Île Fertile', type: 'plains', color: '#5A7A3A',
      points: [{x:0.10,y:0.60},{x:0.22,y:0.58},{x:0.25,y:0.72},{x:0.14,y:0.75}],
      relief: { intensity: 0.3, roughness: 0.2 } },
    { id: 't5', name: 'Petites Îles', type: 'plains', color: '#6A7A5A',
      points: [{x:0.80,y:0.60},{x:0.88,y:0.58},{x:0.90,y:0.68},{x:0.82,y:0.70}],
      relief: { intensity: 0.2, roughness: 0.3 } },
    { id: 'ocean', name: "Mer d'Ambre", type: 'ocean', color: '#1A3A5C',
      points: [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],
      relief: { intensity: 0.1, roughness: 0.7 } },
  ],

  rivers: [
    { id: 'r1', name: 'Torrent du Volcan', source: { x: 0.35, y: 0.30 } },
  ],

  entities: [
    { id: 'e1', type: 'capital', name: 'Port-Soleil', x: 0.38, y: 0.52, importance: 'capital', population: 28000,
      description: { fr: "Carrefour commercial de tout l'archipel, Port-Soleil vit au rythme des marées et des marchands.",
        en: "The archipelago's commercial hub, Port-Soleil lives by the rhythm of tides and merchants." } },
    { id: 'e2', type: 'city', name: 'Ignareth', x: 0.32, y: 0.28, importance: 'city', population: 9000,
      description: { fr: "Cité bâtie aux flancs du volcan, ses habitants vivent dans l'ombre de la montagne de feu.",
        en: "City built on the volcano's slopes, its inhabitants live in the shadow of the fire mountain." } },
    { id: 'e3', type: 'port', name: 'Port-Vert', x: 0.62, y: 0.38, importance: 'city' },
    { id: 'e4', type: 'port', name: 'Port-Roc', x: 0.72, y: 0.55, importance: 'city' },
    { id: 'e5', type: 'lighthouse', name: 'Phare du Détroit', x: 0.44, y: 0.42 },
    { id: 'e6', type: 'skull', name: 'Île Maudite', x: 0.20, y: 0.70,
      description: { fr: "Aucun marin ne s'en approche. Ceux qui l'ont fait ne sont jamais revenus.",
        en: "No sailor approaches it. Those who have never returned." } },
    { id: 'e7', type: 'ruins', name: 'Épave du Roi Doré', x: 0.55, y: 0.68 },
  ],

  routes: [
    { from: 'e1', to: 'e3', type: 'maritime' },
    { from: 'e1', to: 'e4', type: 'maritime' },
    { from: 'e3', to: 'e4', type: 'maritime' },
  ],

  timeline: [
    { year: 0, title: { fr: "Découverte de l'Archipel", en: "Discovery of the Archipelago" },
      category: 'cultural' },
    { year: 203, title: { fr: "Grande Éruption d'Ignareth", en: "Great Eruption of Ignareth" },
      category: 'natural', entityId: 'e2' },
    { year: 445, title: { fr: "Fondation de la Ligue des Îles", en: "Foundation of the Island League" },
      category: 'political', entityId: 'e1' },
    { year: 671, title: { fr: "Naufrage de la Flotte Royale", en: "Wreck of the Royal Fleet" },
      category: 'war', entityId: 'e7' },
    { year: 820, title: { fr: "Traité Commercial Continental", en: "Continental Trade Treaty" },
      category: 'political', entityId: 'e1' },
  ],
};

export { TEMPLATE_ARCHIPEL_AMBRE };
