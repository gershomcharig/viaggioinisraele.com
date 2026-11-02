import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, cp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { build, renderTemplate, escapeHtml } from '../scripts/build.mjs';
import { createPreviewServer } from '../scripts/preview.mjs';

const root = new URL('../', import.meta.url);
const read = relative => readFile(new URL(relative, root), 'utf8');
const pagePath = code => `dist${config.languages.find(language => language.code === code).path}index.html`;
const config = JSON.parse(await read('src/site.json'));
const languageScript = await read('js/language.js');
const letterScript = await read('js/letter.js');
const italian = JSON.parse(await read('src/locales/it.json'));
const english = JSON.parse(await read('src/locales/en.json'));
before(() => build());

function simulateLanguage({ pathname = '/', preferences = ['en-GB'], saved = null, blocked = false, search = '', hash = '', readyState = 'complete' } = {}) {
  const events = {}, windowEvents = {}, writes = [], redirects = [];
  const links = config.languages.map(language => ({
    dataset: { language: language.code }, href: language.path, events: {},
    addEventListener(name, handler) { this.events[name] = handler; },
  }));
  const location = { pathname, search, hash, replace: value => redirects.push(value) };
  const document = {
    readyState,
    getElementById: () => ({ textContent: JSON.stringify(config) }),
    querySelectorAll: () => links,
    addEventListener: (name, handler) => { events[name] = handler; },
  };
  const context = {
    document, location, navigator: { languages: preferences, language: preferences[0] },
    window: { addEventListener: (name, handler) => { windowEvents[name] = handler; } },
  };
  Object.defineProperty(context, 'localStorage', { get() {
    if (blocked) throw new Error('Storage denied');
    return { getItem: () => saved, setItem: (key, value) => writes.push([key, value]) };
  } });
  vm.runInNewContext(languageScript, context);
  return { redirects, links, writes, location, events, windowEvents };
}

function formatLetter(locale, values) {
  const context = {};
  vm.runInNewContext(letterScript, context);
  return context.TourLetter.build(locale.letter, values);
}

test('Italian homepage never redirects for browser preferences or a previous language choice', () => {
  for (const preferences of [['en-US'], ['it-IT'], ['fr'], []]) {
    for (const saved of ['en', 'it', 'removed', null]) {
      const page = simulateLanguage({ preferences, saved, search: '?ref=old', hash: '#cap-4' });
      assert.deepEqual(page.redirects, []);
      assert.deepEqual(page.writes, []);
    }
  }
});

test('root and language pages do not use storage or automatic language selection', () => {
  for (const pathname of ['/', '/index.html', '/en/', '/en/index.html']) {
    const page = simulateLanguage({ pathname, blocked: true });
    assert.deepEqual(page.redirects, []);
    assert.deepEqual(page.writes, []);
  }
});

test('explicit language pages never redirect, even with conflicting saved preferences', () => {
  for (const pathname of ['/', '/en/', '/index.html', '/en/index.html']) {
    assert.deepEqual(simulateLanguage({ pathname, saved: pathname.includes('it') ? 'en' : 'it' }).redirects, []);
  }
});

test('explicit switching preserves current URL context without saving preferences', () => {
  const page = simulateLanguage({ pathname: '/en/', search: '?source=test', hash: '#cap-2' });
  assert.deepEqual(page.writes, []);
  assert.equal(page.links[0].href, '/?source=test#cap-2');
  // history.pushState can update the chapter without firing hashchange.
  page.location.hash = '#cap-9';
  page.links[0].events.click();
  assert.equal(page.links[0].href, '/?source=test#cap-9');
  assert.deepEqual(page.writes, []);
});

test('switcher still navigates when storage is denied and waits for DOM readiness', () => {
  const page = simulateLanguage({ pathname: '/en/', blocked: true, readyState: 'loading', hash: '#cap-8' });
  page.events.DOMContentLoaded();
  assert.doesNotThrow(() => page.links[0].events.click());
  assert.equal(page.links[0].href, '/#cap-8');
});

