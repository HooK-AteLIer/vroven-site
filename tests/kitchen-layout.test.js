'use strict';
// Тесты раскладки кухни: только публичный контракт из interfaces.md.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const MODULE_PATH = path.join(__dirname, '..', 'site', 'assets', 'js', 'kitchen-layout.js');
const KL = require(MODULE_PATH);

const STD_WIDTHS = [150, 200, 300, 400, 450, 500, 600, 800, 900];

// --- помощники -------------------------------------------------------------
function ok(input) {
  const r = KL.layout(input);
  assert.equal(r.ok, true, 'ожидался ok:true, а пришло ' + JSON.stringify(r.errors || r));
  return r;
}
function wall(r, id) { return r.walls.find((w) => w.id === id); }
function all(w) { return w.lower.concat(w.fillers.map((f) => ({ x: f.x, width: f.width, kind: 'filler' }))); }
function sorted(items) { return items.slice().sort((a, b) => a.x - b.x); }
function overlaps(a, b) { return a.x < b.x + b.width && b.x < a.x + a.width; }
function assertNoOverlap(items, label) {
  const s = sorted(items);
  for (let i = 1; i < s.length; i++) {
    assert.ok(s[i].x >= s[i - 1].x + s[i - 1].width,
      `${label}: ${s[i - 1].kind}@${s[i - 1].x}+${s[i - 1].width} налезает на ${s[i].kind}@${s[i].x}`);
  }
}
function assertInsideWall(items, w) {
  for (const m of items) {
    assert.ok(m.x >= 0 && m.x + m.width <= w.length, `${m.kind}@${m.x}+${m.width} вне стены ${w.id} (${w.length})`);
  }
}
function sumWidths(items) { return items.reduce((s, m) => s + m.width, 0); }
function one(list, kind) {
  const found = list.filter((m) => m.kind === kind);
  assert.equal(found.length, 1, `ожидался ровно один модуль ${kind}, найдено ${found.length}`);
  return found[0];
}
function allWallsSane(r) {
  for (const w of r.walls) {
    assertNoOverlap(all(w), `стена ${w.id} низ`);
    assertNoOverlap(w.upper, `стена ${w.id} верх`);
    assertInsideWall(all(w), w);
    assertInsideWall(w.upper, w);
    for (const m of w.lower.concat(w.upper)) {
      assert.ok(Number.isInteger(m.x) && Number.isInteger(m.width), 'размеры целые');
      if (['base', 'drawers', 'upper'].includes(m.kind)) {
        assert.ok(STD_WIDTHS.includes(m.width), `${m.kind} нестандартной ширины ${m.width}`);
      }
    }
    for (const f of w.fillers) assert.ok(f.width > 0 && f.width < 150, `добор ${f.width} должен быть < 150`);
  }
}

// --- контракт и экспорт -------------------------------------------------------
test('экспортирует константы из контракта', () => {
  assert.equal(KL.PLINTH, 100);
  assert.equal(KL.BASE_H, 720);
  assert.equal(KL.TOP, 38);
  assert.equal(KL.UPPER_H, 720);
  assert.equal(KL.BASE_D, 560);
  assert.equal(KL.UPPER_D, 300);
  assert.equal(KL.UPPER_GAP, 600);
  assert.deepEqual(KL.WIDTHS, STD_WIDTHS);
  assert.equal(typeof KL.layout, 'function');
});

test('в браузере вешается на window.VROVEN.kitchenLayout, не затирая VROVEN', () => {
  const code = fs.readFileSync(MODULE_PATH, 'utf8');
  const existing = { data: { brand: 'x' } };
  const ctx = { window: { VROVEN: existing } };
  vm.runInNewContext(code, ctx);
  assert.equal(ctx.window.VROVEN, existing);
  assert.deepEqual(ctx.window.VROVEN.data, { brand: 'x' });
  assert.equal(typeof ctx.window.VROVEN.kitchenLayout.layout, 'function');

  const ctx2 = { window: {} };
  vm.runInNewContext(code, ctx2);
  assert.equal(typeof ctx2.window.VROVEN.kitchenLayout.layout, 'function');
});

