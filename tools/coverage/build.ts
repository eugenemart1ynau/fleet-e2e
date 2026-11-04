import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { buildModel } from './model.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'coverage-dashboard');
const outFile = path.join(outDir, 'index.html');

dotenv.config({ path: path.join(root, '.env') });
const password = process.env.FLEET_PASSWORD;

const model = buildModel(root);
const json = JSON.stringify(model).replace(/</g, '\\u003c');
if (password && json.includes(password)) {
  throw new Error('Refusing to write the atlas: the preview password was copied into the page');
}

const css = fs.readFileSync(path.join(root, 'tools/coverage/dashboard.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'tools/coverage/dashboard.js'), 'utf8');
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Coverage atlas — Hosts and host details</title>
  <style>${css}</style>
</head>
<body>
  <div class="app" id="app"></div>
  <script type="application/json" id="coverage-data">${json}</script>
  <script>${js}</script>
</body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, html);
const counts = model.kindCounts.map((item) => `${item.label} ${item.count}`).join(', ');
console.log(`Wrote ${path.relative(root, outFile)}`);
console.log(`${model.tests.length} tests (${counts})`);
console.log(model.shotsCapturedAt ? `Screens from ${model.shotsCapturedAt}` : 'No screenshots yet. npm run coverage:shots');

if (!process.env.COVERAGE_NO_OPEN) {
  const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(opener, [outFile], { detached: true, stdio: 'ignore' }).unref();
}
