'use strict';
// Шов: site/assets/js/design-layers.js — чистая логика переключателей слоёв (без DOM).
const test = require('node:test');
const assert = require('node:assert/strict');
const dl = require('../site/assets/js/design-layers.js');

test('variantKey: биты материалы, свет, мебель → ключ из трёх цифр', () => {
  assert.equal(dl.variantKey([true, true, true]), '111');
  assert.equal(dl.variantKey([false, false, false]), '000');
  assert.equal(dl.variantKey([true, false, true]), '101');
  assert.equal(dl.variantKey([0, 1, 0]), '010');
  assert.equal(dl.variantKey([]), '000');           // нет переключателей → белый макет
  assert.equal(dl.variantKey(undefined), '111');    // мусор → всё включено, как без JS
});

test('KEYS: восемь разных вариантов, полный идёт последним', () => {
  assert.equal(dl.KEYS.length, 8);
  assert.equal(new Set(dl.KEYS).size, 8);
  dl.KEYS.forEach(k => assert.match(k, /^[01]{3}$/));
  assert.equal(dl.KEYS[dl.KEYS.length - 1], dl.FULL);
  assert.equal(dl.FULL, '111');
});

test('altText описывает состояние каждого слоя', () => {
  assert.equal(dl.altText('111'), 'Гостиная: материалы, вечерний свет и подсветка, с мебелью и декором');
  assert.equal(dl.altText('000'), 'Гостиная: белый макет, ровный дневной свет, без мебели и декора');
  assert.equal(dl.altText('100'), 'Гостиная: материалы, ровный дневной свет, без мебели и декора');
  assert.equal(dl.altText('xyz'), dl.altText('111'));
  const all = new Set(dl.KEYS.map(dl.altText));
  assert.equal(all.size, 8);
  dl.KEYS.forEach(k => assert.ok(!dl.altText(k).includes('—')));
});

test('sources: путь к полной картинке и миниатюре 640', () => {
  assert.deepEqual(dl.sources('010'), {
    src: 'assets/img/index/layers/v010.webp',
    srcset: 'assets/img/index/layers/v010-sm.webp 640w, assets/img/index/layers/v010.webp 1024w'
  });
});
