/*
 * ВРОВЕНЬ: выбор стиля кухни веером фото-карточек (kitchen.html, блок #kd-styles).
 * Поведение перенесено с React-компонента card-fan-carousel на чистый JS:
 * 7 видимых карточек из N по кругу, центральная = выбранный стиль.
 * Анимации: Web Animations API с упругой кривой CSS linear(), без библиотек.
 * Чистая часть (слоты, коэффициенты, карта видимых карточек, раздвижка при наведении)
 * работает и в Node, её проверяет tests/kitchen-fan.test.js.
 */
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports && typeof require === 'function';

  /* Позиции 7 слотов слева направо: поворот (°), масштаб, x и y (rem), слой. */
  var SLOTS = [
    { rot: -21, scale: 0.7756, x: -30, y: 7.3, z: 1 },
    { rot: -14, scale: 0.8498, x: -22, y: 4.0, z: 2 },
    { rot: -7, scale: 0.9346, x: -11, y: 1.3, z: 3 },
    { rot: 0, scale: 1, x: 0, y: 0, z: 10 },
    { rot: 7, scale: 0.9346, x: 11, y: 1.3, z: 3 },
    { rot: 14, scale: 0.8498, x: 22, y: 4.0, z: 2 },
    { rot: 21, scale: 0.7756, x: 30, y: 7.3, z: 1 }
  ];
  var CENTER = 3;
  var HOVER_LIFT = 2.5;   // rem
  var HOVER_SCALE = 1.08;
  var FLY = 40;           // rem, откуда влетает и куда улетает карточка при листании
  var FLY_ROT = 30;       // °

  /* Коэффициент x по ширине окна. */
  function widthFactor(w) {
    if (w < 480) return 0.28;
    if (w < 640) return 0.38;
    if (w < 768) return 0.5;
    if (w < 1024) return 0.75;
    return 1;
  }

  /* Коэффициент y: 1, пока веер помещается в 70% высоты окна, иначе сжатие. */
  function heightFactor(fanHeight, viewportHeight) {
    var limit = 0.7 * viewportHeight;
    return fanHeight <= limit ? 1 : limit / fanHeight;
  }

  function mod(a, n) { return ((a % n) + n) % n; }

  /* Какая карточка стоит в каждом из 7 слотов (null — слот пуст). */
  function visibleMap(count, center) {
    var left = Math.min(CENTER, Math.floor((count - 1) / 2));
    var right = Math.min(CENTER, count - 1 - left);
    return SLOTS.map(function (s, slot) {
      var off = slot - CENTER;
      if (off < -left || off > right) return null;
      return mod(center + off, count);
    });
  }

  /* Кратчайший шаг по кругу от from к to (при равенстве путей — вправо). */
  function circularDelta(count, from, to) {
    var d = mod(to - from, count);
    return d > count / 2 ? d - count : d;
  }

  /*
   * Наведение на слот hoverSlot: карточка поднимается и растёт, соседи раздвигаются
   * pushStrength = 8·(1−|norm|)·(1+0.2·max(0, 3−distance)) rem × коэффициент ширины,
   * где norm — положение соседа от центра (−1…1), и доворачиваются на 3/(distance+1)°.
   */
  function hoverOffsets(hoverSlot, xFactor) {
    return SLOTS.map(function (s, slot) {
      if (slot === hoverSlot) return { x: 0, y: -HOVER_LIFT, rot: 0, scale: HOVER_SCALE, delay: 0 };
      var distance = Math.abs(slot - hoverSlot);
      var dir = slot > hoverSlot ? 1 : -1;
      var norm = (slot - CENTER) / CENTER;
      var push = 8 * (1 - Math.abs(norm)) * (1 + 0.2 * Math.max(0, 3 - distance)) * xFactor;
      return { x: push ? dir * push : 0, y: 0, rot: dir * 3 / (distance + 1), scale: 1, delay: distance * 0.02 };
    });
  }

  /*
   * Где раскрыть фото всей кухни (координаты окна, px): по центру веера (cx, cy),
   * не шире max (720), в пропорции ratio без обрезки, с полем margin от краёв окна
   * и не выше minTop (низ шапки + поле).
   */
  function revealBox(o) {
    var m = o.margin === undefined ? 16 : o.margin;
    var max = o.max || 720;
    var width = Math.max(0, Math.min(max, o.vw - 2 * m, (o.vh - o.minTop - m) * o.ratio));
    var height = width / o.ratio;
    var left = Math.min(Math.max(o.cx - width / 2, m), o.vw - m - width);
    var top = Math.max(Math.min(o.cy - height / 2, o.vh - m - height), o.minTop);
    return { left: left, top: top, width: width, height: height };
  }

  /*
   * FLIP: transform (transform-origin 0 0), который переводит бокс box в прямоугольник from.
   * Бокс раскрытия ставится один раз, анимируются только transform и opacity.
   */
  function flipTransform(from, box) {
    return {
      x: from.left - box.left,
      y: from.top - box.top,
      sx: box.width ? from.width / box.width : 1,
      sy: box.height ? from.height / box.height : 1
    };
  }

  /* Повтор загрузки фото: локальный сервер или сеть иногда рвут соединение. */
  var RETRY_DELAYS = [400, 1200];

  /* Адрес попытки N: ?r=N, чтобы браузер не отдал закешированную ошибку. */
  function retryUrl(url, attempt) {
    if (!attempt) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'r=' + attempt;
  }

  /*
   * loadWithRetry(url, load(url, cb(err)), done(err, goodUrl), { delays, wait, first })
   * Пробует url, при ошибке ждёт delays[k-1] и пробует retryUrl(url, k), пока повторы не кончатся.
   * first: 1 — первая загрузка уже упала (событие error), начинаем с повтора.
   */
  function loadWithRetry(url, load, done, o) {
    o = o || {};
    var delays = o.delays || RETRY_DELAYS;
    var wait = o.wait || function (fn, ms) { setTimeout(fn, ms); };
    function attempt(k) {
      var u = retryUrl(url, k);
      load(u, function (err) {
        if (!err) { done(null, u); return; }
        if (k >= delays.length) { done(err, u); return; }
        wait(function () { attempt(k + 1); }, delays[k]);
      });
    }
    var first = o.first || 0;
    if (first > 0) wait(function () { attempt(first); }, delays[first - 1]);
    else attempt(0);
  }

  var api = {
    retryUrl: retryUrl, loadWithRetry: loadWithRetry, RETRY_DELAYS: RETRY_DELAYS,
    SLOTS: SLOTS, CENTER: CENTER,
    widthFactor: widthFactor, heightFactor: heightFactor,
    visibleMap: visibleMap, circularDelta: circularDelta, hoverOffsets: hoverOffsets,
    revealBox: revealBox, flipTransform: flipTransform
  };

  if (isNode) { module.exports = api; return; }
  var V = root.VROVEN = root.VROVEN || {};
  V.kitchenFan = api;

  /* ================= страница ================= */

  var doc = root.document;

  /* Упругая кривая (как elastic.out) в виде CSS linear(); без поддержки — пружинистый bezier. */
  function elasticEasing(period) {
    var pts = [];
    for (var i = 0; i <= 40; i++) {
      var t = i / 40;
      var v = t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t - period / 4) * (2 * Math.PI) / period) + 1;
      pts.push(Math.round(v * 1000) / 1000);
    }
    var css = 'linear(' + pts.join(', ') + ')';
    var ok = root.CSS && root.CSS.supports && root.CSS.supports('animation-timing-function', 'linear(0, 1)');
    return ok ? css : 'cubic-bezier(.34, 1.56, .64, 1)';
  }

  var ARROW = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
    '<path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /*
   * create(el, { names:[string], center, label, onSelect(index), scenes?:[url] })
   * → setScene(i, url) меняет фото всей кухни карточки i (смена цвета).
   * → { media:[HTMLElement], setCenter(index, animate), center() }
   * media[i] — место под картинку карточки i (картинку кладёт kitchen-app.js).
   * scenes[i] — фото всей кухни: наведение мышью на карточку раскрывает его целиком,
   * тап или Enter по центральной раскрывает и сворачивает, Esc сворачивает.
   */
  function create(el, opts) {
    var names = opts.names || [];
    var n = names.length;
    var center = mod(opts.center || 0, n || 1);
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var motion = !reduce && typeof doc.body.animate === 'function';
    var springIn = elasticEasing(0.45);
    var springHover = elasticEasing(0.55);
    var glide = 'cubic-bezier(.22, 1, .36, 1)';
    var busyUntil = 0, entered = !motion, hoverSlot = null;
    var scenes = opts.scenes || null;
    var revealed = null, pinned = false, closeTimer = null, lastPointer = 'mouse';
    var f = { x: 1, y: 1, rem: 16 };

    el.classList.add('kd-fan');
    el.textContent = '';
    var stage = doc.createElement('div');
    stage.className = 'kd-fan__stage';
    stage.setAttribute('role', 'radiogroup');
    stage.setAttribute('aria-label', opts.label || 'Стиль кухни');
    var nameEl = doc.createElement('p');
    nameEl.className = 'kd-fan__name';
    var nav = doc.createElement('div');
    nav.className = 'kd-fan__nav';
    nav.innerHTML = '<button type="button" class="kd-fan__arrow" data-step="-1" aria-label="Предыдущий стиль">' + ARROW + '</button>' +
      '<div class="kd-fan__dots" aria-hidden="true"></div>' +
      '<button type="button" class="kd-fan__arrow kd-fan__arrow--next" data-step="1" aria-label="Следующий стиль">' + ARROW + '</button>';
    var dotsEl = nav.querySelector('.kd-fan__dots');

    var cards = [], media = [], dots = [];
    names.forEach(function (name, i) {
      var card = doc.createElement('button');
      card.type = 'button';
      card.className = 'kd-fan__card';
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-label', name);
      card.setAttribute('data-index', String(i));
      var m = doc.createElement('span');
      m.className = 'kd-fan__media';
      card.appendChild(m);
      stage.appendChild(card);
      cards.push(card);
      media.push(m);
      var dot = doc.createElement('button');
      dot.type = 'button';
      dot.className = 'kd-fan__dot';
      dot.tabIndex = -1;
      dot.setAttribute('data-index', String(i));
      dot.title = name;
      dotsEl.appendChild(dot);
      dots.push(dot);
    });
    el.appendChild(stage);
    el.appendChild(nameEl);
    el.appendChild(nav);

    // раскрытая кухня: одна на веер, поверх страницы, ниже шапки
    var reveal = null, revealFrame = null, revealPoster = null, revealName = null;
    var revealUrl = null, box = null, scrollY0 = 0, intentTimer = null, intentIndex = null;
    if (scenes) {
      reveal = doc.createElement('div');
      reveal.className = 'kd-reveal';
      reveal.hidden = true;
      reveal.setAttribute('aria-hidden', 'true');
      reveal.innerHTML = '<img class="kd-reveal__poster" alt=""><span class="kd-reveal__frame"></span><p class="kd-reveal__name"></p>';
      revealPoster = reveal.children[0];
      revealFrame = reveal.children[1];
      revealName = reveal.children[2];
      doc.body.appendChild(reveal);
    }

    /*
     * Фото всей кухни: по одному элементу <img> на адрес, декодируется заранее (img.decode()),
     * в раскрытие вставляется уже готовый элемент — без декодирования на лету при наведении.
     */
    var sceneCache = {};
    function sceneImage(url) {
      var e = sceneCache[url];
      if (e) return e;
      var img = new root.Image();
      img.className = 'kd-reveal__img';
      img.alt = '';
      img.decoding = 'async';
      e = sceneCache[url] = { img: img, ready: false };
      var done = function () {
        if (e.ready) return;
        e.ready = true;
        if (revealUrl === url) reveal.classList.add('is-loaded');
      };
      var decode = function () {
        if (img.decode) return img.decode();
        return new Promise(function (ok, fail) { img.onload = ok; img.onerror = fail; });
      };
      var failed = function () {
        if (img.complete && img.naturalWidth) { done(); return; }
        // загрузка оборвалась: до 2 повторов с ?r=N; не вышло — забываем, следующее наведение попробует снова
        loadImage(url, function (err, good) {
          if (err) { if (sceneCache[url] === e) delete sceneCache[url]; return; }
          img.src = good;
          decode().then(done, function () { if (img.complete && img.naturalWidth) done(); });
        }, { first: 1 });
      };
      img.src = url;
      decode().then(done, failed);
      return e;
    }

    /* Когда браузер свободен — сцены 7 видимых карточек в их текущем цвете, от центра к краям. */
    var idleId = null;
    function schedulePreload() {
      if (!scenes || !entered || idleId !== null) return;
      var run = function () {
        idleId = null;
        visibleMap(n, center)
          .map(function (i, s) { return { i: i, d: Math.abs(s - CENTER) }; })
          .filter(function (o) { return o.i !== null && scenes[o.i]; })
          .sort(function (a, b) { return a.d - b.d; })
          .forEach(function (o) { sceneImage(scenes[o.i]); });
      };
      idleId = root.requestIdleCallback ? root.requestIdleCallback(run, { timeout: 1500 }) : root.setTimeout(run, 400);
    }

    function slotOf(i) { return visibleMap(n, center).indexOf(i); }

    function pose(slot, extra) {
      var s = SLOTS[slot];
      extra = extra || { x: 0, y: 0, rot: 0, scale: 1 };
      return {
        x: (s.x * f.x + extra.x) * f.rem,
        y: (s.y * f.y + extra.y) * f.rem,
        rot: s.rot + extra.rot,
        scale: s.scale * extra.scale,
        opacity: 1
      };
    }

    function tf(p) {
      return 'translate(' + p.x.toFixed(1) + 'px, ' + p.y.toFixed(1) + 'px) rotate(' + p.rot.toFixed(2) + 'deg) scale(' + p.scale.toFixed(4) + ')';
    }

    /* Ведёт карточку к позе p; возвращает, сколько мс займёт. */
    function moveCard(card, p, o) {
      o = o || {};
      var to = { transform: tf(p), opacity: String(p.opacity) };
      if (card._anim) {
        try { card._anim.commitStyles(); } catch (e) { /* не в эффекте */ }
        card._anim.cancel();
        card._anim = null;
      }
      var from = { transform: card.style.transform || to.transform, opacity: card.style.opacity || to.opacity };
      card.style.transform = to.transform;
      card.style.opacity = to.opacity;
      if (!motion || !o.duration) return 0;
      var delay = o.delay || 0;
      card._anim = card.animate([from, to], { duration: o.duration, delay: delay, easing: o.easing || glide, fill: 'backwards' });
      return delay + o.duration;
    }

    function syncAttrs() {
      schedulePreload();
      var map = visibleMap(n, center);
      cards.forEach(function (card, i) {
        var slot = map.indexOf(i);
        var on = i === center;
        card.setAttribute('aria-checked', on ? 'true' : 'false');
        card.tabIndex = on ? 0 : -1;
        card.classList.toggle('is-center', on);
        if (slot >= 0) {
          card.removeAttribute('aria-hidden');
          card.style.zIndex = String(SLOTS[slot].z);
          card.style.visibility = '';
        } else {
          card.setAttribute('aria-hidden', 'true');
        }
      });
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === center); });
      nameEl.textContent = names[center] || '';
    }

    /* Размеры: коэффициенты x и y, высота сцены под веер. */
    function measure() {
      var card = cards[0];
      if (!card) return;
      f.rem = parseFloat(root.getComputedStyle(doc.documentElement).fontSize) || 16;
      var w = card.offsetWidth, h = card.offsetHeight;
      var cw = stage.clientWidth;
      var edge = SLOTS[0], a = Math.abs(edge.rot) * Math.PI / 180;
      var halfW = edge.scale * (w * Math.cos(a) + h * Math.sin(a)) / 2;
      var fit = Math.max(0, (cw / 2 - halfW - 6) / (Math.abs(edge.x) * f.rem));
      f.x = Math.min(widthFactor(root.innerWidth), fit);
      var top = HOVER_LIFT * f.rem + h * (HOVER_SCALE - 1) / 2 + 6;
      function bottom(yf) {
        return SLOTS.reduce(function (m, s) {
          var r = Math.abs(s.rot) * Math.PI / 180;
          var b = top + h / 2 + s.y * yf * f.rem + s.scale * (h * Math.cos(r) + w * Math.sin(r)) / 2;
          return Math.max(m, b);
        }, 0) + 6;
      }
      f.y = heightFactor(bottom(1), root.innerHeight || 800);
      stage.style.setProperty('--fan-top', top.toFixed(1) + 'px');
      stage.style.height = Math.ceil(bottom(f.y)) + 'px';
    }

    /* Все карточки сразу на места, без анимации. */
    function place() {
      var map = visibleMap(n, center);
      cards.forEach(function (card, i) {
        var slot = map.indexOf(i);
        if (slot >= 0) moveCard(card, pose(slot));
        else { moveCard(card, { x: 0, y: 0, rot: 0, scale: 0.7, opacity: 0 }); card.style.visibility = 'hidden'; }
      });
      syncAttrs();
    }

    function lock(ms) { busyUntil = Date.now() + ms + 40; }
    function busy() { return Date.now() < busyUntil; }

    function enter() {
      if (entered) return;
      entered = true;
      var map = visibleMap(n, center), longest = 0;
      cards.forEach(function (card, i) {
        var slot = map.indexOf(i);
        if (slot < 0) return;
        longest = Math.max(longest, moveCard(card, pose(slot), { duration: 1100, delay: (0.2 + slot * 0.06) * 1000, easing: springIn }));
      });
      el.classList.add('is-ready');
      lock(longest);
      schedulePreload();
    }

    /* Сдвиг центра на delta шагов (знак — направление листания). */
    function shift(target, delta) {
      var dir = delta > 0 ? 1 : -1;
      var before = visibleMap(n, center);
      center = target;
      var after = visibleMap(n, center), longest = 0;
      hoverSlot = null;
      if (revealed !== null) closeReveal(false);
      cards.forEach(function (card, i) {
        var was = before.indexOf(i), now = after.indexOf(i);
        if (now >= 0) {
          if (was < 0) {
            card.style.visibility = '';
            moveCard(card, { x: dir * FLY * f.x * f.rem, y: SLOTS[0].y * f.y * f.rem, rot: dir * FLY_ROT, scale: 0.7, opacity: 0 });
          }
          longest = Math.max(longest, moveCard(card, pose(now), { duration: 560, easing: glide }));
        } else if (was >= 0) {
          card.style.zIndex = '0';
          longest = Math.max(longest, moveCard(card, { x: -dir * FLY * f.x * f.rem, y: SLOTS[0].y * f.y * f.rem, rot: -dir * FLY_ROT, scale: 0.7, opacity: 0 }, { duration: 420, easing: glide }));
          root.setTimeout(function () { if (slotOf(i) < 0) card.style.visibility = 'hidden'; }, 440);
        }
      });
      syncAttrs();
      lock(longest);
    }

    /* Выбор пользователем: стрелка, точка, карточка, клавиша. */
    function choose(target, delta) {
      if (!n || target === center || busy()) return false;
      if (!entered) { entered = true; el.classList.add('is-ready'); }
      shift(target, delta);
      if (opts.onSelect) opts.onSelect(center);
      return true;
    }

    function step(d) { return choose(mod(center + d, n), d); }

    function hover(slot) {
      if (!motion || !entered || busy() || slot === hoverSlot) return;
      hoverSlot = slot;
      var map = visibleMap(n, center);
      var offs = slot === null ? null : hoverOffsets(slot, f.x);
      map.forEach(function (i, s) {
        if (i === null) return;
        var card = cards[i];
        card.style.zIndex = String(slot === s ? 11 : SLOTS[s].z);
        var d = offs ? offs[s].delay : 0;
        moveCard(card, pose(s, offs ? offs[s] : null), { duration: 700, delay: d * 1000, easing: springHover });
      });
    }

    /* ----- раскрытие всей кухни ----- */

    /* FLIP: итоговый бокс ставится один раз, анимируются только transform и opacity. */
    function flipTo(rect) {
      var t = flipTransform(rect, box);
      return 'translate(' + t.x.toFixed(1) + 'px, ' + t.y.toFixed(1) + 'px) scale(' + t.sx.toFixed(4) + ', ' + t.sy.toFixed(4) + ')';
    }

    function stopReveal() {
      if (reveal._anim) { reveal._anim.cancel(); reveal._anim = null; }
      reveal.classList.remove('is-animating');
    }

    function animateReveal(from, to, done) {
      stopReveal();
      reveal.style.transform = to.transform;
      reveal.style.opacity = to.opacity;
      if (!motion) { if (done) done(); return; }
      reveal.classList.add('is-animating');
      var a = reveal._anim = reveal.animate([from, to], { duration: 380, easing: glide });
      a.onfinish = function () {
        if (reveal._anim !== a) return;
        reveal._anim = null;
        reveal.classList.remove('is-animating');
        if (done) done();
      };
    }

    /* Текущий вид раскрытия (посреди анимации — промежуточный). */
    function currentLook() {
      var cs = root.getComputedStyle(reveal);
      return { transform: cs.transform === 'none' ? 'none' : cs.transform, opacity: cs.opacity };
    }

    function revealTarget() {
      var sr = stage.getBoundingClientRect();
      var header = doc.querySelector('.site-header');
      var hb = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      return revealBox({
        vw: doc.documentElement.clientWidth, vh: root.innerHeight, minTop: hb + 16,
        cx: sr.left + sr.width / 2, cy: sr.top + sr.height / 2, ratio: 1024 / 688
      });
    }

    function fillReveal(i) {
      var img = media[i].querySelector('img');
      var poster = img ? img.currentSrc || img.src : '';
      if (revealPoster.getAttribute('src') !== poster) {
        if (poster) revealPoster.src = poster; else revealPoster.removeAttribute('src');
      }
      var url = scenes[i];
      if (url !== revealUrl) {
        revealUrl = url;
        var e = sceneImage(url);
        while (revealFrame.firstChild) revealFrame.removeChild(revealFrame.firstChild);
        revealFrame.appendChild(e.img);
        reveal.classList.toggle('is-loaded', e.ready);
      }
      revealName.textContent = names[i] || '';
    }

    function cancelIntent() {
      root.clearTimeout(intentTimer);
      intentTimer = null;
    }

    function openReveal(i, pin) {
      if (!reveal || !scenes[i] || !entered || busy() || slotOf(i) < 0) return;
      root.clearTimeout(closeTimer);
      cancelIntent();
      pinned = !!pin;
      reveal.classList.toggle('is-pinned', pinned);
      fillReveal(i);
      stage.setAttribute('data-revealed', String(i));
      if (revealed !== null) { revealed = i; return; }   // уже раскрыто: меняется только кадр
      revealed = i;
      scrollY0 = root.scrollY || 0;
      stage.classList.add('is-revealing');
      var from;
      if (!reveal.hidden && reveal._anim) {
        from = currentLook();                            // сворачивалось — разворачиваем с того же места
      } else {
        box = revealTarget();
        reveal.style.left = box.left.toFixed(1) + 'px';
        reveal.style.top = box.top.toFixed(1) + 'px';
        reveal.style.width = box.width.toFixed(1) + 'px';
        reveal.style.height = box.height.toFixed(1) + 'px';
        from = { transform: flipTo(cards[i].getBoundingClientRect()), opacity: '0.4' };
      }
      reveal.hidden = false;
      animateReveal(from, { transform: 'none', opacity: '1' });
    }

    function closeReveal(animate) {
      root.clearTimeout(closeTimer);
      cancelIntent();
      if (revealed === null) return;
      var i = revealed;
      revealed = null;
      pinned = false;
      stage.removeAttribute('data-revealed');
      stage.classList.remove('is-revealing');
      reveal.classList.remove('is-pinned');
      var hide = function () { if (revealed === null) reveal.hidden = true; };
      if (!animate || !motion) { stopReveal(); hide(); return; }
      animateReveal(currentLook(), { transform: flipTo(cards[i].getBoundingClientRect()), opacity: '0' }, hide);
    }

    function toggleReveal(i) {
      if (revealed !== null) closeReveal(true);
      else openReveal(i, true);
    }

    stage.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType || 'mouse'; });
    stage.addEventListener('click', function (e) {
      var card = e.target.closest('.kd-fan__card');
      if (!card) return;
      var i = Number(card.getAttribute('data-index'));
      var slot = slotOf(i);
      var how = lastPointer;
      lastPointer = 'mouse';
      if (slot < 0) return;
      if (i === center) {
        // тап пальцем или пробел с клавиатуры; мышь раскрывает наведением
        if (scenes && (how !== 'mouse' || e.detail === 0)) toggleReveal(i);
        return;
      }
      choose(i, slot - CENTER);
    });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && scenes) {
        var card = e.target.closest('.kd-fan__card');
        if (card && Number(card.getAttribute('data-index')) === center) {
          e.preventDefault();
          toggleReveal(center);
        }
        return;
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      if (step(e.key === 'ArrowRight' ? 1 : -1)) cards[center].focus({ preventScroll: true });
    });
    stage.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse') return;
      var card = e.target.closest('.kd-fan__card');
      if (!card) return;
      var i = Number(card.getAttribute('data-index'));
      if (scenes) {
        if (pinned) return;
        root.clearTimeout(closeTimer);
        if (revealed !== null) { openReveal(i, false); return; }   // уже раскрыто: кадр меняется сразу
        // намерение: быстрый проход мышью по вееру не раскрывает каждую карточку
        if (intentTimer !== null && intentIndex === i) return;
        cancelIntent();
        intentIndex = i;
        intentTimer = root.setTimeout(function () { intentTimer = null; openReveal(intentIndex, false); }, 120);
        return;
      }
      var slot = slotOf(i);
      if (slot >= 0) hover(slot);
    });
    stage.addEventListener('pointerout', function (e) {
      if (e.pointerType !== 'mouse' || !scenes || pinned) return;
      var next = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.kd-fan__card') : null;
      if (next && stage.contains(next)) return;
      cancelIntent();
      root.clearTimeout(closeTimer);
      closeTimer = root.setTimeout(function () { closeReveal(true); }, 90);
    });
    stage.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse' && !scenes) hover(null);
    });
    if (reveal) {
      reveal.addEventListener('click', function () { closeReveal(true); });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && revealed !== null) closeReveal(true);
      });
      doc.addEventListener('pointerdown', function (e) {
        if (revealed !== null && pinned && !stage.contains(e.target) && !reveal.contains(e.target)) closeReveal(true);
      });
      root.addEventListener('scroll', function () {
        if (revealed !== null && Math.abs((root.scrollY || 0) - scrollY0) > 40) closeReveal(false);
      }, { passive: true });
    }
    nav.addEventListener('click', function (e) {
      var arrow = e.target.closest('[data-step]');
      if (arrow) { step(Number(arrow.getAttribute('data-step'))); return; }
      var dot = e.target.closest('.kd-fan__dot');
      if (dot) {
        var i = Number(dot.getAttribute('data-index'));
        choose(i, circularDelta(n, center, i));
      }
    });

    var resizeTimer = null, lastW = 0, lastH = 0;
    function onResize() {
      root.clearTimeout(resizeTimer);
      resizeTimer = root.setTimeout(function () {
        if (Math.abs(stage.clientWidth - lastW) < 2 && Math.abs(root.innerHeight - lastH) < 80) return;
        lastW = stage.clientWidth;
        lastH = root.innerHeight;
        measure();
        if (revealed !== null) closeReveal(false);
        if (entered) { busyUntil = 0; hoverSlot = null; place(); }
      }, 120);
    }

    measure();
    lastW = stage.clientWidth;
    lastH = root.innerHeight;
    syncAttrs();
    if (!motion) {
      el.classList.add('is-ready');
      place();
    } else {
      // до появления карточки собраны внизу по центру и прозрачны
      cards.forEach(function (card, i) {
        moveCard(card, { x: 0, y: 14 * f.rem, rot: 0, scale: 0.6, opacity: 0 });
        if (slotOf(i) < 0) card.style.visibility = 'hidden';
      });
      if ('IntersectionObserver' in root) {
        var io = new root.IntersectionObserver(function (entries) {
          if (!entries.some(function (en) { return en.isIntersecting; })) return;
          io.disconnect();
          enter();
        }, { threshold: 0.25 });
        io.observe(stage);
      } else {
        enter();
      }
    }
    root.addEventListener('resize', onResize);
    if ('ResizeObserver' in root) new root.ResizeObserver(onResize).observe(el);

    return {
      media: media,
      center: function () { return center; },
      /* Новое фото всей кухни у карточки i (сменили цвет); раскрытая меняет кадр без закрытия. */
      setScene: function (i, url) {
        if (!scenes || scenes[i] === url) return;
        scenes[i] = url;
        if (url && entered && slotOf(i) >= 0) sceneImage(url);   // новый цвет — сразу в загрузку и декодирование
        if (revealed === i) fillReveal(i);
      },
      setCenter: function (i, animate) {
        i = mod(i, n);
        if (i === center) return;
        if (animate && motion && entered && !busy()) { shift(i, circularDelta(n, center, i)); return; }
        center = i;
        if (entered) place(); else syncAttrs();
      }
    };
  }

  /* Загрузка картинки с повторами (браузер): done(err, адрес, который загрузился). */
  function loadImage(url, done, o) {
    loadWithRetry(url, function (u, cb) {
      var probe = new root.Image();
      probe.onload = function () { cb(null); };
      probe.onerror = function () { cb(new Error('Не загрузилось: ' + u)); };
      probe.src = u;
    }, done, o);
  }

  api.create = create;
  api.loadImage = loadImage;
})(typeof window !== 'undefined' ? window : this);
