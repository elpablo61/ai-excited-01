// ai-excited-01 — "The Wave That Caught Fire"
//
// Entry for the make.fun bounty "Make the AI judge excited"
// (https://make.fun/bounty/ai-excited-01).
//
// The program writes exactly one image to /output/entry.png: a
// colossal ocean wave at golden hour whose crest burns gold-orange,
// curling into a perfect barrel around a lone silhouetted surfer —
// deep teal water against fire, sunset light through the barrel.
//
// The image is a fixed asset held by this repository
// (assets/entry.png). It was generated once during the build and
// compressed to fit the bounty gate (1024x1024 PNG, under 1 MiB).
// This program copies its bytes verbatim, so every run writes
// exactly the same bytes: no network, no clock, no randomness
// anywhere in the path.
//
// How it works, step by step:
//   1. Read assets/entry.png next to this file.
//   2. Validate it as a real PNG: check the 8-byte magic signature,
//      then parse the IHDR chunk (the first chunk of every PNG) and
//      read the image width and height stored there. Reject the asset
//      if the magic is wrong, the IHDR chunk is missing or truncated,
//      either dimension is zero or above 1024, or the file is larger
//      than 1 MiB. Each failure names the exact problem and the gate
//      it broke, so a bad asset fails loudly instead of silently
//      writing an entry the judge would reject.
//   3. Create the output directory if it does not exist yet
//      ($MAKEFUN_OUTPUT_DIR, default /output).
//   4. Write the bytes to <output dir>/entry.png.
//   5. Verify the write: read the file back, compare its length and
//      its SHA-256 hash against the asset, and only then report
//      success. A short or corrupted write is an error, not a
//      silent success.
//
// Requirements: Node.js 22 or later, standard library only, nothing
// to install. The file uses no TypeScript-only syntax, so it runs
// under any Node with type stripping:
//
//   node main.ts                              # writes /output/entry.png
//   MAKEFUN_OUTPUT_DIR=out node main.ts       # writes out/entry.png

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Gate limits from the bounty description.
// ---------------------------------------------------------------------------

/** Maximum image file size: 1 MiB. */
const MAX_BYTES = 1024 * 1024;
/** Maximum image width or height in pixels. */
const MAX_DIMENSION = 1024;

/** The 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A. */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// ---------------------------------------------------------------------------
// Paths: the asset lives next to this file; the output directory comes
// from the environment (the make.fun runner sets MAKEFUN_OUTPUT_DIR).
// ---------------------------------------------------------------------------

const root = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(root, "assets", "entry.png");
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");
const targetPath = join(outDir, "entry.png");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** SHA-256 hex digest of a buffer, used to prove the copy is exact. */
function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Human-readable byte count, e.g. 635782 -> "635,782 bytes". */
function formatBytes(n: number): string {
  return `${n.toLocaleString("en-US")} bytes`;
}

/**
 * Read and validate the entry image.
 *
 * Returns the asset bytes together with the width and height read from
 * its IHDR chunk. Throws an Error with a specific, actionable message
 * for every kind of bad asset instead of writing anything.
 */
