---
name: palbuilder-frontend
description: "Use this skill whenever writing front-end code for a Palbuilder (CloudPiston) pal. Covers c: tag usage and valid attributes, fragment architecture, XHTML rules, modal patterns, JavaScript conventions, and security rules. Trigger when writing HTML fragments, modal fragments, navigation, c:a tags, c:upload, c:list, c:set, c:if, or any Palbuilder-specific markup."
---

# Front-End Palbuilder Coding Skill

Read this file before writing any Palbuilder HTML fragment.

API docs: https://secure.cloudpiston.com/cpal/cp-api/index.html
Tag reference: https://secure.cloudpiston.com/cpal/cp-api/console-tags/summary.html

---

## What Palbuilder Is

Palbuilder is a server-side Java/JavaScript platform. Pages are composed of
**fragments** — partial HTML files that can be loaded into a named target `<div>`
via AJAX, or delivered via a full-page reload. Both are valid — AJAX is optional.
Custom `c:` tags are processed server-side before the browser ever sees the HTML.

This skill covers the **Console** workflow (authenticated, browser-based) and
the **Web** workflow (open internet, unauthenticated) only.

---

## XHTML Rules — Non-Negotiable

Palbuilder parses pages as XHTML. Malformed markup causes hard errors.

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

---

## Variable Binding

Use EL-style `${variable}` syntax for all server-injected values:

```html
<p>${user.firstName}</p>
<img src="${settings.logoUrl}" alt="Logo" />
<div style="background-color: ${settings.colorHeader};">
```

---

## Tag Reference

Every `c:` tag has a fixed set of valid attributes documented at the URL above.
Using any attribute not in the documentation throws a Palbuilder validation error.
Always check the docs before using a tag attribute you haven't used before.

---

### `c:a` — Navigation & Action Link

The primary tag for all server-triggered actions. Renders as an `<a>` element.

```html
<!-- Navigate to a page -->
<c:a action="getDashboard" class="sidebar-item">Dashboard</c:a>

<!-- Load a fragment into a div via AJAX -->
<c:a action="editLogo" ajax-target="modalContent" class="action-link">Edit</c:a>

<!-- Pass a query string parameter -->
<c:a action="getCampaign?id=${campaign.id}">View</c:a>

<!-- Show a confirmation dialog before firing -->
<c:a action="deleteCampaign" confirm="Are you sure?">Delete</c:a>

<!-- Run a JS validation function first; function must return true/false -->
<c:a action="saveCampaign" validate="validateCampaignForm">Save</c:a>

<!-- Conditional rendering -->
<c:a action="editItem" test="${canEdit}" show="true">Edit</c:a>
```

**Valid attributes:** `action`, `href`, `name`, `id`, `class`, `style`,
`ajax-target`, `validate`, `confirm`, `test`, `show`, `ajax-handler`,
`over-class`, `out-class`, `title`, `plainURL`, `media`, `type`, `workflow`

**`onclick` is NOT a valid attribute on `c:a`.**
For JS-only actions (no server call), use a plain `<button onclick="fn()">` or
`<a href="#" onclick="fn(); return false;">` instead.

**`test`** conditionally renders the element. It works on `c:a` and also on
plain HTML elements like `<div>` and `<span>` — Palbuilder processes `test=`
on any element, not just `c:` tags:

```html
<!-- Hide the edit link unless the user is an admin -->
<c:a action="editItem" test="${isAdmin}" show="true">Edit</c:a>

<!-- Show a div only when a condition is met -->
<div test="${campaign.status eq 'draft'}">
    <p>This campaign is still a draft.</p>
</div>
```

---

### `c:upload` — File Upload Control

Renders an upload widget (an iframe from `secure.nimblewire.net`).
The widget handles its own form submission — do not pair it with a separate
Save button.

```html
<!-- Image upload that fires saveLogo action on submit -->
<c:upload action="saveLogo" allow="image" ajax-target="feedback" />

<!-- PDF upload with a size limit -->
<c:upload action="processDoc" allow="pdf" limit="300" />

<!-- Office file upload with client-side validation -->
<c:upload action="processUpload" allow="office" validate="preCheck" uploadText="Continue" />
```

**Valid attributes:** `action`, `ajax-handler`, `limit`, `allow` *(required)*,
`style`, `class`, `test`, `silent`, `stylesheet`, `uploadText`, `ajax-target`,
`multiple`, `fragment`, `script`, `validate`, `cancelAction`, `cancelText`,
`provider`, `providerSettings`, `head`, `workflow`

