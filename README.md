# Travel Israel with Isaac

Static multilingual website for Isacco Charig, a licensed tour guide in Israel.
Italian lives at `/it/`, English at `/en/`. The root `/` selects a language or
shows language links when JavaScript is disabled.

## Develop and preview

Requires Node.js 22 or later. There are no package dependencies to install.

```sh
npm run build
npm run preview
```

Open http://127.0.0.1:4173/ (or `/it/` and `/en/`). Rebuild and reload after edits.
Opening the repository’s `index.html` directly shows preview instructions; `file://`
URLs do not run the build or serve root-relative assets. Use the HTTP preview above.

Set `PORT` to use a different local preview port. `npm test` builds the site and
checks language routing, translation completeness, generated SEO and assets,
WhatsApp message formatting, and adding another locale.

## Edit content and design

- `src/home.html` is the shared page template. Chapter IDs stay the same in every language.
- `src/locales/it.json` and `src/locales/en.json` contain copy, accessible labels,
  WhatsApp enquiries, and interactive letter messages. Keys are shared across locales.
- `src/site.json` defines the production origin, supported languages, their labels
  and paths, and the fallback language. The canonical origin defaults to
  `https://viaggioinisraele.com`; change this if the production hostname changes.
- `src/entry.html` is the published root language chooser template. The repository’s
  `index.html` only provides local preview instructions and is not published.
- `css/home.css`, `js/`, and `images/` are shared assets. Keep asset URLs root-relative.

Copy placeholders such as `{{copy.site_title}}` are HTML-escaped at build time.
`{{wa.general_enquiry}}` renders an encoded WhatsApp URL from the corresponding
copy entry. Keep markup in the template rather than translation strings. Letter
messages use named parameters such as `{name}` and `{period}`; preserve the
parameter names in translations. Builds fail for missing or unknown translation
keys, mismatched message parameters, empty required translations, and unresolved
template placeholders.

The English copy uses “Isaac” and advertises English-speaking tours. Italian uses
“Isacco”. The original video and all contact details are retained.

## Language behaviour

Only `/` and `/index.html` select a language automatically. Selection checks an
explicit choice saved as `isacco.language` in local storage, then the browser’s
ordered language preferences (including regional variants such as `en-GB` and
`it-CH`), then falls back to English. Redirects use `location.replace` and retain
query strings and chapter anchors from old root links.

Direct language URLs always win. The footer language switcher saves an explicit choice
and carries the current query string and chapter anchor into the selected page.
If storage is blocked, navigation still works, but the choice cannot be remembered.
Without JavaScript, the root shows ordinary language links and language pages
contain complete content and usable contact links. As before, filters and the
personalised letter controls require JavaScript; a general WhatsApp link remains.

## Add a language

1. Copy a locale JSON file to `src/locales/<code>.json`, keeping all keys, and
   translate every value, including metadata, accessibility labels, and messages.
2. Add `{ "code": "fr", "name": "Français", "path": "/fr/" }` to the `languages`
   array in `src/site.json`. Each code and path must be unique.
3. Run `npm test` and review the new page at desktop and mobile sizes.

The build adds the new page, chooser and switcher links, reciprocal `hreflang`
annotations, and sitemap entries automatically. Adding a language with a different
writing direction may also need typography and layout work.

## Netlify deployment

