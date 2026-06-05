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

## Install / Update

```sh
npm install -g github:MasterWushi/palsync
```

The **same command installs and updates** — re-run it to pull the latest commit. Installs the global
`palsync` command (plus `palsync-mcp`, which the agent launches automatically, and `palpush`, a
headless deploy CLI). **No build step** — the OS-keychain dependency ships prebuilt.

If a re-install doesn't pick up the newest version, force a clean fetch:

```sh
npm install -g github:MasterWushi/palsync --force
```

npm can serve a **cached** copy of a git dependency, so an update may silently reinstall the old
commit; `--force` bypasses the cache and guarantees you get the newest commit. Confirm the build you
ended up with:

```sh
palsync --version
```

## Prerequisites

- **Node.js 18 or newer is required up front** — install it first from https://nodejs.org/ (or your version manager). palsync runs on Node, so it can't install or upgrade Node for you: if your Node is too old it shows the exact upgrade command for your setup (nvm/fnm/volta/Homebrew) but **never changes your Node version automatically** — that's yours to run, since it can affect your other projects.
- **Claude Code** — if it's not installed, palsync offers to install it for you (`npm install -g @anthropic-ai/claude-code`) on a yes/no prompt; or install it yourself (docs: https://docs.claude.com/en/docs/claude-code).
- **A CloudPiston login** (username + password) for your cloud.

palsync checks both at startup: it guides you to upgrade Node if needed, and offers to auto-install Claude Code.

## First run

```sh
palsync
```

1. **Pick your cloud** (e.g. Cloudpiston) — or enter a custom URL.
2. **Log in** — validated against the server and saved to your OS keychain; the next run skips the prompt.
3. **Pick your pal** — navigate **profile → group → pal**.
4. palsync **pulls + locks** the pal, injects `CLAUDE.md` + the PalBuilder skills, and **opens Claude Code** in the workspace.

Now talk to Claude. Ask for a change, then say *"push it."*

## Flags

| Flag | Alias | What it does |
|------|-------|--------------|
| `--version` | `-v` | Print the palsync build version and exit. |
| `--with-design` | `-d` | Inject the **Nimblewire design system** (`design-core`) into the workspace for UI work. |
| `--agent <name>` | | Choose the coding agent: `claude` (default) or `codex`. |

The PalBuilder coding skills (`palbuilder-frontend`, `palbuilder-backend`) are **always** injected.
The **design skills are opt-in (default off)** to keep Claude's context lean for backend and bugfix
sessions that don't touch UI. Pass `--with-design` (or `-d`) when you're building or styling an
interface — it adds `design-core` (the token architecture, component recipes, and anti-slop rules)
plus its `reference-theme.css` to the workspace's `.claude/skills/`.

```sh
palsync                 # always-on PalBuilder skills only (lean)
palsync --with-design   # + the Nimblewire design system, for UI work
```

> This will grow to `design-marketing` / `design-app` / `design-enterprise` once those skills exist;
> `--with-design` will inject the design set as a whole.

### Choosing an agent

palsync defaults to **Claude Code**. Pass `--agent codex` to use **Codex** instead:

```sh
palsync                 # Claude Code (default): skills → .claude/skills/, instructions → CLAUDE.md
palsync --agent codex   # Codex: skills → .agents/skills/ + AGENTS.md, MCP via `codex mcp add`, launches codex
palsync --agent codex --with-design   # Codex + the design system
```

With `--agent codex`, palsync writes the same skills to the cross-agent **Agent Skills** open
standard (`.agents/skills/<name>/SKILL.md` + companion assets) and an `AGENTS.md` instruction file,
registers the palsync MCP server with Codex via `codex mcp add` (Codex owns its `~/.codex/config.toml`),
and launches `codex` in the workspace. The Claude Code paths (`.claude/skills/`, `CLAUDE.md`) are
**always** written too and are unchanged, so nothing about the default flow regresses. Because it's
built on the open Agent Skills standard, this generalizes to other agents as they adopt it. If the
`codex` CLI isn't installed, palsync still prepares the workspace and prints the exact manual
registration + launch commands rather than failing.

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

**Create in PalBuilder first** — these are **PalBuilder-only** to create (the server rejects creating
them via push, and the rejection fails the whole push). **Once they exist, palsync edits them normally:**

| Type | Why |
|------|-----|
| Workflows | unknown workflows are rejected (fixed workflow slots) |
| Documents | require a description and valid XML content; a plain file is rejected |
| Fonts | font creation is rejected |
| Datasets, dataviews, data, datalists | provisioned in PalBuilder; palsync preserves them on pull/push but never creates, recreates, or deletes them |

If Claude is asked to create one of the PalBuilder-only types, it will tell you to make it in PalBuilder first.
A safety guard in push also excludes any stray new file of an uncreatable type so it can't sink a push.

## Notes

- **Credentials** live only in your OS keychain (macOS Keychain / Windows Credential Manager / Linux Secret Service) — never in env vars, config, git, or pal files.
- On headless Linux, a Secret Service provider (e.g. `gnome-keyring`) must be available for credential storage.

## License

MIT — see [LICENSE](./LICENSE).