test('letters support translated grammar, multiple interests, and literal user input', () => {
  const values = { name: ' Alex {period} & Sam ', size: 'as a couple', period: ' Easter 2027 ', dreams: ['places of faith', 'cities and the coast', 'history and archaeology'] };
  const letter = formatLetter(english, values);
  assert.equal(letter, 'Shalom Isaac! My name is Alex {period} & Sam and I’d like to visit Israel as a couple, around: Easter 2027. I’d especially like to discover places of faith, cities and the coast and history and archaeology. Could you send me a proposal with prices and availability? Thank you!');
  assert.equal(new URL(`https://wa.me/972546267521?text=${encodeURIComponent(letter)}`).searchParams.get('text'), letter);
  const italianLetter = formatLetter(italian, { name: 'Anna', size: 'in coppia', period: 'maggio', dreams: ['i luoghi della fede', 'le città e il mare'] });
  assert.match(italianLetter, /Mi chiamo Anna/);
  assert.match(italianLetter, /nel periodo: maggio/);
  assert.match(italianLetter, /i luoghi della fede e le città e il mare/);
});

test('letters handle empty optional fields and zero or one interest', () => {
  const values = { name: ' ', size: 'on my own', period: ' ', dreams: [] };
  assert.equal(formatLetter(english, values), 'Shalom Isaac! My name is … and I’d like to visit Israel on my own. Could you send me a proposal with prices and availability? Thank you!');
  values.dreams = ['places of faith'];
  assert.match(formatLetter(english, values), /discover places of faith\./);
});

test('generated pages have readable content, correct SEO, localised enquiries and shared assets', async () => {
  for (const language of config.languages) {
    const html = await read(`dist${language.path}index.html`);
    assert.ok(html.includes(`<html lang="${language.code}">`));
    assert.ok(html.includes(`rel="canonical" href="${config.origin}${language.path}"`));
    for (const other of config.languages) {
      assert.ok(html.includes(`hreflang="${other.code}" href="${config.origin}${other.path}"`));
      assert.ok(html.includes(`href="${other.path}" lang="${other.code}"`));
    }
    assert.ok(html.includes(`hreflang="x-default" href="${config.origin}/"`));
    assert.doesNotMatch(html, /\{\{/);
    assert.equal((html.match(/id="cap-[1-9]"/g) || []).length, 9);
    assert.equal((html.match(/data-theme=/g) || []).length, 8);
    const enquiries = [...html.matchAll(/href="(https:\/\/wa.me\/[^" ]+)"/g)].map(match => new URL(match[1].replaceAll('&amp;', '&')).searchParams.get('text'));
    assert.equal(enquiries.length, 11);
    for (const enquiry of enquiries) assert.match(enquiry, language.code === 'en' ? /I’d like to find out/ : /Vorrei informazioni/);
    for (const [, asset] of html.matchAll(/(?:src|href)="(\/(?:images|css|js)\/[^"?]+)(?:\?[^" ]*)?"/g)) {
      await access(new URL(`dist${asset}`, root));
    }
    const runtime = JSON.parse(html.match(/id="locale-data">([^<]+)<\/script>/)[1]);
    assert.equal(runtime.letter.send, (language.code === 'it' ? italian : english).letter.send);
    assert.ok(html.includes('https://www.youtube.com/embed/FYtk8JMMZRE?rel=0'));
  }
  const html = await read('dist/en/index.html');
  // The sharing artwork uses Italian branding; the English page copy uses Isaac.
  assert.doesNotMatch(html.split('<body>')[1], /Translated from Italian|Isacco|Travel in Israel with/);
  assert.match(html, /<title>\s*English-speaking Israel Tour Guide \| Isaac Charig/);
  assert.match(html, /content="Travel Israel with Isaac Charig/);
  assert.match(html, /Message on Whatsapp/);
  for (const code of ['it', 'en']) {
    const page = await read(pagePath(code));
    const header = page.match(/<header[^>]*>([\s\S]*?)<\/header>/)[1];
    const footer = page.match(/<footer[^>]*>([\s\S]*?)<\/footer>/)[1];
    assert.doesNotMatch(header, /language-switcher/);
    assert.match(footer, /language-switcher/);
    assert.doesNotMatch(page, /quote-translation/);
  }
  assert.match(html, /Are the tours in English\?/);
  assert.doesNotMatch(html, /Vorrei|Scrivimi|in italiano/);
});

test('root contains the complete Italian page without JavaScript; sitemap has only canonical pages', async () => {
  const html = await read('dist/index.html');
  for (const language of config.languages) assert.ok(html.includes(`href="${language.path}"`));
  assert.match(html, /<html lang="it">/);
  assert.match(html, /Guida turistica in Israele/);
  assert.match(html, /<section[\s\S]*id="cap-2"/);
  assert.doesNotMatch(html, /Choose your language|language-chooser/);
  await assert.rejects(access(new URL('dist/it/index.html', root)), { code: 'ENOENT' });
  const sitemap = await read('dist/sitemap.xml');
  assert.equal((sitemap.match(/<url>/g) || []).length, 2);
  for (const language of config.languages) assert.ok(sitemap.includes(`<loc>${config.origin}${language.path}</loc>`));
  assert.ok((await read('dist/robots.txt')).includes(`${config.origin}/sitemap.xml`));
});

test('template errors fail explicitly and translation output is escaped', () => {
  assert.equal(escapeHtml('<a title="A & B">'), '&lt;a title=&quot;A &amp; B&quot;&gt;');
  assert.throws(() => renderTemplate('{{copy.missing}}', {}), /Missing template value/);
  assert.throws(() => renderTemplate('{{unfinished', {}), /Unresolved template/);
});

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'isacco-i18n-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(new URL('src/', root), path.join(directory, 'src'), { recursive: true });
  for (const asset of ['css', 'js', 'images']) await mkdir(path.join(directory, asset));
  return directory;
}

test('build fails for missing translations and mismatched letter parameters', async t => {
  const directory = await fixture(t);
  const filename = path.join(directory, 'src/locales/it.json');
  const locale = structuredClone(italian);
  locale.copy.site_title = '';
  await writeFile(filename, JSON.stringify(locale));
  await assert.rejects(build(directory), /Missing translation: it.copy.site_title/);
  locale.copy.site_title = italian.copy.site_title;
  locale.letter.intro = 'Hello {wrong}';
  await writeFile(filename, JSON.stringify(locale));
  await assert.rejects(build(directory), /Mismatched message parameters/);
});

test('a new locale needs only its translation file and configuration entry', async t => {
  const directory = await fixture(t);
  const next = structuredClone(config);
  next.languages.push({ code: 'fr', name: 'Français', path: '/fr/' });
  await writeFile(path.join(directory, 'src/site.json'), JSON.stringify(next));
  // English text is sufficient to exercise wiring; production locales must be translated.
  await writeFile(path.join(directory, 'src/locales/fr.json'), JSON.stringify(english));
  await build(directory);
  const html = await readFile(path.join(directory, 'dist/fr/index.html'), 'utf8');
  assert.match(html, /<html lang="fr">/);
  assert.match(html, /Français/);
  const homepage = await readFile(path.join(directory, 'dist/index.html'), 'utf8');
  assert.match(homepage, /href="\/fr\/"/);
  assert.ok(html.includes(`hreflang="fr" href="${config.origin}/fr/"`));
  assert.ok(html.includes(`property="og:url" content="${config.origin}/fr/"`));
  const graph = schema(html);
  assert.equal(graph.find(item => item['@type'] === 'WebPage').inLanguage, 'fr');
  assert.equal(graph.find(item => item['@type'] === 'FAQPage').mainEntity.length, 5);
  assert.ok((await readFile(path.join(directory, 'dist/sitemap.xml'), 'utf8')).includes(`<loc>${config.origin}/fr/</loc>`));
});

const schema = html => JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1])['@graph'];
const unescape = value => value.replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[entity]);

