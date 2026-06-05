---
name: palbuilder-backend
description: Use this skill whenever writing back-end workflow code for a Palbuilder (CloudPiston) pal. Covers the run() function pattern, reserved global variable names, the three-layer architecture (presentation/service/data), the DataSet/DataView/DataList APIs (reading, shaping, joining, writing), naming conventions, error/validation patterns, and ConsoleController usage. Trigger when writing workflow .js files, action handlers, payload setup, AJAX responses, dataset queries, or any server-side Palbuilder logic. Examples are taken from real production pals.
---

# Back-End Palbuilder Workflow Coding Skill

Read this file before writing any Palbuilder workflow file.

Console API docs: https://secure.cloudpiston.com/cpal/cp-api/console/index.html
Web API docs: https://secure.cloudpiston.com/cpal/cp-api/web/index.html

---

## What a Workflow Is

A workflow is a server-side JavaScript file that runs on every request to a Pal. It receives a
controller, reads the incoming action, executes business logic, and returns a response — a full page or
an AJAX fragment. This skill covers **Console** (authenticated) and **Web** (open internet) workflows.

---

## Includes

Libraries are included at the top of the file with `@include`. Common platform libraries:

```js
//@include("cloudpiston/ui/v5/lib-ui");   // showModal(), hideModal(), UI helpers
//@include("cloudpiston/ui/lib-paging");
//@include("cloudpiston/ui/lib-job");
//@include("data/lists");                  // this pal's data layer
//@include("lib/console/blogs");           // this pal's service layer
```

`showModal()` / `hideModal()` come from `cloudpiston/ui/v5/lib-ui`. Include paths vary by project —
confirm what a project's includes expose before calling helpers not defined in the file.

---

## Global Variables

Declare the shared objects you need at the top of the file, before `run()`. The following names are
**reserved** — use them only for the values described, never for anything else:

| Variable | Value |
|---|---|
| `c` | `controller` |
| `pal` | `c.getPal()` — this pal. Any other pal reference uses that pal's name. |
| `tx` | Transaction |
| `request` | `c.getRequest()` |
| `data` | `request.getData()` |
| `page` | `c.getPage("")` — the page to be returned |
| `ajax` | `c.createAjaxResponse()` — the ajax response to be returned |
| `resp` | Any response other than a page or ajax |
| `formatter` | `c.getFormatter()` |
| `validator` | `c.getValidator()` |
| `cm` | `pal.getCacheManager()` |
| `dateUtil` | `c.getDateUtil()` |
| `payload` | `c.createPayload()` — main payload attached to the final response |
| `action` | `c.getAction()` (optional — see run()) |

**Declare only what you actually use.** Real workflows commonly declare just
`c, page, payload, pal, request` (and `ajax` when needed).

---

## The run() Function

Every workflow has a single `run(controller)` entry point:

1. Define the globals you need
2. Common setup
3. Action switch
4. Prepare and return a response

```js
function run(controller) {
    c       = controller;
    page    = c.getPage("console");
    payload = c.createPayload();
    pal     = c.getPal();
    request = c.getRequest();

    // 3. Action switch
    switch (c.getAction()) {
        case "getTxn":
            getTxn();
            break;
        case "getAddAttachment":
            showModal("console/modal/addAttachment");
            payload.set("txnId", request.get("txnId"));
            break;
        case "downloadAttachment":
            return downloadAttachment();          // return straight from the switch
        case "saveDecision":
            saveDecision();
            break;
        default:
            break;
    }

    // 4. Return response
    if (request.isAjax()) {
        if (ajax == null) {
            ajax = frag ? c.createAjaxResponse(pal.getAjaxFragment(frag), true)
                        : c.createAjaxResponse("ignore", false);
        }
        ajax.addPayload(payload);
        return ajax;
    }
    if (frag) { payload.set("main", frag); }
    page.addPayload(payload);
    return page;
}
```

**Key rules (as real pals actually do it):**
- `switch (c.getAction())` is the common form. Storing `action = c.getAction()` and using
  `switch (action)` is equally valid — both appear in real code. Don't force one.
- Each case routes to a **thin handler**. It's normal for a case to do a little inline — open a modal
  and seed its payload (`showModal(...)` + `payload.set(...)`), or `return someDownload()`. Keep it thin;
  push real logic into a handler function.
