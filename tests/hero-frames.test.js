'use strict';
// Шов: site/assets/js/hero-frames.js — чистая логика героя на телефоне (кадры на canvas и лёгкий режим).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const hf = require('../site/assets/js/hero-frames.js');

const SITE = path.join(__dirname, '..', 'site');

test('frameIndex: прогресс 0–1 в номер кадра, края и мусор', () => {
  assert.equal(hf.frameIndex(0, 72), 0);
  assert.equal(hf.frameIndex(1, 72), 71);
  assert.equal(hf.frameIndex(0.5, 72), 36);     // 35,5 округляется вверх
  assert.equal(hf.frameIndex(0.25, 72), 18);
  assert.equal(hf.frameIndex(-0.3, 72), 0);
  assert.equal(hf.frameIndex(1.7, 72), 71);
  assert.equal(hf.frameIndex(NaN, 72), 0);
  assert.equal(hf.frameIndex(0.5, 1), 0);
});

test('frameUrl: f001.webp … f072.webp', () => {
  assert.equal(hf.frameUrl(0), 'assets/img/hero/frames/f001.webp');
  assert.equal(hf.frameUrl(71), 'assets/img/hero/frames/f072.webp');
});

test('loadOrder: первый кадр, последний, грубая сетка через 8 и 4, потом остальные; без повторов', () => {
  const order = hf.loadOrder(72);
  assert.equal(order.length, 72);
  assert.equal(new Set(order).size, 72);
  assert.deepEqual(order.slice(0, 2), [0, 71]);
  // все кратные 8 раньше любого кратного 4, кратные 4 раньше нечётных
  const pos = i => order.indexOf(i);
  assert.ok(pos(64) < pos(4));
  assert.ok(pos(68) < pos(2));
  assert.ok(pos(70) < pos(1));
  assert.deepEqual(order.slice(2, 10), [8, 16, 24, 32, 40, 48, 56, 64]);
  assert.deepEqual(hf.loadOrder(1), [0]);
  assert.deepEqual(hf.loadOrder(0), []);
});

test('nearestLoaded: ближайший загруженный кадр, при равенстве более ранний', () => {
  const loaded = new Array(10).fill(false);
  assert.equal(hf.nearestLoaded(5, loaded), -1);
  loaded[0] = true;
  assert.equal(hf.nearestLoaded(9, loaded), 0);
  loaded[8] = true;
  assert.equal(hf.nearestLoaded(5, loaded), 8);
  assert.equal(hf.nearestLoaded(4, loaded), 0);   // 0 и 8 на равном расстоянии
  loaded[5] = true;
  assert.equal(hf.nearestLoaded(5, loaded), 5);
});

test('chooseMode: file:// и reduced motion статично, десктоп видео, телефон кадры, экономия трафика три картинки', () => {
  assert.equal(hf.chooseMode({ mobile: true }), 'frames');
  assert.equal(hf.chooseMode({ mobile: false }), 'video');
  assert.equal(hf.chooseMode({ mobile: true, file: true }), 'static');
  assert.equal(hf.chooseMode({ mobile: false, file: true }), 'static');
  assert.equal(hf.chooseMode({ mobile: true, reducedMotion: true }), 'static');
  assert.equal(hf.chooseMode({ mobile: false, reducedMotion: true }), 'static');
  assert.equal(hf.chooseMode({ mobile: true, saveData: true }), 'light');
  ['slow-2g', '2g', '3g'].forEach(t => assert.equal(hf.chooseMode({ mobile: true, effectiveType: t }), 'light'));
  assert.equal(hf.chooseMode({ mobile: true, effectiveType: '4g' }), 'frames');
  // на десктопе сеть не трогает видеоскраб
  assert.equal(hf.chooseMode({ mobile: false, saveData: true, effectiveType: '2g' }), 'video');
  assert.equal(hf.chooseMode({ mobile: true, failed: true }), 'static');
  assert.equal(hf.chooseMode({}), 'video');
});

