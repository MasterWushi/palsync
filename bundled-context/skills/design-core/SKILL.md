---
name: palbuilder-design
description: "Makes PalBuilder (CloudPiston) front-end output look professionally designed instead of AI-generated. Use this skill ALONGSIDE palbuilder-frontend whenever building or styling any pal UI — pages, fragments, dashboards, tables, cards, modals, forms, list views — even when the user only gives a functional spec and says nothing about design. palbuilder-frontend governs valid markup; this skill governs what good looks like: the house visual system, spacing and type discipline, ruthless content economy, ready-made component recipes, and a self-review pass. Trigger it for any task that produces something a person will look at, and ESPECIALLY when a spec is light on design detail — that is exactly when the agent must supply the taste."
---

# PalBuilder Design Skill

This skill turns a functional spec into a UI that looks like it was designed by a person with taste. It pairs with `palbuilder-frontend` (which governs valid `c:` markup and XHTML rules). Read this skill **before** writing any UI; read `references/components.md` when building a specific component.

The substrate is permissive: inside `<style>`/`<script>` you write vanilla CSS/JS naively — no CDATA wrapping, no entity-escaping. Essentially all modern CSS works (custom properties, grid, container queries, `:has()`, nesting, `clamp()`, `color-mix()`). The only authoring rules: self-close void tags (`<img />`, `<input />`, `<br />`), keep `${...}` out of inline `<script>` blocks (put that JS in an external `.css`/`.js` file or use a `data-` attribute), and use the `<label>` + `role="alert"` pattern for ARIA on `c:field`. So the constraint here is taste, not capability.

---

## How this skill works: the cascade

Every design decision resolves through three layers, in priority order.

**1. Spec overrides (highest).** Before building, read the spec for design intent and map it onto the house token slots:
- *Explicit tokens* — "use #1a7f5a", "our font is Söhne", "tight/dense", "rounded" → overwrite that slot.
- *Soft signals* — mood words ("calm", "serious", "playful") or named references ("make it feel like Linear") → nudge the few levers that exist (accent, radius, type weight, motion, whitespace). These work *within* the house style; they don't swap it for a different aesthetic. See "Mood, honestly" under Overrides for exactly what they can move.
- The most common override is brand **color** and sometimes **font**. Everything else usually stays default.

**2. House defaults (fallback).** Every slot the spec did *not* fill gets the house system below. A spec that says nothing about design gets the full system, beautifully, with **zero clarifying questions** — that is the entire point. Do not ask the user about design unless they raised it.

**3. The craft floor (non-overridable).** Some things are not tokens and the user cannot turn them off, because they are what separates "designed" from "themed". Even a user who brings genuinely bad color taste still gets a *well-built* layout. If a spec demands something that breaks the craft floor (e.g. "cram everything on one screen, fill every gap"), keep the floor and get as close to the request as the floor allows. The floor is defined next.

---

## The craft floor (always holds)

These hold regardless of overrides. They are why the output reads as professional.

