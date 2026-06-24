---
name: pal-spec
description: "Interview the user and produce SPEC.md + EXECUTION.md — the two files that drive an autonomous pal build. Use this skill when the user says 'spec out', 'plan this pal', 'interview me', 'create a spec', or wants to start a new pal project from a description. The spec must contain REAL copy, real design direction, real schemas, and tool-checkable acceptance criteria — never placeholders. The companion pal-loop skill executes what this skill produces."
---

# pal-spec — interview → SPEC.md + EXECUTION.md

This skill produces the two files an autonomous build runs on. The thesis: **the spec is the
only artifact that earns its tokens.** A complete spec lets a cheaper model build correctly;
a vague spec makes every model guess. Your job here is to remove every guess.

**Hard rule — REAL CONTENT ONLY.** A spec line that says "Hero headline: TBD" produces a bad
page. Every copy field gets real, approved words. Every color is a hex value. Every dataset
field has a real type. If you don't know it, ASK or PROPOSE — never write TBD, never write
"placeholder", never leave a section to "be decided later".

---

## How to run the interview

1. **Mine before you ask.** Before any question, gather what already exists:
   - the pulled pal workspace (existing pages/fragments/styles — read them);
   - a live site, brochure, or document the user points at;
   - the user's first description of what they want.
   Turn what you find into PROPOSED answers. Confirming a proposal costs the user seconds;
   answering an open-ended question costs minutes. Propose, then ask.

