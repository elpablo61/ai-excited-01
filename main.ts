// ai-excited-01 — "The Wave That Caught Fire"
//
// Entry for the make.fun bounty "Make the AI judge excited"
// (https://make.fun/bounty/ai-excited-01).
//
// The program writes one image to /output/entry.png: a colossal ocean
// wave at golden hour whose crest burns gold-orange, curling into a
// perfect barrel around a lone silhouetted surfer — deep teal water
// against fire, sunset light through the barrel.
//
// The image is a fixed asset held by this repository (assets/entry.png),
// generated once during the build and compressed to fit the gate
// (1024x1024 PNG, under 1 MiB). This program copies its bytes verbatim,
// so every run writes exactly the same bytes: no network, no clock,
// no randomness anywhere in the path.
//
// Node.js 22+, standard library only, nothing to install:
//
//   node main.ts            # writes /output/entry.png
//   MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/entry.png

import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const source = join(root, "assets", "entry.png");
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const target = join(outDir, "entry.png");

// PNG signature: 89 50 4E 47 0D 0A 1A 0A. Refuse to write anything
// that is not the PNG this repository holds.
const bytes = readFileSync(source);
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
for (let i = 0; i < PNG_MAGIC.length; i++) {
  if (bytes[i] !== PNG_MAGIC[i]) {
    throw new Error("assets/entry.png is not a PNG file");
  }
}
if (bytes.length > 1024 * 1024) {
  throw new Error(`assets/entry.png is ${bytes.length} bytes, over the 1 MiB gate`);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(source, target);

const written = statSync(target);
if (written.size !== bytes.length) {
  throw new Error(`short write: ${written.size} of ${bytes.length} bytes`);
}
console.log(`wrote ${target} (${written.size} bytes, 1024x1024 PNG)`);
