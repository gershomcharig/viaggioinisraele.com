import { readFile, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { faqsFor, renderFaqs, socialMetadata, structuredData } from './seo.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c');
const json = async filename => JSON.parse(await readFile(filename, 'utf8'));

function flatten(value, prefix = '', result = {}) {
  for (const [key, item] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof item === 'string') result[name] = item;
    else if (item && typeof item === 'object' && !Array.isArray(item)) flatten(item, name, result);
    else throw new Error(`Translation ${name} must be a string or object`);
  }
  return result;
}

export function renderTemplate(template, values) {
  const rendered = template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Missing template value: ${key}`);
    return values[key];
  });
  if (/\{\{/.test(rendered)) throw new Error('Unresolved template placeholder');
  return rendered;
}

export async function build(root = projectRoot) {
  const config = await json(path.join(root, 'src/site.json'));
  const { origin, languages, fallbackLanguage } = config;
  if (new URL(origin).origin !== origin) throw new Error('origin must be an HTTPS origin without a trailing slash');
  if (!origin.startsWith('https://')) throw new Error('origin must use HTTPS');
  if (!languages.length || !languages.some(language => language.code === fallbackLanguage)) {
    throw new Error('A supported fallback language is required');
  }
  const codes = new Set(), paths = new Set();
  for (const { code, name, path: languagePath } of languages) {
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/.test(code) || !name ||
        !/^\/[a-zA-Z0-9-]+\/$/.test(languagePath) || codes.has(code) || paths.has(languagePath)) {
      throw new Error(`Invalid or duplicate language: ${code}`);
    }
    codes.add(code); paths.add(languagePath);
  }

  const template = await readFile(path.join(root, 'src/home.html'), 'utf8');
  const locales = await Promise.all(languages.map(({ code }) => json(path.join(root, `src/locales/${code}.json`))));
  const reference = flatten(locales[languages.findIndex(language => language.code === fallbackLanguage)]);
  for (const [index, locale] of locales.entries()) {
    const flat = flatten(locale);
    for (const key of Object.keys(reference)) {
      if (!Object.hasOwn(flat, key) || !flat[key].trim()) {
        throw new Error(`Missing translation: ${languages[index].code}.${key}`);
      }
      const tokens = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join(',');
      if (tokens(flat[key]) !== tokens(reference[key])) {
        throw new Error(`Mismatched message parameters: ${languages[index].code}.${key}`);
      }
    }
    for (const key of Object.keys(flat)) {
      if (!Object.hasOwn(reference, key)) throw new Error(`Unknown translation: ${languages[index].code}.${key}`);
    }
  }

  const alternates = languages.map(({ code, path: languagePath }) =>
    `<link rel="alternate" hreflang="${code}" href="${origin}${languagePath}" />`
  ).concat(`<link rel="alternate" hreflang="x-default" href="${origin}/" />`).join('\n        ');
  const runtime = { languages, fallbackLanguage };
  const pages = languages.map((language, index) => {
    const locale = locales[index];
    const faqs = faqsFor(locale.copy);
    const social = socialMetadata({
      title: locale.copy.site_title, description: locale.copy.site_description,
      name: locale.copy.site_name, url: `${origin}${language.path}`, origin,
      imageAlt: locale.copy.jerusalem_s_old_city,
    }, escapeHtml);
    const flat = flatten(locale);
    const values = Object.fromEntries(Object.entries(flat).map(([key, value]) => [key, escapeHtml(value)]));
    for (const [key, value] of Object.entries(locale.copy)) {
      values[`wa.${key}`] = escapeHtml(`https://wa.me/972546267521?text=${encodeURIComponent(value)}`);
    }
    Object.assign(values, {
      lang: language.code,
      seo: `<link rel="canonical" href="${origin}${language.path}" />\n        ${alternates}\n        ${social}\n        <script type="application/ld+json">${safeJson(structuredData({ origin, languages, language, copy: locale.copy, faqs }))}</script>`,
      faqs: renderFaqs(faqs, escapeHtml),
      runtime: safeJson({ ...runtime, letter: locale.letter }),
      languageSwitcher: `<nav class="language-switcher" aria-label="${escapeHtml(locale.ui.language)}">${languages.map(other =>
        `<a href="${other.path}" lang="${other.code}" hreflang="${other.code}" data-language="${other.code}"${other.code === language.code ? ' aria-current="page"' : ''}>${escapeHtml(other.name)}</a>`
      ).join('')}</nav>`,
    });
    return { language, html: renderTemplate(template, values) };
  });

  // Validate everything before replacing the previous build.
  const dist = path.join(root, 'dist');
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  for (const { language, html } of pages) {
    const directory = path.join(dist, language.path);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), html);
  }
  const chooser = await readFile(path.join(root, 'src/entry.html'), 'utf8');
  const chooserSocial = socialMetadata({
    title: 'Travel Israel with Isaac · Viaggio in Israele con Isacco',
    description: 'Explore Israel with Isaac Charig. Choose your language: English or Italiano.',
    name: 'Travel Israel with Isaac · Viaggio in Israele con Isacco',
    url: `${origin}/`, origin, imageAlt: 'Jerusalem’s Old City · Città Vecchia di Gerusalemme',
  }, escapeHtml);
  await writeFile(path.join(dist, 'index.html'), renderTemplate(chooser, {
    seo: `<link rel="canonical" href="${origin}/" />\n    ${alternates}\n    ${chooserSocial}`,
    runtime: safeJson(runtime),
    languageLinks: languages.map(language => `<a href="${language.path}" lang="${language.code}" hreflang="${language.code}" data-language="${language.code}">${escapeHtml(language.name)}</a>`).join('\n        '),
  }));
  await Promise.all(['css', 'js', 'images'].map(directory => cp(path.join(root, directory), path.join(dist, directory), { recursive: true })));
  const sitemapAlternates = languages.map(language => `<xhtml:link rel="alternate" hreflang="${language.code}" href="${origin}${language.path}"/>`)
    .concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${origin}/"/>`).join('');
  const urls = ['/', ...languages.map(language => language.path)].map(url =>
    `  <url><loc>${origin}${url}</loc>${sitemapAlternates}</url>`).join('\n');
  await writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`);
  await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
  console.log('Built language chooser and localised pages in dist/');
}
