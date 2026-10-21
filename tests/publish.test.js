// Готовность к публикации: мета-теги страниц, гейт копирайта 10k, факты G01/G02 в data.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.join(__dirname, '..', 'site');
const PAGES = ['index.html', 'kitchen.html', 'lookbook.html', 'jobs.html'];
const read = (name) => fs.readFileSync(path.join(SITE, name), 'utf8');

function meta(html, attr, name) {
  const re = new RegExp('<meta\\s+' + attr + '="' + name + '"\\s+content="([^"]*)"', 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

for (const page of PAGES) {
  test(page + ': title, description, og-теги и favicon', () => {
    const html = read(page);
    assert.match(html, /<title>[^<]{10,}<\/title>/);
    assert.ok(meta(html, 'name', 'description'), 'description');
    assert.ok(meta(html, 'property', 'og:title'), 'og:title');
    assert.ok(meta(html, 'property', 'og:description'), 'og:description');
    const img = meta(html, 'property', 'og:image');
    assert.ok(img && /og-naurovne\.jpg$/.test(img), 'og:image = финальный кадр героя');
    assert.ok(fs.existsSync(path.join(SITE, 'assets/img/hero/og-naurovne.jpg')), 'файл og:image есть');
    assert.match(html, /<link rel="icon" href="favicon\.svg(\?v=\d+)?" type="image\/svg\+xml">/);
  });

  test(page + ': гейт копирайта 10k', () => {
    const html = read(page);
    assert.equal(html.includes('—'), false, 'длинное тире');
    const stop = /\b(leverage|seamless|empower|unlock|robust|actionable|data-driven|solutions)\b/i;
    assert.equal(stop.test(html), false, 'стоп-слова 10k');
    const ru = /(решения под ключ для вашего бизнеса|индивидуальный подход|широкий спектр|высококвалифицированн|комплексные решения|качественно и в срок)/i;
    assert.equal(ru.test(html), false, 'канцелярит');
  });
}

test('data.js: гарантии, неустойка и срок производства заданы (G01)', () => {
  const data = require('../site/assets/js/data.js');
  const g = data.guarantees;
  assert.equal(g.repairYears.value, 2);
  assert.equal(g.furnitureYears.value, 3);
  assert.equal(g.penaltyPerDay.value, 1000);
  assert.equal(g.productionDays.value, 20);
  for (const k of Object.keys(g)) {
    assert.equal(g[k].placeholder, false, k);
    assert.equal(/[[\]]/.test(g[k].text), false, k + ' без заглушки');
  }
});

test('data.js: условия вакансий по телефону, без заглушек (G02)', () => {
  const data = require('../site/assets/js/data.js');
  for (const j of data.jobs) {
    assert.match(j.pay.text, /Условия обсуждаем по телефону/);
    assert.ok(j.pay.text.includes(data.phone.display));
    const all = [j.pay, j.schedule].concat(j.perks, j.requirements);
    for (const f of all) assert.equal(f.placeholder, false, j.id);
  }
});
