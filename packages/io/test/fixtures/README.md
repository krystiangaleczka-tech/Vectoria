# VEC014 — format fidelity corpus

This directory contains the executable compatibility baseline for PDF, AI, CDR and EPS imports.

## Provenance and licensing

Every fixture in `format-corpus.ts` is generated from small synthetic byte/text sequences authored specifically for Vectoria tests. They contain no customer files, third-party artwork, fonts, linked assets, Illustrator documents, CorelDRAW documents or other vendor-owned samples.

- `provenance: synthetic-vectoria` means the fixture is generated inside the repository.
- `license: repository` means the fixture is covered by the repository's existing licensing terms; no separate third-party license is being asserted.
- New real-world fixtures must record source, permission/license and expected compatibility before they are committed.
- Customer/user files must not be committed as fixtures without explicit permission and anonymization.

## What is enforced

`format-corpus.test.ts` runs every fixture through the same public importer/provider path used by the product and records:

- format and fixture ID;
- input byte count;
- observed status: `ok-partial`, `unsupported` or `rejected`;
- imported object count;
- compatibility report counts: editable, simplified, flattened and unsupported;
- required report codes;
- controlled error text for rejected inputs.

The suite also produces a deterministic per-format summary and explicitly asserts rejection/unsupported totals so degraded support cannot silently become a claimed success.

## Current baseline

| Fixture | Format | Main capability | Expected |
| --- | --- | --- | --- |
| `pdf-basic-vector-text` | PDF | vector paths + text | editable |
| `pdf-cmyk-vector` | PDF | CMYK vector paint | editable |
| `pdf-advanced-operators` | PDF | clipping/shading/XObject operators | simplified + reported |
| `pdf-multi-stream` | PDF | multiple content streams/page count | editable |
| `ai-pdf-compatible` | AI | PDF-compatible payload | editable |
| `ai-postscript-compatible` | AI | legacy PostScript payload | editable |
| `ai-unrecognized-payload` | AI | no PDF/PS representation | controlled rejection |
| `eps-basic-vector` | EPS | path/stroke | editable |
| `eps-text` | EPS | text | editable |
| `eps-invalid-header` | EPS | invalid header | controlled rejection |
| `cdr-embedded-svg` | CDR | ZIP container with recoverable SVG | editable |
| `cdr-riff-no-vector-stream` | CDR | binary RIFF/RIFX without supported stream | unsupported + reported |
| `cdr-invalid-header` | CDR | invalid header | controlled rejection |

## Intentionally not claimed by this corpus

This baseline does **not** prove full compatibility with production files from Illustrator, InDesign, CorelDRAW or print workflows. The following still require legally sourced real-world samples before public compatibility claims can be widened:

- PDF font encodings/subsets and complex text shaping;
- image XObjects and linked/embedded raster assets;
- clipping correctness beyond the current reported simplification;
- transparency groups, blend modes and advanced gradients;
- compressed/filter combinations found in production PDFs;
- Illustrator-version-specific metadata and linked assets;
- native binary CDR record decoding across versions;
- EPS image operators and arbitrary PostScript programs;
- visual-diff reference renders and export-after-import fidelity for vendor-origin files;
- peak-memory measurements for large inputs.

Those are compatibility gaps, not hidden passes. Future fixtures should extend this corpus rather than creating one-off parser tests.

## Targeted run

```bash
pnpm --filter @vectoria/io exec vitest run test/format-corpus.test.ts
```

The normal `@vectoria/io` test suite also includes this file.
