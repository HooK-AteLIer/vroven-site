/*
 * Раскладка кухни по размерам. Чистый модуль: без DOM, без состояния.
 * В браузере: window.VROVEN.kitchenLayout, в Node: module.exports.
 *
 * Геометрия. Все размеры в мм, целые. У каждой стены своя ось x от 0 до length,
 * слева направо, если стоять лицом к стене. Стены идут по порядку A → B → C:
 * правый конец A стыкуется с левым концом B, правый конец B — с левым концом C.
 * Угол на стыке «принадлежит» крайней стене (A у стыка A/B, C у стыка B/C):
 * у неё нижний угловой модуль с глухой частью и верхний угловой. Соседняя стена
 * начинает нижний ряд через 600 мм (глубина столешницы владельца угла), верхний —
 * через 300 мм (глубина верхних шкафов). Так в плане модули не налезают друг на друга.
 *
 * Мойка и плита: offset — расстояние от левого края стены до левого края модуля.
 */
(function (root) {
  'use strict';

  // ---- Константы контракта ------------------------------------------------
  var PLINTH = 100;      // цоколь
  var BASE_H = 720;      // корпус нижнего модуля
  var TOP = 38;          // столешница
  var UPPER_H = 720;     // стандартный верхний шкаф
  var BASE_D = 560;      // глубина нижних корпусов
  var UPPER_D = 300;     // глубина верхних
  var UPPER_GAP = 600;   // от столешницы до низа верхних (фартук)
  var WIDTHS = [150, 200, 300, 400, 450, 500, 600, 800, 900];

  // ---- Константы раскладки (решения мебельщика) ---------------------------
  var UPPER_H_TALL = 920;                     // высокий верхний ряд
  var WORKTOP_H = PLINTH + BASE_H + TOP;      // 858 — рабочая поверхность
  var UPPER_BOTTOM = WORKTOP_H + UPPER_GAP;   // 1458 — низ верхних
  var CEILING_CLEARANCE = 50;                 // минимум между верхом шкафа и потолком для навески
  var UPPER_TALL_AUTO_CEILING = 2600;         // с какого потолка сами ставим 920: остаётся ≥ 222 мм под карниз
  var WORKTOP_D = 600;                        // глубина столешницы: столько нижний угол съедает у соседней стены
  var CORNER_WIDTHS = [1000, 900];            // глухой угловой: 600 под соседней столешницей + дверца 400 или 300
  var UPPER_CORNER_W = 600;                   // верхний угловой: 300 глухих + дверца 300
  var SINK_W = 600;
  var STOVE_W = 600;
  var HOOD_W = 600;
  var TALL_W = 600;                           // пенал под духовку/СВЧ
  var DW_WIDTHS = [600, 450];                 // посудомойка
  var WORK_IDEAL = 600;                       // желаемая столешница между мойкой и плитой
  var STOVE_SIDE_MIN = 300;                   // у плиты с каждой стороны не меньше модуля 300 (ящики)
  var STOVE_SIDE_MIN_RELAXED = 150;           // крайний случай для очень маленьких кухонь
  var STOVE_WINDOW_GAP = 450;                 // плиту не ставим вплотную к окну (шторы, откос)
  var WINDOW_UPPER_MARGIN = 50;               // зазор верхних шкафов от откоса окна
  var FILLER_MAX = 149;                       // добор всегда меньше 150
  var GRID = 50;                              // шаг стандартных ширин
  var WALL_MIN = 1200;
  var WALL_MAX = 12000;
  var CEILING_MIN = 2200;
  var CEILING_MAX = 5000;
  var ISLAND_LEN = [800, 4000];
  var ISLAND_DEPTH = [600, 1500];
  var ISLAND_DEFAULT = { length: 1200, depth: 900 };

  var SHAPES = { straight: ['A'], corner: ['A', 'B'], u: ['A', 'B', 'C'], island: ['A'] };
  var SHAPE_NAMES = { straight: 'прямой', corner: 'угловой', u: 'П-образной', island: 'кухни с островом' };

  // Штраф за ширину при подборе: широкие и стандартные 600 лучше узких «бутылочниц».
  var WIDTH_COST = { 150: 0.8, 200: 0.7, 300: 0.4, 400: 0.15, 450: 0.1, 500: 0.1, 600: 0, 800: 0.05, 900: 0.1 };
  var BIG = 100000;

  // ---- Валидация -------------------------------------------------------------
  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return isFinite(n) ? Math.round(n) : NaN;
  }

  function validate(input) {
    var errors = [];
    var add = function (field, message) { errors.push({ field: field, message: message }); };
    input = input && typeof input === 'object' ? input : {};
    var shape = input.shape;
    if (!SHAPES[shape]) {
      add('shape', 'Выберите форму кухни: прямая, угловая, П-образная или с островом');
      return { errors: errors };
    }
    var ids = SHAPES[shape];
    var walls = input.walls || {};
    var lengths = {};
    ids.forEach(function (id) {
      var v = num(walls[id]);
      var f = 'walls.' + id;
      if (v === null) add(f, 'Укажите длину стены ' + id + ' для ' + SHAPE_NAMES[shape] + ' кухни');
      else if (isNaN(v)) add(f, 'Длина стены ' + id + ' должна быть числом в миллиметрах');
      else if (v < WALL_MIN) add(f, 'Стена ' + id + ' короче ' + WALL_MIN + ' мм: на ней не поместится даже мойка с плитой');
      else if (v > WALL_MAX) add(f, 'Стена ' + id + ' длиннее ' + WALL_MAX + ' мм: проверьте, не лишний ли ноль');
      else lengths[id] = v;
    });

    var ceiling = num(input.ceiling);
    if (ceiling === null) add('ceiling', 'Укажите высоту потолка');
    else if (isNaN(ceiling)) add('ceiling', 'Высота потолка должна быть числом в миллиметрах');
    else if (ceiling < CEILING_MIN) add('ceiling', 'Потолок ниже ' + CEILING_MIN + ' мм: стандартные модули не встанут');
    else if (ceiling > CEILING_MAX) add('ceiling', 'Потолок выше ' + CEILING_MAX + ' мм: проверьте размер');

    function opening(key, name, needSill) {
      var o = input[key];
      if (!o) return null;
      if (ids.indexOf(o.wall) < 0) {
        add(key, name + ' стоит на стене ' + (o.wall || '?') + ', а у этой формы кухни стены: ' + ids.join(', '));
        return null;
      }
      var offset = num(o.offset);
      var width = num(o.width);
      if (width === null || isNaN(width) || width <= 0) { add(key, 'Укажите ширину: ' + name.toLowerCase() + ', мм'); return null; }
      if (offset === null || isNaN(offset)) { add(key, 'Укажите, на каком расстоянии от левого края стены ' + o.wall + ' ' + name.toLowerCase()); return null; }
      var len = lengths[o.wall];
      if (len === undefined) return null; // стена уже с ошибкой
      if (offset < 0 || offset + width > len) {
        add(key, name + ' выходит за пределы стены ' + o.wall + ' (её длина ' + len + ' мм)');
        return null;
      }
      var res = { wall: o.wall, offset: offset, width: width };
      if (needSill) {
        var sill = num(o.sill);
        if (sill !== null && (isNaN(sill) || sill < 0)) { add(key, 'Высота подоконника должна быть числом от 0 мм'); return null; }
        res.sill = sill === null ? null : sill;
      }
      return res;
    }
    var win = opening('window', 'Окно', true);
    var door = opening('door', 'Дверь', false);
    // Дверь в зоне стыка: в плане модули соседней стены (глубина столешницы 600)
    // встают прямо перед проёмом. Такую кухню стандартными модулями не собрать.
    if (door) {
      for (var j = 0; j < ids.length - 1; j++) {
        var endWall = ids[j], startWall = ids[j + 1];
        var nearEnd = door.wall === endWall && door.offset + door.width > lengths[endWall] - WORKTOP_D;
        var nearStart = door.wall === startWall && door.offset < WORKTOP_D;
        if (nearEnd || nearStart) {
          add('door', 'Дверь ближе ' + WORKTOP_D + ' мм к углу стен ' + endWall + ' и ' + startWall +
            ': угловой гарнитур перекроет проём. Сдвиньте дверь или выберите другую форму кухни');
          door = null;
          break;
        }
      }
    }

    function point(key, name) {
      var p = input[key];
      if (!p || p.wall === undefined || p.wall === null || p.wall === '') return null;
      if (ids.indexOf(p.wall) < 0) { add(key, name + ' на стене ' + p.wall + ', а у этой формы кухни стены: ' + ids.join(', ')); return null; }
      var offset = num(p.offset);
      var len = lengths[p.wall];
      if (offset === null) offset = null;
      else if (isNaN(offset)) { add(key, 'Расстояние до места «' + name.toLowerCase() + '» должно быть числом'); return null; }
      else if (len !== undefined && (offset < 0 || offset > len)) {
        add(key, name + ' за пределами стены ' + p.wall + ' (её длина ' + len + ' мм)');
        return null;
      }
      return { wall: p.wall, offset: offset };
    }
    var sink = point('sink', 'Мойка');
    var stove = point('stove', 'Плита');

    var island = null;
    if (shape === 'island') {
      var isl = input.island || {};
      var il = num(isl.length), idp = num(isl.depth);
      if (il === null) il = ISLAND_DEFAULT.length;
      if (idp === null) idp = ISLAND_DEFAULT.depth;
      if (isNaN(il) || il < ISLAND_LEN[0] || il > ISLAND_LEN[1]) add('island.length', 'Длина острова от ' + ISLAND_LEN[0] + ' до ' + ISLAND_LEN[1] + ' мм');
      if (isNaN(idp) || idp < ISLAND_DEPTH[0] || idp > ISLAND_DEPTH[1]) add('island.depth', 'Глубина острова от ' + ISLAND_DEPTH[0] + ' до ' + ISLAND_DEPTH[1] + ' мм');
      island = { length: il, depth: idp, defaulted: !input.island };
    }

    var options = input.options || {};
    var upperReq = num(options.upperHeight);
    if (upperReq !== null && upperReq !== UPPER_H && upperReq !== UPPER_H_TALL) {
      add('options.upperHeight', 'Высота верхних шкафов: ' + UPPER_H + ' или ' + UPPER_H_TALL + ' мм');
    }

    if (errors.length) return { errors: errors };
    return {
      errors: errors,
      ctx: { shape: shape, ids: ids, lengths: lengths, ceiling: ceiling, window: win, door: door,
        sink: sink, stove: stove, island: island, tallUnit: !!options.tallUnit, upperReq: upperReq }
    };
  }

  // ---- Интервалы свободного места ------------------------------------------
  // Интервал {s, e, ls, rs}: ls/rs — можно ли у этого края поставить добор
  // (край стены, проём, угол, пенал). Между мойкой, ПММ и плитой добора быть не должно.

  function cutRange(intervals, s, e) {
    var out = [];
    intervals.forEach(function (iv) {
      if (e <= iv.s || s >= iv.e) { out.push(iv); return; }
      if (s > iv.s) out.push({ s: iv.s, e: s, ls: iv.ls, rs: true });
      if (e < iv.e) out.push({ s: e, e: iv.e, ls: true, rs: iv.rs });
    });
    return out;
  }

  function regionOk(len, ls, rs) {
    if (len < 0) return false;
    if (len === 0 || ls || rs) return true;
    return len % GRID === 0 && (len === 150 || len === 200 || len >= 300);
  }

  function findInterval(intervals, x, w) {
    for (var i = 0; i < intervals.length; i++) {
      if (x >= intervals[i].s && x + w <= intervals[i].e) return i;
    }
    return -1;
  }

  // Вставка предмета: делит интервал; soft — можно ли рядом с предметом добор.
  function place(intervals, x, w, soft) {
    var i = findInterval(intervals, x, w);
    var iv = intervals[i];
    var out = intervals.slice(0, i);
    if (x > iv.s) out.push({ s: iv.s, e: x, ls: iv.ls, rs: soft });
    if (x + w < iv.e) out.push({ s: x + w, e: iv.e, ls: soft, rs: iv.rs });
    return out.concat(intervals.slice(i + 1));
  }

  // Позиции на сетке 50 от обоих краёв интервала, чтобы между жёсткими краями
  // оставалось кратное стандартным ширинам.
  function positions(iv, w) {
    var xs = [];
    var seen = {};
    for (var x = iv.s; x + w <= iv.e; x += GRID) { if (!seen[x]) { seen[x] = 1; xs.push(x); } }
    for (var y = iv.e - w; y >= iv.s; y -= GRID) { if (!seen[y]) { seen[y] = 1; xs.push(y); } }
    return xs;
  }

  // ---- Подбор ширин -------------------------------------------------------------
  var decomposeCache = {};
  function decomposeCost(len) {
    var ws = decompose(len);
    return ws.reduce(function (c, w) { return c + 1 + WIDTH_COST[w]; }, 0);
  }
  function decompose(len) {
    if (len <= 0) return [];
    if (decomposeCache[len]) return decomposeCache[len].slice();
    var n = len / GRID;
    var cost = [0], pick = [0];
    for (var i = 1; i <= n; i++) {
      cost[i] = Infinity;
      for (var k = 0; k < WIDTHS.length; k++) {
        var u = WIDTHS[k] / GRID;
        if (u <= i && cost[i - u] + 1 + WIDTH_COST[WIDTHS[k]] < cost[i]) {
          cost[i] = cost[i - u] + 1 + WIDTH_COST[WIDTHS[k]];
          pick[i] = WIDTHS[k];
        }
      }
    }
    var res = [];
    for (var j = n; j > 0; j -= pick[j] / GRID) res.push(pick[j]);
    res.sort(function (a, b) { return b - a; });
    decomposeCache[len] = res;
    return res.slice();
  }

  // Заполняет промежуток модулями; добор (< 150) у мягкого края, широкие — у жёсткого.
  function fillRegion(s, e, ls, rs) {
    var len = e - s;
    var exact = len, filler = 0;
    if (ls || rs) {
      // Можно оставить добор до 149 мм: берём вариант с меньшим числом узких модулей.
      var bestCost = Infinity;
      for (var ex = len - (len % GRID); ex >= 0 && len - ex <= FILLER_MAX; ex -= GRID) {
        if (!regionOk(ex, false, false)) continue;
        var c = decomposeCost(ex) + (len - ex > 0 ? 0.3 + (len - ex) / 500 : 0);
        if (c < bestCost) { bestCost = c; exact = ex; }
      }
      filler = len - exact;
    }
    var widths = decompose(exact);
    var fillerLeft = filler > 0 && !rs;
    if (!ls && rs) { /* широкие от левого (жёсткого) края */ } else if (ls && !rs) widths.reverse();
    var modules = [], fillers = [];
    var x = s;
    if (fillerLeft) { fillers.push({ x: x, width: filler }); x += filler; }
    widths.forEach(function (w) { modules.push({ x: x, width: w }); x += w; });
    if (filler > 0 && !fillerLeft) fillers.push({ x: x, width: filler });
    return { modules: modules, fillers: fillers };
  }

  // ---- Модули -----------------------------------------------------------------
  function mod(x, width, kind) {
    var m = { x: x, width: width, kind: kind, doors: 0 };
    switch (kind) {
      case 'base': case 'upper': m.doors = width <= 500 ? 1 : 2; break;
      case 'drawers': m.doors = 0; m.drawers = 3; break;
      case 'sink': m.doors = width <= 500 ? 1 : 2; break;
      case 'stove': case 'dishwasher': case 'corner': case 'upper-corner': m.doors = 1; break;
      case 'tall': m.doors = 2; break;
      default: m.doors = 0;
    }
    return m;
  }

  function overlap(a1, a2, b1, b2) { return a1 < b2 && b1 < a2; }
  function distance(a1, a2, b1, b2) { return Math.max(0, b1 - a2, a1 - b2); }

  // ---- Раскладка --------------------------------------------------------------
  function buildWalls(ctx) {
    var ids = ctx.ids;
    var warnings = [];
    var walls = {};
    ids.forEach(function (id, i) {
      walls[id] = {
        id: id, length: ctx.lengths[id],
        joinStart: i > 0 ? ids[i - 1] : null,
        joinEnd: i < ids.length - 1 ? ids[i + 1] : null,
        lowerIv: [{ s: 0, e: ctx.lengths[id], ls: true, rs: true }],
        upperIv: [{ s: 0, e: ctx.lengths[id], ls: true, rs: true }],
        items: [],       // нижние предметы: угол, мойка, ПММ, пенал, плита
        upperItems: [],
        cornerAt: null   // 'start' | 'end' — где у стены свой угловой модуль
      };
    });
    if (ctx.door) {
      var dw = walls[ctx.door.wall];
      dw.lowerIv = cutRange(dw.lowerIv, ctx.door.offset, ctx.door.offset + ctx.door.width);
      dw.upperIv = cutRange(dw.upperIv, ctx.door.offset, ctx.door.offset + ctx.door.width);
    }
    // Стыки: владелец — крайняя стена (A у A/B, C у B/C).
    for (var i = 0; i < ids.length - 1; i++) {
      var owner = i === 0 ? walls[ids[0]] : walls[ids[i + 1]];
      var other = i === 0 ? walls[ids[1]] : walls[ids[i]];
      var ownerAtEnd = i === 0;
      // Соседняя стена: зона под столешницей и верхним углом владельца.
      if (ownerAtEnd) {
        other.lowerIv = cutRange(other.lowerIv, 0, WORKTOP_D);
        other.upperIv = cutRange(other.upperIv, 0, UPPER_D);
      } else {
        other.lowerIv = cutRange(other.lowerIv, other.length - WORKTOP_D, other.length);
        other.upperIv = cutRange(other.upperIv, other.length - UPPER_D, other.length);
      }
      var placed = false;
      for (var k = 0; k < CORNER_WIDTHS.length && !placed; k++) {
        var cw = CORNER_WIDTHS[k];
        var cx = ownerAtEnd ? owner.length - cw : 0;
        if (findInterval(owner.lowerIv, cx, cw) >= 0) {
          owner.lowerIv = place(owner.lowerIv, cx, cw, true);
          owner.items.push(mod(cx, cw, 'corner'));
          owner.cornerAt = ownerAtEnd ? 'end' : 'start';
          placed = true;
        }
      }
      if (!placed) warnings.push('На стыке стен ' + ids[i] + ' и ' + ids[i + 1] + ' не встал угловой модуль: мешает дверной проём');
      var ux = ownerAtEnd ? owner.length - UPPER_CORNER_W : 0;
      var winBlocks = ctx.window && ctx.window.wall === owner.id &&
        overlap(ux, ux + UPPER_CORNER_W, ctx.window.offset - WINDOW_UPPER_MARGIN, ctx.window.offset + ctx.window.width + WINDOW_UPPER_MARGIN);
      if (placed && !winBlocks && findInterval(owner.upperIv, ux, UPPER_CORNER_W) >= 0) {
        owner.upperIv = place(owner.upperIv, ux, UPPER_CORNER_W, true);
        owner.upperItems.push(mod(ux, UPPER_CORNER_W, 'upper-corner'));
      }
    }
    return { walls: walls, warnings: warnings };
  }

  function cloneWalls(walls) {
    var out = {};
    Object.keys(walls).forEach(function (id) {
      var w = walls[id];
      out[id] = Object.assign({}, w, { lowerIv: w.lowerIv.slice(), items: w.items.slice() });
    });
    return out;
  }

  // Первая/последняя свободная точка нижнего ряда (для желаемых позиций у угла).
  function freeStart(w) { return w.lowerIv.length ? w.lowerIv[0].s : 0; }
  function freeEnd(w) { return w.lowerIv.length ? w.lowerIv[w.lowerIv.length - 1].e : w.length; }

  function desiredSink(ctx, walls, dwW) {
    if (ctx.sink) {
      var w = walls[ctx.sink.wall];
      var x = ctx.sink.offset === null ? Math.round(w.length / 2 - SINK_W / 2) : ctx.sink.offset;
      return { wall: ctx.sink.wall, x: x, given: ctx.sink.offset !== null };
    }
    if (ctx.window) {
      return { wall: ctx.window.wall, x: Math.round(ctx.window.offset + ctx.window.width / 2 - SINK_W / 2) };
    }
    if (ctx.shape === 'corner') {
      // мойка у угла (стояк обычно в углу), ПММ дальше от угла
      return { wall: 'A', x: freeEnd(walls.A) - SINK_W };
    }
    if (ctx.shape === 'u') return { wall: 'B', x: Math.round(walls.B.length / 2 - SINK_W / 2) };
    // прямая и остров: мойка у края, рядом ПММ к стене
    return { wall: 'A', x: freeStart(walls.A) + dwW };
  }

  function stoveWallFor(ctx, walls, sinkWall) {
    if (ctx.stove) return ctx.stove.wall;
    if (ctx.shape === 'corner') return sinkWall === 'A' ? 'B' : 'A';
    if (ctx.shape === 'u') {
      if (sinkWall === 'A') return 'C';
      if (sinkWall === 'C') return 'A';
      return walls.C.length > walls.A.length ? 'C' : 'A';
    }
    return 'A';
  }

  // Сторона ПММ относительно мойки: 'left' | 'right'.
  function preferredDwSide(ctx, walls, sink) {
    var stoveWall = stoveWallFor(ctx, walls, sink.wall);
    var w = walls[sink.wall];
    if (stoveWall === sink.wall) {
      if (ctx.stove && ctx.stove.offset !== null) return ctx.stove.offset > sink.x ? 'left' : 'right';
      var iv = w.lowerIv[Math.max(0, findNearest(w.lowerIv, sink.x))];
      var c = sink.x + SINK_W / 2;
      return (c - iv.s) <= (iv.e - c) ? 'left' : 'right';
    }
    if (w.joinEnd === stoveWall) return 'left';
    if (w.joinStart === stoveWall) return 'right';
    return 'left';
  }

  function findNearest(intervals, x) {
    var best = -1, bd = Infinity;
    intervals.forEach(function (iv, i) {
      var d = distance(x, x, iv.s, iv.e);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function desiredStove(ctx, walls, group) {
    var wallId = stoveWallFor(ctx, walls, group.wall);
    if (ctx.stove && ctx.stove.offset !== null) return { wall: wallId, x: ctx.stove.offset };
    var w = walls[wallId];
    if (wallId === group.wall) {
      var iv = w.lowerIv[findNearest(w.lowerIv, group.s)];
      var right = iv ? iv.e - group.e : 0;
      var left = iv ? group.s - iv.s : 0;
      return { wall: wallId, x: right >= left ? group.e + WORK_IDEAL : group.s - WORK_IDEAL - STOVE_W };
    }
    // На соседней стене: один модуль от угла, чтобы угол был рабочей зоной.
    var nearStart = w.joinStart === group.wall || (w.joinEnd !== group.wall && w.joinStart);
    if (nearStart) return { wall: wallId, x: freeStart(w) + WORK_IDEAL };
    return { wall: wallId, x: freeEnd(w) - WORK_IDEAL - STOVE_W };
  }

  // Кандидаты «мойка + ПММ» по всем стенам, с оценкой.
  function sinkGroupCandidates(ctx, walls, dwW) {
    var desired = desiredSink(ctx, walls, dwW);
    var side = preferredDwSide(ctx, walls, desired);
    var out = [];
    var gw = SINK_W + dwW;
    ctx.ids.forEach(function (id) {
      var w = walls[id];
      w.lowerIv.forEach(function (iv) {
        positions(iv, gw).forEach(function (x) {
          if (!regionOk(x - iv.s, iv.ls, false) || !regionOk(iv.e - x - gw, false, iv.rs)) return;
          var sides = dwW ? ['left', 'right'] : ['none'];
          sides.forEach(function (sd) {
            var sinkX = sd === 'left' ? x + dwW : x;
            var score = Math.abs(sinkX - desired.x) + (id !== desired.wall ? BIG : 0) + (sd !== 'none' && sd !== side ? 60 : 0);
            out.push({ wall: id, s: x, e: x + gw, sinkX: sinkX, dwX: sd === 'left' ? x : x + SINK_W, dwW: dwW, score: score });
          });
        });
      });
    });
    out.sort(function (a, b) { return a.score - b.score; });
    return { list: out, desired: desired };
  }

  function tallOptions(ctx, walls, group) {
    var first = walls[ctx.ids[0]];
    var last = walls[ctx.ids[ctx.ids.length - 1]];
    var cands = [];
    [{ w: first, x: 0 }, { w: last, x: last.length - TALL_W }].forEach(function (c) {
      var i = findInterval(c.w.lowerIv, c.x, TALL_W);
      if (i < 0) return;
      if (ctx.window && ctx.window.wall === c.w.id && overlap(c.x, c.x + TALL_W, ctx.window.offset, ctx.window.offset + ctx.window.width)) return;
      var dist = c.w.id !== group.wall ? BIG : distance(c.x, c.x + TALL_W, group.s, group.e);
      cands.push({ w: c.w, x: c.x, dist: dist });
    });
    cands.sort(function (a, b) { return b.dist - a.dist; });
    // Дальний от мойки край без штрафа, ближний — с небольшим.
    return cands.map(function (c, i) { return { wall: c.w.id, x: c.x, score: i * 300 }; });
  }

  function bestStove(ctx, walls, group, sideMin) {
    var desired = desiredStove(ctx, walls, group);
    var best = null;
    ctx.ids.forEach(function (id) {
      var w = walls[id];
      w.lowerIv.forEach(function (iv) {
        positions(iv, STOVE_W).forEach(function (x) {
          var left = x - iv.s, right = iv.e - x - STOVE_W;
          if (left < sideMin || right < sideMin) return;
          if (!regionOk(left, iv.ls, false) || !regionOk(right, false, iv.rs)) return;
          var score = Math.abs(x - desired.x) + (id !== desired.wall ? BIG : 0);
          if (ctx.window && ctx.window.wall === id) {
            var d = distance(x, x + STOVE_W, ctx.window.offset, ctx.window.offset + ctx.window.width);
            if (d === 0) return;
            if (d < STOVE_WINDOW_GAP) score += (STOVE_WINDOW_GAP - d) * 4;
          }
          if (id === group.wall) {
            var gap = distance(x, x + STOVE_W, group.s, group.e);
            if (gap < WORK_IDEAL) score += (WORK_IDEAL - gap) * 2;
          }
          if (!best || score < best.score) best = { wall: id, x: x, score: score };
        });
      });
    });
    return best && { best: best, desired: desired };
  }

  function attempt(ctx, base, cfg) {
    var cands = sinkGroupCandidates(ctx, base, cfg.dw);
    var best = null;
    for (var i = 0; i < cands.list.length; i++) {
      var g = cands.list[i];
      if (best && g.score >= best.score) break;
      var walls0 = cloneWalls(base);
      var w = walls0[g.wall];
      w.lowerIv = place(w.lowerIv, g.s, g.e - g.s, false);
      w.items.push(mod(g.sinkX, SINK_W, 'sink'));
      if (g.dwW) w.items.push(mod(g.dwX, g.dwW, 'dishwasher'));
      var talls = cfg.tall ? tallOptions(ctx, walls0, g) : [null];
      for (var t = 0; t < talls.length; t++) {
        var walls = walls0;
        var tallScore = 0;
        if (talls[t]) {
          walls = cloneWalls(walls0);
          var tw = walls[talls[t].wall];
          tw.lowerIv = place(tw.lowerIv, talls[t].x, TALL_W, true);
          tw.items.push(mod(talls[t].x, TALL_W, 'tall'));
          tallScore = talls[t].score;
        }
        var st = bestStove(ctx, walls, g, cfg.sideMin);
        if (!st) continue;
        var score = g.score + tallScore + st.best.score;
        if (!best || score < best.score) best = { score: score, walls: walls, group: g, stove: st.best, sinkDesired: cands.desired, stoveDesired: st.desired };
      }
    }
    if (!best) return null;
    var sw = best.walls[best.stove.wall];
    sw.lowerIv = place(sw.lowerIv, best.stove.x, STOVE_W, false);
    sw.items.push(mod(best.stove.x, STOVE_W, 'stove'));
    return best;
  }

  function fillWall(w, ctx) {
    var lower = w.items.slice();
    var fillers = [];
    var stove = lower.filter(function (m) { return m.kind === 'stove'; })[0];
    w.lowerIv.forEach(function (iv) {
      var f = fillRegion(iv.s, iv.e, iv.ls, iv.rs);
      f.modules.forEach(function (m) {
        var touchesStove = stove && (m.x + m.width === stove.x || stove.x + stove.width === m.x);
        lower.push(mod(m.x, m.width, touchesStove && m.width >= 300 ? 'drawers' : 'base'));
      });
      fillers = fillers.concat(f.fillers);
    });
    lower.sort(function (a, b) { return a.x - b.x; });
    fillers.sort(function (a, b) { return a.x - b.x; });

    // Верхний ряд: без окна, проёма, пенала; над плитой вытяжка.
    var upperIv = w.upperIv;
    var upper = w.upperItems.slice();
    if (ctx.window && ctx.window.wall === w.id) {
      upperIv = cutRange(upperIv, Math.max(0, ctx.window.offset - WINDOW_UPPER_MARGIN),
        Math.min(w.length, ctx.window.offset + ctx.window.width + WINDOW_UPPER_MARGIN));
    }
    lower.forEach(function (m) {
      if (m.kind === 'tall') upperIv = cutRange(upperIv, m.x, m.x + m.width);
    });
    if (stove) {
      var hx = stove.x + Math.round((stove.width - HOOD_W) / 2);
      upperIv = cutRange(upperIv, hx, hx + HOOD_W);
      upper.push(mod(hx, HOOD_W, 'hood'));
    }
    var upperFillers = [];
    var bounds = [];
    lower.forEach(function (m) { bounds.push(m.x, m.x + m.width); });
    fillers.forEach(function (f) { bounds.push(f.x, f.x + f.width); });
    upperIv.forEach(function (iv) {
      // Швы верхних совпадают со швами нижних, где это возможно.
      var cuts = bounds.filter(function (b) { return b > iv.s && b < iv.e; });
      cuts = cuts.filter(function (b, i) { return cuts.indexOf(b) === i; }).sort(function (a, b) { return a - b; });
      var pts = [iv.s].concat(cuts, [iv.e]);
      for (var i = 0; i < pts.length - 1; i++) {
        var s = pts[i], e = pts[i + 1], len = e - s;
        if (WIDTHS.indexOf(len) >= 0) { upper.push(mod(s, len, 'upper')); continue; }
        if (len <= FILLER_MAX) { upperFillers.push({ x: s, width: len }); continue; }
        var ls = s === iv.s, rs = e === iv.e || !ls;
        var f = fillRegion(s, e, ls, rs);
        f.modules.forEach(function (m) { upper.push(mod(m.x, m.width, 'upper')); });
        upperFillers = upperFillers.concat(f.fillers);
      }
    });
    upper.sort(function (a, b) { return a.x - b.x; });
    upperFillers.sort(function (a, b) { return a.x - b.x; });

    var openings = [];
    if (ctx.window && ctx.window.wall === w.id) {
      openings.push({ type: 'window', x: ctx.window.offset, width: ctx.window.width, sill: ctx.window.sill });
    }
    if (ctx.door && ctx.door.wall === w.id) openings.push({ type: 'door', x: ctx.door.offset, width: ctx.door.width });

    return {
      id: w.id, length: w.length, lower: lower, upper: upper, fillers: fillers,
      upperFillers: upperFillers, openings: openings,
      joins: { start: w.joinStart, end: w.joinEnd }
    };
  }

  function chooseUpperHeight(ctx, warnings) {
    var fits920 = ctx.ceiling >= UPPER_BOTTOM + UPPER_H_TALL + CEILING_CLEARANCE;
    if (ctx.upperReq === UPPER_H_TALL) {
      if (fits920) return UPPER_H_TALL;
      warnings.push('Верхние шкафы ' + UPPER_H_TALL + ' мм не помещаются под потолок ' + ctx.ceiling + ' мм, поставили ' + UPPER_H + ' мм');
      return UPPER_H;
    }
    if (ctx.upperReq === UPPER_H) return UPPER_H;
    return ctx.ceiling >= UPPER_TALL_AUTO_CEILING ? UPPER_H_TALL : UPPER_H;
  }

  function layout(input) {
    var v = validate(input);
    if (v.errors.length) return { ok: false, errors: v.errors };
    var ctx = v.ctx;
    var built = buildWalls(ctx);
    var warnings = built.warnings;

    var configs = [];
    var talls = ctx.tallUnit ? [true, false] : [false];
    talls.forEach(function (t) {
      DW_WIDTHS.forEach(function (dw) { configs.push({ tall: t, dw: dw, sideMin: STOVE_SIDE_MIN }); });
    });
    configs.push({ tall: false, dw: 0, sideMin: STOVE_SIDE_MIN });
    configs.push({ tall: false, dw: 0, sideMin: STOVE_SIDE_MIN_RELAXED });

    var result = null, cfgUsed = null;
    for (var i = 0; i < configs.length && !result; i++) {
      result = attempt(ctx, built.walls, configs[i]);
      cfgUsed = configs[i];
    }
    var walls = built.walls;
    if (result) {
      walls = result.walls;
      if (ctx.tallUnit && !cfgUsed.tall) warnings.push('Пенал не поместился: на стенах не хватает места рядом с мойкой и плитой');
      if (cfgUsed.dw === 0) warnings.push('Посудомойка не поместилась');
      if (cfgUsed.sideMin < STOVE_SIDE_MIN) warnings.push('Плита стоит ближе 300 мм к краю: кухня очень маленькая, лучше обсудить на замере');
      if (result.sinkDesired.given && (result.group.wall !== result.sinkDesired.wall || Math.abs(result.group.sinkX - result.sinkDesired.x) > GRID)) {
        warnings.push('Мойку сдвинули, чтобы встали стандартные модули и посудомойка');
      }
      if (ctx.stove && ctx.stove.offset !== null && (result.stove.wall !== ctx.stove.wall || Math.abs(result.stove.x - ctx.stove.offset) > GRID)) {
        warnings.push('Плиту сдвинули: рядом с ней нужно не меньше 300 мм столешницы и место до окна');
      }
    } else {
      warnings.push('Мойка и плита не помещаются на этих стенах: раскладку уточним на замере');
    }
    if (ctx.window && ctx.window.sill !== null && ctx.window.sill < WORKTOP_H) {
      warnings.push('Подоконник ниже столешницы (' + WORKTOP_H + ' мм): под окном понадобится вырез или своя высота');
    }
    if (ctx.ceiling < UPPER_BOTTOM + UPPER_H + CEILING_CLEARANCE) {
      warnings.push('Верхние шкафы почти упираются в потолок: фартук сделаем ниже 600 мм');
    }
    var upperHeight = chooseUpperHeight(ctx, warnings);

    var outWalls = ctx.ids.map(function (id) { return fillWall(walls[id], ctx); });
    var frontMm = 0;
    outWalls.forEach(function (w) {
      w.lower.forEach(function (m) { frontMm += m.width; });
      w.fillers.forEach(function (f) { frontMm += f.width; });
    });

    var out = { ok: true, walls: outWalls, upperHeight: upperHeight, ceiling: ctx.ceiling };
    if (ctx.island) {
      var f = fillRegion(0, ctx.island.length, true, true);
      out.island = {
        length: ctx.island.length, depth: ctx.island.depth,
        lower: f.modules.map(function (m) { return mod(m.x, m.width, m.width >= 400 ? 'drawers' : 'base'); }),
        fillers: f.fillers
      };
      if (ctx.island.defaulted) warnings.push('Размер острова не указан, взяли ' + ISLAND_DEFAULT.length + ' × ' + ISLAND_DEFAULT.depth + ' мм');
      frontMm += ctx.island.length;
    }
    out.runMeters = Math.round(frontMm / 10) / 100;
    out.warnings = warnings;
    return out;
  }

  var kitchenLayout = {
    PLINTH: PLINTH, BASE_H: BASE_H, TOP: TOP, UPPER_H: UPPER_H, BASE_D: BASE_D, UPPER_D: UPPER_D,
    UPPER_GAP: UPPER_GAP, WIDTHS: WIDTHS.slice(),
    UPPER_H_TALL: UPPER_H_TALL, WORKTOP_H: WORKTOP_H, WORKTOP_D: WORKTOP_D,
    UPPER_TALL_AUTO_CEILING: UPPER_TALL_AUTO_CEILING, TALL_W: TALL_W,
    layout: layout
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = kitchenLayout;
  } else {
    root.VROVEN = root.VROVEN || {};
    root.VROVEN.kitchenLayout = kitchenLayout;
  }
})(typeof window !== 'undefined' ? window : this);
