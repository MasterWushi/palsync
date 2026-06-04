"use strict";
// Drift comparison on the confirmed marker, PalInfoEx.lastModifiedDate (a sql-timestamp string
// like "2026-06-03 18:16:01.0"). The marker advances only on a real server save.
function parseTs(s) {
    if (s == null) return NaN;
    // "yyyy-MM-dd HH:mm:ss.S" -> parseable by replacing the space with T
    return Date.parse(String(s).replace(" ", "T"));
}

// True if the live server marker is strictly newer than the stored (last-pulled) marker.
function serverAdvanced(storedMarker, liveMarker) {
    const a = parseTs(storedMarker), b = parseTs(liveMarker);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false; // unknown -> don't false-positive
    return b > a;
}

module.exports = { parseTs, serverAdvanced };
