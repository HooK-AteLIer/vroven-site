/*
 * НА УРОВНЕ: первый экран главной ([data-hl]).
 * 1) кривые буквы «НА УРОВНЕ» встают ровно под лучом нивелира;
 * 2) лазер плавно ходит по экрану и стирает бетон: под ним готовый ремонт и сборка кухни;
 * 3) крест возвращается и встаёт между «НА» и «УРОВНЕ».
 * Надпись всё время на экране. На телефоне свой вертикальный кадр, целиком по ширине.
 * При reduced motion сразу финальный кадр. После анимации цикл кадров останавливается.
 */
(function (root) {
  'use strict';
  var V = root.VROVEN = root.VROVEN || {};
  var doc = root.document;
  if (!doc) return;

  var IMG = 'assets/img/hero/laser-';
  var TEXT = 'НА УРОВНЕ';
  var TILT = [[-9, -14], [7, 10], [0, 0], [-4, -22], [11, 6], [-7, 16], [5, -9], [-12, 8], [8, -12]];
  // фазы, мс: буквы выравниваются, лазер открывает фон за 3 с, крест встаёт в название
  var T = { sweep0: 300, sweep1: 2000, done: 2150, rev0: 2400, rev1: 5400, fade1: 6400, back0: 5500, back1: 6700, end: 7000 };
  var RETRY_MS = [400, 1200]; // GitHub Pages иногда отвечает 503: повторяем загрузку

  function ease(x) { return x < 0 ? 0 : x > 1 ? 1 : x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function lerp(a, b, k) { return a + (b - a) * k; }

  function loadImg(src, cb, attempt) {
    attempt = attempt || 0;
    var im = new Image();
    im.onload = function () { cb(im); };
    im.onerror = function () {
      if (attempt < RETRY_MS.length) setTimeout(function () { loadImg(src.split('?')[0] + '?r=' + (attempt + 1), cb, attempt + 1); }, RETRY_MS[attempt]);
      else cb(null);
    };
    im.src = src;
  }

  function init(hero) {
    var word = hero.querySelector('[data-hl-word]'), cv = hero.querySelector('[data-hl-canvas]');
    if (!word || !cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var mask = doc.createElement('canvas'), mctx = mask.getContext('2d');
    var tmp = doc.createElement('canvas'), tctx = tmp.getContext('2d');
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var tall = hero.clientWidth / Math.max(1, hero.clientHeight) < .8; // телефон: вертикальный кадр
    var rough = null, final = null, W, H, dpr, t0, geo, spans, flags, lastP = null, sp = null, prev = 0, running = false;
    var state = 'загрузка';

    function build() {
      word.innerHTML = ''; spans = [];
      TEXT.split('').forEach(function (ch, i) {
        var s = doc.createElement('span');
        if (ch === ' ') { s.className = 'hl__gap'; s.innerHTML = '&nbsp;'; }
        else { s.textContent = ch; s.style.transform = 'translateY(' + TILT[i][1] + 'px) rotate(' + TILT[i][0] + 'deg)'; }
        word.appendChild(s); spans.push(s);
      });
      flags = spans.map(function () { return 0; });
    }
    function measure() { // базовая линия, середина заглавных и промежуток между словами
      var fs = parseFloat(root.getComputedStyle(word).fontSize);
      var c = doc.createElement('canvas').getContext('2d'); c.font = fs + 'px Forum';
      var m = c.measureText('Н'), asc = m.fontBoundingBoxAscent || fs * .9, desc = m.fontBoundingBoxDescent || fs * .25, cap = m.actualBoundingBoxAscent || fs * .7;
      var gap = spans[2].getBoundingClientRect(), hr = hero.getBoundingClientRect(); // пробел не наклонён: по нему точная линия
      var base = gap.top - hr.top + (gap.height - asc - desc) / 2 + asc;
      var first = spans[0].getBoundingClientRect(), last = spans[spans.length - 1].getBoundingClientRect();
      return { base: base, mid: base - cap / 2, cap: cap, gx: gap.left - hr.left + gap.width / 2, left: first.left - hr.left, right: last.right - hr.left };
    }
    function size() {
      dpr = Math.min(root.devicePixelRatio || 1, 2); W = hero.clientWidth; H = hero.clientHeight;
      cv.width = tmp.width = Math.round(W * dpr); cv.height = tmp.height = Math.round(H * dpr);
      var old = mask.width ? mctx.getImageData(0, 0, mask.width, mask.height) : null;
      mask.width = Math.max(1, Math.round(W / 4)); mask.height = Math.max(1, Math.round(H / 4));
      if (old) mctx.putImageData(old, 0, 0);
      if (spans) geo = measure();
    }
    function cover(img) {
      var s = tall ? W / img.width : Math.max(W / img.width, H / img.height); // телефон: целиком по ширине, все мастера в кадре
      var w = img.width * s, h = img.height * s;
      return [(W - w) / 2, tall ? H - h : (H - h) / 2, w, h];
    }
    function put(c, img, r, k) { // если сверху остаётся полоса, тянет в неё гладкий потолок
      k = k || 1;
      c.filter = img === final ? 'brightness(1.12) saturate(1.08) contrast(1.04)' : 'none';
      if (r[1] > 0) c.drawImage(img, 0, 0, img.width, img.height * .06, r[0] * k, 0, r[2] * k, (r[1] + 2) * k);
      c.drawImage(img, r[0] * k, r[1] * k, r[2] * k, r[3] * k);
      c.filter = 'none';
    }
    function brush(a, b) { // узкая полоса: фон открывается там, где прошёл лазер
      var r = Math.max(H * .13, W * .08);
      mctx.strokeStyle = '#fff'; mctx.lineCap = 'round'; mctx.lineWidth = r / 2; mctx.shadowColor = '#fff'; mctx.shadowBlur = r / 5;
      mctx.beginPath(); mctx.moveTo(a.x / 4, a.y / 4); mctx.lineTo(b.x / 4, b.y / 4); mctx.stroke();
    }
    function wander(k) { // две широкие дуги с мягким разгоном и торможением
      k = (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, k)))) / 2;
      var u = k * Math.PI * 2;
      var p = { x: (.5 + .40 * Math.sin(.8 * u + .2)) * W, y: (.5 + .34 * Math.sin(1.1 * u + 2.1)) * H };
      var b = ease(Math.min(1, k / .15)); // стартует оттуда, где закончил выравнивать буквы
      return { x: lerp(geo.right + 60, p.x, b), y: lerp(geo.base + 2, p.y, b) };
    }
    function cross(x, y, hx0, hx1, vy0, vy1, alpha, dot) {
      ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = alpha; ctx.strokeStyle = '#2FD16B'; ctx.lineCap = 'round'; ctx.shadowColor = '#2FD16B'; ctx.shadowBlur = 14; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(hx0, y); ctx.lineTo(hx1, y); ctx.moveTo(x, vy0); ctx.lineTo(x, vy1); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = '#2FD16B'; ctx.shadowBlur = 22; ctx.beginPath(); ctx.arc(x, y, dot, 0, 7); ctx.fill();
      ctx.restore();
    }

    function draw(t, now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1;
      var a = cover(rough), b = cover(final);
      put(ctx, rough, a);
      ctx.fillStyle = 'rgba(13,13,13,' + lerp(.78, .35, ease((t - T.sweep1) / 400)) + ')'; ctx.fillRect(0, 0, W, H);

      var p = null;
      if (t >= T.rev0 && t < T.rev1 + 50) {
        var aim = wander((t - T.rev0) / (T.rev1 - T.rev0)), dt = Math.min(50, now - (prev || now));
        if (!sp) sp = { x: aim.x, y: aim.y };
        var f = 1 - Math.exp(-dt / 240); sp.x += (aim.x - sp.x) * f; sp.y += (aim.y - sp.y) * f; // точка мягко догоняет траекторию
        p = { x: sp.x, y: sp.y };
        if (lastP) brush(lastP, p); lastP = p;
      }
      tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, tmp.width, tmp.height);
      tctx.globalCompositeOperation = 'source-over'; put(tctx, final, b, dpr);
      tctx.globalCompositeOperation = 'destination-in'; tctx.drawImage(mask, 0, 0, tmp.width, tmp.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(tmp, 0, 0);
      var fin = ease((t - T.rev1) / (T.fade1 - T.rev1)); // остаток фона проявляется после прохода
      if (fin > 0) { ctx.globalAlpha = fin; put(ctx, final, b, dpr); ctx.globalAlpha = 1; }
      var sh = ease((t - T.rev0) / 700); // лёгкая тень только под надписью
      if (sh > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = ctx.createRadialGradient(W / 2, geo.mid, 0, W / 2, geo.mid, Math.max(geo.right - geo.left, W * .5) * .62);
        g.addColorStop(0, 'rgba(13,13,13,' + .48 * sh + ')'); g.addColorStop(.6, 'rgba(13,13,13,' + .22 * sh + ')'); g.addColorStop(1, 'rgba(13,13,13,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }

      if (t >= T.sweep0 && t < T.rev0) { // луч по базовой линии выравнивает буквы
        var k = ease((t - T.sweep0) / (T.sweep1 - T.sweep0)), x0 = geo.left - 60, x1 = geo.right + 60, hx = lerp(x0, x1, k);
        var hr = hero.getBoundingClientRect();
        spans.forEach(function (s, i) {
          if (flags[i]) return; var r = s.getBoundingClientRect();
          if (r.left - hr.left + r.width / 2 < hx) { flags[i] = 1; s.classList.add('is-level'); }
        });
        var al = t > T.sweep1 ? 1 - (t - T.sweep1) / (T.rev0 - T.sweep1) : 1;
        ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = Math.max(0, al);
        ctx.strokeStyle = '#2FD16B'; ctx.shadowColor = '#2FD16B'; ctx.shadowBlur = 14; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, geo.base + 2); ctx.lineTo(hx, geo.base + 2); ctx.stroke(); ctx.restore();
        cross(hx, geo.base + 2, hx, hx, geo.base + 2, geo.base + 2, 1, 7);
        lastP = null;
      }
      if (t >= T.done && !hero.classList.contains('is-done')) hero.classList.add('is-done');
      if (p) cross(p.x, p.y, 0, W, 0, H, .95, 6);
      if (t >= T.rev1) { // крест возвращается и встаёт между словами
        if (!geo.straight) { geo = measure(); geo.straight = 1; }
        var q = ease((t - T.back0) / (T.back1 - T.back0)), from = sp || wander(1);
        var cx = lerp(from.x, geo.gx, q), cy = lerp(from.y, geo.mid, q);
        cross(cx, cy, lerp(0, geo.left - 34, q), lerp(W, geo.right + 34, q), cy - lerp(H, geo.cap * .6, q), cy + lerp(H, geo.cap * .6, q),
          lerp(.95, .8, q), lerp(6, Math.max(6, geo.cap * .07), q));
      }
    }

    function frame(now) {
      if (!running) return;
      var t = reduce ? 1e9 : now - t0;
      draw(t, now); prev = now;
      if (t > T.end) { running = false; state = 'готово'; return; } // анимация закончилась: дальше только перерисовка при изменении размера
      root.requestAnimationFrame(frame);
    }
    function still() { // финальный кадр без анимации: reduced motion и смена размера после окончания
      spans.forEach(function (s) { s.classList.add('is-level'); });
      hero.classList.add('is-done');
      size(); geo = measure(); geo.straight = 1; sp = null;
      draw(1e9, 0);
    }
    function start() {
      hero.classList.add('is-ready');
      build(); size();
      if (reduce) { state = 'статичный кадр'; still(); return; }
      state = 'анимация'; t0 = root.performance.now(); running = true; root.requestAnimationFrame(frame);
    }

    var rr = tall ? 'm.webp' : 'w.webp', left = 2;
    function got() {
      if (--left) return;
      if (!rough || !final) { state = 'картинки не загрузились'; hero.classList.add('is-fallback'); return; }
      (doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve()).then(start);
    }
    loadImg(IMG + 'before-' + rr, function (im) { rough = im; got(); });
    loadImg(IMG + 'after-' + rr, function (im) { final = im; got(); });

    root.addEventListener('resize', function () {
      if (!spans || !rough || !final) return;
      if (running) size(); else still();
    });
    V.heroLaser = { mode: function () { return state + (tall ? ', телефон' : ', компьютер'); } };
  }

  V.heroLaserInit = init;
  function boot() { var el = doc.querySelector('[data-hl]'); if (el) init(el); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : globalThis);
