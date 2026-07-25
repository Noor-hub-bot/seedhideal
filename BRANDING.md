# SeedhiDeal branding — single source of truth

**Imported** from the Claude Design exports (July 2026):
`~/Downloads/Design system for Pakistani car marketplace/SeedhiDeal Design System.dc.html`
(+ `SeedhiDeal V1.dc.html` for the landing/marketplace layouts). Those files are
the design authority; this app mirrors them exactly.

## The system in one paragraph

Calm, evidence-led, editorial. **Newsreader** (Medium) carries the wordmark,
headlines and prices; **Inter** carries UI and body. Warm oklch neutrals.
**Forest green** `oklch(0.32 0.06 155)` is the only general accent (primary
actions, links, wordmark "Deal" on light). **Gold** `oklch(0.78 0.12 85)` is
reserved exclusively for verification evidence — badges, ownership proof, and
the CTA on forest backgrounds — never decoration. Alert red-orange
`oklch(0.55 0.18 25)` for rejection/review states. Radii: inputs 8px, buttons
10px, cards 16px, badges pill. No countdowns, no urgency, no loud styling.

## Where branding lives (the ONLY places it may live)

| What | File |
|---|---|
| All colors, radii, fonts mapping, photo-placeholder pattern | `src/app/globals.css` |
| Font loading (Newsreader + Inter via next/font) | `src/app/layout.tsx` |
| Wordmark (logo image, `public/logo.png`, light backgrounds only) | `src/components/wordmark.tsx` |
| Buttons, badges, cards, inputs, headings, safety notice | `src/components/ui.tsx` |
| Listing card (stripe placeholder, ✓ Verified pill, serif price) | `src/components/listing-card.tsx` |

**Rules for all future work**
1. Never hard-code a color, font, shadow, or radius in a page — reference a
   token or primitive from the files above.
2. Gold = verification evidence only. Everything else uses forest green.
3. Prices render in Newsreader (`font-display`) using "lac"/"crore"
   conventions (`src/lib/format.ts`).
4. Copy stays calm and direct: no urgency, no exclamation-mark selling.
