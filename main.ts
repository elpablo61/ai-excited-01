// ai-excited-01 — "The Wave That Caught Fire" (revision 2)
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
// What a run does, in order:
//   1. Parse the command line. --help prints usage and exits 0;
//      --version prints the program version and exits 0. Any other
//      flag is rejected with the usage text, so a typo never runs
//      silently as a normal copy.
//   2. Read assets/entry.png next to this file.
//   3. Validate it as a whole PNG against the bounty gate. The
//      validator walks every chunk of the file from the first byte
//      to the last:
//        - the 8-byte PNG magic signature must match;
//        - the first chunk must be IHDR, exactly 13 bytes of data;
//        - width and height (big-endian uint32) must each be
//          between 1 and 1024 pixels;
//        - the header fields must be legal PNG values (bit depth,
//          colour type, compression and filter methods, and an
//          interlace method of 0 or 1 — interlaced images are
//          accepted, the method is only reported);
//        - every chunk's CRC-32 must match the checksum stored
//          after its data (computed over chunk type + chunk data,
//          the way the PNG spec defines it). A single flipped bit
//          anywhere in a chunk fails the run;
//        - at least one IDAT chunk (the actual image data) must be
//          present;
//        - the file must end with an IEND chunk, and nothing may
//          follow it. A file cut short, or with trailing garbage,
//          is not a whole image.
//      The file must also be at most 1 MiB. Every failure names the
//      exact problem, the chunk or gate involved, and what to fix,
//      so a bad asset fails loudly instead of silently writing an
//      entry the judge would reject.
//   4. Create the output directory if it does not exist yet
//      ($MAKEFUN_OUTPUT_DIR, default /output).
//   5. Write the bytes to <output dir>/entry.png.
//   6. Verify the write: read the file back, compare its length and
//      its SHA-256 hash against the asset, and only then report
//      success — including the dimensions, the interlace method and
//      the hash. A short or corrupted write is an error, not a
//      silent success.
//
// Requirements: Node.js 22 or later, standard library only, nothing
// to install. The file uses no TypeScript-only syntax, so it runs
// under any Node with type stripping:
//
//   node main.ts                              # writes /output/entry.png
//   MAKEFUN_OUTPUT_DIR=out node main.ts       # writes out/entry.png
//   node main.ts --help                       # prints usage, exits 0
//   node main.ts --version                    # prints the version, exits 0

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Program identity and the bounty gate.
// ---------------------------------------------------------------------------

/** Program version, printed by --version. Bump it on every revision. */
const VERSION = "2.0.0";

/** Maximum image file size: 1 MiB. */
const MAX_BYTES = 1024 * 1024;
/** Maximum image width or height in pixels. */
const MAX_DIMENSION = 1024;
/** Minimum image width or height in pixels. */
const MIN_DIMENSION = 1;

/** The 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A. */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Usage text, printed by --help and by the unknown-flag error. */
const USAGE = [
  "ai-excited-01 — \"The Wave That Caught Fire\"",
  "",
  "Copies assets/entry.png to $MAKEFUN_OUTPUT_DIR/entry.png",
  "(default /output/entry.png), after validating it as a whole PNG",
  "against the bounty gate (at most 1 MiB, at most 1024x1024 pixels).",
  "Deterministic: every run writes identical bytes. No network,",
  "no clock, no randomness. Node.js 22 or later, standard library only.",
  "",
  "Usage:",
  "  node main.ts [--help] [--version]",
  "",
  "Options:",
  "  --help       Print this usage text and exit 0.",
  "  --version    Print the program version and exit 0.",
  "",
  "Environment:",
  "  MAKEFUN_OUTPUT_DIR   Output directory (default: /output).",
  "",
  "Examples:",
  "  node main.ts",
  "  MAKEFUN_OUTPUT_DIR=out node main.ts",
].join("\n");

// ---------------------------------------------------------------------------
// CRC-32 (IEEE 802.3, polynomial 0xEDB88320) — the checksum PNG uses
// for every chunk. Computed over chunk type + chunk data.
// ---------------------------------------------------------------------------

/** Lookup table for CRC-32, built once at load time. */
const CRC32_TABLE: Uint32Array = buildCrc32Table();

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

/** CRC-32 of a byte range, as an unsigned 32-bit integer. */
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// Paths: the asset lives next to this file; the output directory comes
// from the environment (the make.fun runner sets MAKEFUN_OUTPUT_DIR).
// ---------------------------------------------------------------------------

const root = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(root, "assets", "entry.png");
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");
const targetPath = join(outDir, "entry.png");

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** SHA-256 hex digest of a buffer, used to prove the copy is exact. */
function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Human-readable byte count, e.g. 635782 -> "635,782 bytes". */
function formatBytes(n: number): string {
  return `${n.toLocaleString("en-US")} bytes`;
}

/** Human-readable name for an IHDR interlace method byte. */
function describeInterlace(method: number): string {
  if (method === 0) return "none (0)";
  if (method === 1) return "Adam7 (1)";
  return `unknown (${method})`;
}

