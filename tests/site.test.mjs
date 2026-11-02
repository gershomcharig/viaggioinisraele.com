import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, cp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { build, renderTemplate, escapeHtml } from '../scripts/build.mjs';

const root = new URL('../', import.meta.url);
const read = relative => readFile(new URL(relative, root), 'utf8');
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

test('root selects the first supported preference, including regional variants', () => {
  for (const [preferences, expected] of [
    [['it-IT', 'en-GB'], '/it/'], [['en-US', 'it'], '/en/'],
    [['fr-FR', 'it-CH', 'en'], '/it/'], [['de', 'fr'], '/en/'], [[], '/en/'],
  ]) {
    assert.deepEqual(simulateLanguage({ preferences }).redirects, [expected]);
  }
});

test('saved choice overrides browser settings; unknown saved choices are ignored', () => {
  assert.deepEqual(simulateLanguage({ saved: 'it' }).redirects, ['/it/']);
  assert.deepEqual(simulateLanguage({ saved: 'en', preferences: ['it'] }).redirects, ['/en/']);
  assert.deepEqual(simulateLanguage({ saved: 'removed', preferences: ['it'] }).redirects, ['/it/']);
});

test('blocked storage preserves selection and old root anchors and query strings', () => {
  assert.deepEqual(simulateLanguage({ blocked: true, preferences: ['it-IT'], search: '?ref=old&x=1', hash: '#cap-4' }).redirects,
    ['/it/?ref=old&x=1#cap-4']);
  assert.deepEqual(simulateLanguage({ pathname: '/index.html', hash: '#cap-9' }).redirects, ['/en/#cap-9']);
});

test('explicit language pages never redirect, even with conflicting saved preferences', () => {
  for (const pathname of ['/it/', '/en/', '/it/index.html', '/en/index.html']) {
    assert.deepEqual(simulateLanguage({ pathname, saved: pathname.includes('it') ? 'en' : 'it' }).redirects, []);
  }
});

test('switching records only explicit choices and preserves current URL context', () => {
  const page = simulateLanguage({ pathname: '/en/', search: '?source=test', hash: '#cap-2' });
  assert.deepEqual(page.writes, []);
  assert.equal(page.links[0].href, '/it/?source=test#cap-2');
  // history.pushState can update the chapter without firing hashchange.
  page.location.hash = '#cap-9';
  page.links[0].events.click();
  assert.equal(page.links[0].href, '/it/?source=test#cap-9');
  assert.deepEqual(page.writes, [['isacco.language', 'it']]);
});

test('switcher still navigates when storage is denied and waits for DOM readiness', () => {
  const page = simulateLanguage({ pathname: '/en/', blocked: true, readyState: 'loading', hash: '#cap-8' });
  page.events.DOMContentLoaded();
  assert.doesNotThrow(() => page.links[0].events.click());
  assert.equal(page.links[0].href, '/it/#cap-8');
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
  assert.doesNotMatch(html, /Translated from Italian|Isacco|Travel in Israel with/);
  assert.match(html, /<title>\s*Travel Israel with Isaac — Your story begins here/);
  assert.match(html, /content="Travel Israel with Isaac Charig/);
  assert.match(html, /Message on Whatsapp/);
  for (const code of ['it', 'en']) {
    const page = await read(`dist/${code}/index.html`);
    const header = page.match(/<header[^>]*>([\s\S]*?)<\/header>/)[1];
    const footer = page.match(/<footer[^>]*>([\s\S]*?)<\/footer>/)[1];
    assert.doesNotMatch(header, /language-switcher/);
    assert.match(footer, /language-switcher/);
    assert.doesNotMatch(page, /quote-translation/);
  }
  assert.match(html, /Are the tours in English\?/);
  assert.doesNotMatch(html, /Vorrei|Scrivimi|in italiano/);
});

test('root retains usable no-JavaScript language links; sitemap lists the full set', async () => {
  const html = await read('dist/index.html');
  for (const language of config.languages) assert.ok(html.includes(`href="${language.path}"`));
  assert.match(html, /Choose your language/);
  const sitemap = await read('dist/sitemap.xml');
  assert.equal((sitemap.match(/<url>/g) || []).length, 3);
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
  delete locale.copy.site_title;
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
  const chooser = await readFile(path.join(directory, 'dist/index.html'), 'utf8');
  assert.match(chooser, /href="\/fr\/"/);
});
