"use strict";
// Lint dataset DEFINITION files (datasets/<name>.json) for the mistakes that make SyncDataSet.do
// reject the save — chiefly an invalid `fieldType`. The server error is cryptic ("Dataset X has
// invalid type for field Y"); this catches it OFFLINE with the valid types spelled out.
//
// SEVERITY = warn, never error. The KNOWN_TYPES set is confirmed from live pals but is NOT proven
// exhaustive (PalBuilder has graded integer types — Tiny/Small/Medium unsigned integer — so a
// larger/signed variant we haven't sampled may be valid). Warning, not blocking, means we guide
// dumb models toward the right type without ever falsely blocking a valid one. The server stays
// the authority, and a bad type that slips through now surfaces a clear save-rejection message.

// Confirmed-valid field types, sampled across many live pals (ISR, MealPlanner, Keystone, …).
const KNOWN_TYPES = new Set([
    "Primary key",
    "String", "Char",
    "Boolean",
    "Date", "DateOnly",
    "File",
    "Tiny unsigned integer", "Small unsigned integer", "Medium unsigned integer"
]);

// Common WRONG guesses → the PalBuilder type to suggest. Lowercased keys.
const SUGGESTIONS = {
    "integer": "Small unsigned integer", "int": "Small unsigned integer", "number": "Small unsigned integer",
    "numeric": "Small unsigned integer", "long": "Medium unsigned integer", "bigint": "Medium unsigned integer",
    "float": "Small unsigned integer", "double": "Small unsigned integer", "decimal": "Small unsigned integer",
    "bool": "Boolean", "boolean": "Boolean",
    "text": "String", "varchar": "String", "char": "Char",
    "datetime": "Date", "timestamp": "Date", "time": "Date",
    "pk": "Primary key", "id": "Primary key", "primarykey": "Primary key", "uuid": "Primary key"
};

function fieldsOf(ds) {
    const node = ds && ds.fields && ds.fields.DatasetField;
    if (!node) return [];
    return Array.isArray(node) ? node : [node];
}

// Lint one dataset def. rel is the display path (e.g. "datasets/players.json"). Returns findings.
function lintDatasetDef(rel, jsonText) {
    const findings = [];
    let ds;
    try { ds = JSON.parse(jsonText); }
    catch (e) {
        return [{ file: rel, line: 0, column: 0, severity: "error", rule: "datasetJsonParse",
            message: "This dataset file is not valid JSON: " + (e && e.message ? e.message : String(e)) + ". Fix the JSON so the dataset can be saved." }];
    }
    const fields = fieldsOf(ds);
    if (!fields.length) {
        findings.push({ file: rel, line: 0, column: 0, severity: "warn", rule: "datasetNoFields",
            message: "Dataset '" + (ds.name || rel) + "' has no fields (fields.DatasetField is empty). A dataset needs at least a Primary key field. " +
                "Add fields like { \"fieldName\": \"" + (ds.name || "thing") + "Id\", \"fieldType\": \"Primary key\" }." });
        return findings;
    }
    let pkCount = 0;
    for (const f of fields) {
        const type = f.fieldType;
        if (type === "Primary key") pkCount++;
        if (type !== undefined && !KNOWN_TYPES.has(type)) {
            const sug = SUGGESTIONS[String(type).toLowerCase().replace(/\s+/g, "")];
            findings.push({ file: rel, line: 0, column: 0, severity: "warn", rule: "datasetFieldType",
                message: "Dataset '" + (ds.name || rel) + "', field '" + f.fieldName + "': fieldType \"" + type + "\" is not a recognized PalBuilder type" +
                    (sug ? " — did you mean \"" + sug + "\"?" : ".") +
                    " The server will reject the sync with \"invalid type\" if it's wrong. Valid types include: " + [...KNOWN_TYPES].join(", ") + "." });
        }
    }
    if (pkCount === 0) {
        findings.push({ file: rel, line: 0, column: 0, severity: "warn", rule: "datasetNoPrimaryKey",
            message: "Dataset '" + (ds.name || rel) + "' has no \"Primary key\" field. Most PalBuilder datasets need one (named <dataset>Id). " +
                "Add a field with fieldType \"Primary key\"." });
    }
    return findings;
}

module.exports = { lintDatasetDef, KNOWN_TYPES, SUGGESTIONS };