// --- прямая -------------------------------------------------------------
test('прямая 3000: модули и доборы ровно по стене, мойка, ПММ, плита с вытяжкой', () => {
  const r = ok({ shape: 'straight', walls: { A: 3000 }, ceiling: 2600 });
  assert.equal(r.walls.length, 1);
  const a = wall(r, 'A');
  assert.equal(a.length, 3000);
  allWallsSane(r);
  assert.equal(sumWidths(all(a)), 3000, 'сумма ширин низа и доборов = длина стены');

  const sink = one(a.lower, 'sink');
  const stove = one(a.lower, 'stove');
  const dw = one(a.lower, 'dishwasher');
  assert.ok([450, 600].includes(dw.width), 'ПММ 450 или 600');
  assert.ok(dw.x + dw.width === sink.x || sink.x + sink.width === dw.x, 'ПММ вплотную к мойке');

  const gap = stove.x > sink.x ? stove.x - (sink.x + sink.width) : sink.x - (stove.x + stove.width);
  assert.ok(gap >= 300, `между мойкой и плитой ${gap} мм, нужно ≥ 300`);
  assert.ok(stove.x >= 300 && a.length - (stove.x + stove.width) >= 300, 'плита не у края стены');

  const hood = one(a.upper, 'hood');
  assert.equal(hood.x, stove.x);
  assert.equal(hood.width, stove.width);
  assert.ok(a.lower.some((m) => m.kind === 'drawers' && (m.x + m.width === stove.x || stove.x + stove.width === m.x)),
    'рядом с плитой ящики');
});

test('прямая некратной длины 3037: остаток уходит в добор, сумма сходится', () => {
  const r = ok({ shape: 'straight', walls: { A: 3037 }, ceiling: 2500 });
  allWallsSane(r);
  const a = wall(r, 'A');
  assert.equal(sumWidths(all(a)), 3037);
  assert.ok(a.fillers.length >= 1);
});

test('прямая длинная 4800: сумма сходится, широкие модули есть, плита не у мойки', () => {
  const r = ok({ shape: 'straight', walls: { A: 4800 }, ceiling: 2700 });
  allWallsSane(r);
  const a = wall(r, 'A');
  assert.equal(sumWidths(all(a)), 4800);
  assert.ok(a.lower.some((m) => m.width >= 800), 'есть широкий модуль');
  const sink = one(a.lower, 'sink');
  const stove = one(a.lower, 'stove');
  const gap = stove.x > sink.x ? stove.x - (sink.x + sink.width) : sink.x - (stove.x + stove.width);
  assert.ok(gap >= 300);
});

test('заданные мойка и плита стоят там, где просили (с точностью до шага)', () => {
  const r = ok({ shape: 'straight', walls: { A: 3600 }, ceiling: 2600,
    sink: { wall: 'A', offset: 2400 }, stove: { wall: 'A', offset: 600 } });
  allWallsSane(r);
  const a = wall(r, 'A');
  const sink = one(a.lower, 'sink');
  const stove = one(a.lower, 'stove');
  assert.ok(Math.abs(sink.x - 2400) <= 100, `мойка ${sink.x}, просили 2400`);
  assert.ok(Math.abs(stove.x - 600) <= 100, `плита ${stove.x}, просили 600`);
  assert.equal(sumWidths(all(a)), 3600);
});

test('пенал по желанию: стоит у края фронта, верхних над ним нет', () => {
  const r = ok({ shape: 'straight', walls: { A: 3600 }, ceiling: 2600, options: { tallUnit: true } });
  allWallsSane(r);
  const a = wall(r, 'A');
  const tall = one(a.lower, 'tall');
  assert.ok(tall.x <= 149 || a.length - (tall.x + tall.width) <= 149, 'пенал у края стены');
  assert.ok(!a.upper.some((u) => overlaps(u, tall)), 'над пеналом нет верхних');
  assert.equal(sumWidths(all(a)), 3600);
});

