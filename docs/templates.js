/**
 * Cartographer — Starter Templates
 *
 * 5 pre-built world templates with entities, events, and fiches.
 */

const WORLD_TEMPLATES = [
  {
    id: 'fantasy-continent',
    name: 'Continent fantasy',
    description: 'Masse terrestre centrale, 3 royaumes, chaîne de montagnes, forêt, 8 villes, 2 événements historiques.',
    world: { name: 'Aethermoor', description: 'Un vaste continent baigné de magie ancienne.', time_start: 0, time_end: 1200 },
    entities: [
      { type: 'territory', name: 'Royaume de Valdris', data: { points: [{x:-200,y:-150},{x:100,y:-200},{x:200,y:-50},{x:100,y:100},{x:-100,y:80}], color: '#8B2635', ruler: 'Roi Aldric III', capitalName: 'Valdris', resources: ['fer','blé'], description: 'Le plus ancien royaume du continent.' }},
      { type: 'territory', name: 'Empire de Solhaven', data: { points: [{x:200,y:-50},{x:400,y:-100},{x:450,y:100},{x:350,y:200},{x:100,y:100}], color: '#2E7D32', ruler: 'Impératrice Lyanna', capitalName: 'Solhaven', resources: ['or','épices'], description: 'Empire marchand prospère.' }},
      { type: 'territory', name: 'Terres de Frostmere', data: { points: [{x:-300,y:-300},{x:-100,y:-350},{x:100,y:-200},{x:-200,y:-150},{x:-350,y:-200}], color: '#1565C0', ruler: 'Jarl Bjorn', capitalName: 'Frostmere', resources: ['fourrures','bois'], description: 'Terres glacées du nord.' }},
      { type: 'city', name: 'Valdris', data: { x: -50, y: -50, importance: 'capital', color: '#8B2635', labelOffsetX: 12, labelOffsetY: -12, population: 45000, founded: '23', description: 'Capitale millénaire.' }},
      { type: 'city', name: 'Solhaven', data: { x: 300, y: 50, importance: 'capital', color: '#2E7D32', labelOffsetX: 12, labelOffsetY: -12, population: 60000, founded: '156', description: 'Port marchand.' }},
      { type: 'city', name: 'Frostmere', data: { x: -200, y: -250, importance: 'capital', color: '#1565C0', labelOffsetX: 12, labelOffsetY: -12, population: 12000, founded: '89', description: 'Cité des glaces.' }},
      { type: 'city', name: 'Ponthaut', data: { x: 50, y: 30, importance: 'city', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8, population: 8000, description: 'Ville de commerce.' }},
      { type: 'city', name: 'Boisjoli', data: { x: -150, y: 20, importance: 'village', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8, population: 500, description: 'Village forestier.' }},
      { type: 'city', name: 'Port-Aurore', data: { x: 380, y: 150, importance: 'city', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8, population: 15000, description: 'Grand port.' }},
      { type: 'city', name: 'Ombrecol', data: { x: -100, y: -120, importance: 'village', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8, population: 300, description: 'Hameau isolé.' }},
      { type: 'city', name: 'Haltefer', data: { x: 200, y: -30, importance: 'city', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8, population: 5000, description: 'Cité minière.' }},
      { type: 'region', name: 'Forêt d\'Émeraude', data: { points: [{x:-180,y:-30},{x:-80,y:-20},{x:-60,y:60},{x:-160,y:50}], terrain: 'forest' }},
      { type: 'region', name: 'Monts du Dragon', data: { points: [{x:0,y:-180},{x:150,y:-200},{x:200,y:-100},{x:50,y:-80}], terrain: 'mountain' }},
      { type: 'route', name: 'Route Royale', data: { x1: -50, y1: -50, x2: 300, y2: 50, cx1: 80, cy1: -80, cx2: 200, cy2: 20, style: 'royal', description: 'Voie principale.' }},
      { type: 'route', name: 'Sentier du Nord', data: { x1: -50, y1: -50, x2: -200, y2: -250, cx1: -100, cy1: -100, cx2: -150, cy2: -200, style: 'trail', description: 'Chemin dangereux.' }},
    ],
    events: [
      { title: 'Fondation de Valdris', date: 23, category: 'political', description: 'Le roi fondateur érige la première pierre.', entity_ids: [0] },
      { title: 'Guerre des Trois Couronnes', date: 800, category: 'war', description: 'Conflit majeur entre les trois royaumes.', entity_ids: [0, 1, 2] },
    ],
  },
  {
    id: 'mysterious-archipelago',
    name: 'Archipel mystérieux',
    description: '7 îles de tailles variées, routes maritimes, ports, phares, 1 île maudite.',
    world: { name: 'Les Îles Perdues', description: 'Un archipel brumeux aux confins du monde connu.', time_start: 0, time_end: 500 },
    entities: [
      { type: 'territory', name: 'Île Principale', data: { points: [{x:-50,y:-80},{x:80,y:-100},{x:120,y:20},{x:50,y:80},{x:-60,y:40}], color: '#4CAF50' }},
      { type: 'territory', name: 'Île du Crâne', data: { points: [{x:250,y:-50},{x:320,y:-80},{x:350,y:0},{x:300,y:40},{x:240,y:10}], color: '#4A0E0E' }},
      { type: 'territory', name: 'Île des Vents', data: { points: [{x:-250,y:-20},{x:-180,y:-60},{x:-140,y:10},{x:-200,y:50}], color: '#1976D2' }},
      { type: 'territory', name: 'Île Corail', data: { points: [{x:100,y:150},{x:170,y:130},{x:200,y:180},{x:140,y:210}], color: '#E91E63' }},
      { type: 'territory', name: 'Île Tortue', data: { points: [{x:-100,y:150},{x:-40,y:130},{x:-20,y:190},{x:-80,y:200}], color: '#795548' }},
      { type: 'territory', name: 'Île Brume', data: { points: [{x:-300,y:-180},{x:-240,y:-200},{x:-210,y:-150},{x:-260,y:-130}], color: '#607D8B' }},
      { type: 'territory', name: 'Île Étoile', data: { points: [{x:350,y:150},{x:410,y:120},{x:440,y:170},{x:390,y:200}], color: '#C9A84C' }},
      { type: 'city', name: 'Port-Brume', data: { x: 20, y: -20, importance: 'capital', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -12, population: 8000 }},
      { type: 'city', name: 'Phare-Rouge', data: { x: -220, y: -30, importance: 'city', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8 }},
      { type: 'city', name: 'Port-Corail', data: { x: 150, y: 160, importance: 'city', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8 }},
      { type: 'route', name: 'Route maritime nord', data: { x1: 20, y1: -20, x2: -220, y2: -30, cx1: -60, cy1: -80, cx2: -160, cy2: -60, style: 'road' }},
      { type: 'route', name: 'Route maritime sud', data: { x1: 20, y1: -20, x2: 150, y2: 160, cx1: 80, cy1: 60, cx2: 120, cy2: 120, style: 'road' }},
      { type: 'region', name: 'Eaux Maudites', data: { points: [{x:220,y:-80},{x:370,y:-100},{x:380,y:60},{x:220,y:50}], terrain: 'ocean' }},
    ],
    events: [
      { title: 'Découverte de l\'Archipel', date: 12, category: 'cultural', description: 'Les premiers explorateurs atteignent les îles.' },
    ],
  },
  {
    id: 'desert-empire',
    name: 'Empire du désert',
    description: 'Vaste territoire aride, oasis, caravanes, cités-états, pyramides.',
    world: { name: 'Khem-Solaar', description: 'L\'empire doré des sables infinis.', time_start: -500, time_end: 500 },
    entities: [
      { type: 'territory', name: 'Empire de Khem-Solaar', data: { points: [{x:-300,y:-200},{x:300,y:-250},{x:350,y:200},{x:-250,y:250}], color: '#C9A84C', ruler: 'Pharaon Khéops IV' }},
      { type: 'region', name: 'Grand Désert', data: { points: [{x:-200,y:-100},{x:200,y:-150},{x:250,y:100},{x:-180,y:120}], terrain: 'desert' }},
      { type: 'city', name: 'Solaar', data: { x: 0, y: 0, importance: 'capital', color: '#C9A84C', labelOffsetX: 14, labelOffsetY: -14, population: 100000 }},
      { type: 'city', name: 'Oasis de Jade', data: { x: -150, y: 50, importance: 'city', color: '#2E7D32', labelOffsetX: 12, labelOffsetY: -8, population: 5000 }},
      { type: 'city', name: 'Port des Sables', data: { x: 250, y: -50, importance: 'city', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8 }},
      { type: 'city', name: 'Nekropolis', data: { x: -80, y: -120, importance: 'city', color: '#4A0E0E', labelOffsetX: 12, labelOffsetY: -8, description: 'Cité des morts.' }},
      { type: 'route', name: 'Route des Caravanes', data: { x1: -150, y1: 50, x2: 250, y2: -50, cx1: 0, cy1: -30, cx2: 150, cy2: -20, style: 'trail' }},
      { type: 'route', name: 'Voie Royale', data: { x1: 0, y1: 0, x2: -80, y2: -120, cx1: -20, cy1: -40, cx2: -50, cy2: -80, style: 'royal' }},
    ],
    events: [
      { title: 'Fondation de Solaar', date: -400, category: 'political', description: 'Le premier Pharaon unifie les tribus.' },
      { title: 'Construction de la Grande Pyramide', date: -200, category: 'cultural', description: 'Monument colossal érigé en 50 ans.' },
    ],
  },
  {
    id: 'medieval-region',
    name: 'Carte régionale médiévale',
    description: 'Zoom sur une région, villages, routes commerciales, château central, forêts dangereuses.',
    world: { name: 'Comté de Valombre', description: 'Un comté paisible... en apparence.', time_start: 800, time_end: 1200 },
    entities: [
      { type: 'territory', name: 'Comté de Valombre', data: { points: [{x:-200,y:-180},{x:200,y:-180},{x:220,y:180},{x:-180,y:200}], color: '#5D4037' }},
      { type: 'city', name: 'Château de Valombre', data: { x: 0, y: 0, importance: 'capital', color: '#5D4037', labelOffsetX: 14, labelOffsetY: -14, population: 3000, description: 'Siège du Comte.' }},
      { type: 'city', name: 'Bourgade', data: { x: -100, y: 80, importance: 'city', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8, population: 1200 }},
      { type: 'city', name: 'Moulin-Blanc', data: { x: 120, y: -60, importance: 'village', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8, population: 200 }},
      { type: 'city', name: 'Fèrecluse', data: { x: -50, y: -120, importance: 'village', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8, population: 150 }},
      { type: 'city', name: 'Pont-Vieux', data: { x: 150, y: 100, importance: 'village', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8 }},
      { type: 'region', name: 'Forêt Noire', data: { points: [{x:-180,y:-60},{x:-80,y:-80},{x:-60,y:20},{x:-160,y:30}], terrain: 'forest' }},
      { type: 'region', name: 'Collines du Guet', data: { points: [{x:50,y:-140},{x:180,y:-160},{x:200,y:-60},{x:80,y:-50}], terrain: 'mountain' }},
      { type: 'route', name: 'Route du Marché', data: { x1: 0, y1: 0, x2: -100, y2: 80, cx1: -30, cy1: 30, cx2: -70, cy2: 50, style: 'road' }},
      { type: 'route', name: 'Chemin du Moulin', data: { x1: 0, y1: 0, x2: 120, y2: -60, cx1: 40, cy1: -10, cx2: 80, cy2: -40, style: 'trail' }},
    ],
    events: [
      { title: 'Fondation du Comté', date: 843, category: 'political', description: 'Le premier Comte reçoit ses terres.' },
    ],
  },
  {
    id: 'post-apocalyptic',
    name: 'Monde post-apocalyptique',
    description: 'Anciennes métropoles en ruines, zones irradiées, colonies de survivants, routes sécurisées.',
    world: { name: 'Terre-Cendre', description: 'An 2157. Ce qui reste après la Grande Extinction.', time_start: 2100, time_end: 2200 },
    entities: [
      { type: 'territory', name: 'Zone Sûre Alpha', data: { points: [{x:-100,y:-80},{x:50,y:-100},{x:80,y:30},{x:-60,y:60}], color: '#2E7D32' }},
      { type: 'territory', name: 'Ruines de Néo-Paris', data: { points: [{x:150,y:-150},{x:350,y:-170},{x:370,y:0},{x:180,y:20}], color: '#616161' }},
      { type: 'region', name: 'Zone Irradiée', data: { points: [{x:-300,y:-200},{x:-100,y:-200},{x:-100,y:0},{x:-280,y:0}], terrain: 'desert' }},
      { type: 'city', name: 'Refuge Alpha', data: { x: -20, y: -20, importance: 'capital', color: '#2E7D32', labelOffsetX: 12, labelOffsetY: -12, population: 2000, description: 'Plus grande colonie de survivants.' }},
      { type: 'city', name: 'Ruines Nord', data: { x: 250, y: -80, importance: 'city', color: '#616161', labelOffsetX: 12, labelOffsetY: -8, description: 'Métropole en ruines. Danger.' }},
      { type: 'city', name: 'Avant-poste 7', data: { x: 100, y: 100, importance: 'village', color: '#2C1810', labelOffsetX: 12, labelOffsetY: -8, population: 50 }},
      { type: 'route', name: 'Route sécurisée', data: { x1: -20, y1: -20, x2: 100, y2: 100, cx1: 20, cy1: 30, cx2: 60, cy2: 70, style: 'road' }},
      { type: 'route', name: 'Passage dangereux', data: { x1: -20, y1: -20, x2: 250, y2: -80, cx1: 80, cy1: -60, cx2: 180, cy2: -70, style: 'trail' }},
    ],
    events: [
      { title: 'La Grande Extinction', date: 2100, category: 'natural', description: 'Cataclysme mondial.' },
      { title: 'Fondation du Refuge Alpha', date: 2120, category: 'political', description: 'Les premiers survivants s\'organisent.' },
    ],
  },
];

window.WORLD_TEMPLATES = WORLD_TEMPLATES;
