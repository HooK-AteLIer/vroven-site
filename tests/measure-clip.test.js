'use strict';
// Шов: site/assets/js/measure-clip.js — когда ролик «Доверяйте замеры» играет сам и что пишет кнопка.
const test = require('node:test');
const assert = require('node:assert/strict');
const mc = require('../site/assets/js/measure-clip.js');

test('shouldAutoplay: один раз при появлении блока', () => {
  assert.equal(mc.shouldAutoplay({ visible: true, played: false, reducedMotion: false }), true);
  assert.equal(mc.shouldAutoplay({ visible: true, played: true, reducedMotion: false }), false, 'второй раз сам не играет');
  assert.equal(mc.shouldAutoplay({ visible: false, played: false, reducedMotion: false }), false, 'вне экрана не играет');
});

test('shouldAutoplay: reduced-motion и Save-Data без автозапуска', () => {
  assert.equal(mc.shouldAutoplay({ visible: true, played: false, reducedMotion: true }), false);
  assert.equal(mc.shouldAutoplay({ visible: true, played: false, saveData: true }), false);
  assert.equal(mc.shouldAutoplay(undefined), false);
  assert.equal(mc.shouldAutoplay({}), false);
});

test('buttonLabel: до просмотра, во время и после', () => {
  assert.equal(mc.buttonLabel('idle'), 'Смотреть видео');
  assert.equal(mc.buttonLabel('ended'), 'Посмотреть ещё раз');
  assert.equal(mc.buttonLabel('playing'), null, 'во время показа кнопки нет');
  assert.equal(mc.buttonLabel('мусор'), 'Смотреть видео');
});

test('VISIBLE_RATIO: блок заметно на экране, но не целиком', () => {
  assert.ok(mc.VISIBLE_RATIO > 0.3 && mc.VISIBLE_RATIO < 0.9);
});

test('SELECTORS: общее имя data-once-* и прежнее data-measure-*', () => {
  for (const key of ['clip', 'play', 'label']) {
    assert.ok(mc.SELECTORS[key].includes(`[data-once-${key}]`));
    assert.ok(mc.SELECTORS[key].includes(`[data-measure-${key}]`), '#measure работает как раньше');
  }
});

test('index.html: облёт офиса в #commercial по правилам «один раз при появлении»', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '../site/index.html'), 'utf8');
  const fig = html.match(/<figure class="photo commercial-grid__photo"[\s\S]*?<\/figure>/);
  assert.ok(fig, 'фигура офиса на месте');
  const f = fig[0];
  assert.match(f, /data-once-clip/);
  assert.match(f, /<video[^>]*\bcontrols\b[^>]*\bmuted\b[^>]*\bplaysinline\b[^>]*preload="none"/);
  assert.match(f, /poster="assets\/img\/index\/repair-office\.webp"/);
  assert.match(f, /src="assets\/video\/office-orbit\.mp4"/);
  assert.match(f, /aria-label="Облёт камерой: офис со стойкой ресепшена, стеной хранения и стеклянной переговорной"/);
  assert.match(f, /data-once-play[\s\S]*data-once-label/);
  assert.match(f, /<figcaption>Визуализация проекта: офис<\/figcaption>/);
  assert.ok(fs.existsSync(path.join(__dirname, '../site/assets/video/office-orbit.mp4')), 'ролик лежит в site/assets/video');
});

test('index.html: ролик «вырастает гардеробная» в .wardrobes по правилам «один раз при появлении»', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '../site/index.html'), 'utf8');
  const sec = html.match(/<section class="wardrobes"[\s\S]*?<\/section>/);
  assert.ok(sec, 'секция шкафов на месте');
  const fig = sec[0].match(/<figure class="wardrobes__clip"[\s\S]*?<\/figure>/);
  assert.ok(fig, 'ролик внутри .wardrobes');
  const f = fig[0];
  assert.match(f, /data-once-clip/);
  assert.match(f, /<video[^>]*\bcontrols\b[^>]*\bmuted\b[^>]*\bplaysinline\b[^>]*preload="none"/);
  assert.match(f, /poster="assets\/img\/index\/wardrobe-reveal-poster\.jpg"/);
  assert.match(f, /src="assets\/video\/wardrobe-reveal\.mp4"/);
  assert.match(f, /aria-label="Видео: в нише по лазерному контуру собирается гардеробная"/);
  assert.match(f, /data-once-play[\s\S]*data-once-label/);
  for (const rel of ['../site/assets/video/wardrobe-reveal.mp4', '../site/assets/img/index/wardrobe-reveal-poster.jpg']) {
    assert.ok(fs.existsSync(path.join(__dirname, rel)), rel + ' на месте');
  }
  const kb = fs.statSync(path.join(__dirname, '../site/assets/video/wardrobe-reveal.mp4')).size / 1024;
  assert.ok(kb < 1100, 'ролик не тяжелее ~1 МБ');
});
