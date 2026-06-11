// {{PAL_NAME}} — web workflow (web-marketing starter skeleton).
// Pattern per the palbuilder-backend skill: one run(controller), declare only the globals you
// use, action switch with thin handlers, unknown action falls through to the home page.
// Workflow JS is the RESTRICTED engine: var only (no let/const), no object literals, no ES6.
var c, page, payload;

function run(controller)
{
    c = controller;
    payload = c.createPayload();

    switch (c.getAction()) {
        // Add page actions here as the site grows, one case per page:
        // case "getAbout":
        //     page = c.getPage("about");
        //     break;
        default:
            page = c.getPage("home");
            break;
    }

    page.addPayload(payload);
    return page;
}
