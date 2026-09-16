/* ============================================================================
   HabitCrafts — tools/icons.mjs
   THE ICONS A PHONE NEEDS.                    node tools/icons.mjs

   Chrome will not make a WebAPK without a 192 and a 512, and without a WebAPK
   "Add to Home screen" is a bookmark: no standalone window, no splash, still a
   browser session. So these three files are the difference between an app and a
   shortcut.

   ---------------------------------------------------------------------------
   THE SOURCE IS NOT SQUARE, AND THAT MATTERS
   ---------------------------------------------------------------------------
   `assets/images/app_launcher_icon.png` is 2876 × 2784. Resizing it straight to
   512 × 512 would stretch the mark by 3% on one axis, which is the kind of
   wrongness nobody can name but everybody can see. It is CONTAINED on a square
   canvas instead, padded with the app's own canvas colour.

   ---------------------------------------------------------------------------
   MASKABLE IS A SEPARATE FILE, NOT A FLAG
   ---------------------------------------------------------------------------
   Android crops a maskable icon to whatever shape the launcher uses, and the
   guaranteed-visible region is a circle of 80% diameter. An icon that fills its
   square gets its edges shaved off. So the maskable one is generated at 60% of
   the canvas with the rest padding, which survives a circle, a squircle and a
   teardrop alike. Shipping one file for both purposes means picking which of
   the two looks wrong.
   ========================================================================= */

import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const src = resolve(root, 'prototype/assets/images/app_launcher_icon.png');
const outDir = resolve(root, 'prototype/assets/icons');

/* --l-canvas from css/tokens.css:38. The padding has to be the page colour or
   the icon reads as a sticker on a card rather than as the app. */
const CANVAS = { r: 0xf7, g: 0xf5, b: 0xf1, alpha: 1 };

mkdirSync(outDir, { recursive: true });

async function square(size, inset, name) {
  const art = Math.round(size * inset);
  const pad = Math.round((size - art) / 2);

  const resized = await sharp(src)
    .resize(art, art, { fit: 'contain', background: { ...CANVAS, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: CANVAS },
  })
    .composite([{ input: resized, top: pad, left: pad }])
    .png()
    .toFile(resolve(outDir, name));

  console.log(`  ${name.padEnd(22)} ${size}×${size}, art at ${Math.round(inset * 100)}%`);
}

const meta = await sharp(src).metadata();
console.log(`source ${meta.width}×${meta.height}${meta.width === meta.height ? '' : '  (not square: contained, never stretched)'}\n`);

/* 92% for the normal icons: a hair of breathing room, because Android draws
   them on a background that is rarely the same colour as ours. */
await square(192, 0.92, 'icon-192.png');
await square(512, 0.92, 'icon-512.png');
/* 60% for maskable, so nothing that matters is inside the crop zone. */
await square(512, 0.60, 'icon-512-maskable.png');
/* Apple ignores the manifest and wants its own link tag at 180. */
await square(180, 0.92, 'apple-touch-icon.png');

console.log('\nwrote prototype/assets/icons/');
