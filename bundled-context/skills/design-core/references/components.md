# Component Recipes (PalBuilder-valid)

Pre-solved recipes for the components agents most often get wrong. All written for the PalBuilder substrate: void tags self-closed, no `${...}` inside inline `<script>` (EL in HTML/style attributes is fine), `<label>`+`role="alert"` for ARIA on `c:field`. They consume the tokens from `SKILL.md` (`--ink`, `--accent`, `--line`, etc.). Adapt — don't paste blindly. Pair with `palbuilder-frontend` for markup validity.

**Contents**
1. Progress ring (the broken-arc fix)
2. Buttons
3. Stat / metric card
4. Status chip
5. Data table
6. Page header
7. Empty state
8. Modal body
9. Base stylesheet starter
10. Icons (Lucide, inline)
11. Calm charts (bar, sparkline)
12. Responsive patterns (table→card, touch targets, fluid type)
13. Loading & error states (skeleton, error block, field error, button busy)
14. Scroll-reveal (entrance animations)

---

## 1. Progress ring — pure CSS, renders correctly every time

The screenshot bug (broken arcs) comes from hand-guessed `stroke-dasharray`. Don't guess. A circle's circumference is `2πr`; the visible arc is controlled by `stroke-dashoffset`. With `r = 52`, circumference ≈ `326.726`. Set the percent via an EL custom property in `style=` (an HTML attribute, so EL is allowed here) and let CSS `calc()` do the math — **no JavaScript needed**.

```html
<div class="ring" style="--pct: ${client.progress};">
  <svg viewBox="0 0 120 120" class="ring-svg" aria-hidden="true">
    <circle class="ring-track" cx="60" cy="60" r="52" />
    <circle class="ring-value" cx="60" cy="60" r="52" />
  </svg>
  <span class="ring-label">${client.progress}<span class="ring-pct">%</span></span>
</div>
```

```css
.ring { position: relative; width: 88px; height: 88px; }
.ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }   /* start at 12 o'clock */
.ring-track,
.ring-value {
  fill: none;
  stroke-width: 8;
  /* 2 * π * 52 = 326.726 */
  stroke-dasharray: 326.726px;
}
.ring-track { stroke: var(--line); }
.ring-value {
  stroke: var(--accent);
  stroke-linecap: round;
  stroke-dashoffset: calc(326.726px - (326.726px * var(--pct) / 100));
  transition: stroke-dashoffset 0.6s var(--ease);
}
.ring-label {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-variant-numeric: tabular-nums;
  font-size: 1.375rem; font-weight: 600; color: var(--ink);
}
.ring-pct { font-size: 0.75rem; color: var(--ink-muted); margin-left: 1px; }
```

If the percent must come from inline JS instead of EL: put it in a `data-pct` attribute and set the offset from an **external** `.js` file (never inline, to avoid the `${}` collision). The CSS-`calc` version above is preferred — it needs no JS at all.

---

## 2. Buttons — one primary, the rest quiet, all clickable

```css
.btn { font: 500 0.875rem/1 "Hanken Grotesk", system-ui; border-radius: var(--r-pill);
       padding: 12px 24px; border: 1px solid transparent; cursor: pointer;
       text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
       transition: transform 0.12s var(--ease), box-shadow 0.18s var(--ease),
                   background 0.15s var(--ease), border-color 0.15s var(--ease); }
.btn:active { transform: translateY(1px); }
.btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--accent-soft), 0 0 0 4px var(--accent); }

.btn-primary { background: var(--accent); color: var(--accent-ink);
               box-shadow: 0 1px 2px rgba(47,93,138,0.18); }
.btn-primary:hover { background: color-mix(in srgb, var(--accent) 90%, black);
                     transform: translateY(-1px); box-shadow: 0 4px 12px rgba(47,93,138,0.28); }
.btn-primary:active { box-shadow: 0 1px 2px rgba(47,93,138,0.18); }

.btn-secondary { background: var(--surface); color: var(--ink); border-color: var(--line-strong);
                 box-shadow: var(--shadow-sm); }
.btn-secondary:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); border-color: var(--ink-muted); }
.btn-secondary:active { box-shadow: var(--shadow-sm); }

.btn-ghost { background: transparent; color: var(--ink-soft); }
.btn-ghost:hover { color: var(--accent); }
@media (prefers-reduced-motion: reduce) { .btn, .btn:hover, .btn:active { transform: none; } }
```

