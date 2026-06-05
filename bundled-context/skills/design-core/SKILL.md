---
name: design-core
description: "The shared Nimblewire design system for Palbuilder (CloudPiston) pals — the foundation every UI inherits. Use whenever designing or building any user-facing interface: pages, fragments, modals, forms, buttons, cards, tables, navigation, or any visual component. Defines the design philosophy, the token architecture (color/type/space/radius/motion), the hard token-only rule, mechanical constraints, the forbidden anti-slop list, a self-audit checklist, the WCAG 2.2 accessibility baseline, PalBuilder-native stack rules, and a library of component recipes. Per-pal identity (fonts, colors, light/dark) lives in that pal's theme.css; this skill references token NAMES only, never raw values. Trigger on any styling, layout, theming, or component-building task."
---

# Nimblewire Design Core

The shared foundation for every Nimblewire pal. One system of rules, tokens, and
component recipes; each pal sets its **own** fonts, colors, and light/dark in its own
`theme.css`. This skill references token **names** only — never raw values.

> **How the pieces fit.** `theme.css` (per pal) holds the *values*. This skill holds the
> *rules + recipes* that reference token *names*. The three application skills
> (`design-marketing`, `design-app`, `design-enterprise`) layer context-specific guidance
> on top of this core. Read this first; it governs all of them.

**Setup for a new pal:** copy `reference-theme.css` → the pal's `Styles/theme.css`, edit the
IDENTITY section, then assemble UI from the recipes below. Load `theme.css` before any
component CSS in the page `<head>`.

---

## 1. Philosophy — the point of view to reason FROM

Rules can't cover every case. When they don't, reason from these. *(Technique B3: a
philosophy beats a checklist for judgment calls.)*

**Calm, considered, craft over decoration. Designed, not defaulted.**

1. **Calm over theatrical.** The interface recedes; content leads. No effect without a job.
   The era of bounce, parallax, and glow is over — clarity wins.
2. **Monochrome + one accent.** Neutrals carry ~90% of the UI. The single accent means
   "act here" — it is *information*, not decoration. One color used sparingly hits harder
   than five used everywhere.
3. **Aggressive contrast, real whitespace.** Nothing muddy in between. Give elements more
   air than feels necessary. (Dense enterprise data is the one place this inverts — see
   `design-enterprise`.)
4. **One disciplined typeface, systemic scale.** Type is the brand anchor. No decorative
   fonts, no mixing display families.
5. **Motion communicates state.** Loading, transition, success, focus — motion *guides*,
   never flashes.
6. **Every element is decided.** Focus rings, empty states, disabled states, hairlines,
   loading states are *designed*, not left at the browser default. If you'd ship a bare
   default, you are not done.
7. **Honest and accessible.** Semantic HTML, keyboard-first, reduced-motion respected.
   Accessibility is infrastructure, not a feature.
8. **The token system is the law.** Reason *within* it. If you reach for a raw value, the
   system is missing a token — raise it, don't hardcode.

> When in doubt: prefer less, prefer calm, prefer the system.

---

## 2. Token Architecture — the variable contract

Pure CSS custom properties (Open Props approach). `theme.css` fills these **names** with
values; everything else uses `var(--name)`. This is the complete contract — the full,
authoritative list is in `reference-theme.css`. Summary:

| Group | Tokens |
|---|---|
| **Accent** (the one color) | `--color-accent` · `--color-accent-hover` · `--color-accent-contrast` |
| **Neutrals** | `--color-bg` · `--color-surface` · `--color-surface-2` · `--color-border` · `--color-border-strong` · `--color-text` · `--color-text-muted` · `--color-text-subtle` |
| **Status** (for meaning) | `--color-success`/`-bg` · `--color-warning`/`-bg` · `--color-danger`/`-bg`/`-hover` · `--color-info`/`-bg` |
| **Focus** | `--color-focus` |
| **Fonts** | `--font-body` · `--font-display` · `--font-mono` |
| **Type scale** | `--text-xs … --text-3xl` · `--leading-tight/normal/relaxed` · `--weight-normal/medium/semibold/bold` · `--tracking-tight/normal` · `--measure` |
| **Spacing** | `--space-1 … --space-9` (4px base; `--space-5` = 24px default rhythm) |
| **Radius** | `--radius-sm/md/lg/pill` |
| **Borders** | `--border-thin` · `--border-thick` |
| **Elevation** | `--shadow-sm` · `--shadow-md` |
| **Motion** | `--motion-fast/base/slow` · `--ease-standard` · `--ease-emphasis` |
| **Controls** | `--control-height-sm/md/lg` |
| **Inline-size scale** | `--size-xs/sm/md/lg` (width caps: menus, toasts, forms, empty states) |
| **State / layering** | `--opacity-disabled` · `--layer-dropdown/modal/toast` |

Light/dark is automatic: the recipes reference these names, and `theme.css` swaps the
neutral + accent values under `@media (prefers-color-scheme: dark)`. **Never** write a
dark-mode override in component CSS — change the token in `theme.css`.

---

## 3. The Hard Rule — token-only, no raw values

**This is the single most important rule in the system. It eliminates ~80% of generic
output on its own.** *(Technique B1.)*

> **Outside `theme.css`, you may NOT write a raw design value.** No hex, no `rgb()`/`hsl()`,
> no named colors (`white`, `gray`), no raw `px`/`rem`/`em` for spacing, type, radius,
> borders, or shadows. **Every** such value is `var(--token)`. If the token you need
> doesn't exist, the system is incomplete — add it to `theme.css` and use the name. You
> reference the system or you use nothing. There are no color choices to make.

