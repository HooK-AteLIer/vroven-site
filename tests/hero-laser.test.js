// Шов: первый экран главной (site/assets/js/hero-laser.js + hero-laser.css).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.join(__dirname, '..', 'site');
const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');

test('модуль грузится без DOM и ничего не ломает', () => {
  assert.doesNotThrow(() => require('../site/assets/js/hero-laser.js'));
});

test('index.html подключает первый экран с лазером', () => {
  assert.match(html, /<script defer src="assets\/js\/hero-laser\.js"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="assets\/css\/hero-laser\.css">/);
  assert.match(html, /<section class="hl"[^>]*data-hl/);
  assert.match(html, /<canvas[^>]*data-hl-canvas/);
  assert.match(html, /<h1 class="hl__title">.*НА УРОВНЕ/);
  assert.equal(html.includes('hero-scrub.js'), false, 'старый герой отключён');
});

test('кадры «до/после» для компьютера и телефона на месте и лёгкие', () => {
  for (const f of ['laser-before-w', 'laser-after-w', 'laser-before-m', 'laser-after-m']) {
    const p = path.join(SITE, 'assets/img/hero', f + '.webp');
    assert.ok(fs.existsSync(p), f);
    assert.ok(fs.statSync(p).size < 250 * 1024, f + ' не больше 250 КБ');
  }
});