The accent-tinted shadow on the primary makes it read as *the* action; the 1px hover lift + `:active` press give tactile feedback. Derive the rgba tint from the live `--accent` if it's overridden. Server action uses `c:a`; JS-only uses a plain `<button>`. Icons inline (see §10):

```html
<c:a action="onboardClient" class="btn btn-primary">
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
  Onboard client
</c:a>
<button type="button" class="btn btn-ghost" onclick="ClientModule.dismiss()">Dismiss</button>
```

---

## 3. Stat / metric card — number-forward

```html
<div class="stat">
  <span class="eyebrow">This month</span>
  <span class="stat-value">${client.tasksDone}<span class="stat-sub">/ ${client.tasksTotal}</span></span>
</div>
```

```css
.stat { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md);
        padding: 20px 24px; display: flex; flex-direction: column; gap: 8px;
        box-shadow: var(--shadow-sm); }
.eyebrow { font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-muted); }
.stat-value { font-size: 2.5rem; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; line-height: 1; }
.stat-sub { font-size: 1.25rem; color: var(--ink-muted); margin-left: 4px; }
```

---

## 4. Status chip — compact, tinted, never neon

Replaces the screenshot's stacked full-width status bars. Map status → chip with `c:choose` (from `palbuilder-frontend`):

```html
<c:choose>
  <c:when test="${task.status eq 'sent'}"><span class="chip chip-good">Sent</span></c:when>
  <c:when test="${task.status eq 'pending'}"><span class="chip chip-warn">Pending</span></c:when>
  <c:otherwise><span class="chip chip-neutral">Draft</span></c:otherwise>
</c:choose>
```

```css
.chip { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8125rem; font-weight: 500;
        padding: 4px 12px; border-radius: var(--r-pill); }
.chip::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.9; }
.chip-good    { background: color-mix(in srgb, var(--good) 12%, transparent); color: var(--good); }
.chip-warn    { background: color-mix(in srgb, var(--warn) 14%, transparent); color: var(--warn); }
.chip-neutral { background: var(--bg-sunken); color: var(--ink-soft); }
```

Keep chips **inline on one row**, not stacked vertically. Three small chips in a row read as a status; three full-width bars read as clutter.

---

## 5. Data table — hairline, tabular, right-aligned numbers

```html
<table class="tbl">
  <thead>
    <tr><th>Client</th><th>Domain</th><th class="num">Progress</th><th>Status</th></tr>
  </thead>
  <tbody>
    <c:list name="clients" id="client">
      <tr>
        <td class="td-primary" data-label="Client">${client.name}</td>
        <td class="td-muted" data-label="Domain">${client.domain}</td>
        <td class="num" data-label="Progress">${client.done}/${client.total}</td>
        <td data-label="Status"><!-- status chip here --></td>
      </tr>
    </c:list>
  </tbody>
</table>
```

```css
.tbl { width: 100%; border-collapse: collapse; background: var(--surface);
       border: 1px solid var(--line); border-radius: var(--r-md); overflow: hidden; }
.tbl th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-muted);
          text-align: left; font-weight: 600; padding: 12px 16px; background: var(--bg-sunken); }
.tbl td { padding: 16px; border-top: 1px solid var(--line); font-size: 0.875rem; color: var(--ink); }
.td-primary { font-weight: 500; }
.td-muted { color: var(--ink-muted); }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.tbl tbody tr:hover { background: var(--bg); }
```

