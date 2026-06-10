# palsync — Vision & Roadmap Proposal

*Status: proposal for discussion (June 2026). The numbered priorities are an opinionated
ordering; everything here is built on what the codebase and the live platform actually
support today, with research items called out where they aren't.*

palsync's job is to be the bridge that makes PalBuilder a first-class target for AI agents.
Bridges are judged on two things: **nothing falls off** (0.6.0 closed the data-loss and
reliability gaps), and **traffic flows both ways**. Today the bridge is one-way: the agent
writes code and pushes it, but nothing about the *result* — the rendered page, the workflow
compile, the SEO surface — ever flows back. Every priority below is some form of closing
that loop.

---

## 1. `pal_preview` — let the agent SEE what it built ⭐ highest leverage

The design skill already ends with: *"review the render, not your intentions — push the
fragment and load the actual page; the screen tells the truth."* The agent currently has no
way to do that. This is the single biggest gap between "agent that writes plausible UI" and
"agent that ships designed software." One render-feedback loop is worth more than any amount
of additional skill prose, because it converts the design skill's self-review checklist from
an honor system into an observation.

**Shape:** an MCP tool (`pal_preview`) that renders a deployed page and returns a screenshot
(plus the served HTML) to the agent.

- **Web pals** are open-internet — fetch/screenshot directly, no auth. Start here.
- **Console pals** need an authenticated browser session. palsync holds credentials in the
  keychain; a headless Chromium (Playwright) can log in to the console and screenshot the
  page. Research: confirm the console login flow is scriptable and whether test-mode URLs
  render without full enterprise context.
- Loop: agent edits → `pal_push` → `pal_preview` → sees the pixels → fixes → repeat. Add
  viewport presets (mobile/desktop) so the responsive craft-floor rules become checkable.
- Implementation note: Playwright is a heavy dependency — make it lazy/optional
  (`palsync --with-preview` or auto-install-on-consent like Claude Code in preflight).

## 2. `pal_validate` — catch the silent failure class before it ships

Two PalBuilder failure modes are invisible until too late:

- **Workflow JS compile errors don't surface through the save API** (frozen/cached
  validation — documented in the backend skill). An agent can push a workflow "successfully"
  that is full of `Objects not supported` errors only visible in the builder GUI.
- **XHTML/c: tag violations** are hard errors at parse time (unclosed voids, undocumented
  attributes).

Both are lintable locally, cheaply, with total certainty:

- Workflow-JS subset linter: parse each `workflows/*.js` (acorn) and flag the banned
  constructs — object literals, `let`/`const`, arrow functions, template literals,
  destructuring, `for...of`, array HOFs, function expressions — with file:line and the
  workflow-native alternative (from the skill's own guidance).
- Markup linter: void-tag self-closing, `c:` attribute whitelists (the skill already
  enumerates the valid attribute sets — encode them as data), `${}` inside inline
  `<script>`, `aria-*` on `c:field`, one `c:upload` per page, fragment vs page shell rules.
- Surface it three ways: an MCP tool the agent can call, an automatic pre-push check in
  `pal_push` (warn, don't block — the server stays the authority), and `palsync lint` in
  the CLI.

This makes the skills *enforced* rather than advisory, and it shrinks the iteration loop
the same way `pal_preview` does — failures move from "discovered in the builder next week"
to "fixed before the push."

## 3. Three-way merge on drift — finish the sync story

0.6.0 added per-file baselines (`fileHashes`), which makes drift *visible* per file. The
natural completion: keep the pulled **bytes** (a `.palsync/baseline/` snapshot, gitignore-
style cheap), so when both sides change, palsync can do a real 3-way resolution:

- Server changed `A`, local changed `B` → merge both automatically; no prompt at all.
- Both changed `A` → per-file choice (or textual merge for code files), instead of today's
  whole-workspace force-push/overwrite coin flip.

This dissolves the scariest remaining UX moment (the "both sides changed" prompt) for the
common case where the changes don't actually collide.

## 4. `seo-core` skill + `pal_seo_audit` — perfect SEO from the start

Two halves, one cheap and one cheaper:

- **`seo-core` bundled skill** (injected with `--with-design` or a new `--with-seo`):
  PalBuilder-valid recipes for semantic structure, title/meta/OG/Twitter tags, schema.org
  JSON-LD blocks (Organization, Product, FAQ, Article, LocalBusiness), canonical/sitemap
  guidance, and the E-E-A-T/AIO content rules distilled from the existing seo-copywriting
  material. The skill teaches it at build time, so it ships in the initial push.
- **`pal_seo_audit` MCP tool**: web pals are public — fetch the deployed page and check it
  (title/meta lengths, single H1, heading order, alt text, schema validity, OG completeness,
  render-blocking resources). Same closed-loop principle as preview: the agent reads the
  audit and fixes its own output.

## 5. Project starters — the on-ramp for "build me a client portal"

Full non-technical accessibility (web UI/chat front-end) is a product of its own; the
realistic next step is removing blank-page setup cost for *semi*-technical users:

- `palsync --template <marketing-site|client-portal|dashboard|pwa>`: seeds the workspace
  with a `spec.md` scaffold (sections the design skill knows how to consume: brand tokens,
  references, page list), reference imagery slots, and an initial prompt file the user just
  edits in plain English.
- The launcher's outro prints "open Claude and say: *build the spec*" — the one-sentence
  start the vision asks for.
- Longer term, the same MCP server registered with claude.ai (web/desktop) gives a chat-only
  surface without palsync building any UI. Worth a research spike on remote MCP transport —
  the codebase is already transport-agnostic at the tool layer.

## 6. Research spikes (platform questions, mostly for the CloudPiston devs)

- **Dataset operations**: `apiManager` already special-cases a `SyncDataSet.do` endpoint —
  if it permits headless reads/writes, a `pal_data` tool could seed test data and run smoke
  checks (the missing piece of "agentic beyond code"). Today the agent can read schema from
  the pulled `datasets/*.json` but can't touch data.
- **Debugger output**: `c:debug` / `c.debug()` render to the builder's panel. If that output
  is fetchable over HTTP, the agent could actually *test* server-side behavior — the backend
  equivalent of `pal_preview`.
- **Pal creation via API**: `ProcessPalBuilder` supports `UPDATE`; if `CREATE` works (the
  extension never used it), `palsync new` becomes possible and the "create it in PalBuilder
  first" caveats shrink.
- **Workflow compile via API**: any endpoint that returns a *fresh* workflow compile would
  upgrade priority 2 from lint-approximation to ground truth.

---

## Sequencing

| Order | Item | Size | Why this order |
|---|---|---|---|
| 1 | `pal_validate` (lint) | M | Highest certainty, no platform unknowns, immediate quality floor |
| 2 | `pal_preview` (web pals first) | M–L | Transforms design output; web-pal half has zero auth risk |
| 3 | `seo-core` + `pal_seo_audit` | M | Rides on preview's fetch plumbing |
| 4 | 3-way merge | M | Completes sync; builds on 0.6.0 baselines |
| 5 | Starters/templates | S | Cheap, immediately useful for onboarding |
| 6 | Research spikes | ? | Unblock data tools, debugger loop, `palsync new` |

The thread through all of it: **close the loop**. An agent that can see the render, the
compile errors, the audit results, and the data is an agent that can iterate to excellent —
which is the difference between "PalBuilder has an AI integration" and "PalBuilder is the
platform where agents do their best work."
