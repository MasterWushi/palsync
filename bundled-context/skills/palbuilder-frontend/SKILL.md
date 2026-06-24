---
name: palbuilder-frontend
description: "Use this skill whenever writing front-end code for a Palbuilder (CloudPiston) pal. Covers the page-shell vs fragment distinction, c: tag usage and valid attributes (c:a, c:resource, c:field, c:list, c:fragment, c:debug, and more), fragment architecture and folder organization, XHTML rules, modal patterns, and JavaScript conventions. Trigger when writing pages, HTML fragments, modals, navigation, or any Palbuilder-specific markup. Examples are taken from real production pals; visual styling is deferred to the design skill."
---

# Front-End Palbuilder Coding Skill

Read this file before writing any Palbuilder page or fragment.

Tag reference: https://secure.cloudpiston.com/cpal/cp-api/console-tags/summary.html

**Scope:** this skill covers **structure and `c:` tag mechanics**. It is intentionally light on CSS
and visual class names — match the pal's existing design system, and defer look-and-feel decisions to
the design skill. The examples here use real classes from real pals only to keep the markup realistic;
don't treat any specific class name as a Palbuilder requirement.

This skill covers the **Console** workflow (authenticated) and the **Web** workflow (open internet).

---

## Pages vs Fragments — different files, different rules

A **page** is a complete HTML document and the entry point for a workflow's response. A **fragment** is
a partial loaded into a page (via AJAX `ajax-target`, or `<c:fragment>`). They are NOT interchangeable.

**Every new PAGE uses the full shell:** `<html xmlns:c>` / `<head>` (resources) / `<body>` with a
`<div id="cp-root">` that holds `<c:fragment>` slots. A page without `<html>/<head>/<body>` is rejected
by the server ("No body tag found, cannot save without losing content").

```html
<!-- pages/console.html — the page shell (real: GiftHub) -->
<html xmlns:c="contractpal">
    <head>
        <title>GiftHub</title>
        <meta name="viewport" content="minimum-scale=1.0, width=device-width, maximum-scale=0.6667"/>
        <c:resource source="bootstrap" version="5.3.5" name="bootstrap-min.css"/>
        <c:resource source="jquery-core" version="3.4.1" name="jquery-min.js"/>
        <link rel="STYLESHEET" type="text/css" href="../Styles/console.css"/>
        <script language="JavaScript" type="module" src="../Scripts/console-main.js"></script>
    </head>
    <body>
        <div id="cp-root">
            <div id="nav"><c:fragment name="console/navbar"/></div>
            <div id="body"><c:fragment name="${frag}"/></div>     <!-- swappable content area -->
            <c:fragment name="cloudpiston/ui/modalShell"/>         <!-- platform modal shell -->
            <c:debug/>
        </div>
    </body>
</html>
```

A **fragment** holds the namespace on a `<c:ignore xmlns:c="contractpal">` wrapper and contains ONLY its
inner content — no `<html>/<head>/<body>`. (A plain `<div xmlns:c="contractpal">` also works, but
`c:ignore` is preferred: it emits no wrapper element.)

```html
<!-- fragments/lists/newList.html -->
<c:ignore xmlns:c="contractpal">
    <div class="...">
        <!-- inner content only -->
    </div>
</c:ignore>
```

---

## XHTML Rules — Non-Negotiable (element structure only)

Palbuilder parses page **element structure** as XHTML. Malformed markup causes hard errors.

**All void/self-closing tags must be explicitly self-closed:**

```html
<!-- Correct -->
<input type="text" name="foo" />
<img src="logo.png" alt="" />
<br />
<hr />
<col />

<!-- Wrong — will cause parse errors -->
<input type="text" name="foo">
<img src="logo.png" alt="">
```

**Scope of strictness:** this XHTML strictness applies to **elements and attributes** — tags
must be well-formed and void tags must self-close. It does **NOT** extend to the **text content of
`<script>` and `<style>`**, which the server treats as raw text (HTML5 raw-text content model). See
the next section — write CSS and JS naturally in those blocks; do not escape or CDATA-wrap them.

---

