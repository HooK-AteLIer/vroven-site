/*
 * ВРОВЕНЬ: конструктор кухни на странице kitchen.html.
 * Чистая часть (состояние, адрес #..., цена, текст заявки) работает и в Node —
 * её проверяет tests/kitchen-app.test.js. Работа со страницей — только в браузере.
 *
 * Адрес проекта: #style=loft&color=dark-oak&shape=corner&a=3200&b=2400&c=2400&h=2700
 *   &win=B-900-1200-900 (стена-отступ-ширина-подоконник) &door=A-0-800
 *   &sink=A-1200 (или sink=A: место по раскладке) &stove=B &isl=1200x900
 *   &tall=1 &up=920 &mat=mdf-film &rep=capital (ремонт у нас и его тип)
 * Если в адресе нет shape, это не проект, а подсказка: применяется только то,
 * что есть (например, #style=neoclassic из лукбука), остальное — из сохранённого.
 */
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports && typeof require === 'function';
  var V = root.VROVEN = root.VROVEN || {};
  var styles = isNode ? require('./kitchen-styles.js') : V.kitchenStyles;
  var data = isNode ? require('./data.js') : V.data;
  var lead = isNode ? require('./lead.js') : V.lead;

  var SHAPES = ['straight', 'corner', 'u', 'island'];
  var SHAPE_NAMES = { straight: 'прямая', corner: 'угловая', u: 'П-образная', island: 'прямая с островом' };
  var SHAPE_WALLS = { straight: ['A'], corner: ['A', 'B'], u: ['A', 'B', 'C'], island: ['A'] };
  var WALL_IDS = ['A', 'B', 'C'];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function defaults() {
    return {
      shape: 'corner',
      walls: { A: 3200, B: 2400, C: 2400 },
      ceiling: 2700,
      window: { on: true, wall: 'B', offset: 900, width: 1200, sill: 900 },
      door: { on: false, wall: 'A', offset: 0, width: 800 },
      sink: { wall: '', offset: null },
      stove: { wall: '', offset: null },
      island: { length: 1200, depth: 900 },
      tall: false,
      upper: 0,
      style: 'neoclassic',
      color: 'sage',
      material: 'mdf-film',
      withRepair: false,
      repairType: 'capital'
    };
  }

  function styleById(id) { return styles.filter(function (s) { return s.id === id; })[0] || null; }
  function colorOf(style, id) { return style.colors.filter(function (c) { return c.id === id; })[0] || style.colors[0]; }
  function materialById(id) { return data.furnitureMaterials.filter(function (m) { return m.id === id; })[0] || null; }
  function repairById(id) { return data.repairTypes.filter(function (r) { return r.id === id; })[0] || null; }

  function int(v) {
    if (v === null || v === undefined || v === '') return null;
    var x = Number(String(v).replace(',', '.'));
    return isFinite(x) ? Math.round(x) : null;
  }
  function isWall(v) { return WALL_IDS.indexOf(v) >= 0; }

  /* ---------- адрес ---------- */

  function toHash(s) {
    var p = [];
    function add(k, v) { if (v !== null && v !== undefined && v !== '') p.push(k + '=' + encodeURIComponent(String(v))); }
    add('style', s.style);
    add('color', s.color);
    add('shape', s.shape);
    add('a', s.walls.A); add('b', s.walls.B); add('c', s.walls.C);
    add('h', s.ceiling);
    if (s.window && s.window.on) add('win', [s.window.wall, s.window.offset, s.window.width].concat(s.window.sill == null ? [] : [s.window.sill]).join('-'));
    if (s.door && s.door.on) add('door', [s.door.wall, s.door.offset, s.door.width].join('-'));
    if (s.sink && s.sink.wall) add('sink', s.sink.offset == null ? s.sink.wall : s.sink.wall + '-' + s.sink.offset);
    if (s.stove && s.stove.wall) add('stove', s.stove.offset == null ? s.stove.wall : s.stove.wall + '-' + s.stove.offset);
    if (s.shape === 'island') add('isl', s.island.length + 'x' + s.island.depth);
    if (s.tall) add('tall', 1);
    if (s.upper) add('up', s.upper);
    add('mat', s.material);
    if (s.withRepair) add('rep', s.repairType);
    return p.join('&');
  }

  function parseParams(hash) {
    var out = {};
    String(hash || '').replace(/^#/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var key = i < 0 ? pair : pair.slice(0, i);
      var val = i < 0 ? '' : pair.slice(i + 1);
      try { out[decodeURIComponent(key)] = decodeURIComponent(val.replace(/\+/g, ' ')); } catch (e) { /* битая пара: пропускаем */ }
    });
    return out;
  }

  function parseOpening(v, withSill) {
    var parts = String(v).split('-');
    if (!isWall(parts[0])) return null;
    var o = { on: true, wall: parts[0], offset: int(parts[1]), width: int(parts[2]) };
    if (o.offset === null || o.width === null) return null;
    if (withSill) o.sill = int(parts[3]);
    return o;
  }
  function parsePoint(v) {
    var parts = String(v).split('-');
    if (!isWall(parts[0])) return null;
    return { wall: parts[0], offset: int(parts[1]) };
  }

  // Применяет адрес к основе. Полный проект (есть shape) задаёт всё; подсказка — только своё.
  function fromHash(hash, base) {
    var p = parseParams(hash);
    var s = clone(base || defaults());
    var full = SHAPES.indexOf(p.shape) >= 0;
    if (full) {
      s.shape = p.shape;
      s.window = Object.assign({}, s.window, { on: false });
      s.door = Object.assign({}, s.door, { on: false });
      s.sink = { wall: '', offset: null };
      s.stove = { wall: '', offset: null };
      s.tall = false;
      s.upper = 0;
      s.withRepair = false;
    }
    [['a', 'A'], ['b', 'B'], ['c', 'C']].forEach(function (w) { if (p[w[0]] !== undefined && int(p[w[0]]) !== null) s.walls[w[1]] = int(p[w[0]]); });
    if (p.h !== undefined && int(p.h) !== null) s.ceiling = int(p.h);
    if (p.win) { var win = parseOpening(p.win, true); if (win) s.window = win; }
    if (p.door) { var door = parseOpening(p.door, false); if (door) s.door = door; }
    if (p.sink) { var sink = parsePoint(p.sink); if (sink) s.sink = sink; }
    if (p.stove) { var stove = parsePoint(p.stove); if (stove) s.stove = stove; }
    if (p.isl) {
      var m = /^(\d+)x(\d+)$/.exec(p.isl);
      if (m) s.island = { length: int(m[1]), depth: int(m[2]) };
    }
    if (p.tall !== undefined) s.tall = p.tall === '1';
    if (p.up !== undefined) s.upper = int(p.up) === 720 || int(p.up) === 920 ? int(p.up) : 0;
    if (p.mat && materialById(p.mat)) s.material = p.mat;
    if (p.rep !== undefined) {
      if (repairById(p.rep)) { s.withRepair = true; s.repairType = p.rep; }
    }
    if (p.style && styleById(p.style) && p.style !== s.style) {
      s.style = p.style;
      s.color = styleById(p.style).colors[0].id;
    }
    var st = styleById(s.style) || styles[0];
    s.style = st.id;
    if (p.color && st.colors.some(function (c) { return c.id === p.color; })) s.color = p.color;
    if (!st.colors.some(function (c) { return c.id === s.color; })) s.color = st.colors[0].id;
    return s;
  }

  // Состояние из localStorage: проверяем форму, мусор не пускаем.
  function sanitize(obj) {
    var s = defaults();
    if (!obj || typeof obj !== 'object') return s;
    if (SHAPES.indexOf(obj.shape) >= 0) s.shape = obj.shape;
    if (obj.walls) WALL_IDS.forEach(function (id) { if (obj.walls[id] === null || int(obj.walls[id]) !== null) s.walls[id] = obj.walls[id] === null ? null : int(obj.walls[id]); });
    if (obj.ceiling === null || int(obj.ceiling) !== null) s.ceiling = obj.ceiling === null ? null : int(obj.ceiling);
    ['window', 'door'].forEach(function (key) {
      var o = obj[key];
      if (!o) return;
      s[key] = { on: !!o.on, wall: isWall(o.wall) ? o.wall : s[key].wall, offset: int(o.offset), width: int(o.width) };
      if (key === 'window') s[key].sill = int(o.sill);
    });
    ['sink', 'stove'].forEach(function (key) {
      var o = obj[key];
      if (o) s[key] = { wall: isWall(o.wall) ? o.wall : '', offset: int(o.offset) };
    });
    if (obj.island) s.island = { length: int(obj.island.length), depth: int(obj.island.depth) };
    s.tall = !!obj.tall;
    s.upper = obj.upper === 720 || obj.upper === 920 ? obj.upper : 0;
    if (styleById(obj.style)) s.style = obj.style;
    s.color = colorOf(styleById(s.style), obj.color).id;
    if (materialById(obj.material)) s.material = obj.material;
    s.withRepair = !!obj.withRepair;
    if (repairById(obj.repairType)) s.repairType = obj.repairType;
    return s;
  }

  /* ---------- вход раскладки ---------- */

  function toLayoutInput(s) {
    var ids = SHAPE_WALLS[s.shape] || ['A'];
    var walls = {};
    ids.forEach(function (id) { walls[id] = s.walls[id]; });
    var input = { shape: s.shape, walls: walls, ceiling: s.ceiling };
    if (s.window && s.window.on) input.window = { wall: s.window.wall, offset: s.window.offset, width: s.window.width, sill: s.window.sill };
    if (s.door && s.door.on) input.door = { wall: s.door.wall, offset: s.door.offset, width: s.door.width };
    ['sink', 'stove'].forEach(function (key) {
      var p = s[key];
      if (p && p.wall) input[key] = p.offset == null ? { wall: p.wall } : { wall: p.wall, offset: p.offset };
    });
    if (s.shape === 'island') input.island = { length: s.island.length, depth: s.island.depth };
    input.options = { tallUnit: !!s.tall };
    if (s.upper) input.options.upperHeight = s.upper;
    return input;
  }

  /* ---------- цена ---------- */

  // { runMeters, materialId, city, withRepair, repairType } → { price, discountPct, priceWithDiscount, placeholder }
  function estimate(params, d, pricing) {
    d = d || data;
    if (pricing && typeof pricing.kitchenEstimate === 'function') {
      try {
        var r = pricing.kitchenEstimate(params, d);
        if (r && isFinite(r.price)) {
          return { price: r.price, discountPct: r.discountPct || 0, priceWithDiscount: isFinite(r.priceWithDiscount) ? r.priceWithDiscount : r.price, placeholder: !!r.placeholder };
        }
      } catch (e) { /* считаем сами ниже */ }
    }
    var mat = d.furnitureMaterials.filter(function (m) { return m.id === params.materialId; })[0];
    if (!mat || !mat.perMeter || !isFinite(params.runMeters)) return { price: null, discountPct: 0, priceWithDiscount: null, placeholder: true };
    var price = Math.round(params.runMeters * mat.perMeter.value);
    var pct = params.withRepair ? (d.bundleDiscount[params.repairType] || 0) : 0;
    return { price: price, discountPct: pct, priceWithDiscount: Math.round(price * (100 - pct) / 100), placeholder: !!mat.perMeter.placeholder };
  }

  /* ---------- текст заявки ---------- */

  // текст для WhatsApp: формат чисел общий с lead.js
  function mm(v) { return lead.mm(v); }

  function placeOf(layout, kind) {
    if (!layout || !layout.ok) return null;
    for (var i = 0; i < layout.walls.length; i++) {
      var m = layout.walls[i].lower.filter(function (x) { return x.kind === kind; })[0];
      if (m) return { wall: layout.walls[i].id, offset: m.x };
    }
    return null;
  }

  // ctx: { cityName, link, pricing }
  function buildMessage(s, layout, ctx) {
    ctx = ctx || {};
    var style = styleById(s.style) || styles[0];
    var color = colorOf(style, s.color);
    var mat = materialById(s.material);
    var ok = layout && layout.ok;
    var est = ok ? estimate({ runMeters: layout.runMeters, materialId: s.material, city: ctx.cityId, withRepair: s.withRepair, repairType: s.repairType }, data, ctx.pricing) : null;
    var walls = {};
    (SHAPE_WALLS[s.shape] || ['A']).forEach(function (id) { walls[id] = s.walls[id]; });
    var text = lead.buildMessage('kitchen', {
      shapeName: SHAPE_NAMES[s.shape],
      walls: walls,
      ceiling: s.ceiling,
      styleName: style.name,
      colorName: color.name,
      materialName: mat ? mat.name : '',
      runMeters: ok ? layout.runMeters : null,
      price: est ? est.priceWithDiscount : null,
      withRepair: !!s.withRepair,
      link: ctx.link || ''
    }, ctx.cityName || '');

    var extra = [];
    if (s.window && s.window.on) {
      extra.push('Окно: стена ' + s.window.wall + ', от левого края ' + mm(s.window.offset) + ', ширина ' + mm(s.window.width) +
        (s.window.sill != null ? ', подоконник ' + mm(s.window.sill) : ''));
    }
    if (s.door && s.door.on) extra.push('Дверь: стена ' + s.door.wall + ', от левого края ' + mm(s.door.offset) + ', ширина ' + mm(s.door.width));
    if (s.shape === 'island' && s.island.length && s.island.depth) extra.push('Остров: ' + mm(s.island.length).replace(' мм', '') + ' × ' + mm(s.island.depth));
    [['sink', 'Мойка'], ['stove', 'Плита']].forEach(function (pair) {
      var placed = placeOf(layout, pair[0]);
      var wanted = s[pair[0]];
      if (placed) extra.push(pair[1] + ': стена ' + placed.wall + ', от левого края ' + mm(placed.offset));
      else if (wanted && wanted.wall) extra.push(pair[1] + ': стена ' + wanted.wall + (wanted.offset != null ? ', от левого края ' + mm(wanted.offset) : ''));
    });
    if (ok) {
      if (layout.walls.some(function (w) { return w.lower.some(function (m) { return m.kind === 'tall'; }); })) extra.push('Пенал под духовку');
      extra.push('Верхние шкафы: ' + mm(layout.upperHeight));
    }
    if (s.withRepair) {
      var rep = repairById(s.repairType);
      if (rep) extra.push('Ремонт: ' + rep.name.toLowerCase() + (est && est.discountPct ? ', скидка на кухню ' + est.discountPct + '%' : ''));
    }

    var lines = text.split('\n');
    var at = -1;
    ['Потолок:', 'Стены:', 'Форма:'].some(function (label) {
      for (var i = 0; i < lines.length; i++) if (lines[i].indexOf(label) === 0) { at = i; return true; }
      return false;
    });
    if (at < 0) at = Math.min(1, lines.length - 1);
    lines.splice.apply(lines, [at + 1, 0].concat(extra));
    return lines.join('\n');
  }

  var api = {
    defaults: defaults, toHash: toHash, fromHash: fromHash, sanitize: sanitize,
    toLayoutInput: toLayoutInput, estimate: estimate, buildMessage: buildMessage,
    SHAPE_NAMES: SHAPE_NAMES, SHAPE_WALLS: SHAPE_WALLS
  };

  if (isNode) { module.exports = api; return; }
  V.kitchenApp = api;

  /* ================= страница ================= */

  var doc = root.document;
  var STORE = 'vroven.kitchen';
  var reduceMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state, lastGood = null, currentWall = 'A', timer = null, resizeTimer = null;
  var $ = function (sel) { return doc.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(doc.querySelectorAll(sel)); };

  function readStored() {
    try { var raw = root.localStorage.getItem(STORE); return raw ? sanitize(JSON.parse(raw)) : null; } catch (e) { return null; }
  }
  function save() {
    try { root.localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* приватный режим */ }
    var h = '#' + toHash(state);
    if (root.location.hash !== h && root.history && root.history.replaceState) root.history.replaceState(null, '', h);
  }

  /* ----- форма ↔ состояние ----- */

  function val(id) { var el = doc.getElementById(id); return el ? el.value : ''; }
  function setVal(id, v) { var el = doc.getElementById(id); if (el) el.value = v === null || v === undefined ? '' : v; }
  function checked(id) { var el = doc.getElementById(id); return !!(el && el.checked); }
  function setChecked(id, v) { var el = doc.getElementById(id); if (el) el.checked = !!v; }

  function readForm() {
    var shapeEl = doc.querySelector('input[name="kd-shape"]:checked');
    state.shape = shapeEl ? shapeEl.value : state.shape;
    WALL_IDS.forEach(function (id) { state.walls[id] = int(val('kd-wall-' + id)); });
    state.ceiling = int(val('kd-ceiling'));
    state.island = { length: int(val('kd-island-length')), depth: int(val('kd-island-depth')) };
    state.window = { on: checked('kd-win-on'), wall: val('kd-win-wall') || 'A', offset: int(val('kd-win-offset')), width: int(val('kd-win-width')), sill: int(val('kd-win-sill')) };
    state.door = { on: checked('kd-door-on'), wall: val('kd-door-wall') || 'A', offset: int(val('kd-door-offset')), width: int(val('kd-door-width')) };
    state.sink = { wall: val('kd-sink-wall'), offset: int(val('kd-sink-offset')) };
    state.stove = { wall: val('kd-stove-wall'), offset: int(val('kd-stove-offset')) };
    state.tall = checked('kd-tall');
    state.upper = int(val('kd-upper')) || 0;
    var matEl = doc.querySelector('input[name="kd-material"]:checked');
    if (matEl) state.material = matEl.value;
    state.withRepair = checked('kd-repair');
    state.repairType = val('kd-repair-type') || state.repairType;
  }

  function fillWallSelects() {
    var ids = SHAPE_WALLS[state.shape];
    ['kd-win-wall', 'kd-door-wall', 'kd-sink-wall', 'kd-stove-wall'].forEach(function (sid) {
      var sel = doc.getElementById(sid);
      if (!sel) return;
      var auto = sid === 'kd-sink-wall' || sid === 'kd-stove-wall';
      var cur = sel.value;
      sel.textContent = '';
      if (auto) sel.appendChild(new Option('Авто', ''));
      ids.forEach(function (id) { sel.appendChild(new Option('Стена ' + id, id)); });
      if (ids.indexOf(cur) >= 0 || (auto && cur === '')) sel.value = cur;
      else sel.value = auto ? '' : ids[0];
    });
  }

  function writeForm() {
    var shapeEl = doc.querySelector('input[name="kd-shape"][value="' + state.shape + '"]');
    if (shapeEl) shapeEl.checked = true;
    WALL_IDS.forEach(function (id) { setVal('kd-wall-' + id, state.walls[id]); });
    setVal('kd-ceiling', state.ceiling);
    setVal('kd-island-length', state.island.length);
    setVal('kd-island-depth', state.island.depth);
    fillWallSelects();
    setChecked('kd-win-on', state.window.on);
    setVal('kd-win-wall', state.window.wall); setVal('kd-win-offset', state.window.offset);
    setVal('kd-win-width', state.window.width); setVal('kd-win-sill', state.window.sill);
    setChecked('kd-door-on', state.door.on);
    setVal('kd-door-wall', state.door.wall); setVal('kd-door-offset', state.door.offset); setVal('kd-door-width', state.door.width);
    setVal('kd-sink-wall', state.sink.wall); setVal('kd-sink-offset', state.sink.offset);
    setVal('kd-stove-wall', state.stove.wall); setVal('kd-stove-offset', state.stove.offset);
    fillWallSelects();
    setChecked('kd-tall', state.tall);
    setVal('kd-upper', state.upper || 0);
    var matEl = doc.querySelector('input[name="kd-material"][value="' + state.material + '"]');
    if (matEl) matEl.checked = true;
    setChecked('kd-repair', state.withRepair);
    setVal('kd-repair-type', state.repairType);
    syncVisibility();
  }

  function syncVisibility() {
    var ids = SHAPE_WALLS[state.shape];
    $$('[data-kd-wall]').forEach(function (el) { el.hidden = ids.indexOf(el.getAttribute('data-kd-wall')) < 0; });
    $$('[data-kd-island]').forEach(function (el) { el.hidden = state.shape !== 'island'; });
    var winBox = $('#kd-win-fields'), doorBox = $('#kd-door-fields');
    if (winBox) winBox.hidden = !state.window.on;
    if (doorBox) doorBox.hidden = !state.door.on;
    var sinkOff = $('#kd-sink-offset-field'), stoveOff = $('#kd-stove-offset-field');
    if (sinkOff) sinkOff.hidden = !state.sink.wall;
    if (stoveOff) stoveOff.hidden = !state.stove.wall;
    var rt = $('#kd-repair-type-field');
    if (rt) rt.hidden = !state.withRepair;
  }

  /* ----- ошибки у полей ----- */

  var FIELD_OF = {
    'walls.A': 'walls.A', 'walls.B': 'walls.B', 'walls.C': 'walls.C', ceiling: 'ceiling',
    window: 'window', door: 'door', sink: 'sink', stove: 'stove', shape: 'shape',
    'island.length': 'island.length', 'island.depth': 'island.depth', 'options.upperHeight': 'options.upperHeight'
  };

  function showErrors(errors) {
    $$('[data-kd-err]').forEach(function (box) {
      box.classList.remove('is-invalid');
      var p = box.querySelector('.field__error');
      if (p) { p.textContent = ''; p.hidden = true; }
    });
    (errors || []).forEach(function (e) {
      var key = FIELD_OF[e.field] || 'shape';
      var box = doc.querySelector('[data-kd-err="' + key + '"]') || doc.querySelector('[data-kd-err="shape"]');
      if (!box) return;
      box.classList.add('is-invalid');
      var p = box.querySelector('.field__error');
      if (p) { p.textContent = p.textContent ? p.textContent + ' ' + e.message : e.message; p.hidden = false; }
    });
  }

  /* ----- стили и цвета ----- */

  function buildStyles() {
    var list = $('#kd-styles');
    if (!list) return;
    list.textContent = '';
    styles.forEach(function (s) {
      var label = doc.createElement('label');
      label.className = 'kd-style';
      label.innerHTML = '<input type="radio" name="kd-style" class="visually-hidden">' +
        '<span class="kd-style__img"></span><span class="kd-style__name"></span>';
      var input = label.querySelector('input');
      input.value = s.id;
      label.querySelector('.kd-style__name').textContent = s.name;
      label.querySelector('.kd-style__img').innerHTML = V.kitchenRender.swatch(s, s.colors[0].id);
      label.title = s.blurb;
      list.appendChild(label);
    });
    list.addEventListener('change', function (e) {
      if (e.target.name !== 'kd-style') return;
      var st = styleById(e.target.value);
      state.style = st.id;
      state.color = st.colors[0].id;
      onLook();
    });
  }

  function syncStyles() {
    var st = styleById(state.style);
    $$('input[name="kd-style"]').forEach(function (i) { i.checked = i.value === state.style; });
    var blurb = $('#kd-style-blurb');
    if (blurb) blurb.textContent = st.blurb;
    var colors = $('#kd-colors');
    if (!colors) return;
    colors.textContent = '';
    st.colors.forEach(function (c) {
      var label = doc.createElement('label');
      label.className = 'kd-color';
      label.innerHTML = '<input type="radio" name="kd-color" class="visually-hidden"><span class="kd-color__dot" aria-hidden="true"></span><span></span>';
      var input = label.querySelector('input');
      input.value = c.id;
      input.checked = c.id === state.color;
      label.querySelector('.kd-color__dot').style.background =
        'linear-gradient(135deg, ' + c.facade + ' 0 50%, ' + (c.lower || c.tall || c.counter) + ' 50% 100%)';
      label.lastChild.textContent = c.name;
      colors.appendChild(label);
    });
  }

  function onLook() {
    syncStyles();
    draw(true);
    updatePrice();
    save();
  }

  /* ----- чертёж ----- */

  function crossfade(svg) {
    if (reduceMotion || !svg.innerHTML) return;
    var ghost = svg.cloneNode(true);
    ghost.removeAttribute('id');
    ghost.classList.add('kd-ghost');
    ghost.setAttribute('aria-hidden', 'true');
    svg.parentNode.appendChild(ghost);
    root.requestAnimationFrame(function () {
      root.requestAnimationFrame(function () { ghost.style.opacity = '0'; });
    });
    root.setTimeout(function () { if (ghost.parentNode) ghost.parentNode.removeChild(ghost); }, 520);
  }

  function buildTabs(layout) {
    var tabs = $('#kd-tabs');
    if (!tabs) return;
    var ids = layout.walls.map(function (w) { return w.id; });
    if (ids.indexOf(currentWall) < 0) currentWall = ids[0];
    tabs.hidden = ids.length < 2;
    tabs.textContent = '';
    ids.forEach(function (id) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'chip kd-tab';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', id === currentWall ? 'true' : 'false');
      b.setAttribute('aria-controls', 'kd-elevation');
      b.tabIndex = id === currentWall ? 0 : -1;
      b.textContent = 'Стена ' + id;
      b.setAttribute('data-wall', id);
      tabs.appendChild(b);
    });
  }

  function draw(animate) {
    var elev = $('#kd-elevation'), plan = $('#kd-plan');
    var layout = lastGood;
    var empty = $('#kd-empty');
    if (!layout) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    buildTabs(layout);
    var wall = layout.walls.filter(function (w) { return w.id === currentWall; })[0] || layout.walls[0];
    var style = styleById(state.style);
    if (animate) { crossfade(elev); crossfade(plan); }
    V.kitchenRender.renderElevation(elev, wall, style, state.color, layout.ceiling, { upperHeight: layout.upperHeight, layout: layout });
    V.kitchenRender.renderPlan(plan, layout, { style: style, colorId: state.color });
    var cap = $('#kd-elev-caption');
    if (cap) {
      cap.textContent = 'Стена ' + wall.id + ', ' + V.format.mm(wall.length) + '. Фасадная развёртка, размеры в миллиметрах.';
    }
    elev.setAttribute('aria-label', 'Развёртка стены ' + wall.id + ' длиной ' + wall.length + ' мм в стиле «' + style.name + '»');
    plan.setAttribute('aria-label', 'Вид сверху: ' + SHAPE_NAMES[state.shape] + ' кухня');
  }

  function showWarnings(layout) {
    var box = $('#kd-warnings');
    if (!box) return;
    box.textContent = '';
    var list = layout && layout.ok ? layout.warnings : [];
    list.forEach(function (w) {
      var li = doc.createElement('li');
      li.textContent = w;
      box.appendChild(li);
    });
    box.hidden = !list.length;
  }

  /* ----- цена и отправка ----- */

  function cityId() { return V.city ? V.city.get() : data.defaultCity; }
  function cityName() { return V.city ? V.city.current().name : ''; }

  function updatePrice() {
    var out = $('#kd-price'), old = $('#kd-price-old'), note = $('#kd-price-note'), save_ = $('#kd-price-save');
    var layout = lastGood;
    if (!out) return;
    if (!layout) { out.textContent = '…'; return; }
    var est = estimate({ runMeters: layout.runMeters, materialId: state.material, city: cityId(), withRepair: state.withRepair, repairType: state.repairType }, data, V.pricing);
    var mat = materialById(state.material);
    out.textContent = est.priceWithDiscount != null ? V.format.rub(est.priceWithDiscount) : 'по смете после замера';
    V.placeholderBadge(out, est.placeholder, 'ориентировочно');
    if (old) {
      old.hidden = !est.discountPct;
      old.textContent = est.discountPct ? V.format.rub(est.price) : '';
    }
    if (save_) {
      save_.hidden = !est.discountPct;
      save_.textContent = est.discountPct ? '−' + est.discountPct + '% с ремонтом, экономия ' + V.format.rub(est.price - est.priceWithDiscount) : '';
    }
    if (note && mat) {
      note.textContent = String(layout.runMeters).replace('.', ',') + ' п.м. × ' + V.format.rub(mat.perMeter.value) + ' за п.м. (' + mat.name + ')';
    }
    $$('[data-kd-pct]').forEach(function (el) {
      var id = el.getAttribute('data-kd-pct');
      el.textContent = '−' + (data.bundleDiscount[id] || 0) + '%';
    });
    updateSend();
  }

  function projectLink() {
    var l = root.location;
    return l.origin && l.origin !== 'null' ? l.origin + l.pathname + '#' + toHash(state) : '';
  }

  function message() {
    return buildMessage(state, lastGood, { cityName: cityName(), cityId: cityId(), link: projectLink(), pricing: V.pricing });
  }

  function updateSend() {
    var send = $('#kd-send');
    if (send) send.href = lead.whatsappUrl(message());
  }

  function copyText(text) {
    if (root.navigator.clipboard && root.isSecureContext) return root.navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = doc.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      doc.body.appendChild(ta);
      ta.select();
      try { doc.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
      doc.body.removeChild(ta);
    });
  }

  /* ----- цикл обновления ----- */

  function update(opts) {
    opts = opts || {};
    readForm();
    syncVisibility();
    var layout = V.kitchenLayout.layout(toLayoutInput(state));
    var notice = $('#kd-stale');
    if (layout.ok) {
      lastGood = layout;
      showErrors([]);
      if (notice) notice.hidden = true;
    } else {
      showErrors(layout.errors);
      if (notice) notice.hidden = !lastGood;
    }
    showWarnings(layout);
    draw(!!opts.animate);
    updatePrice();
    save();
  }

  function schedule() {
    root.clearTimeout(timer);
    timer = root.setTimeout(update, 180);
  }

  function initEvents() {
    var form = $('#kd-form');
    form.addEventListener('input', schedule);
    form.addEventListener('change', function (e) {
      if (e.target.name === 'kd-shape') {
        readForm();
        fillWallSelects();
      }
      root.clearTimeout(timer);
      update();
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); update(); });
    var price = $('#kd-price-box');
    if (price) {
      price.addEventListener('change', function () { readForm(); syncVisibility(); updatePrice(); save(); });
    }
    var colors = $('#kd-colors');
    if (colors) {
      colors.addEventListener('change', function (e) {
        if (e.target.name !== 'kd-color') return;
        state.color = e.target.value;
        draw(true);
        updateSend();
        save();
      });
    }
    var tabs = $('#kd-tabs');
    if (tabs) {
      tabs.addEventListener('click', function (e) {
        var b = e.target.closest('[data-wall]');
        if (!b) return;
        currentWall = b.getAttribute('data-wall');
        draw(true);
        var nb = tabs.querySelector('[data-wall="' + currentWall + '"]');
        if (nb) nb.focus();
      });
      tabs.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        var ids = lastGood ? lastGood.walls.map(function (w) { return w.id; }) : [];
        var i = ids.indexOf(currentWall);
        if (i < 0) return;
        currentWall = ids[(i + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length];
        draw(true);
        var nb = tabs.querySelector('[data-wall="' + currentWall + '"]');
        if (nb) nb.focus();
        e.preventDefault();
      });
    }
    var copy = $('#kd-copy');
    if (copy) {
      copy.addEventListener('click', function () {
        var status = $('#kd-copy-status');
        copyText(message()).then(function () {
          if (status) status.textContent = 'Текст проекта скопирован. Вставьте его в мессенджер или письмо.';
        }, function () {
          if (status) status.textContent = 'Не получилось скопировать. Нажмите «Отправить замер» или позвоните.';
        });
      });
    }
    doc.addEventListener('vroven:city', function () { updatePrice(); });
    root.addEventListener('hashchange', function () {
      if (root.location.hash.replace(/^#/, '') === toHash(state)) return;
      state = fromHash(root.location.hash, state);
      writeForm();
      syncStyles();
      update({ animate: true });
    });
    var stage = $('#kd-stage');
    if (stage && 'ResizeObserver' in root) {
      var lastW = 0;
      new root.ResizeObserver(function (entries) {
        var w = Math.round(entries[0].contentRect.width);
        if (Math.abs(w - lastW) < 8) return;
        lastW = w;
        root.clearTimeout(resizeTimer);
        resizeTimer = root.setTimeout(function () { draw(false); }, 120);
      }).observe(stage);
    }
  }

  function init() {
    if (!$('#kd-form') || !V.kitchenLayout || !V.kitchenRender) return;
    var base = readStored() || defaults();
    state = root.location.hash.length > 1 ? fromHash(root.location.hash, base) : base;
    var offer = $('#kd-offer');
    if (offer) offer.textContent = data.kitchenOffer;
    buildStyles();
    writeForm();
    syncStyles();
    initEvents();
    update();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : this);
