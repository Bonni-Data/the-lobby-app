// Build: bundle with esbuild into dist/, copy static files, render PNG icons.
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire('/opt/npm-tools/node_modules/');
const root = new URL('..', import.meta.url).pathname;
const dist = root + 'dist/';
const dev = process.argv.includes('--dev');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist + 'icons', { recursive: true });

await build({
  entryPoints: [root + 'src/main.tsx'],
  bundle: true,
  minify: !dev,
  sourcemap: dev,
  format: 'iife',
  target: ['es2020', 'safari15', 'chrome96', 'firefox96'],
  outfile: dist + 'app.js',
  jsx: 'automatic',
  nodePaths: ['/opt/npm-tools/node_modules'],
  define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' },
  loader: { '.svg': 'file' },
  logLevel: 'warning',
});

cpSync(root + 'public', dist, { recursive: true });
const stamp = Date.now().toString(36);
writeFileSync(
  dist + 'index.html',
  readFileSync(root + 'index.html', 'utf8').replace('./app.js', `./app.js?v=${stamp}`).replace('./app.css', `./app.css?v=${stamp}`),
);

// Icons from the SVG mark
const sharp = require('sharp');
const svg = readFileSync(root + 'public/icons/favicon.svg');
const maskable = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#111C35"/>` +
    `<path d="M166 400V250a90 90 0 0 1 180 0v150" fill="none" stroke="#FF7058" stroke-width="32" stroke-linecap="round"/></svg>`,
);
for (const [size, name, src] of [
  [180, 'icon-180.png', svg],
  [192, 'icon-192.png', svg],
  [512, 'icon-512.png', svg],
  [512, 'icon-maskable-512.png', maskable],
]) {
  await sharp(src).resize(size, size).png().toFile(dist + 'icons/' + name);
}
console.log('Built to', dist);
