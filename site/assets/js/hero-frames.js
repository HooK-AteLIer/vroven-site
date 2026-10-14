/*
 * ВРОВЕНЬ: герой главной на телефоне. Ремонт по прокрутке без видео.
 *   frames: 72 кадра WebP (обрезка под вертикальный экран) рисуются на <canvas> по прогрессу героя.
 *           Первый кадр сразу (он же постер), потом грубая сетка (через 8, через 4), потом остальные;
 *           пока нужный кадр не пришёл, рисуется ближайший загруженный.
 *   light:  три картинки (черновая → чистовая → кухня) с кроссфейдом по прогрессу:
 *           экономия трафика (Save-Data) или медленная сеть (slow-2g, 2g, 3g).
 * Прогресс, полосы подписей и rAF-цикл остаются в hero-scrub.js; отсюда только выбор режима
 * и отрисовка. На десктопе этот модуль ничего не грузит.
 *
 * Чистая логика (для node --test):
 *   chooseMode(flags) → 'static' | 'video' | 'frames' | 'light'
 *   frameIndex(p, count), frameUrl(i), loadOrder(count), nearestLoaded(i, loaded)
 *   lightWeights(p) → [бетон, чистовая, кухня], layerAlphas(weights)
 *   fitRect(cw, ch, iw, ih), backingSize(cssW, cssH, dpr)
 */