## CSS & JavaScript inside `<style>` / `<script>` — write it naturally

Empirically verified by pushing live test pages and reading the stored bytes back: `<style>` and
`<script>` bodies round-trip **byte-for-byte**, including raw `<`, `>`, and `&`. The XHTML parser
re-serializes page *structure* (e.g. `<head>` whitespace) but leaves script/style text untouched.

**Write CSS and JS exactly as you normally would.** No escaping, no CDATA, no workarounds:

```html
<style>
    .menu > .item { color: red; }                 /* raw > child combinator — fine */
    .card { color: #111; &:hover { color: #222; } } /* native nesting, raw & — fine */
</style>
<script>
    for (var i = 0; i < n; i++) { total += i; }   /* raw < — fine */
    if (x < y && y > 0) { go(); }                 /* raw <, >, && — fine */
    var html = "<div class='z'>raw</div>";        /* raw markup in a JS string — fine */
</script>
```

All of the above saved cleanly (server `success: true`) and stored verbatim.

### Anti-patterns — these BREAK content (do not do them)

- **Do NOT wrap script/style content in `<![CDATA[ … ]]>`.** The XML layer recognizes `<![CDATA[`
  as a real marked section and rewrites the boundary, swallowing your comment guard. In testing,
  `/*<![CDATA[*/ … /*]]>*/` came back as `<style><![CDATA[ */ …` — an orphaned `*/` that corrupts
  the CSS. CDATA is harmful here, not protective.
- **Do NOT entity-escape `<` `>` `&` inside script/style.** They are stored **literally** — `i &lt; n`
  comes back as the literal text `i &lt; n`, which is invalid JavaScript at runtime. Escaping only
  makes sense in element/attribute text, never in script/style bodies.

### Two caveats

1. **Avoid `${...}` template literals in inline page `<script>`.** `${}` is PalBuilder's server-side
   EL binding syntax (see *Variable Binding* below) and is resolved at **render** time — a JS template
   literal `` `total is ${total}` `` risks having `${total}` evaluated (and likely blanked) by the
   server before the browser sees it. Prefer string concatenation, or move logic to an **external
   `.js` file** (static script files bypass page EL processing). The source survives the *save*
   intact; the collision is at render.
2. **Native CSS nesting (`&`) and JS `&&` emit cosmetic validation notes.** PalBuilder's CSS linter
   reports `&:hover … not handled` / `Invalid css property` and flags `&&`. These are **non-fatal** —
   the save succeeds (`success: true`) and the content is stored unaltered. Expect the noise; it does
   not block anything or change your code. (The real save/reject signal is the `success` flag, not the
   presence of validation notes.)

---

## Variable Binding

Use EL-style `${variable}` syntax for all server-injected values:

```html
<p>${user.firstName}</p>
<img src="${settings.logoUrl}" alt="Logo" />
<div style="background-color: ${settings.colorHeader};">
```

### EL operators

Used heavily in `test=`, `c:if`, `c:when`, `selected=`. Note **`eq` compares as strings** —
a boolean column reads `${x eq 'true'}`, not `${x}`.

| Operator | Meaning | Real example |
|---|---|---|
| `eq` / `ne` | equals / not-equals (string compare) | `${r.result eq 'FAIL'}`, `${active eq 'clients'}` |
| `empty` | true if null or empty string/list | `${empty audits}` |
| `!empty` | not empty (the most common guard) | `${!empty r.remediationHint}`, `${!empty moneyPages}` |
| `!` | negation | `${!f.isInvited}` |
| `and` / `or` | boolean combine | `${a eq 'x' and b eq 'y'}` |
| `gt` / `lt` / `ge` / `le` | numeric compare | `${count gt 0}` |

```html
<c:if test="${!empty topCritical}"> ... </c:if>
<c:when test="${r.result eq 'PASS'}"> ... </c:when>
<div test="${empty progressError}"> ...still running... </div>
```

Property access is dot-notation (`${a.completedAt}`, `${r.reqId}`); delimited string-mode
lists use `.get('col0')` (see `c:list`). No ternary / arithmetic / formatter calls are
available — do display formatting in the workflow and bind the finished string.