2. **Ask in batches of 3–4 questions**, in this order (skip what's already answered):

   **Product & audience** —
   Q1 What is this (one sentence)? Q2 Who is it for (be specific: role, industry)?
   Q3 What should a visitor/user DO (the one primary action)?
   Q4 Web pal (public) or console pal (logged-in)? *(decides SEO + preview behavior)*

   **Scope & structure** —
   Q5 What pages/screens? (propose a sitemap; get it corrected)
   Q6 What's explicitly OUT of scope for this build?

   **Copy** *(web/marketing)* or **Workflows** *(console/app)* —
   Q7 For each page: draft the headline, subhead, CTA, and section copy YOURSELF from the
   mined material, present it, and get it approved or corrected — page by page, not all at
   once. For console apps instead: what are the actions/screens and what data does each show?
   Q8 Any claims/stats/pricing that must be exact? (never invent numbers — ask)

   **Design** —
   Q9 Brand color(s) and font if they exist (hex/name), or "use the house style"?
   Q10 Any reference site/screenshot to match? Mood words?
   Q11 What real images/assets exist? (logo, product shots — where do they come from?)

   **Data** *(if the pal stores anything)* —
   Q12 What entities, what fields, what types? (propose the dataset schemas; confirm)

   **SEO** *(web pals only)* —
   Q13 What domain will this live on? Target search phrase per page? (propose from copy)

   **Operations** —
   Q14 Push policy for the build: free (agent pushes as it goes) or checkpoint (ask first)?
   Q15 Anything the agent must NOT touch? (existing pages, datasets with real data, …)

3. **Write SPEC.md** (template below) into the workspace root. Mark it `status: draft`.
4. **Walk the user through it** (especially the copy). Apply corrections. Mark `status: approved`.
   The loop skill refuses to run on a draft spec — approval is the gate.
5. **Write EXECUTION.md** (template below): break the spec into tasks, mark tiers, define a
   tool-checkable success condition for every task. If you can't write the success condition,
   the task is too vague — split it or sharpen the spec.

---

## SPEC.md template

```markdown
# SPEC — <project name>
status: draft            <!-- pal-loop refuses to run until this says: approved -->
pal: <pal name> (<web | console>) @ <cloud url>
push policy: free | checkpoint
created: <date>   approved: <date or pending>

## 1. Product & audience
<2-4 sentences: what this is, who it serves, the one primary action.>

## 2. Sitemap & routing
| page | file (pages/ or fragment) | workflow action | nav label | purpose (one line) |
|------|---------------------------|-----------------|-----------|--------------------|
<!-- every nav link in the design MUST have a row here; no dead links in the spec -->

## 3. Copy (REAL — these exact words ship)
### <page name>
- H1: <exact headline>
- Subhead: <exact sentence>
- Primary CTA: <exact label> → <where it goes>
- <section name>: <the actual copy, written out>
<!-- repeat per page. For console apps: per screen — title, labels, empty-state line,
     button labels, status names. -->

## 4. Design direction
- Base: project DESIGN_SYSTEM.md (from design-system-init) | dark | brand override
- Accent: <hex>  Fonts: <names or "house">
- Composition notes: <per-page: hero style, rhythm break, anything the user asked for>
- References: <urls/screenshots if any>

## 5. SEO (web pals only — drives pal_seo_audit)
| page | title (≤60ch) | meta description (50–160ch) | og:image (ABSOLUTE url) | schema type |
Domain/canonical base: <https://…>

## 6. Data model (omit if none)
### dataset: <name>            <!-- pal_sync_datasets provisions these -->
| field | type (exact PalBuilder string) | size | notes |
<!-- every dataset gets one "Primary key" field named <dataset>Id -->

## 7. Assets
| asset | source (file path / url / "generate SVG") | used where |

## 8. Acceptance criteria (every line is tool-checkable)
- [ ] `pal_validate`: 0 errors across the workspace
- [ ] `pal_push`: save OK
- [ ] `pal_test`: workflow VALIDATED, 0 server notes
- [ ] `pal_preview` (web): rendered page contains the exact H1s from §3
- [ ] `pal_seo_audit` (web): 0 errors, 0 warnings on every page in §2
- [ ] every nav link in §2 routes to a working page (no dead links)
- [ ] <project-specific lines — exact strings/behaviors to verify>

## 9. Out of scope
<explicit list — what the loop must NOT build or touch>
```

## EXECUTION.md template

```markdown
# EXECUTION — <project name>
spec: SPEC.md (must be status: approved)
started: <date>   sessions: <count>

## Tasks
| id | task | tier | depends | status | success condition (tool-checkable) |
|----|------|------|---------|--------|------------------------------------|
| T1 | scaffold / workspace prep | cheap | — | todo | `palsync validate` 0 errors |
| T2 | <one page or one coherent unit> | standard | T1 | todo | validate 0 errors; push OK; preview contains "<exact H1>" |
| …  |  |  |  |  |  |

status values: todo | in_progress | done | blocked | needs-frontier

## Checkpoints (append-only — one line per completed task)
<date> T1 done — <tool output summary, e.g. "validate 0/0, push 14 files, marker …">

## Blockers (what needs the human — be exact)
<date> T7 blocked — <what failed, what was tried, what decision/input is needed>
```

**Task granularity rule:** one task = one verify cycle (validate → push → preview/audit).
A page is a task. The routing for a set of pages is a task. A dataset is a task. "Build the
site" is NOT a task. If a task's success condition can't be expressed as tool output plus an
exact string to look for, split it.

**Tier marks** (who can execute it):
- `cheap` (Haiku-class): mechanical edits from exact spec copy, alt text, entries in pal.json,
  scaffold application, copy paste-ins.
- `standard` (Sonnet-class): building pages/fragments from approved copy + design notes,
  workflow action handlers, dataset schemas, SEO heads.
- `frontier` (Opus/Fable-class): the FIRST page establishing the design composition, routing
  architecture, anything where the spec gives direction but not structure, spec changes.
Mark honestly — a cheap model struggling on a frontier task costs more than frontier tokens.

---

## What this skill does NOT do

- It does not build anything. The companion **pal-loop** skill executes EXECUTION.md.
- It does not re-teach PalBuilder/design/SEO rules — the palbuilder-frontend,
  palbuilder-backend, design-build, and seo-core skills own those. The spec REFERENCES them.
- It never invents facts: no made-up stats, prices, testimonials, or claims. Ask, or omit.
