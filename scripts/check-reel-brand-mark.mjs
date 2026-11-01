// The reels inline the brand mark so they need no network. This asserts the inline is still the
// artwork in public/brand/ — the one thing that rots silently, when brand/logos/*.svg is updated
// and the films are not. It reads only, runs in a second, and needs nothing installed.
//
//   node scripts/check-reel-brand-mark.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = path.join(ROOT, 'public/brand/sophion-symbol-reversed-white.svg');

// the two strokes, concatenated, whitespace-free — the form both films inline
const paths = (svg) => [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]).join('').replace(/\s+/g, '');

const brand = paths(fs.readFileSync(BRAND, 'utf8'));

const FILMS = [
  ['videos/sophionos-reel-21s/film/film.js', 'reveal / dashboard sidebar / end card'],
  ['videos/sophionos-reel-61s/02-engine.html', 'scene 4 / app shell sidebar / end card'],
  ['videos/sophionos-reel-61s/01-head.html', 'the click-to-play gate'],
];

// each film writes its two strokes as one JS string literal or one <path d="...">; read the run
// from the first stroke to the last, dropping the string-concat and quotes between them
function inlined(src) {
  const a = src.indexOf('M113 18.04');
  const b = src.lastIndexOf('39.73 Z');
  return a < 0 || b < a ? null : src.slice(a, b + 7).replace(/['"\s+]/g, '');
}

let failed = 0;
console.log(`brand source: ${path.relative(ROOT, BRAND)}  (${brand.length} chars)\n`);
for (const [file, where] of FILMS) {
  const got = inlined(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const ok = got === brand;
  failed += !ok;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${file.padEnd(38)} ${where}`);
  if (!ok) console.log(`       inlined ${got ? got.length : 0} chars, brand source is ${brand.length}`);
}

console.log(`\n${FILMS.length - failed}/${FILMS.length} films inline the brand mark verbatim`);
process.exit(failed ? 1 : 0);