---

## Tag Reference

Every `c:` tag has a fixed set of valid attributes. Using any attribute not in the documentation throws
a Palbuilder validation error. Check the docs before using an attribute you haven't used before.

---

### `c:a` — Navigation & Action Link

The primary tag for all server-triggered actions. Renders as an `<a>` element.

```html
<!-- Navigate to an action (optionally naming the target workflow) -->
<c:a action="getDashboard" workflow="console" class="sidebar-item ${dashboard_active}">Dashboard</c:a>

<!-- Load a fragment into a div via AJAX -->
<c:a action="editLogo" ajax-target="modalContent" class="action-link">Edit</c:a>

<!-- Pass a query string parameter -->
<c:a action="getCampaign?id=${campaign.id}">View</c:a>

<!-- Confirmation dialog before firing -->
<c:a action="deleteCampaign" confirm="Are you sure?">Delete</c:a>

<!-- Run a JS validation function first; must return true/false -->
<c:a action="saveCampaign" validate="validateCampaignForm">Save</c:a>

<!-- Conditional rendering -->
<c:a action="editItem" test="${canEdit}" show="true">Edit</c:a>
```

Navigation idiom: nav links carry `workflow=` and an active-class variable (`${dashboard_active}`,
set via `c:set` in the workflow) so the current item highlights.

**Valid attributes:** `action`, `href`, `name`, `id`, `class`, `style`, `ajax-target`, `validate`,
`confirm`, `test`, `show`, `ajax-handler`, `over-class`, `out-class`, `title`, `plainURL`, `media`,
`type`, `workflow`

**`onclick` is NOT valid on `c:a`.** For JS-only actions, use `<button onclick="fn()">` or
`<a href="#" onclick="fn(); return false;">`.

**`test`** conditionally renders any element, not just `c:` tags:

```html
<div test="${campaign.status eq 'draft'}"><p>This campaign is still a draft.</p></div>
```

---

### `c:resource` — Load a Versioned Platform Library

Loads a platform-hosted CSS/JS library into `<head>` by `source` + `version` + `name`. Used in every
page for Bootstrap, jQuery, Chart.js, icons, etc.

```html
<c:resource source="bootstrap" version="5.3.5" name="bootstrap-min.css"/>
<c:resource source="jquery-core" version="3.4.1" name="jquery-min.js"/>
<c:resource source="bootstrap-icons" name="bootstrap-icons.css" version="1.11.3"/>
<c:resource source="chartjs" name="chart.js" version="4.0.0"/>
```

Project-local CSS/JS still load with plain `<link rel="STYLESHEET" .../>` and
`<script src="../Scripts/...">` (note the `../Styles/` and `../Scripts/` relative paths).

---

### `c:debug` — Debug Panel Marker

A `<c:debug/>` placed in the page body renders the PalBuilder debug panel during development. Commonly
the last child of `cp-root`. (This is a markup tag — distinct from the back-end `c.debug()` method.)

```html
<div id="cp-root">
    ...
    <c:debug/>
</div>
```

---

### `c:upload` — File Upload Control

Renders an upload widget that handles its own submission — do not pair it with a separate Save button.

```html
<c:upload action="saveLogo" allow="image" ajax-target="feedback" />
<c:upload action="processDoc" allow="pdf" limit="300" />
<c:upload action="processUpload" allow="office" validate="preCheck" uploadText="Continue" />
```

**Valid attributes:** `action`, `ajax-handler`, `limit`, `allow` *(required)*, `style`, `class`,
`test`, `silent`, `stylesheet`, `uploadText`, `ajax-target`, `multiple`, `fragment`, `script`,
`validate`, `cancelAction`, `cancelText`, `provider`, `providerSettings`, `head`, `workflow`

**Rules:**
- `allow` is **required**; values are keywords (`image`, `pdf`, `word`, `office`, …), NOT MIME strings.
- `name` and `accept` are NOT valid attributes.
- Only one `c:upload` per page.

---

### `c:list` — Iteration

