import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const DOCS = join(ROOT, 'docs');

const SHARED_PATHS = [
  'analysis',
  'canvas',
  'symbols',
  'terrain',
  'translations',
  'ui',
  'atmosphere.js',
  'coastlines.js',
  'hill-shading.js',
  'i18n.js',
  'layers.js',
  'minimap.js',
  'mode-toggle.js',
  'noise.js',
  'onboarding.js',
  'performance.js',
  'rivers.js',
  'snap.js',
  'style.css',
  'svg-export.js',
  'themes.js',
  'terrain-renderer.js',
  'undo.js',
  'vegetation.js',
  'worker-generator.js',
  'worker-noise.js',
];

for (const rel of SHARED_PATHS) {
  const src = join(PUBLIC, rel);
  const dest = join(DOCS, rel);
  if (!existsSync(src)) continue;
  cpSync(src, dest, { recursive: true, force: true });
  console.log(`synced: ${rel}`);
}

console.log('docs sync complete (local-db.js, docs/app.js, docs/index.html intentionally untouched).');
