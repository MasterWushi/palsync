# palsync

**One command to edit your CloudPiston PalBuilder pal with Claude Code.**

`palsync` is a terminal launcher that logs you into CloudPiston, lets you pick a pal, pulls it to
disk, **locks it**, injects the PalBuilder coding skills, and opens **Claude Code** already wired to
push and pull your pal through an MCP server. Then you just talk to Claude — it writes valid
PalBuilder code and syncs your changes, with **auto-locking** and **drift protection** so you never
silently clobber someone else's work.

- 🔐 **Login once** — credentials stored in your OS keychain, never on disk or in env vars.
- ⬇️ **Pull + lock** your pal automatically; the lock is released on exit, idle, or reclaimed after a crash.
- 🧠 **PalBuilder skills auto-injected** so Claude writes correct `c:` tags, fragments, and workflows.
- ⬆️ **Push from the conversation** — with a drift guard that refuses to overwrite newer server changes.
- 🖥️ **Cross-platform** — macOS, Windows, Linux.

## Install

```sh
npm install -g github:MasterWushi/palsync
```

Installs the global `palsync` command (plus `palsync-mcp`, which Claude Code launches automatically,
and `palpush`, a headless deploy CLI). **No build step** — the OS-keychain dependency ships prebuilt.

## Prerequisites

- **Node.js 18+** — https://nodejs.org/
- **Claude Code** on your PATH — `npm install -g @anthropic-ai/claude-code` (docs: https://docs.claude.com/en/docs/claude-code)
- **A CloudPiston login** (username + password) for your cloud.

palsync checks Node and Claude Code at startup and tells you exactly what to install if either is missing.

## First run

```sh
palsync
```

1. **Pick your cloud** (e.g. Cloudpiston) — or enter a custom URL.
2. **Log in** — validated against the server and saved to your OS keychain; the next run skips the prompt.
3. **Pick your pal** — navigate **profile → group → pal**.
4. palsync **pulls + locks** the pal, injects `CLAUDE.md` + the PalBuilder skills, and **opens Claude Code** in the workspace.

Now talk to Claude. Ask for a change, then say *"push it."*

## MCP tools (Claude calls these for you)

| Tool | What it does |
|------|--------------|
| `pal_push` | Push local changes to the server. Refuses if the server advanced since your last pull (drift) unless forced. |
| `pal_pull` | Refresh the pal from the server. |
| `pal_status` | Is the server newer than your last pull? Who holds the lock? |
| `pal_lock` | Acquire the lock (auto-reclaims your own stale lock). |
| `pal_unlock` | Release the lock (never breaks another user's). |

## Limitations

palsync syncs a pal's **code files**. **palsync can EDIT any existing file of any type** — the limits
below are about **creating** new ones. (All confirmed by testing against a live pal.)

**Create from Claude Code** (Claude writes the file + adds the manifest entry):

| Type | Notes |
|------|-------|
| Pages, Fragments, Scripts | you'll be asked **console or web** (sets `palType`) |
| Emails, Images, Styles, Attachments | no extra metadata needed |

**Create in the PalBuilder GUI first** — these are **GUI-only** to create (the server rejects creating
them via push, and the rejection fails the whole push). **Once they exist, palsync edits them normally:**

| Type | Why |
|------|-----|
| Workflows | unknown workflows are rejected (fixed workflow slots) |
| Documents | require a description and valid XML content; a plain file is rejected |
| Fonts | font creation is rejected |
| Datasets, dataviews, data, datalists | GUI-provisioned; palsync preserves them on pull/push but never creates, recreates, or deletes them |

If Claude is asked to create one of the GUI-only types, it will tell you to make it in PalBuilder first.
A safety guard in push also excludes any stray new file of an uncreatable type so it can't sink a push.

## Notes

- **Credentials** live only in your OS keychain (macOS Keychain / Windows Credential Manager / Linux Secret Service) — never in env vars, config, git, or pal files.
- On headless Linux, a Secret Service provider (e.g. `gnome-keyring`) must be available for credential storage.

## License

MIT — see [LICENSE](./LICENSE).
