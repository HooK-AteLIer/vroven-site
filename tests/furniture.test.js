'use strict';
// Шов: цены шкафов и гардеробных в data.js, их расчёт в комплекте (pricing.js), кадры лукбука (T21).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../site/assets/js/data.js');
const pricing = require('../site/assets/js/pricing.js');
const shots = require('../site/assets/js/lookbook-data.js');

const item = (id) => data.furnitureItems.find((x) => x.id === id);

test('data.js: ориентиры за п.м. для шкафа-купе, гардеробной и прихожей (рынок Тюмени)', () => {
  const expect = {
    wardrobe: [24470, 'https://tumen.vsevdom.info/furniture/closet'],
    walkin: [25700, 'https://tumen.mebellin.com/dressing-room'],
    hallway: [24100, 'https://modulmebel72.ru/catalog/prikhozhie/']
  };
  for (const id of Object.keys(expect)) {
    const pm = item(id).perMeter;
    assert.ok(pm, id + ': цена задана');
    assert.equal(pm.value, expect[id][0], id);
    assert.equal(pm.source, expect[id][1], id + ': источник');
    assert.equal(pm.placeholder, true, id + ': метка «ориентировочно»');
  }
});

test('data.js: детская без цены, «по проекту после замера»', () => {
  const kids = item('kids');
  assert.equal(kids.perMeter, null);
  assert.equal(kids.priceNote, 'по проекту после замера');
});

test('bundle: шкаф, гардеробная и прихожая считаются по ставкам data.js, детская по проекту', () => {
  for (const city of ['tyumen', 'nizhnevartovsk']) {
    const r = pricing.bundle({
      repairType: 'capital', repairArea: 60, city,
      furniture: [{ id: 'wardrobe', meters: 2.4 }, { id: 'walkin', meters: 4 }, { id: 'hallway', meters: 1.8 }]
    }, data);
    // 24 470 × 2,4 = 58 728; 25 700 × 4 = 102 800; 24 100 × 1,8 = 43 380
    assert.equal(r.furnitureTotal, 58728 + 102800 + 43380, city);
    assert.equal(r.bySurvey, false, city);
    assert.equal(r.placeholder, true, city);
    assert.equal(r.savings, Math.round(204908 * 0.1), city);
  }
  const k = pricing.bundle({ repairType: 'capital', repairArea: 60, city: 'tyumen', furniture: [{ id: 'kids', meters: 2.4 }] }, data);
  assert.equal(k.furnitureTotal, 0);
  assert.equal(k.bySurvey, true);
  assert.equal(k.items[0].price, null);
});

test('лукбук: 10 новых кадров шкафов и гардеробных, файлы и размеры на месте', () => {
  const NEW = ['walkin-glass', 'walkin-corner', 'wardrobe-mirror', 'wardrobe-hinged', 'wardrobe-inside',
    'hallway-graphite', 'kids-bed', 'living-tv', 'office', 'laundry'];
  const site = path.join(__dirname, '..', 'site');
  assert.equal(shots.length, 26);
  for (const name of NEW) {
    const s = shots.find((x) => x.src.endsWith('/' + name + '.webp'));
    assert.ok(s, name + ' в lookbook-data.js');
    assert.ok(fs.existsSync(path.join(site, s.src)), name + ': полный кадр');
    assert.ok(fs.existsSync(path.join(site, s.thumb)), name + ': миниатюра');
    assert.equal(s.w, 1024, name);
    assert.equal(s.h, 688, name);
    assert.ok(s.title && s.alt, name + ': title и alt');
    assert.equal(/AI|ИИ/.test(s.alt), false, name + ': alt без «AI»');
  }
  const cats = new Set(shots.map((s) => s.category));
  assert.deepEqual([...cats].sort(), ['hallway', 'kitchen', 'other', 'repair', 'walkin', 'wardrobe']);
});
