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