Give every `<td>` a `data-label` (above) so it can collapse to a key-value card on mobile — see §12. Rows use **direct EL** — `c:list` exposes each item as `${client.field}`, not `.getValue('field')`; see `palbuilder-frontend`.

---

## 6. Page header — title + one action, nothing else

```html
<header class="page-head">
  <div>
    <h1 class="page-title">Clients</h1>
    <p class="page-sub">4 active</p>
  </div>
  <c:a action="onboardClient" class="btn btn-primary">Onboard client</c:a>
</header>
```

```css
.page-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; }
.page-title { font: 500 2.5rem/1.05 "Fraunces", Georgia, serif; letter-spacing: -0.01em; color: var(--ink); }
.page-sub { font-size: 0.875rem; color: var(--ink-muted); margin-top: 8px; }
```

No breadcrumb, no description paragraph, no secondary toolbar unless the spec needs it. A count (`4 active`) replaces a sentence.

---

## 7. Empty state — one line, one action

```html
<div class="empty">
  <p class="empty-line">No clients yet.</p>
  <c:a action="onboardClient" class="btn btn-primary">Onboard your first client</c:a>
</div>
```

```css
.empty { display: flex; flex-direction: column; align-items: center; gap: 16px;
         padding: 64px 24px; text-align: center; }
.empty-line { font: 400 1.125rem "Fraunces", Georgia, serif; color: var(--ink-soft); }
```

No paragraph explaining what clients are. One line states the situation; one button resolves it.

---

## 8. Modal body — matches the PalBuilder modal fragment pattern

Inner content only (the outer shell holds the Bootstrap wrapper — see `palbuilder-frontend`). For an input needing ARIA, use a plain `<input aria-* />` (accepts ARIA cleanly) rather than `c:field`, or wrap a `c:field` with a `<label>` + a `role="alert"` error span.

```html
<c:ignore xmlns:c="contractpal">
  <div class="modal-header">
    <h5 class="modal-title">Onboard client</h5>
    <button type="button" class="btn-close" onclick="hideModal()" aria-label="Close"></button>
  </div>
  <div class="modal-body">
    <span id="feedback" role="alert"></span>
    <label class="field-label" for="clientName">Client name</label>
    <input type="text" id="clientName" name="clientName" class="field" placeholder="Acme Co." />
  </div>
  <div class="modal-footer">
    <c:a action="saveClient" ajax-target="feedback" class="btn btn-primary">Save</c:a>
    <button type="button" class="btn btn-ghost" onclick="hideModal()">Cancel</button>
  </div>
</c:ignore>
```

```css
.field-label { display: block; font-size: 0.8125rem; color: var(--ink-soft); margin-bottom: 8px; }
.field { width: 100%; font-size: 0.875rem; padding: 12px 16px; border: 1px solid var(--line);
         border-radius: var(--r-sm); background: var(--surface); color: var(--ink); }
.field:focus { outline: none; border-color: var(--accent);
               box-shadow: 0 0 0 3px var(--accent-soft); }
.field::placeholder { color: var(--ink-muted); }
```

---

## 9. Base stylesheet starter

Put this in an external `design-tokens.css` (creatable via push as a `styles` type) plus the page background, so every fragment inherits it.

```css
/* design-tokens.css — :root block from SKILL.md goes here, then: */
body { background: var(--bg); color: var(--ink);
       font: 400 1rem/1.5 "Hanken Grotesk", system-ui, sans-serif;
       font-variant-numeric: tabular-nums; }
.app-shell { max-width: 1280px; margin: 0 auto; padding: 32px 24px; }
.grid { display: grid; gap: 24px; }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 768px) { .grid-3 { grid-template-columns: 1fr; } }
```

Load fonts once in the shell `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500&amp;family=Hanken+Grotesk:wght@400;500;600&amp;family=IBM+Plex+Mono&amp;display=swap" rel="stylesheet" />
```