**Rules:**
- `allow` is **required**. Omitting it throws a validation error.
- `allow` takes keyword values: `image`, `pdf`, `word`, `office`, etc.
  Do NOT use MIME type strings like `image/*`.
- `name` is NOT a valid attribute.
- `accept` is NOT a valid attribute.
- Only one `c:upload` per page.

---

### `c:list` — Iteration

Iterates over a server-provided DataList. Requires both `name` and `id`.

```html
<c:list name="campaigns" id="campaign">
    <tr>
        <td class="td-primary">${campaign.getValue('name')}</td>
        <td>${campaign.getValue('status')}</td>
    </tr>
</c:list>
```

String-based list (when data is a delimited string, not a DataList):

```html
<c:list name="tags" id="tag" list="${tagString}" row-delim="," col-delim="|">
    <span>${tag.get('col0')}</span>
</c:list>
```

**Valid attributes:** `name` *(required)*, `id` *(required)*, `odd`, `even`,
`toggle`, `list`, `query`, `row-delim` *(required if list used)*,
`col-delim` *(required if list used)*

---

### `c:set` — Set a Variable

Sets a value into the processing stream. The variable is then available as
`${name}` in the template.

```html
<!-- Simple value -->
<c:set name="display" value="none" />

<!-- Conditional value based on a test -->
<c:set name="activeClass" test="${active eq 'dashboard'}" true="active" false="" />

<c:a action="getDashboard" class="sidebar-item ${activeClass}">Dashboard</c:a>
```

**Valid attributes:** `name` *(required)*, `value`, `test`, `true` *(required if test used)*,
`false` *(required if test used)*, `map`

---

### `c:if` — Conditional Block

Renders nested content only when `test` evaluates to true.

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
    <c:when test="${status eq 'sent'}">
        <span class="badge badge-sent">Sent</span>
    </c:when>
    <c:when test="${status eq 'draft'}">
        <span class="badge badge-draft">Draft</span>
    </c:when>
    <c:otherwise>
        <span class="badge badge-scheduled">Scheduled</span>
    </c:otherwise>
</c:choose>
```

Can be used inside both page fragments and modal fragments.

---

### `c:fragment` — Insert a Named Fragment

Inserts a named fragment into the page. The server resolves the fragment by
name first from what workflow has set, then from the pal's files.

```html
<c:fragment name="navbar" />
<c:fragment name="${frag}" />
<c:fragment name="campaign-row" test="${showRow eq 'true'}" />
```

**Valid attributes:** `name` *(required)*, `test`

---

### `c:download` — File Download Link

Triggers a file download via a server action. Renders as a link (or button if
`value=` is provided).

```html
<c:download action="exportContacts">Export CSV</c:download>
<c:download action="getPdf?id=${doc.id}" value="Download PDF" />
```

**Valid attributes:** `action`, `test`, `id`, `style`, `class`, `title`,
`value`, `workflow`, `validate`

---

### `c:field` — Form Input Fields

Used when connecting form inputs to a Palbuilder DataList. For simple modals
with plain HTML inputs, use standard `<input />` tags instead.

```html
<!-- Text input bound to a DataList value -->
<c:field type="text" name="firstName" value="${firstName}" />

<!-- Checkbox -->
<c:field type="checkbox" name="active" value="true" checked="${active eq 'true'}" />

<!-- Option inside a plain <select> -->
<select name="segment">
    <c:field type="option" name="Active Users" value="active" selected="${segment eq 'active'}" />
    <c:field type="option" name="Dormant" value="dormant" selected="${segment eq 'dormant'}" />
</select>
```

**Valid attributes:** `name` *(required)*, `type` *(required)*, `id`, `style`,
`value`, `checked`, `class`, `selected`, `test`, `disabled`, `size`,
`maxlength`, `rows`, `cols`, `onclick`, `onblur`, `onchange`, `onfocus`,
`readonly`, `placeholder`, `required`, `autocomplete`, `autofocus`, and others.

---

### `c:ignore` — Suppress Wrapper Element

Wraps content without emitting any HTML element. Used to hold the namespace
declaration on fragment files.

```html
<c:ignore xmlns:c="contractpal">
    <div>content here</div>
