---
name: palbuilder-backend
description: Use this skill whenever writing back-end workflow code for a Palbuilder (CloudPiston) pal. Covers the run() function pattern, reserved global variable names, three-layer architecture (presentation/service/data), naming conventions, DRY principles, security rules, and ConsoleController API usage. Trigger when writing workflow .js files, action handlers, payload setup, AJAX responses, dataset queries, or any server-side Palbuilder logic.
---

# Back-End Palbuilder Workflow Coding Skill

Read this file before writing any Palbuilder workflow file.

Console API docs: https://secure.cloudpiston.com/cpal/cp-api/console/index.html
Web API docs: https://secure.cloudpiston.com/cpal/cp-api/web/index.html

---

## What a Workflow Is

A workflow is a server-side JavaScript file that runs on every request to a Pal.
It receives a controller object, reads the incoming action, executes business
logic, and returns a response — either a full page or an AJAX fragment.

Workflows are scoped to a workflow engine type. This skill covers **Console**
(authenticated, browser-based) and **Web** (open internet, unauthenticated).

---

## Includes

Libraries are included at the top of the file with `@include`. These provide
helper functions available throughout the workflow. The path varies by project —
always confirm the correct include paths for the project you are working on.

```js
//@include("cloudpiston/ui/v5/lib-ui");
//@include("cloudpiston/ui/lib-job");
```

`lib-ui` provides helpers like `showModal()`. Check what your project's include
files expose before writing calls to functions not defined in the workflow file.

---

## Global Variables

Declare all shared objects at the top of the file before `run()`. This makes
them accessible to every function in the workflow without passing them as
parameters. **Only declare the globals you actually need.**

The following names are **reserved** — use them only for the values described,
never for anything else:

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
| `action` | `c.getAction()` |

```js
// Declare only what you need — this shows all reserved globals for reference
var c;
var pal;
var page;
var ajax;
var request;
var data;
var action;
var payload;
var cm;
var dateUtil;
var formatter;
var validator;
```

---

## The run() Function

Every workflow has a single `run(controller)` entry point. Follow this structure:

1. Define all global variables
2. Perform common setup
3. Define the action switch
4. Prepare and return a response

```js
function run(controller) {
    // 1. Define globals
    c         = controller;
    pal       = c.getPal();
    page      = c.getPage("console");
    request   = c.getRequest();
    data      = request.getData();
    action    = c.getAction();
    payload   = c.createPayload();

    // 2. Common setup (payload values shared across all actions, etc.)
    payload.setBoolean("isTestMode", pal.isTestMode());

    // 3. Action switch — each case calls a single function, nothing more
    switch (action) {
        case "getDashboard":
            getDashboard();
            break;
        case "getContacts":
            getContacts();
            break;
        case "editLogo":
            showModal("modals/logo", null, null);
            break;
        default:
            break;
    }

    // 4. Return response
    if (request.isAjax()) {
        if (ajax == null) {
            if (frag) {
                ajax = c.createAjaxResponse(pal.getAjaxFragment(frag), true);
            } else {
                ajax = c.createAjaxResponse("ignore", false);
            }
        }
        ajax.addPayload(payload);
        return ajax;
    }
    if (frag) {
        payload.set("main", frag);
    }
    page.addPayload(payload);
    return page;
}
```

**Key rules:**
- Each `case` in the switch calls exactly one function — keep the switch minimal.
- The unknown action fallback is `c.createAjaxResponse("ignore", false)`, not an
  error message.
- `action` is stored as a global so you use `switch (action)` not
  `switch (c.getAction())`.

---

## Three-Layer Architecture

As a pal grows, split code into three layers. Each layer has a single
responsibility and calls only the layer below it.

### Presentation Layer
The entry and exit point to/from the workflow. Lives in the main workflow file(s)
that contain `run()`. Responsibilities: handle requests, route actions, prepare
responses (page, ajax, payload, errors). Calls the service layer when it needs
data or business logic.

### Service Layer
Handles business logic — number crunching, external service requests, data
manipulation. Lives in `lib/` files. Each file groups related functionality
(e.g. `lib/dashboard.js`, `lib/campaigns.js`).

### Data Layer
Manages all interactions with datasets and dataviews — inserts, updates,
deletes, reads. Lives in `data.js` (or split into `data/users.js`,
`data/orders.js`, etc. if the file grows large).

### Example

**main.js** (presentation layer)
```js
function getDashboard() {
    try {
        var dashboardInfo = prepareDashboard(data.get("userId")); // calls service
    } catch(e) {
        return prepareErrorResponse(e);
    }
    frag = "dashboard";
}
```

**lib/dashboard.js** (service layer)
```js
function prepareDashboard(userId) {
    var dashboardPayload = c.createPayload();
    if (userId == null) throw new Error("no userId");
    var userData = fetchUserData(userId);       // calls data layer
    var orderHistory = fetchOrderHistory(userId, 25);
    dashboardPayload.addData(userData);
    dashboardPayload.addDataList(orderHistory);
    return dashboardPayload;
}
```

