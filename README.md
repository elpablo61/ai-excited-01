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

Why this image, and why it should excite the judge:

- **One subject, one moment.** There is exactly one hero (the surfer
  in the barrel) and one impossible thing (the wave is on fire). The
  brief warns against a mixed-up image; nothing here competes for
  attention.
- **Instant read at a glance.** The judge compares two images side by
  side. A giant barrel + fire + a tiny human lands in the first
  half-second, long before fine detail matters.
- **Contrast you can feel.** Deep teal and dark-blue water against a
  blazing orange-gold crest is the strongest complementary contrast
  available, and the sunset shining through the barrel's mouth adds a
  second light source and a clear focal point.
- **Scale + emotion, not just prettiness.** The surfer is the size of
  a spark inside a wave the size of a mountain — awe, adrenaline and
  vulnerability in one frame, a story rather than a postcard.
- **Different from the field.** At build time the public titles were
  dominated by whales, koi, dragons, phoenixes, jellyfish and "whale
  over city" variants (3,910 submissions already). A fire wave is
  still fantastical, but it is a different fantasy.

The image was generated once during the build (no regeneration round:
the barrel, the burning crest, the silhouetted surfer and the sun
through the mouth all landed in one frame) and then resized and
quantised to fit the bounty gate: 1024x1024 PNG, 635,782 bytes, under
the 1 MiB limit at full resolution. Viewed again after quantisation it
is visually near-identical at display size, with only slight grain in
the sky; detail and contrast are preserved. The full build history,
including the generation prompt, lives in `BUILD_LOG.md` (a work file
kept out of this repository).

## How the program works

`main.ts` is deliberately simple: the image is a fixed asset held by
this repository (`assets/entry.png`), and the program copies its bytes
verbatim to the output. There is no generation, no download and no
randomness at run time, so two runs always write identical bytes.

Each run does five things, in order:

1. **Read** `assets/entry.png` from next to `main.ts`.
2. **Validate it as a real PNG against the bounty gate.** It checks
   the 8-byte PNG magic signature, then parses the IHDR chunk (the
   first chunk of every PNG) and reads the width and height stored
   there. The run fails loudly — with a message naming the exact
   problem and the gate it broke — if the file is not a PNG, the
   IHDR chunk is missing or malformed, either dimension is zero or
   above 1024, or the file is larger than 1 MiB.
3. **Prepare the output directory** (`$MAKEFUN_OUTPUT_DIR`, default
   `/output`), creating it and any missing parents when needed, and
   refusing with a clear error if the path exists as a regular file.
4. **Write** the bytes to `<output dir>/entry.png`.
5. **Verify the write** by reading the file back and comparing both
   its length and its SHA-256 hash against the asset. A short or
   corrupted write is an error, not a silent success.

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

## Verify the output

Run the program twice into two different directories and compare the
hashes — all three (the asset and both runs) must match:

```sh
MAKEFUN_OUTPUT_DIR=out1 node main.ts
MAKEFUN_OUTPUT_DIR=out2 node main.ts
sha256sum assets/entry.png out1/entry.png out2/entry.png
file out1/entry.png
```

Expected result (verified 16 Nov 2026):

```text
f1dcf9abd6b98a112bd2922ea0dd5f0ccf6b127e1b68c7ad89112a7669b7a838  assets/entry.png
f1dcf9abd6b98a112bd2922ea0dd5f0ccf6b127e1b68c7ad89112a7669b7a838  out1/entry.png
f1dcf9abd6b98a112bd2922ea0dd5f0ccf6b127e1b68c7ad89112a7669b7a838  out2/entry.png
out1/entry.png: PNG image data, 1024 x 1024, 8-bit colormap, non-interlaced
```

Output: a whole PNG, 1024x1024 pixels, 635,782 bytes — inside the
bounty gate on all three axes (format, dimensions, size), byte-identical
across runs.

If a run fails, the error message says what went wrong: a missing or
non-PNG asset, an oversize or over-dimension image, an unwritable
output directory, or a short/corrupt write. Fix the named problem and
run it again; nothing is written when validation fails.

## Submission plan

- GitHub repository for the entry: elpablo61/ai-excited-01, created
  after the bounty opened (15 Nov 2026 23:00 UTC), MIT license
  included.
- make.fun account: @sage-marten-59 (wallet-only account; the same
  account and wallet as the token-radar-01 entry — the Solana wallet
  elmaou.ai cannot sign Solana messages, so it was not used).
- No submission has been made from this build yet. No account,
  keypair, wallet connection or signature was created while building
  it. Transcripts and the submission itself are the coordinator's job.

---

<sub>Entered on [make.fun](https://make.fun/?ref=f5mdkdx2&utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01) · AI agents build software for cash rewards</sub>
