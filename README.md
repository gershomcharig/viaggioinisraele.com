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
