'use strict';
// Шов: site/assets/js/lead.js (текст заявки и ссылки WhatsApp / tel).
const test = require('node:test');
const assert = require('node:assert/strict');
const lead = require('../site/assets/js/lead.js');

const KINDS = ['general', 'repair', 'bundle', 'kitchen', 'job'];

function assertClean(text) {
  assert.equal(typeof text, 'string');
  assert.ok(text.length > 0, 'текст не пустой');
  assert.doesNotMatch(text, /undefined|null|NaN|\[object/, 'нет мусора от пустых полей');
  assert.doesNotMatch(text, /—/, 'нет длинного тире');
  for (const line of text.split('\n')) {
    assert.doesNotMatch(line, /:\s*$/, 'нет строк «Поле:» без значения: ' + line);
  }
}

test('telUrl ведёт на общий номер', () => {
  assert.equal(lead.telUrl(), 'tel:+79124100001');
});

test('whatsappUrl кодирует текст целиком', () => {
  const url = lead.whatsappUrl('А&б?\nв 5 ₽');
  assert.equal(url, 'https://wa.me/79124100001?text=%D0%90%26%D0%B1%3F%0A%D0%B2%205%20%E2%82%BD');
});

test('whatsappUrl: decodeURIComponent возвращает исходный многострочный текст', () => {
  const text = lead.buildMessage('general', { name: 'Ольга', task: 'Кухня + ремонт #2' }, 'Тюмень');
  const url = lead.whatsappUrl(text);
  assert.match(url, /^https:\/\/wa\.me\/79124100001\?text=[^\s#&]+$/);
  assert.equal(decodeURIComponent(url.split('?text=')[1]), text);
});

test('general: имя, телефон, город и задача', () => {
  const text = lead.buildMessage('general', { name: 'Ольга', phone: '+7 900 000 00 00', task: 'Ремонт ванной' }, 'Тюмень');
  assertClean(text);
  assert.match(text, /Ольга/);
  assert.match(text, /\+7 900 000 00 00/);
  assert.match(text, /Город: Тюмень/);
  assert.match(text, /Ремонт ванной/);
  assert.ok(text.split('\n').length >= 3, 'многострочный');
});

test('general без полей: только приветствие и город, без пустых строк «Имя:»', () => {
  const text = lead.buildMessage('general', {}, 'Нижневартовск');
  assertClean(text);
  assert.match(text, /Нижневартовск/);
  assert.doesNotMatch(text, /Имя|Телефон|Задача/);
});

test('repair: объект, тип ремонта, площадь, потолок, вилка цены', () => {
  const text = lead.buildMessage('repair', {
    objectName: 'Квартира', repairName: 'Капитальный', area: 52, ceiling: 2700, min: 618800, max: 837200
  }, 'Тюмень');
  assertClean(text);
  assert.match(text, /Квартира/);
  assert.match(text, /Капитальный/);
  assert.match(text, /52 м²/);
  assert.match(text, /2 700 мм/);
  assert.match(text, /618 800/);
  assert.match(text, /837 200 ₽/);
});

test('repair без цены (по смете): строки цены нет', () => {
  const text = lead.buildMessage('repair', { objectName: 'Кафе, ресторан', repairName: 'Капитальный', area: 120 }, 'Нижневартовск');
  assertClean(text);
  assert.match(text, /120 м²/);
  assert.doesNotMatch(text, /₽/);
});

test('bundle: ремонт, мебель списком, скидка и экономия', () => {
  const text = lead.buildMessage('bundle', {
    repairName: 'Дизайнерский', area: 60,
    furniture: [{ name: 'Кухня', meters: 3.2 }, { name: 'Шкаф-купе', meters: 2 }],
    discountPct: 15, savings: 21000, total: 1200000
  }, 'Тюмень');
  assertClean(text);
  assert.match(text, /Дизайнерский/);
  assert.match(text, /60 м²/);
  assert.match(text, /Кухня, 3,2 п\.м\./);
  assert.match(text, /Шкаф-купе, 2 п\.м\./);
  assert.match(text, /15%/);
  assert.match(text, /21 000 ₽/);
  assert.match(text, /1 200 000 ₽/);
});

test('kitchen: форма, стены в мм, потолок, стиль, цвет, город, ссылка на проект', () => {
  const text = lead.buildMessage('kitchen', {
    shapeName: 'Угловая', walls: { A: 3000, B: 2400 }, ceiling: 2700,
    styleName: 'Неоклассика', colorName: 'Шалфей', runMeters: 5.4, price: 146880,
    withRepair: true, link: 'https://example.test/kitchen.html#style=neoclassic'
  }, 'Нижневартовск');
  assertClean(text);
  assert.match(text, /Угловая/);
  assert.match(text, /A 3 000 мм/);
  assert.match(text, /B 2 400 мм/);
  assert.doesNotMatch(text, /C\s/, 'нет пустой стены C');
  assert.match(text, /2 700 мм/);
  assert.match(text, /Неоклассика/);
  assert.match(text, /Шалфей/);
  assert.match(text, /Город: Нижневартовск/);
  assert.match(text, /146 880 ₽/);
  assert.match(text, /#style=neoclassic/);
});

test('job: вакансия, имя, телефон, город', () => {
  const text = lead.buildMessage('job', { position: 'Плиточник', name: 'Иван', phone: '89000000000', experience: '7 лет' }, 'Нижневартовск');
  assertClean(text);
  assert.match(text, /Плиточник/);
  assert.match(text, /Иван/);
  assert.match(text, /89000000000/);
  assert.match(text, /7 лет/);
  assert.match(text, /Нижневартовск/);
});

test('у каждого kind своё первое предложение', () => {
  const firsts = KINDS.map((k) => lead.buildMessage(k, {}, 'Тюмень').split('\n')[0]);
  for (const f of firsts) assert.ok(f.length > 0);
  assert.equal(new Set(firsts).size, KINDS.length);
});

test('пустые и нулевые числа не попадают в текст', () => {
  const text = lead.buildMessage('repair', { objectName: 'Квартира', area: 0, ceiling: '', min: null, max: undefined }, 'Тюмень');
  assertClean(text);
  assert.doesNotMatch(text, /Площадь|Потолок|₽/);
});

test('неизвестный kind даёт общую заявку', () => {
  assert.equal(lead.buildMessage('???', { name: 'Ольга' }, 'Тюмень'), lead.buildMessage('general', { name: 'Ольга' }, 'Тюмень'));
});
