'use strict';
// Гармошка стилей кухни (таск 28): чистая часть VROVEN.kitchenAccordion —
// шаг стрелками, какая полоса раскрыта, какое фото у полосы, предзагрузка, повтор загрузки.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const acc = require(path.join(ROOT, 'site', 'assets', 'js', 'kitchen-accordion.js'));
const styles = require(path.join(ROOT, 'site', 'assets', 'js', 'kitchen-styles.js'));

// ---- клавиатура: ←/→ по кругу, Home/End ---------------------------------------------

test('стрелка вправо: следующий стиль, с последнего — на первый', () => {
  assert.equal(acc.stepIndex(8, 0, 'ArrowRight'), 1);
  assert.equal(acc.stepIndex(8, 4, 'ArrowRight'), 5);
  assert.equal(acc.stepIndex(8, 7, 'ArrowRight'), 0);
});

test('стрелка влево: предыдущий стиль, с первого — на последний', () => {
  assert.equal(acc.stepIndex(8, 3, 'ArrowLeft'), 2);
  assert.equal(acc.stepIndex(8, 0, 'ArrowLeft'), 7);
});

test('Home и End: первый и последний стиль', () => {
  assert.equal(acc.stepIndex(8, 5, 'Home'), 0);
  assert.equal(acc.stepIndex(8, 2, 'End'), 7);
});

test('прочие клавиши и пустой список: null, клавишу не перехватываем', () => {
  assert.equal(acc.stepIndex(8, 2, 'Tab'), null);
  assert.equal(acc.stepIndex(8, 2, 'ArrowUp'), null);
  assert.equal(acc.stepIndex(0, 0, 'ArrowRight'), null);
});

// ---- какая полоса раскрыта ----------------------------------------------------------

test('раскрыта: наведение мышью, иначе фокус с клавиатуры, иначе выбранный стиль', () => {
  assert.equal(acc.openIndex(2, null, null), 2);
  assert.equal(acc.openIndex(2, 5, null), 5);
  assert.equal(acc.openIndex(2, null, 6), 6);
  assert.equal(acc.openIndex(2, 5, 6), 5, 'мышь важнее фокуса');
  assert.equal(acc.openIndex(2, 0, null), 0, 'нулевой индекс — тоже наведение');
});

test('телефон: вертикальный список до 720 px включительно', () => {
  assert.equal(acc.isPhone(360), true);
  assert.equal(acc.isPhone(720), true);
  assert.equal(acc.isPhone(721), false);
  assert.equal(acc.isPhone(1440), false);
});

// ---- фото полосы по стилю и цвету -----------------------------------------------------

const loft = styles.find((s) => s.id === 'loft');
const provence = styles.find((s) => s.id === 'provence');

test('фото выбранного стиля — сцена в выбранном цвете', () => {
  assert.equal(acc.photoFor(loft, 'loft', 'concrete-oak'), 'assets/img/kitchens/loft--concrete-oak.webp');
  assert.equal(acc.photoFor(loft, 'loft', 'graphite-wood'), 'assets/img/kitchens/loft--graphite-wood.webp');
});

test('фото невыбранного стиля — сцена основного (первого) цвета', () => {
  assert.equal(acc.photoFor(provence, 'loft', 'concrete-oak'), 'assets/img/kitchens/provence--lavender.webp');
});

test('неизвестный цвет выбранного стиля — основной цвет, без фото — null', () => {
  assert.equal(acc.photoFor(loft, 'loft', 'nope'), 'assets/img/kitchens/loft--dark-oak.webp');
  assert.equal(acc.photoFor({ id: 'x', colors: [{ id: 'a' }] }, 'x', 'a'), null);
});

test('предзагрузка: сцены выбранного стиля во всех цветах, текущий первым, без повторов', () => {
  assert.deepEqual(acc.preloadList(provence, 'mint'), [
    'assets/img/kitchens/provence--mint.webp',
    'assets/img/kitchens/provence--lavender.webp',
    'assets/img/kitchens/provence--milk.webp'
  ]);
  assert.deepEqual(acc.preloadList(loft, 'nope'), [
    'assets/img/kitchens/loft--dark-oak.webp',
    'assets/img/kitchens/loft--concrete-oak.webp',
    'assets/img/kitchens/loft--graphite-wood.webp'
  ]);
});