(function (root) {
  'use strict';

  var FRAME_COUNT = 72;
  var FRAME_DIR = 'assets/img/hero/frames/';
  var LIGHT_URLS = [
    'assets/img/hero/phase-rough.webp',
    'assets/img/hero/phase-finish.webp',
    'assets/img/hero/phase-final.webp'
  ];
  // переходы лёгкого режима по долям прокрутки героя (сверено с полосами подписей):
  // бетон → чистовая 0,12–0,34, чистовая → кухня 0,62–0,9
  var LIGHT_STOPS = [0.12, 0.34, 0.62, 0.9];
  var SLOW_NET = ['slow-2g', '2g', '3g'];
  var WASH = '#0D0D0D';                 // --canvas

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function smoothstep(p, e0, e1) {
    var t = clamp((p - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function chooseMode(f) {
    f = f || {};
    if (f.file || f.reducedMotion || f.failed) return 'static';
    if (!f.mobile) return 'video';
    if (f.saveData || SLOW_NET.indexOf(f.effectiveType) >= 0) return 'light';
    return 'frames';
  }

  function frameIndex(p, count) {
    if (!(count > 1) || typeof p !== 'number' || isNaN(p)) return 0;
    return Math.round(clamp(p, 0, 1) * (count - 1));
  }

  function frameUrl(i) {
    var n = String(i + 1);
    while (n.length < 3) n = '0' + n;
    return FRAME_DIR + 'f' + n + '.webp';
  }

  function loadOrder(count) {
    var order = [];
    var seen = {};
    function add(i) { if (i >= 0 && i < count && !seen[i]) { seen[i] = true; order.push(i); } }
    add(0);
    add(count - 1);
    [8, 4, 2, 1].forEach(function (step) {
      for (var i = step; i < count; i += step) add(i);
    });
    return order;
  }

  function nearestLoaded(i, loaded) {
    var n = loaded.length;
    for (var d = 0; d < n; d++) {
      if (i - d >= 0 && loaded[i - d]) return i - d;
      if (i + d < n && loaded[i + d]) return i + d;
    }
    return -1;
  }

  function lightWeights(p) {
    p = clamp(typeof p === 'number' && !isNaN(p) ? p : 0, 0, 1);
    var t1 = smoothstep(p, LIGHT_STOPS[0], LIGHT_STOPS[1]);
    var t2 = smoothstep(p, LIGHT_STOPS[2], LIGHT_STOPS[3]);
    var w2 = t1 * t2;
    var w1 = t1 - w2;
    return [1 - t1, w1, w2];
  }

  // слои кладутся друг на друга (бетон снизу), веса → прозрачность каждого слоя
  function layerAlphas(w) {
    var a2 = w[2];
    var a1 = a2 >= 1 ? 0 : w[1] / (1 - a2);
    return [1, clamp(a1, 0, 1), clamp(a2, 0, 1)];
  }

  // кадр целиком (стена с обоими светильниками и остров), без обрезки:
  // экран уже кадра (телефон стоя) — кадр по ширине, прижат к низу, сверху тёмное поле под подписи;
  // экран шире кадра (телефон лёжа) — кадр по высоте, прижат вправо, слева поле под подписи
  function fitRect(cw, ch, iw, ih) {
    if (!(cw > 0 && ch > 0 && iw > 0 && ih > 0)) return { x: 0, y: 0, w: 0, h: 0 };
    var s, w, h;
    if (cw / ch <= iw / ih) {
      s = cw / iw; w = cw; h = Math.round(ih * s);
      return { x: 0, y: ch - h, w: w, h: h };
    }
    s = ch / ih; h = ch; w = Math.round(iw * s);
    return { x: cw - w, y: 0, w: w, h: h };
  }

  function backingSize(cssW, cssH, dpr) {
    var d = clamp(Number(dpr) || 1, 1, 2);
    return { w: Math.round(cssW * d), h: Math.round(cssH * d), dpr: d };
  }

  var api = {
    FRAME_COUNT: FRAME_COUNT,
    LIGHT_URLS: LIGHT_URLS,
    LIGHT_STOPS: LIGHT_STOPS,
    chooseMode: chooseMode,
    frameIndex: frameIndex,
    frameUrl: frameUrl,
    loadOrder: loadOrder,
    nearestLoaded: nearestLoaded,
    lightWeights: lightWeights,
    layerAlphas: layerAlphas,
    fitRect: fitRect,
    backingSize: backingSize
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    return;
  }

  /* ---------- отрисовка в браузере ---------- */

  // opts: { canvas, mode: 'frames' | 'light', onFirst(), onProgress(frac), onReady(), onFail() }
  function createPlayer(opts) {
    var canvas = opts.canvas;
    var ctx = canvas.getContext('2d');
    var light = opts.mode === 'light';
    var urls = [];
    var i;
    if (light) urls = LIGHT_URLS.slice();
    else for (i = 0; i < FRAME_COUNT; i++) urls.push(frameUrl(i));
    var count = urls.length;
    var imgs = new Array(count);
    var loaded = [];
    for (i = 0; i < count; i++) loaded.push(false);
    var order = light ? [0, 1, 2] : loadOrder(count);
    // «готово к прокрутке»: в режиме кадров грубая сетка через 4, в лёгком все три картинки
    var coarse = order.filter(function (k) { return light || k % 4 === 0 || k === count - 1; });
    var coarseLeft = coarse.length;
    var isCoarse = {};
    coarse.forEach(function (k) { isCoarse[k] = true; });

    var started = false, stopped = false, failed = false;
    var nextPos = 0, inFlight = 0, doneCount = 0;
    var CONCURRENCY = 4;
    var lastP = 0;
    var drawnKey = '';
    var size = { w: 0, h: 0, dpr: 1 };
    var cssW = 0, cssH = 0;
    var pendingRaf = null;

    function measure() {
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      var b = backingSize(cssW, cssH, root.devicePixelRatio);
      if (b.w !== size.w || b.h !== size.h) {
        size = b;
        canvas.width = b.w;
        canvas.height = b.h;
        drawnKey = '';
      }
    }

    function paintImage(img, alpha) {
      var r = fitRect(cssW, cssH, img.naturalWidth, img.naturalHeight);
      var d = size.dpr;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, r.x * d, r.y * d, r.w * d, r.h * d);
      ctx.globalAlpha = 1;
      return r;
    }

    function paintEdge(r) {
      // край кадра у поля подписей (верхний или левый) растворяется в тёмном
      var d = size.dpr, g;
      if (r.y > 0) {
        var eh = r.h * 0.24;
        g = ctx.createLinearGradient(0, r.y * d, 0, (r.y + eh) * d);
        g.addColorStop(0, 'rgba(13,13,13,1)');
        g.addColorStop(1, 'rgba(13,13,13,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, r.y * d, size.w, eh * d + 1);
      } else if (r.x > 0) {
        var ew = r.w * 0.3;
        g = ctx.createLinearGradient(r.x * d, 0, (r.x + ew) * d, 0);
        g.addColorStop(0, 'rgba(13,13,13,1)');
        g.addColorStop(1, 'rgba(13,13,13,0)');
        ctx.fillStyle = g;
        ctx.fillRect(r.x * d, 0, ew * d + 1, size.h);
      }
    }

    function draw(p) {
      lastP = p;
      if (stopped || !size.w) return;
      var key, r = null;
      if (light) {
        var a = layerAlphas(lightWeights(p));
        key = a.map(function (x, k) { return loaded[k] ? Math.round(x * 500) : 'n'; }).join(',');
        if (key === drawnKey) return;
        drawnKey = key;
        ctx.fillStyle = WASH;
        ctx.fillRect(0, 0, size.w, size.h);
        for (var k = 0; k < 3; k++) {
          if (loaded[k] && a[k] > 0.002) r = paintImage(imgs[k], a[k]);
        }
      } else {
        var idx = nearestLoaded(frameIndex(p, count), loaded);
        key = String(idx);
        if (key === drawnKey) return;
        drawnKey = key;
        ctx.fillStyle = WASH;
        ctx.fillRect(0, 0, size.w, size.h);
        if (idx >= 0) r = paintImage(imgs[idx], 1);
      }
      if (r) paintEdge(r);
    }

    function redrawSoon() {
      if (pendingRaf !== null || stopped) return;
      pendingRaf = root.requestAnimationFrame(function () {
        pendingRaf = null;
        draw(lastP);
      });
    }

    function pump() {
      while (!stopped && inFlight < CONCURRENCY && nextPos < order.length) {
        // первый кадр в одиночку: он постер, остальные не должны отнимать у него канал
        if (nextPos > 0 && !loaded[order[0]]) return;
        loadOne(order[nextPos++]);
      }
    }

    // сбой сети или 503 хостинга: до 2 повторов (0,4 с и 1,2 с) с ?r=N против кеша ошибки
    var RETRY_MS = [400, 1200];
    function loadOne(k, attempt) {
      attempt = attempt || 0;
      inFlight++;
      var img = new Image();
      img.decoding = 'async';
      // постер вперёд остальных картинок страницы, прочие кадры не мешают первому экрану
      try { img.fetchPriority = k === order[0] ? 'high' : 'low'; } catch (e) { /* старые браузеры */ }
      img.onload = function () {
        inFlight--;
        if (stopped) return;
        imgs[k] = img;
        loaded[k] = true;
        doneCount++;
        if (opts.onProgress) opts.onProgress(doneCount / count);
        if (k === order[0] && opts.onFirst) opts.onFirst();
        if (isCoarse[k] && --coarseLeft === 0 && opts.onReady) opts.onReady();
        drawnKey = '';
        redrawSoon();
        pump();
      };
      img.onerror = function () {
        inFlight--;
        if (stopped) return;
        if (attempt < RETRY_MS.length) {
          inFlight++;
          root.setTimeout(function () { inFlight--; if (!stopped) loadOne(k, attempt + 1); }, RETRY_MS[attempt]);
          return;
        }
        if (k === order[0] || light) {
          if (!failed) { failed = true; if (opts.onFail) opts.onFail(); }
          return;
        }
        if (isCoarse[k] && --coarseLeft === 0 && opts.onReady) opts.onReady();
        pump();
      };
      img.src = attempt ? urls[k] + (urls[k].indexOf('?') < 0 ? '?' : '&') + 'r=' + attempt : urls[k];
    }

    return {
      start: function () {
        if (started) return;
        started = true;
        measure();
        pump();
      },
      render: function (p) { draw(p); },
      resize: function () { measure(); draw(lastP); },
      stop: function () {
        stopped = true;
        if (pendingRaf !== null) { root.cancelAnimationFrame(pendingRaf); pendingRaf = null; }
      },
      mode: light ? 'light' : 'frames'
    };
  }

  api.createPlayer = createPlayer;
  root.VROVEN = root.VROVEN || {};
  root.VROVEN.heroFrames = api;
})(typeof window !== 'undefined' ? window : this);
