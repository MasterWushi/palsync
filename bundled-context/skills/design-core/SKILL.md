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
`flex`/`grid` track values, and SVG icon geometry (an icon's internal `viewBox`/coords).

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

*(Technique B6: agents catch most of their own violations when asked to list them.)* After
producing markup/CSS, **write out the answers to each item.** If any list is non-empty,
fix it before finishing.

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

The **four core recipes** below are complete and are the *pattern* for the rest. The
remaining components are scaffolded as stubs at the end — fill them next pass to this same
standard.

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

### 9.5 Remaining components — scaffold (fill next pass to the standard above)

Each stub names the intent, the key tokens, and the non-negotiable a11y story. Build to the
same completeness as 9.1–9.4: PalBuilder-native HTML + token-only CSS + light/dark via
tokens + focus/keyboard/ARIA + a correct example.

- **Table** — scannable data; denser than marketing surfaces. Tokens: `--color-border`
  row hairlines, `--space-3` cell padding, `--text-sm`, sticky header on `--color-surface-2`.
  A11y: `<table>` + `<caption>`, `<th scope="col|row">`, `aria-sort` on sortable headers,
  zebra optional via `--color-surface-2`. (Enterprise density — see `design-enterprise`.)
- **Nav / navbar** — primary navigation. Tokens: `--color-surface` bar, `--color-border`
  divider, accent for the active item (text/underline, not a second CTA). A11y: `<nav>`
  with `aria-label`, `aria-current="page"` on the active link, keyboard order.
- **Badge / status pill** — status for *meaning*. Tokens: `--color-*-bg` fill +
  matching `--color-*` text, `--radius-pill`, `--text-xs`, `--space-1`/`--space-2`. A11y:
  never color alone — include the text label (and/or icon).
- **Form layout** — field groups, two-column on wide, single-column on narrow. Tokens:
  `--space-5` between groups, `--space-2` label↔control. A11y: `<fieldset>`/`<legend>` for
  grouped inputs; logical order; visible required indication beyond color.
- **Dropdown / select (custom)** — when native `<select>` won't do. Tokens: `--shadow-md`
  menu on `--color-surface`, `--layer-dropdown`, `--radius-md`. A11y: `aria-expanded`,
  `role="listbox"`/`option`, full keyboard (arrows/Enter/Esc), focus return. Light JS,
  external `.js`, manual init (no `DOMContentLoaded`).
- **Tabs** — switch views in place. Tokens: accent underline on the active tab,
  `--color-text-muted` inactive, `--border-thin` track. A11y: `role="tablist"/"tab"/
  "tabpanel"`, `aria-selected`, arrow-key navigation, `aria-controls`.
- **Toast / alert** — transient async feedback. Tokens: `--color-*-bg`/`--color-*`,
  `--shadow-md`, `--layer-toast`, `--radius-md`. A11y: `role="status"`/`"alert"` +
  `aria-live`; never *only* a color; dismissible by keyboard; respects reduced motion.
- **Empty state** — the "designed not defaulted" moment. Tokens: `--color-text-muted`
  copy, `--space-6` padding, one primary CTA. A11y: meaningful heading + one clear next
  action; decorative illustration `aria-hidden`.

---

*Per-pal identity lives in `theme.css`. This core references token names only. The three
application skills (`design-marketing`, `design-app`, `design-enterprise`) layer on top.*