/** Human-readable name for an IHDR colour type byte. */
function describeColourType(type: number): string {
  switch (type) {
    case 0:
      return "grayscale (0)";
    case 2:
      return "truecolour (2)";
    case 3:
      return "indexed-colour (3)";
    case 4:
      return "grayscale+alpha (4)";
    case 6:
      return "truecolour+alpha (6)";
    default:
      return `unknown (${type})`;
  }
}

// ---------------------------------------------------------------------------
// Command-line flags: --help and --version only. Anything else is an
// error, so a mistyped flag can never silently run as a normal copy.
// ---------------------------------------------------------------------------

type CliAction = "run" | "help" | "version";

function parseArgs(argv: string[]): CliAction {
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") return "help";
    if (arg === "--version" || arg === "-V") return "version";
    throw new Error(
      `unknown argument "${arg}". This program takes no positional ` +
        `arguments and only --help and --version as flags.\n${USAGE}`,
    );
  }
  return "run";
}

// ---------------------------------------------------------------------------
// PNG validation.
//
// The validator walks the file chunk by chunk, exactly the way a PNG
// decoder would, and checks the structure the bounty gate requires:
// a whole image — every chunk with its checksum, and the image data
// its header describes, through to the end marker.
// ---------------------------------------------------------------------------

/** What the validator learned about the asset. */
interface PngInfo {
  bytes: Buffer;
  width: number;
  height: number;
  bitDepth: number;
  colourType: number;
  interlaceMethod: number;
  chunkCount: number;
  idatCount: number;
}

/**
 * Read and fully validate the entry image.
 *
 * Returns the asset bytes together with the facts read from its IHDR
 * chunk and the chunk walk. Throws an Error with a specific,
 * actionable message for every kind of bad asset instead of writing
 * anything.
 */