// --- окно и дверь -------------------------------------------------------
test('окно: ни один верхний модуль не пересекает окно; мойка по умолчанию у окна', () => {
  const win = { wall: 'A', offset: 1000, width: 1200, sill: 900 };
  const r = ok({ shape: 'straight', walls: { A: 3600 }, ceiling: 2700, window: win });
  allWallsSane(r);
  const a = wall(r, 'A');
  const w = { x: win.offset, width: win.width };
  for (const u of a.upper) assert.ok(!overlaps(u, w), `${u.kind}@${u.x}+${u.width} пересекает окно`);
  const sink = one(a.lower, 'sink');
  assert.ok(overlaps(sink, w), 'мойка под окном');
  const stove = one(a.lower, 'stove');
  assert.ok(!overlaps(stove, w), 'плита не под окном');
  assert.equal(sumWidths(all(a)), 3600);
});

test('окно на угловой стене B: верх стены B его не пересекает', () => {
  const win = { wall: 'B', offset: 900, width: 900, sill: 900 };
  const r = ok({ shape: 'corner', walls: { A: 3000, B: 2700 }, ceiling: 2600, window: win });
  allWallsSane(r);
  const b = wall(r, 'B');
  for (const u of b.upper) assert.ok(!overlaps(u, { x: 900, width: 900 }));
});

test('дверь: ни один модуль не пересекает проём', () => {
  const door = { wall: 'A', offset: 2600, width: 800 };
  const r = ok({ shape: 'straight', walls: { A: 4000 }, ceiling: 2600, door });
  allWallsSane(r);
  const a = wall(r, 'A');
  const d = { x: door.offset, width: door.width };
  for (const m of all(a).concat(a.upper)) assert.ok(!overlaps(m, d), `${m.kind}@${m.x} в дверном проёме`);
  one(a.lower, 'sink');
  one(a.lower, 'stove');
  assert.equal(sumWidths(all(a)), 4000 - 800, 'вне проёма стена заполнена');
});

// --- угловая, П-образная, остров ---------------------------------------
test('угловая: угловые модули на стыке, без наложений, мойка и плита есть', () => {
  const r = ok({ shape: 'corner', walls: { A: 3000, B: 2000 }, ceiling: 2600 });
  assert.deepEqual(r.walls.map((w) => w.id), ['A', 'B']);
  allWallsSane(r);
  const a = wall(r, 'A');
  const b = wall(r, 'B');
  const corner = one(a.lower, 'corner');
  assert.equal(corner.x + corner.width, a.length, 'нижний угловой у стыка A/B');
  const uc = one(a.upper, 'upper-corner');
  assert.equal(uc.x + uc.width, a.length, 'верхний угловой у стыка');
  // B не залезает в угловой квадрат, занятый столешницей A
  for (const m of all(b)) assert.ok(m.x >= 600, `низ B@${m.x} в углу`);
  for (const m of b.upper) assert.ok(m.x >= KL.UPPER_D, `верх B@${m.x} в углу`);
  assert.equal(sumWidths(all(a)), 3000);
  assert.equal(sumWidths(all(b)), 2000 - 600);
  const kinds = r.walls.flatMap((w) => w.lower.map((m) => m.kind));
  assert.equal(kinds.filter((k) => k === 'sink').length, 1);
  assert.equal(kinds.filter((k) => k === 'stove').length, 1);
});

test('угловая с короткой стеной B 1200: всё равно раскладывается', () => {
  const r = ok({ shape: 'corner', walls: { A: 2400, B: 1200 }, ceiling: 2500 });
  allWallsSane(r);
  const kinds = r.walls.flatMap((w) => w.lower.map((m) => m.kind));
  assert.equal(kinds.filter((k) => k === 'sink').length, 1);
  assert.equal(kinds.filter((k) => k === 'stove').length, 1);
});

test('П-образная: угловые модули на обоих стыках, без наложений', () => {
  const r = ok({ shape: 'u', walls: { A: 2400, B: 3000, C: 2400 }, ceiling: 2700 });
  assert.deepEqual(r.walls.map((w) => w.id), ['A', 'B', 'C']);
  allWallsSane(r);
  const a = wall(r, 'A');
  const b = wall(r, 'B');
  const c = wall(r, 'C');
  const ca = one(a.lower, 'corner');
  assert.equal(ca.x + ca.width, a.length);
  const cc = one(c.lower, 'corner');
  assert.equal(cc.x, 0);
  one(a.upper, 'upper-corner');
  one(c.upper, 'upper-corner');
  for (const m of all(b)) assert.ok(m.x >= 600 && m.x + m.width <= b.length - 600, 'B не лезет в углы');
  assert.equal(sumWidths(all(b)), 3000 - 1200);
  const kinds = r.walls.flatMap((w) => w.lower.map((m) => m.kind));
  assert.equal(kinds.filter((k) => k === 'sink').length, 1);
  assert.equal(kinds.filter((k) => k === 'stove').length, 1);
});