Note the `&amp;` in the font URL is correct **here** because this is an HTML attribute (XHTML element structure). It is *not* the same as escaping inside `<style>`/`<script>`, where you write CSS/JS naively.

---

## 10. Icons — Lucide, inlined

Lightweight, modern, MIT-licensed, stroke-based (matches the hairline look). Inline the raw SVG — no JS auto-replacer, no icon font. Inlined SVG inherits `currentColor`, survives AJAX fragment loads, and self-closes for XHTML.

```css
.icon { width: 16px; height: 16px; flex-shrink: 0; stroke: currentColor; fill: none;
        stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.icon-sm { width: 14px; height: 14px; stroke-width: 1.6; }
```

Workflow: open lucide.dev, copy an icon's SVG, paste its inner shapes, **self-close every path/line/circle**, set `class="icon"` and `viewBox="0 0 24 24"`, add `aria-hidden="true"` when decorative (label-less icon-only buttons need an `aria-label` on the control instead). A few common ones, self-closed and ready:

```html
<!-- plus -->        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
<!-- arrow-right --> <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
<!-- globe -->       <svg class="icon-sm icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20" /></svg>
<!-- search -->      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
<!-- settings -->    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
```

Use sparingly — an icon earns its place when it speeds recognition (action buttons, domain/nav links), not as decoration on every label. One icon family only; match stroke weight to the type.

---

## 11. Calm charts — bar & sparkline

The default failure is Chart.js with heavy gridlines and a rainbow of series. Calm data-viz instead: **one accent, thin strokes, at most one dashed reference line, labels only where they earn it.** Both recipes below are pure CSS/SVG, set values via EL in `style=`/attributes (allowed), and need no charting library.

**Bar chart** — heights from an EL custom property; one hairline baseline; an optional dashed target line.

```html
<div class="bars" role="img" aria-label="Tasks completed per month">
  <c:list name="months" id="m">
    <div class="bar" style="--val: ${m.pct};">
      <span class="bar-fill"></span>
      <span class="bar-label">${m.label}</span>
    </div>
  </c:list>
</div>
```

```css
.bars { display: flex; align-items: flex-end; gap: 8px; height: 140px;
        border-bottom: 1px solid var(--line); position: relative; }
.bar { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.bar-fill { width: 100%; max-width: 28px; height: calc(var(--val) * 1%);
            background: var(--accent); border-radius: var(--r-sm) var(--r-sm) 0 0;
            transition: height 0.6s var(--ease); }
.bar-label { font-size: 0.75rem; color: var(--ink-muted); margin-top: 8px; }
/* one dashed reference (e.g. target at 80%) — at most one, never a full grid */
.bars::before { content: ""; position: absolute; left: 0; right: 0; bottom: 80%;
                border-top: 1px dashed var(--line-strong); }
@media (prefers-reduced-motion: reduce) { .bar-fill { transition: none; } }
```

**Sparkline** — trend in a row, no axes, no labels. `vector-effect` keeps the stroke hairline-thin at any width.

```html
<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
  <polyline points="0,24 20,18 40,20 60,10 80,13 100,4" />
</svg>
```

```css
.spark { width: 100%; height: 32px; }
.spark polyline { fill: none; stroke: var(--accent); stroke-width: 1.5;
                  stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
```

Rules: single accent for the data; if a second series is unavoidable, use a warm gray (`--ink-muted`), never a second saturated hue. No heavy gridlines — one hairline baseline plus at most one dashed reference. Label endpoints or axis ends only, in `--ink-muted`. Status color (good/warn/bad) appears only when a value's *state* matters, never as decoration.

---

## 12. Responsive patterns

Mobile and desktop are parallel primary tracks. Three things cover most cases: collapse tables to cards, size touch targets, and let display type flex.

**Table → key-value cards (below 640px).** Each `<td>` carries a `data-label` (see §5); below the breakpoint the table linearizes and the labels move inline. No horizontal scroll, no lost columns.