Iterates a server-provided DataList. Requires `name` + `id`. Access row columns with direct EL property
syntax `${id.columnName}` — **not** `.getValue('...')`.

```html
<!-- real: GiftHub/fragments/exchange/invite.html -->
<c:list name="friends" id="f">
    <c:div test="${!f.isInvited}" data-friendid="${f.friendId}">
        <p>${f.firstName} ${f.lastName}</p>
    </c:div>
</c:list>
```

String-based list (delimited string, not a DataList):

```html
<c:list name="tags" id="tag" list="${tagString}" row-delim="," col-delim="|">
    <span>${tag.get('col0')}</span>
</c:list>
```

**Valid attributes:** `name` *(required)*, `id` *(required)*, `odd`, `even`, `toggle`, `list`,
`query`, `row-delim` *(required if list used)*, `col-delim` *(required if list used)*

---

### `c:field` — Form Inputs (the default for bound inputs and selects)

`c:field` is the standard form element — used heavily in real pals (one enterprise pal uses it 296×).
Use it for text inputs, checkboxes, and especially `type="option"` inside a `<select>`. Written with an
explicit close tag.

```html
<!-- real: Onboarding Express -->
<select name="employmentStatus" class="form-select form-select-lg" required="true">
    <c:field type="option" value="employed" name="Employed" selected="${employmentStatus eq 'employed'}"></c:field>
    <c:field type="option" value="retired" name="Retired" selected="${employmentStatus eq 'retired'}"></c:field>
</select>

<c:field type="text" name="firstName" value="${firstName}" />
<c:field type="checkbox" name="active" value="true" checked="${active eq 'true'}" />
```

Plain `<input />` is fine for purely static, unbound markup, but reach for `c:field` first when a value
is server-bound or it's a `<select>` option.

**Valid attributes:** `name` *(required)*, `type` *(required)*, `id`, `style`, `value`, `checked`,
`class`, `selected`, `test`, `disabled`, `size`, `maxlength`, `rows`, `cols`, `onclick`, `onblur`,
`onchange`, `onfocus`, `readonly`, `placeholder`, `required`, `autocomplete`, `autofocus`, and others.

---

### `c:set` — Set a Variable

```html
<c:set name="display" value="none" />
<c:set name="activeClass" test="${active eq 'dashboard'}" true="active" false="" />
<c:a action="getDashboard" class="sidebar-item ${activeClass}">Dashboard</c:a>
```

**Valid attributes:** `name` *(required)*, `value`, `test`, `true` *(required if test used)*,
`false` *(required if test used)*, `map`

---

### `c:if` — Conditional Block

```html
<c:if test="${campaign.status eq 'draft'}">
    <c:a action="editCampaign" class="action-link">Edit</c:a>
</c:if>
```

**Valid attributes:** `test` *(required)*

---

### `c:choose` / `c:when` / `c:otherwise` — Multi-Branch Conditional

```html
<c:choose>
    <c:when test="${status eq 'sent'}"><span class="badge">Sent</span></c:when>
    <c:when test="${status eq 'draft'}"><span class="badge">Draft</span></c:when>
    <c:otherwise><span class="badge">Scheduled</span></c:otherwise>
</c:choose>
```

---

### `c:fragment` — Insert a Named Fragment

Inserts a named fragment. The server resolves it first from what the workflow set, then from the pal's
files. Names are folder paths (e.g. `console/navbar`).

```html
<c:fragment name="console/navbar" />
<c:fragment name="${frag}" />
<c:fragment name="cloudpiston/ui/modalShell" />
```

**Valid attributes:** `name` *(required)*, `test`

---

### `c:download` — File Download Link

```html
<c:download action="exportContacts">Export CSV</c:download>
<c:download action="getPdf?id=${doc.id}" value="Download PDF" />
```

**Valid attributes:** `action`, `test`, `id`, `style`, `class`, `title`, `value`, `workflow`, `validate`

---

### Other real `c:` tags

- **`c:div`** — a `<div>` that accepts `c:` attributes like `test=` directly:
  `<c:div test="${!f.isInvited}" class="col-6" data-friendid="${f.friendId}">…</c:div>`