test('social metadata uses localised copy and absolute canonical and image URLs', async () => {
  for (const [code, locale] of [['it', italian], ['en', english]]) {
    const html = await read(pagePath(code));
    const meta = Object.fromEntries([...html.matchAll(/<meta (?:property|name)="([^"]+)" content="([^"]*)"/g)].map(([, key, value]) => [key, unescape(value)]));
    assert.equal(meta['og:title'], locale.copy.site_title);
    assert.equal(meta['twitter:title'], locale.copy.site_title);
    assert.equal(meta['og:description'], locale.copy.site_description);
    assert.equal(meta['twitter:description'], locale.copy.site_description);
    assert.equal(meta['og:url'], `${config.origin}${config.languages.find(language => language.code === code).path}`);
    assert.equal(meta['og:image'], `${config.origin}/images/social-card-it.jpg`);
    assert.equal(meta['twitter:image'], meta['og:image']);
    assert.equal(meta['og:image:alt'], locale.copy.social_image_alt);
    assert.equal(meta['twitter:image:alt'], meta['og:image:alt']);
    assert.equal(meta['og:image:type'], 'image/jpeg');
    assert.equal(meta['og:image:width'], '1200');
    assert.equal(meta['og:image:height'], '630');
    await access(new URL('dist/images/social-card-it.jpg', root));
    assert.equal(meta['twitter:card'], 'summary_large_image');
    assert.equal((html.match(/<title>/g) || []).length, 1);
  }
  assert.ok((await read('dist/index.html')).includes(`property="og:url" content="${config.origin}/"`));
});

