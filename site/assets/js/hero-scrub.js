/*
 * ВРОВЕНЬ: герой главной, ролик прокручивается скроллом.
 * Стандарт 10k (scrub-pipeline): видео целиком в Blob с кольцом загрузки, rAF-цикл с lerp,
 * который засыпает, seek без наложений, запись в DOM только при изменении,
 * полосы подписей по прогрессу скролла, статичный герой по пяти условиям (решается вживую).
 * Цена «от» в финальной посадке берётся из VROVEN.data по выбранному городу.
 */
(function (root, doc) {
  'use strict';

  var V = root.VROVEN = root.VROVEN || {};
  var hero = doc.querySelector('[data-hero]');
  if (!hero) return;

  var VIDEO_URL = 'assets/video/hero-scrub.mp4';
  var VIDEO_BYTES = 5547394;           // запасной размер, если хостинг не отдаёт Content-Length
  var POSTER_URL = 'assets/img/hero/hero-start.jpg';
  var RING_LEN = 126;

  // Пять условий статичного героя. Первое по таску: ширина < 768 px.
  var GATES = [
    '(max-width: 767px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];

  var stage = hero.querySelector('.hero__stage');
  var video = hero.querySelector('[data-hero-video]');
  var posterLayer = hero.querySelector('[data-hero-poster]');
  var cue = hero.querySelector('.hero__cue');
  var cueText = hero.querySelector('.hero__cue-text');

  /* ---------- цена «от» ---------- */

  function renderPrice() {
    var data = V.data;
    if (!data || !V.format) return;
    var cityId = V.city ? V.city.get() : data.defaultCity;
    var rates = data.repairPrices[cityId] && data.repairPrices[cityId].apartment;
    var from = null;
    if (rates) {
      Object.keys(rates).forEach(function (k) {
        var r = rates[k];
        if (r && r.value && (!from || r.value < from.value)) from = r;
      });
    }
    var kitchen = null;
    (data.furnitureItems || []).forEach(function (it) { if (it.id === 'kitchen') kitchen = it.perMeter; });

    var repairEl = hero.querySelector('[data-hero-price="repair"]');
    var kitchenEl = hero.querySelector('[data-hero-price="kitchen"]');
    var badge = hero.querySelector('[data-hero-badge]');
    if (repairEl) repairEl.textContent = from ? 'Ремонт от ' + V.format.rub(from.value) + ' за м²' : 'Ремонт по смете после замера';
    if (kitchenEl) kitchenEl.textContent = kitchen ? 'кухня от ' + V.format.rub(kitchen.value) + ' за п.м.' : 'кухня по смете';
    if (badge) badge.hidden = !((from && from.placeholder) || (kitchen && kitchen.placeholder));
  }
  renderPrice();
  doc.addEventListener('vroven:city', renderPrice);

  /* ---------- разбивка текста на слова (один раз, с постоянным «случайным» разбросом) ---------- */

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function splitWords(el, seed) {
    // делим только по обычным пробелам: неразрывный пробел держит «по одному» вместе
    var text = el.textContent.replace(/[ \t\r\n]+/g, ' ').trim();
    var words = text.split(' ');
    var rand = rng(seed);
    var sr = doc.createElement('span');
    sr.className = 'visually-hidden';
    sr.textContent = text;
    var vis = doc.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    words.forEach(function (w, i) {
      var span = doc.createElement('span');
      span.className = 'w';
      span.textContent = w;
      var th = (words.length > 1 ? i / (words.length - 1) : 0) * 0.42 + rand() * 0.05;
      span.style.setProperty('--th', th.toFixed(3));
      var dir = i % 2 ? 1 : -1;
      span.style.setProperty('--jx', Math.round(dir * (40 + rand() * 50)) + 'px');
      vis.appendChild(span);
      if (i < words.length - 1) vis.appendChild(doc.createTextNode(' '));
    });
    el.textContent = '';
    el.appendChild(sr);
    el.appendChild(vis);
  }
  hero.querySelectorAll('[data-split]').forEach(function (el, i) { splitWords(el, 7919 * (i + 1)); });

  /* ---------- полосы подписей ---------- */

  var bands = Array.prototype.map.call(hero.querySelectorAll('[data-band]'), function (el, i, all) {
    var r = el.getAttribute('data-band').split(' ').map(Number);
    return { el: el, a: r[0], b: r[1], first: i === 0, last: i === all.length - 1, ramp: Number(el.getAttribute('data-ramp')) || 0, op: -1, k: -1, live: null };
  });

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function smoothstep(p, e0, e1) {
    var t = clamp((p - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  var loadK = 0;   // одноразовая сборка первой полосы при загрузке
  var loadStart = 0;

  function updateCaptions(p) {
    bands.forEach(function (bd) {
      var a = bd.a, b = bd.b;
      var f = Math.min(0.045, (b - a) / 3);
      // первая полоса открыта сразу, последняя не уходит
      var inn = bd.first ? 1 : smoothstep(p, a, a + f);
      var out = bd.last ? 1 : 1 - smoothstep(p, b - f, b);
      var op = Math.round(clamp(inn * out, 0, 1) * 1000) / 1000;
      var ramp = bd.ramp || Math.min(0.05, (b - a) * 0.35);
      var k = clamp((p - a) / ramp, 0, 1);
      if (bd.first) k = Math.max(k, loadK);
      if (op !== bd.op) { bd.op = op; bd.el.style.opacity = String(op); }
      if (Math.abs(k - bd.k) > 0.008 || (k === 1 && bd.k !== 1) || (k === 0 && bd.k !== 0)) {
        bd.k = k;
        bd.el.style.setProperty('--k', k.toFixed(3));
      }
      var live = op > 0.5;
      if (live !== bd.live) { bd.live = live; bd.el.classList.toggle('is-live', live); }
    });
  }

  function unpinBands() {
    bands.forEach(function (bd) {
      bd.op = -1; bd.k = -1; bd.live = null;
      bd.el.style.removeProperty('opacity');
      bd.el.style.removeProperty('--k');
      bd.el.classList.remove('is-live');
    });
  }

  /* ---------- прогресс скролла ---------- */

  function heroProgress() {
    var rect = hero.getBoundingClientRect();
    var top = parseFloat(getComputedStyle(stage).top) || 0;
    var range = hero.offsetHeight - stage.offsetHeight;
    if (range <= 0) return 0;
    return clamp((top - rect.top) / range, 0, 1);
  }

  /* ---------- seek без наложений ---------- */

  var seekBusy = false;
  var pendingTime = null;

  function requestSeek(t) {
    if (!video.duration || !isFinite(video.duration)) return;
    t = clamp(t, 0, video.duration - 0.001);
    if (seekBusy) { pendingTime = t; return; }
    if (Math.abs(video.currentTime - t) < 0.001) return;
    seekBusy = true;
    video.currentTime = t;
  }

  video.addEventListener('seeked', function () {
    seekBusy = false;
    if (pendingTime !== null) {
      var t = pendingTime;
      pendingTime = null;
      requestSeek(t);
    }
  });

  /* ---------- rAF-цикл с lerp, который засыпает ---------- */

  var target = 0;
  var shown = 0;
  var rafId = null;
  var lastTick = 0;
  var heroOnScreen = true;
  var scrubOn = false;

  function tick(now) {
    var dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    if (loadK < 1) {
      if (!loadStart) loadStart = now;
      var t = clamp((now - loadStart) / 1100, 0, 1);
      loadK = 1 - Math.pow(1 - t, 3);
    }
    var kk = 0.16;
    shown += (target - shown) * (1 - Math.pow(1 - kk, dt / 16.667));
    var converged = Math.abs(target - shown) < 0.0005;
    if (converged) shown = target;
    requestSeek(shown * (video.duration || 0));
    updateCaptions(shown);
    if (converged && loadK >= 1) {
      rafId = null;
      lastTick = 0;
    } else if (scrubOn && heroOnScreen) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
      lastTick = 0;
    }
  }

  function wake() {
    if (rafId === null && scrubOn && heroOnScreen) rafId = requestAnimationFrame(tick);
  }

  function onScroll() {
    target = heroProgress();
    wake();
    if (cue && !cue.classList.contains('is-gone') && target > 0.04 && hero.classList.contains('is-video-ready')) {
      cue.classList.add('is-gone');
    }
  }

  if ('IntersectionObserver' in root) {
    new IntersectionObserver(function (entries) {
      heroOnScreen = entries[0].isIntersecting;
      if (heroOnScreen) onScroll();
    }).observe(hero);
  }

  /* ---------- загрузка ролика Blob-ом с кольцом ---------- */

  var initDone = false;
  var failed = false;

  function setRing(frac) {
    if (cue) cue.style.setProperty('--ld', String(Math.round(RING_LEN * (1 - frac))));
  }

  function failVideo() {
    if (failed) return;
    failed = true;
    disableScrub();
    hero.classList.add('is-video-failed');
  }

  function loadHeroBlob() {
    if (!root.fetch || !root.ReadableStream || !root.URL || !URL.createObjectURL) return Promise.reject(new Error('no fetch'));
    var ctrl = 'AbortController' in root ? new AbortController() : null;
    var watchdog = null;
    function arm() {
      if (!ctrl) return;
      clearTimeout(watchdog);
      watchdog = setTimeout(function () { ctrl.abort(); }, 20000);   // 20 с без новых данных
    }
    arm();
    var opts = ctrl ? { signal: ctrl.signal } : {};
    try { opts.priority = 'low'; } catch (e) { /* старые браузеры */ }
    return fetch(VIDEO_URL, opts).then(function (res) {
      if (!res.ok || !res.body) throw new Error('video ' + res.status);
      var total = Number(res.headers.get('Content-Length')) || VIDEO_BYTES;
      var reader = res.body.getReader();
      var chunks = [];
      var got = 0;
      var lastRing = 0;
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          arm();
          chunks.push(r.value);
          got += r.value.length;
          var frac = Math.min(1, got / total);
          var now = performance.now();
          if (now - lastRing > 100 || frac === 1) { lastRing = now; setRing(frac); }
          return pump();
        });
      }
      return pump().then(function () {
        clearTimeout(watchdog);
        setRing(1);
        video.addEventListener('canplay', function () {
          if (failed) return;
          hero.classList.add('is-video-ready');
          if (cueText) cueText.textContent = 'листайте';
          target = heroProgress();
          shown = target;
          requestSeek(shown * video.duration);
          wake();
        }, { once: true });
        video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
        video.load();
      });
    });
  }

  video.addEventListener('error', function () {
    seekBusy = false;
    pendingTime = null;
    if (video.getAttribute('src')) failVideo();
  });

  function initHeroOnce() {
    if (initDone) return;
    initDone = true;
    if (cueText) cueText.textContent = 'загрузка';
    posterLayer.style.backgroundImage = "url('" + POSTER_URL + "')";
    var started = false;
    function startBlobFetch() {
      if (started) return;
      started = true;
      // одна повторная попытка при сетевом сбое, потом статичный герой
      loadHeroBlob().catch(function () { setRing(0); return loadHeroBlob(); }).catch(failVideo);
    }
    var img = new Image();
    img.onload = startBlobFetch;
    img.onerror = startBlobFetch;
    img.src = POSTER_URL;
    setTimeout(startBlobFetch, 4000);
  }

  /* ---------- статичный герой или скраб: решается вживую ---------- */

  function enableScrub() {
    if (scrubOn || failed) return;
    scrubOn = true;
    hero.classList.add('hero--scrub');
    initHeroOnce();
    root.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('resize', onScroll, { passive: true });
    bands.forEach(function (bd) { bd.op = -1; bd.k = -1; bd.live = null; });
    target = shown = heroProgress();
    updateCaptions(shown);
    onScroll();
  }

  function disableScrub() {
    if (!scrubOn) return;
    scrubOn = false;
    root.removeEventListener('scroll', onScroll);
    root.removeEventListener('resize', onScroll);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; lastTick = 0; }
    hero.classList.remove('hero--scrub');
    unpinBands();
  }

  var MQLS = GATES.map(function (q) { return root.matchMedia(q); });
  function applyHeroMode() {
    if (failed || MQLS.some(function (m) { return m.matches; })) disableScrub();
    else enableScrub();
  }
  MQLS.forEach(function (m) {
    if (m.addEventListener) m.addEventListener('change', applyHeroMode);
    else if (m.addListener) m.addListener(applyHeroMode);
  });
  applyHeroMode();

  // для проверки и отладки
  V.hero = {
    progress: function () { return shown; },
    isScrub: function () { return scrubOn; },
    gates: GATES.slice()
  };
})(window, document);
