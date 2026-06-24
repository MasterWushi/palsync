---
name: palbuilder-jobs-http
description: Use this skill whenever a Palbuilder (CloudPiston) pal needs work that outlives one request — background Jobs, server-side HTTP (crawling, probing URLs, calling external APIs), JSON parsing without object literals, DOM-less HTML scanning, file-download responses, or a browser progress UI that polls a long-running job. Trigger when writing a workflowType 11 console-system job, calling pal.getJobManager().createJob, c.createServiceRequest, c.createJsonParser, c.createBuffer, c.createDownloadResponse, the Monitor time-budget loop, or a self-polling progress fragment. Companion to palbuilder-backend; all its ES3-style workflow rules (no object literals, no let/const, no arrow functions) still apply here. Examples are verbatim from a real production pal (AuditHelm's in-PalBuilder SEO crawler).
---

# Background Jobs, HTTP & Long-Running Work — Palbuilder Skill

This skill covers the subsystem a pal uses when a task is too long for one request's
time window: a **background Job** that batches work, reschedules itself, and reports
progress to the browser. It also covers the server-side HTTP client, JSON parsing,
DOM-less HTML scanning, and file-download responses those jobs lean on.

> **Companion to `palbuilder-backend`.** Everything in that skill still holds —
> ES3-style only: no object literals `{ }`, no `let`/`const`, no arrow functions,
> double-quoted strings, `var` + `UPPER_SNAKE_CASE` for constants. This skill adds
> the job/HTTP APIs the base skill never needed.

> **Verify before trusting.** Workflow JS only truly compiles in the PalBuilder
> builder (the save/push API returns cached validation). Every snippet below is
> verbatim from a production pal, but re-confirm any API you promote to new code
> in the builder itself.

---

## 1. Background Jobs

A task too long for one request's time window runs as a **background Job**: a separate
workflow file the platform invokes on its own, that reschedules itself in batches and
removes itself when done.

### Two workflow files, two `workflowType`s (`pal.json`)

```json
{ "string": "main.js",  "Workflow": { "filename": "main.js",  "workflowType": 7  } }   // normal console hub
{ "string": "crawl.js", "Workflow": { "filename": "crawl.js", "workflowType": 11, "workflowContext": "" } }  // console-system job
```

- `workflowType: 7` — ordinary console workflow (serves pages/ajax for a logged-in user).
- `workflowType: 11` — **console-system job workflow**, invoked by the JobManager, not a
  browser request. Its entry point reads `c.getJob()` instead of `c.getAction()`.

> ⚠️ **A new workflow file is PalBuilder-only to create.** `crawl.js` cannot be made via
> `pal_push` — create it in PalBuilder first (with `workflowType: 11`), then edit on disk.

### Launching a job — `pal.getJobManager().createJob(name, workflowFile, payload)`

Console side. Seed the job with a **Payload** — the only way it receives inputs (a job has
no request / `data`):

```js
var pl = c.createPayload();
pl.set("auditId", ourAuditId);
pl.set("clientId", clientId);
pl.set("rootHost", hostOf(rootUrl));
pal.getJobManager().createJob("seoCrawl", CRAWL_WORKFLOW, pl);   // CRAWL_WORKFLOW = "crawl.js"
```

### Job entry point — `c.getJob()`

A job workflow's `run()` reads the Job, not the action. Always null-guard:

```js
function run(controller) {
    c   = controller;
    pal = c.getPal();
    var job = c.getJob();
    if (job == null) { return; }
    runCrawlChunk(job);
}
```

Read the seed payload back with `job.getPayload().get(...)`. Coerce to string with `"" +`
(values arrive boxed):

```js
var rootHost = "" + job.getPayload().get("rootHost");
var auditId  = "" + job.getPayload().get("auditId");
```

### Job lifecycle — reschedule, commit, remove

More work to do → **reschedule** to a near-future time and **commit**; the platform
re-invokes the workflow then. Fully done → **remove**. `commit()` persists the decision
(without it, the decision is lost).

```js
// more work -> run again in 2-4s (jitter avoids a thundering herd)
job.reschedule(c.getDateUtil().addSeconds(new Date(), 2 + (Math.random() * 2)));
job.commit();

// done -> delete the job
job.remove();
job.commit();
```

> `Math.random()` / `new Date()` are fine **inside workflow JS at runtime** — the
> orchestration-layer ban on them does not apply to pal code.

---

## 2. Monitor — the per-run time budget (critical gotcha)

A console-system job is **NOT** given a long backend window. Measured on a live pal, a
`workflowType: 11` job is **capped at ~10 seconds per invocation — like a browser
workflow**, not the long window a true backend system workflow gets. That cap is the whole
reason the crawler is a batch-and-reschedule loop.

```js
var monitor = c.getMonitor();
monitor.setMaxTimeout();                       // claim the full window up front
// ... one unit of work ...
if (!monitor.isTimeRemaining(7)) { break; }    // only START another unit if >=7s remain
```

**Batch-and-reschedule pattern:**

1. `monitor.setMaxTimeout()` — claim the max window.
2. Loop a batch of units. **Check the clock AFTER each unit, not before** — so a too-small
   remaining window can never leave a run with **zero** progress (which would reschedule
   forever).
3. Inside the loop, `if (!monitor.isTimeRemaining(N)) break;` where `N` ≥ one unit's
   worst-case cost (here 7s: fetch up to ~6s + parse + write), so you never start a unit
   that can't finish.
4. After the loop: work remains → `job.reschedule(...)` + `job.commit()`. Else → finish + remove.

```js
var done = 0;
while (done < CRAWL_BATCH && countCrawled() < MAX_CRAWL_PAGES) {
    var row = nextUncrawled(ds);
    if (row == null) { break; }
    try { crawlOnePage(row.getId(), job); }
    catch (e) { markCrawlError(ds, row.getId()); }   // a broken page must never kill the run
    done = done + 1;
    if (!monitor.isTimeRemaining(7)) { break; }
}
if (nextUncrawled(ds) != null && countCrawled() < MAX_CRAWL_PAGES) {
    job.reschedule(c.getDateUtil().addSeconds(new Date(), 2 + (Math.random() * 2)));
    job.commit();
    return;
}
finishCrawl(job);   // sets audit status, job.remove(), job.commit()
```

---

## 3. ServiceRequest — the server-side HTTP client

`c.createServiceRequest()` is the server-side HTTP client. Use it for crawling, probing
URLs, calling external APIs.

> **Prefer it over ClientPal / `fetch`.** Those run in the browser and expose the URL,
> headers, and any API key in devtools. ServiceRequest runs server-side.

### GET

```js
var sr = c.createServiceRequest();
sr.setMethod("GET");
sr.setRequestHeader("User-Agent", "AuditHelm/1.0 (+https://www.nimblewire.com/audithelm-bot)");
sr.setTimeout(4, 6);                       // (connectSeconds, readSeconds) — MUST fit the workflow cap
var resp = sr.submit(url, false, true);    // submit(url, followRedirectsFlag?, ?)
var status = resp.getResponseCode();       // HTTP status int (200, 404, 410, ...)
var body   = resp.readBody();              // full body as String (null-guard it)
if (body == null) { body = ""; }
```

### POST with a JSON body

```js
var sr = c.createServiceRequest();
sr.setMethod("POST");
sr.setContentType("application/json");
sr.setRequestHeader("User-Agent", "...");
sr.setRequestBody(body);                   // setRequestBody only ships for POST/PUT
return sr.submit(url, false, true);
```

Methods: `setMethod`, `setContentType`, `setRequestHeader(name, value)`,
`setRequestBody(str)`, `setTimeout(connectSecs, readSecs)`, `submit(url, ...)`,
`resp.getResponseCode()`, `resp.readBody()`.

> `setTimeout(4, 6)` is load-bearing inside a job: one slow page must not eat the ~10s
> window. Keep the read timeout below the Monitor guard (6 < 7) so a hung fetch still
> leaves time to write + reschedule.

> ⚠️ **Security anti-pattern — never hardcode API keys in workflow source.** Real pals
> have shipped a Google PSI/CrUX key inline (`CRAWL_PSI_KEY = "AIza..."`). Keys belong in
> a settings dataset / config the workflow reads at runtime, **not** in the workflow body —
> source is readable and pull-tracked.

---

## 4. JsonParser — read JSON without object literals

You can't `JSON.parse` into an object literal (objects are banned). Use
`c.createJsonParser(str)` and read by **dot-path**:

```js
var p   = c.createJsonParser(resp.readBody());
var lcp = numOrNull(p.readValue("record.metrics.largest_contentful_paint.percentiles.p75"));
var cls = numOrNull(p.readValue("record.metrics.cumulative_layout_shift.percentiles.p75"));
```

`readValue("a.b.c")` walks the path and returns the leaf (string) or null if any segment is missing.

---

## 5. Buffer — efficient string building

`c.createBuffer()` is the workflow's StringBuilder. Use it instead of `+=` in tight loops:

```js
var sb = c.createBuffer();
sb.append(x);
return sb.toString();
```

---

## 6. Records by id + typed accessors (beyond the base skill)

`palbuilder-backend` covers filter→`getRecords`/`findRecord(col,val)`→`copy`, and insert via
`insertRecord()`+`set`/`setDate`+`commit`. Job/crawl code adds:

| Call | Purpose |
|---|---|
| `ds.getRecord(id)` | Fetch one row by **primary-key id** (no filter). |
| `ds.findRecord(filterObj)` | `findRecord` also takes a **built filter object**, not just `(col, val)`. |
| `row.getId()` | The row's primary-key value. |
| `row.getInt("col")` / `row.setInt("col", n)` | Typed integer get/set. |
| `row.getValue("col")` / `row.get("col")` | Read a column (both seen; `getValue` common for status reads). |
| `ds.updateRecord(row)` | Persist edits to an existing row (the update counterpart to `insertRecord`). |
| `ds.deleteRecord("" + id)` | Delete one row by **stringified id**. |
| `ds.deleteRecords("col", value)` | Bulk-delete every row matching a column (cascade deletes). |
| `list.getRecordCount()` | Row count of a DataList. |
| `list.getRecord(i)` | Zero-indexed row access for iterating a DataList. |

Update-in-place + find-or-create dedup (queue insert):

```js
var f = ds.createFilter();
f.addEqual("url", clean);
var existing = ds.findRecord(f);
if (existing == null) {
    var r = ds.createRecord();
    r.set("url", clean);
    r.set("crawled", "false");
    r.setInt("itemCount", 1);
    ds.insertRecord(r);
} else {
    existing.setInt("itemCount", existing.getInt("itemCount") + 1);
    ds.updateRecord(existing);
}
```

---

## 7. Formatter & DateUtil helpers

```js
c.getFormatter().trim(str);                  // trim whitespace
c.getFormatter().chop(url, 1000, false);     // truncate to max length (third arg: add-ellipsis flag)
c.getDateUtil().addSeconds(new Date(), 3);   // Date + N seconds (used for job.reschedule)
```

---

## 8. Parsing HTML with no DOM

Workflow JS has **no DOM parser**. Scan raw HTML by splitting the body on `"<"`, so each
fragment starts with its tag name. Cheap, ES3-safe, enough for SEO signals:

```js
var parts = body.split("<");
for (var i = 0; i < parts.length; i++) {
    var line = parts[i];
    if (line.indexOf("/") == 0)  { continue; }   // closing tag
    if (line.indexOf(">") == -1) { continue; }   // not a real tag
    if (line.indexOf("a ") == 0)        { /* anchor: getHref(line, ...) */ }
    else if (line.indexOf("img ") == 0) { /* getAttribute("alt", line) */ }
    else if (line.indexOf("title") == 0){ /* getText(line) */ }
    else if (line.indexOf("meta ") == 0){ /* getAttribute("content", line) by keyword */ }
    // h1..h6, link[rel=canonical], html[lang], viewport, robots ...
}
```

Two reusable helpers worth writing:
- **`getAttribute(attrib, line)`** — find the attr name, then a hand-rolled quote scanner
  (`charAt` + a `Buffer`) reads the value between the first matching `"` or `'`, bounded to
  before `">"`.
- **`getText(line)`** — text after the first `">"` (for `<title>...`).

URL handling (`getHref` / `resolveRelative` / `hostOf`): drop `#frag` / `mailto:` / `tel:` /
`javascript:`, expand `//host`, `/path`, and relative `about.html` against the current URL,
keep only **same-host** links (`host == rootHost`) on the queue. Substring scans on
`body.toLowerCase()` detect analytics (`gtag(`, `googletagmanager.com`) and JSON-LD
(`application/ld+json`).

---

## 9. Download response — render a fragment to a file

`c.createDownloadResponse()` returns a rendered fragment as a downloadable file (HTML/PDF
report). **Return it straight from the switch** — it bypasses `run()`'s end-of-request
payload attach, so seed the download itself or the fragment renders empty:

```js
var download = c.createDownloadResponse();
download.addPayload(payload);                                  // seed BEFORE returning
download.setFragmentContent(pal.getAjaxFragment("report-pdf"), "seo-report.html", true);
return download;                                               // setFragmentContent(frag, filename, inlineFlag)
```

---

## 10. Progress-poll loop — showing a long job to the browser (FULL-STACK)

A background job runs detached, so the page can't just wait. Pattern: render a **progress
fragment that polls itself** every few seconds via a hidden `c:a`; each poll re-runs a
workflow action that advances a **status state machine** and re-renders the same fragment —
until done, when the action returns the finished page instead and the loop self-terminates.

> This recipe spans back-end (the workflow action + fragment) and front-end (the browser
> timer). The EL operators it uses (`empty`, `eq`, …) are documented in `palbuilder-frontend`.

### Status state machine (job ↔ console coordination)

Coordinate through a `status` column on the work row (e.g. an `audits` row) — never shared
memory. Guards against duplicate job fires and overlapping polls re-running expensive work.

- **`startCrawl`** (console): seed root crawl row, insert audit `status="crawling"`, create
  the job, show the progress fragment.
- **`crawl.js finishCrawl`** (job): only flips `"crawling"` → `"crawled"` (guarded — a stray
  duplicate fire must not reset a status the poll already advanced), records `pagesCrawled`,
  then removes itself.
- **`pollCrawl`** (console, browser-polled): one step per poll — `crawled` → set `checking`
  + repaint; `checking` → set `scoring` (guard against double-run) + `runChecks` (ends by
  setting `complete`); `complete` → show dashboard.

**Rule: flip to a guard status BEFORE the expensive step**, so a concurrent invocation sees
the new status and no-ops.

### Workflow side — re-render the SAME fragment with fresh progress vars

```js
payload.set("runningAuditId", ourAuditId);
payload.set("runningEngineId", "inpal");
payload.set("crawlClass", "done");          // CSS class per step the template reads
payload.set("checkClass", "active");
payload.set("progressStatus", "Running checks");
payload.set("progressSub", "Almost there");
frag = "audit-progress";
// when status == "complete":  getClientDashboard(); return;   (no poll link -> loop stops)
```

### Fragment side — hidden `c:a` with a fixed id

Renders only while working (inside `${empty progressError}`); when the workflow returns the
dashboard instead, the link is gone and the browser loop ends.

```html
<c:a id="pollLink"
     action="pollAudit?auditId=${runningAuditId}&amp;engineId=${runningEngineId}&amp;clientId=${clientId}"
     ajax-target="body" class="muted" style="display: none;">poll</c:a>
```

### Browser side (`scripts/app.js`) — one timer clicks the hidden link once per render

Guard with a `data-clicked` flag so each render fires exactly one request (the next render
brings a fresh, unclicked link).

```js
setInterval(tick, 4000);                       // installed once on DOMContentLoaded
function tick() {
    var link = document.getElementById("pollLink");
    if (link) {
        if (typeof hideModal === "function") { hideModal(); }
        if (!link.getAttribute("data-clicked")) {
            link.setAttribute("data-clicked", "1");
            link.click();                      // re-fires the c:a -> re-renders body -> new pollLink or dashboard
        }
        return;
    }
    // no pollLink in the DOM -> job finished
}
```

> **Why a hidden `c:a` and not `fetch`:** `c:a` is server-rendered and encrypts the
> action/querystring; `fetch` would expose it. Don't reach for `setInterval`-of-`fetch` here.

---

## Quick API index

| Need | Call |
|---|---|
| Start a background job | `pal.getJobManager().createJob(name, "file.js", payloadObj)` |
| Job entry / inputs | `c.getJob()`, `job.getPayload().get("k")` |
| Job lifecycle | `job.reschedule(date)`, `job.commit()`, `job.remove()` |
| Time budget | `c.getMonitor()`, `monitor.setMaxTimeout()`, `monitor.isTimeRemaining(secs)` |
| HTTP | `c.createServiceRequest()` → `setMethod/setContentType/setRequestHeader/setRequestBody/setTimeout(c,r)` → `submit(url,..)` → `getResponseCode()`/`readBody()` |
| Parse JSON | `c.createJsonParser(str).readValue("a.b.c")` |
| Build strings | `c.createBuffer()` → `append()` → `toString()` |
| Row by id | `ds.getRecord(id)`, `row.getId()`, `ds.updateRecord(row)`, `ds.deleteRecord(""+id)`, `ds.deleteRecords(col,val)` |
| Typed fields | `row.getInt/setInt`, `row.getValue` |
| String/date utils | `formatter.trim/chop`, `dateUtil.addSeconds(date, n)` |
| File download | `c.createDownloadResponse()` → `addPayload` → `setFragmentContent(frag, name, inline)` |
| Long-job progress UI | hidden `c:a id="pollLink" ajax-target="body"` + `setInterval(tick,4000)` clicking it |

---

*Console API: https://secure.cloudpiston.com/cpal/cp-api/console/index.html*