```css
@media (max-width: 640px) {
  .tbl, .tbl tbody, .tbl tr, .tbl td { display: block; width: 100%; }
  .tbl thead { display: none; }
  .tbl tr { border: 1px solid var(--line); border-radius: var(--r-md);
            margin-bottom: 12px; background: var(--surface); }
  .tbl td { border: none; display: flex; justify-content: space-between;
            align-items: center; gap: 16px; padding: 12px 16px; }
  .tbl td::before { content: attr(data-label); font-size: 0.75rem; font-weight: 600;
                    text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-muted); }
  .num { text-align: right; }
}
```

**Touch targets (≥44px on touch).**

```css
@media (pointer: coarse) {
  .btn { min-height: 44px; }
  a.row, .tbl tr, .nav a { min-height: 44px; display: flex; align-items: center; }
}
```

**Fluid display type.** Let headings shrink with the viewport; keep body at base.

```css
.page-title { font-size: clamp(1.75rem, 5vw, 2.5rem); }
```

**Nav.** Persistent sidebar at 240px on desktop → 64px icon rail at ~1024px → hidden behind a hamburger toggle below ~768px. The one primary action stays visible at every width; secondary controls fold into the menu. (When the nav is an AJAX-loaded fragment, init any Bootstrap toggles directly — `DOMContentLoaded` won't fire; see `palbuilder-frontend`.)

---

## 13. Loading & error states

The happy path is one of four states. Design loading, empty (§7), and error too.

**Skeleton — mirror the real shape.** Pulsing placeholders that match the layout the data will fill, so nothing jumps on arrival. Render the skeleton in the AJAX target before content loads, or server-side while data is fetched. Not a centered spinner over a blank page.

```html
<!-- skeleton of one client card — same shape as the real card -->
<article class="card" aria-hidden="true">
  <div class="card-head">
    <div style="flex:1">
      <span class="skeleton skeleton-line" style="width:40%"></span>
      <span class="skeleton skeleton-title" style="width:70%"></span>
      <span class="skeleton skeleton-line" style="width:55%"></span>
    </div>
    <span class="skeleton skeleton-circle"></span>
  </div>
  <span class="skeleton skeleton-line" style="width:30%"></span>
</article>
```

```css
.skeleton { display: block; background: var(--bg-sunken); border-radius: var(--r-sm);
            position: relative; overflow: hidden; }
.skeleton + .skeleton { margin-top: 8px; }
.skeleton-line   { height: 0.9rem; }
.skeleton-title  { height: 1.4rem; margin: 8px 0; }
.skeleton-circle { width: 76px; height: 76px; border-radius: 50%; flex-shrink: 0; }
.skeleton::after {
  content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent,
              color-mix(in srgb, var(--surface) 55%, transparent), transparent);
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) { .skeleton::after { animation: none; } }
```

**Error block — calm, with a retry.** One line + an action. `--bad` only for a small icon, never a full red background.

```html
<div class="state-error" role="alert">
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" style="color: var(--bad); width:20px; height:20px;">
    <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
  </svg>
  <p class="state-error-msg">Couldn't load clients.</p>
  <c:a action="getClients" ajax-target="content" class="btn btn-secondary">Try again</c:a>
</div>
```

```css
.state-error { display: flex; flex-direction: column; align-items: center; gap: 12px;
               padding: 64px 24px; text-align: center; }
.state-error-msg { font-size: 1rem; color: var(--ink-soft); }
```

**Field error — border + announced message.** Two patterns; they are **mutually exclusive on one element** — ARIA-on-control and `c:field` binding can't coexist (tested: PalBuilder's validator rejects `aria-invalid`/`aria-describedby` on `c:field`, and they won't reach the rendered input).

*(a) Default — server-bound `c:field`.* Most pal fields are DataList-bound, so this is the common case. Associate the label by **wrapping** the control (no `for`/`id` to keep in sync) and announce the error with a sibling `role="alert"` message. No `aria-*` on the control.

```html
<label class="field-label">
  Email
  <c:field type="text" name="email" class="field is-error" value="${email}" />
</label>
<p class="field-error" role="alert">Enter a valid email address.</p>
```

*(b) Only when ARIA-on-control is genuinely needed* (e.g. a complex custom widget that must expose `aria-invalid`/`aria-describedby`) — drop `c:field` binding, use a plain `<input>`, and wire the value and submission yourself.

```html
<label class="field-label" for="email">Email</label>
<input type="email" id="email" class="field is-error" aria-invalid="true" aria-describedby="email-err" />
<p class="field-error" id="email-err" role="alert">Enter a valid email address.</p>
```

```css
/* shared by both */
.field.is-error { border-color: var(--bad); }
.field.is-error:focus { box-shadow: 0 0 0 3px color-mix(in srgb, var(--bad) 18%, transparent); }
.field-error { font-size: 0.8125rem; color: var(--bad); margin-top: 8px; }
```

Default to (a). Reach for (b) only when you truly need ARIA on the control, accepting that you lose `c:field`'s DataList binding on that element. Either way, say what to fix ("Enter a valid email"), not just "invalid". (See §8 and `palbuilder-frontend`.)

**Button busy — in-place action.** The one place a spinner belongs.

```html
<button type="button" class="btn btn-primary" aria-busy="true" disabled>
  <span class="spinner" aria-hidden="true"></span> Saving…
</button>
```

```css
.btn[aria-busy="true"] { pointer-events: none; opacity: 0.75; }
.spinner { width: 14px; height: 14px; border-radius: 50%;
           border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
           border-top-color: currentColor; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 1.6s; } }
```

Rules: skeletons for content that fills a layout; spinner only for in-place actions; error states stay calm and always offer a way forward. Never leave a blank surface while loading or a dead end on failure.

---

## 14. Scroll-reveal — entrance animations

Static pages feel dead. Sections fade/slide in as they enter the viewport — the single lowest-effort, highest-impact polish step. Uses `IntersectionObserver` in an **external `.js`** (PalBuilder-safe) plus CSS transitions on the elements. One animation per element, never bounce or spring.

**CSS — the transition classes.**

```css
/* elements start hidden, transition on reveal */
.reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.5s var(--ease), transform 0.5s var(--ease); }
.reveal.visible { opacity: 1; transform: translateY(0); }
/* stagger children (set via inline --delay or JS) */
.reveal[style*="--d"] { transition-delay: var(--d); }
@media (prefers-reduced-motion: reduce) {
  .reveal { transform: none; transition: opacity 0.4s ease; }
}
```

**JS — external file (e.g. `reveal.js`, creatable via push).**

```js
// reveal.js — observe .reveal elements, add .visible on enter
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);       // animate once, not on every scroll
      }
    });
  }, { threshold: 0.15 });
  els.forEach(function (el) { io.observe(el); });
})();
```

Note: uses `var` and `function` (not `const`/arrow) so it also survives if accidentally loaded in an older execution context. ES5 is safe everywhere. Load the script at the end of `<body>` or via `defer`.

**Usage — add `class="reveal"` to sections and stagger children.**

```html
<section class="reveal">
  <h2>Three steps to a signed file.</h2>
</section>
<div class="grid grid-3">
  <article class="reveal" style="--d: 0s"><!-- step 1 --></article>
  <article class="reveal" style="--d: 0.08s"><!-- step 2 --></article>
  <article class="reveal" style="--d: 0.16s"><!-- step 3 --></article>
</div>
```

That's it — three pieces (CSS class, external JS, `class="reveal"` on elements). Stagger siblings 60–80ms via `--d`. The page goes from static to alive in minutes. Never apply reveal to elements above the fold (the hero should be immediately visible, not fading in after a delay).
