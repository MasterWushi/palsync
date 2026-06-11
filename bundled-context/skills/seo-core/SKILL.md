---
name: palbuilder-seo
description: "On-page SEO rules for PalBuilder WEB pals — every marketing/public page must follow these from the FIRST push, not as a retrofit. Use this skill ALONGSIDE palbuilder-frontend whenever creating or editing a web pal page (<head>, headings, images, structured data). Covers the page-head recipe (title/description/canonical/OG/twitter), the two PalBuilder-specific traps (relative og: URLs and non-ASCII in attributes), heading discipline, JSON-LD, and the verify loop with pal_seo_audit. Console pals are behind login and are NOT crawled — this skill applies to WEB pals only."
---

# PalBuilder SEO Skill (web pals)

Read this before writing any WEB pal page `<head>`. After pushing, run **`pal_seo_audit`** —
it fetches the page exactly as crawlers see it and checks every rule below. Fix every ERROR
it reports.

The substrate facts you need (verified live):

- A web pal page is served publicly at `webpals.cloudpiston.com` — it IS crawled, so SEO is real.
- Local resources load with relative paths (`../Styles/x.css`, `../Scripts/x.js`, `../Images/x.jpg`);
  the server rewrites them to `nx-ref/...` automatically. That rewriting does NOT apply to meta
  attribute values — which is why og: URLs must be written absolute by YOU (rule 2).
- `<script>` is allowed in a PAGE `<head>`/body (only FRAGMENTS reject `<script>`), so JSON-LD
  goes in the page head.

---

## The page-head recipe — copy this shape into every web page

```html
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <title>Primary Keyword &#8212; Brand</title>                     <!-- 15–60 chars -->
    <meta name="description" content="What this page offers, for whom, in plain words. 50-160 characters." />
    <link rel="canonical" href="https://YOUR-DOMAIN/page-url" />     <!-- ABSOLUTE -->

    <meta property="og:type" content="website" />
    <meta property="og:title" content="Primary Keyword &#8212; Brand" />
    <meta property="og:description" content="Same offer, said for a social card." />
    <meta property="og:url" content="https://YOUR-DOMAIN/page-url" />               <!-- ABSOLUTE -->
    <meta property="og:image" content="https://webpals.cloudpiston.com/nx-ref/Images/hero.jpg" /> <!-- ABSOLUTE -->
    <meta name="twitter:card" content="summary_large_image" />

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Brand Name",
      "url": "https://YOUR-DOMAIN/",
      "logo": "https://webpals.cloudpiston.com/nx-ref/Images/logo.png"
    }
    </script>

    <!-- fonts + stylesheet AFTER the meta block -->
</head>
```

All `<meta .../>` and `<link .../>` tags are void elements — **self-close them** (XHTML rule,
see palbuilder-frontend).

---

## The two PalBuilder-specific traps (both hit in real builds — do NOT repeat them)

1. **og:image and og:url MUST be absolute URLs.** A relative value (`../Images/hero.jpg`)
   saves fine and even renders — but social scrapers (Slack, LinkedIn, X, iMessage) fetch these
   from THEIR servers, where a relative URL resolves to nothing: the share card shows no image.
   Write the full URL: `https://webpals.cloudpiston.com/nx-ref/Images/hero.jpg` (note the
   `nx-ref/` prefix — that is where the server actually serves your `images/` files).
   The same applies to `canonical` and any `logo`/`image` URL inside JSON-LD.

2. **No raw non-ASCII characters inside ATTRIBUTE values.** A literal em-dash (—), curly quote,
   or arrow inside `content="…"` triggers the PalBuilder server's "non ASCII attribute" warning
   on every save. Entity-encode in attributes: write `&#8212;` for —, `&#8217;` for ’.
   Body TEXT is fine raw — this rule is for attribute values only.

---

## Heading & content discipline

- **Exactly ONE `<h1>` per page**, stating the page's primary topic — keyword first. Section
  titles are `<h2>`; never skip from `<h1>` to `<h3>`.
- The `<title>` and `<h1>` should agree (same topic, not necessarily identical words).
- Every `<img>` gets `alt="what the image shows"` — or `alt=""` if purely decorative. No
  exceptions; the audit counts them.
- Use semantic structure: `<main>`, `<section>`, `<nav>`, `<footer>` — not div soup. (The
  design skill's composition rules already produce this; keep it.)
- One page = one topic = one primary keyword. Don't stuff; write the offer plainly (the design
  skill's content-economy rules ARE good SEO — scannable, front-loaded, no filler).

## JSON-LD structured data

- Put ONE `<script type="application/ld+json">` block in the page `<head>`.
- Home page → `Organization` (name, url, logo) or `WebSite`. Product page → `Product` or
  `Service`. FAQ section → `FAQPage` with the real questions.
- Every URL inside JSON-LD is absolute (trap 1 applies here too).
- JSON-LD is real JSON — double quotes, no trailing commas, no comments.

## Per-page uniqueness

Every page gets its OWN title, description, canonical, og:title/og:description/og:url —
never copy the home page's head onto a subpage and call it done. The canonical/og:url point at
THAT page's URL.

---

## The verify loop (not optional)

1. Write the page following this skill → `pal_validate` (offline) → `pal_push`.
2. **`pal_seo_audit`** — it fetches the rendered page and checks: title/description lengths,
   canonical, the 5 og: tags + absolute og:image/og:url, twitter:card, one `<h1>`, viewport,
   JSON-LD presence, img alt coverage, and non-ASCII attribute values.
3. Fix every ERROR; review every WARNING. Re-push, re-audit until it reports
   "SEO AUDIT PASSED".

Do not declare a web page done while the audit reports errors.
