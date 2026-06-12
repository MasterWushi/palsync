---
name: palbuilder-design
description: "Makes PalBuilder (CloudPiston) front-end output look professionally designed instead of AI-generated. Use ALONGSIDE palbuilder-frontend for any pal UI — pages, fragments, dashboards, forms, marketing sites. Especially trigger when the spec is light on design detail — that's when the agent must supply the taste."
---

# PalBuilder Design Skill

Pairs with `palbuilder-frontend` (valid `c:` markup). This skill governs what good looks like: how to derive it from real references, how to measure it, and what rules survived user review in production.

---

## The law: build DESIGN-REFERENCES.md before any CSS

The first homepage built with design tokens but no reference process was rejected as "AI slop." What fixed it: a file that commits the design to paper before a single CSS rule is written. Do this before styling any new pal.

### Step 1 — collect references

Ask the user for 2–4 real sites or images: "What do you want it to feel like? Show me anything — a competitor, a site you admire, a screenshot." If they provide none, pick from the known-good list: Duna, Mercury, Superpower, Linear, Stripe, Vercel. The user's eye beats any heuristic.

### Step 2 — read every reference image as an image

Use the Read tool on each PNG/JPG/screenshot. Do not describe from memory. Study spatial arrangement: where is the hero headline positioned? How much whitespace above/below the fold? What interrupts the vertical rhythm? What is in the footer?

### Step 3 — write a steal-map per reference

