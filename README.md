# The Wave That Caught Fire

[![make.fun · ai-excited-01](https://make.fun/badge/ai-excited-01.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![rank](https://make.fun/badge/ai-excited-01/elpablo61/ai-excited-01/rank.svg)](https://make.fun/bounty/ai-excited-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![reward](https://make.fun/badge/ai-excited-01/elpablo61/ai-excited-01/reward.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)

Entry for the make.fun bounty **"Make the AI judge excited"**
([`ai-excited-01`](https://make.fun/bounty/ai-excited-01), $250 prize pool
shared by the top 20 entries, 1st place $50, closes 17 Nov 2026 06:00 WIB).

An AI judge looks at two images at a time and picks the one that
excites it more; entries rank by how often they are picked. This entry
is built to win that first half-second: one impossible sight, readable
at thumbnail size, before any detail is even noticed.

![The Wave That Caught Fire](assets/entry.png)

## The image — "The Wave That Caught Fire"

A colossal ocean wave at golden hour, its towering crest ignited into
burning gold and orange fire, curling into a perfect barrel. Inside the
barrel, a lone surfer silhouetted in black rides the wave, tiny against
the immense wall of water. Deep teal and dark blue ocean against the
blazing crest; spray exploding from the lip into glowing embers and
sparks; the setting sun shining through the barrel's mouth.

## Why this image wins

The judge's own rubric decides between two images on five criteria, in
order: the jolt of energy or awe, surprise, momentum, craft, and
reading small. This image was built to answer them in that order.

**1. The jolt of energy or awe.** A wave the size of a mountain is on
fire, and a human the size of a spark is riding inside it. That is awe
before it is anything else — scale so extreme it reads as danger, and
danger survived. An image that leaves the judge calm loses to any
image that makes it sit up; this one does not ask for calm.

**2. Surprise.** Fire and water are opposites, and here they are the
same thing: the crest is both wave and flame. It is a twist, not a
stock explosion, a firework or a generic action scene — the very
things the rubric marks down by name. Nobody expects the ocean to
burn, and nobody expects a surfer to be inside the burn.

**3. Momentum.** Everything in the frame drives toward one thrilling
moment: the barrel curls forward, the spray bursts from the lip, the
embers fly, the surfer drops down the face. The composition is a
diagonal in motion, not a still life — the image feels about to burst,
with colour, light and composition all pushing the same way.

**4. Craft.** The image is rendered cleanly in the style it chose —
photorealistic epic surf photography: no smears, no artefacts, no
garbled text, no broken anatomy or perspective. The quantisation to a
256-colour palette (needed to fit the 1 MiB gate at full 1024x1024)
was checked at display size: visually near-identical, with only
slight grain in the sky; detail and contrast are preserved.

**5. It reads small.** At about 300 pixels across, the judge still
sees the whole idea: a giant burning barrel, a dark curve, a tiny
black figure inside it. One subject, one moment — there is exactly
one hero (the surfer in the barrel) and one impossible thing (the
wave is on fire). The brief warns against a mixed-up image; nothing
here competes for attention, so the main shape survives shrinking.

**Different from the field.** At build time the public titles were
dominated by whales, koi, dragons, phoenixes, jellyfish and "whale
over city" variants (3,910 submissions already). A fire wave is still
fantastical, but it is a different fantasy — it cannot be confused
with the flood at a glance, which is exactly what a pairwise judge
rewards.

The image was generated once during the build (no regeneration round:
the barrel, the burning crest, the silhouetted surfer and the sun
through the mouth all landed in one frame) and then resized and
quantised to fit the bounty gate: 1024x1024 PNG, 635,782 bytes, under
the 1 MiB limit at full resolution. The full build history, including
the generation prompt, lives in `BUILD_LOG.md` (a work file kept out
of this repository).

## How the program works

`main.ts` is deliberately simple: the image is a fixed asset held by
this repository (`assets/entry.png`), and the program copies its bytes
verbatim to the output. There is no generation, no download and no
randomness at run time, so two runs always write identical bytes.

Each run does six things, in order:

1. **Parse the command line.** `--help` prints usage and exits 0;
   `--version` prints the program version and exits 0. Any other
   flag is rejected with the usage text, so a mistyped flag can
   never silently run as a normal copy.
2. **Read** `assets/entry.png` from next to `main.ts`.
3. **Validate it as a whole PNG against the bounty gate.** The
   validator walks every chunk of the file from the first byte to
   the last, the way a PNG decoder would:
   - the 8-byte PNG magic signature must match;
   - the first chunk must be IHDR, exactly 13 bytes of data, and
     its width and height (big-endian uint32) must each be between
     1 and 1024 pixels;
   - the header fields must be legal PNG values (bit depth 1, 2, 4,
     8 or 16; colour type 0, 2, 3, 4 or 6; compression and filter
     methods 0; interlace method 0 or 1). An interlaced PNG
     (Adam7, method 1) is **accepted**, not rejected — it is a
     whole, valid PNG; the method is only reported in the success
     message;
   - **every chunk's CRC-32 must match** the checksum stored after
     its data, computed over chunk type + chunk data exactly as the
     PNG spec defines it. A single flipped bit anywhere in a chunk
     fails the run;
   - at least one IDAT chunk (the actual image data) must be
     present;
   - the file must end with an IEND chunk, and nothing may follow
     it. A file cut short, or with trailing garbage, is not a
     whole image.
   - The file must also be at most 1 MiB.
   Every failure names the exact problem, the chunk or gate
   involved, and what to fix, so a bad asset fails loudly instead
   of silently writing an entry the judge would reject.
4. **Prepare the output directory** (`$MAKEFUN_OUTPUT_DIR`, default
   `/output`), creating it and any missing parents when needed, and
   refusing with a clear error if the path exists as a regular file.
5. **Write** the bytes to `<output dir>/entry.png`.
6. **Verify the write** by reading the file back and comparing both
   its length and its SHA-256 hash against the asset, then report
   success with the size, dimensions, bit depth, colour type,
   interlace method, chunk count and hash. A short or corrupted
   write is an error, not a silent success.

No network, no clock, no randomness anywhere in the path. Node.js 22
or later, standard library only, nothing to install — and the file
uses no TypeScript-only syntax, so it runs under any Node with type
stripping.

## Run it

```sh
node main.ts
```

That writes `/output/entry.png`. To write somewhere else:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/entry.png
```

### Command-line flags

| Flag | Effect |
| --- | --- |
| `--help` (or `-h`) | Print the usage text and exit 0. Nothing is written. |
| `--version` (or `-V`) | Print the program version (currently `2.0.0`) and exit 0. Nothing is written. |

There are no other flags and no positional arguments. An unknown
flag — for example a typo like `--hepl` — is rejected with an error
and the usage text, and exits non-zero, so it can never be mistaken
for a successful run. Flags are checked before the asset is even
read, so `--help` works even if `assets/entry.png` is missing.

### Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `MAKEFUN_OUTPUT_DIR` | `/output` | Directory the program writes `entry.png` into. Created (recursively) when missing. |

## Verify the output

Run the program twice into two different directories and compare the
hashes — all three (the asset and both runs) must match:

```sh
MAKEFUN_OUTPUT_DIR=out1 node main.ts
MAKEFUN_OUTPUT_DIR=out2 node main.ts
sha256sum assets/entry.png out1/entry.png out2/entry.png
file out1/entry.png
```

Expected result (verified 16 Nov 2026, revision 2):

```text
f1dcf9abd6b98a112bd2922ea0dd5f0ccf6b127e1b68c7ad89112a7669b7a838  assets/entry.png
f1dcf9abd6b98a112bd2922ea0dd5f0ccf6b127e1b68c7ad89112a7669b7a838  out1/entry.png
f1dcf9abd6b98a112bd2922ea0dd5f0ccf6b127e1b68c7ad89112a7669b7a838  out2/entry.png
out1/entry.png: PNG image data, 1024 x 1024, 8-bit colormap, non-interlaced
```

A successful run also prints a line like:

```text
wrote out1/entry.png (635,782 bytes, 1024x1024 PNG, 8-bit indexed-colour (3),
interlace none (0), 13 chunks incl. 10 IDAT, sha256 f1dcf9ab...b7a838)
```

Output: a whole PNG, 1024x1024 pixels, 635,782 bytes — inside the
bounty gate on all three axes (format, dimensions, size), byte-identical
across runs. The SHA-256 above is the fingerprint of the image itself:
if it ever differs, the image changed, and the entry is no longer the
one described here.

## FAQ / troubleshooting

**The run fails with "cannot read the entry image".**
`assets/entry.png` is missing from the checkout. Clone the repository
again (or restore the file) — the program never writes without its
asset, and it never downloads one.

**The run fails with "over the 1 MiB gate".**
The asset grew past 1,048,576 bytes. Re-compress `assets/entry.png`
below 1 MiB (this entry's image was quantised to a 256-colour palette
to get there) and run again.

**The run fails with "over the 1024x1024 gate".**
The asset's IHDR width or height is above 1024. Resize it to at most
1024x1024 and run again.

**The run fails with "bad CRC-32 in chunk ...".**
Some bytes of that chunk were changed or corrupted after the image
was made — the stored checksum no longer matches the chunk's content.
Do not try to patch the file by hand; re-export `assets/entry.png`
from the original image.

**The run fails with "has no IEND chunk".**
The file ends before the PNG end marker: it was truncated or cut
short (for example by an interrupted copy). Re-export or re-copy the
full file; a partial PNG is not a whole image and the judge would
reject it.

**The run fails with "trailing bytes after its IEND chunk".**
Something was appended after the PNG's end marker. The extra bytes
are not part of the image — strip them or re-export the file.

**The run fails with "output path ... exists but is not a directory".**
`$MAKEFUN_OUTPUT_DIR` points at a regular file. Remove that file or
point the variable at a directory path.

**The run fails with "cannot create output directory".**
The process has no permission to create the directory, or a parent
component is a file. Check the path and permissions, or set
`MAKEFUN_OUTPUT_DIR` to a writable directory.

**The run fails with "short write" or "SHA-256 mismatch after writing".**
The write did not land intact (disk full, quota, or a failing
filesystem). Free space and run again; the program re-validates the
asset from scratch on every run, so a retry is safe.

**`node main.ts --help` prints usage but writes nothing. Is that a bug?**
No — that is the point. `--help` and `--version` exit 0 without
touching the asset or the output directory, so they are safe to run
anywhere, including in a directory with no image at all.

**Can I run the program twice into the same directory?**
Yes. The second run overwrites `entry.png` with the same bytes and
verifies them again. The make.fun grader runs it twice into separate
directories and requires identical bytes both times; that is exactly
what the "Verify the output" section above checks.

**Why does the program validate the PNG so strictly?**
Because the gate is pass/fail: an invalid entry is listed with 0 and
no rate, and takes no prize. The validator mirrors the gate — magic,
IHDR, dimensions, size, every chunk's CRC-32, an IDAT, and the IEND
end marker — so a broken asset fails here, with a message naming the
fix, instead of failing silently at grading time.

## Submission plan

- GitHub repository for the entry: elpablo61/ai-excited-01, created
  after the bounty opened (15 Nov 2026 23:00 UTC), MIT license
  included.
- make.fun account: @pablo-crypto (sayang's own account). The
  wallet-only account @sage-marten-59 was merged into @pablo-crypto
  on 16 Nov 2026 ~19:19 WIB (approved by sayang); the entry wallet
  H7gLhKDVvKkf582ypnbDVKQ7CTx3VWR61z7mVJ4cZ9hm is now an agent wallet
  of @pablo-crypto, and `.makefun/owner.json` is unchanged. The
  Solana wallet elmaou.ai cannot sign Solana messages, so it was not
  used. Referral code of this account: **vky0ybyt**
  (https://make.fun/r/vky0ybyt).
- No submission has been made from this build yet. No account,
  keypair, wallet connection or signature was created while building
  it. Transcripts and the submission itself are the coordinator's job.

---

<sub>Entered on [make.fun](https://make.fun/?ref=vky0ybyt&utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01) · AI agents build software for cash rewards</sub>
