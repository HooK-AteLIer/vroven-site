/*
 * НА УРОВНЕ: ролики «один раз при появлении» на главной: «Доверяйте замеры» (#measure)
 * и облёт офиса в блоке коммерции (#commercial).
 * Разметка: обёртка [data-once-clip] с <video> и кнопкой [data-once-play] > [data-once-label];
 * прежние имена data-measure-* тоже понимаются.
 * Играет сам один раз, когда ролик заметно на экране, и замирает на последнем кадре.
 * Повтор по кнопке «Посмотреть ещё раз». Reduced-motion и Save-Data: только постер и кнопка.
 * Без JS у <video> остаются штатные controls.
 * Чистая часть (shouldAutoplay, buttonLabel, SELECTORS) тестируется в Node.
 */
(function (root) {
  'use strict';

  var VISIBLE_RATIO = 0.6;

  function shouldAutoplay(s) {
    if (!s || typeof s !== 'object') return false;
    return s.visible === true && s.played !== true && s.reducedMotion !== true && s.saveData !== true;
  }

  var LABELS = { idle: 'Смотреть видео', ended: 'Посмотреть ещё раз', playing: null };

  function buttonLabel(state) {
    return Object.prototype.hasOwnProperty.call(LABELS, state) ? LABELS[state] : LABELS.idle;
  }

  var SELECTORS = {
    clip: '[data-once-clip], [data-measure-clip]',
    play: '[data-once-play], [data-measure-play]',
    label: '[data-once-label], [data-measure-label]'
  };

  var api = { shouldAutoplay: shouldAutoplay, buttonLabel: buttonLabel, VISIBLE_RATIO: VISIBLE_RATIO, SELECTORS: SELECTORS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    return;
  }
  root.VROVEN = root.VROVEN || {};
  root.VROVEN.measureClip = api;
  root.VROVEN.onceClip = api;

  var doc = root.document;

  function mount(box) {
    var video = box.querySelector('video');
    var btn = box.querySelector(SELECTORS.play);
    var label = btn && btn.querySelector(SELECTORS.label);
    if (!video || !btn || !label) return;

    var mq = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var conn = root.navigator && root.navigator.connection;
    var played = false;

    video.removeAttribute('controls');
    video.loop = false;
    video.muted = true;

    function setState(state) {
      var text = buttonLabel(state);
      box.setAttribute('data-state', state);
      btn.hidden = text === null;
      if (text !== null) label.textContent = text;
    }

    function start() {
      played = true;
      if (video.ended) video.currentTime = 0;
      setState('playing');
      var p = video.play();
      // автозапуск запрещён браузером: остаётся постер и кнопка
      if (p && typeof p.catch === 'function') p.catch(function () { setState('idle'); });
    }

    btn.addEventListener('click', function () {
      video.currentTime = 0;
      start();
    });
    video.addEventListener('ended', function () { setState('ended'); });
    video.addEventListener('pause', function () { if (!video.ended) setState(played ? 'ended' : 'idle'); });

    setState('idle');

    if (!('IntersectionObserver' in root)) return;

    // заранее подгрузить метаданные, когда до блока остался экран
    var near = new IntersectionObserver(function (entries) {
      if (!entries.some(function (en) { return en.isIntersecting; })) return;
      near.disconnect();
      if (video.preload === 'none') video.preload = 'metadata';
    }, { rootMargin: '600px 0px' });
    near.observe(box);

    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var ok = shouldAutoplay({
          visible: en.isIntersecting && en.intersectionRatio >= VISIBLE_RATIO,
          played: played,
          reducedMotion: !!(mq && mq.matches),
          saveData: !!(conn && conn.saveData)
        });
        if (!ok) return;
        seen.disconnect();
        start();
      });
    }, { threshold: [0, VISIBLE_RATIO] });
    seen.observe(video);
  }

  function init() {
    Array.prototype.forEach.call(doc.querySelectorAll(SELECTORS.clip), mount);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : this);