The GitHub-connected Netlify site reads `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `dist`
- Node.js: `22`

Generated files stay out of Git. Netlify deploy previews use the same configuration;
SEO URLs intentionally point at the configured production origin.

Before publishing, review `/`, `/it/`, `/en/`, `/sitemap.xml`, and `/robots.txt` in
a Netlify deploy preview. Check switching with a chapter anchor, translated
WhatsApp enquiries, and mobile layout. No server redirects, edge functions,
geolocation, or translation service are required.

## SEO and answer-engine maintenance

Search titles use `copy.site_title`; descriptions use `copy.site_description` in
each locale. These also supply Open Graph and Twitter cards. The language chooser
keeps its bilingual metadata. Social image URLs are absolute and use the dedicated
1200×630 `/images/social-card.jpg`, shared across languages, with translated
`copy.social_image_alt` descriptions. Its source and generation prompt are recorded
in `docs/social-card.md`. Update its measured dimensions in `scripts/seo.mjs` if
that asset changes. The page hero remains the original Jerusalem photograph.
Image width/height attributes describe
the source files; CSS continues to control their displayed size and cropping.

`scripts/seo.mjs` builds a JSON-LD graph for each language page: WebSite, WebPage,
Person, Service, and the existing FAQ section as FAQPage. A shared guide ID links
Isaac and Isacco across languages. Identity, biography, service description, and
contact details come from existing site content. Keep phone/email values in the
schema aligned with the template and WhatsApp links when changing contacts.
The five FAQ translation-key pairs drive both the accordion and structured data;
edit the locale strings to update both, or the shared mapping to add/remove a pair.
FAQ markup describes the content and does not guarantee a search rich result.

Do not add unverified qualifications, social profiles, prices, ratings, or dates
to structured data. New locales receive metadata and schema automatically from
their translations. The generated HTML contains all copy, FAQs, and JSON-LD
without requiring JavaScript. Existing canonical URLs, reciprocal hreflang,
sitemap entries, and permissive robots rules remain the indexing foundation;
there are no special AI files or separate training/search crawler policies.

Before deployment, run `npm test`, inspect both language pages at desktop/mobile
sizes, and paste their generated HTML into [Schema.org Validator](https://validator.schema.org/).
The tests check metadata, linked entities, FAQ agreement, JSON escaping, media
attributes, contact links, and new-locale generation. External validation is a
separate check; valid schema does not guarantee indexing or AI citations.

After deployment:

1. Check `/`, `/it/`, `/en/`, shared images, `/robots.txt`, and `/sitemap.xml`
   return successful HTTP responses on the production hostname.
2. Confirm canonical/social URLs and hreflang resolve to production pages, and
   that hosting/CDN rules allow search crawlers to retrieve HTML and assets.
3. Submit the sitemap in Google Search Console and inspect both language URLs
   using its live URL test. Check indexing and rendered content after recrawling.
4. Monitor Search Console search performance and any existing AI referral data.
   Assess loading performance with PageSpeed Insights once deployed; local
   loading-attribute checks are not a field Core Web Vitals measurement.

References: [Sanity SEO/AEO skill](https://github.com/sanity-io/agent-toolkit/blob/main/skills/seo-aeo-best-practices/SKILL.md),
[Google's AI search guidance](https://developers.google.com/search/docs/appearance/ai-features),
and [Schema.org](https://schema.org/). Current primary documentation takes precedence
over generic skill recommendations. Google requires no special AI markup or text
file; clearer answer coverage and stronger authority would require content work.

## Legacy links and responsive photos

`netlify.toml` permanently redirects the retired Italian pages and English contact
page to the matching language and chapter. Both `.html` and extensionless forms
are covered. `/itinerari.html` goes to `/it/` without a destination fragment so
browsers retain old stop bookmarks (for example `#mar-morto`). The eight original
stop IDs remain on the corresponding itinerary articles. An itinerary URL without
a bookmark opens the Italian homepage. Root language selection remains unchanged.
These hosting redirects need a Netlify preview to verify HTTP responses; the plain
local preview server only serves files.

Photos have committed variants in `images/responsive/`. `srcset` and `sizes` let
browsers select a smaller file for the viewport and pixel density, while original
photos remain available. After replacing a source photo or its dimensions, run
`node scripts/optimise-images.mjs` (requires `cwebp`, available via `brew install webp`)
and update its `srcset` if the source width changed. Ordinary builds require no
image tooling. Inspect the regenerated photos before committing them.