test('остров — отдельный блок со своими модулями', () => {
  const r = ok({ shape: 'island', walls: { A: 3000 }, ceiling: 2600, island: { length: 1800, depth: 900 } });
  allWallsSane(r);
  assert.equal(r.walls.length, 1);
  assert.ok(r.island, 'есть island');
  assert.equal(r.island.length, 1800);
  assert.equal(r.island.depth, 900);
  const items = r.island.lower.concat((r.island.fillers || []).map((f) => ({ ...f, kind: 'filler' })));
  assertNoOverlap(items, 'остров');
  assert.equal(sumWidths(items), 1800);
  assert.equal(sumWidths(all(wall(r, 'A'))), 3000);
});

// --- потолок и верхний ряд ---------------------------------------------
test('высота верхних по потолку: 2700 → 920, 2400 → 720, 920 при низком потолке → 720 с предупреждением', () => {
  assert.equal(ok({ shape: 'straight', walls: { A: 3000 }, ceiling: 2700 }).upperHeight, 920);
  assert.equal(ok({ shape: 'straight', walls: { A: 3000 }, ceiling: 2400 }).upperHeight, 720);
  const r = ok({ shape: 'straight', walls: { A: 3000 }, ceiling: 2300, options: { upperHeight: 920 } });
  assert.equal(r.upperHeight, 720);
  assert.ok(r.warnings.length >= 1);
  assert.equal(ok({ shape: 'straight', walls: { A: 3000 }, ceiling: 2700, options: { upperHeight: 720 } }).upperHeight, 720);
});

// --- ошибки --------------------------------------------------------------
function err(input, field) {
  const r = KL.layout(input);
  assert.equal(r.ok, false, 'ожидалась ошибка по полю ' + field);
  const e = r.errors.find((x) => x.field === field);
  assert.ok(e, `нет ошибки с field=${field}: ${JSON.stringify(r.errors)}`);
  assert.match(e.message, /[а-яё]/i, 'сообщение по-русски');
  return e;
}

test('ошибки: стена < 1200, потолок < 2200, окно и дверь за стеной, нет стены B у угловой', () => {
  err({ shape: 'straight', walls: { A: 1100 }, ceiling: 2600 }, 'walls.A');
  err({ shape: 'straight', walls: { A: 3000 }, ceiling: 2100 }, 'ceiling');
  err({ shape: 'straight', walls: { A: 3000 }, ceiling: 2600, window: { wall: 'A', offset: 2500, width: 800, sill: 900 } }, 'window');
  err({ shape: 'straight', walls: { A: 3000 }, ceiling: 2600, window: { wall: 'A', offset: -10, width: 800, sill: 900 } }, 'window');
  err({ shape: 'straight', walls: { A: 3000 }, ceiling: 2600, door: { wall: 'A', offset: 2600, width: 800 } }, 'door');
  err({ shape: 'corner', walls: { A: 3000 }, ceiling: 2600 }, 'walls.B');
  err({ shape: 'u', walls: { A: 3000, B: 3000 }, ceiling: 2600 }, 'walls.C');
  err({ shape: 'corner', walls: { A: 3000, B: 1000 }, ceiling: 2600 }, 'walls.B');
  err({ shape: 'straight', walls: { A: 3000 }, ceiling: 2600, window: { wall: 'B', offset: 0, width: 800, sill: 900 } }, 'window');
  err({ shape: 'oval', walls: { A: 3000 }, ceiling: 2600 }, 'shape');
});