For each reference, write a named section with:
- What to steal (specific and spatial — "full-bleed painted hero, headline set in the pale sky area, one sub-line, one CTA")
- What to skip (what makes it theirs that doesn't translate)
- Where to apply it in this project ("Apply to [project]: …")

Example from OBE DESIGN-REFERENCES.md (steal this pattern):
```
## Duna — THE BACKBONE. Use for: hero, footer, stats
- Painted landscape hero. Full-bleed warm illustrated landscape; centered headline
  set IN the sky area; one short sub-line; one CTA.
- Stat row: three big numerals + tiny muted labels (10.6x / 37% / 4.8x) on clean
  paper. No boxes around them.
Apply to [project]: hero = [art asset] full-bleed, centered heading in pale sky, sub + CTA.
```

### Step 4 — derive the palette FROM the project's actual art

Sample hex values from the brand images/watercolors/photos, not from the house defaults. Name each token by its role and source ("burnt gold — train light"). Kill any color that clashes with the art's dominant light. Write a token table with columns: token, hex, role.

Never invent hexes. If there is no brand art yet, use the house defaults and flag it: "Palette is placeholder — swap once brand assets arrive."

### Step 5 — build the component inventory

As you design each section, add a row to the inventory table: component name, CSS class(es), when to reuse it. Every new page pulls from this table first. This prevents reinvention and drift.

### Step 6 — maintain the art registry

Track which image file is assigned to which surface (hero, footer, CTA band, OG image). Check it before assigning any image to a new surface. Prevents the same painting appearing in two adjacent sections.

### Step 7 — record every user veto as permanent law

When the user rejects a design choice: add it to DESIGN-REFERENCES.md as a named rule (not a comment). Example from OBE: "RULE (Sam, 2026-06-11): NO visual breadcrumbs on any page." Every future session reads this file first. Vetoes do not expire.

The resulting DESIGN-REFERENCES.md is your single source of truth. No CSS without it.

---

## Measure, don't vibe

Design quality is measurable. Fetch the reference sites' production CSS and extract real values — don't approximate from memory.

### Craft tokens to extract

Fetch each reference site's main CSS (WebFetch on the stylesheet URL from the page source). Extract:
- Display tracking (letter-spacing on h1/h2/h3)
- Display leading (line-height on display type)
- Body size and leading
- Shadow recipes: how many layers, what alpha values
- Easing curves (look for `cubic-bezier`)
- Reveal timing and travel distance (`translateY` + `transition-duration`)
- Micro-hover timing on links/buttons
- Section depth (padding-top/bottom on `section`)
- Radius scale
- `text-wrap` usage on headings

Record these in a Craft tokens table in DESIGN-REFERENCES.md, attributing each to its source.

### OBE-measured defaults (starting values until you measure your own references)

| token | value | source |
|---|---|---|
| display tracking | h1 -0.022em / h2 -0.016em / h3 -0.01em | Duna |
| display leading | h1 1.06 / h2 1.14 | Duna/Mercury |
| body | 18px / 1.6 | Duna |
| card shadow | 0 1px 2px rgba(x,x,x,0.05) + 0 6px 18px rgba(x,x,x,0.07) | Superpower |
| motion curve | cubic-bezier(.16,1,.3,1) — ease-out-expo | Superpower (68 uses) |
| reveal | 0.7s expo, 26px translateY | Mercury/Superpower |
| micro-hover | 0.18–0.25s; color only; buttons lift -1px | refs |
| headings | text-wrap: balance | Duna (117) / Superpower (130) |
| section depth | clamp(80px, 10vw, 136px) | Duna |
| radius | 10–12px on cards/mocks | refs |

### Score your CSS and close gaps

After writing CSS, check each token against the table. Where you drifted, add an override block with a comment naming the reference. Never leave display type at default tracking (0) or sections at padding 40px — these are the instant AI tells.

### Contrast law — compute, don't assume

WCAG AA minimum: 4.5:1 for normal text, 3:1 for large text. Check every new color pairing:
- Muted body text needs ≥72% ink alpha on warm paper (60% often fails)
- Accent colors that pass on pure white frequently FAIL on warm/tan surfaces — compute per surface
- On dark espresso: check cream percentages; gold/brass decorative strokes (~1.9:1) are fills/glyphs only, never text
- Use the formula or a contrast tool; do not eyeball

---

## Composition rules that survived user review

These came out of the OBE build. Keep them.

**Rhythm**
- Never two same-tone sections adjacent. Alternate: light canvas → warm sand → dark band → light canvas.
- One shadow style per project (choose layered low-alpha; drop neon/hard/colored shadows entirely).
- At most 2 eyebrow/category labels visible per viewport.
- Every page has at least one rhythm break — a full-bleed band, a centered giant number, a section with 2× normal vertical padding. If every section is the same width and padding, the page is monotonous.

**Grids and cards**
- No default equal-card grids. Rank cards by importance; let the lead card be wider or taller.
- No hover-lift on non-interactive (display-only) cards. Lift signals clickability.
- Product mocks (real UI screenshots or faithful HTML mockups) beat decoration in every feature section.

**CTAs and navigation**
- CTA bands carry a real heading — not just a button floating in space.
- Every page has a "you are here" signal: context eyebrow + active nav state.
- No visual breadcrumbs. Put BreadcrumbList in JSON-LD only.

**The slop test**
Read the hero copy aloud and ask: could this hero appear unchanged on an unrelated product (a CRM, a law firm, a food app)? If yes, rewrite it. The hero must be specific to this product and this audience — no generic promises.

**Anti-patterns (the AI default layouts to break)**
- Left-text / right-image hero with two buttons. The single most overused AI layout.
- Three equal-column feature grid (01, 02, 03). Feels like a PowerPoint deck.
- Every section the same max-width, same padding, identical structure. Monotonous.
- Full page lives inside one container, never breaks out. Safe ≠ good.

**House tokens (use these until the project derives its own)**

```css
:root {
  --bg:          #faf8f4;
  --bg-sunken:   #f1ede4;
  --surface:     #ffffff;
  --ink:         #23211c;
  --ink-soft:    #57534a;
  --ink-muted:   #8b857a;   /* use at ≥72% alpha on warm surfaces for AA */
  --accent:      #2f5d8a;
  --accent-ink:  #ffffff;
  --accent-soft: #eaf0f6;
  --line:        #e7e1d6;
  --line-strong: #d6cfc0;
  --good:  #3a7d52;  --warn: #b07d2e;  --bad: #b04a3a;
  --r-sm: 6px;  --r-md: 10px;  --r-pill: 999px;
  --ease: cubic-bezier(.16,1,.3,1);
  --shadow-sm: 0 1px 2px rgba(35,33,28,.04), 0 1px 3px rgba(35,33,28,.05);
  --shadow-md: 0 2px 4px rgba(35,33,28,.05), 0 6px 16px rgba(35,33,28,.08);
  --shadow-lg: 0 12px 32px rgba(35,33,28,.12);
}
```

Typography: `Fraunces` (display, editorial serif, −tracking) + `Hanken Grotesk` (body/UI). Never Inter, Roboto, Arial — those are the AI fingerprint. Type scale in `rem` only; borders/radii/shadows in `px`.

Dark-locked pals: paste the dark token block at `:root`. Depth comes from surface tone + `--line` borders, not shadows (drop resting card shadow; keep shadow only on modals/dropdowns).

```css
:root { /* dark-locked */
  --bg: #1c1a16;  --bg-sunken: #16140f;  --surface: #262320;
  --ink: #ece7dd;  --ink-soft: #b3ac9e;  --ink-muted: #847d70;
  --accent: #7ea6d6;  --accent-ink: #15140f;  --accent-soft: #2a3744;
  --line: #383229;  --line-strong: #4a4339;
  --good: #6bbd86;  --warn: #e0a653;  --bad: #e07a68;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.30);
  --shadow-md: 0 4px 14px rgba(0,0,0,.38);
  --shadow-lg: 0 12px 32px rgba(0,0,0,.45);
}
```

**Content economy (non-negotiable)**
- H1 ≤7 words. Credibility proof immediately after (stat, logo, one-line fact) — not buried.
- One job per section. Can't name its single job → it shouldn't exist as its own block.
- Label, don't narrate: `Revenue` not "Here is your total revenue."
- No helper text unless it changes a decision the user is making right now.
- Final pass: cut 30–50% of the words. If meaning survives, the cut was right.

**States (every data surface)**
Loading → skeletons mirroring the final layout shape, not a spinner over a blank page. Empty → one line + one action. Error → calm, `role="alert"`, no red wall.

---

## The human gate

The user's eye is the design gate. No algorithm replaces it.

1. Push and open the preview at every natural pause — after hero, after first content section, before final polish.
2. Every rejection is a new law, not a one-off fix. Write it into DESIGN-REFERENCES.md immediately with attribution and date.
3. Treat a second rejection of the same pattern as a process failure: the law wasn't recorded or wasn't read.
4. Read DESIGN-REFERENCES.md at the start of every session on a pal that has one. It is the accumulated taste of every past review. Don't make the user repeat themselves.

---

## Self-review pass (run before declaring done)

**Craft**
1. Every spacing value on the 4px scale (4/8/12/16/24/32/48/64/96)? No freehand pixels.
2. Text in `rem`, ≤4 sizes on screen, one heading level per region?
3. Tabular figures on every number? Numerics right-aligned in tables?
4. Exactly one primary (accent) action in view?
5. One saturated color? Shadows warm/low/layered (light) or borders+tone (dark)?
6. Does one thing clearly lead the screen — largest/first, secondary detail demoted?
7. Display tracking set (−0.01 to −0.022em)? `text-wrap: balance` on headings?
8. Contrast computed (not eyeballed) for every new color pairing, especially muted text on warm surfaces?

**Economy**
9. Any heading/label/sentence cuttable without losing meaning? Cut it.
10. Any helper text that doesn't change a decision? Remove it.
11. Empty states: one line + one action only?

**Composition**
12. Hero: is it the left-text/right-image template? If yes — stop, choose a different composition.
13. At least one rhythm break on the page (full-bleed band, impact statement, 2× padding section)?
14. Every section traces to a named reference (from DESIGN-REFERENCES.md)? If not, it's slop.
15. Slop test: could the hero appear unchanged on an unrelated product? If yes — rewrite.
16. DESIGN-REFERENCES.md exists and has steal-map, palette table, component inventory, craft tokens, contrast law, and vetoes recorded?

**Render**
17. Push and look at the actual pixels. The screen tells the truth; passing your own intent-review does not.
