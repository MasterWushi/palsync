---
name: pal-loop
description: "Execute a pal build autonomously from SPEC.md + EXECUTION.md (produced by the pal-spec skill): one task at a time, verify with palsync tools, checkpoint to disk, escalate when blocked. Use this skill when the user says 'run the loop', 'build the spec', 'continue the build', 'resume the build', or when a workspace contains an EXECUTION.md with unfinished tasks. State lives in files, not in your context — any session can resume."
---

# pal-loop — execute SPEC.md task by task

You are the execution engine for a spec produced by the **pal-spec** skill. The contract:
the spec contains every decision; your job is faithful execution plus honest verification.
**Do not redesign, do not improve the copy, do not add scope.** If the spec is wrong or
incomplete, that's a blocker for the human — not a creative opportunity.

State lives ON DISK (EXECUTION.md), never only in your context. Update the file at every
state change, immediately — if the session dies mid-task, the next session must see the truth.

---

## Before the first task (once per session)

1. Read `SPEC.md` and `EXECUTION.md` in the workspace root, fully.
2. If `SPEC.md` says `status: draft` → STOP. Tell the user: "The spec is not approved yet —
   review it and change status to approved, or run the pal-spec interview to finish it."
3. If the workspace is not a git repository, run `git init && git add -A && git commit -m "loop start"`.
   Commit after every completed task — this is the rollback mechanism. (Local only; never push
   this git repo anywhere.)
4. Read the skills the tasks will need: palbuilder-frontend (+ palbuilder-backend for
   workflows, design-core for UI, seo-core for web pages). Read them BEFORE coding, once.
5. Run `pal_status`. If the server is newer than the last pull, run `pal_pull` first.

## The task cycle (repeat until done or blocked)

1. **Pick** the first task in EXECUTION.md whose status is `todo` and whose `depends` are all
   `done`. If none exists, go to "Ending a session" below.
2. **Tier check.** If the task's tier is `frontier` and you are not a frontier-class model
   (when unsure, ask yourself whether the task requires NEW structure rather than following
   the spec — if yes and you are a small model): set status `needs-frontier`, log a checkpoint
   line, and move to the next eligible task. Do NOT attempt it badly.
   (Orchestrators MAY instead dispatch tasks to subagents sized by tier — cheap→Haiku,
   standard→Sonnet — when the harness supports subagents with a model parameter.)
3. **Mark** the task `in_progress` in EXECUTION.md. Write the file now, not later.
4. **Execute** the task exactly as specced: copy from SPEC.md §3 verbatim (these exact words
   ship), design per §4, SEO head values per §5, schemas per §6. Follow the palbuilder/design/
   seo skills for HOW; the spec is WHAT.
5. **Verify** with the task's success condition — these are tool outputs, not your opinion:
   - `pal_validate` → must report 0 errors (warnings: read them; fix what's real).
   - `pal_push` (respect the spec's push policy: `checkpoint` = ask the user first).
   - `pal_preview` (web) → CHECK the rendered HTML actually contains the exact strings the
     success condition names. Seeing it is the verification.
   - `pal_seo_audit` (web pages) → 0 errors; fix warnings unless the spec says otherwise.
   - `pal_sync_datasets` after pushing a new/changed dataset definition.
6. **On pass:** set status `done`; append one checkpoint line (date, task id, tool-output
   summary); `git add -A && git commit -m "<task id>: <task name>"`. Continue to step 1.
7. **On fail:** fix and re-verify, up to TWO fix attempts. Still failing → set status
   `blocked`, write a Blockers entry that names: what failed (exact tool output), what you
   tried, and the decision or input you need from the human. Then continue with the next
   INDEPENDENT task (one that doesn't depend on the blocked one). Never silently skip
   verification to get past a failure, and never use skipValidation/force to bury one.

## Hard rules

- **Never deploy.** Deployment is a human action in PalBuilder — standing policy.
- **Never touch anything listed in SPEC.md §9 (out of scope).**
- **Never invent content.** Missing copy/fact/asset = blocker, not improvisation.
- **Never leave EXECUTION.md stale.** Every status change is written to disk the moment it
  happens. Do not summarize the table — edit it.
- **Destructive operations** (dataset recreate, lock override, force push) follow their tools'
  confirmation gates; a loop never auto-confirms them.

## Ending a session

Stop when: all tasks are `done`; or only `blocked`/`needs-frontier` tasks remain; or the user
asked you to stop; or you are degrading (context pressure, repeated mistakes — be honest).

Write a session summary at the top of EXECUTION.md's Checkpoints section:
```
== session <n> (<date>): <x> done, <y> blocked, <z> needs-frontier. Next: <task id or "review blockers">.
```
Then report to the user in this order: what shipped (with preview URL if web), what's blocked
and the exact decision each blocker needs, what needs a frontier model, what's next.

## Resuming

A new session resumes by reading EXECUTION.md — nothing else is needed. Trust the file over
any memory of prior sessions: statuses in the file are the truth. Re-run `pal_status` before
the first push of a resumed session (the server may have moved; `pal_pull`/`pal_merge`
handle it).

---

## Delegation recipe (proven)

When dispatching a task to a subagent, the prompt MUST contain — in this order:

1. **MANDATORY READS** — design-law and spec files first (SPEC.md, design tokens, brand rules),
   then sibling files to clone patterns from (list by absolute path).
2. **Copy is law** — approved copy quoted verbatim or pointed at (exact file + section). The
   subagent ships it VERBATIM, no paraphrasing, no improvement.
3. **Clone target** — name an existing file the subagent must clone markup/structure from.
   Never describe a pattern you can point at; point at it.
4. **HARD RULES block** — non-negotiable constraints, every time:
   - XHTML: all void tags self-closed
   - ASCII only — no named entities except `&amp;` `&lt;` `&gt;` `&quot;` `&apos;`
   - No `<script>` inside fragments
   - `pal.json` entries required for every new file
   - Existing CSS classes only — do not invent class names
5. **Required RETURN format** — the subagent must return:
   - A traceability table: what shipped vs what was specified (spec item | shipped value | match)
   - An explicit deviations line: "Deviations: none" or list each deviation with reason.

---

## Verify independently (non-negotiable)

Never accept a subagent's self-report as truth. After every push:

- Run `pal_fetch` on each touched page and grep the served HTML for the expected H1, section
  heading, or CSS class. If the element isn't in the fetched HTML, it didn't ship.
- Run `pal_validate` before push and read push output for the stray-file warning.
- Open the preview for the human at every pause — the human eyeball is the design gate.
  Tooling cannot replace visual sign-off.

**Why:** subagents have over-claimed in practice — reporting elements that didn't exist in the
served HTML, misreading pages, marking tasks done when verification wasn't run. The orchestrator
owns truth; the subagent's self-report is a hypothesis, not a result.
