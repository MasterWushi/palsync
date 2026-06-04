"use strict";
// Ported verbatim from the PalBuilder extension's out/utils/xmlParser.js.
// No vscode dependency here — this file was already vscode-free in the extension.
const { XMLBuilder, XMLParser } = require("fast-xml-parser");

function CloudPistonXMLBuilder(prettyPrint, oneListGroup = false) {
    let options = {
        ignoreAttributes: false,
        attributeNamePrefix: "_",
        suppressEmptyNode: true,
        format: prettyPrint,
        indentBy: "  ", // indentBy only used if format=true
        oneListGroup: oneListGroup
    };
    return new XMLBuilder(options);
}

function CloudPistonXMLParser() {
    const alwaysArrayPaths = [
        "com.contractpal.pal.ProfileInfo",
        "com.contractpal.pal.GroupInfo",
        "PalInfoEx",
        "entry",
        "Folder",
        "Pal.datasets.entry.Dataset.indexes.DatasetIndex.columns.string",
        "Pal.dataviews.entry.Dataview.datasets.entry.string",
        "Pal.data.entry.Data.values.entry.string",
        "Pal.datalists.entry.DataList.cols.string",
        "Pal.datalists.entry.DataList.recs.string-array.string",
        "activationKeys"
    ];
    const options = {
        attributeNamePrefix: "_",
        ignoreAttributes: false,
        textNodeName: "_text",
        parseTagValue: true,
        isArray: (name, jpath) => (alwaysArrayPaths.indexOf(jpath) !== -1 || alwaysArrayPaths.indexOf(name) !== -1)
    };
    return new XMLParser(options);
}

module.exports = { CloudPistonXMLBuilder, CloudPistonXMLParser };
