'use strict';
// Веер стилей кухни: чистые расчёты VROVEN.kitchenFan (слоты, коэффициенты, видимые карточки).
// Ожидаемые числа взяты из таска 13 и оригинального компонента card-fan-carousel.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const fan = require(path.join(__dirname, '..', 'site', 'assets', 'js', 'kitchen-fan.js'));

test('7 слотов веера: поворот, масштаб, x и y в rem, слой', () => {
  const want = [
    [-21, 0.7756, -30, 7.3, 1],
    [-14, 0.8498, -22, 4.0, 2],
    [-7, 0.9346, -11, 1.3, 3],
    [0, 1, 0, 0, 10],
    [7, 0.9346, 11, 1.3, 3],
    [14, 0.8498, 22, 4.0, 2],
    [21, 0.7756, 30, 7.3, 1]
  ];
  assert.equal(fan.SLOTS.length, 7);
  fan.SLOTS.forEach((s, i) => {
    assert.deepEqual([s.rot, s.scale, s.x, s.y, s.z], want[i], 'слот ' + i);
  });
});

test('коэффициент ширины экрана для x', () => {
  const cases = [[360, 0.28], [479, 0.28], [480, 0.38], [639, 0.38], [640, 0.5], [767, 0.5],
    [768, 0.75], [1023, 0.75], [1024, 1], [1440, 1]];
  cases.forEach(([w, k]) => assert.equal(fan.widthFactor(w), k, 'ширина ' + w));
});

test('коэффициент высоты: 1, пока веер помещается в 70% окна, иначе сжатие', () => {
  assert.equal(fan.heightFactor(400, 1000), 1);
  assert.equal(fan.heightFactor(700, 1000), 1);
  assert.equal(fan.heightFactor(1400, 1000), 0.5);
});

test('видимые карточки: 7 из 8 по кругу, центр 0', () => {
  assert.deepEqual(fan.visibleMap(8, 0), [5, 6, 7, 0, 1, 2, 3]);
});

test('видимые карточки: 7 из 8 по кругу, центр 7', () => {
  assert.deepEqual(fan.visibleMap(8, 7), [4, 5, 6, 7, 0, 1, 2]);
});

test('видимые карточки: меньше 7 стилей, слоты без карточки пустые', () => {
  assert.deepEqual(fan.visibleMap(3, 0), [null, null, 2, 0, 1, null, null]);
});

test('шаг по кругу: кратчайшее направление', () => {
  assert.equal(fan.circularDelta(8, 0, 7), -1);
  assert.equal(fan.circularDelta(8, 7, 0), 1);
  assert.equal(fan.circularDelta(8, 2, 5), 3);
  assert.equal(fan.circularDelta(8, 5, 2), -3);
});

test('наведение: соседи раздвигаются по формуле оригинала, крайние стоят', () => {
  // наведение на центр (слот 3): соседи слотов 2 и 4, |norm| = 1/3, distance 1
  const off = fan.hoverOffsets(3, 1);
  const near = 8 * (1 - 1 / 3) * (1 + 0.2 * 2);
  assert.ok(Math.abs(off[4].x - near) < 1e-9, 'справа ' + off[4].x);
  assert.ok(Math.abs(off[2].x + near) < 1e-9, 'слева ' + off[2].x);
  assert.equal(off[4].rot, 3 / 2);
  assert.equal(off[2].rot, -3 / 2);
  assert.ok(Math.abs(off[3].y + 2.5) < 1e-9, 'карточка под курсором поднимается');
  assert.equal(off[3].scale, 1.08);
  assert.equal(off[0].x, 0, 'крайняя не сдвигается');
  assert.ok(Math.abs(off[5].delay - 0.04) < 1e-9, 'задержка distance*0.02');
  // коэффициент ширины множит сдвиг
  assert.ok(Math.abs(fan.hoverOffsets(3, 0.5)[4].x - near * 0.5) < 1e-9);
});
