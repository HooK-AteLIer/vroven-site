/*
 * ВРОВЕНЬ: выбор стиля кухни гармошкой (kitchen.html, блок #kd-styles).
 * 8 вертикальных полос с фото всей кухни; выбранный стиль раскрыт.
 * Наведение мышью (только (hover:hover)) раскрывает полосу как предпросмотр,
 * клик, тап, Enter и Space выбирают стиль. До 720 px — вертикальный список.
 * Ширину и высоту анимирует CSS (flex-grow / height), скрипт только ставит классы.
 * Чистая часть (шаг стрелками, какая полоса раскрыта, фото по стилю и цвету, повтор загрузки)
 * работает и в Node, её проверяет tests/kitchen-accordion.test.js.
 */
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports && typeof require === 'function';

  var PHONE_MAX = 720;

  function mod(a, n) { return ((a % n) + n) % n; }

  /* Куда перейти по клавише: ←/→ по кругу, Home/End; null — клавиша не наша. */
  function stepIndex(count, index, key) {
    if (!count) return null;
    if (key === 'ArrowRight') return mod(index + 1, count);
    if (key === 'ArrowLeft') return mod(index - 1, count);
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    return null;
  }

  /* Раскрытая полоса: под мышью, иначе в фокусе с клавиатуры, иначе выбранная. */
  function openIndex(selected, hover, focus) {
    if (hover !== null && hover !== undefined) return hover;
    if (focus !== null && focus !== undefined) return focus;
    return selected;
  }

  function isPhone(width) { return width <= PHONE_MAX; }

  function colorOf(style, id) {
    for (var i = 0; i < style.colors.length; i++) if (style.colors[i].id === id) return style.colors[i];
    return style.colors[0];
  }

  /* Фото полосы: у выбранного стиля — сцена текущего цвета, у остальных — основного. */
  function photoFor(style, selectedStyleId, colorId) {
    var c = style.id === selectedStyleId ? colorOf(style, colorId) : style.colors[0];
    return (c && c.scene) || null;
  }

  /* Сцены выбранного стиля во всех цветах, текущий цвет первым. */
  function preloadList(style, colorId) {
    var first = colorOf(style, colorId);
    var out = [];
    [first].concat(style.colors).forEach(function (c) {
      if (c && c.scene && out.indexOf(c.scene) < 0) out.push(c.scene);
    });
    return out;
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
    PHONE_MAX: PHONE_MAX, RETRY_DELAYS: RETRY_DELAYS,
    stepIndex: stepIndex, openIndex: openIndex, isPhone: isPhone,
    photoFor: photoFor, preloadList: preloadList,
    retryUrl: retryUrl, loadWithRetry: loadWithRetry
  };

  if (isNode) { module.exports = api; return; }
  var V = root.VROVEN = root.VROVEN || {};
  V.kitchenAccordion = api;

  /* ================= страница ================= */

  var doc = root.document;

  /* Загрузка картинки с повторами; done(err, рабочий адрес). */
  function loadImage(url, done, o) {
    loadWithRetry(url, function (u, cb) {
      var probe = new root.Image();
      probe.onload = function () { cb(null); };
      probe.onerror = function () { cb(new Error('Не загрузилось: ' + u)); };
      probe.src = u;
    }, done, o);
  }

  /* Сцены выбранного стиля — в кеш браузера, когда он свободен. */
  var preloaded = {};
  function preload(urls) {
    var run = function () {
      urls.forEach(function (u) {
        if (preloaded[u]) return;
        preloaded[u] = true;
        loadImage(u, function (err) { if (err) delete preloaded[u]; });
      });
    };
    if (root.requestIdleCallback) root.requestIdleCallback(run, { timeout: 1500 });
    else root.setTimeout(run, 300);
  }

  /*
   * create(el, { items:[{ name, blurb, photo, fallback }], selected, label, onSelect(index) })
   * → { setSelected(i), setPhoto(i, url, fallback), selected() }
   * fallback — CSS-фон полосы, пока фото грузится или если не загрузилось.
   */
  function create(el, opts) {
    var items = opts.items || [];
    var n = items.length;
    var selected = Math.max(0, Math.min(n - 1, opts.selected || 0));
    var hover = null, focus = null, hoverTimer = null;
    var lastX = null, lastY = null;
    var canHover = root.matchMedia ? root.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };

    el.classList.add('kd-acc');
    el.textContent = '';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', opts.label || 'Стиль кухни');

    var strips = [];
    items.forEach(function (it, i) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'kd-acc__item';
      b.setAttribute('data-index', String(i));
      b.setAttribute('aria-label', it.name);
      b.innerHTML =
        '<img class="kd-acc__img" alt="" decoding="async" draggable="false">' +
        '<span class="kd-acc__name" aria-hidden="true"></span>' +
        '<span class="kd-acc__body" aria-hidden="true">' +
          '<span class="kd-acc__title"></span>' +
          '<span class="kd-acc__text"></span>' +
          '<span class="kd-acc__mark kd-acc__mark--on">Выбран</span>' +
          '<span class="kd-acc__mark kd-acc__mark--off">Выбрать</span>' +
        '</span>';
      b.querySelector('.kd-acc__name').textContent = it.name;
      b.querySelector('.kd-acc__title').textContent = it.name;
      b.querySelector('.kd-acc__text').textContent = it.blurb || '';
      var img = b.querySelector('img');
      var strip = { el: b, img: img, url: null };
      img.addEventListener('error', function () { onImgError(strip); });
      img.addEventListener('load', function () { b.classList.remove('is-nophoto'); });
      el.appendChild(b);
      strips.push(strip);
      setPhoto(i, it.photo, it.fallback, true);
    });

    /* Фото полосы: первый раз — сразу (лениво), потом новое подменяет старое, когда загрузилось. */
    function setPhoto(i, url, fallback, initial) {
      var s = strips[i];
      if (!s) return;
      if (fallback) s.el.style.background = fallback;
      if (!url) { s.url = null; s.img.removeAttribute('src'); s.el.classList.add('is-nophoto'); return; }
      if (s.url === url) return;
      s.url = url;
      if (initial || !s.img.getAttribute('src')) {
        s.img.loading = 'lazy';
        s.img.src = url;
        return;
      }
      loadImage(url, function (err, good) {
        if (s.url !== url) return;            // цвет уже сменили
        if (err) { s.el.classList.add('is-nophoto'); return; }
        var swap = function () { if (s.url === url) s.img.src = good; };
        var pre = new root.Image();
        pre.src = good;
        if (pre.decode) pre.decode().then(swap, swap); else swap();
      });
    }

    /* Загрузка оборвалась: до 2 повторов с ?r=N, потом — запасной фон полосы. */
    function onImgError(s) {
      var url = s.url;
      if (!url) return;
      if (/[?&]r=\d+$/.test(s.img.getAttribute('src') || '') || s.retrying === url) {
        if (s.retrying !== url) s.el.classList.add('is-nophoto');
        return;
      }
      s.retrying = url;
      loadImage(url, function (err, good) {
        if (s.retrying === url) s.retrying = null;
        if (s.url !== url) return;
        if (err) s.el.classList.add('is-nophoto'); else s.img.src = good;
      }, { first: 1 });
    }

    function sync() {
      var open = openIndex(selected, hover, focus);
      el.classList.toggle('is-previewing', open !== selected);
      strips.forEach(function (s, i) {
        s.el.classList.toggle('is-open', i === open);
        s.el.classList.toggle('is-selected', i === selected);
        s.el.setAttribute('aria-pressed', i === selected ? 'true' : 'false');
      });
    }

    function select(i) {
      if (i === null || i < 0 || i >= n) return;
      var changed = i !== selected;
      selected = i;
      hover = null; focus = null;
      sync();
      if (changed && opts.onSelect) opts.onSelect(i);
    }

    function indexOf(target) {
      var b = target && target.closest ? target.closest('.kd-acc__item') : null;
      return b && el.contains(b) ? Number(b.getAttribute('data-index')) : null;
    }

    el.addEventListener('click', function (e) {
      var i = indexOf(e.target);
      if (i === null) return;
      select(i);
    });

    el.addEventListener('keydown', function (e) {
      var i = indexOf(e.target);
      if (i === null) return;
      var to = stepIndex(n, i, e.key);
      if (to === null) return;
      e.preventDefault();
      strips[to].el.focus();
    });

    /* Предпросмотр с клавиатуры: только видимый фокус (не после клика мышью). */
    el.addEventListener('focusin', function (e) {
      var i = indexOf(e.target);
      var visible = false;
      try { visible = e.target.matches(':focus-visible'); } catch (err) { visible = false; }
      focus = visible ? i : null;
      sync();
    });
    el.addEventListener('focusout', function (e) {
      if (e.relatedTarget && el.contains(e.relatedTarget)) return;
      focus = null;
      sync();
    });

    /*
     * Наведение мышью. Полосы меняют ширину под неподвижным курсором, поэтому полоса
     * под мышью определяется только по настоящему движению (координаты изменились)
     * и с короткой задержкой: проход курсором через гармошку не дёргает её.
     */
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !canHover.matches || isPhone(root.innerWidth)) return;
      if (e.clientX === lastX && e.clientY === lastY) return;
      lastX = e.clientX; lastY = e.clientY;
      var i = indexOf(e.target);
      if (i === null || i === hover) { root.clearTimeout(hoverTimer); return; }
      root.clearTimeout(hoverTimer);
      hoverTimer = root.setTimeout(function () { hover = i; sync(); }, hover === null ? 60 : 90);
    });
    el.addEventListener('pointerleave', function () {
      root.clearTimeout(hoverTimer);
      lastX = lastY = null;
      if (hover === null) return;
      hover = null;
      sync();
    });

    sync();
    root.requestAnimationFrame(function () { el.classList.add('is-ready'); });

    return {
      selected: function () { return selected; },
      setSelected: function (i) {
        if (i === selected && hover === null && focus === null) return;
        selected = Math.max(0, Math.min(n - 1, i));
        sync();
      },
      setPhoto: function (i, url, fallback) { setPhoto(i, url, fallback, false); }
    };
  }

  api.create = create;
  api.loadImage = loadImage;
  api.preload = preload;
})(typeof window !== 'undefined' ? window : this);
