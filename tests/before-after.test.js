'use strict';
// Шов: site/assets/js/before-after.js — чистая логика шторки «до/после» (без DOM).
const test = require('node:test');
const assert = require('node:assert/strict');
const ba = require('../site/assets/js/before-after.js');

test('clamp держит позицию в 0–100 и отсекает мусор', () => {
  assert.equal(ba.clamp(50), 50);
  assert.equal(ba.clamp(-12), 0);
  assert.equal(ba.clamp(140), 100);
  assert.equal(ba.clamp(NaN), 50);
  assert.equal(ba.clamp(undefined), 50);
});

test('fromPointer переводит координату указателя в проценты ширины', () => {
  assert.equal(ba.fromPointer(150, 100, 400), 12.5);
  assert.equal(ba.fromPointer(50, 100, 400), 0);    // левее шторки
  assert.equal(ba.fromPointer(900, 100, 400), 100); // правее шторки
  assert.equal(ba.fromPointer(150, 100, 0), 50);    // ширина ещё не посчитана
});

test('keyStep: стрелки ±5 %, Home/End к краям, прочие клавиши не трогаем', () => {
  assert.equal(ba.keyStep('ArrowLeft', 50), 45);
  assert.equal(ba.keyStep('ArrowRight', 50), 55);
  assert.equal(ba.keyStep('ArrowLeft', 3), 0);
  assert.equal(ba.keyStep('ArrowRight', 98), 100);
  assert.equal(ba.keyStep('Home', 70), 0);
  assert.equal(ba.keyStep('End', 20), 100);
  assert.equal(ba.keyStep('Enter', 50), null);
  assert.equal(ba.keyStep('a', 50), null);
  assert.equal(ba.STEP, 5);
});
