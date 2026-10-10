/*
 * ВРОВЕНЬ: чертёж кухни в SVG.
 *   renderElevation(svgEl, wallLayout, style, colorId, ceiling, opts?) — фасадная развёртка стены
 *   renderPlan(svgEl, layout, opts?) — вид сверху всех стен и острова
 *   swatch(style, colorId) — маленькая картинка стиля для выбора (строка SVG)
 * Ничего не считает за kitchen-layout: только рисует модули, которые он дал.
 * opts: { upperHeight, layout (вся раскладка, для соседних стен), style, colorId, maxHeight }.
 *
 * Масштаб. Внутри SVG единица = 1 мм. Подписи и засечки должны быть одного
 * размера на экране при любой длине стены, поэтому считаем k — сколько мм
 * в одном пикселе — от ширины контейнера и задаём размеры текста в px × k.
 */
(function (root) {
  'use strict';

  var V = root.VROVEN || {};
  var KL = V.kitchenLayout || {};
  var PLINTH = KL.PLINTH || 100;
  var BASE_H = KL.BASE_H || 720;
  var TOP = KL.TOP || 38;
  var UPPER_GAP = KL.UPPER_GAP || 600;
  var WORKTOP_D = KL.WORKTOP_D || 600;
  var UPPER_D = KL.UPPER_D || 300;
  var BASE_D = KL.BASE_D || 560;
  var BODY_TOP = PLINTH + BASE_H;            // 820
  var WORK = BODY_TOP + TOP;                 // 858
  var UB = WORK + UPPER_GAP;                 // 1458, низ верхних
  var WALL_T = 150;                          // толщина стены в разрезе
  var SLAB = 140;                            // перекрытие и пол в разрезе
  var FONT = "'JetBrains Mono', ui-monospace, Consolas, monospace";
  var INK = '#22211E', INK2 = '#5C574F', INK3 = '#8A8378';
  var NS = 'http://www.w3.org/2000/svg';
  var renderSeq = 0;

  /* ---------- цвет ---------- */

  function rgb(hex) {
    var h = String(hex || '#888888').replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function hex(c) {
    return '#' + c.map(function (v) { var s = Math.max(0, Math.min(255, Math.round(v))).toString(16); return s.length < 2 ? '0' + s : s; }).join('');
  }
  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
  }
  function shade(c, t) { return t < 0 ? mix(c, '#000000', -t) : mix(c, '#ffffff', t); }
  function lum(c) { var v = rgb(c); return (0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) / 255; }
  function edge(c) { return lum(c) < 0.3 ? mix(c, '#ffffff', 0.22) : mix(c, INK, 0.42); }

  /* ---------- примитивы (строки SVG) ---------- */

  function n(v) { return Math.round(v * 10) / 10; }
  function attrs(o) {
    var s = '';
    for (var k in o) if (o[k] !== null && o[k] !== undefined && o[k] !== false) s += ' ' + k + '="' + o[k] + '"';
    return s;
  }
  function rect(x, y, w, h, o) {
    if (w <= 0 || h <= 0) return '';
    return '<rect' + attrs(Object.assign({ x: n(x), y: n(y), width: n(w), height: n(h) }, o)) + '/>';
  }
  // прямоугольник по высотам от пола: h1 снизу, h2 сверху
  function box(x, h1, w, h2, o) { return rect(x, -h2, w, h2 - h1, o); }
  function line(x1, y1, x2, y2, o) {
    return '<line' + attrs(Object.assign({ x1: n(x1), y1: n(y1), x2: n(x2), y2: n(y2) }, o)) + '/>';
  }
  function path(d, o) { return '<path' + attrs(Object.assign({ d: d }, o)) + '/>'; }
  function circle(cx, cy, r, o) { return '<circle' + attrs(Object.assign({ cx: n(cx), cy: n(cy), r: n(r) }, o)) + '/>'; }
  function text(x, y, s, o) {
    return '<text' + attrs(Object.assign({ x: n(x), y: n(y) }, o)) + '>' + String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
  }
  function pts(list) { return list.map(function (p) { return n(p[0]) + ',' + n(p[1]); }).join(' '); }
  function poly(list, o) { return '<polygon' + attrs(Object.assign({ points: pts(list) }, o)) + '/>'; }
  var HAIR = { 'vector-effect': 'non-scaling-stroke' };
  function st(color, px, extra) { return Object.assign({ stroke: color, 'stroke-width': px, 'vector-effect': 'non-scaling-stroke' }, extra || {}); }

  // числа на чертеже: общий хелпер страницы (core.js), разделитель NBSP
  function group(digits) { return V.format.num(digits); }

  /* ---------- тема стиля ---------- */

  function theme(style, colorId) {
    var c = (style.colors || []).filter(function (x) { return x.id === colorId; })[0] || style.colors[0];
    var plinth = { wood: c.counter, steel: '#B9BEC4', dark: '#2F2E2B' }[style.plinth] || shade(c.lower || c.facade, -0.14);
    return {
      color: c, fac: c.facade, low: c.lower || c.facade, tall: c.tall || c.facade,
      accent: c.accent, counter: c.counter, wall: c.wall || '#F1ECE3',
      patina: style.patinaColor || c.accent, plinth: plinth,
      metal: style.gas && style.id !== 'loft' ? c.accent : '#8E9297',
      facade: style.facade, lowerFacade: style.lowerFacade || style.facade
    };
  }

  /* ---------- контекст отрисовки ---------- */

  function Ctx(style, colorId, k) {
    this.style = style;
    this.T = theme(style, colorId);
    this.k = k;
    this.id = 'kd' + (++renderSeq) + '-';
    this.defs = {};
    this.out = [];
  }
  Ctx.prototype.push = function (s) { if (s) this.out.push(s); };
  Ctx.prototype.def = function (name, markup) {
    if (!this.defs[name]) this.defs[name] = markup.replace(/\$ID/g, this.id + name);
    return 'url(#' + this.id + name + ')';
  };
  Ctx.prototype.defsMarkup = function () {
    var d = this.defs;
    return '<defs>' + Object.keys(d).map(function (key) { return d[key]; }).join('') + '</defs>';
  };

  // штриховка разреза (пол, потолок, стены): шаг постоянный на экране
  function hatch(C, name, color, opacity) {
    var s = 7 * C.k;
    return C.def(name, '<pattern id="$ID" patternUnits="userSpaceOnUse" width="' + n(s) + '" height="' + n(s) + '" patternTransform="rotate(45)">' +
      '<line x1="0" y1="0" x2="0" y2="' + n(s) + '" stroke="' + color + '" stroke-width="' + n(0.8 * C.k) + '" stroke-opacity="' + opacity + '"/></pattern>');
  }
  function gloss(C) {
    return C.def('gloss', '<linearGradient id="$ID" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".38" stop-color="#fff" stop-opacity=".08"/>' +
      '<stop offset=".62" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></linearGradient>');
  }
  function grain(C) {
    return C.def('grain', '<pattern id="$ID" patternUnits="userSpaceOnUse" width="900" height="64">' +
      '<path d="M0 10 C150 4 300 18 450 10 S750 3 900 10" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="2.4"/>' +
      '<path d="M0 30 C120 36 260 22 430 30 S760 40 900 30" fill="none" stroke="#000" stroke-opacity=".10" stroke-width="1.8"/>' +
      '<path d="M0 47 C200 42 330 54 520 47 S800 41 900 47" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="2"/>' +
      '<path d="M0 58 C180 61 380 55 600 59 S820 62 900 58" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="1.4"/></pattern>');
  }
  function glass(C) {
    return C.def('glass', '<linearGradient id="$ID" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#E4ECEE"/><stop offset=".45" stop-color="#C9D6DA"/><stop offset="1" stop-color="#AFC0C5"/></linearGradient>');
  }
  function lattice(C, color) {
    return C.def('lattice', '<pattern id="$ID" patternUnits="userSpaceOnUse" width="90" height="90" patternTransform="rotate(45)">' +
      '<rect x="0" y="0" width="90" height="13" fill="' + color + '"/><rect x="0" y="0" width="13" height="90" fill="' + color + '"/></pattern>');
  }
  function sideHatch(C) { return hatch(C, 'sideh', INK, 0.16); }
  function steel(C) {
    return C.def('steel', '<linearGradient id="$ID" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#A9AEB4"/><stop offset=".45" stop-color="#E3E6E9"/><stop offset="1" stop-color="#9DA2A8"/></linearGradient>');
  }

  /* ---------- фасад одной дверцы или ящика ---------- */

  // o: { fill, facade, drawer, glass, arch, upper }
  function front(C, x, h1, w, h2, o) {
    var g = 1.5;
    x += g; w -= 2 * g; h1 += g; h2 -= g;
    if (w <= 4 || h2 - h1 <= 4) return;
    var fill = o.fill, ed = edge(fill), h = h2 - h1, y = -h2;
    var facade = o.facade, patina = C.style.patina;
    C.push(rect(x, y, w, h, Object.assign({ fill: fill }, st(ed, 0.9))));

    if (facade === 'flat-gloss') {
      C.push(rect(x, y, w, h, { fill: gloss(C) }));
      C.push(line(x + w * 0.12, y + h * 0.04, x + w * 0.04, y + h * 0.3, st('#fff', 1, { 'stroke-opacity': 0.55 })));
      if (o.glass) C.push(rect(x + 30, y + 30, w - 60, h - 60, Object.assign({ fill: glass(C), 'fill-opacity': 0.7 }, st(ed, 0.6))));
      return;
    }
    if (facade === 'wood-grain') {
      C.push(rect(x, y, w, h, { fill: grain(C) }));
      return;
    }
    if (facade === 'flat-matte') {
      // тень от кромки снизу: фасад читается как плита, а не как контур
      C.push(line(x + 1, y + h - 1, x + w - 1, y + h - 1, st(shade(fill, -0.18), 0.8, { 'stroke-opacity': 0.6 })));
      if (o.glass) C.push(rect(x + 26, y + 26, w - 52, h - 52, Object.assign({ fill: glass(C) }, st(ed, 0.6))));
      return;
    }

    var fBase = facade === 'raised-panel' ? (o.drawer ? 38 : 66) : facade === 'beadboard' ? (o.drawer ? 34 : 52) : (o.drawer ? (h < 230 ? 30 : 40) : 56);
    var f = Math.min(fBase, w * 0.2, h * 0.24);
    var ix = x + f, iw = w - 2 * f, iy = y + f, ih = h - 2 * f;
    if (iw < 20 || ih < 20) return;
    var arch = o.arch && !o.drawer && iw > 120 ? Math.min(iw * 0.22, 90) : 0;
    var innerD = arch
      ? 'M' + n(ix) + ' ' + n(iy + ih) + 'V' + n(iy + arch) + 'Q' + n(ix + iw / 2) + ' ' + n(iy - arch) + ' ' + n(ix + iw) + ' ' + n(iy + arch) + 'V' + n(iy + ih) + 'Z'
      : 'M' + n(ix) + ' ' + n(iy) + 'H' + n(ix + iw) + 'V' + n(iy + ih) + 'H' + n(ix) + 'Z';
    var dark = shade(fill, -0.22), light = shade(fill, 0.18);

    if (o.glass) {
      C.push(path(innerD, Object.assign({ fill: glass(C) }, st(ed, 0.8))));
      // полки за стеклом
      [0.36, 0.68].forEach(function (t) { C.push(line(ix + 4, iy + ih * t, ix + iw - 4, iy + ih * t, st('#8FA3A9', 0.9))); });
      if (facade === 'beadboard') {
        C.push(path(innerD, { fill: lattice(C, fill) }));
      } else if (facade === 'raised-panel') {
        // раскладка: вертикальная штапик и две горизонтали
        var bar = { fill: fill };
        C.push(rect(ix + iw / 2 - 7, iy, 14, ih, bar));
        C.push(rect(ix, iy + arch + (ih - arch) * 0.33 - 7, iw, 14, bar));
        C.push(rect(ix, iy + arch + (ih - arch) * 0.66 - 7, iw, 14, bar));
      }
      C.push(path(innerD, Object.assign({ fill: 'none' }, st(patina ? C.T.patina : ed, patina ? 1.4 : 0.8, patina ? { 'stroke-opacity': 0.85 } : {}))));
      return;
    }

    if (facade === 'raised-panel') {
      C.push(path(innerD, Object.assign({ fill: shade(fill, -0.05) }, st(ed, 0.8))));
      var b = Math.min(26, iw * 0.12, ih * 0.12);
      if (iw > 80 && ih > 80) {
        var fx = ix + b, fw = iw - 2 * b, fy = iy + b, fh = ih - 2 * b, fa = arch ? Math.max(arch - b * 0.6, 0) : 0;
        var fieldD = fa
          ? 'M' + n(fx) + ' ' + n(fy + fh) + 'V' + n(fy + fa) + 'Q' + n(fx + fw / 2) + ' ' + n(fy - fa) + ' ' + n(fx + fw) + ' ' + n(fy + fa) + 'V' + n(fy + fh) + 'Z'
          : 'M' + n(fx) + ' ' + n(fy) + 'H' + n(fx + fw) + 'V' + n(fy + fh) + 'H' + n(fx) + 'Z';
        C.push(path(fieldD, Object.assign({ fill: shade(fill, 0.06) }, st(ed, 0.7))));
        // скосы филёнки
        C.push(line(ix, iy + ih, fx, fy + fh, st(ed, 0.6)));
        C.push(line(ix + iw, iy + ih, fx + fw, fy + fh, st(ed, 0.6)));
        if (!arch) {
          C.push(line(ix, iy, fx, fy, st(ed, 0.6)));
          C.push(line(ix + iw, iy, fx + fw, fy, st(ed, 0.6)));
        }
        if (patina) C.push(path(fieldD, Object.assign({ fill: 'none' }, st(C.T.patina, 1.2, { 'stroke-opacity': 0.7 }))));
      }
      if (patina) C.push(path(innerD, Object.assign({ fill: 'none' }, st(C.T.patina, 1.5, { 'stroke-opacity': 0.85 }))));
      return;
    }

    // shaker и beadboard: утопленная плоская филёнка в рамке
    C.push(path(innerD, Object.assign({ fill: shade(fill, -0.035) }, st(ed, 0.8))));
    C.push(line(ix + 2, iy + 5, ix + iw - 2, iy + 5, st(dark, 0.9, { 'stroke-opacity': 0.45 })));
    C.push(line(ix + 5, iy + 2, ix + 5, iy + ih - 2, st(dark, 0.9, { 'stroke-opacity': 0.3 })));
    C.push(line(ix + 2, iy + ih + 4, ix + iw - 2, iy + ih + 4, st(light, 0.9, { 'stroke-opacity': 0.6 })));
    if (facade === 'beadboard' && !o.drawer && ih > 150) {
      for (var gx = ix + 70; gx < ix + iw - 30; gx += 70) C.push(line(gx, iy + 4, gx, iy + ih - 2, st(dark, 0.7, { 'stroke-opacity': 0.35 })));
    }
    if (patina) {
      C.push(path(innerD, Object.assign({ fill: 'none' }, st(C.T.patina, 1.6, { 'stroke-opacity': 0.85 }))));
      C.push(rect(x + 3, y + 3, w - 6, h - 6, Object.assign({ fill: 'none' }, st(C.T.patina, 1, { 'stroke-opacity': 0.55 }))));
    }
  }

  /* ---------- ручки ---------- */

  // where: 'door-lower' | 'door-upper' | 'drawer' | 'tall-lower' | 'tall-upper'
  // fx..fw: фасад; side: где ручка у дверцы ('left' | 'right')
  function handle(C, where, fx, h1, fw, h2, side) {
    var kind = C.style.handle, col = C.T.accent;
    if (kind === 'gola' || kind === 'none') return;
    var upper = where === 'door-upper' || where === 'tall-upper';
    if (kind === 'rail' && upper) return; // модерн: верх без ручек, на нажим
    var drawer = where === 'drawer';
    var h = h2 - h1, cx, cy;
    var edgeX = side === 'left' ? fx + 52 : fx + fw - 52;
    var hl = { fill: col };
    var shadow = { fill: '#000', 'fill-opacity': 0.12 };

    function bar(cxp, cyp, len, thick, vertical) {
      var bw = vertical ? thick : len, bh = vertical ? len : thick;
      C.push(rect(cxp - bw / 2 + 3, cyp - bh / 2 + 4, bw, bh, Object.assign({ rx: thick / 2 }, shadow)));
      C.push(rect(cxp - bw / 2, cyp - bh / 2, bw, bh, Object.assign({ rx: thick / 2 }, hl, st(shade(col, -0.3), 0.6))));
    }
    function knob(cxp, cyp, r) {
      C.push(circle(cxp + 2, cyp + 3, r, shadow));
      C.push(circle(cxp, cyp, r, Object.assign({}, hl, st(shade(col, -0.35), 0.6))));
      C.push(circle(cxp - r * 0.3, cyp - r * 0.3, r * 0.35, { fill: '#fff', 'fill-opacity': 0.35 }));
    }

    if (drawer || kind === 'rail') {
      cx = fx + fw / 2;
      cy = -(h2 - Math.min(h / 2, drawer ? 72 : 60));
      if (kind === 'shell') {
        C.push(path('M' + n(cx - 46) + ' ' + n(cy - 8) + 'Q' + n(cx) + ' ' + n(cy + 40) + ' ' + n(cx + 46) + ' ' + n(cy - 8) + 'Z',
          Object.assign({}, hl, st(shade(col, -0.35), 0.7))));
        C.push(rect(cx - 50, cy - 14, 100, 9, Object.assign({ rx: 4 }, hl)));
      } else if (kind === 'knob') {
        knob(cx, cy, 15);
        if (C.style.knobRing) C.push(circle(cx, cy + 26, 21, Object.assign({ fill: 'none' }, st(col, 1.6))));
      } else if (kind === 'brass-bar') bar(cx, cy, Math.min(fw * 0.42, 240), 12, false);
      else if (kind === 'black-bar') bar(cx, cy, Math.min(fw * 0.55, 320), 13, false);
      else if (kind === 'rail') bar(cx, cy, Math.min(fw - 130, 380), 11, false);
      return;
    }
    if (kind === 'shell' || kind === 'knob') {
      cy = upper ? -(h1 + 85) : -(h2 - 85);
      knob(edgeX, cy, kind === 'shell' ? 13 : 16);
      return;
    }
    var len = where === 'door-lower' ? 220 : 190;
    if (where === 'tall-lower' || where === 'tall-upper') len = 300;
    len = Math.min(len, h * 0.5);
    cy = upper ? -(h1 + 70 + len / 2) : -(h2 - 70 - len / 2);
    bar(edgeX, cy, len, kind === 'black-bar' ? 13 : 12, true);
  }

  /* ---------- дверцы модуля ---------- */

  function doors(C, x, w, h1, h2, count, o) {
    var cnt = Math.max(1, count || 1);
    var dw = w / cnt;
    for (var i = 0; i < cnt; i++) {
      var dx = x + i * dw;
      var side = cnt === 2 ? (i === 0 ? 'right' : 'left') : (o.side || 'right');
      front(C, dx, h1, dw, h2, { fill: o.fill, facade: o.facade, glass: o.glass, arch: o.arch });
      if (!o.glass || C.style.handle !== 'none') handle(C, o.where, dx + 1.5, h1, dw - 3, h2, side);
    }
  }

  function drawerStack(C, x, w, h1, h2, sizes, o) {
    var y = h2;
    var gola = C.style.handle === 'gola';
    sizes.forEach(function (s, i) {
      var top = y, bot = y - s;
      if (gola && i > 0) {
        C.push(box(x, top - 30, w, top, { fill: shade(o.fill, -0.45) }));
        top -= 30;
      }
      front(C, x, bot, w, top, { fill: o.fill, facade: o.facade, drawer: true });
      handle(C, 'drawer', x + 1.5, bot, w - 3, top, 'right');
      y = bot;
    });
  }

  // «бок» соседнего ряда в углу: видна торцевая панель соседней стены
  function sideRun(C, x, h1, w, h2, fill) {
    C.push(box(x, h1, w, h2, Object.assign({ fill: shade(fill, -0.07) }, st(edge(fill), 0.9))));
    C.push(box(x, h1, w, h2, { fill: sideHatch(C) }));
  }

  /* ---------- техника ---------- */

  function oven(C, x, w, h1, h2, gasLook) {
    var body = gasLook ? mix(C.T.fac, '#ffffff', 0.35) : '#2B2D30';
    var ed = edge(body);
    C.push(box(x + 2, h1, w - 4, h2, Object.assign({ fill: body }, st(ed, 0.9))));
    var panelH = Math.min(90, (h2 - h1) * 0.18);
    // панель управления
    C.push(box(x + 2, h2 - panelH, w - 4, h2, Object.assign({ fill: gasLook ? shade(body, -0.06) : '#1F2022' }, st(ed, 0.6))));
    var knobs = gasLook ? 5 : 2;
    for (var i = 0; i < knobs; i++) {
      var kx = x + w * (gasLook ? (0.16 + i * 0.17) : (i === 0 ? 0.2 : 0.8));
      C.push(circle(kx, -(h2 - panelH / 2), gasLook ? 17 : 13, Object.assign({ fill: gasLook ? C.T.accent : '#5A5D61' }, st(ed, 0.5))));
    }
    if (!gasLook) C.push(rect(x + w * 0.38, -(h2 - panelH / 2) - 12, w * 0.24, 24, { fill: '#0E0F10', rx: 3 }));
    // дверца с окном
    var top = h2 - panelH - 6;
    C.push(box(x + 34, h1 + 40, w - 68, top - 70, Object.assign({ fill: '#151618', rx: 14 }, st('#000', 0.6))));
    C.push(box(x + 34, h1 + 40, w - 68, top - 70, { fill: '#fff', 'fill-opacity': 0.07, rx: 14 }));
    C.push(line(x + 60, -(top - 90), x + 140, -(h1 + 70), st('#fff', 0.8, { 'stroke-opacity': 0.16 })));
    // ручка духовки
    C.push(rect(x + 50, -(top - 28) - 9, w - 100, 18, Object.assign({ rx: 9, fill: gasLook ? C.T.accent : '#9EA3A8' }, st(ed, 0.5))));
  }

  function hob(C, x, w) {
    var y = -WORK;
    if (C.style.gas) {
      C.push(rect(x + 30, y - 10, w - 60, 10, { fill: '#2A2B2D' }));
      [0.2, 0.42, 0.58, 0.8].forEach(function (t) {
        C.push(rect(x + w * t - 45, y - 26, 90, 16, Object.assign({ fill: '#1C1D1F', rx: 3 })));
      });
    } else {
      C.push(rect(x + 25, y - 7, w - 50, 7, { fill: '#121314' }));
    }
  }

  function faucet(C, cx) {
    var y = -WORK, col = C.T.metal;
    C.push(rect(cx - 26, y - 22, 52, 22, { fill: col, rx: 6 }));
    C.push(path('M' + n(cx) + ' ' + n(y - 20) + 'V' + n(y - 260) + 'Q' + n(cx) + ' ' + n(y - 330) + ' ' + n(cx + 70) + ' ' + n(y - 330) +
      'Q' + n(cx + 130) + ' ' + n(y - 330) + ' ' + n(cx + 130) + ' ' + n(y - 270) + 'V' + n(y - 236),
      { fill: 'none', stroke: col, 'stroke-width': 22, 'stroke-linecap': 'round' }));
  }

  /* ---------- вытяжки ---------- */

  function hood(C, m, uh, ceiling) {
    var x = m.x, w = m.width, top = UB + uh, T = C.T, type = C.style.hood;
    var ed = edge(T.fac);
    if (type === 'mantle' || type === 'box') {
      var band1 = type === 'mantle' ? UB + 70 : UB + 110;
      var band2 = band1 + (type === 'mantle' ? 130 : 80);
      C.push(box(x + 40, UB + 40, w - 80, band1, { fill: '#7D8085' }));
      C.push(box(x - 18, band1, w + 36, band2, Object.assign({ fill: shade(T.fac, 0.04) }, st(ed, 0.9))));
      C.push(line(x - 18, -(band1 + 30), x + w + 18, -(band1 + 30), st(ed, 0.6)));
      front(C, x, band2, w, top, { fill: T.fac, facade: C.style.facade });
      return;
    }
    if (type === 'integrated') {
      C.push(box(x + 4, UB + 70, w - 8, UB + 95, { fill: steel(C) }));
      front(C, x, UB + 95, w, top, { fill: T.fac, facade: C.style.facade });
      return;
    }
    if (type === 'glass') {
      var chW = 260, cx = x + w / 2;
      C.push(box(cx - chW / 2, UB + 260, chW, ceiling, Object.assign({ fill: steel(C) }, st('#7D8288', 0.7))));
      C.push(box(x + 90, UB + 150, w - 180, UB + 260, Object.assign({ fill: steel(C) }, st('#7D8288', 0.7))));
      C.push(poly([[x, -(UB + 130)], [x + w, -(UB + 130)], [x + w - 20, -(UB + 150)], [x + 20, -(UB + 150)]],
        Object.assign({ fill: '#D6E2E6', 'fill-opacity': 0.85 }, st('#7D8288', 0.7))));
      return;
    }
    if (type === 'pyramid' || type === 'chimney') {
      var dark = type === 'pyramid';
      var col = dark ? '#2A2928' : '#F5F4F0';
      var ec = dark ? '#111' : edge(col);
      var lip = UB + 120, slope = lip + (dark ? 300 : 200), cw = dark ? 300 : 250;
      C.push(box(x, lip - 30, w, lip, Object.assign({ fill: col }, st(ec, 0.8))));
      C.push(poly([[x, -lip], [x + w, -lip], [x + w / 2 + cw / 2, -slope], [x + w / 2 - cw / 2, -slope]], Object.assign({ fill: col }, st(ec, 0.8))));
      C.push(box(x + w / 2 - cw / 2, slope, cw, ceiling, Object.assign({ fill: col }, st(ec, 0.8))));
      if (dark) C.push(line(x + w / 2 - cw / 2 + 40, -(slope + 20), x + w / 2 - cw / 2 + 40, -(ceiling - 20), st('#fff', 0.8, { 'stroke-opacity': 0.12 })));
      return;
    }
    if (type === 'plaster') {
      var beamB = UB + 140, beamT = beamB + 110;
      var plaster = shade(T.wall, -0.04);
      C.push(poly([[x - 10, -beamT], [x + w + 10, -beamT], [x + w - 110, -(ceiling)], [x + 110, -(ceiling)]], Object.assign({ fill: plaster }, st(edge(plaster), 0.8))));
      C.push(box(x - 50, beamB, w + 100, beamT, Object.assign({ fill: '#A98259' }, st('#6E5236', 0.8))));
      C.push(box(x - 50, beamB, w + 100, beamT, { fill: grain(C) }));
    }
  }

  /* ---------- открытые полки ---------- */

  var ITEM_COLORS = ['#E3DED4', '#B7B0A3', '#7E8B73', '#C9A877', '#D7CFC1', '#8C9AA3'];
  function shelfItems(C, x, w, h, seed) {
    var cx = x + 50, i = seed;
    while (cx < x + w - 90) {
      var col = ITEM_COLORS[i % ITEM_COLORS.length];
      var t = i % 4;
      if (t === 0) { C.push(rect(cx, -(h + 120), 70, 120, { fill: col, rx: 10 })); cx += 110; }
      else if (t === 1) { C.push(path('M' + n(cx) + ' ' + n(-h - 48) + 'Q' + n(cx + 60) + ' ' + n(-h + 6) + ' ' + n(cx + 120) + ' ' + n(-h - 48) + 'Z', { fill: col })); cx += 150; }
      else if (t === 2) { C.push(rect(cx, -(h + 34), 150, 34, { fill: col, rx: 4 })); C.push(rect(cx + 10, -(h + 52), 130, 18, { fill: shade(col, 0.15), rx: 4 })); cx += 185; }
      else { C.push(rect(cx, -(h + 170), 46, 170, { fill: col, rx: 18 })); cx += 90; }
      i += 1;
    }
  }

  function openShelf(C, m, uh, mode) {
    var x = m.x, w = m.width, T = C.T;
    if (mode === 'center') {
      // прованс: шкаф без дверей, сушилка для тарелок
      var ed = edge(T.fac);
      C.push(box(x + 2, UB, w - 4, UB + uh, Object.assign({ fill: T.fac }, st(ed, 0.9))));
      C.push(box(x + 30, UB + 30, w - 60, UB + uh - 30, Object.assign({ fill: shade(T.fac, -0.2) }, st(ed, 0.6))));
      var midH = UB + uh * 0.5;
      C.push(box(x + 30, midH - 12, w - 60, midH + 12, { fill: T.fac }));
      C.push(box(x + 30, UB + 30, w - 60, UB + 52, { fill: T.fac }));
      for (var px = x + 60; px < x + w - 60; px += 46) {
        C.push('<ellipse' + attrs(Object.assign({ cx: n(px), cy: n(-(midH + 12 + 100)), rx: 13, ry: 100, fill: '#F3EEE3' }, st(INK3, 0.5))) + '/>');
      }
      shelfItems(C, x + 30, w - 60, UB + 52, Math.round(x / 50));
      if (C.style.patina) C.push(box(x + 4, UB + 2, w - 8, UB + uh - 2, Object.assign({ fill: 'none' }, st(T.patina, 1.3, { 'stroke-opacity': 0.8 }))));
      return;
    }
    var wood = mode === 'loft' ? T.counter : mix(T.counter, '#ffffff', 0.15);
    var levels = mode === 'loft' ? [UB + 70, UB + uh * 0.5, UB + uh - 50] : [UB + 120, UB + uh * 0.62];
    levels.forEach(function (lh, li) {
      C.push(box(x + 10, lh - 40, w - 20, lh, Object.assign({ fill: wood }, st(edge(wood), 0.7))));
      C.push(box(x + 10, lh - 40, w - 20, lh, { fill: grain(C) }));
      if (mode === 'loft') {
        var bxs = [x + 70];
        for (var bk = x + 900; bk < x + w - 300; bk += 900) bxs.push(bk);
        bxs.push(x + w - 90);
        bxs.forEach(function (bx) {
          C.push(rect(bx, -(lh - 40), 16, 120, { fill: '#1C1B1A' }));
          C.push(path('M' + n(bx + 16) + ' ' + n(-(lh - 40)) + 'h40l-40 60Z', { fill: '#1C1B1A' }));
        });
      }
      if (lh + 140 < UB + uh + 120) shelfItems(C, x + 10, w - 20, lh, Math.round(x / 50) + li * 2);
    });
  }

  /* ---------- фартук и стена ---------- */

  function apronFill(C) {
    var T = C.T, type = C.style.apron;
    if (type === 'subway') {
      return C.def('subway', '<pattern id="$ID" patternUnits="userSpaceOnUse" width="300" height="150">' +
        '<rect width="300" height="150" fill="#F8F7F3"/><path d="M0 0H300M0 75H300M0 150H300M0 0V75M150 0V75M75 75V150M225 75V150" stroke="#D7D3CB" stroke-width="5" fill="none"/></pattern>');
    }
    if (type === 'terracotta') {
      return C.def('terra', '<pattern id="$ID" patternUnits="userSpaceOnUse" width="450" height="300">' +
        '<rect width="450" height="300" fill="#ECDDBF"/>' +
        '<rect x="150" y="0" width="150" height="150" fill="#E6D4B2"/><rect x="0" y="150" width="150" height="150" fill="#E9D8B8"/>' +
        '<g transform="translate(375 225)"><rect x="-75" y="-75" width="150" height="150" fill="#F2E9D6"/><path d="M0 -48L48 0L0 48L-48 0Z" fill="none" stroke="#6F86A8" stroke-width="7"/><circle r="12" fill="#6F86A8"/></g>' +
        '<path d="M0 0H450M0 150H450M0 300H450M0 0V300M150 0V300M300 0V300M450 0V300" stroke="#CDB894" stroke-width="5" fill="none"/></pattern>');
    }
    if (type === 'marble') {
      return C.def('marble', '<pattern id="$ID" patternUnits="userSpaceOnUse" width="1400" height="600">' +
        '<rect width="1400" height="600" fill="' + mix(T.counter, '#ffffff', 0.25) + '"/>' +
        '<path d="M-20 520C200 420 330 470 520 300S900 120 1100 160 1300 60 1420 20" fill="none" stroke="#B7B1A8" stroke-width="5" stroke-opacity=".7"/>' +
        '<path d="M300 610C420 500 520 520 640 420S850 330 980 360" fill="none" stroke="#C6C0B6" stroke-width="3" stroke-opacity=".7"/>' +
        '<path d="M700 -10C760 90 900 110 980 230S1180 360 1300 330" fill="none" stroke="#CFC9BF" stroke-width="2.4"/></pattern>');
    }
    if (type === 'stone') {
      return C.def('stone', '<pattern id="$ID" patternUnits="userSpaceOnUse" width="300" height="300">' +
        '<rect width="300" height="300" fill="' + mix(T.counter, T.wall, 0.35) + '"/>' +
        '<path d="M150 0L300 150L150 300L0 150Z" fill="none" stroke="' + shade(T.counter, -0.1) + '" stroke-width="3"/></pattern>');
    }
    if (type === 'glass') {
      return C.def('apglass', '<linearGradient id="$ID" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2F4F6"/><stop offset=".5" stop-color="#E1E6EA"/><stop offset="1" stop-color="#EEF1F3"/></linearGradient>');
    }
    if (type === 'brick') return null; // кирпич на всей стене
    return mix(T.wall, T.counter, 0.45);
  }

  function brick(C) {
    var base = C.T.wall;
    return C.def('brick', '<pattern id="$ID" patternUnits="userSpaceOnUse" width="500" height="150">' +
      '<rect width="500" height="150" fill="#CDBCA9"/>' +
      '<rect x="5" y="5" width="240" height="65" fill="' + base + '"/><rect x="255" y="5" width="240" height="65" fill="' + shade(base, -0.06) + '"/>' +
      '<rect x="-120" y="80" width="240" height="65" fill="' + shade(base, 0.05) + '"/><rect x="130" y="80" width="240" height="65" fill="' + shade(base, -0.1) + '"/>' +
      '<rect x="380" y="80" width="240" height="65" fill="' + shade(base, 0.05) + '"/></pattern>');
  }

  /* ---------- проёмы ---------- */

  function windowOpening(C, o, ceiling) {
    var sill = o.sill == null ? 900 : o.sill;
    var top = Math.max(sill + 600, ceiling - 260);
    var x = o.x, w = o.width;
    var frame = '#F7F5F0', fe = '#9E978B';
    C.push(box(x - 12, sill, w + 24, top + 12, { fill: shade(C.T.wall, -0.12) }));
    C.push(box(x, sill, w, top, Object.assign({ fill: frame }, st(fe, 0.9))));
    var sashes = w >= 900 ? 2 : 1;
    var sw = (w - 70) / sashes;
    for (var i = 0; i < sashes; i++) {
      var gx = x + 35 + i * sw;
      C.push(box(gx + 20, sill + 55, sw - 40, top - 55, Object.assign({ fill: C.def('sky', '<linearGradient id="$ID" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFDCE2"/><stop offset="1" stop-color="#EEF2F1"/></linearGradient>') }, st(fe, 0.8))));
      C.push(line(gx + sw * 0.3, -(top - 120), gx + sw * 0.62, -(sill + 260), st('#fff', 1.2, { 'stroke-opacity': 0.8 })));
      C.push(line(gx + sw * 0.48, -(top - 160), gx + sw * 0.7, -(sill + 520), st('#fff', 0.8, { 'stroke-opacity': 0.6 })));
    }
    if (sashes === 2) C.push(box(x + w / 2 - 18, sill + 40, 36, top - 40, Object.assign({ fill: frame }, st(fe, 0.6))));
    C.push(box(x - 50, sill - 40, w + 100, sill, Object.assign({ fill: '#FBFAF6' }, st(fe, 0.8))));
    if (o.sill != null) {
      C.push(text(x + w * 0.27, -(sill + 80), 'подоконник ' + group(o.sill), {
        'font-family': FONT, 'font-size': n(9.5 * C.k), fill: INK2, 'text-anchor': 'middle' }));
    }
  }

  function doorOpening(C, o, ceiling, L) {
    var dh = Math.min(2100, ceiling - 180);
    var x = o.x, w = o.width;
    var cas = 70, cx1 = Math.max(0, x - cas), cx2 = Math.min(L, x + w + cas);
    C.push(box(cx1, 0, cx2 - cx1, dh + cas, Object.assign({ fill: '#F6F3EC' }, st('#9E978B', 0.9))));
    C.push(box(x, 0, w, dh, Object.assign({ fill: '#E7DED0' }, st('#9E978B', 0.9))));
    [[0.12, 0.47], [0.55, 0.92]].forEach(function (p) {
      C.push(box(x + 90, dh * p[0], w - 180, dh * p[1], Object.assign({ fill: 'none' }, st('#B5AA98', 0.8))));
    });
    C.push(rect(x + w - 150, -1010, 110, 18, { fill: '#8E9297', rx: 9 }));
    C.push(text(x + w / 2, -(dh / 2), 'дверь', { 'font-family': FONT, 'font-size': n(9.5 * C.k), fill: INK3, 'text-anchor': 'middle' }));
  }

  /* ---------- размерные цепочки ---------- */

  // Горизонтальная цепочка: xs — точки, y — линия размера, ref — откуда выносные.
  function chainH(C, xs, y, ref, strong) {
    var k = C.k, fs = (strong ? 11 : 10) * k;
    var p = uniq(xs);
    if (p.length < 2) return;
    var dir = y > ref ? 1 : -1;
    var o = st(INK3, 0.7);
    p.forEach(function (x) {
      C.push(line(x, ref + dir * 3 * k, x, y + dir * 5 * k, o));
      C.push(line(x - 4 * k, y + 4 * k, x + 4 * k, y - 4 * k, st(INK, 1.2)));
    });
    C.push(line(p[0] - 6 * k, y, p[p.length - 1] + 6 * k, y, st(strong ? INK2 : INK3, strong ? 0.9 : 0.7)));
    for (var i = 0; i < p.length - 1; i++) {
      var seg = p[i + 1] - p[i], label = group(seg);
      var tw = label.length * 0.62 * fs;
      if (tw + 5 * k > seg && !strong) continue;
      C.push(text((p[i] + p[i + 1]) / 2, y - 4 * k, label, {
        'font-family': FONT, 'font-size': n(fs), fill: strong ? INK : INK2, 'text-anchor': 'middle', 'font-weight': strong ? 500 : null }));
    }
  }

  // Вертикальная цепочка по высотам от пола; x — линия, ref — край предмета.
  function chainV(C, hs, x, ref, strong) {
    var k = C.k, fs = (strong ? 11 : 10) * k;
    var p = uniq(hs);
    if (p.length < 2) return;
    var dir = x > ref ? 1 : -1;
    p.forEach(function (h) {
      C.push(line(ref + dir * 3 * k, -h, x + dir * 5 * k, -h, st(INK3, 0.7)));
      C.push(line(x - 4 * k, -h + 4 * k, x + 4 * k, -h - 4 * k, st(INK, 1.2)));
    });
    C.push(line(x, -p[0] + 6 * k, x, -p[p.length - 1] - 6 * k, st(strong ? INK2 : INK3, strong ? 0.9 : 0.7)));
    for (var i = 0; i < p.length - 1; i++) {
      var seg = p[i + 1] - p[i], label = group(seg);
      var tw = label.length * 0.62 * fs;
      var tx = x - 4 * k, ty = -(p[i] + p[i + 1]) / 2;
      if (tw + 5 * k > seg) {
        if (strong) { /* общий размер пишем всегда */ } else continue;
      }
      C.push(text(tx, ty, label, {
        'font-family': FONT, 'font-size': n(fs), fill: strong ? INK : INK2, 'text-anchor': 'middle',
        transform: 'rotate(-90 ' + n(tx) + ' ' + n(ty) + ')', 'font-weight': strong ? 500 : null }));
    }
  }

  function uniq(list) {
    var s = {};
    return list.filter(function (v) { var key = Math.round(v); if (s[key]) return false; s[key] = 1; return isFinite(v); })
      .sort(function (a, b) { return a - b; });
  }

  // объединение отрезков [s,e] в сплошные куски
  function runs(spans) {
    var list = spans.filter(function (s) { return s[1] > s[0]; }).sort(function (a, b) { return a[0] - b[0]; });
    var out = [];
    list.forEach(function (s) {
      var last = out[out.length - 1];
      if (last && s[0] <= last[1] + 1) last[1] = Math.max(last[1], s[1]);
      else out.push([s[0], s[1]]);
    });
    return out;
  }

  /* ---------- масштаб ---------- */

  function containerWidth(svgEl) {
    var host = svgEl.parentNode;
    var w = host && host.getBoundingClientRect ? host.getBoundingClientRect().width : 0;
    return w > 40 ? w : 800;
  }

  // k (мм в пикселе): содержимое contentW × contentH мм плюс поля marginW × marginH px
  function fitScale(contentW, contentH, marginW, marginH, cw, maxH) {
    var k1 = contentW / Math.max(cw - marginW, 120);
    var k2 = contentH / Math.max(maxH - marginH, 120);
    return Math.max(k1, k2);
  }

  function mount(svgEl, C, vb) {
    var wPx = vb[2] / C.k, hPx = vb[3] / C.k;
    svgEl.setAttribute('viewBox', vb.map(n).join(' '));
    svgEl.setAttribute('width', n(wPx));
    svgEl.setAttribute('height', n(hPx));
    svgEl.style.aspectRatio = n(wPx) + ' / ' + n(hPx);
    svgEl.innerHTML = C.defsMarkup() + C.out.join('');
  }

  /* ---------- развёртка стены ---------- */

  function renderElevation(svgEl, wall, style, colorId, ceiling, opts) {
    opts = opts || {};
    var L = wall.length;
    var full = opts.layout;
    var uh = opts.upperHeight || (full && full.upperHeight) || (ceiling >= 2600 ? 920 : 720);
    var topU = UB + uh;
    var hasOpenings = (wall.openings || []).length > 0;
    var cw = opts.width || containerWidth(svgEl);
    var narrow = cw < 560;
    var maxH = opts.maxHeight || Math.max(320, Math.min(cw * 0.92, 660));
    var mTop = (hasOpenings ? 60 : 34) + 16, mBottom = 60 + 18, mSide = 50;
    var k = fitScale(L + 2 * WALL_T, ceiling + 2 * SLAB, 2 * mSide, mTop + mBottom, cw, maxH);
    if (narrow) k *= 1.04;
    var C = new Ctx(style, colorId, k);
    var T = C.T;

    var lower = wall.lower || [], upper = wall.upper || [];
    var fillers = wall.fillers || [], upperFillers = wall.upperFillers || [];
    var talls = lower.filter(function (m) { return m.kind === 'tall'; });

    // зоны «бок соседнего ряда»
    var sideLow = [], sideUp = [];
    function coveredLow(a, b) { return lower.concat(fillers).some(function (m) { return m.x < b && m.x + m.width > a; }); }
    function coveredUp(a, b) { return upper.concat(upperFillers).some(function (m) { return m.x < b && m.x + m.width > a; }); }
    function neighborHasUpperCorner(id) {
      if (!full || !full.walls) return true;
      var nb = full.walls.filter(function (w) { return w.id === id; })[0];
      return !!(nb && nb.upper.some(function (m) { return m.kind === 'upper-corner'; }));
    }
    var joins = wall.joins || {};
    if (joins.start) {
      if (!coveredLow(0, WORKTOP_D)) sideLow.push([0, WORKTOP_D]);
      if (!coveredUp(0, UPPER_D) && neighborHasUpperCorner(joins.start)) sideUp.push([0, UPPER_D]);
    }
    if (joins.end) {
      if (!coveredLow(L - WORKTOP_D, L)) sideLow.push([L - WORKTOP_D, L]);
      if (!coveredUp(L - UPPER_D, L) && neighborHasUpperCorner(joins.end)) sideUp.push([L - UPPER_D, L]);
    }

    /* стена */
    C.push(box(0, 0, L, ceiling, { fill: C.style.apron === 'brick' ? brick(C) : T.wall }));

    /* фартук */
    var counterSpans = lower.filter(function (m) { return m.kind !== 'tall'; }).map(function (m) { return [m.x, m.x + m.width]; })
      .concat(fillers.map(function (f) { return [f.x, f.x + f.width]; }), sideLow);
    var counterRuns = runs(counterSpans);
    var apron = apronFill(C);
    if (apron) counterRuns.forEach(function (r) { C.push(box(r[0], WORK, r[1] - r[0], UB, { fill: apron })); });

    /* проёмы */
    (wall.openings || []).forEach(function (o) {
      if (o.type === 'window') windowOpening(C, o, ceiling);
      else doorOpening(C, o, ceiling, L);
    });

    /* подсветка под верхними */
    var upperSpans = upper.map(function (m) { return [m.x, m.x + m.width]; })
      .concat(upperFillers.map(function (f) { return [f.x, f.x + f.width]; }), sideUp);
    if (C.style.led) {
      var glow = C.def('led', '<linearGradient id="$ID" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9B8" stop-opacity=".75"/><stop offset="1" stop-color="#FFE9B8" stop-opacity="0"/></linearGradient>');
      runs(upperSpans).forEach(function (r) {
        C.push(box(r[0], WORK + 40, r[1] - r[0], UB, { fill: glow }));
      });
    }

    /* разрез: пол, потолок, стены по краям */
    var hz = hatch(C, 'cut', INK, 0.5);
    C.push(rect(-WALL_T, 0, L + 2 * WALL_T, SLAB, { fill: hz }));
    C.push(rect(-WALL_T, -(ceiling + SLAB), L + 2 * WALL_T, SLAB, { fill: hz }));
    C.push(rect(-WALL_T, -ceiling, WALL_T, ceiling, { fill: hz }));
    C.push(rect(L, -ceiling, WALL_T, ceiling, { fill: hz }));
    C.push(path('M' + n(-WALL_T) + ' 0H' + n(L + WALL_T) + 'M' + n(-WALL_T) + ' ' + n(-ceiling) + 'H' + n(L + WALL_T) +
      'M0 0V' + n(-ceiling) + 'M' + n(L) + ' 0V' + n(-ceiling), Object.assign({ fill: 'none' }, st(INK, 1.4))));

    /* цоколь */
    runs(lower.map(function (m) { return [m.x, m.x + m.width]; }).concat(fillers.map(function (f) { return [f.x, f.x + f.width]; }), sideLow))
      .forEach(function (r) {
        C.push(box(r[0], 0, r[1] - r[0], PLINTH, Object.assign({ fill: T.plinth }, st(edge(T.plinth), 0.8))));
        C.push(line(r[0], -PLINTH + 6, r[1], -PLINTH + 6, st('#000', 0.8, { 'stroke-opacity': 0.18 })));
      });

    /* нижние модули */
    var lowFill = T.low, lowFacade = T.lowerFacade, gola = C.style.handle === 'gola';
    var bodyTop = gola ? BODY_TOP - 32 : BODY_TOP;
    lower.forEach(function (m) {
      var x = m.x, w = m.width;
      if (m.kind === 'tall') return;
      if (gola) C.push(box(x, bodyTop, w, BODY_TOP, { fill: shade(lowFill, -0.45) }));
      var side = x + w / 2 < L / 2 ? 'right' : 'left';
      var dOpt = { fill: lowFill, facade: lowFacade, where: 'door-lower', side: side };
      if (m.kind === 'drawers') {
        var hTot = bodyTop - PLINTH, first = 170;
        drawerStack(C, x, w, PLINTH, bodyTop, [first, (hTot - first) / 2, (hTot - first) / 2], { fill: lowFill, facade: lowFacade });
      } else if (m.kind === 'stove') {
        front(C, x, PLINTH, w, PLINTH + 130, { fill: lowFill, facade: lowFacade, drawer: true });
        handle(C, 'drawer', x + 1.5, PLINTH, w - 3, PLINTH + 130, 'right');
        oven(C, x, w, PLINTH + 130, bodyTop, !!C.style.gas && C.style.id !== 'loft');
      } else if (m.kind === 'dishwasher') {
        front(C, x, PLINTH, w, bodyTop, { fill: lowFill, facade: lowFacade });
        handle(C, 'drawer', x + 1.5, PLINTH, w - 3, bodyTop, 'right');
      } else if (m.kind === 'corner') {
        var blind = WORKTOP_D, atStart = x === 0;
        var dx = atStart ? x + blind : x, dw = w - blind;
        sideRun(C, atStart ? x : x + w - blind, PLINTH, blind, BODY_TOP, lowFill);
        doors(C, dx, dw, PLINTH, bodyTop, 1, Object.assign({}, dOpt, { side: atStart ? 'left' : 'right' }));
      } else {
        var withTop = C.style.topDrawer && w >= 300 && !(m.kind === 'sink' && C.style.farmSink);
        var dTop = bodyTop;
        if (m.kind === 'sink' && C.style.farmSink) dTop = BODY_TOP - 210;
        if (withTop) {
          front(C, x, bodyTop - 150, w, bodyTop, { fill: lowFill, facade: lowFacade, drawer: true });
          handle(C, 'drawer', x + 1.5, bodyTop - 150, w - 3, bodyTop, 'right');
          dTop = bodyTop - 150;
        }
        doors(C, x, w, PLINTH, dTop, m.doors || 1, dOpt);
      }
    });
    fillers.forEach(function (f) {
      C.push(box(f.x + 1, PLINTH, f.width - 2, BODY_TOP, Object.assign({ fill: shade(lowFill, -0.06) }, st(edge(lowFill), 0.8))));
    });
    sideLow.forEach(function (s) { sideRun(C, s[0], PLINTH, s[1] - s[0], BODY_TOP, lowFill); });

    /* столешница */
    counterRuns.forEach(function (r) {
      C.push(box(r[0], BODY_TOP, r[1] - r[0], WORK, Object.assign({ fill: T.counter }, st(edge(T.counter), 0.9))));
      C.push(line(r[0], -WORK + 5, r[1], -WORK + 5, st('#fff', 0.9, { 'stroke-opacity': 0.55 })));
      if (C.style.apron === 'marble' || C.style.apron === 'stone') {
        C.push(line(r[0], -BODY_TOP - 9, r[1], -BODY_TOP - 9, st(shade(T.counter, -0.12), 0.6)));
      }
    });

    /* мойка, варочная */
    lower.forEach(function (m) {
      if (m.kind === 'sink') {
        if (C.style.farmSink) {
          C.push(box(m.x + 30, BODY_TOP - 210, m.width - 60, WORK + 4, Object.assign({ fill: '#F7F5EF', rx: 14 }, st('#A8A194', 0.9))));
          C.push(line(m.x + 50, -(WORK - 30), m.x + m.width - 50, -(WORK - 30), st('#C9C2B4', 0.7)));
        }
        faucet(C, m.x + m.width / 2);
      }
      if (m.kind === 'stove') hob(C, m.x, m.width);
    });

    /* пенал */
    talls.forEach(function (m) {
      var x = m.x, w = m.width;
      var fill = T.tall, fac = C.style.facade;
      var side = x + w / 2 < L / 2 ? 'right' : 'left';
      front(C, x, PLINTH, w, BODY_TOP, { fill: fill, facade: fac });
      handle(C, 'tall-lower', x + 1.5, PLINTH, w - 3, BODY_TOP, side);
      oven(C, x, w, BODY_TOP + 20, BODY_TOP + 620, !!C.style.gas && C.style.id !== 'loft');
      front(C, x, BODY_TOP + 640, w, topU, { fill: fill, facade: fac });
      handle(C, 'tall-upper', x + 1.5, BODY_TOP + 640, w - 3, topU, side);
    });

    /* верхние */
    var regular = upper.filter(function (m) { return m.kind === 'upper'; });
    var shelves = {};
    if (C.style.openShelves) {
      var mode = C.style.id === 'loft' ? 'loft' : C.style.id === 'provence' ? 'center' : 'hood';
      var hoods = upper.filter(function (m) { return m.kind === 'hood'; });
      if (mode === 'loft') regular.forEach(function (m) { shelves[m.x] = 'loft'; });
      else if (mode === 'hood') {
        regular.forEach(function (m) {
          if (hoods.some(function (h) { return h.x === m.x + m.width || h.x + h.width === m.x; })) shelves[m.x] = 'hood';
        });
      } else {
        var wide = regular.filter(function (m) { return m.width >= 400; });
        var mid = wide.sort(function (a, b) { return Math.abs(a.x + a.width / 2 - L / 2) - Math.abs(b.x + b.width / 2 - L / 2); })[0];
        if (mid) shelves[mid.x] = 'center';
      }
    }
    var glassIdx = 0;
    upper.forEach(function (m) {
      var x = m.x, w = m.width;
      var side = x + w / 2 < L / 2 ? 'right' : 'left';
      if (m.kind === 'hood') { hood(C, m, uh, ceiling); return; }
      if (m.kind === 'open-shelf' || shelves[m.x]) return; // полки рисуем ниже сплошными пролётами
      if (m.kind === 'upper-corner') {
        var atStart = x === 0, blind = UPPER_D;
        sideRun(C, atStart ? x : x + w - blind, UB, blind, topU, T.fac);
        doors(C, atStart ? x + blind : x, w - blind, UB, topU, 1, { fill: T.fac, facade: C.style.facade, where: 'door-upper', side: atStart ? 'left' : 'right' });
        return;
      }
      var isGlass = false;
      if (C.style.glassUppers && w >= 400) { isGlass = glassIdx % 2 === 0; glassIdx++; }
      doors(C, x, w, UB, topU, m.doors || 1, {
        fill: T.fac, facade: C.style.facade, where: 'door-upper', side: side,
        glass: isGlass, arch: isGlass && C.style.facade === 'raised-panel'
      });
    });
    // открытые полки: соседние модули — один пролёт полки
    ['loft', 'hood', 'center'].forEach(function (mode) {
      var spans = upper.filter(function (m) { return shelves[m.x] === mode || (m.kind === 'open-shelf' && mode === 'hood'); })
        .map(function (m) { return [m.x, m.x + m.width]; });
      (mode === 'center' ? spans : runs(spans)).forEach(function (r) { openShelf(C, { x: r[0], width: r[1] - r[0] }, uh, mode); });
    });
    upperFillers.forEach(function (f) {
      C.push(box(f.x + 1, UB, f.width - 2, topU, Object.assign({ fill: shade(T.fac, -0.06) }, st(edge(T.fac), 0.8))));
    });
    sideUp.forEach(function (s) { sideRun(C, s[0], UB, s[1] - s[0], topU, T.fac); });

    /* антресоли до потолка (минимализм) */
    var cabinetHood = { mantle: 1, box: 1, integrated: 1 }[C.style.hood];
    var tallSpans = talls.map(function (m) { return [m.x, m.x + m.width]; });
    var upperCabSpans = upper.filter(function (m) { return m.kind !== 'hood' || cabinetHood; })
      .filter(function (m) { return !shelves[m.x]; })
      .map(function (m) { return [m.x, m.x + m.width]; })
      .concat(upperFillers.map(function (f) { return [f.x, f.x + f.width]; }), sideUp, tallSpans);
    if (C.style.toCeiling && ceiling - topU >= 150) {
      upperCabSpans.forEach(function (s) {
        front(C, s[0], topU, s[1] - s[0], ceiling, { fill: T.fac, facade: C.style.facade });
      });
    } else if (C.style.cornice) {
      /* карниз */
      var room = ceiling - topU;
      var prof = C.style.id === 'classic' ? [[10, 28], [26, 34], [40, 22]] : C.style.id === 'provence' ? [[8, 24], [24, 22]] : [[8, 30], [22, 22]];
      var total = prof.reduce(function (s, p) { return s + p[1]; }, 0);
      var scale = Math.min(1, room / total);
      runs(upperCabSpans).forEach(function (r) {
        var hh = topU;
        prof.forEach(function (p, i) {
          var ph = p[1] * scale, ov = p[0];
          var cfill = i % 2 ? shade(T.fac, 0.07) : T.fac;
          C.push(box(r[0] - ov, hh, r[1] - r[0] + 2 * ov, hh + ph, Object.assign({ fill: cfill }, st(edge(T.fac), 0.8))));
          if (C.style.patina) C.push(line(r[0] - ov, -(hh + ph), r[1] + ov, -(hh + ph), st(T.patina, 1, { 'stroke-opacity': 0.7 })));
          hh += ph;
        });
      });
    }

    /* размеры */
    var lowPts = [0, L];
    lower.forEach(function (m) { lowPts.push(m.x, m.x + m.width); });
    fillers.forEach(function (f) { lowPts.push(f.x, f.x + f.width); });
    sideLow.forEach(function (s) { lowPts.push(s[0], s[1]); });
    (wall.openings || []).forEach(function (o) { if (o.type === 'door') lowPts.push(o.x, o.x + o.width); });
    var upPts = [0, L];
    upper.forEach(function (m) { upPts.push(m.x, m.x + m.width); });
    upperFillers.forEach(function (f) { upPts.push(f.x, f.x + f.width); });
    sideUp.forEach(function (s) { upPts.push(s[0], s[1]); });
    talls.forEach(function (m) { upPts.push(m.x, m.x + m.width); });

    var yLow = SLAB + 26 * k, yAll = SLAB + 54 * k;
    chainH(C, lowPts, yLow, 0, false);
    chainH(C, [0, L], yAll, 0, true);
    var yUp = -(ceiling + SLAB + 26 * k);
    chainH(C, upPts, yUp, -ceiling, false);
    if (hasOpenings) {
      var oPts = [0, L];
      wall.openings.forEach(function (o) { oPts.push(o.x, o.x + o.width); });
      chainH(C, oPts, -(ceiling + SLAB + 54 * k), -ceiling, false);
    }
    var xV = -WALL_T - 24 * k;
    chainV(C, [0, PLINTH, BODY_TOP, WORK, UB, topU, ceiling], xV, -WALL_T, false);
    chainV(C, [0, ceiling], L + WALL_T + 24 * k, L + WALL_T, true);

    var x0 = -WALL_T - mSide * k, x1 = L + WALL_T + mSide * k;
    var y0 = -(ceiling + SLAB + (mTop - 4) * k), y1 = SLAB + (mBottom - 8) * k;
    mount(svgEl, C, [x0, y0, x1 - x0, y1 - y0]);
    return { k: k };
  }

  /* ---------- вид сверху ---------- */

  function renderPlan(svgEl, layout, opts) {
    opts = opts || {};
    var styles = V.kitchenStyles || [];
    var style = opts.style || styles[0] || { id: 'x', colors: [{ id: 'x', facade: '#DDD6CA', accent: '#999999', counter: '#E8E2D8' }], facade: 'flat-matte', handle: 'none' };
    var walls = {};
    layout.walls.forEach(function (w) { walls[w.id] = w; });
    var LA = walls.A.length, LB = walls.B ? walls.B.length : 0;
    var island = layout.island;
    var ISL_D = WORKTOP_D + 1000;
    var roomD = LB || (island ? ISL_D + island.depth + 800 : 1900);

    function map(id, x, d) {
      if (id === 'A') return [x, d];
      if (id === 'B') return [LA - d, x];
      return [LA - x, LB - d];
    }
    function quad(id, x1, x2, d1, d2) { return [map(id, x1, d1), map(id, x2, d1), map(id, x2, d2), map(id, x1, d2)]; }

    var cw = opts.width || containerWidth(svgEl);
    var maxH = opts.maxHeight || Math.max(260, Math.min(cw * 0.7, 520));
    var extW = LA + 2 * WALL_T, extH = roomD + 2 * WALL_T;
    var k = fitScale(extW, extH, 110, 90, cw, maxH);
    var C = new Ctx(style, opts.colorId, k);
    var T = C.T;
    var hz = hatch(C, 'cut', INK, 0.55);

    // пол
    C.push(rect(0, 0, LA, roomD, { fill: '#F3EEE5' }));
    if (!walls.B) {
      // стены по бокам продолжаются: тонкие линии
      C.push(line(0, 0, 0, roomD, st(INK3, 0.8, { 'stroke-dasharray': '6 5' })));
      C.push(line(LA, 0, LA, roomD, st(INK3, 0.8, { 'stroke-dasharray': '6 5' })));
    }

    // стены с проёмами
    layout.walls.forEach(function (w) {
      var L = w.length;
      var gaps = (w.openings || []).map(function (o) { return [o.x, o.x + o.width, o]; }).sort(function (a, b) { return a[0] - b[0]; });
      var s = -WALL_T;
      gaps.concat([[L + WALL_T, L + WALL_T, null]]).forEach(function (g) {
        if (g[0] > s) {
          C.push(poly(quad(w.id, s, g[0], -WALL_T, 0), { fill: hz }));
          C.push(poly(quad(w.id, s, g[0], -WALL_T, 0), Object.assign({ fill: 'none' }, st(INK, 1.3))));
        }
        var o = g[2];
        if (o && o.type === 'window') {
          var q1 = quad(w.id, g[0], g[1], -WALL_T, 0);
          C.push(poly(q1, Object.assign({ fill: '#FBFAF6' }, st(INK, 0.9))));
          var a1 = map(w.id, g[0], -WALL_T * 0.42), a2 = map(w.id, g[1], -WALL_T * 0.42);
          var b1 = map(w.id, g[0], -WALL_T * 0.58), b2 = map(w.id, g[1], -WALL_T * 0.58);
          C.push(line(a1[0], a1[1], a2[0], a2[1], st(INK2, 0.8)));
          C.push(line(b1[0], b1[1], b2[0], b2[1], st(INK2, 0.8)));
          var c1 = map(w.id, g[0] - 40, 0), c2 = map(w.id, g[1] + 40, 0), c3 = map(w.id, g[1] + 40, 50), c4 = map(w.id, g[0] - 40, 50);
          C.push(poly([c1, c2, c3, c4], Object.assign({ fill: '#FBFAF6' }, st(INK3, 0.7))));
        } else if (o && o.type === 'door') {
          var hinge = map(w.id, g[0], 0), leaf = map(w.id, g[0], o.width), free = map(w.id, g[1], 0);
          C.push(line(hinge[0], hinge[1], leaf[0], leaf[1], st(INK, 1.2)));
          C.push(path('M' + n(free[0]) + ' ' + n(free[1]) + 'A' + n(o.width) + ' ' + n(o.width) + ' 0 0 1 ' + n(leaf[0]) + ' ' + n(leaf[1]),
            Object.assign({ fill: 'none' }, st(INK3, 0.8, { 'stroke-dasharray': '5 4' }))));
        }
        s = Math.max(s, g[1]);
      });
    });

    // нижний ряд: столешница с швами модулей
    function counterQuad(id, x1, x2) { return quad(id, x1, x2, 0, WORKTOP_D); }
    function label(id, x1, x2, d, s) {
      var p = map(id, (x1 + x2) / 2, d);
      var fs = 9 * k;
      if (s.length * 0.62 * fs > (x2 - x1) - 6 * k) return;
      C.push(text(p[0], p[1] + fs * 0.35, s, { 'font-family': FONT, 'font-size': n(fs), fill: INK2, 'text-anchor': 'middle' }));
    }
    layout.walls.forEach(function (w) {
      var spans = w.lower.filter(function (m) { return m.kind !== 'tall'; }).map(function (m) { return [m.x, m.x + m.width]; })
        .concat((w.fillers || []).map(function (f) { return [f.x, f.x + f.width]; }));
      runs(spans).forEach(function (r) {
        C.push(poly(counterQuad(w.id, r[0], r[1]), Object.assign({ fill: T.counter }, st(INK, 1))));
      });
      w.lower.forEach(function (m) {
        var a = map(w.id, m.x, 0), b = map(w.id, m.x, BASE_D);
        if (m.x > 0) C.push(line(a[0], a[1], b[0], b[1], st(INK3, 0.6, { 'stroke-opacity': 0.7 })));
        if (m.kind === 'tall') {
          var q = quad(w.id, m.x, m.x + m.width, 0, WORKTOP_D);
          C.push(poly(q, Object.assign({ fill: T.tall }, st(INK, 1))));
          C.push(line(q[0][0], q[0][1], q[2][0], q[2][1], st(INK2, 0.7)));
          C.push(line(q[1][0], q[1][1], q[3][0], q[3][1], st(INK2, 0.7)));
          label(w.id, m.x, m.x + m.width, WORKTOP_D + 70, 'пенал');
        } else if (m.kind === 'sink') {
          var bowl = quad(w.id, m.x + 70, m.x + m.width - 70, 90, 470);
          C.push(poly(bowl, Object.assign({ fill: '#E9ECEE', 'stroke-linejoin': 'round' }, st(INK2, 0.9))));
          var dc = map(w.id, m.x + m.width / 2, 300);
          C.push(circle(dc[0], dc[1], 22, Object.assign({ fill: 'none' }, st(INK2, 0.8))));
          var fc = map(w.id, m.x + m.width / 2, 50);
          C.push(circle(fc[0], fc[1], 18, { fill: INK2 }));
        } else if (m.kind === 'stove') {
          var hq = quad(w.id, m.x + 30, m.x + m.width - 30, 50, 550);
          C.push(poly(hq, Object.assign({ fill: '#2A2B2D' }, st(INK, 0.8))));
          [[0.3, 0.3], [0.7, 0.3], [0.3, 0.72], [0.7, 0.72]].forEach(function (t, i) {
            var p = map(w.id, m.x + m.width * t[0], 50 + 500 * t[1]);
            C.push(circle(p[0], p[1], i === 1 ? 95 : 75, Object.assign({ fill: 'none' }, st('#9A9DA1', 0.9))));
          });
        } else if (m.kind === 'dishwasher') {
          label(w.id, m.x, m.x + m.width, 300, 'ПММ');
        }
      });
      // верхние шкафы: пунктир
      w.upper.forEach(function (m) {
        var q = quad(w.id, m.x, m.x + m.width, 0, m.kind === 'hood' ? 480 : UPPER_D);
        C.push(poly(q, Object.assign({ fill: 'none' }, st(INK2, 0.8, { 'stroke-dasharray': '7 5' }))));
        if (m.kind === 'hood') {
          C.push(line(q[0][0], q[0][1], q[2][0], q[2][1], st(INK3, 0.6, { 'stroke-dasharray': '7 5' })));
          C.push(line(q[1][0], q[1][1], q[3][0], q[3][1], st(INK3, 0.6, { 'stroke-dasharray': '7 5' })));
        }
      });
    });

    // остров
    if (island) {
      var ix = Math.round((LA - island.length) / 2), iy = ISL_D;
      C.push(rect(ix, iy, island.length, island.depth, Object.assign({ fill: T.counter }, st(INK, 1))));
      island.lower.forEach(function (m) {
        if (m.x > 0) C.push(line(ix + m.x, iy, ix + m.x, iy + BASE_D, st(INK3, 0.6)));
      });
      C.push(text(ix + island.length / 2, iy + island.depth / 2 + 3.5 * k, 'остров', { 'font-family': FONT, 'font-size': n(9 * k), fill: INK2, 'text-anchor': 'middle' }));
      chainH(C, [ix, ix + island.length], iy + island.depth + 22 * k, iy + island.depth, false);
      chainV(C, [-(iy + island.depth), -iy], ix + island.length + 22 * k, ix + island.length, false);
    }

    // общие размеры стен с буквой
    function overall(id, L) {
      var fs = 10.5 * k, gap = WALL_T + 26 * k;
      var p1 = map(id, 0, -gap), p2 = map(id, L, -gap);
      var e1 = map(id, 0, -WALL_T - 3 * k), e2 = map(id, L, -WALL_T - 3 * k);
      var f1 = map(id, 0, -gap - 5 * k), f2 = map(id, L, -gap - 5 * k);
      C.push(line(e1[0], e1[1], f1[0], f1[1], st(INK3, 0.7)));
      C.push(line(e2[0], e2[1], f2[0], f2[1], st(INK3, 0.7)));
      C.push(line(p1[0], p1[1], p2[0], p2[1], st(INK2, 0.9)));
      [p1, p2].forEach(function (p) { C.push(line(p[0] - 4 * k, p[1] + 4 * k, p[0] + 4 * k, p[1] - 4 * k, st(INK, 1.2))); });
      var m = map(id, L / 2, -gap - 4 * k);
      var vertical = id === 'B';
      var s = 'стена ' + id + '  ' + group(L);
      var o = { 'font-family': FONT, 'font-size': n(fs), fill: INK, 'text-anchor': 'middle', 'font-weight': 500 };
      if (vertical) {
        var tx = m[0] + fs * 0.9, ty = m[1];
        o.transform = 'rotate(90 ' + n(tx) + ' ' + n(ty) + ')';
        C.push(text(tx, ty, s, o));
      } else if (id === 'C') {
        C.push(text(m[0], m[1] + fs * 0.9 + 2 * k, s, o));
      } else {
        C.push(text(m[0], m[1], s, o));
      }
    }
    layout.walls.forEach(function (w) { overall(w.id, w.length); });

    var x0 = -WALL_T - 30 * k, x1 = LA + WALL_T + (walls.B ? 52 : 30) * k;
    var y0 = -WALL_T - 52 * k, y1 = roomD + (walls.C ? WALL_T + 52 * k : 14 * k);
    if (island) y1 = Math.max(y1, ISL_D + island.depth + 46 * k);
    mount(svgEl, C, [x0, y0, x1 - x0, y1 - y0]);
    return { k: k };
  }

  /* ---------- образец стиля ---------- */

  function swatch(style, colorId) {
    var C = new Ctx(style, colorId, 9);
    var T = C.T;
    var W = 1200, uh = 600, ub = 1000, ceil = 1720;
    C.push(box(0, 0, W, ceil, { fill: style.apron === 'brick' ? brick(C) : T.wall }));
    var ap = apronFill(C);
    if (ap) C.push(box(0, 760, W, ub, { fill: ap }));
    C.push(box(0, 0, W, 90, { fill: T.plinth }));
    drawerStack(C, 0, 600, 90, 720, [150, 240, 240], { fill: T.low, facade: T.lowerFacade });
    doors(C, 600, 600, 90, 720, 2, { fill: T.low, facade: T.lowerFacade, where: 'door-lower' });
    C.push(box(0, 720, W, 760, { fill: T.counter }));
    if (style.openShelves && style.id === 'loft') {
      openShelf(C, { x: 0, width: W }, uh, 'loft');
    } else {
      doors(C, 0, 600, ub, ub + uh, 2, { fill: T.fac, facade: style.facade, where: 'door-upper', glass: style.glassUppers, arch: style.glassUppers && style.facade === 'raised-panel' });
      if (style.openShelves) openShelfMini(C, 600, ub, uh);
      else doors(C, 600, 600, ub, ub + uh, 2, { fill: T.fac, facade: style.facade, where: 'door-upper' });
      if (style.cornice) C.push(box(-20, ub + uh, W + 40, ub + uh + 50, Object.assign({ fill: T.fac }, st(edge(T.fac), 0.8))));
    }
    return '<svg xmlns="' + NS + '" viewBox="0 -' + ceil + ' ' + W + ' ' + ceil + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      C.defsMarkup() + C.out.join('') + '</svg>';
  }
  function openShelfMini(C, x, ub, uh) {
    [ub + 120, ub + uh * 0.62].forEach(function (lh) {
      C.push(box(x + 20, lh - 40, 560, lh, { fill: mix(C.T.counter, '#ffffff', 0.1) }));
      shelfItems(C, x + 20, 560, lh, 1);
    });
  }

  var kitchenRender = { renderElevation: renderElevation, renderPlan: renderPlan, swatch: swatch };
  root.VROVEN = root.VROVEN || {};
  root.VROVEN.kitchenRender = kitchenRender;
})(typeof window !== 'undefined' ? window : this);