- **`c:get`** — emit a server value in markup.
- **`c:image`** / **`c:button`** / **`c:select`** — `c:`-aware variants of `<img>` / `<button>` /
  `<select>` used when the element needs server-side processing.

---

### `c:ignore` — Suppress Wrapper Element

Wraps content without emitting any HTML element. Holds the namespace declaration on fragment files.

```html
<c:ignore xmlns:c="contractpal">
    <div>content here</div>
</c:ignore>
```

---

## Fragment Architecture

- Fragments are organized into **feature folders**, often nested:
  `auth/  common/  console/{settings,users,jobs,patches}/  lists/  friends/  exchange/  groups/  …`
  A `common/` folder holds shared fragments (`alert`, `loading`, `error`).
- The page shell has a persistent nav (`<c:fragment name="console/navbar"/>`) and a swappable content
  slot (`<c:fragment name="${frag}"/>`); navigation swaps it via `c:a`.
- Modal content loads into the platform modal shell (`cloudpiston/ui/modalShell`), included once in the
  page shell.
- **NEVER put an inline `<script>` inside a fragment.** The PalBuilder server REJECTS it at save time
  with **"Tag script is not allowed"**, and the rejection fails the whole push. A fragment's JavaScript
  belongs in an **external file under `scripts/`**, loaded once from the PAGE that hosts the fragment
  (`<script src="../Scripts/your-module.js">`); the fragment then calls those functions from `onclick`.
  This is the single most common fragment mistake — fragments are markup only, JS lives in `scripts/`.
- When a fragment's external JS runs after an AJAX load, `DOMContentLoaded` does **not** fire — run init
  code directly (or call an init function from the page), never inside a `DOMContentLoaded` wrapper.
  (Full-page reloads are the exception.)

---

## Modal Fragment Pattern

A modal fragment is a `c:ignore`-wrapped fragment with `modal-header` / `modal-body` / `modal-footer`.
Close buttons are plain `<button onclick="hideModal()">`; action buttons are `c:a`. **CSS class names
are project-specific (design skill territory) — match the pal's design system; don't assume specific
class names.**

```html
<!-- real: GiftHub/fragments/exchange/groupModal.html (classes are GiftHub's own) -->
<c:ignore xmlns:c="contractpal">
    <div class="modal-header">
        <p class="mb-0">Add to group</p>
        <button type="button" class="modal-close" onclick="hideModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
        <p>Groups will go here</p>
    </div>
    <div class="modal-footer">
        <c:a action="doShareList?listId=${activeList.listId}" ajax-target="body" class="btn btn-primary">Add</c:a>
    </div>
</c:ignore>
```

- `showModal(path)` / `hideModal()` come from the `cloudpiston/ui/v5/lib-ui` include.
- Trigger from a page/fragment with `<c:a action="..." ajax-target="modalContent">`.
- For inline server messages, a `feedback` span is one option; actions may also re-render a region
  via `ajax-target="body"`.

---

## JavaScript Naming Conventions

- **Variables:** camelCase — `campaignName`, `userId`, `isOpen`
- **Constants:** UPPER_SNAKE_CASE — `var MAX_RESULTS = 100;` (`const` is not available in workflow JS)
- **Strings:** double quotes
- **Be descriptive:** `inviterId` not `id`.
- Remove debug `console.log` once an issue is resolved.

---

## JavaScript Rules

- AJAX-loaded fragments do **not** fire `DOMContentLoaded` — run init code directly, never in a
  `DOMContentLoaded` wrapper. (Full-page reloads fire it normally.)
- Use the **module pattern** — group a fragment's functions into a named object, called from HTML via
  `onclick`:

```js
var CampaignModule = (function() {
    function openNewCampaign() { /* ... */ }
    function toggleScheduler(show) {
        document.getElementById("scheduler").classList.toggle("d-none", !show);
    }
    return { openNewCampaign: openNewCampaign, toggleScheduler: toggleScheduler };
})();
```
```html
<button onclick="CampaignModule.openNewCampaign()">New Campaign</button>
```

- Bootstrap dropdowns loaded via AJAX must be manually initialized:

```js
document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(function(el) {
    new bootstrap.Dropdown(el);
});
```

---

## Security

Do **not** use ClientPal or `fetch` to call the server unless there is genuinely no other way.
`c:` elements are server-rendered and encrypt the action and query string before HTML reaches the
browser; `fetch`/ClientPal expose everything in devtools.

---

## Platform facts (learned on live pals — trust these)

1. **New files need pal.json entries.** A file created in `pages/`, `fragments/`, `styles/`,
   `scripts/`, `images/`, or `emails/` is NOT pushed until `pal.json` has a matching entry.
   Copy an existing entry of the same type; set the `string` and `filename` fields. Push warns
   about strays — never ignore that warning.

2. **`<noscript>` wrappers are stripped; inner content is kept.** The server removes the
   `<noscript>` tag but renders everything inside it unconditionally. Never use noscript
   fallbacks — the fallback becomes live content for all users.

3. **`.webp` images are served as `text/html` (broken).** Use JPEG or PNG only.

4. **`<script>` tags are forbidden inside fragments.** The server rejects the push with
   "Tag script is not allowed." Page shells load scripts; fragments call functions via `onclick`.
   (This is already in Fragment Architecture above — treat it as a hard build error, not a lint
   warning.)

5. **`c:a` renders as a `javascript:` href.** Any JS click-interceptor on links MUST guard
   `a.protocol !== "http:" && a.protocol !== "https:"` or it silently breaks all `c:a` actions.

6. **Only these named entities are safe: `&amp;` `&lt;` `&gt;` `&quot;` `&apos;`.** Any other
   named entity (and any non-ASCII byte) triggers a server validation flag. Write arrows as
   `-&gt;`. Keep all markup ASCII.

7. **Never edit markup or CSS with regex or scripts.** Regex surgery has caused orphan `</div>`
   (server rejection) and corrupted a stylesheet twice. Read the target region, replace the
   exact block by hand.

8. **`robots.txt` and `sitemap.xml` must be served from the workflow.** Every path — including
   `/robots.txt` and `/sitemap.xml` — routes through the workflow on both test and production
   instances. The router fallback serves HTML as robots.txt (real incident: 305 parse errors in
   Lighthouse). Intercept these in the action switch and return the raw body directly; see the
   back-end skill for the code pattern.

---

## Common Mistakes

| Wrong | Correct |
|---|---|
| A new page with no `<html>/<head>/<body>` skeleton | Every page uses the full shell + `<div id="cp-root">` + `c:fragment` slots |
| Putting `<html>` skeleton in a fragment | Fragments use `<c:ignore xmlns:c="contractpal">` with inner content only |
| `${row.getValue('name')}` in a `c:list` | Direct EL: `${row.name}` |
| "Use a plain `<input>` instead of `c:field`" | `c:field` is the default for bound inputs / `<select>` options |
| `<c:a onclick="fn()">` | `<button onclick="fn()">` or `<a href="#" onclick="fn(); return false;">` |
| `<c:upload name="x" accept="image/*" />` | `<c:upload action="x" allow="image" />` |
| `<img src="x.png">` | `<img src="x.png" />` |
| `DOMContentLoaded` in an AJAX-loaded fragment | Run JS directly, no wrapper |
| Inline `<script>` inside a fragment (server: "Tag script is not allowed") | Put the JS in an external `scripts/*.js`, loaded from the page |
| Hardcoding a CDN `<script>` for Bootstrap/jQuery/Chart.js | `c:resource source=... version=... name=...` |
| CDATA-wrapping `<script>`/`<style>` (`<![CDATA[ … ]]>`) | Write raw — CDATA gets mangled and corrupts the content |
| Entity-escaping `<` `>` `&` inside `<script>`/`<style>` | Write raw — escapes are stored literally and break JS |
| `` `…${x}…` `` template literal in inline page `<script>` | String concat, or move JS to an external `.js` file (`${}` collides with server EL) |
| Using any undocumented tag attribute | Check the docs first |

---

*Tag reference: https://secure.cloudpiston.com/cpal/cp-api/console-tags/summary.html*