test('schema links localised pages and services to one guide identity and matches visible FAQs', async () => {
  const identities = [];
  for (const [code, locale] of [['it', italian], ['en', english]]) {
    const html = await read(pagePath(code));
    const graph = schema(html);
    const byType = type => graph.find(item => item['@type'] === type);
    assert.equal(graph.length, 5);
    const person = byType('Person'), page = byType('WebPage'), service = byType('Service'), faq = byType('FAQPage');
    identities.push(person['@id']);
    assert.equal(person.name, locale.copy.isacco_charig);
    assert.equal(person.description, locale.copy.intro_drop_cap + locale.copy.intro_after_drop_cap);
    assert.equal(person.telephone, '+972546267521');
    assert.equal(person.email, 'i.charig@gmail.com');
    assert.equal(page.inLanguage, code);
    assert.equal(page.name, locale.copy.site_title);
    assert.equal(page.description, locale.copy.site_description);
    assert.equal(page.mainEntity['@id'], service['@id']);
    assert.equal(page.hasPart['@id'], faq['@id']);
    assert.equal(page.isPartOf['@id'], byType('WebSite')['@id']);
    assert.equal(service.provider['@id'], person['@id']);
    const ids = new Set(graph.map(item => item['@id']));
    for (const node of graph) {
      assert.equal(new URL(node['@id']).origin, config.origin);
      assert.equal(new URL(node.url).origin, config.origin);
    }
    const checkRefs = value => {
      if (!value || typeof value !== 'object') return;
      if (value['@id']) assert.ok(ids.has(value['@id']), `Unresolved entity: ${value['@id']}`);
      Object.values(value).forEach(checkRefs);
    };
    checkRefs(graph);
    const details = [...html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)];
    assert.equal(details.length, 5);
    assert.equal(faq.mainEntity.length, 5);
    details.forEach(([, body], index) => {
      const question = unescape(body.match(/<summary[^>]*><span>([^<]+)<\/span>/)[1]);
      const answer = unescape(body.match(/<p class="faq-answer">([^<]+)<\/p>/)[1]);
      assert.equal(faq.mainEntity[index].name, question);
      assert.equal(faq.mainEntity[index].acceptedAnswer.text, answer);
    });
    assert.ok(html.includes('href="tel:+972546267521"'));
    assert.ok(html.includes('href="mailto:i.charig@gmail.com"'));
    assert.doesNotMatch(JSON.stringify(graph), /aggregateRating|priceCurrency|dateModified|sameAs|PostalAddress/);
  }
  assert.equal(identities[0], identities[1]);
});

test('media has intrinsic dimensions and appropriate loading priorities', async () => {
  const html = await read('dist/en/index.html');
  const images = [...html.matchAll(/<img\b[^>]+>/g)].map(match => match[0]);
  assert.equal(images.length, 14);
  for (const image of images) {
    assert.match(image, /width="[1-9]\d*" height="[1-9]\d*"/);
    if (image.includes('data-hero-img')) {
      assert.match(image, /width="1500" height="900"/);
      assert.match(image, /fetchpriority="high" loading="eager"/);
    } else assert.match(image, /loading="lazy"/);
  }
  assert.match(html, /<iframe\s+loading="lazy"/);
});

