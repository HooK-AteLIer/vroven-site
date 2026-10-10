'use strict';
// Шов: site/assets/js/pricing.js (расчёты) вместе с data.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const pricing = require('../site/assets/js/pricing.js');
const data = require('../site/assets/js/data.js');

// Свой набор цифр, чтобы ожидания считались вручную, а не из кода под тестом.
const fixture = {
  repairPrices: {
    tyumen: {
      apartment: {
        cosmetic: { value: 10000, placeholder: true },
        capital: { value: 20000, placeholder: false },
        design: null
      },
      commercial: { office: { value: 5000, placeholder: true }, shop: null, cafe: null, salon: null }
    }
  },
  bundleDiscount: { cosmetic: 5, capital: 10, design: 15 },
  furnitureItems: [
    { id: 'kitchen', name: 'Кухня', perMeter: { value: 30000, placeholder: true } },
    { id: 'hallway', name: 'Прихожая', perMeter: { value: 20000, placeholder: true } },
    { id: 'wardrobe', name: 'Шкаф-купе', perMeter: null }
  ],
  furnitureMaterials: [
    { id: 'ldsp', name: 'ЛДСП', perMeter: { value: 10000, placeholder: true } },
    { id: 'enamel', name: 'Эмаль', perMeter: { value: 40000, placeholder: false } }
  ]
};

function est(over) {
  return pricing.repairEstimate(Object.assign({
    city: 'tyumen', objectType: 'apartment', repairType: 'cosmetic', area: 50, ceiling: 2700
  }, over), fixture);
}

/* ---------- repairEstimate ---------- */

test('repairEstimate: вилка ±15% от ставки × площадь', () => {
  // 10 000 × 50 = 500 000; −15% = 425 000; +15% = 575 000
  const r = est({});
  assert.equal(r.ok, true);
  assert.equal(r.perM2, 10000);
  assert.equal(r.min, 425000);
  assert.equal(r.max, 575000);
  assert.equal(r.placeholder, true);
});

test('repairEstimate: флаг placeholder берётся из ставки', () => {
  const r = est({ repairType: 'capital', area: 10 });
  assert.equal(r.ok, true);
  assert.equal(r.placeholder, false);
  assert.equal(r.min, 170000); // 200 000 × 0,85
  assert.equal(r.max, 230000);
});

test('repairEstimate: потолок выше 3000 мм даёт +10% к ставке', () => {
  // 10 000 × 1,1 = 11 000; × 50 = 550 000; вилка 467 500 – 632 500
  const r = est({ ceiling: 3200 });
  assert.equal(r.ok, true);
  assert.equal(r.perM2, 11000);
  assert.equal(r.min, 467500);
  assert.equal(r.max, 632500);
});

test('repairEstimate: ровно 3000 мм ещё без наценки', () => {
  assert.equal(est({ ceiling: 3000 }).perM2, 10000);
});

test('repairEstimate: площадь 0, пусто, не число и больше 5000 дают ошибку area', () => {
  for (const area of [0, '', null, undefined, 'abc', -5, 5001, 0.5]) {
    const r = est({ area });
    assert.equal(r.ok, false, 'area=' + area);
    assert.equal(r.reason, 'area', 'area=' + area);
    assert.equal(typeof r.message, 'string');
    assert.ok(r.message.length > 0);
    assert.doesNotMatch(r.message, /NaN|undefined/);
  }
});

test('repairEstimate: границы площади 1 и 5000 допустимы, строка с запятой читается', () => {
  assert.equal(est({ area: 1 }).ok, true);
  assert.equal(est({ area: 5000 }).ok, true);
  const r = est({ area: '12,5' });
  assert.equal(r.ok, true);
  assert.equal(r.min, 106250); // 125 000 × 0,85
});

test('repairEstimate: невозможный потолок даёт ошибку ceiling', () => {
  for (const ceiling of [1500, 'abc', 9000]) {
    const r = est({ ceiling });
    assert.equal(r.ok, false, 'ceiling=' + ceiling);
    assert.equal(r.reason, 'ceiling');
  }
});

