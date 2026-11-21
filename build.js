import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, '蛊界.html');

function stripEsm(code) {
  return code
    .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+(?=(?:const|let|var|function|class)\b)/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
}

const ORDER = [
  'src/data/places.js',
  'src/data/gu.js',
  'src/data/enemies.js',
  'src/data/characters.js',
  'src/data/qingmao-stories.js',
  'src/data/story.js',
  'src/core/calendar.js',
  'src/core/story-progress.js',
  'src/core/state.js',
  'src/core/killer.js',
  'src/core/combat.js',
  'src/core/story-engine.js',
  'src/core/clock.js',
  'src/core/refine.js',
  'src/core/breakthrough.js',
  'src/core/place-actions.js',
  'src/core/growth-guide.js',
  'src/ui/cultivation-view.js',
  'src/ui/rituals.js',
  'src/ui/battle-view.js',
  'src/ui/map-view.js',
  'src/ui/place-view.js',
  'src/ui/aperture-view.js',
  'src/ui/refine-view.js',
  'src/ui/bag-view.js',
  'src/ui/persistence.js',
  'src/ui/modal-controller.js',
  'src/ui/game-loop.js',
  'src/ui/actions.js',
  'src/ui/app.js'
];

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8').replace(/\r\n/g, '\n');
const bundledJs = ORDER.map((rel) => {
  const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
  return `/* === ${rel} === */\n${stripEsm(raw)}`;
}).join('\n\n');

const outHtml = html
  .replace('<link rel="stylesheet" href="css/style.css">', `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="src/ui/app.js"></script>', `<script>\n${bundledJs}\n</script>`);

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(OUT, outHtml, 'utf8');
console.log(`已生成单文件离线版: ${OUT} (${Buffer.byteLength(outHtml, 'utf8')} bytes)`);
