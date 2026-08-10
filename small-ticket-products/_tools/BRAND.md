# Courtright Collective brand kit (for these products)

Everything in `small-ticket-products/` uses this palette and type so the whole
library looks like it came from one studio. Pulled straight from courtrightco.com.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Midnight | `#0E1520` | Backgrounds, headlines, ink |
| Ash | `#1A2030` | Secondary dark, gradient stop |
| Copper | `#C45C28` | Primary accent, buttons, links |
| Copper Light | `#D97040` | Hover, gradient stop |
| Gold | `#D9A030` | Secondary accent, rules, callouts |
| Gold Light | `#F0B840` | Highlights, badges |
| Smoke | `#7A7268` | Muted text |
| Parchment | `#F4EBD9` | Text on dark |
| Cream | `#FAF6EF` | Page background |

Sub-brand accents: TinkerTaps `#F0B800` (+ `#E86A33`), Trivd `#FF2D92` (+ `#7B5BFF`).

## Type

- Display: **Cormorant Garamond** (300/400/600/700)
- Body: **Outfit** (300/400/500/600/700/800)
- Mono: SF Mono / Menlo / Consolas / DejaVu Sans Mono

## Voice rules baked into every deliverable

- Confident, witty, warm, real. Fellow traveler, never guru.
- No em dashes. Anywhere. Ever.
- No "game-changer," "unlock," "revolutionary," "disruption."
- No woe-is-me hooks.
- Lists when explaining anything multi-part.

## Building the PDFs

```bash
cd small-ticket-products
python3 _tools/build_pdf.py <slug>/<file>.md <slug>/<file>.pdf
```

Cover metadata lives in an HTML comment at the top of each Markdown file:

```
<!--pdf
title: ASO Cheat Sheet
subtitle: The App Store listing checklist I use on every launch
kicker: Courtright Collective
brand: courtright
badges: 2026 Edition | iOS + Android | 12 Pages
-->
```

Requirements: `pip install markdown` and a Chromium binary (paths are listed at
the top of `build_pdf.py`). Fonts are embedded as base64 in `brand-fonts.css`,
so PDF builds work offline and always render on-brand.
