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
  // PNG favicons for Google Search (it does not read the SVG one): multiples of 48 px
  [48, 'favicon-48.png', svg],
  [96, 'favicon-96.png', svg],
  [192, 'favicon-192.png', svg],
]) {
  await sharp(src, { density: 300 }).resize(size, size).png().toFile(dist + 'icons/' + name);
}

// /favicon.ico at the site root (16, 32 and 48 px, PNG-compressed entries): the path every crawler tries first
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map((s) => sharp(svg, { density: 300 }).resize(s, s).png().toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(pngs.length, 4);
let offset = 6 + 16 * pngs.length;
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(icoSizes[i], 0); // width
  e.writeUInt8(icoSizes[i], 1); // height
  e.writeUInt8(0, 2); // palette
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
writeFileSync(dist + 'favicon.ico', Buffer.concat([header, ...entries, ...pngs]));
console.log('Built to', dist);