- The unknown-action fallback is `c.createAjaxResponse("ignore", false)`, never an error message.
- Read submitted values with **either** `request.get("field")` **or** the `data` global
  (`data = request.getData(); data.get("field")`). Both are valid and both appear in real pals — pick one
  and be consistent within a file.

---

## Three-Layer Architecture

As a pal grows, split code into three layers; each calls only the layer below. Small pals (a handful of
actions) legitimately stay flat in one file — don't over-split.

### Presentation Layer
The `run()` file(s). Routes actions, prepares responses (page, ajax, payload). Calls the service layer.

### Service Layer
Business logic — number crunching, external requests, data shaping. Lives in `lib/` files included via
`@include("lib/...")`, grouped by feature (`lib/dashboard`, `lib/console/blogs`).

### Data Layer
All dataset/dataview reads and writes. Lives in `data/` files included via `@include("data/...")`
(`data/lists`, `data/exchanges`). Library/data functions shared across workflows take everything as
arguments — no hidden dependence on globals.

---

## DataSets, DataViews & DataLists

Read from a **DataSet** (`pal.getDataSet`) or a **DataView** (`pal.getDataView` — the read-model for
joins/shared rows; real code uses both, datasets far more often). Build a query with a filter, then
shape the resulting **DataList** in memory.

### Reading + filtering

```js
// data/lists.js (real: GiftHub)
var listsDS = pal.getDataSet("lists");
var filter  = listsDS.createFilter();
filter.selectColumns(["listId", "name", "favorited", "userId"]);
filter.addEqual("userId", userId);
filter.sortDescending("favorited");
var myLists = listsDS.getRecords(filter).copy("lists");   // .copy(name) -> a working DataList

// findRecord for a single row
var item = pal.getDataView("listItems").createFilter();
item.selectColumns(["itemId", "name"]);
item.addEqual("itemId", id);
var record = pal.getDataView("listItems").findRecord(item);
```

**Boolean grouping** — `(friendId = X AND shareType = editor) OR (friendId = X AND favorited = true)`:

```js
var dv = pal.getDataView("sharedListView");
var g  = dv.createFilter();
g.beginGroup(); g.addEqual("friendId", userId); g.addAnd(); g.addEqual("shareType", "editor"); g.endGroup();
g.addOr();
g.beginGroup(); g.addEqual("friendId", userId); g.addAnd(); g.addEqual("favorited", "true"); g.endGroup();
var shared = dv.getRecords(g).copy("sharedLists");
```

### Shaping & joining DataLists in memory

```js
shared.renameColumn("ownerId", "userId");
myLists.addColumn("shareType");
myLists.setColumnValue("shareType", "owner");
myLists.addDataList("lists", shared);          // append/merge another DataList into this one
```

Common DataList methods: `copy(name)`, `addColumn`, `setColumnValue`, `renameColumn`, `removeColumn`,
`addDataList`. Common filter methods beyond basics: `beginGroup`/`endGroup`/`addAnd`/`addOr`,
`sortDescending`/`sortAscending`, `enablePaging`, `selectColumns`, `addEqual`.

### Writing

```js
var notes  = packet.getDataList("notes");
if (notes == null) { notes = c.createDataList("notes", ["createDate", "createdBy", "note"]); }
var insert = notes.insertRecord();
insert.setDate("createDate", new Date());
insert.set("createdBy", c.getUser().getPersonalProfile().getFullName());
insert.set("note", request.get("note"));
packet.setDataList(notes);
packet.commit();
```

For dataset writes: `insertRecord()` → `set` / `setDate` → `commit`.

---

## Naming Conventions

- **Variables:** camelCase — `inviterId`, `campaignName`, `userEmail`
- **Constants:** UPPER_SNAKE_CASE — `var DAY_IN_MINUTES = 60 * 24;` (`const` is not available)
- **Strings:** double quotes (real legacy data-layer code sometimes uses single quotes for column
  names; prefer double quotes in new code).
- **Be descriptive:** `inviterId` not `id`.
- **Datasets:** camelCase, plural. Primary key = singular dataset name + `"Id"` (dataset `users` → key
  `userId`).