function loadValidatedAsset(path: string): { bytes: Buffer; width: number; height: number } {
  let bytes: Buffer;
  try {
    bytes = readFileSync(path);
  } catch (cause) {
    throw new Error(
      `cannot read the entry image at ${path}: ` +
        `${cause instanceof Error ? cause.message : String(cause)}. ` +
        `Check that assets/entry.png exists in the repository.`,
    );
  }

  // 1. File-size gate (checked first: cheap, and it bounds everything else).
  if (bytes.length > MAX_BYTES) {
    throw new Error(
      `entry image is ${formatBytes(bytes.length)}, over the 1 MiB gate ` +
        `(${formatBytes(MAX_BYTES)}). Re-compress assets/entry.png below 1 MiB and try again.`,
    );
  }
  if (bytes.length === 0) {
    throw new Error("entry image is empty (0 bytes); nothing to write.");
  }

  // 2. PNG magic: the first 8 bytes must be the PNG signature.
  if (bytes.length < PNG_MAGIC.length || !bytes.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    throw new Error(
      "entry image is not a PNG file: its first 8 bytes do not match the PNG signature " +
        "(89 50 4E 47 0D 0A 1A 0A). The bounty accepts a whole PNG or JPEG; " +
        "this program only writes the PNG asset it holds.",
    );
  }

  // 3. IHDR chunk: every PNG starts with a 4-byte length, the 4-byte
  //    type "IHDR", then 13 bytes of header data whose first 4 bytes
  //    are the width (big-endian uint32) and next 4 bytes the height.
  //    Layout: [0..8) magic, [8..12) length, [12..16) type "IHDR",
  //    [16..20) width, [20..24) height.
  const IHDR_MIN_LENGTH = 24;
  if (bytes.length < IHDR_MIN_LENGTH) {
    throw new Error(
      `entry image is truncated: only ${formatBytes(bytes.length)}, ` +
        `too short to contain a PNG IHDR chunk (needs at least ${IHDR_MIN_LENGTH} bytes).`,
    );
  }
  const firstChunkLength = bytes.readUInt32BE(8);
  const firstChunkType = bytes.subarray(12, 16).toString("latin1");
  if (firstChunkType !== "IHDR") {
    throw new Error(
      `entry image is not a well-formed PNG: its first chunk is "${firstChunkType}", ` +
        `but the first chunk of every PNG must be "IHDR". The asset may be corrupt.`,
    );
  }
  if (firstChunkLength !== 13) {
    throw new Error(
      `entry image has a malformed IHDR chunk (length ${firstChunkLength}, expected 13). ` +
        `The asset may be corrupt.`,
    );
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);

  // 4. Dimension gate: each side must be between 1 and 1024 pixels.
  if (width === 0 || height === 0) {
    throw new Error(
      `entry image has an impossible size from its IHDR chunk: ${width}x${height}. ` +
        `The asset may be corrupt.`,
    );
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(
      `entry image is ${width}x${height}, over the ${MAX_DIMENSION}x${MAX_DIMENSION} gate. ` +
        `Resize assets/entry.png to at most ${MAX_DIMENSION}x${MAX_DIMENSION} and try again.`,
    );
  }

  return { bytes, width, height };
}

/**
 * Make sure the output directory exists, creating it (and any missing
 * parents) when needed. Throws a helpful error if it cannot be created
 * — for example when the path exists as a regular file, or when the
 * process has no permission to create it.
 */
function ensureOutputDir(dir: string): void {
  try {
    const existing = statSync(dir, { throwIfNoEntry: false });
    if (existing && !existing.isDirectory()) {
      throw new Error(
        `output path ${dir} exists but is not a directory. ` +
          `Remove it or set MAKEFUN_OUTPUT_DIR to a directory path.`,
      );
    }
    mkdirSync(dir, { recursive: true });
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith("output path")) {
      throw cause;
    }
    throw new Error(
      `cannot create output directory ${dir}: ` +
        `${cause instanceof Error ? cause.message : String(cause)}. ` +
        `Check the path and permissions, or set MAKEFUN_OUTPUT_DIR to a writable directory.`,
    );
  }
}

/**
 * Write the asset bytes to the target path and verify the write by
 * reading the file back and comparing both its length and its SHA-256
 * hash with the asset. A mismatch means the write was short or
 * corrupted, and the run fails instead of reporting success.
 */
function writeAndVerify(bytes: Buffer, target: string): void {
  try {
    writeFileSync(target, bytes);
  } catch (cause) {
    throw new Error(
      `cannot write ${target}: ` +
        `${cause instanceof Error ? cause.message : String(cause)}. ` +
        `Check that the output directory is writable.`,
    );
  }

  let written: Buffer;
  try {
    written = readFileSync(target);
  } catch (cause) {
    throw new Error(
      `wrote ${target} but cannot read it back to verify: ` +
        `${cause instanceof Error ? cause.message : String(cause)}.`,
    );
  }
  if (written.length !== bytes.length) {
    throw new Error(
      `short write to ${target}: wrote ${formatBytes(written.length)} ` +
        `of ${formatBytes(bytes.length)}. The output is incomplete.`,
    );
  }
  const expectedHash = sha256Hex(bytes);
  const actualHash = sha256Hex(written);
  if (actualHash !== expectedHash) {
    throw new Error(
      `corrupt write to ${target}: SHA-256 mismatch after writing ` +
        `(expected ${expectedHash}, got ${actualHash}). The output does not match the asset.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main: validate, prepare, write, verify, report.
// ---------------------------------------------------------------------------

function main(): void {
  const { bytes, width, height } = loadValidatedAsset(sourcePath);
  ensureOutputDir(outDir);
  writeAndVerify(bytes, targetPath);
  console.log(
    `wrote ${targetPath} (${formatBytes(bytes.length)}, ` +
      `${width}x${height} PNG, sha256 ${sha256Hex(bytes)})`,
  );
}

main();