test('schema and FAQ rendering preserve special characters without script injection', async t => {
  const directory = await fixture(t);
  const locale = structuredClone(english);
  const special = 'Quotes " & apostrophes \' <tag> </script><script>alert(1)</script> \\ \u2028';
  locale.copy.site_title = special;
  locale.copy.how_much_does_a_tour_cost = special;
  locale.copy.it_depends_on_the_length_of_the_trip = special;
  await writeFile(path.join(directory, 'src/locales/en.json'), JSON.stringify(locale));
  await build(directory);
  const html = await readFile(path.join(directory, 'dist/en/index.html'), 'utf8');
  const graph = schema(html);
  assert.equal(graph.find(item => item['@type'] === 'WebPage').name, special);
  const question = graph.find(item => item['@type'] === 'FAQPage').mainEntity[3];
  assert.equal(question.name, special);
  assert.equal(question.acceptedAnswer.text, special);
  assert.ok(html.includes(escapeHtml(special)));
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

test('legacy page redirects point to existing chapters and preserve itinerary bookmarks', async () => {
  const redirects = [...(await read('netlify.toml')).matchAll(/\[\[redirects\]\]([\s\S]*?)(?=\n\[|$)/g)].map(([, block]) => ({
    from: block.match(/from = "([^"]+)"/)[1],
    to: block.match(/to = "([^"]+)"/)[1],
    status: Number(block.match(/status = (\d+)/)[1]),
  }));
  for (const slug of ['chi-sono', 'scopri-israele', 'itinerari', 'contatti', 'en/contact-me', 'thankyou']) {
    for (const suffix of ['', '.html']) {
      const rule = redirects.find(rule => rule.from === `/${slug}${suffix}`);
      assert.ok(rule, `Missing legacy redirect for ${slug}${suffix}`);
      assert.equal(rule.status, 301);
      const [destination, fragment] = rule.to.split('#');
      const html = await read(`dist${destination}index.html`);
      if (fragment) assert.ok(html.includes(`id="${fragment}"`));
      if (slug === 'itinerari') {
        // An explicit destination fragment would overwrite the old stop bookmark.
        assert.equal(fragment, undefined);
        for (const id of ['telaviv-haifa', 'gerusalemme-antica', 'mar-morto', 'nazaret', 'eilat-petra', 'galilea', 'gerusalemme-moderna', 'neghev']) {
          assert.ok(html.includes(`<article id="${id}"`), `Missing old stop ${id}`);
        }
      }
    }
  }
});

test('HTTP routing serves Italian at root and permanently redirects former Italian URLs', async t => {
  const server = createPreviewServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const homepage = await fetch(`${origin}/`, { headers: { 'Accept-Language': 'en-US' }, redirect: 'manual' });
  assert.equal(homepage.status, 200);
  assert.equal(homepage.headers.get('location'), null);
  assert.match(await homepage.text(), /<html lang="it">/);
  for (const oldPath of ['/it', '/it/', '/it/index.html']) {
    const response = await fetch(`${origin}${oldPath}?ref=old&x=1`, { redirect: 'manual' });
    assert.equal(response.status, 301);
    // No destination fragment: the browser inherits the old bookmark.
    assert.equal(response.headers.get('location'), '/?ref=old&x=1');
    await response.text();
  }
  const englishPage = await fetch(`${origin}/en/`);
  assert.equal(englishPage.status, 200);
  assert.match(await englishPage.text(), /<html lang="en">/);
  const card = await fetch(`${origin}/images/social-card-it.jpg`);
  assert.equal(card.status, 200);
  assert.equal(card.headers.get('content-type'), 'image/jpeg');
  await card.arrayBuffer();
});

test('responsive photo candidates exist, keep aspect ratio, and reduce transfer size', async () => {
  const { stat } = await import('node:fs/promises');
  const html = await read('dist/en/index.html');
  const images = [...html.matchAll(/<img\b[^>]+>/g)].map(([tag]) => tag);
  for (const tag of images) {
    const source = tag.match(/\bsrc="([^"]+)"/)[1];
    const width = Number(tag.match(/\bwidth="(\d+)"/)[1]);
    if (width <= 480) continue;
    assert.match(tag, /\bsizes="[^"]+"/);
    const candidates = tag.match(/\bsrcset="([^"]+)"/)[1].split(', ');
    for (const candidate of candidates) {
      const [url, descriptor] = candidate.split(' ');
      const candidateWidth = Number(descriptor.slice(0, -1));
      assert.ok(candidateWidth <= width, 'Do not upscale photos');
      const file = new URL(`dist${url}`, root);
      assert.ok((await stat(file)).size < (await stat(new URL(`dist${source}`, root))).size);
      // cwebp emits VP8 lossy files; read their encoded dimensions directly.
      const data = await readFile(file);
      assert.equal(data.toString('ascii', 12, 16), 'VP8 ');
      assert.equal(data.readUInt16LE(26) & 0x3fff, candidateWidth);
      const height = data.readUInt16LE(28) & 0x3fff;
      const sourceHeight = Number(tag.match(/\bheight="(\d+)"/)[1]);
      assert.ok(Math.abs(height - sourceHeight * candidateWidth / width) <= 1);
    }
  }
});