test('repairEstimate: нет ставки (null) даёт noPrice', () => {
  const r = est({ repairType: 'design' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'noPrice');
  assert.match(r.message, /смет/);
});

test('repairEstimate: коммерция берёт свою ставку или noPrice', () => {
  const office = est({ objectType: 'office', area: 100 });
  assert.equal(office.ok, true);
  assert.equal(office.min, 425000); // 5 000 × 100 × 0,85
  assert.equal(est({ objectType: 'cafe' }).reason, 'noPrice');
});

test('repairEstimate: с настоящим data.js коммерция и пустые ставки Нижневартовска идут по смете', () => {
  const base = { city: 'nizhnevartovsk', objectType: 'apartment', area: 40, ceiling: 2700 };
  assert.equal(pricing.repairEstimate(Object.assign({}, base, { repairType: 'cosmetic' }), data).reason, 'noPrice');
  assert.equal(pricing.repairEstimate(Object.assign({}, base, { repairType: 'capital' }), data).ok, true);
  assert.equal(pricing.repairEstimate(Object.assign({}, base, { city: 'tyumen', objectType: 'shop', repairType: 'capital' }), data).reason, 'noPrice');
});

/* ---------- bundle ---------- */

test('bundle: скидка на мебель по лесенке 5/10/15 и сумма экономии', () => {
  // мебель: кухня 4 п.м. × 30 000 = 120 000
  const cases = { cosmetic: [5, 6000], capital: [10, 12000] };
  for (const [repairType, [pct, savings]] of Object.entries(cases)) {
    const r = pricing.bundle({ repairType, repairArea: 50, city: 'tyumen', furniture: [{ id: 'kitchen', meters: 4 }] }, fixture);
    assert.equal(r.discountPct, pct, repairType);
    assert.equal(r.furnitureTotal, 120000);
    assert.equal(r.savings, savings, repairType);
  }
  const design = pricing.bundle({ repairType: 'design', repairArea: 50, city: 'tyumen', furniture: [{ id: 'kitchen', meters: 4 }] }, fixture);
  assert.equal(design.discountPct, 15);
  assert.equal(design.savings, 18000);
});

test('bundle: итог = ремонт + мебель − экономия', () => {
  // ремонт 10 000 × 50 = 500 000; мебель 120 000 + прихожая 2 × 20 000 = 160 000; −5% = 8 000
  const r = pricing.bundle({
    repairType: 'cosmetic', repairArea: 50, city: 'tyumen',
    furniture: [{ id: 'kitchen', meters: 4 }, { id: 'hallway', meters: 2 }]
  }, fixture);
  assert.equal(r.repairTotal, 500000);
  assert.equal(r.furnitureTotal, 160000);
  assert.equal(r.savings, 8000);
  assert.equal(r.total, 652000);
  assert.equal(r.placeholder, true);
});

test('bundle: без мебели экономия 0, процент лесенки остаётся', () => {
  const r = pricing.bundle({ repairType: 'capital', repairArea: 50, city: 'tyumen', furniture: [] }, fixture);
  assert.equal(r.savings, 0);
  assert.equal(r.furnitureTotal, 0);
  assert.equal(r.discountPct, 10);
  assert.equal(r.total, 1000000);
});

test('bundle: мебель без ставки идёт «по смете» и не ломает суммы', () => {
  const r = pricing.bundle({
    repairType: 'capital', repairArea: 10, city: 'tyumen',
    furniture: [{ id: 'wardrobe', meters: 3 }, { id: 'kitchen', meters: 2 }]
  }, fixture);
  assert.equal(r.furnitureTotal, 60000);
  assert.equal(r.savings, 6000);
  assert.ok(Number.isFinite(r.total));
  assert.equal(r.bySurvey, true);
});

test('bundle: метры 0, пусто или не число мебель не считают', () => {
  const r = pricing.bundle({
    repairType: 'capital', repairArea: 10, city: 'tyumen',
    furniture: [{ id: 'kitchen', meters: 0 }, { id: 'hallway', meters: '' }, { id: 'kitchen', meters: 'x' }]
  }, fixture);
  assert.equal(r.furnitureTotal, 0);
  assert.equal(r.savings, 0);
});

test('bundle: ремонт без ставки даёт repairTotal null, экономия всё равно считается', () => {
  const r = pricing.bundle({ repairType: 'design', repairArea: 50, city: 'tyumen', furniture: [{ id: 'kitchen', meters: 4 }] }, fixture);
  assert.equal(r.repairTotal, null);
  assert.equal(r.savings, 18000);
  assert.ok(Number.isFinite(r.total));
});

/* ---------- kitchenEstimate ---------- */

test('kitchenEstimate: погонные метры × ставка материала', () => {
  const r = pricing.kitchenEstimate({ runMeters: 4.4, materialId: 'ldsp', city: 'tyumen', withRepair: false }, fixture);
  assert.equal(r.price, 44000);
  assert.equal(r.discountPct, 0);
  assert.equal(r.priceWithDiscount, 44000);
  assert.equal(r.placeholder, true);
});

test('kitchenEstimate: с ремонтом скидка по типу ремонта', () => {
  const r = pricing.kitchenEstimate({ runMeters: 3, materialId: 'enamel', city: 'tyumen', withRepair: true, repairType: 'capital' }, fixture);
  assert.equal(r.price, 120000);
  assert.equal(r.discountPct, 10);
  assert.equal(r.priceWithDiscount, 108000);
  assert.equal(r.placeholder, false);
});

test('kitchenEstimate: нет материала или метров даёт price null, а не NaN', () => {
  for (const input of [{ runMeters: 3, materialId: 'nope' }, { runMeters: 0, materialId: 'ldsp' }, { runMeters: 'x', materialId: 'ldsp' }]) {
    const r = pricing.kitchenEstimate(Object.assign({ city: 'tyumen' }, input), fixture);
    assert.equal(r.price, null);
    assert.equal(r.priceWithDiscount, null);
  }
});
