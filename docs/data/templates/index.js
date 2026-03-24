/**
 * Cartographer — Template Aggregator
 *
 * Imports all 5 templates and exports them as WORLD_TEMPLATES array.
 */

import { TEMPLATE_CONTINENT_BRISE } from './template-1.js';
import { TEMPLATE_ARCHIPEL_AMBRE } from './template-2.js';
import { TEMPLATE_SABLES_POURPRES } from './template-3.js';
import { TEMPLATE_TERRES_VERDOYANTES } from './template-4.js';
import { TEMPLATE_GRILLE_BRISEE } from './template-5.js';

const WORLD_TEMPLATES = [
  TEMPLATE_CONTINENT_BRISE,
  TEMPLATE_ARCHIPEL_AMBRE,
  TEMPLATE_SABLES_POURPRES,
  TEMPLATE_TERRES_VERDOYANTES,
  TEMPLATE_GRILLE_BRISEE,
];

export { WORLD_TEMPLATES };
