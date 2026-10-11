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

// ---- раскрытие всей кухни при наведении (таск 14) ----------------------------

const fs = require('node:fs');
const styles = require(path.join(__dirname, '..', 'site', 'assets', 'js', 'kitchen-styles.js'));

// Таск 15: раскрытие в выбранном цвете — фото всей кухни у каждого цвета, а не у стиля.
test('у каждого цвета фото всей кухни в этом цвете, webp до 150 КБ', () => {
  let count = 0;
  styles.forEach((s) => {
    assert.equal(s.scene, undefined, s.id + ': фото всей кухни теперь у цветов');
    s.colors.forEach((c) => {
      const want = 'assets/img/kitchens/' + s.id + '--' + c.id + '.webp';
      assert.equal(c.scene, want, s.id + '/' + c.id);
      const file = path.join(__dirname, '..', 'site', c.scene);
      assert.ok(fs.existsSync(file), want + ': файл');
      assert.ok(fs.statSync(file).size <= 150 * 1024, want + ': до 150 КБ');
      count++;
    });
  });
  assert.equal(count, 24);
});

const near = (a, b) => Math.abs(a - b) < 0.01;
const RATIO = 1024 / 688;

test('раскрытие на десктопе: 720 px по ширине, 3:2 без обрезки, по центру веера', () => {
  const b = fan.revealBox({ vw: 1440, vh: 900, minTop: 84, cx: 922, cy: 500, ratio: RATIO });
  assert.ok(near(b.width, 720), 'ширина ' + b.width);
  assert.ok(near(b.height, 720 / RATIO), 'высота ' + b.height);
  assert.ok(near(b.left, 922 - 360));
  assert.ok(near(b.top, 500 - b.height / 2));
});

test('раскрытие на низком окне: высота влезает под шапку, ширина уменьшается в пропорции', () => {
  // доступно по высоте 560 - 84 - 16 = 460 (460 * 1.49 < 720)
  const b = fan.revealBox({ vw: 1024, vh: 560, minTop: 84, cx: 700, cy: 300, ratio: RATIO });
  assert.ok(near(b.height, 460), 'высота ' + b.height);
  assert.ok(near(b.width, 460 * RATIO));
  assert.ok(near(b.top, 84), 'не заходит под шапку');
  assert.ok(b.left >= 16 && b.left + b.width <= 1024 - 16, 'в пределах окна по ширине');
});

test('раскрытие у края окна прижимается внутрь, на узком экране по ширине окна', () => {
  const edge = fan.revealBox({ vw: 1024, vh: 900, minTop: 84, cx: 1000, cy: 880, ratio: RATIO });
  assert.ok(near(edge.left + edge.width, 1024 - 16), 'справа поле 16');
  assert.ok(near(edge.top + edge.height, 900 - 16), 'снизу поле 16');
  const phone = fan.revealBox({ vw: 360, vh: 740, minTop: 84, cx: 180, cy: 400, ratio: RATIO });
  assert.ok(near(phone.width, 328) && near(phone.left, 16));
});

// ---- плавность раскрытия (таск 15): FLIP вместо анимации размеров -----------------

test('FLIP: transform переводит итоговый бокс раскрытия в прямоугольник карточки', () => {
  const box = { left: 570, top: 213, width: 720, height: 484 };
  const card = { left: 840, top: 300, width: 180, height: 225 };
  const t = fan.flipTransform(card, box);
  // при transform-origin 0 0: left' = box.left + x, ширина' = box.width * sx
  assert.equal(t.x, 270);
  assert.equal(t.y, 87);
  assert.equal(t.sx, 0.25);
  assert.ok(Math.abs(t.sy - 225 / 484) < 1e-9);
  assert.equal(fan.flipTransform(box, box).x, 0, 'на месте — без сдвига');
});
