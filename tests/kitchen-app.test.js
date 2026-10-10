'use strict';
// Конструктор кухни: стили (данные), состояние в #hash, цена и текст заявки.
// Только публичные функции VROVEN.kitchenStyles и VROVEN.kitchenApp.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const JS = path.join(__dirname, '..', 'site', 'assets', 'js');
const styles = require(path.join(JS, 'kitchen-styles.js'));
const app = require(path.join(JS, 'kitchen-app.js'));
const data = require(path.join(JS, 'data.js'));
const KL = require(path.join(JS, 'kitchen-layout.js'));

const FACADES = ['raised-panel', 'shaker', 'flat-matte', 'flat-gloss', 'wood-grain', 'beadboard'];
const HANDLES = ['shell', 'brass-bar', 'rail', 'gola', 'none', 'black-bar', 'knob'];
const HEX = /^#[0-9a-f]{6}$/i;

// ---- стили ----------------------------------------------------------------

test('8 стилей из спецификации, по 2–3 цвета, признаки по контракту', () => {
  assert.deepEqual(styles.map((s) => s.id),
    ['classic', 'neoclassic', 'modern', 'minimal', 'hitech', 'loft', 'scandi', 'provence']);
  styles.forEach((s) => {
    assert.ok(s.name && s.blurb, s.id + ': имя и описание');
    assert.ok(FACADES.includes(s.facade), s.id + ': фасад ' + s.facade);
    assert.ok(HANDLES.includes(s.handle), s.id + ': ручка ' + s.handle);
    ['cornice', 'patina', 'glassUppers', 'openShelves'].forEach((k) => assert.equal(typeof s[k], 'boolean', s.id + '.' + k));
    assert.ok(s.colors.length >= 2 && s.colors.length <= 3, s.id + ': 2–3 цвета');
    s.colors.forEach((c) => {
      assert.ok(c.id && c.name);
      ['facade', 'accent', 'counter'].forEach((k) => assert.match(c[k], HEX, s.id + '/' + c.id + '.' + k));
    });
  });
});

test('стили различимы: нет двух с одинаковым набором признаков', () => {
  const sig = styles.map((s) => [s.facade, s.handle, s.cornice, s.patina, s.glassUppers, s.openShelves, s.colors[0].facade].join('|'));
  assert.equal(new Set(sig).size, 8);
});

// ---- состояние в адресе ----------------------------------------------------

const project = {
  shape: 'u', walls: { A: 2600, B: 3400, C: 2200 }, ceiling: 2750,
  window: { on: true, wall: 'B', offset: 1100, width: 1300, sill: 880 },
  door: { on: true, wall: 'C', offset: 1300, width: 800 },
  sink: { wall: 'B', offset: 1450 }, stove: { wall: 'A', offset: null },
  island: { length: 1200, depth: 900 }, tall: true, upper: 920,
  style: 'provence', color: 'mint', material: 'enamel', withRepair: true, repairType: 'design'
};

test('проект переживает путь в #hash и обратно', () => {
  const hash = app.toHash(project);
  assert.equal(typeof hash, 'string');
  const back = app.fromHash('#' + hash, app.defaults());
  assert.deepEqual(back, project);
});

test('#style=neoclassic меняет только стиль, остальное из основы', () => {
  const loft = styles.find((s) => s.id === 'loft');
  const base = Object.assign(app.defaults(), { style: 'loft', color: loft.colors[1].id });
  const r = app.fromHash('#style=neoclassic', base);
  assert.equal(r.style, 'neoclassic');
  assert.deepEqual(Object.assign({}, r, { style: base.style, color: base.color }), base);
  // цвет: первый у стиля
  assert.equal(r.color, styles.find((s) => s.id === 'neoclassic').colors[0].id);
});

test('чужой стиль, цвет и мусор в адресе не ломают проект', () => {
  const base = app.defaults();
  const r = app.fromHash('#style=gothic&color=pink&a=abc&shape=star', base);
  assert.equal(r.style, base.style);
  assert.equal(r.shape, base.shape);
  assert.equal(r.walls.A, base.walls.A);
  assert.ok(styles.find((s) => s.id === r.style).colors.some((c) => c.id === r.color));
});

