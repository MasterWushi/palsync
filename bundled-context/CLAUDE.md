# PalBuilder Agent Rules

You are editing source for a **PalBuilder (CloudPiston)** pal — a server-side
Java/JavaScript platform. This file is your always-on contract. Read it before
every task. For deep detail, read the two reference files in this repo
(`docs/palbuilder-frontend.md`, `docs/palbuilder-backend.md`) and the official
docs at https://secure.cloudpiston.com/cpal/cp-api/index.html.

PalBuilder is proprietary. **You do not know this dialect from training.** When
unsure about a tag, an attribute, or an API method, look it up in the reference
files or the docs — never guess. A guessed attribute is a hard build error, not
a warning.

---

## Workspace layout

```
[workspace]/.pals/[PALID]/
    pages/        # XHTML fragments (the c:-tag markup)
    workflows/    # server-side JS — run(controller) entry points
    scripts/      # client-side JS
```

- `PALID` is a long numeric ID, not a name. **Before editing, confirm which
  PALID you are working in.** If a `pal-map.md` exists at the workspace root,
  read it to map IDs to pal names; otherwise ask which pal.
- `.pals/` is managed by the PalBuilder VS Code extension. Edit files in place;
  do not rename, move, or restructure the directory. Do not create files outside
  the pal's existing folder convention.

---

## GOLDEN RULES — these cause hard failures

1. **XHTML is strict — for element structure.** Every void tag must be explicitly
   self-closed: `<input ... />`, `<img ... />`, `<br />`, `<hr />`, `<col />`. An
   unclosed tag is a parse error, not a lint warning. This strictness covers
   **tags and attributes only** — it does NOT apply to the **text content of
   `<script>` and `<style>`**, which is raw text. Write CSS and JS naturally
   there: raw `<`, `>`, `&` round-trip byte-for-byte (verified live). Do **not**
   CDATA-wrap script/style (the XML layer mangles it and corrupts CSS) and do
   **not** entity-escape `<`/`>`/`&` inside them (stored literally, breaks JS).
   One caveat: avoid `${...}` template literals in inline page `<script>` — `${}`
   collides with server-side EL at render time; use string concat or an external
   `.js` file. (Native CSS nesting `&` and JS `&&` emit cosmetic, non-fatal CSS-linter
   notes — the save still succeeds and content is unchanged.)
2. **Never use an undocumented `c:` attribute.** Each `c:` tag has a fixed
   attribute set. Using any attribute not in the reference throws a validation
   error. Check before using an attribute you haven't used before.
3. **AJAX fragments do not fire `DOMContentLoaded`.** Fragments loaded via
   `ajax-target` run with the DOM already present — run init JS directly at the
   bottom of the fragment, never inside a `DOMContentLoaded` wrapper. (Full-page
   reloads are the exception; there it fires normally.)
4. **Never use `fetch` or ClientPal to call the server** unless there is
   genuinely no other way. `c:` tags are server-rendered and encrypt the action
   and query string before HTML reaches the browser; `fetch`/ClientPal expose
   everything in devtools. Use `c:a`, `c:upload`, `c:download`, etc.
5. **`onclick` is not valid on `c:a`.** For a server action use `c:a action=...`.
   For JS-only behavior use a plain `<button onclick="fn()">` or
   `<a href="#" onclick="fn(); return false;">`.
6. **`const` does not exist in workflow JS.** Use `var`; signal immutability with
   `UPPER_SNAKE_CASE`. Strings use double quotes, always.

---

## Front-end (pages/)

- Pages are composed of **fragments** swapped into named target divs via AJAX, or
  delivered via full-page reload. Both are valid.
- Fragment files hold the namespace on a `c:ignore` wrapper:
  `<c:ignore xmlns:c="contractpal"> ... </c:ignore>`.
- Server values bind with EL syntax: `${user.firstName}`, `${settings.logoUrl}`.
- Modal fragments contain **only inner content** (header/body/footer) — the outer
  shell already provides the Bootstrap modal wrapper. The `feedback` span
  receives server response messages. `hideModal()` is a global JS function.
- Organize fragment JS with the **module pattern** (named object, return the
  public functions), called from HTML via `onclick="MyModule.fn()"`. No flat
  globals, no anonymous listeners.
- Bootstrap dropdowns loaded via AJAX must be manually initialized.

Common `c:` tags: `c:a` (action/nav link), `c:upload` (`allow` is required; use
keywords like `image`/`pdf`, never MIME strings; one per page), `c:list`
(needs `name` + `id`), `c:set`, `c:if`, `c:choose/when/otherwise`, `c:fragment`,
`c:download`, `c:field`, `c:ignore`. Full attribute lists:
`docs/palbuilder-frontend.md` and
https://secure.cloudpiston.com/cpal/cp-api/console-tags/summary.html

---

## Back-end (workflows/)

Every workflow has one `run(controller)` entry point. Structure:
**(1)** define globals, **(2)** common setup, **(3)** action switch where each
`case` calls exactly one function, **(4)** prepare and return the response.

Unknown-action fallback is `c.createAjaxResponse("ignore", false)` — never an
error message.

**Reserved global names** — use only for their defined value, nothing else:

| Var | Value | Var | Value |
|---|---|---|---|
| `c` | controller | `payload` | `c.createPayload()` |
| `pal` | `c.getPal()` | `action` | `c.getAction()` |
| `tx` | transaction | `formatter` | `c.getFormatter()` |
| `request` | `c.getRequest()` | `validator` | `c.getValidator()` |
| `data` | `request.getData()` | `cm` | `pal.getCacheManager()` |
| `page` | `c.getPage("")` | `dateUtil` | `c.getDateUtil()` |
| `ajax` | `c.createAjaxResponse()` | `resp` | any other response |

Declare only the globals you actually use.

**Three-layer architecture** as a pal grows: presentation (the `run()` file,
routing + responses) → service (`lib/*.js`, business logic) → data (`data.js`
or `data/*.js`, all dataset reads/writes). Each layer calls only the layer below.
Library functions shared across workflows must take everything as arguments — no
hidden dependence on globals.

**Datasets:** camelCase, plural. Primary key = singular name + `Id` (dataset
`users` → key `userId`). Access via `pal.getDataSet("name")`, `createFilter()`,
`addEqual(...)`, `selectColumns([...])`, `findRecord()` / `getRecords()`.

**Payload** carries data to the template (`${var}`): `payload.set/setBoolean/
setInt(...)`, then `ajax.addPayload(payload)` or `page.addPayload(payload)`.

**Debug** freely with `c.debug()`, `c.debugData()`, `c.debugList()` — then
**remove every debug call before finishing.** Same for commented-out code and
unused files: delete them.

Full `ConsoleController` method list and request/payload APIs:
`docs/palbuilder-backend.md` and
https://secure.cloudpiston.com/cpal/cp-api/console/index.html

---

## Anti-patterns to refuse

- Re-architecting around the platform (custom abstractions over what PalBuilder
  already does cleanly). Use the native API directly. If the API is genuinely
  lacking, say so rather than working around it.
- Leaving `console.log` / `c.debug` in finished code.
- Inventing tag attributes or API methods instead of looking them up.

---

## Before you finish a task

- [ ] All void tags self-closed; markup is valid XHTML.
- [ ] No undocumented `c:` attributes (verified against the reference).
- [ ] No `fetch`/ClientPal for server calls.
- [ ] AJAX-loaded JS not wrapped in `DOMContentLoaded`.
- [ ] Reserved globals used only for their defined meaning.
- [ ] Debug calls, dead code, and unused files removed.