**What this rule does NOT ban** (these are structure, not design values, and are fine):
layout primitives — `0`, `100%`, `1fr`, `auto`, `50%`, unitless `line-height` multipliers,
`flex`/`grid` track values, scalar multipliers inside `calc()` (`calc(-1 * var(--border-thin))`),
and SVG icon geometry (an icon's internal `viewBox`/coords). **Media/container-query
breakpoints** are also exempt — CSS forbids `var()` inside `@media`/`@container` conditions, so
the breakpoint literals are unavoidable; use only the documented set in `theme.css`
(`sm: 40rem`, `md: 64rem`, `lg: 80rem`).

**Inline `style=` in markup** is only for *wiring* tokens, never for raw values:

```html
<!-- OK: wiring a token -->
<div class="stack" style="--gap: var(--space-5);">…</div>
<!-- FORBIDDEN: a raw value in markup -->
<div style="margin: 24px; color: #333;">…</div>
```

---

## 4. Mechanical constraints — numbers and tokens, not adjectives

*(Technique B2: "AI can't follow rules that aren't explicit." Every constraint is a number
or a token.)*

- **Spacing.** Use the `--space-*` scale exclusively. Default vertical rhythm between
  content blocks is `--space-5` (24px). Component inner padding: `--space-4`/`--space-5`.
  Tight groupings: `--space-2`/`--space-3`. Never a raw margin/padding.
- **Type.** Max **3 sizes per view**. Body = `--text-base`; secondary = `--text-sm`; at
  most one display size above. Headings use `--leading-tight`; body uses `--leading-normal`.
  Weights only from the 4-step set. `--tracking-tight` on large display type only. Body
  measure capped at `--measure`.
- **Color.** ≤ **1 accent**. Neutrals do the rest. Exactly **one** primary CTA per view/
  section — never two competing accent buttons. Status colors appear only on status.
- **Radius.** Consistent per surface: controls `--radius-md`, cards/modals `--radius-lg`,
  pills `--radius-pill`. Don't mix arbitrarily.
- **Borders.** Hairlines = `--border-thin` + `--color-border`. Emphasis =
  `--color-border-strong`. Focus = `--border-thick` + `--color-focus`.
- **Motion.** Durations from `--motion-*` (≤ 320ms), easing from the `--ease-*` tokens.
  Transition only **state-bearing** properties (`background-color`, `border-color`,
  `color`, `opacity`, `box-shadow`, and `transform` used for position). **Never
  `transition: all`.** Never animate for decoration.
- **Elevation.** Hairline-first. `--shadow-sm`/`--shadow-md` only for genuine layering
  (menus, modals, toasts). No shadow as ornament.
- **Targets.** Interactive controls ≥ `--control-height-sm` (32px); never below 24px
  (WCAG 2.2 target size).

---

## 5. Forbidden list — the anti-slop patterns

*(Technique B4: state what's banned up front.)* **Do not:**

- ✗ Write any **raw design value** outside `theme.css` (see §3). *The big one.*
- ✗ Use **decorative gradients.** Gradients only when functionally required (e.g. a scrim
  for text legibility over an image) — never as ornament or button fills.
- ✗ Add **decorative motion** — bounce, parallax, attention loops, hover-grow/scale,
  auto-playing effects. Motion communicates state only.
- ✗ Introduce a **second accent** or **two competing primary CTAs** in one view.
- ✗ Apply **harsh/heavy shadows**, glows, or neon. Elevation is restrained.
- ✗ Ship **icon-only controls without an `aria-label`.**
- ✗ **Remove a focus outline** without providing an equally visible `:focus-visible` style.
- ✗ Mix **multiple display typefaces** or use decorative fonts.
- ✗ Signal status with **color alone** — always pair with text and/or an icon (colorblind
  safety).
- ✗ Use **muddy low-contrast grays** for text where a contrast token exists.
- ✗ Use **`<div>`/`<span>` as buttons or links.** Use real `<button>`, `<a>`, or `c:a`.
- ✗ Put raw values in **inline `style=`** (see §3).
- ✗ Use **`${…}` template literals in inline `<script>`** — they collide with server EL at
  render time. Use an external `.js` file or string concatenation (see §8).

---

## 6. Self-audit — run this after generating any UI

*(Technique B6: agents catch most of their own violations when asked to list them.)*

**This is mandatory and explicit. After producing any markup/CSS, write out your answer to
all 10 items below, numbered, item by item — actually print each item with its finding.** Do
**not** summarize ("audit passed"), do **not** merely cite the section, and do **not** skip
items you assume are fine. Quote the offending line for any non-empty finding. If any item
is non-empty, fix it, then re-run the audit. Only finish when every item is clean.

1. **Raw colors:** list every hex / `rgb` / `hsl` / named color you emitted outside
   `theme.css`. → must be **empty**.
2. **Raw dimensions:** list every raw `px`/`rem`/`em` used for spacing, type, radius,
   border, or shadow. → replace each with a token.
3. **Gradients:** list any gradient. → remove unless functionally required.
4. **Motion:** list each `transition`/`animation`. → confirm each communicates state, uses
   `--motion-*`/`--ease-*`, and none is `transition: all` or decorative.
5. **Accent discipline:** more than one accent color, or two primary CTAs in a view? → fix.
6. **Focus & keyboard:** every interactive element has a visible `:focus-visible` ring and
   is keyboard-operable? Icon-only controls have `aria-label`?
7. **Contrast:** text pairings ≥ 4.5:1; large text / UI / focus ≥ 3:1 against their
   background tokens?
8. **Reduced motion:** is `prefers-reduced-motion` handled (global reset present)?
9. **Semantics:** real `button`/`a`/`nav`/`main`/headings; one `H1`; logical order?
10. **Stack:** void tags self-closed (`<c:field … />`, `<input />`, `<br />`)? No `${}` in
    inline `<script>`? No CDATA / entity-escaping inside `<style>`/`<script>`?

---

## 7. Accessibility baseline — WCAG 2.2 AA, non-negotiable

Accessibility is infrastructure. Build it in from the start.

- **Contrast.** Text ≥ **4.5:1**; large text (≥ 24px, or ≥ 18.66px bold), UI component
  boundaries, and focus indicators ≥ **3:1**. The token pairs in `reference-theme.css` are
  pre-tuned; verify any *new* foreground/background pairing you invent.
- **Semantic HTML.** Real `<button>`, `<a>`/`c:a`, `<nav>`, `<main>`, `<header>`,
  `<footer>`, `<table>`. One `<h1>`; logical heading order (don't skip levels for size —
  use a type token).
- **Keyboard.** Everything operable without a mouse. Visible `:focus-visible` on every
  interactive element. Logical tab order. `Esc` closes overlays. No keyboard traps (except
  an intentional modal focus trap that **releases on close**).
- **Reduced motion.** Include this global reset once (in `components.css`):

```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 1ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 1ms !important;
        scroll-behavior: auto !important;
    }
}
```

- **Targets.** ≥ 24px (WCAG 2.2 AA); our controls are ≥ 32px.
- **Don't rely on color alone.** Pair status with text/icon.
- **ARIA responsibly.** Prefer native semantics. `aria-label` for icon-only controls.
  `role="alert"` / `aria-live` on async feedback regions (e.g. a modal's `#feedback` span).

---

## 8. Stack rules — PalBuilder-native, vanilla, no build

Grounded in the live capability test (see `palbuilder-frontend`). The stack is **vanilla
CSS + light vanilla JS — no framework, no build step, no Bootstrap.**

- **Tokens are pure CSS custom properties** (Open Props approach). Values live in
  `theme.css`; everything else references names.
- **Loading.** `theme.css` then `components.css` via
  `<link rel="STYLESHEET" type="text/css" href="../Styles/…">` in the page `<head>`. Fonts
  via `@import` (first rule in `theme.css`) or a `<link>`. Platform libs via `c:resource`.
- **Form inputs use `c:field`** (`type="text"/"email"/"checkbox"/"option"…`), not bare
  `<input>`, when the value is server-bound. Self-close every void tag:
  `<c:field … />`, `<input … />`, `<br />`, `<hr />`, `<col />`, `<img … />`.
- **Modals use the real shell.** The page includes
  `<c:fragment name="cloudpiston/ui/modalShell" />` once; modal *fragments* are
  `c:ignore`-wrapped inner content; trigger via `c:a … ajax-target="modalContent"`;
  `showModal()` / `hideModal()` come from `cloudpiston/ui/v5/lib-ui`.
- **Write CSS and JS naively.** Raw `<`, `>`, `&` are fine inside `<style>`/`<script>`
  (verified byte-for-byte). **Never CDATA-wrap** and **never entity-escape** inside
  `<style>`/`<script>` — both corrupt the content.
- **Avoid `${…}` in inline `<script>`** — it collides with server EL at render time. Use an
  **external `.js`** file (bypasses EL) or string concatenation.
- **Native CSS nesting** (the `&` you'll see throughout these recipes) and JS `&&` save
  fine but emit **cosmetic, non-fatal** CSS-linter notes — expected; the save still
  succeeds and the content is unaltered.
- **AJAX-loaded fragments don't fire `DOMContentLoaded`.** Run init JS directly (module
  pattern), never in a `DOMContentLoaded` wrapper.

---

## 9. Component recipes

A finite library of known-good pieces. *(Technique B5: assemble from these, don't
improvise. Technique B7: rules + real examples.)* Every recipe is token-only, themes
light/dark automatically, and ships its focus/keyboard/ARIA story.

All twelve recipes below are complete and built to the same standard: PalBuilder-native HTML
+ token-only CSS + automatic light/dark + a focus/keyboard/ARIA story + a correct example.
9.1–9.4 (button, field, card, modal) are the canonical pattern; 9.5–9.12 (table, nav, badge,
form layout, select, tabs, toast/alert, empty state) follow it.

---

### 9.1 Button

Real `<button>` (or `c:a` for a server action). Variants: `--primary` (the one CTA),
`--secondary`, `--ghost`, `--danger`. Sizes: `--sm`/`--lg`. Icon-only: `--icon` +
`aria-label`.

**CSS** (`components.css`):

```css
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-block-size: var(--control-height-md);
    padding-inline: var(--space-4);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    line-height: var(--leading-tight);
    border: var(--border-thin) solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    user-select: none;
    text-decoration: none;
    transition: background-color var(--motion-fast) var(--ease-standard),
                border-color var(--motion-fast) var(--ease-standard),
                color var(--motion-fast) var(--ease-standard);

    &:focus-visible {
        outline: var(--border-thick) solid var(--color-focus);
        outline-offset: var(--border-thick);
    }
    &:disabled,
    &[aria-disabled="true"] {
        opacity: var(--opacity-disabled);
        cursor: not-allowed;
    }
}

.btn--primary {
    background: var(--color-accent);
    color: var(--color-accent-contrast);
    &:hover { background: var(--color-accent-hover); }
}
.btn--secondary {
    background: var(--color-surface);
    color: var(--color-text);
    border-color: var(--color-border-strong);
    &:hover { background: var(--color-surface-2); }
}
.btn--ghost {
    background: transparent;
    color: var(--color-text);
    &:hover { background: var(--color-surface-2); }
}
.btn--danger {
    background: var(--color-danger);
    color: var(--color-accent-contrast);
    &:hover { background: var(--color-danger-hover); }
}

.btn--sm { min-block-size: var(--control-height-sm); padding-inline: var(--space-3); font-size: var(--text-xs); }
.btn--lg { min-block-size: var(--control-height-lg); padding-inline: var(--space-5); font-size: var(--text-base); }

/* icon-only: square, REQUIRES aria-label on the element */
.btn--icon { padding-inline: 0; inline-size: var(--control-height-md); }
```

**Examples:**

```html
<!-- the one primary CTA -->
<button type="button" class="btn btn--primary">Save changes</button>

<!-- a server action as a button -->
<c:a action="publishReport" class="btn btn--primary">Publish</c:a>

<!-- secondary + danger pair -->
<button type="button" class="btn btn--secondary">Cancel</button>
<button type="button" class="btn btn--danger">Delete</button>

<!-- icon-only MUST have aria-label; icon uses currentColor -->
<button type="button" class="btn btn--ghost btn--icon" aria-label="Edit">
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M4 13l8-8 3 3-8 8H4v-3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
    </svg>
</button>
```

**A11y:** native `<button>` is keyboard-operable (Enter/Space) for free; `:focus-visible`
ring ≥ 3:1; disabled conveyed by state + reduced opacity; icon-only requires `aria-label`;
min target 40px (≥ WCAG 2.2).

---

### 9.2 Input / Field (`c:field`)

Server-bound inputs use `c:field`. The wrapping `<label>` associates the label with no
`for`/`id` needed. Hint and error sit below; the error uses `role="alert"` so it is
announced when it appears.

**CSS:**

```css
.field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}
.field__label {
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--color-text);
}
.field__input {
    inline-size: 100%;
    min-block-size: var(--control-height-md);
    padding-inline: var(--space-3);
    padding-block: var(--space-2);
    font-family: var(--font-body);
    font-size: var(--text-base);
    color: var(--color-text);
    background: var(--color-surface);
    border: var(--border-thin) solid var(--color-border-strong);
    border-radius: var(--radius-md);
    transition: border-color var(--motion-fast) var(--ease-standard),
                box-shadow var(--motion-fast) var(--ease-standard);

    &::placeholder { color: var(--color-text-subtle); }
    &:focus-visible {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: 0 0 0 var(--border-thick) var(--color-focus);
    }
    &:disabled {
        background: var(--color-surface-2);
        color: var(--color-text-muted);
        cursor: not-allowed;
    }
}
.field__hint  { font-size: var(--text-xs); color: var(--color-text-muted); }
.field__error { font-size: var(--text-xs); color: var(--color-danger); }

.field--invalid .field__input {
    border-color: var(--color-danger);
    &:focus-visible { box-shadow: 0 0 0 var(--border-thick) var(--color-danger); }
}
```

**Examples:**

```html
<!-- text field with hint -->
<label class="field">
    <span class="field__label">Email address</span>
    <c:field type="email" name="email" class="field__input"
             value="${email}" placeholder="you@company.com"
             autocomplete="email" required="true" />
    <span class="field__hint">We'll only use this for report delivery.</span>
</label>

<!-- invalid state: visual via class, announced via role="alert" -->
<label class="field field--invalid">
    <span class="field__label">Email address</span>
    <c:field type="email" name="email" class="field__input" value="${email}" />
    <span class="field__error" role="alert">Enter a valid email address.</span>
</label>

<!-- select: c:field type="option" inside a styled <select> -->
<label class="field">
    <span class="field__label">Status</span>
    <select name="status" class="field__input">
        <c:field type="option" value="active"   name="Active"   selected="${status eq 'active'}"></c:field>
        <c:field type="option" value="paused"   name="Paused"   selected="${status eq 'paused'}"></c:field>
    </select>
</label>
```

**A11y:** label associated by wrapping; focus ring on the control; invalid state shown
*and* announced (`role="alert"`); placeholder is not a label.

**PalBuilder rule — ARIA-on-control and `c:field` binding are mutually exclusive.**
Capability-tested live: `aria-invalid` / `aria-describedby` on `c:field` are **not**
hard-errors — the page saves — but they are **unsupported passthrough**. PalBuilder's
validator rejects them as *"c:field tag attribute [aria-invalid] … not allowed in this
context"*, so they emit a validation note on **every** save and **cannot be relied on to
reach the rendered `<input>`**. A plain `<input … aria-* />` was tested and saved with
**zero** notes — plain HTML inputs accept `aria-*` cleanly.

So, on one element you get *either* `c:field` server-binding *or* ARIA on the control — not
both:
- **Default for server-bound fields:** `c:field` + wrapping `<label>` + `role="alert"` on the
  error (the recipe above). This announces errors via a live region **without** putting
  `aria-*` on the input — no validation noise, full binding.
- **Only when `aria-*` on the control is genuinely required:** use a plain self-closed
  `<input … aria-invalid="true" aria-describedby="…" />` and accept the loss of `c:field`
  binding (wire the value/submission yourself).

---

### 9.3 Card

A surface that groups related content. Hairline border, generous padding, large radius.
Add `--link` only when the *whole* card is one action (hover then communicates affordance).

**CSS:**

```css
.card {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-5);
    background: var(--color-surface);
    border: var(--border-thin) solid var(--color-border);
    border-radius: var(--radius-lg);
}
.card__header { display: flex; flex-direction: column; gap: var(--space-1); }
.card__title {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-tight);
    color: var(--color-text);
}
.card__subtitle { margin: 0; font-size: var(--text-sm); color: var(--color-text-muted); }
.card__body {
    font-size: var(--text-base);
    line-height: var(--leading-normal);
    color: var(--color-text);
}
.card__footer { display: flex; align-items: center; gap: var(--space-2); }

/* whole-card-is-a-link: hover/focus communicates the affordance, not decoration */
.card--link {
    cursor: pointer;
    transition: border-color var(--motion-base) var(--ease-standard),
                box-shadow var(--motion-base) var(--ease-standard);
    &:hover { border-color: var(--color-border-strong); box-shadow: var(--shadow-sm); }
    &:focus-within {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 var(--border-thick) var(--color-focus);
    }
}
```

**Example:**

```html
<article class="card">
    <header class="card__header">
        <h3 class="card__title">Neighborly Bin Cleaners</h3>
        <p class="card__subtitle">April 2026 · SEO report</p>
    </header>
    <div class="card__body">
        <p>14 of 18 checklist items complete. Organic clicks up 22% MoM.</p>
    </div>
    <footer class="card__footer">
        <c:a action="getReport?id=${report.id}" class="btn btn--secondary btn--sm">View report</c:a>
    </footer>
</article>
```

**A11y:** semantic `<article>` + a real heading that fits the page outline; an interactive
card wraps a real link/`c:a` and shows a `:focus-within` ring; never nest competing
interactive controls inside a link card.

---

### 9.4 Modal (real PalBuilder shell)

The platform **owns the dialog** (overlay, `role="dialog"`, focus trap, `Esc`, focus
return) via `cloudpiston/ui/modalShell` + `lib-ui`. Our recipe themes the inner content
(`modal-header` / `modal-body` / `modal-footer` — the shell's structural hooks) and wires
the title for `aria-labelledby`.

**Page shell** includes the modal shell once and a target div (see `palbuilder-frontend`
page recipe):

```html
<c:fragment name="cloudpiston/ui/modalShell" />
```

**Trigger** (from a page/fragment) loads a modal fragment into `modalContent`:

```html
<c:a action="editClient?id=${client.id}" ajax-target="modalContent" class="btn btn--primary">Edit</c:a>
```

**Modal fragment** (`fragments/clients/editClient.html`) — inner content only:

```html
<c:ignore xmlns:c="contractpal">

    <div class="modal-header">
        <h2 id="modalTitle" class="modal-title">Edit client</h2>
        <button type="button" class="btn btn--ghost btn--icon modal-close"
                onclick="hideModal()" aria-label="Close dialog">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor"
                      stroke-width="1.5" stroke-linecap="round" />
            </svg>
        </button>
    </div>

    <div class="modal-body">
        <span id="feedback" role="alert" aria-live="polite"></span>
        <label class="field">
            <span class="field__label">Client name</span>
            <c:field type="text" name="clientName" class="field__input" value="${client.name}" />
        </label>
    </div>

    <div class="modal-footer">
        <button type="button" class="btn btn--ghost" onclick="hideModal()">Cancel</button>
        <c:a action="saveClient" ajax-target="feedback" class="btn btn--primary">Save</c:a>
    </div>

</c:ignore>
```

**CSS** (themes the shell's regions):

```css
.modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-5);
    border-block-end: var(--border-thin) solid var(--color-border);
}
.modal-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: var(--weight-semibold);
    color: var(--color-text);
}
.modal-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-5);
    color: var(--color-text);
}
.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding: var(--space-5);
    border-block-start: var(--border-thin) solid var(--color-border);
}
```

**A11y:** the dialog semantics, focus trap, `Esc`, and focus-return are the shell's job —
do **not** hand-roll them in the fragment. The close control is a real `<button>` with
`aria-label`. The `#feedback` span is an `aria-live` region so server responses are
announced.

**Dialog labeling — VERIFIED-OPEN platform seam.** `cloudpiston/ui/modalShell` is a
**platform-provided** fragment, resolved server-side at render time — it is not a file in
the pal, so headless capability testing (push + `getPal`, which sees stored source only)
**cannot observe** whether the shell's `role="dialog"` element honors an `aria-labelledby`
pointing at our title. So: **keep `id="modalTitle"` on the title** — it costs nothing and is
ready the moment the shell honors it — but treat the dialog's accessible name as
**unconfirmed**, and do **not** fake dialog labeling inside the fragment (don't add a stray
`role="dialog"`/`aria-modal` to our content; the shell owns the dialog element). To actually
settle it, one of: (1) read the `cloudpiston/ui/modalShell` source on the Cloudpiston
console, or (2) inspect a **live rendered** modal's DOM in the browser to see whether the
dialog carries `aria-labelledby` (and whether it exposes a hook to point at our title id).

---

### 9.5 Table

Scannable rows of data. `c:list` renders the body with **direct EL** (`${row.col}` — never
`.getValue(...)`). Hairline rows, sticky header for long tables, comfortable by default with
a `--dense` modifier for enterprise data grids. Server-side sort via `c:a`.

**CSS:**

```css
.table-wrap { inline-size: 100%; overflow-x: auto; }   /* horizontal scroll on narrow */
.table {
    inline-size: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
    color: var(--color-text);
}
.table caption {
    text-align: start;
    padding-block: var(--space-2);
    color: var(--color-text-muted);
}
.table th,
.table td {
    padding-inline: var(--space-4);
    padding-block: var(--space-3);
    text-align: start;
    border-block-end: var(--border-thin) solid var(--color-border);
}
.table thead th {
    position: sticky;
    inset-block-start: 0;
    background: var(--color-surface-2);
    font-weight: var(--weight-semibold);
    white-space: nowrap;
}
.table tbody tr {
    transition: background-color var(--motion-fast) var(--ease-standard);
    &:hover { background: var(--color-surface-2); }
    &:focus-within { background: var(--color-surface-2); }
}
.table .is-numeric { text-align: end; font-variant-numeric: tabular-nums; }
.table--dense th,
.table--dense td { padding-inline: var(--space-3); padding-block: var(--space-2); }

/* sortable-header action (a c:a styled as a quiet button) */
.table__sort {
    display: inline-flex; align-items: center; gap: var(--space-1);
    color: inherit; font: inherit; font-weight: var(--weight-semibold); text-decoration: none;
    &:hover { color: var(--color-accent); }
    &:focus-visible { outline: var(--border-thick) solid var(--color-focus); outline-offset: var(--border-thin); }
}
```

**Example:**

```html
<div class="table-wrap" role="region" aria-label="Clients" tabindex="0">
    <table class="table">
        <caption>Client SEO checklist progress</caption>
        <thead>
            <tr>
                <th scope="col"><c:a action="getClients?sort=name" class="table__sort">Client</c:a></th>
                <th scope="col">Status</th>
                <th scope="col" class="is-numeric" aria-sort="descending">
                    <c:a action="getClients?sort=progress" class="table__sort">Complete</c:a>
                </th>
            </tr>
        </thead>
        <tbody>
            <c:list name="clients" id="client">
                <tr>
                    <th scope="row">${client.name}</th>
                    <td>
                        <span class="badge badge--success">
                            <span class="badge__dot" aria-hidden="true"></span> Active
                        </span>
                    </td>
                    <td class="is-numeric">${client.percentComplete}%</td>
                </tr>
            </c:list>
        </tbody>
    </table>
</div>
```

**A11y:** `<table>` + `<caption>`; `<th scope="col">` / `scope="row">`; `aria-sort` reflects
the current sort; sortable headers are real `c:a` actions (keyboard-operable, server-side).
The scroll container is a focusable labelled `region` (`tabindex="0"`) so keyboard users can
pan wide tables. Status uses a badge (text + dot), never color alone. Use `--dense` for
enterprise data grids (see `design-enterprise`).

---

### 9.6 Nav / navbar

Primary navigation using the PalBuilder `workflow=` + active-class `c:a` idiom: a `c:set`
computes the active class per item; the accent marks the current item (underline), never a
second CTA.

> **Tested-ARIA note:** `aria-current` is **not** in `c:a`'s documented attribute set, so —
> like `aria-*` on `c:field` — it's unsupported passthrough and would draw a "not allowed in
> this context" note. Convey the current item with the visual active state **plus** a
> visually-hidden "(current)" cue via `c:if`, not with `aria-current` on `c:a`.

**CSS:**

```css
/* shared utility — visually hidden, screen-reader available.
   The fixed 1px/-1px values are an a11y mechanism (structural), not design values (§3). */
.sr-only {
    position: absolute;
    width: 1px; height: 1px; margin: -1px; padding: 0; border: 0;
    overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;
}

.nav {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding-inline: var(--space-4);
    background: var(--color-surface);
    border-block-end: var(--border-thin) solid var(--color-border);
}
.nav__item {
    display: inline-flex;
    align-items: center;
    min-block-size: var(--control-height-lg);
    padding-inline: var(--space-3);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--color-text-muted);
    text-decoration: none;
    border-block-end: var(--border-thick) solid transparent;
    transition: color var(--motion-fast) var(--ease-standard),
                border-color var(--motion-fast) var(--ease-standard);
    &:hover { color: var(--color-text); }
    &:focus-visible { outline: var(--border-thick) solid var(--color-focus); outline-offset: calc(-1 * var(--border-thick)); }
}
.nav__item.is-active {
    color: var(--color-text);
    border-block-end-color: var(--color-accent);
}
```

**Example:**

```html
<c:set name="dashActive"    test="${active eq 'dashboard'}" true="is-active" false="" />
<c:set name="clientsActive" test="${active eq 'clients'}"   true="is-active" false="" />

<nav class="nav" aria-label="Primary">
    <c:a action="getDashboard" workflow="console" class="nav__item ${dashActive}">Dashboard</c:a>
    <c:a action="getClients" workflow="console" class="nav__item ${clientsActive}">Clients<c:if test="${active eq 'clients'}"><span class="sr-only"> (current page)</span></c:if></c:a>
</nav>
```

**A11y:** `<nav aria-label="Primary">`; current item conveyed by the accent underline **and**
a visually-hidden "(current page)" string (since `aria-current` on `c:a` is unsupported);
links are real `c:a` (keyboard order free); focus ring inset so it isn't clipped by the bar.

---

### 9.7 Badge / status pill

Status for *meaning* — **never color alone** (§5). Always a text label, plus a dot for a
second non-color cue. Background = the status `-bg` tint; text + dot = the status color.

**CSS:**

```css
.badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding-inline: var(--space-2);
    padding-block: var(--space-1);
    border-radius: var(--radius-pill);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    line-height: var(--leading-tight);
    white-space: nowrap;
}
.badge__dot {
    inline-size: var(--space-2);
    block-size: var(--space-2);
    border-radius: var(--radius-pill);
    background: currentColor;
    flex: none;
}
.badge--neutral { background: var(--color-surface-2);  color: var(--color-text-muted); }
.badge--success { background: var(--color-success-bg); color: var(--color-success); }
.badge--warning { background: var(--color-warning-bg); color: var(--color-warning); }
.badge--danger  { background: var(--color-danger-bg);  color: var(--color-danger); }
.badge--info    { background: var(--color-info-bg);    color: var(--color-info); }
```

**Example:**

```html
<span class="badge badge--success">
    <span class="badge__dot" aria-hidden="true"></span> Active
</span>
<span class="badge badge--warning">
    <span class="badge__dot" aria-hidden="true"></span> Pending review
</span>
```

**A11y:** the text label carries the meaning (a screen reader reads "Active"); the dot is
`aria-hidden` decoration and a second non-color cue; status text on its `-bg` token is tuned
to ≥ 4.5:1 in `reference-theme.css` — verify if you retint.

---

### 9.8 Form layout

Groups fields with consistent rhythm: `<fieldset>`/`<legend>` per related group, one column
that becomes two on wide viewports, a right-aligned action row. Composes the §9.2 field.

**CSS:**

```css
.form { display: flex; flex-direction: column; gap: var(--space-6); max-inline-size: var(--size-md); }
.form__group {
    display: flex; flex-direction: column; gap: var(--space-4);
    margin: 0; padding: 0; border: 0;          /* reset fieldset */
}
.form__legend {
    padding: 0;
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    color: var(--color-text);
}
.form__grid { display: grid; grid-template-columns: 1fr; gap: var(--space-4); }
@media (min-width: 40rem) {                     /* breakpoint convention — see theme.css */
    .form__grid--two { grid-template-columns: 1fr 1fr; }
}
.form__actions {
    display: flex; justify-content: flex-end; gap: var(--space-2);
    padding-block-start: var(--space-4);
    border-block-start: var(--border-thin) solid var(--color-border);
}
.field__required { color: var(--color-danger); }
```

**Example:**

```html
<form>
    <fieldset class="form__group">
        <legend class="form__legend">Contact</legend>
        <div class="form__grid form__grid--two">
            <label class="field">
                <span class="field__label">First name</span>
                <c:field type="text" name="firstName" class="field__input" value="${firstName}" required="true" />
            </label>
            <label class="field">
                <span class="field__label">Last name</span>
                <c:field type="text" name="lastName" class="field__input" value="${lastName}" required="true" />
            </label>
        </div>
        <label class="field">
            <span class="field__label">Email <span class="field__required" aria-hidden="true">*</span></span>
            <c:field type="email" name="email" class="field__input" value="${email}" required="true" />
        </label>
    </fieldset>
    <div class="form__actions">
        <button type="button" class="btn btn--ghost" onclick="hideModal()">Cancel</button>
        <c:a action="saveContact" ajax-target="feedback" class="btn btn--primary">Save</c:a>
    </div>
</form>
```

**A11y:** related inputs grouped in `<fieldset>` + `<legend>`; every control wrapped by its
`<label>`; required conveyed by the native `required` (announced by AT) **and** a visible
`*` — the `*` is `aria-hidden` so it isn't read twice; logical source order; one primary CTA.

---

### 9.9 Dropdown / select

**Default to a native `<select>`** with `c:field type="option"` (the tested form pattern) —
it is keyboard- and screen-reader-accessible for free. Style the box with the field tokens
and supply a token-clean caret (a positioned SVG using `currentColor`, so no raw color in a
data URI). A custom JS listbox is a last resort (note below).

**CSS:**

```css
.select { display: flex; flex-direction: column; gap: var(--space-2); }
.select__field { position: relative; }
.select__control {
    appearance: none;
    -webkit-appearance: none;
    inline-size: 100%;
    min-block-size: var(--control-height-md);
    padding-inline: var(--space-3) var(--space-7);   /* room for the caret */
    padding-block: var(--space-2);
    font-family: var(--font-body);
    font-size: var(--text-base);
    color: var(--color-text);
    background: var(--color-surface);
    border: var(--border-thin) solid var(--color-border-strong);
    border-radius: var(--radius-md);
    transition: border-color var(--motion-fast) var(--ease-standard),
                box-shadow var(--motion-fast) var(--ease-standard);
    &:focus-visible {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: 0 0 0 var(--border-thick) var(--color-focus);
    }
    &:disabled { background: var(--color-surface-2); color: var(--color-text-muted); cursor: not-allowed; }
}
.select__caret {
    position: absolute;
    inset-inline-end: var(--space-3);
    inset-block: 0;
    display: flex; align-items: center;
    color: var(--color-text-subtle);
    pointer-events: none;
}
```

**Example:**

```html
<label class="select">
    <span class="field__label">Status</span>
    <span class="select__field">
        <select name="status" class="select__control">
            <c:field type="option" value="active"   name="Active"   selected="${status eq 'active'}"></c:field>
            <c:field type="option" value="paused"   name="Paused"   selected="${status eq 'paused'}"></c:field>
            <c:field type="option" value="archived" name="Archived" selected="${status eq 'archived'}"></c:field>
        </select>
        <span class="select__caret" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" focusable="false">
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </span>
    </span>
</label>
```

**A11y:** the native `<select>` is fully accessible by default; the label wraps it; the caret
is `aria-hidden` decoration; focus ring on the control.
**Custom listbox (last resort only):** if you genuinely need rich options or async search,
build a `role="listbox"`/`option` widget with `aria-expanded`, full arrow/Enter/Esc keyboard
handling and focus return, on `--color-surface` + `--shadow-md` + `--layer-dropdown` and
`min-inline-size: var(--size-sm)`, in an external `.js` module (manual init, no
`DOMContentLoaded`). Prefer the native control above.

---

### 9.10 Tabs

Switch views in place. Light JS lives in an **external `.js`** (the `${}`/EL reason), written
as a module, initialized directly (AJAX-loaded fragments don't fire `DOMContentLoaded`).

**CSS:**

```css
.tabs__list {
    display: flex;
    gap: var(--space-1);
    border-block-end: var(--border-thin) solid var(--color-border);
}
.tabs__tab {
    display: inline-flex; align-items: center;
    min-block-size: var(--control-height-md);
    padding-inline: var(--space-4);
    font-size: var(--text-sm); font-weight: var(--weight-medium);
    color: var(--color-text-muted);
    background: none; border: none; cursor: pointer;
    border-block-end: var(--border-thick) solid transparent;
    margin-block-end: calc(-1 * var(--border-thin));   /* sit on the list hairline */
    transition: color var(--motion-fast) var(--ease-standard),
                border-color var(--motion-fast) var(--ease-standard);
    &:hover { color: var(--color-text); }
    &:focus-visible { outline: var(--border-thick) solid var(--color-focus); outline-offset: calc(-1 * var(--border-thick)); }
}
.tabs__tab[aria-selected="true"] {
    color: var(--color-text);
    border-block-end-color: var(--color-accent);
}
.tabs__panel { padding-block-start: var(--space-5); }
.tabs__panel[hidden] { display: none; }
```

**Example** (markup + external module):

```html
<div class="tabs" data-tabs>
    <div class="tabs__list" role="tablist" aria-label="Report sections">
        <button type="button" class="tabs__tab" role="tab" id="tabOverview"
                aria-selected="true" aria-controls="panelOverview">Overview</button>
        <button type="button" class="tabs__tab" role="tab" id="tabKeywords"
                aria-selected="false" aria-controls="panelKeywords" tabindex="-1">Keywords</button>
    </div>
    <div class="tabs__panel" id="panelOverview" role="tabpanel" aria-labelledby="tabOverview" tabindex="0">
        <p>Overview content.</p>
    </div>
    <div class="tabs__panel" id="panelKeywords" role="tabpanel" aria-labelledby="tabKeywords" tabindex="0" hidden="hidden">
        <p>Keyword content.</p>
    </div>
</div>
<script type="text/javascript" src="../Scripts/tabs.js"></script>
```

```js
// Scripts/tabs.js — module pattern; runs directly (no DOMContentLoaded; AJAX-loaded)
var TabsModule = (function () {
    function activate(list, tab) {
        var tabs = Array.prototype.slice.call(list.querySelectorAll("[role=\"tab\"]"));
        tabs.forEach(function (t) {
            var selected = (t === tab);
            t.setAttribute("aria-selected", selected ? "true" : "false");
            t.tabIndex = selected ? 0 : -1;
            var panel = document.getElementById(t.getAttribute("aria-controls"));
            if (panel != null) { panel.hidden = !selected; }
        });
    }
    function onKeydown(list, event) {
        var keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
        if (keys.indexOf(event.key) === -1) { return; }
        var tabs = Array.prototype.slice.call(list.querySelectorAll("[role=\"tab\"]"));
        var current = tabs.indexOf(document.activeElement);
        var next = current;
        if (event.key === "ArrowRight") { next = (current + 1) % tabs.length; }
        else if (event.key === "ArrowLeft") { next = (current - 1 + tabs.length) % tabs.length; }
        else if (event.key === "Home") { next = 0; }
        else if (event.key === "End") { next = tabs.length - 1; }
        event.preventDefault();
        tabs[next].focus();
        activate(list, tabs[next]);
    }
    function init(root) {
        var list = root.querySelector("[role=\"tablist\"]");
        if (list == null) { return; }
        list.addEventListener("click", function (event) {
            var tab = event.target.closest("[role=\"tab\"]");
            if (tab != null) { activate(list, tab); tab.focus(); }
        });
        list.addEventListener("keydown", function (event) { onKeydown(list, event); });
    }
    document.querySelectorAll("[data-tabs]").forEach(function (root) { init(root); });
    return { init: init };
})();
```

**A11y:** `role="tablist"/"tab"/"tabpanel"`; `aria-selected` on the active tab; **roving
tabindex** (only the selected tab is in the tab order); Left/Right/Home/End move focus and
activate; each panel is `aria-labelledby` its tab and focusable; inactive panels use `hidden`.

---

### 9.11 Toast / alert

Two forms: an **inline alert** (in flow — e.g. a modal's `#feedback`) and a **toast** (a
fixed, transient, auto-dismissing alert). Toast JS is an external module. Never color alone;
keyboard-dismissible; the reduced-motion reset (§7) neutralizes the entrance.

**CSS:**

```css
.alert {
    display: flex; align-items: flex-start; gap: var(--space-2);
    padding-inline: var(--space-4); padding-block: var(--space-3);
    border: var(--border-thin) solid transparent;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--color-text);
}
.alert__icon { flex: none; display: flex; }
.alert__body { flex: 1 1 auto; }
.alert--success { background: var(--color-success-bg); border-color: var(--color-success); }
.alert--warning { background: var(--color-warning-bg); border-color: var(--color-warning); }
.alert--danger  { background: var(--color-danger-bg);  border-color: var(--color-danger); }
.alert--info    { background: var(--color-info-bg);    border-color: var(--color-info); }

/* toast = an alert pinned to a fixed region */
.toast-region {
    position: fixed;
    inset-block-end: var(--space-5);
    inset-inline-end: var(--space-5);
    z-index: var(--layer-toast);
    display: flex; flex-direction: column; gap: var(--space-2);
    inline-size: min(var(--size-xs), 100%);
}
.toast {
    background: var(--color-surface);
    box-shadow: var(--shadow-md);
    opacity: 0;
    transform: translateY(var(--space-2));
    transition: opacity var(--motion-base) var(--ease-standard),
                transform var(--motion-base) var(--ease-standard);
}
.toast.is-visible { opacity: 1; transform: translateY(0); }
.toast__close {
    margin-inline-start: auto; flex: none;
    background: none; border: none; cursor: pointer; color: var(--color-text-muted);
    &:focus-visible { outline: var(--border-thick) solid var(--color-focus); outline-offset: var(--border-thin); }
}
```

**Example** (inline alert + toast region + module):

```html
<!-- inline alert -->
<div class="alert alert--danger" role="alert">
    <span class="alert__icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20" focusable="false">
            <path d="M10 6v5M10 14h.01" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
    </span>
    <span class="alert__body">Couldn't save — check the highlighted fields.</span>
</div>

<!-- toast region (place once in the page shell) -->
<div class="toast-region" id="toastRegion" role="status" aria-live="polite"></div>
<script type="text/javascript" src="../Scripts/toast.js"></script>
```

```js
// Scripts/toast.js — build DOM via textContent (no markup injection, no ${} EL collision)
var ToastModule = (function () {
    var REGION_ID = "toastRegion";
    var AUTO_DISMISS_MS = 5000;
    function dismiss(toast) {
        toast.classList.remove("is-visible");
        toast.addEventListener("transitionend", function () { toast.remove(); }, { once: true });
    }
    function show(message, variant) {
        var host = document.getElementById(REGION_ID);
        if (host == null) { return; }
        var toast = document.createElement("div");
        toast.className = "toast alert alert--" + (variant || "info");
        var body = document.createElement("span");
        body.className = "alert__body";
        body.textContent = message;
        var close = document.createElement("button");
        close.type = "button";
        close.className = "toast__close";
        close.setAttribute("aria-label", "Dismiss");
        close.textContent = "×";
        close.addEventListener("click", function () { dismiss(toast); });
        toast.appendChild(body);
        toast.appendChild(close);
        host.appendChild(toast);
        requestAnimationFrame(function () { toast.classList.add("is-visible"); });
        var timer = setTimeout(function () { dismiss(toast); }, AUTO_DISMISS_MS);
        toast.addEventListener("mouseenter", function () { clearTimeout(timer); });
        toast.addEventListener("focusin", function () { clearTimeout(timer); });
    }
    return { show: show };
})();
// usage: ToastModule.show("Report published.", "success");
```

**A11y:** the toast region is a live region (`role="status"`/`aria-live="polite"`; use a
separate `role="alert"`/`assertive` region for errors) so new messages are announced; each
alert/toast has a **text** body (color is never the only signal) and an `aria-hidden` icon;
the close button is keyboard-operable with `aria-label`; auto-dismiss **pauses on hover and
focus** (WCAG 2.2 "enough time"); the slide-in is removed under `prefers-reduced-motion`.

---

### 9.12 Empty state

The "designed not defaulted" moment (§1) — a considered prompt, never a bare "no data".
Centered: an `aria-hidden` icon, a real heading, one explanatory line, and a single clear
next action.

**CSS:**

```css
.empty {
    display: flex; flex-direction: column; align-items: center;
    gap: var(--space-4);
    text-align: center;
    padding-block: var(--space-8);
    padding-inline: var(--space-5);
    max-inline-size: var(--size-md);
    margin-inline: auto;
}
.empty__icon { color: var(--color-text-subtle); }     /* SVG inherits via currentColor */
.empty__title {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: var(--weight-semibold);
    color: var(--color-text);
}
.empty__body { margin: 0; font-size: var(--text-base); line-height: var(--leading-normal); color: var(--color-text-muted); }
.empty__actions { display: flex; gap: var(--space-2); margin-block-start: var(--space-2); }
```

**Example:**

```html
<div class="empty">
    <span class="empty__icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48" focusable="false">
            <path d="M8 16h32v22a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V16z M8 16l4-6h24l4 6"
                  fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
    </span>
    <h2 class="empty__title">No clients yet</h2>
    <p class="empty__body">Add your first client to start tracking SEO checklists and monthly reports.</p>
    <div class="empty__actions">
        <c:a action="newClient" ajax-target="modalContent" class="btn btn--primary">Add a client</c:a>
    </div>
</div>
```

**A11y:** a real heading puts the state in the document outline; the illustration is
`aria-hidden`; the copy explains the *next step* (not a dead "no data"); one unambiguous
primary action (`c:a`), keyboard-operable like any button.

---

*Per-pal identity lives in `theme.css`. This core references token names only. The three
application skills (`design-marketing`, `design-app`, `design-enterprise`) layer on top.*