// ---- данные и страница ----------------------------------------------------------------

test('у каждого стиля короткое описание для раскрытой полосы (blurb до 120 знаков)', () => {
  assert.equal(styles.length, 8);
  styles.forEach((s) => {
    assert.equal(typeof s.blurb, 'string', s.id);
    assert.ok(s.blurb.length > 10 && s.blurb.length <= 120, s.id + ': ' + s.blurb.length);
  });
});

test('kitchen.html подключает гармошку, веера больше нет', () => {
  const html = fs.readFileSync(path.join(ROOT, 'site', 'kitchen.html'), 'utf8');
  assert.match(html, /<script defer src="assets\/js\/kitchen-accordion\.js"><\/script>/);
  assert.doesNotMatch(html, /kitchen-fan|kd-fan/);
  assert.ok(html.indexOf('kitchen-accordion.js') < html.indexOf('kitchen-app.js'), 'гармошка до kitchen-app.js');
  assert.equal(fs.existsSync(path.join(ROOT, 'site', 'assets', 'js', 'kitchen-fan.js')), false);
  const css = fs.readFileSync(path.join(ROOT, 'site', 'assets', 'css', 'kitchen.css'), 'utf8');
  assert.doesNotMatch(css, /kd-fan|kd-reveal/);
});

// ---- фото всей кухни у каждого цвета (таск 15) ----------------------------------------

test('у каждого цвета фото всей кухни в этом цвете, webp до 150 КБ', () => {
  let count = 0;
  styles.forEach((s) => {
    assert.equal(s.scene, undefined, s.id + ': фото всей кухни у цветов');
    s.colors.forEach((c) => {
      const want = 'assets/img/kitchens/' + s.id + '--' + c.id + '.webp';
      assert.equal(c.scene, want, s.id + '/' + c.id);
      const file = path.join(ROOT, 'site', c.scene);
      assert.ok(fs.existsSync(file), want + ': файл');
      assert.ok(fs.statSync(file).size <= 150 * 1024, want + ': до 150 КБ');
      count++;
    });
  });
  assert.equal(count, 24);
});

// ---- повтор загрузки фото (таск 16) ---------------------------------------------------

test('retryUrl: ?r=N против кеша ошибки, с уже имеющимся параметром — через &', () => {
  assert.equal(acc.retryUrl('a.webp', 0), 'a.webp');
  assert.equal(acc.retryUrl('a.webp', 2), 'a.webp?r=2');
  assert.equal(acc.retryUrl('a.webp?v=1', 1), 'a.webp?v=1&r=1');
});

function fakeRun(results, opts) {
  const calls = [], waits = [];
  let out = null;
  const load = (url, cb) => { calls.push(url); cb(results[calls.length - 1] ? null : new Error('reset')); };
  const wait = (fn, ms) => { waits.push(ms); fn(); };
  acc.loadWithRetry('s.webp', load, (err, url) => { out = { err, url }; }, Object.assign({ wait }, opts));
  return { calls, waits, out };
}

test('loadWithRetry: 2 повтора с паузами 400 и 1200 мс, затем ошибка', () => {
  const r = fakeRun([false, false, false, true]);
  assert.deepEqual(r.calls, ['s.webp', 's.webp?r=1', 's.webp?r=2']);
  assert.deepEqual(r.waits, [400, 1200]);
  assert.ok(r.out.err instanceof Error);
});

test('loadWithRetry: успех со 2-й попытки отдаёт рабочий адрес', () => {
  const r = fakeRun([false, true]);
  assert.deepEqual(r.calls, ['s.webp', 's.webp?r=1']);
  assert.deepEqual(r.out, { err: null, url: 's.webp?r=1' });
});

test('loadWithRetry: после уже случившейся ошибки (first: 1) — сразу повторы', () => {
  const r = fakeRun([false, false], { first: 1 });
  assert.deepEqual(r.calls, ['s.webp?r=1', 's.webp?r=2']);
  assert.deepEqual(r.waits, [400, 1200]);
  assert.ok(r.out.err);
});
