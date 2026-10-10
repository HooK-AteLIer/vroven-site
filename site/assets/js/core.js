/*
 * ВРОВЕНЬ: общее для всех страниц.
 * Город, форматирование, метки-заглушки, шапка (меню, город, активный пункт),
 * подстановка фактов из data.js и ссылок заявки.
 *
 * Разметка, которую понимает core.js:
 *   [data-city-switch]            контейнер, сюда рисуются кнопки городов
 *   [data-city-text="name|nameIn|office|workshop"]  текст текущего города
 *   [data-phone]                  текст номера; если это <a>, ставится tel:
 *   [data-tel]                    <a>: только href tel:
 *   [data-whatsapp]               <a>: WhatsApp с общей заявкой
 *   [data-lead="general|repair|bundle|kitchen|job"] <a>: WhatsApp с текстом заявки;
 *        data-lead-payload='{"position":"Маляр"}' даёт поля заявки
 *   [data-fact="brand.tagline"]   любой факт из data.js по пути
 *   [data-menu-toggle], [data-menu] мобильное меню
 *   body[data-page="home|kitchen|lookbook|jobs"], nav a[data-nav]
 */
(function (root, doc) {
  'use strict';

  var V = root.VROVEN = root.VROVEN || {};
  var data = V.data;
  var STORAGE_KEY = 'vroven.city';
  var memoryCity = null;

  /* ---------- город ---------- */

  function isCity(id) {
    return !!(id && data && data.cities && Object.prototype.hasOwnProperty.call(data.cities, id));
  }

  function readStored() {
    try { return root.localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  var city = {
    get: function () {
      var id = memoryCity || readStored();
      return isCity(id) ? id : data.defaultCity;
    },
    set: function (id) {
      if (!isCity(id)) return false;
      memoryCity = id;
      try { root.localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* приватный режим: помним до перезагрузки */ }
      renderCity();
      doc.dispatchEvent(new CustomEvent('vroven:city', { detail: { id: id } }));
      return true;
    },
    current: function () { return data.cities[city.get()]; }
  };

  // другая вкладка сменила город
  root.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY && isCity(e.newValue) && e.newValue !== memoryCity) {
      memoryCity = e.newValue;
      renderCity();
      doc.dispatchEvent(new CustomEvent('vroven:city', { detail: { id: e.newValue } }));
    }
  });

  /* ---------- форматирование ---------- */

  var NBSP = ' ';
  function group(n) {
    var r = Math.round(Number(n));
    if (!isFinite(r)) return '';
    return String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP).replace(/^/, r < 0 ? '-' : '');
  }
  var format = {
    rub: function (n) { var g = group(n); return g ? g + NBSP + '₽' : ''; },
    mm: function (n) { var g = group(n); return g ? g + NBSP + 'мм' : ''; },
    num: group
  };

  /* ---------- метка «ориентировочно» ---------- */

  function placeholderBadge(el, isPlaceholder, label) {
    if (!el) return;
    var next = el.nextElementSibling;
    var has = next && next.classList.contains('badge-placeholder') && next.hasAttribute('data-auto-badge');
    if (isPlaceholder && !has) {
      var b = doc.createElement('span');
      b.className = 'badge-placeholder';
      b.setAttribute('data-auto-badge', '');
      b.textContent = label || 'ориентировочно';
      el.insertAdjacentElement('afterend', b);
    } else if (!isPlaceholder && has) {
      next.remove();
    }
  }

  /* ---------- факты ---------- */

  function byPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }

  function setFact(el, value) {
    if (value == null) return;
    var isObj = typeof value === 'object';
    el.textContent = isObj ? value.text : String(value);
    el.classList.toggle('is-placeholder', !!(isObj && value.placeholder));
  }

  function renderFacts() {
    if (!V.lead) return;
    doc.querySelectorAll('[data-fact]').forEach(function (el) {
      setFact(el, byPath(data, el.getAttribute('data-fact')));
    });
    doc.querySelectorAll('[data-phone]').forEach(function (el) {
      el.textContent = data.phone.display;
      if (el.tagName === 'A') el.href = V.lead.telUrl();
    });
    doc.querySelectorAll('a[data-tel]').forEach(function (el) {
      el.href = V.lead.telUrl();
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'Позвонить ' + data.phone.display);
    });
  }

  function renderCity() {
    var c = city.current();
    doc.querySelectorAll('[data-city-text]').forEach(function (el) {
      setFact(el, c[el.getAttribute('data-city-text')]);
    });
    doc.querySelectorAll('[data-city-switch] [data-city]').forEach(function (btn) {
      var on = btn.getAttribute('data-city') === c.id;
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
    });
    renderLeads();
  }

  /* ---------- заявка ---------- */

  function leadUrl(kind, payload) {
    return V.lead.whatsappUrl(V.lead.buildMessage(kind, payload || {}, city.current().name));
  }

  function renderLeads() {
    if (!V.lead) return;
    doc.querySelectorAll('a[data-lead], a[data-whatsapp]').forEach(function (el) {
      var kind = el.getAttribute('data-lead') || 'general';
      var payload = {};
      var raw = el.getAttribute('data-lead-payload');
      if (raw) { try { payload = JSON.parse(raw); } catch (e) { payload = {}; } }
      el.href = leadUrl(kind, payload);
      el.target = '_blank';
      el.rel = 'noopener';
    });
  }

  /* ---------- переключатель города ---------- */

  function buildCitySwitches() {
    doc.querySelectorAll('[data-city-switch]').forEach(function (box) {
      box.setAttribute('role', 'radiogroup');
      if (!box.getAttribute('aria-label')) box.setAttribute('aria-label', 'Город');
      box.textContent = '';
      Object.keys(data.cities).forEach(function (id) {
        var b = doc.createElement('button');
        b.type = 'button';
        b.className = 'city-switch__btn';
        b.setAttribute('role', 'radio');
        b.setAttribute('data-city', id);
        b.textContent = data.cities[id].name;
        box.appendChild(b);
      });
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-city]');
        if (b) city.set(b.getAttribute('data-city'));
      });
      box.addEventListener('keydown', function (e) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
        var ids = Object.keys(data.cities);
        var i = ids.indexOf(city.get());
        var step = (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 1;
        var nextId = ids[(i + step + ids.length) % ids.length];
        city.set(nextId);
        var nb = box.querySelector('[data-city="' + nextId + '"]');
        if (nb) nb.focus();
        e.preventDefault();
      });
    });
  }

  /* ---------- мобильное меню ---------- */

  function initMenu() {
    var toggle = doc.querySelector('[data-menu-toggle]');
    var menu = doc.querySelector('[data-menu]');
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      menu.classList.toggle('is-open', open);
      doc.documentElement.classList.toggle('menu-open', open);
    }
    setOpen(false);

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    var mq = root.matchMedia('(min-width: 1240px)');
    var onMq = function () { if (mq.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);
  }

  /* ---------- активный пункт меню ---------- */

  function initActiveNav() {
    var page = doc.body.getAttribute('data-page');
    var links = doc.querySelectorAll('.site-nav a[data-nav]');
    links.forEach(function (a) {
      if (a.getAttribute('data-nav') === page) a.setAttribute('aria-current', 'page');
    });
    if (page !== 'home' || !('IntersectionObserver' in root)) return;

    // на главной подсвечиваем раздел, который сейчас на экране
    var map = {};
    links.forEach(function (a) {
      var hash = (a.getAttribute('href') || '').split('#')[1];
      if (hash) (map[hash] = map[hash] || []).push(a);
    });
    var targets = Object.keys(map).map(function (id) { return doc.getElementById(id); }).filter(Boolean);
    if (!targets.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        (map[en.target.id] || []).forEach(function (a) { a.classList.add('is-active'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------- шапка при прокрутке и проявление блоков ---------- */

  function initScrollState() {
    var header = doc.querySelector('.site-header');
    if (!header) return;
    var onScroll = function () { header.classList.toggle('is-scrolled', root.scrollY > 8); };
    root.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initReveal() {
    var els = doc.querySelectorAll('[data-reveal]');
    var reduce = root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in root)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  function init() {
    doc.documentElement.classList.add('js');
    buildCitySwitches();
    renderFacts();
    renderCity();
    initMenu();
    initActiveNav();
    initScrollState();
    initReveal();
    var y = doc.querySelector('[data-year]');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  V.city = city;
  V.format = format;
  V.placeholderBadge = placeholderBadge;
  V.leadUrl = leadUrl;
  V.refreshLeads = renderLeads;

  // все defer-скрипты (и lead.js после core.js) выполнены до DOMContentLoaded
  // defer-скрипты выполняются при readyState 'interactive', ещё до DOMContentLoaded
  if (doc.readyState === 'complete') init();
  else doc.addEventListener('DOMContentLoaded', init);
})(window, document);