---

## Functions

Single responsibility. As a function grows, ask whether it should split. Library functions shared across
workflows must take everything they need as arguments — no hidden dependence on globals.

---

## DRY

Reduce duplication with functions and loops, but don't over-apply it. Good DRY consolidates related
logic and reduces complexity. Bad DRY ("rearchitecting the platform") builds a custom abstraction over
what Palbuilder already does cleanly — if it deviates from the native API and adds complexity, it's the
wrong call. Use the platform's API directly; if it's genuinely lacking, raise it with the platform devs.

---

## Error Handling & Validation

Real legacy code is light on error handling — **do not copy that as a standard.** Write deliberate
validation and fail with a clear message, using the real platform idioms:

- **Validate required inputs** with `request.getData().getDefaultValue("field", null, true)` (the `true`
  marks it required), and **return early** when invalid:

```js
var note = request.getData().getDefaultValue("note", null, true);
if (note == null)            { getFail("Note is required", "feedback"); return; }
if (note.length > 2000)      { getFail("Note cannot exceed 2000 characters", "feedback"); return; }
```

- `getFail(message, target)` (from the UI include) renders an inline error into a feedback region; pair
  it with a `<span id="feedback">` in the modal/fragment.
- **Null-guard** before dataset operations (`if (userId == null) return null;`) rather than letting a
  null propagate into a query.
- Use `try/catch` around genuinely fallible operations (external service calls, parsing) — not as
  decoration, but where a throw is realistic.

---

## Security

Do NOT use ClientPal or `fetch` to call the server unless there is genuinely no other way. `c:` elements
are server-rendered and encrypt the action and querystring before HTML is returned. ClientPal/fetch are
fully visible in devtools.

---

## Debugging

Use `c.debug()`, `c.debugData()`, `c.debugList()` freely during development (they output to the Pal
Builder debugger panel). **Remove all debug calls before finishing** — don't leave `c.debug` in
finished code.

```js
c.debug("******* ACTION: " + c.getAction() + " *******");
c.debugData(someData);
c.debugList(someList);
```

---

## Cleanliness

- Remove commented-out code and comments that don't aid understanding.
- Delete unused files entirely and remove references to them.

---

## ConsoleController — Key Methods (`c.*`)

```js
c.getAction()                          // Current action string
c.getPage("pageName")                  // Returns a Page object
c.getRequest()                         // Returns the Request object
c.getPal()                             // Returns the RuntimePal
c.getUser()                            // Logged-in User (c.getUser().getPersonalProfile().getFullName())
c.getTransaction(txnId)                // Load a transaction packet by id
c.createPayload()                      // Creates a new Payload
c.createDataList(name, [columns])      // Create an in-memory DataList
c.createAjaxResponse(str, renderJexl)  // AJAX response from a string
c.createAjaxResponse(frag, render)     // AJAX response from a fragment
c.getEnterprise()                      // Enterprise object
c.getDateUtil()                        // Date utility (store as: dateUtil)
c.getFormatter()                       // Formatter (store as: formatter)
c.getValidator()                       // Validator (store as: validator)
c.createServiceRequest()               // HTTP client for external APIs
c.createGUID(prefix)                   // Unique ID generator
c.debug(message)                       // Debug log (dev only — remove when done)
c.switchToWorkflow(workflow, action)   // Switch to a different workflow file
```

---

## Payload

Payload passes data to the page/fragment; values become `${variable}` in templates.

```js
payload.set("frag", "dashboard");
payload.setBoolean("isAdmin", true);
payload.setInt("count", 42);

ajax.addPayload(payload);   // AJAX
page.addPayload(payload);   // Full-page
```

---

## Request

```js
request.isAjax()                               // true if request came via ajax-target
request.get("fieldName")                       // a submitted value (direct accessor)
request.getData()                              // Data object of all submitted values (store as: data)
request.getData().getDefaultValue(f, def, req) // value with default + required flag
request.getUpload()                            // uploaded file (from c:upload)
```

---

*Console API: https://secure.cloudpiston.com/cpal/cp-api/console/index.html*
*Web API: https://secure.cloudpiston.com/cpal/cp-api/web/index.html*