**data.js** (data layer)
```js
function fetchUserData(userId) {
    if (userId == null) return null;
    var usersDS = pal.getDataSet("users");
    var filter = usersDS.createFilter();
    filter.addEqual("userId", userId);
    filter.selectColumns(["userId", "firstName", "lastName"]);
    return usersDS.findRecord(filter);
}

function fetchOrderHistory(userId, pageSize) {
    var ordersDS = pal.getDataSet("orders");
    var filter = ordersDS.createFilter();
    filter.enablePaging(pageSize);
    filter.addEqual("userId", userId);
    return ordersDS.getRecords(filter);
}
```

---

## Naming Conventions

- **Variables:** camelCase — `inviterId`, `campaignName`, `userEmail`
- **Constants:** UPPER_SNAKE_CASE — `var DAY_IN_MINUTES = 60 * 24;`
  (`const` is not available in workflow JS, so this signals immutability)
- **Strings:** Always use double quotes, not single quotes
- **Be descriptive:** Use `inviterId` not `id`. Avoid single-character variables
  and abbreviations unless the meaning is immediately obvious.
- **Datasets:** camelCase names, always plural. Primary key =
  singular dataset name + `"Id"`. Example: dataset `users`, primary key `userId`.

---

## Functions

Functions should have a **single responsibility**. As a function grows, ask:
- Does it still have one responsibility?
- Is it too complex?
- Would it be clearer as multiple smaller functions?

**Library functions** should have no hidden dependencies on global variables.
If the function will be shared across workflows, pass everything it needs as
arguments — don't assume globals are defined.

---

## DRY (Don't Repeat Yourself)

Reduce duplicated code with functions and loops, but don't over-apply it.
A good DRY refactor: reduces total code, consolidates related logic in one place,
scales well, and reduces complexity.

A bad DRY refactor (anti-pattern: "rearchitecting the platform"): creates a
custom abstraction over what the platform already provides cleanly. If a pattern
deviates from the standard Palbuilder API, requires more code to use, and
increases complexity — it's the wrong call. Use the platform's natural API
directly; if the API is lacking, raise it with the platform developers rather
than working around it.

---

## Security

Do NOT use ClientPal or `fetch` to make requests to the server unless there is
absolutely no other way. `c:<TAG>` elements are server-side rendered and encrypt
the action and querystring before HTML is returned — nothing is exposed to the
client. ClientPal/fetch requests are fully visible in browser devtools, so any
sensitive values you pass become public.

---

## Debugging

Use `c.debug()`, `c.debugData()`, `c.debugList()` freely during development.
They output to the Pal Builder debugger panel and are ignored in deployed pals.

```js
c.debug("******* ACTION: " + action + " *******");
c.debugData(someData);
c.debugList(someList);
```

**Once the issue is resolved, remove all debug statements.** Do not leave
`c.debug` calls in finished code.

---

## Cleanliness

- Remove commented-out code. If a comment doesn't help someone understand the
  code, delete it.
- Delete unused files entirely and remove all references to them. Don't leave
  future developers guessing whether a file is in use.

---

## ConsoleController — Key Methods (`c.*`)

```js
c.getAction()                          // Current action string (store as global: action = c.getAction())
c.getPage("pageName")                  // Returns a Page object
c.getRequest()                         // Returns the Request object
c.getPal()                             // Returns the RuntimePal
c.createPayload()                      // Creates a new Payload
c.createAjaxResponse(str, renderJexl)  // AJAX response from a string
c.createAjaxResponse(frag, render)     // AJAX response from a fragment
c.getUser()                            // Logged-in User
c.getEnterprise()                      // Enterprise object
c.getConsolePacket()                   // Shared pal-level ConsolePacket
c.getDateUtil()                        // Date utility (store as: dateUtil)
c.getFormatter()                       // Formatter (store as: formatter)
c.getValidator()                       // Validator (store as: validator)
c.createServiceRequest()               // HTTP client for external APIs
c.createGUID(prefix)                   // Unique ID generator
c.debug(message)                       // Debug log (dev only — remove when done)
c.debugData(data)                      // Logs a Data object
c.debugList(list)                      // Logs a DataList (up to 100 rows)
c.switchToWorkflow(workflow, action)   // Switch to a different workflow file
```

---

## Payload

Payload passes data from workflow to the page/fragment. Values become available
as `${variable}` in templates.

```js
payload.set("frag", "dashboard");
payload.set("active", "dashboard");
payload.setBoolean("isAdmin", true);
payload.setInt("count", 42);

// Attach to response at the end of run()
ajax.addPayload(payload);   // AJAX
page.addPayload(payload);   // Full-page
```

---

## Request

```js
request.isAjax()               // true if request came via ajax-target
request.getValue("fieldName")  // Submitted form value by name
request.getData()              // Returns a Data object of all submitted values (store as: data)
request.getUpload()            // Uploaded file object (from c:upload)
```

---

*Console API: https://secure.cloudpiston.com/cpal/cp-api/console/index.html*
*Web API: https://secure.cloudpiston.com/cpal/cp-api/web/index.html*
