"use strict";
// Lint dataset DEFINITION files (datasets/<name>.json) for the mistakes that make SyncDataSet.do
// reject the save — chiefly an invalid `fieldType`. The server error is cryptic ("Dataset X has
// invalid type for field Y"); this catches it OFFLINE with the valid types spelled out.
//
// SEVERITY = warn, never error. KNOWN_TYPES is the authoritative DatasetField type set, taken
// verbatim from the platform source (com/contractpal/pal/DatasetField.java — the TYPE_* string
// constants, "do not change ... serialized in all pals"). It is exhaustive. Warning, not blocking,
// keeps the server as the semantic authority while guiding dumb models toward the right strings;
// a bad type that slips through still surfaces a clear save-rejection message.

// Valid field types — exact strings from DatasetField.java's TYPE_* constants.
const KNOWN_TYPES = new Set([
    "String", "Text", "Medium text", "Char",
    "Date", "DateOnly", "DateTimeMS",
    "Boolean",
    "Tiny integer", "Small integer", "Medium integer", "Number", "Big Number",
    "Tiny unsigned integer", "Small unsigned integer", "Medium unsigned integer", "Unsigned integer", "Big unsigned integer",
    "Decimal",
    "Encrypted",
    "File", "File Encrypted", "Remote File", "Remote File Encrypted",
    "Primary key", "Pal id", "Transaction id", "Profile id",
    "Pal id auto populate", "Transaction id auto populate", "Profile id auto populate"
]);

// Common WRONG guesses → the real PalBuilder type to suggest. Lowercased, whitespace-stripped keys.
// "Number" is the general integer (=TYPE_INT); "Big Number" the 64-bit (=TYPE_BIGINT); "Decimal"
// the fixed/floating type — NOT the unsigned variants (those drop sign and fractional digits).
const SUGGESTIONS = {
    "integer": "Number", "int": "Number", "number": "Number", "numeric": "Number",
    "long": "Big Number", "bigint": "Big Number",
    "float": "Decimal", "double": "Decimal", "decimal": "Decimal",
    "bool": "Boolean", "boolean": "Boolean",
    "text": "String", "string": "String", "varchar": "String", "longtext": "Text", "mediumtext": "Medium text", "char": "Char",
    "datetime": "Date", "timestamp": "Date", "time": "Date", "date": "Date",
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