function loadValidatedAsset(path: string): PngInfo {
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

  // 3. Chunk walk. A chunk is: 4-byte big-endian data length, 4-byte
  //    type, <length> bytes of data, 4-byte CRC-32 over type + data.
  const info: PngInfo = {
    bytes,
    width: 0,
    height: 0,
    bitDepth: 0,
    colourType: 0,
    interlaceMethod: 0,
    chunkCount: 0,
    idatCount: 0,
  };
  let offset = PNG_MAGIC.length;
  let sawIend = false;
  let sawIhdr = false;

  while (offset < bytes.length) {
    const chunkStart = offset;

    // 3a. Room for the length + type fields.
    if (bytes.length - offset < 8) {
      throw new Error(
        `entry image is truncated: ${bytes.length - offset} byte(s) left ` +
          `at offset ${offset}, too few for another chunk header (needs 8). ` +
          `The file ends mid-chunk; the asset may be corrupt or cut short.`,
      );
    }
    const dataLength = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("latin1");
    const dataStart = offset + 8;
    const dataEnd = dataStart + dataLength;
    const crcEnd = dataEnd + 4;

    // 3b. Room for the data + the stored CRC.
    if (crcEnd > bytes.length) {
      throw new Error(
        `entry image is truncated: chunk "${type}" at offset ${chunkStart} ` +
          `claims ${formatBytes(dataLength)} of data, but the file ends ` +
          `after ${formatBytes(bytes.length - dataStart)} of it. ` +
          `The asset may be corrupt or cut short.`,
      );
    }

    // 3c. CRC-32: computed over chunk type + chunk data, compared with
    //     the 4 bytes stored after the data. One flipped bit anywhere
    //     in the chunk fails the run.
    const storedCrc = bytes.readUInt32BE(dataEnd);
    const computedCrc = crc32(bytes.subarray(offset + 4, dataEnd));
    if (storedCrc !== computedCrc) {
      throw new Error(
        `entry image has a bad CRC-32 in chunk "${type}" at offset ${chunkStart}: ` +
          `stored 0x${storedCrc.toString(16).padStart(8, "0")}, ` +
          `computed 0x${computedCrc.toString(16).padStart(8, "0")}. ` +
          `The chunk's bytes were changed or corrupted; re-export assets/entry.png.`,
      );
    }

    info.chunkCount += 1;

    // 3d. The first chunk must be IHDR, exactly 13 bytes of data.
    if (!sawIhdr) {
      if (type !== "IHDR") {
        throw new Error(
          `entry image is not a well-formed PNG: its first chunk is "${type}", ` +
            `but the first chunk of every PNG must be "IHDR". The asset may be corrupt.`,
        );
      }
      if (dataLength !== 13) {
        throw new Error(
          `entry image has a malformed IHDR chunk (length ${dataLength}, expected 13). ` +
            `The asset may be corrupt.`,
        );
      }
      sawIhdr = true;
      info.width = bytes.readUInt32BE(dataStart);
      info.height = bytes.readUInt32BE(dataStart + 4);
      info.bitDepth = bytes[dataStart + 8];
      info.colourType = bytes[dataStart + 9];
      const compressionMethod = bytes[dataStart + 10];
      const filterMethod = bytes[dataStart + 11];
      info.interlaceMethod = bytes[dataStart + 12];

      // 3e. Dimension gate: each side must be between 1 and 1024 pixels.
      if (info.width === 0 || info.height === 0) {
        throw new Error(
          `entry image has an impossible size from its IHDR chunk: ` +
            `${info.width}x${info.height}. The asset may be corrupt.`,
        );
      }
      if (info.width > MAX_DIMENSION || info.height > MAX_DIMENSION) {
        throw new Error(
          `entry image is ${info.width}x${info.height}, over the ` +
            `${MAX_DIMENSION}x${MAX_DIMENSION} gate. Resize assets/entry.png to at most ` +
            `${MAX_DIMENSION}x${MAX_DIMENSION} and try again.`,
        );
      }

      // 3f. The header fields must be legal PNG values.
      if (![1, 2, 4, 8, 16].includes(info.bitDepth)) {
        throw new Error(
          `entry image has an illegal bit depth ${info.bitDepth} in its IHDR chunk ` +
            `(PNG allows 1, 2, 4, 8 or 16). The asset may be corrupt.`,
        );
      }
      if (![0, 2, 3, 4, 6].includes(info.colourType)) {
        throw new Error(
          `entry image has an illegal colour type ${info.colourType} in its IHDR chunk ` +
            `(PNG allows 0, 2, 3, 4 or 6). The asset may be corrupt.`,
        );
      }
      if (compressionMethod !== 0) {
        throw new Error(
          `entry image has an unknown compression method ${compressionMethod} ` +
            `in its IHDR chunk (PNG defines only 0). The asset may be corrupt.`,
        );
      }
      if (filterMethod !== 0) {
        throw new Error(
          `entry image has an unknown filter method ${filterMethod} ` +
            `in its IHDR chunk (PNG defines only 0). The asset may be corrupt.`,
        );
      }
      if (info.interlaceMethod !== 0 && info.interlaceMethod !== 1) {
        throw new Error(
          `entry image has an unknown interlace method ${info.interlaceMethod} ` +
            `in its IHDR chunk (PNG defines 0 = none, 1 = Adam7). The asset may be corrupt.`,
        );
      }
      // Note: interlace 1 (Adam7) is NOT rejected — an interlaced PNG
      // is a whole, valid PNG. The method is only reported on success.
    } else if (type === "IHDR") {
      throw new Error(
        `entry image has a second IHDR chunk at offset ${chunkStart}; ` +
          `a PNG holds exactly one. The asset may be corrupt.`,
      );
    }

    // 3g. Count the image-data chunks; a PNG with no IDAT holds no image.
    if (type === "IDAT") {
      info.idatCount += 1;
    }

    // 3h. IEND: zero-length, and it must be the very last chunk — the
    //     end marker of a whole image. Anything after it is trailing
    //     garbage, and a file without it was cut short.
    if (type === "IEND") {
      if (dataLength !== 0) {
        throw new Error(
          `entry image has a malformed IEND chunk at offset ${chunkStart} ` +
            `(length ${dataLength}, expected 0). The asset may be corrupt.`,
        );
      }
      if (crcEnd !== bytes.length) {
        throw new Error(
          `entry image has ${formatBytes(bytes.length - crcEnd)} of trailing bytes ` +
            `after its IEND chunk at offset ${chunkStart}. A PNG ends at IEND; ` +
            `the extra bytes are not part of the image.`,
        );
      }
      sawIend = true;
      offset = crcEnd;
      break;
    }

    offset = crcEnd;
  }

  // 4. The walk must have ended on IEND, not on the end of the file.
  if (!sawIend) {
    throw new Error(
      "entry image has no IEND chunk: the file ends before the PNG end marker. " +
        "It is not a whole image — the asset may be truncated or cut short. " +
        "Re-export assets/entry.png.",
    );
  }
  if (info.idatCount === 0) {
    throw new Error(
      "entry image has no IDAT chunk: it carries a header but no image data. " +
        "The asset may be corrupt or empty. Re-export assets/entry.png.",
    );
  }

  return info;
}

// ---------------------------------------------------------------------------
// Output directory and the write itself.
// ---------------------------------------------------------------------------

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
// Main: flags first, then validate, prepare, write, verify, report.
// ---------------------------------------------------------------------------

function main(): void {
  const action = parseArgs(process.argv.slice(2));
  if (action === "help") {
    console.log(USAGE);
    return;
  }
  if (action === "version") {
    console.log(`ai-excited-01 main.ts version ${VERSION}`);
    return;
  }

  const info = loadValidatedAsset(sourcePath);
  ensureOutputDir(outDir);
  writeAndVerify(info.bytes, targetPath);
  console.log(
    `wrote ${targetPath} (${formatBytes(info.bytes.length)}, ` +
      `${info.width}x${info.height} PNG, ` +
      `${info.bitDepth}-bit ${describeColourType(info.colourType)}, ` +
      `interlace ${describeInterlace(info.interlaceMethod)}, ` +
      `${info.chunkCount} chunks incl. ${info.idatCount} IDAT, ` +
      `sha256 ${sha256Hex(info.bytes)})`,
  );
}

main();