test('lightWeights: бетон → чистовая → кухня, сумма весов 1', () => {
  assert.deepEqual(hf.lightWeights(0), [1, 0, 0]);
  assert.deepEqual(hf.lightWeights(0.5), [0, 1, 0]);
  assert.deepEqual(hf.lightWeights(1), [0, 0, 1]);
  for (let p = 0; p <= 1.0001; p += 0.01) {
    const w = hf.lightWeights(p);
    assert.ok(Math.abs(w[0] + w[1] + w[2] - 1) < 1e-9, 'сумма при p=' + p);
    w.forEach(x => assert.ok(x >= 0 && x <= 1));
  }
  // середина первого перехода: обе картинки видны
  const mid = hf.lightWeights((hf.LIGHT_STOPS[0] + hf.LIGHT_STOPS[1]) / 2);
  assert.ok(mid[0] > 0.3 && mid[1] > 0.3);
});

test('layerAlphas: веса в прозрачности слоёв, наложенных друг на друга', () => {
  assert.deepEqual(hf.layerAlphas([1, 0, 0]), [1, 0, 0]);
  assert.deepEqual(hf.layerAlphas([0, 0, 1]), [1, 0, 1]);
  const a = hf.layerAlphas([0.25, 0.75, 0]);
  assert.equal(a[1], 0.75);
  const b = hf.layerAlphas([0, 0.4, 0.6]);
  assert.equal(b[2], 0.6);
  assert.ok(Math.abs(b[1] - 1) < 1e-9);
});

test('fitRect: узкий экран — кадр по ширине и к низу, широкий — по высоте и к правому краю', () => {
  // телефон 390×776, кадр 720×864: по ширине, снизу
  assert.deepEqual(hf.fitRect(390, 776, 720, 864), { x: 0, y: 308, w: 390, h: 468 });
  // планшет 768×956 уже кадра по пропорциям: тоже по ширине и к низу, сверху узкая полоса
  assert.deepEqual(hf.fitRect(768, 956, 720, 864), { x: 0, y: 34, w: 768, h: 922 });
  // телефон лёжа 844×322: кадр целиком по высоте справа, слева поле под подписи
  assert.deepEqual(hf.fitRect(844, 322, 720, 864), { x: 576, y: 0, w: 268, h: 322 });
  assert.deepEqual(hf.fitRect(0, 300, 720, 864), { x: 0, y: 0, w: 0, h: 0 });
});

test('backingSize: canvas по devicePixelRatio, не выше 2', () => {
  assert.deepEqual(hf.backingSize(390, 776, 3), { w: 780, h: 1552, dpr: 2 });
  assert.deepEqual(hf.backingSize(390, 776, 1.5), { w: 585, h: 1164, dpr: 1.5 });
  assert.deepEqual(hf.backingSize(390, 776, undefined), { w: 390, h: 776, dpr: 1 });
});

test('файлы кадров и трёх фаз на месте, кадры укладываются в 3 МБ', () => {
  let total = 0;
  for (let i = 0; i < hf.FRAME_COUNT; i++) {
    const f = path.join(SITE, hf.frameUrl(i));
    assert.ok(fs.existsSync(f), f);
    total += fs.statSync(f).size;
  }
  assert.ok(total <= 3 * 1024 * 1024, 'кадры ' + total + ' байт');
  hf.LIGHT_URLS.forEach(u => {
    const f = path.join(SITE, u);
    assert.ok(fs.existsSync(f), f);
    assert.ok(fs.statSync(f).size <= 120 * 1024, u);
  });
});

test('index.html подключает hero-frames.js раньше hero-scrub.js и держит canvas героя', () => {
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const a = html.indexOf('assets/js/hero-frames.js');
  const b = html.indexOf('assets/js/hero-scrub.js');
  assert.ok(a > 0 && a < b);
  assert.match(html, /<canvas[^>]*data-hero-canvas/);
});
