/*
 * НА УРОВНЕ: блок «Дизайн-проект» ([data-layers]), переключатели слоёв визуализации.
 * Три слоя: материалы, свет, мебель и декор. 8 картинок v{m}{l}{o}.webp, v111 = всё включено.
 * Без JS видна v111 из разметки, переключатели скрыты атрибутом hidden (скрипт его снимает).
 * Остальные 7 картинок создаются, когда секция близко к экрану или при первом касании/фокусе.
 * Новая картинка проявляется только после загрузки (opacity в CSS, без движения при reduced-motion).
 *
 * Чистая логика (для node --test):
 *   variantKey(bits) → '101' (мусор → '111')
 *   altText(key) → описание состояния для alt
 *   sources(key) → { src, srcset }
 */
(function (root) {
  'use strict';

  var DIR = 'assets/img/index/layers/';
  var FULL = '111';
  var KEYS = ['000', '100', '010', '001', '110', '101', '011', '111'];
  var ALT = {
    m: ['белый макет', 'материалы'],
    l: ['ровный дневной свет', 'вечерний свет и подсветка'],
    o: ['без мебели и декора', 'с мебелью и декором']
  };

  function variantKey(bits) {
    if (!bits || typeof bits.length !== 'number') return FULL;
    var key = '';
    for (var i = 0; i < 3; i++) key += bits[i] ? '1' : '0';
    return key;
  }

  function normalize(key) {
    return typeof key === 'string' && /^[01]{3}$/.test(key) ? key : FULL;
  }

  function altText(key) {
    var k = normalize(key);
    return 'Гостиная: ' + ALT.m[+k[0]] + ', ' + ALT.l[+k[1]] + ', ' + ALT.o[+k[2]];
  }

  function sources(key) {
    var k = normalize(key);
    return {
      src: DIR + 'v' + k + '.webp',
      srcset: DIR + 'v' + k + '-sm.webp 640w, ' + DIR + 'v' + k + '.webp 1024w'
    };
  }

  var api = { variantKey: variantKey, altText: altText, sources: sources, KEYS: KEYS, FULL: FULL };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    return;
  }

  root.VROVEN = root.VROVEN || {};
  root.VROVEN.designLayers = api;

  var doc = root.document;

  function mount(box) {
    var view = box.querySelector('[data-layers-view]');
    var first = view && view.querySelector('img');
    var panel = box.querySelector('[data-layers-toggles]');
    if (!first || !panel) return;
    var inputs = panel.querySelectorAll('input[data-bit]');
    var imgs = {};
    imgs[first.getAttribute('data-v') || FULL] = first;
    var start = first.getAttribute('data-v') || FULL; // с чего начинает блок: сейчас всё выключено (000)
    var current = start;
    var wanted = start;
    var created = false;

    function readKey() {
      var bits = [];
      Array.prototype.forEach.call(inputs, function (input) {
        bits[+input.getAttribute('data-bit')] = input.checked;
      });
      return variantKey(bits);
    }

    // Остальные варианты: одной пачкой, ленивые запросы браузер отправит сразу.
    function ensure() {
      if (created) return;
      created = true;
      KEYS.forEach(function (key) {
        if (imgs[key]) return;
        var s = sources(key);
        var img = doc.createElement('img');
        img.className = 'layers__img';
        img.setAttribute('data-v', key);
        img.width = 1024;
        img.height = 688;
        img.decoding = 'async';
        img.alt = '';
        img.addEventListener('load', function () { if (key === wanted) show(key); });
        // без src: с ним браузер запрашивал и полную, и миниатюру; srcset выбирает одну
        view.insertBefore(img, first);
        img.setAttribute('sizes', first.getAttribute('sizes'));
        img.setAttribute('srcset', s.srcset);
        imgs[key] = img;
      });
    }

    function ready(img) { return img.complete && img.naturalWidth > 0; }

    function show(key) {
      var img = imgs[key];
      if (!img || !ready(img) || key === current) return;
      Object.keys(imgs).forEach(function (k) {
        var on = k === key;
        imgs[k].classList.toggle('is-on', on);
        imgs[k].alt = on ? altText(k) : '';
      });
      current = key;
    }

    function update() {
      ensure();
      wanted = readKey();
      show(wanted); // не загружена: покажется по событию load
    }

    Array.prototype.forEach.call(inputs, function (input) {
      input.addEventListener('change', update);
    });
    panel.addEventListener('pointerenter', ensure);
    panel.addEventListener('focusin', ensure);
    panel.addEventListener('touchstart', ensure, { passive: true });

    first.addEventListener('load', function () { if (wanted === start) show(start); });
    first.classList.add('is-on');
    first.alt = altText(start);
    panel.hidden = false;

    if ('IntersectionObserver' in root) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.disconnect();
          ensure();
        });
      }, { rootMargin: '300px 0px' });
      io.observe(box);
    }
  }

  function init() {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-layers]'), mount);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : this);