</c:ignore>
```

---

## Fragment Architecture

- The outer shell has a persistent sidebar (`c:fragment name="navbar"`) and a
  swappable content area (`c:fragment name="${frag}"`).
- Navigation swaps the content area via `c:a action="actionName"`.
- Modal content loads into a `modalContent` target div in the outer shell.
- When using AJAX fragment loading, `DOMContentLoaded` does not fire — run JS
  directly at the bottom of the fragment instead.

---

## Modal Fragment Pattern

Modal fragments contain only the inner content — no Bootstrap modal wrapper.
The outer shell already contains the modal structure.

```html
<c:ignore xmlns:c="contractpal">

    <div class="modal-header">
        <h5 class="modal-title">Modal Title</h5>
        <button type="button" class="btn-close btn-close-white"
                onclick="hideModal()" aria-label="Close"></button>
    </div>

    <div class="modal-body">
        <span id="feedback"></span>
        <!-- inputs here -->
    </div>

    <div class="modal-footer">
        <c:a action="saveAction" ajax-target="feedback" class="btn-primary-db">Save</c:a>
        <button type="button" class="btn-ghost-db" onclick="hideModal()">Cancel</button>
    </div>

</c:ignore>
```

- `feedback` span receives server response messages (errors, success).
- `hideModal()` is a global JS function defined in the project's main JS file.
- The trigger in the page: `<c:a action="editLogo" ajax-target="modalContent" class="action-link">Edit</c:a>`
- Use `c:a` for buttons that fire server actions.
- Use plain `<button onclick="...">` for JS-only actions (cancel, close, etc.).

---

## JavaScript Naming Conventions

These apply to all client-side JS written in Palbuilder projects:

- **Variables:** camelCase — `campaignName`, `userId`, `isOpen`
- **Constants:** UPPER_SNAKE_CASE — `var MAX_RESULTS = 100;`
  (`const` is not available in workflow JS)
- **Strings:** Always use double quotes, not single quotes
- **Be descriptive:** Avoid single-character variables and abbreviations.
  Use `inviterId` not `id`. Use Pal Builder's CTRL+Space for autocomplete on
  long variable names.
- Remove debug `console.log` statements once an issue is resolved. Don't leave
  them in finished code.

---

## JavaScript Rules

- When a fragment loads via AJAX, `DOMContentLoaded` **does not fire** — run any
  initialization code directly, never inside a `DOMContentLoaded` wrapper.
  If the page uses full-page reloads instead, `DOMContentLoaded` works normally.
- Use the **module pattern** to keep fragment JS organized and avoid polluting
  the global scope. Group all functions for a fragment into a named object:

```js
var CampaignModule = (function() {

    function openNewCampaign() {
        // open modal logic
    }

    function saveDraft() {
        // save logic
    }

    function toggleScheduler(show) {
        document.getElementById('scheduler').classList.toggle('d-none', !show);
    }

    return {
        openNewCampaign: openNewCampaign,
        saveDraft: saveDraft,
        toggleScheduler: toggleScheduler
    };

})();
```

Call module functions from HTML via `onclick`:

```html
<button onclick="CampaignModule.openNewCampaign()">New Campaign</button>
<button onclick="CampaignModule.saveDraft()">Save Draft</button>
```

- Bootstrap dropdowns must be manually initialized when loaded via AJAX:

```js
document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(function(el) {
    new bootstrap.Dropdown(el);
});
```

---

## Security

Do **not** use ClientPal or `fetch` to make requests to the server unless there
is absolutely no other way. `c:<TAG>` elements are server-side rendered and
encrypt the action and querystring before HTML reaches the browser. ClientPal
and fetch requests are fully visible in browser devtools — any sensitive values
you pass become public.

---

## Common Mistakes

| Wrong | Correct |
|---|---|
| `<c:a onclick="fn()">` | `<button onclick="fn()">` or `<a href="#" onclick="fn(); return false;">` |
| `<c:upload name="x" accept="image/*" />` | `<c:upload action="x" allow="image" />` |
| `<input type="text">` | `<input type="text" />` |
| `<img src="x.png">` | `<img src="x.png" />` |
| `DOMContentLoaded` in an AJAX-loaded fragment | Run JS directly, no wrapper |
| Flat global functions for every interaction | Use the module pattern — group by fragment |
| Anonymous event listeners | Named module functions + `onclick=` in HTML |
| Using any undocumented tag attribute | Check the docs first |

---

*Docs root: https://secure.cloudpiston.com/cpal/cp-api/index.html*
