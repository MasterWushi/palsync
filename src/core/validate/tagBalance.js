"use strict";
// Lint an HTML/XHTML file for unbalanced container tags — the failure mode that caused the
// esign "orphan div" incident: the server rejects with 'The element type "section" must be
// terminated by the matching end-tag "</section>"' while offline validate reported 0 problems.
//
// Strategy: a single regex token scan over the source, skipping raw-text regions
// (<script>…</script>, <style>…</style>) and HTML comments (<!-- … -->). Maintains a depth
// stack per container tag. Reports:
//   ERROR — stray close tag with no matching open.
//   ERROR — unclosed open tag at EOF.
//
// c: namespaced tags are intentionally skipped (they have their own structural checks and
// their open/close rules differ from HTML container semantics).
//
// Self-closed tags (<div />) are treated as balanced — no push onto the stack.

// HTML container tags that must be explicitly closed.
const CONTAINERS = new Set([
    "div", "section", "main", "header", "footer", "nav", "aside", "article",
    "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "td", "th",
    "form", "select", "option", "a", "p", "span",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "details", "summary", "label", "button", "figure", "figcaption",
    "colgroup", "caption", "fieldset", "legend", "textarea", "optgroup",
    "dialog", "template", "slot",
]);

// Precompute newline offsets for O(log n) line lookup.
function lineIndexer(src) {
    const nl = [];
    for (let i = 0; i < src.length; i++) if (src[i] === "\n") nl.push(i);
    return (pos) => {
        let lo = 0, hi = nl.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (nl[mid] < pos) lo = mid + 1; else hi = mid; }
        return lo + 1;
    };
}

// TOKEN_RE matches, in order:
//   (A) HTML comments
//   (B) raw-text open tags: <script …> or <style …>  (NOT self-closed)
//   (C) close tags: </tagname>
//   (D) open/self-closed tags: <tagname …> or <tagname … />
// Groups: [1]=comment body, [2]=raw-text tag name, [3]=close tag name,
//         [4]=open tag name, [5]="/" if self-closed
const TOKEN_RE = /(<!--[\s\S]*?-->)|<(script|style)(\s[^>]*)?>|<\/([A-Za-z][A-Za-z0-9_-]*)\s*>|<([A-Za-z][A-Za-z0-9_-]*)(\s[^>]*)?(\/?)>/gi;

function lintTagBalance(rel, src) {
    const findings = [];
    const lineAt = lineIndexer(src);

    // Stack entries: { tag (lowercase), pos }
    const stack = [];

    // skipTo: position past the end of a raw-text region.
    let skipTo = -1;

    let m;
    TOKEN_RE.lastIndex = 0;

    while ((m = TOKEN_RE.exec(src)) !== null) {
        const matchStart = m.index;

        // Inside a raw-text region — skip all tokens until past its end.
        if (skipTo > matchStart) continue;

        // (A) HTML comment — skip entirely.
        if (m[1] !== undefined) continue;

        // (B) raw-text open tag (<script> or <style>).
        if (m[2] !== undefined) {
            const rawTagName = m[2].toLowerCase();
            const closePat = new RegExp("</" + rawTagName + "\\s*>", "i");
            const closeMatch = closePat.exec(src.slice(m.index + m[0].length));
            skipTo = closeMatch
                ? m.index + m[0].length + closeMatch.index + closeMatch[0].length
                : src.length;
            continue;
        }

        // (C) close tag.
        if (m[4] !== undefined) {
            const tag = m[4].toLowerCase();
            if (tag.indexOf(":") !== -1) continue; // skip c: etc.
            if (!CONTAINERS.has(tag)) continue;     // not a tracked container

            // Find the most recent matching open on the stack.
            let found = -1;
            for (let j = stack.length - 1; j >= 0; j--) {
                if (stack[j].tag === tag) { found = j; break; }
            }
            if (found === -1) {
                // Stray close tag — no matching open.
                findings.push({
                    file: rel, line: lineAt(matchStart), column: 0,
                    severity: "error", rule: "strayCloseTag",
                    message: "Stray closing tag </" + m[4] + "> at line " + lineAt(matchStart) +
                        " has no matching opening tag. " +
                        "Fix: remove this stray closing tag or add the missing <" + m[4] + "> opening tag " +
                        "above it. PalBuilder's XHTML parser will reject the file with a 'must be terminated' error.",
                });
            } else {
                // Anything ABOVE `found` is an unclosed tag that this close jumps over — the
                // XHTML parser rejects exactly this shape ('must be terminated by the matching
                // end-tag'). Report each skipped tag, then pop through `found`.
                for (let j = stack.length - 1; j > found; j--) {
                    findings.push({
                        file: rel, line: lineAt(stack[j].pos), column: 0,
                        severity: "error", rule: "unclosedTag",
                        message: "<" + stack[j].tag + "> opened at line " + lineAt(stack[j].pos) +
                            " is never closed — </" + tag + "> at line " + lineAt(matchStart) +
                            " arrives while it is still open. Fix: add the missing </" + stack[j].tag + "> " +
                            "before line " + lineAt(matchStart) + ". PalBuilder's XHTML parser rejects this " +
                            "with a 'must be terminated by the matching end-tag' error.",
                    });
                }
                stack.splice(found);
            }
            continue;
        }

        // (D) open (or self-closed) tag.
        if (m[5] !== undefined) {
            const tag = m[5].toLowerCase();
            if (tag.indexOf(":") !== -1) continue; // skip c: etc.
            if (!CONTAINERS.has(tag)) continue;

            const selfClosed = m[7] === "/";
            if (!selfClosed) {
                stack.push({ tag, pos: matchStart });
            }
            continue;
        }
    }

    // Any tags still on the stack were never closed.
    for (const entry of stack) {
        findings.push({
            file: rel, line: lineAt(entry.pos), column: 0,
            severity: "error", rule: "unclosedTag",
            message: "Opening tag <" + entry.tag + "> at line " + lineAt(entry.pos) +
                " is never closed. " +
                "Fix: add </" + entry.tag + "> in the correct position. " +
                "PalBuilder's XHTML parser will reject the file with a 'must be terminated' error.",
        });
    }

    findings.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
    return findings;
}

module.exports = { lintTagBalance };
