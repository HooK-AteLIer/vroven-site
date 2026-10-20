/* НА УРОВНЕ: лукбук. Сетка с фильтрами и просмотр во весь экран. */
(function () {
  'use strict';
  var V = window.VROVEN || {};
  var doc = document;
  var shots = V.lookbook || [];
  var host = doc.getElementById('lookbook-grid');
  if (!host || !shots.length) return;

  var CATEGORIES = [
    { id: 'all', name: 'Все' },
    { id: 'kitchen', name: 'Кухни' },
    { id: 'wardrobe', name: 'Шкафы и детские' },
    { id: 'walkin', name: 'Гардеробные' },
    { id: 'hallway', name: 'Прихожие' },
    { id: 'other', name: 'Другая мебель' },
    { id: 'repair', name: 'Ремонт' }
  ];
  // категория из адреса: lookbook.html#wardrobe открывает сразу шкафы
  function hashCategory() {
    var h = (window.location.hash || '').replace(/^#/, '');
    return CATEGORIES.some(function (c) { return c.id === h; }) ? h : 'all';
  }
  var state = { category: hashCategory() };
  var visible = [];
  var current = -1;
  var opener = null;

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function chip(label, pressed, onClick) {
    var b = el('button', 'chip', label);
    b.type = 'button';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.addEventListener('click', onClick);
    return b;
  }

  /* ---------- каркас ---------- */

  var wrap = el('div', 'container lookbook');
  var filters = el('div', 'lookbook__filters');
  var catGroup = el('div', 'chip-row');
  catGroup.setAttribute('role', 'group');
  catGroup.setAttribute('aria-label', 'Категория');
  var catCap = el('p', 'lookbook__cap', 'Категория');
  filters.appendChild(catCap); filters.appendChild(catGroup);

  var status = el('p', 'lookbook__count');
  status.setAttribute('role', 'status');
  var grid = el('ul', 'lookbook__grid');
  grid.setAttribute('role', 'list');
  var empty = el('div', 'lookbook__empty');
  empty.hidden = true;
  empty.appendChild(el('p', 'lookbook__empty-title', 'Таких работ пока нет'));
  empty.appendChild(el('p', null, 'Попробуйте другую категорию. Или расскажите, что нужно вам, посмотрим и посчитаем.'));
  var reset = el('button', 'btn btn--ghost', 'Сбросить фильтры');
  reset.type = 'button';
  reset.addEventListener('click', function () { state.category = 'all'; render(); });
  empty.appendChild(reset);
  var note = el('p', 'lookbook__note', 'Это визуализации, а не фотографии с объектов. Реальные работы заменят их в этом разделе.');

  wrap.appendChild(filters); wrap.appendChild(status); wrap.appendChild(grid); wrap.appendChild(empty); wrap.appendChild(note);
  host.appendChild(wrap);

  /* ---------- сетка ---------- */

  function matches(s) {
    if (state.category !== 'all' && s.category !== state.category) return false;
    return true;
  }

  function plural(n) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'кадр';
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'кадра';
    return 'кадров';
  }

  function renderFilters() {
    catGroup.textContent = '';
    CATEGORIES.forEach(function (c) {
      catGroup.appendChild(chip(c.name, state.category === c.id, function () {
        state.category = c.id;
        render();
      }));
    });
  }

  function renderGrid() {
    visible = shots.filter(matches);
    grid.textContent = '';
    visible.forEach(function (s, i) {
      var li = el('li', 'lookbook__item');
      var b = el('button', 'lookbook__shot');
      b.type = 'button';
      b.setAttribute('aria-label', 'Открыть: ' + s.title);
      var img = doc.createElement('img');
      img.src = s.thumb; img.width = s.w; img.height = s.h;
      img.alt = s.alt; img.loading = 'lazy'; img.decoding = 'async';
      b.appendChild(img);
      var cap = el('span', 'lookbook__caption');
      cap.appendChild(el('span', 'lookbook__title', s.title));
      b.appendChild(cap);
      b.addEventListener('click', function () { openViewer(i, b); });
      li.appendChild(b);
      grid.appendChild(li);
    });
    empty.hidden = visible.length > 0;
    grid.hidden = visible.length === 0;
    status.textContent = visible.length ? 'Показано ' + visible.length + ' ' + plural(visible.length) + ' из ' + shots.length : '';
  }

  function render() { renderFilters(); renderGrid(); }

  /* ---------- просмотр ---------- */

  var box = el('div', 'viewer');
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Просмотр кадра');
  var stage = el('div', 'viewer__stage');
  var vImg = doc.createElement('img');
  vImg.className = 'viewer__img';
  vImg.decoding = 'async';
  stage.appendChild(vImg);
  var bar = el('div', 'viewer__bar');
  var meta = el('div', 'viewer__meta');
  var vTitle = el('p', 'viewer__title');
  var vCount = el('p', 'viewer__count mono');
  meta.appendChild(vTitle); meta.appendChild(vCount);
  var vAct = el('a', 'btn viewer__act');
  vAct.rel = 'noopener';
  bar.appendChild(meta); bar.appendChild(vAct);

  function navBtn(cls, label, path) {
    var b = el('button', 'viewer__btn ' + cls);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="' + path + '"/></svg>';
    return b;
  }
  var bClose = navBtn('viewer__close', 'Закрыть', 'M6 6l12 12M18 6L6 18');
  var bPrev = navBtn('viewer__prev', 'Предыдущий кадр', 'M15 5l-7 7 7 7');
  var bNext = navBtn('viewer__next', 'Следующий кадр', 'M9 5l7 7-7 7');
  box.appendChild(stage); box.appendChild(bar);
  box.appendChild(bClose); box.appendChild(bPrev); box.appendChild(bNext);
  doc.body.appendChild(box);

  function show(i) {
    if (!visible.length) return;
    current = (i + visible.length) % visible.length;
    var s = visible[current];
    vImg.src = s.src; vImg.width = s.w; vImg.height = s.h; vImg.alt = s.alt;
    vTitle.textContent = s.title;
    vCount.textContent = (current + 1) + ' / ' + visible.length;
    if (s.category === 'kitchen' && s.style) {
      vAct.textContent = 'Хочу так';
      vAct.removeAttribute('target');
      vAct.href = 'kitchen.html#style=' + encodeURIComponent(s.style);
    } else {
      vAct.textContent = 'Хочу похожее';
      vAct.target = '_blank';
      vAct.href = V.leadUrl ? V.leadUrl('general', { task: 'Хочу похожее: ' + s.title }) : '#';
    }
    var multi = visible.length > 1;
    bPrev.hidden = !multi; bNext.hidden = !multi;
    if (multi) {
      [-1, 1].forEach(function (d) {
        var n = visible[(current + d + visible.length) % visible.length];
        var pre = new Image(); pre.src = n.src;
      });
    }
  }

  function openViewer(i, trigger) {
    opener = trigger;
    box.hidden = false;
    doc.documentElement.classList.add('viewer-open');
    show(i);
    bClose.focus();
  }

  function closeViewer() {
    if (box.hidden) return;
    box.hidden = true;
    doc.documentElement.classList.remove('viewer-open');
    var back = opener;
    opener = null;
    if (back && doc.body.contains(back)) back.focus();
  }

  bClose.addEventListener('click', closeViewer);
  bPrev.addEventListener('click', function () { show(current - 1); });
  bNext.addEventListener('click', function () { show(current + 1); });
  box.addEventListener('click', function (e) { if (e.target === box || e.target === stage) closeViewer(); });

  doc.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
    else if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(box.querySelectorAll('button, a[href]'), function (n) { return !n.hidden; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!box.contains(doc.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });

  /* свайп */
  var startX = null, startY = null;
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { startX = null; return; }
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (startX == null) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - startX, dy = t.clientY - startY;
    startX = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });

  render();
})();
