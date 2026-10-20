/*
 * НА УРОВНЕ: шторка «до/после» ([data-before-after]).
 * Позиция шторки в процентах ширины лежит в CSS-переменной --pos (без JS остаётся 50%).
 * Мышь и палец через pointer events; touch-action: pan-y в CSS оставляет вертикальную прокрутку.
 * Клавиатура на ручке: ←/→ ±5 %, Home/End к краям.
 * При первом появлении в зоне видимости ручка дважды «кивает» (кроме prefers-reduced-motion).
 *
 * Чистая логика (для node --test):
 *   clamp(p) → 0–100, мусор → 50
 *   fromPointer(clientX, left, width) → проценты
 *   keyStep(key, current) → новая позиция или null, если клавиша не наша
 */
(function (root) {
  'use strict';

  var STEP = 5;
  var MIDDLE = 50;

  function clamp(p) {
    if (typeof p !== 'number' || isNaN(p)) return MIDDLE;
    return Math.max(0, Math.min(100, p));
  }

  function fromPointer(clientX, left, width) {
    if (!(width > 0)) return MIDDLE;
    return clamp((clientX - left) / width * 100);
  }

  function keyStep(key, current) {
    if (key === 'ArrowLeft' || key === 'ArrowDown') return clamp(current - STEP);
    if (key === 'ArrowRight' || key === 'ArrowUp') return clamp(current + STEP);
    if (key === 'Home') return 0;
    if (key === 'End') return 100;
    return null;
  }

  var api = { clamp: clamp, fromPointer: fromPointer, keyStep: keyStep, STEP: STEP };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    return;
  }

  root.VROVEN = root.VROVEN || {};
  root.VROVEN.beforeAfter = api;

  var doc = root.document;

  function mount(box) {
    var handle = box.querySelector('[data-ba-handle]');
    if (!handle) return;
    var pos = MIDDLE;
    var dragging = false;

    function set(p) {
      pos = clamp(p);
      box.style.setProperty('--pos', pos + '%');
      var rounded = Math.round(pos);
      handle.setAttribute('aria-valuenow', String(rounded));
      handle.setAttribute('aria-valuetext', 'До ремонта ' + rounded + ' %');
    }

    function stopHint() { box.classList.remove('is-hint'); }

    function moveTo(clientX) {
      var r = box.getBoundingClientRect();
      set(fromPointer(clientX, r.left, r.width));
    }

    box.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      stopHint();
      if (box.setPointerCapture) {
        try { box.setPointerCapture(e.pointerId); } catch (err) { /* указатель уже отпущен */ }
      }
      moveTo(e.clientX);
      if (e.pointerType === 'mouse') {
        e.preventDefault(); // без выделения текста; фокус ставим сами
        handle.focus({ preventScroll: true });
      }
    });
    box.addEventListener('pointermove', function (e) { if (dragging) moveTo(e.clientX); });
    function end() { dragging = false; }
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end); // браузер забрал жест под вертикальную прокрутку
    box.addEventListener('lostpointercapture', end);

    handle.addEventListener('keydown', function (e) {
      var next = keyStep(e.key, pos);
      if (next === null) return;
      e.preventDefault();
      stopHint();
      set(next);
    });

    set(MIDDLE);

    // Кивок ручки: один раз, при первом появлении в зоне видимости.
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in root)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.disconnect();
        if (!dragging) box.classList.add('is-hint');
      });
    }, { threshold: 0.6 });
    io.observe(box);
    handle.addEventListener('animationend', stopHint);
  }

  function init() {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-before-after]'), mount);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : this);