test('ввод клиента уходит в раскладку по контракту kitchen-layout', () => {
  const input = app.toLayoutInput(project);
  assert.deepEqual(input.walls, { A: 2600, B: 3400, C: 2200 });
  assert.deepEqual(input.window, { wall: 'B', offset: 1100, width: 1300, sill: 880 });
  assert.deepEqual(input.door, { wall: 'C', offset: 1300, width: 800 });
  assert.deepEqual(input.sink, { wall: 'B', offset: 1450 });
  assert.deepEqual(input.stove, { wall: 'A' });
  assert.equal(input.island, undefined, 'остров только у формы «с островом»');
  assert.deepEqual(input.options, { tallUnit: true, upperHeight: 920 });
  const straight = app.toLayoutInput(Object.assign({}, project, { shape: 'straight', window: { on: false } }));
  assert.deepEqual(straight.walls, { A: 2600 });
  assert.equal(straight.window, undefined);
  assert.equal(KL.layout(app.toLayoutInput(app.defaults())).ok, true, 'проект по умолчанию раскладывается');
});

// ---- цена -------------------------------------------------------------------

test('цена = погонные метры × ставка материала; скидка по лесенке при ремонте', () => {
  const ldsp = data.furnitureMaterials.find((m) => m.id === 'ldsp').perMeter.value; // 10 000
  const plain = app.estimate({ runMeters: 4.4, materialId: 'ldsp', withRepair: false, repairType: 'capital' }, data, null);
  assert.equal(plain.price, Math.round(4.4 * ldsp));
  assert.equal(plain.discountPct, 0);
  assert.equal(plain.priceWithDiscount, plain.price);
  assert.equal(plain.placeholder, true);
  const withRepair = app.estimate({ runMeters: 4.4, materialId: 'ldsp', withRepair: true, repairType: 'capital' }, data, null);
  assert.equal(withRepair.discountPct, 10);
  assert.equal(withRepair.priceWithDiscount, Math.round(4.4 * ldsp * 0.9));
  assert.equal(app.estimate({ runMeters: 4.4, materialId: 'ldsp', withRepair: true, repairType: 'design' }, data, null).discountPct, 15);
});

test('если есть VROVEN.pricing.kitchenEstimate, цена берётся из неё', () => {
  const pricing = { kitchenEstimate: () => ({ price: 111, discountPct: 5, priceWithDiscount: 105, placeholder: false }) };
  const r = app.estimate({ runMeters: 3, materialId: 'ldsp', withRepair: true, repairType: 'cosmetic' }, data, pricing);
  assert.deepEqual(r, { price: 111, discountPct: 5, priceWithDiscount: 105, placeholder: false });
});

// ---- заявка -----------------------------------------------------------------

test('текст «Отправить замер»: форма, размеры, окно, мойка, плита, стиль, цвет, материал, город', () => {
  const state = Object.assign(app.defaults(), {
    shape: 'corner', walls: { A: 3200, B: 2400, C: null }, ceiling: 2700,
    window: { on: true, wall: 'B', offset: 900, width: 1200, sill: 900 },
    style: 'loft', color: styles.find((s) => s.id === 'loft').colors[1].id, material: 'veneer'
  });
  const layout = KL.layout(app.toLayoutInput(state));
  assert.equal(layout.ok, true);
  const msg = app.buildMessage(state, layout, { cityName: 'Нижневартовск', link: 'https://x.test/kitchen.html#a=1' });
  const loft = styles.find((s) => s.id === 'loft');
  [/Форма: угловая/, /A 3 200 мм/, /B 2 400 мм/, /Потолок: 2 700 мм/, /Окно: стена B/, /1 200 мм/,
    /Мойка: стена [AB]/, /Плита: стена [AB]/, new RegExp('Стиль: ' + loft.name), new RegExp('Цвет: ' + loft.colors[1].name),
    /Фасады: Шпон/, /Город: Нижневартовск/, /x\.test/].forEach((re) => assert.match(msg, re));
  assert.doesNotMatch(msg, /Дверь/, 'двери нет — строки нет');
});
