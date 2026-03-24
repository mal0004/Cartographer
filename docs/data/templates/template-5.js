/**
 * Template 5 — La Grille Brisée
 * Un monde post-apocalyptique en reconstruction
 */

const TEMPLATE_GRILLE_BRISEE = {
  id: 'grille-brisee',
  name: 'La Grille Brisée',
  seed: 9901,
  theme: 'blueprint',
  description: "Un monde post-apocalyptique en reconstruction",
  tags: ['Post-Apo', 'Survie', 'Futur'],

  territories: [
    { id: 't1', name: 'Zone Irradiée Nord', type: 'desert', color: '#8B2E00',
      points: [{x:0.10,y:0.05},{x:0.55,y:0.05},{x:0.50,y:0.35},{x:0.15,y:0.38}],
      relief: { intensity: 0.3, roughness: 0.8 } },
    { id: 't2', name: 'Nature Reconquise', type: 'forest', color: '#2E5C1E',
      points: [{x:0.10,y:0.40},{x:0.45,y:0.38},{x:0.48,y:0.75},{x:0.12,y:0.78}],
      relief: { intensity: 0.4, roughness: 0.5 } },
    { id: 't3', name: 'Ancienne Métropole', type: 'plains', color: '#3A3A3A',
      points: [{x:0.50,y:0.30},{x:0.85,y:0.28},{x:0.88,y:0.60},{x:0.52,y:0.62}],
      relief: { intensity: 0.15, roughness: 0.7 } },
    { id: 't4', name: 'Zone Contaminée', type: 'swamp', color: '#5C4E00',
      points: [{x:0.50,y:0.62},{x:0.88,y:0.60},{x:0.90,y:0.90},{x:0.52,y:0.90}],
      relief: { intensity: 0.2, roughness: 0.6 } },
  ],

  rivers: [
    { id: 'r1', name: 'Fleuve Pollué', source: { x: 0.30, y: 0.20 }, color: '#7A8B00' },
  ],

  entities: [
    { id: 'e1', type: 'fortress', name: 'Refuge-7', x: 0.48, y: 0.55, importance: 'capital', population: 3000,
      description: { fr: "Construite dans les sous-sols d'un ancien centre commercial, Refuge-7 abrite 3000 survivants organisés.",
        en: "Built in the basement of an old shopping center, Refuge-7 houses 3000 organized survivors." } },
    { id: 'e2', type: 'village', name: 'Camp Vert', x: 0.28, y: 0.62, importance: 'village', population: 450 },
    { id: 'e3', type: 'village', name: 'Bunker-12', x: 0.68, y: 0.40, importance: 'city', population: 1200 },
    { id: 'e4', type: 'village', name: 'Tour-Comm', x: 0.55, y: 0.30, importance: 'city' },
    { id: 'e5', type: 'skull', name: 'Zone Interdite Alpha', x: 0.35, y: 0.25,
      description: { fr: "Niveau de radiation létal. Accès strictement interdit.",
        en: "Lethal radiation levels. Access strictly forbidden." } },
    { id: 'e6', type: 'skull', name: 'Zone Interdite Beta', x: 0.72, y: 0.68 },
    { id: 'e7', type: 'ruins', name: 'Dépôt Militaire', x: 0.60, y: 0.52 },
    { id: 'e8', type: 'temple', name: 'Tour de Guet', x: 0.42, y: 0.35 },
  ],

  routes: [
    { from: 'e1', to: 'e2', type: 'road' },
    { from: 'e1', to: 'e3', type: 'road' },
    { from: 'e1', to: 'e4', type: 'road' },
    { from: 'e4', to: 'e8', type: 'path' },
  ],

  timeline: [
    { year: 0, title: { fr: "Le Jour Zéro", en: "Day Zero" }, category: 'natural',
      description: { fr: "Effondrement de la civilisation mondiale.",
        en: "Collapse of world civilization." } },
    { year: 3, title: { fr: "Fondation de Refuge-7", en: "Foundation of Refuge-7" },
      category: 'political', entityId: 'e1' },
    { year: 12, title: { fr: "Guerre des Ressources", en: "Resource War" }, category: 'war' },
    { year: 28, title: { fr: "Découverte du Bunker Militaire", en: "Discovery of the Military Bunker" },
      category: 'cultural', entityId: 'e7' },
    { year: 35, title: { fr: "Premier Contact Inter-Colonies", en: "First Inter-Colony Contact" },
      category: 'political' },
    { year: 41, title: { fr: "Projet Renaissance", en: "Project Renaissance" },
      category: 'cultural', entityId: 'e1' },
  ],
};

export { TEMPLATE_GRILLE_BRISEE };