- **Spacing comes from the scale, never freehand.** 4px base: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96`. Every margin, padding, and gap is one of these. Uneven, hand-picked spacing is the #1 tell of AI UI.
- **Type hierarchy is restrained.** Max ~4 distinct sizes per screen. One clear heading level per region. Size and weight establish hierarchy — not color, not boxes.
- **Numbers are tabular and right-aligned in tables.** Every money/metric/count uses tabular figures (`font-variant-numeric: tabular-nums`). Money never renders in proportional figures.
- **Alignment is real.** Things line up to a grid and to each other. Optical alignment of numerals and labels.
- **Contrast meets AA.** Body text ≥ 4.5:1 on its background. Never rely on light-gray-on-cream for anything that must be read.
- **Depth is subtle and warm.** Cards rest on a low warm shadow (`--shadow-sm`), deepening slightly on hover (`--shadow-md`); modals/dropdowns use `--shadow-lg`. Shadows are *low, soft, and warm-tinted* — felt more than seen. Never a hard, dark, large, or colored "glow" — that's the slop you're replacing. Hierarchy still comes mostly from tone shifts and 1px borders; the shadow is a finishing touch, not the structure. **On dark (the default for dark-locked pals — see Dark), shadows fade: separation comes from borders and surface tone instead, and the resting card shadow is dropped.**
- **One primary action per view.** Exactly one filled/accent button. Everything else is secondary (tonal) or quiet (ghost). A screen with five loud buttons has none.
- **Components are correct.** Progress rings render as real arcs (not broken), charts are calm (thin strokes, single accent, dashed reference lines — never heavy gridlines or rainbow series), layouts are real layouts — not a stack of cards pretending to be one. Use `references/components.md` rather than improvising the fiddly ones.
- **Information has a hierarchy** (own section below) — one thing leads each screen; secondary detail is demoted or deferred, never laid out flat and equal-weight.
- **Every data surface has its states.** Anything that loads designs its loading, empty, and error states too — not just the happy path. A blank screen while data loads, or an untouched white void on failure, is unfinished work.
- **Content economy** (its own section below) — the floor includes saying less.

---

## Content economy — say less

> The single most common complaint about AI-generated UI: too many words, too many labels, too much on screen. Fix it here. Look at Mercury, Origin, Stoic, Acctual — confident interfaces say almost nothing. A screen earns each word.

Rules:

- **One job per region.** Each card/section/screen does one thing. If you can't name its single job, it shouldn't exist as its own block.
- **Label, don't narrate.** `Revenue` — not "Here is your total revenue for this month." A noun beats a sentence.
- **No helper text unless it changes a decision** the user is about to make right there. "This may take a moment" — cut. Field hint that prevents an error — keep.
- **Numbers and state over prose.** A big number with a small eyebrow label communicates faster than a paragraph. Status as one word/badge, not a sentence.
- **Kill redundant headings.** A card titled "Clients" inside a page titled "Clients" is noise. Remove the inner one.
- **Empty states are one line + one action.** Not a paragraph explaining the feature.
- **Final pass: cut 30–50% of the words.** After the UI works, delete words. If meaning survives, the cut was right. Then delete again.

**Example 1**
Before: `Welcome back! Here is a summary of all of your current active clients and their progress this month so far.`
After: `Clients · 4 active`

**Example 2**
Before: A card with heading "Monthly Progress Status", subheading "Tasks completed this month", body "You have completed 4 out of 5 tasks for this client this month.", then a bar.
After: Eyebrow `THIS MONTH`, then `4 of 5` in large tabular figures, then the bar. Three elements, no sentences.

**Example 3 (the dashboard in the screenshot)**
Before: each client card stacks name + huge wrapping title + url + multiple full-width status pills + "This month: 4 of 5 done" sentence.
After: client name (one line, not wrapping), domain in muted small text, one progress figure `4/5`, and status as **compact inline chips** — not stacked full-width bars. Half the words, half the boxes.

---

## Information hierarchy — rank, then reveal

Content economy cuts what doesn't belong; this ranks what's left. The defining trait of every admired 2026 product UI (Linear, Stripe, Vercel, Notion) is that they lead with the one thing that matters and let the rest reveal on demand — they earn trust through restraint, not by showing everything at once. AI UI fails the opposite way: it lays every element out flat and equal-weight, so nothing leads and the eye has nowhere to land.

Rules:

- **One thing leads each screen.** Identify the single most important number or object (the "north-star metric" — revenue, active count, the thing the user opened this screen to check) and give it the most visual weight: largest type, top-left or center, first in reading order. Everything else is visibly secondary.
- **Three weight tiers, no more.** Primary (the lead), secondary (supporting metrics/labels), tertiary (metadata, timestamps, IDs in `--ink-muted`). If everything is bold, nothing is.
- **Defer detail; don't delete it.** Secondary detail goes behind interaction — a row that expands, a "details" disclosure, a drill-in link, a tab — not crammed onto the first view. Default view = what the current task needs; depth is one click away. (Use `c:a ajax-target` to load detail fragments on demand rather than rendering it all upfront.)
- **Scanning beats reading.** A dashboard is scanned in seconds. Lead numbers left-aligned or large, labels small above them, supporting chips after. The user should find the one thing they came for without reading.
- **Don't equal-weight a list of cards.** If four cards are identical in weight, rank them (by status, recency, or value) or group them — a flat equal grid hides which one needs attention.

**Example.** A client dashboard: the lead is each client's *health* (the ring + a status), not its domain or onboarding date. So ring and name get weight; domain is muted tertiary; the full task breakdown lives behind a click into the client, not stacked on the card. The card answers "is this client OK?" at a glance; everything else is one interaction away.

---

## States — loading, empty, error

Every surface that fetches data has four states, and the happy "loaded" path is only one. AI UI almost always ships just that one; designing the other three is a clear quality signal. Recipes in `references/components.md` §13.

- **Loading → skeletons, not spinners.** Show placeholder shapes that *mirror the final layout* (same cards, same positions, pulsing gently) so the page doesn't jump when data arrives. Reserve a small inline spinner for in-place actions only — a button mid-save ("Saving…"), not a whole blank screen.
- **Empty → one line + one action.** (See Content economy and recipe §7.) State the situation, offer the resolving action, no explanatory paragraph.
- **Error → calm, never a red wall.** One short line saying what failed plus a retry or primary action. Use `--bad` only for a small icon or accent — never a full red background. Always mark it `role="alert"`.
- **Field errors → red border + a tied message.** A `--bad` border on the input and a small `role="alert"` message beneath it (the `c:field` ARIA pattern from `palbuilder-frontend`). Say what to fix, not just "invalid".

Match the loading state's shape to the real thing: a skeleton for a card grid looks like the card grid; a skeleton for a table looks like rows. A generic centered spinner over an empty page is the lazy default this skill replaces.

---

## The house style: "Editorial Warmth"

A calm, confident, light system. Paper, not plastic. Warm neutrals carry everything; one accent does the pointing. This is the look of the references the user chose — it suits professional SMB and SaaS product UI and it photographs well in a portfolio. Put these tokens in an external stylesheet (`<link href="../Styles/design-tokens.css" />`) or a `<style>` in `<head>`.

```css
:root {
  /* Canvas & surface — warm, never pure white, never dark */
  --bg:          #faf8f4;   /* page canvas, warm off-white */
  --bg-sunken:   #f1ede4;   /* subtle section lift / divider band */
  --surface:     #ffffff;   /* cards, tables, modals */

  /* Ink — warm near-black, not #000 */
  --ink:         #23211c;   /* primary text */
  --ink-soft:    #57534a;   /* secondary text, labels */
  --ink-muted:   #8b857a;   /* tertiary, placeholders, eyebrows */

  /* Accent — the ONLY saturated color. Most common spec override. */
  --accent:      #2f5d8a;   /* considered slate-blue: trustworthy, not trendy */
  --accent-ink:  #ffffff;   /* text on accent */
  --accent-soft: #eaf0f6;   /* accent-tinted fill for quiet emphasis */

  /* Lines — hairline borders do the structural work */
  --line:        #e7e1d6;
  --line-strong: #d6cfc0;

  /* Semantic — muted, never neon. Used sparingly, for status only. */
  --good:        #3a7d52;
  --warn:        #b07d2e;
  --bad:         #b04a3a;

  /* Radius & motion */
  --r-sm: 6px;  --r-md: 10px;  --r-pill: 999px;
  --ease: cubic-bezier(0.2, 0, 0, 1);

  /* Elevation — warm, low, layered. Depth you sense, not a glow. */
  --shadow-sm: 0 1px 2px rgba(35,33,28,0.04), 0 1px 3px rgba(35,33,28,0.05);
  --shadow-md: 0 2px 4px rgba(35,33,28,0.05), 0 6px 16px rgba(35,33,28,0.08);
  --shadow-lg: 0 12px 32px rgba(35,33,28,0.12);   /* modals, dropdowns */
}
```

**Typography.** Display/headings: `Fraunces` (editorial serif, weight 400–500, slight negative tracking). Body/UI: `Hanken Grotesk` (clean grotesk, 400/500/600), fallback `system-ui`. Mono (IDs, code): `IBM Plex Mono`. Load via Google Fonts `<link>` in `<head>`. **Never** Inter, Roboto, Arial, or Space Grotesk — those are the AI-default fingerprint.

Use the serif for display moments — page titles, hero numbers, overview headings, empty states. On **dense operational screens** (long tables, settings, multi-row Console views) lead headings with the grotesk instead; an all-serif treatment over 200 rows of data reads mismatched. Serif = editorial weight; grotesk = working surfaces.

**Type scale uses `rem`** (base `16px` = `1rem`) so it scales with the user's browser font setting — never hard-code text in `px`. Scale: `0.8125 / 0.875 / 1 / 1.125 / 1.375 / 1.75 / 2.5 / 3.5` rem (≈ 13 / 14 / 16 / 18 / 22 / 28 / 40 / 56 px). Borders, radii, shadows, and spacing stay in `px`; only **text** is `rem`. Eyebrows: `0.8125rem`, `--ink-muted`, uppercase, letter-spacing 0.06em.

**Color discipline.** `--accent` is the only saturated hue on the page; warm grays do all hierarchy. Never introduce a second saturated accent for "alerts" — use the muted semantic tokens, small. Status chips use a tinted background + darker text from the same hue, never a loud fill.

**The look in one line.** Warm cream canvas · warm-gray ink · single accent · hairline borders + low warm shadows · tabular numerals on every number · generous whitespace · editorial type · one primary action · interactions that feel clickable.

**Reject (the slop this replaces):** dark dashboards with a glowing accent · pure-white SaaS canvas · multiple saturated colors · hard/large/colored drop shadows or neon glow · gradient/glassmorphism · rainbow status badges · proportional figures on money · cramped layouts that box every group · walls of helper text · static buttons with no hover/press feedback.

### Overrides — what the spec can and can't move

| Spec says | Maps to |
|---|---|
| A brand color (hex) | `--accent` — then derive the companions (below) and re-check contrast |
| A brand font | display and/or body family — keep the *scale*, swap only the family |
| "Dense" / "tight" | drop one step on section spacing (32→24); keep the 4px scale |
| "Rounded" / "sharp" | `--r-sm` / `--r-md` only; pills stay pills |
| "Dark" | switch to the dark token block below |
| A mood word | nudge the available levers — see "Mood, honestly" |
| A named reference ("like Linear") | informs color/type/density choices *within* this house — it does not swap houses |

The spec **cannot** override the craft floor (spacing, type discipline, hierarchy, tabular numerals, contrast, content economy, component correctness, one-primary-action). A user who wants total control simply doesn't use the skill.

**Deriving accent companions.** When `--accent` is overridden, derive the rest so contrast still holds — don't eyeball it:
```css
--accent-soft: color-mix(in srgb, var(--accent) 12%, var(--surface));
--accent-ink:  #ffffff;   /* if the brand color is light, use --ink instead */
```
Then verify the primary button hits AA (text vs. accent ≥ 4.5:1). A pale brand color needs dark ink, not white — check, don't assume.

**Mood, honestly.** v1 is one house style, so a mood word moves only the levers that exist: accent choice, radius, heading weight, motion intensity, whitespace step. "Playful" → rounder radius, brighter/warmer accent, a touch more motion. "Serious" → tighter radius, denser spacing, restrained motion. A mood word does **not** produce a different aesthetic (e.g. techno-futurist dark-neon) — that's a separate house this skill doesn't ship yet. If a spec clearly wants the other pole, say so plainly rather than half-delivering it.

### Dark — first-class, and the default for dark-locked pals

Light is the documented house, but **dark is not an afterthought.** Many Console pals are dark-locked, and for those **dark *is* the house style**: paste these tokens at `:root` (not behind a `data-theme` toggle) and treat dark as primary. It stays *warm* dark (not blue-black), keeps the single accent, and obeys **every craft-floor rule unchanged but one: depth comes from borders and tone, not shadows.** Shadows nearly vanish on dark, so separation and elevation are carried by `--line` / `--line-strong` and the surface tone steps (`--bg` → `--surface`); the shadow tokens remain only for true overlays (modals, dropdowns). Full token parity with light, semantics included:

```css
/* Dark-locked pal: paste at :root. For a toggled theme instead, scope under [data-theme="dark"]. */
:root {
  --bg:          #1c1a16;   /* warm near-black canvas */
  --bg-sunken:   #16140f;   /* recedes below canvas (e.g. table header band) */
  --surface:     #262320;   /* cards/tables — lift above canvas by tone, not shadow */
  --ink:         #ece7dd;
  --ink-soft:    #b3ac9e;
  --ink-muted:   #847d70;
  --accent:      #7ea6d6;   /* lightened to read on dark and hit AA */
  --accent-ink:  #15140f;
  --accent-soft: #2a3744;   /* tinted fill for quiet emphasis */
  --line:        #383229;   /* primary structure on dark */
  --line-strong: #4a4339;
  --good:        #6bbd86;   /* semantics lightened for dark legibility */
  --warn:        #e0a653;
  --bad:         #e07a68;
  --r-sm: 6px;  --r-md: 10px;  --r-pill: 999px;
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.30);   /* overlays only — cards use borders */
  --shadow-md: 0 4px 14px rgba(0,0,0,0.38);
  --shadow-lg: 0 12px 32px rgba(0,0,0,0.45);
}
```

On dark, a card separates from the canvas by **tone** (`--surface` is lighter than `--bg`) plus a 1px `--line` border — drop the resting card shadow; keep shadow only on modals/dropdowns. Status-chip tints (`color-mix` with `--good/--warn/--bad`) read fine; bump the mix to ~18% if a chip looks faint on dark. Everything else — spacing scale, type, tabular numerals, hierarchy, content economy, one primary action, states — is identical to light. Same components, same scale; only the tokens and the depth mechanism change.

---

## Icons

Use **Lucide** (lucide.dev) — the modern, lightweight, MIT-licensed icon set, ~1,600 thin stroke-based icons that match this hairline aesthetic. Inline the raw SVG; do **not** use the Lucide JS auto-replacer or an icon font. Inlined SVG inherits color via `currentColor`, survives AJAX fragment loads (no `DOMContentLoaded` needed), and self-closes for XHTML.

```css
.icon { width: 16px; height: 16px; flex-shrink: 0; stroke: currentColor; fill: none;
        stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.icon-sm { width: 14px; height: 14px; stroke-width: 1.6; }
```

```html
<!-- Grab the icon from lucide.dev, paste its inner SVG, self-close every path -->
<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
```

One `.icon` class colors and sizes every icon. **Use icons sparingly** — content economy applies to icons too. An icon earns its place when it speeds recognition (an action button, a domain link, a nav item); decorative icons on every label are slop. Match stroke weight to the type; never mix two icon families.

## Motion

Interactions must feel clickable. Buttons lift 1px on hover with a slightly stronger shadow and press down on `:active`; cards lift 2px on hover with a deeper shadow. Keep it fast (120–180ms) on `--ease`. Animate `transform`, `box-shadow`, `background`, `border-color` — never layout properties. Respect `@media (prefers-reduced-motion: reduce)` by dropping transforms. See the button recipe in `references/components.md` for the exact hover/active/focus states.

## Responsive

Mobile and desktop are **parallel primary tracks**, not a desktop layout that reflows as an afterthought — the 2026 baseline treats feature parity as expected, and senior users read a desktop-only tool as weak product investment. Design the small screen deliberately.

- **Breakpoints:** sidebar → icon rail at ~1024px, rail → hamburger at ~768px, multi-column → single column at ~640px.
- **Touch targets ≥ 44px.** On touch (`@media (pointer: coarse)`), every tappable control — buttons, icon buttons, link rows, acting chips — is at least 44px tall. Don't ship 28px tap targets to phones.
- **Tables collapse to cards.** Below ~640px a data table becomes stacked key-value cards (label + value per row); horizontal scroll on a table is a last resort, not the plan. Recipe in `references/components.md` §12.
- **Display type scales fluidly.** Use `clamp()` so headings shrink gracefully — e.g. page title `font-size: clamp(1.75rem, 5vw, 2.5rem)`. Body stays at base.
- **Never hide the primary action on mobile.** Secondary/tertiary controls can fold into a menu; the one primary action stays visible.
- **One column, full rhythm.** Keep the spacing scale on mobile — scrolling is fine, cramming is not.

## Component recipes

For anything beyond trivial markup — and **always** for the fiddly ones (progress rings, calm charts, stat cards, data tables, status chips, modals, empty states, loading skeletons, error states, page headers, buttons) — read `references/components.md` and adapt the recipe. These are pre-solved in PalBuilder-valid form (self-closed voids, no inline-`<script>` `${}`, the `label`+`role="alert"` ARIA pattern). Don't reinvent the progress-ring math or improvise a chart library; both are the exact things that render broken or sloppy when winged.

---

## Self-review pass (run before declaring done)

After building, before saying it's finished, run this checklist out loud and fix any "no". This catches both slop and verbosity — it is not optional.

**Craft**
1. Is every spacing value on the 4px scale? (No freehand pixels.)
2. Text sized in `rem`, ≤4 sizes on screen, one heading level per region?
3. Tabular figures on every number? Numerics right-aligned in tables?
4. Exactly one primary (accent) action in view?
5. Only one saturated color? On light, shadows subtle and warm (not hard, colored, or glowing); on dark, separation via borders + surface tone with no resting card shadow?
6. Components render correctly? (Rings are arcs; charts calm — thin strokes, single accent; nothing overflows; real layout, not stacked cards.)
7. Does one thing clearly lead the screen — largest/first, with secondary detail demoted or deferred — not a flat equal-weight grid?

**Economy**
8. Can any heading, label, or sentence be cut without losing meaning? (If yes, cut it.)
9. Any helper text that doesn't change a decision? (Remove it.)
10. Any redundant heading (card title repeating page title)? (Remove it.)
11. Empty states one line + one action?

**The eyeball test**
12. Would this look at home next to Mercury / Origin / Stoic / Acctual? If it has more words, more boxes, or more colors than they do — cut until it does.

**Responsive & render**
13. Does it hold at 640px — table collapses to cards, touch targets ≥44px, primary action still visible, nothing overflowing horizontally?
14. Review the *render*, not your intentions. Where the environment allows, push the fragment and load the actual page — look at the pixels. An agent passes its own code review too easily on intent alone; the screen tells the truth.

**States**
15. For anything that loads data: are the loading (skeleton), empty, and error states designed — not just the happy path? Is the error state calm (no red wall) with a retry, and `role="alert"` set?

---

## Reference anchors

When unsure, triangulate against the references the user chose: **Mercury** (editorial restraint, tabular money, single accent), **Origin** (whitespace, calm data-viz), **Stoic** (radical content economy, confident type), **Acctual** ("stunning, minimalist" as a stated value). "Steal like an artist": name a remix of two — e.g. *Mercury's type discipline + Origin's whitespace* — and build toward that, not toward a generic dashboard.