test('несколько ошибок сразу возвращаются вместе', () => {
  const r = KL.layout({ shape: 'straight', walls: { A: 900 }, ceiling: 2000 });
  assert.equal(r.ok, false);
  const fields = r.errors.map((e) => e.field).sort();
  assert.deepEqual(fields, ['ceiling', 'walls.A']);
});

// --- погонные метры ----------------------------------------------------------
test('runMeters: сумма рабочих фронтов на 4 формах, точность 0.01', () => {
  // прямая: весь фронт стены A
  assert.equal(ok({ shape: 'straight', walls: { A: 3000 }, ceiling: 2600 }).runMeters, 3);
  // угловая: A целиком + B без углового квадрата 600 (он уже в фронте A)
  assert.equal(ok({ shape: 'corner', walls: { A: 3000, B: 2000 }, ceiling: 2600 }).runMeters, 4.4);
  // П-образная: A + C целиком + B без двух угловых квадратов
  assert.equal(ok({ shape: 'u', walls: { A: 2400, B: 3000, C: 2400 }, ceiling: 2600 }).runMeters, 6.6);
  // остров: стена + длина острова
  assert.equal(ok({ shape: 'island', walls: { A: 3000 }, ceiling: 2600, island: { length: 1800, depth: 900 } }).runMeters, 4.8);
  // некратная длина и дверь: метры по фактическому фронту
  assert.equal(ok({ shape: 'straight', walls: { A: 3037 }, ceiling: 2600 }).runMeters, 3.04);
  assert.equal(ok({ shape: 'straight', walls: { A: 4000 }, ceiling: 2600, door: { wall: 'A', offset: 2600, width: 800 } }).runMeters, 3.2);
});

// --- устойчивость --------------------------------------------------------------
test('перебор размеров: раскладка всегда без наложений и с мойкой и плитой', () => {
  for (let a = 1800; a <= 5000; a += 137) {
    const r = ok({ shape: 'straight', walls: { A: a }, ceiling: 2600 });
    allWallsSane(r);
    assert.equal(sumWidths(all(wall(r, 'A'))), a, `A=${a}`);
    one(wall(r, 'A').lower, 'sink');
    one(wall(r, 'A').lower, 'stove');
  }
  for (let a = 1500; a <= 4000; a += 251) {
    for (let b = 1500; b <= 3500; b += 333) {
      const r = ok({ shape: 'corner', walls: { A: a, B: b }, ceiling: 2600, options: { tallUnit: true } });
      allWallsSane(r);
      assert.equal(sumWidths(all(wall(r, 'A'))) + sumWidths(all(wall(r, 'B'))), a + b - 600, `A=${a} B=${b}`);
    }
  }
});

// --- дверь у стыка: в плане модули соседней стены встают перед проёмом ---------
test('дверь ближе 600 мм к стыку: ok:false с field door (угловая и П-образная)', () => {
  const cases = [
    { shape: 'corner', walls: { A: 3000, B: 2000 }, door: { wall: 'B', offset: 0, width: 800 } },
    { shape: 'corner', walls: { A: 3000, B: 2000 }, door: { wall: 'A', offset: 2200, width: 800 } },
    { shape: 'u', walls: { A: 2400, B: 3000, C: 2400 }, door: { wall: 'B', offset: 2200, width: 800 } },
    { shape: 'u', walls: { A: 2400, B: 3000, C: 2400 }, door: { wall: 'C', offset: 0, width: 800 } },
    { shape: 'u', walls: { A: 2400, B: 3000, C: 2400 }, door: { wall: 'B', offset: 100, width: 800 } },
  ];
  for (const c of cases) {
    const e = err({ ...c, ceiling: 2600 }, 'door');
    assert.match(e.message, /угл|стык/i, 'сообщение объясняет про угол');
  }
});

test('дверь дальше 600 мм от стыка на угловой раскладывается без модулей в проёме', () => {
  const door = { wall: 'B', offset: 1000, width: 800 };
  const r = ok({ shape: 'corner', walls: { A: 3000, B: 2000 }, ceiling: 2600, door });
  allWallsSane(r);
  const b = wall(r, 'B');
  for (const m of all(b).concat(b.upper)) assert.ok(!overlaps(m, { x: 1000, width: 800 }));
});
