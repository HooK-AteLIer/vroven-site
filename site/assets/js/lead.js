/*
 * ВРОВЕНЬ: текст заявки и ссылки WhatsApp / звонка. Чистый модуль, без DOM.
 * Номер берётся из data.js (в браузере data.js подключён раньше).
 *
 * payload: подписи уже человеческие (названия, а не id), числа без форматирования.
 *   general: { name, phone, task }
 *   repair:  { objectName, repairName, area, ceiling, min, max, name, phone }
 *   bundle:  { repairName, area, furniture:[{ name, meters }], discountPct, savings, total, name, phone }
 *   kitchen: { shapeName, walls:{A,B,C}, ceiling, styleName, colorName, materialName, runMeters, price, withRepair, link, name, phone }
 *   job:     { position, name, phone, experience }
 * Пустые, нулевые и нечисловые значения в текст не попадают.
 */
(function (root) {
  'use strict';

  var data = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('./data.js')
    : (root.VROVEN && root.VROVEN.data);

  function hasText(v) {
    return typeof v === 'string' ? v.trim().length > 0 : false;
  }

  function hasNumber(v) {
    var n = typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : v;
    return typeof n === 'number' && isFinite(n) && n > 0;
  }

  function toNumber(v) {
    return typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  }

  // 1250000 → «1 250 000», 3.2 → «3,2»
  function group(n) {
    var num = toNumber(n);
    var rounded = Math.round(num * 10) / 10;
    var parts = String(Math.abs(rounded)).split('.');
    var int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (rounded < 0 ? '-' : '') + int + (parts[1] ? ',' + parts[1] : '');
  }

  function rub(n) { return group(Math.round(toNumber(n))) + ' ₽'; }
  function mm(n) { return group(Math.round(toNumber(n))) + ' мм'; }

  function Lines() { this.list = []; }
  Lines.prototype.add = function (label, value) {
    if (value === null || value === undefined) return this;
    var s = String(value).trim();
    if (!s) return this;
    this.list.push(label ? label + ': ' + s : s);
    return this;
  };
  Lines.prototype.text = function (label, v) { return hasText(v) ? this.add(label, v) : this; };
  Lines.prototype.num = function (label, v, fmt) { return hasNumber(v) ? this.add(label, fmt(v)) : this; };

  var HEAD = {
    general: 'Здравствуйте! Хочу получить смету.',
    repair: 'Здравствуйте! Хочу рассчитать ремонт.',
    bundle: 'Здравствуйте! Хочу ремонт и мебель комплектом.',
    kitchen: 'Здравствуйте! Хочу кухню по своим размерам, прошу замер.',
    job: 'Здравствуйте! Хочу работать у вас.'
  };

  function contact(lines, p) {
    lines.text('Имя', p.name).text('Телефон', p.phone);
  }

  var BODY = {
    general: function (l, p) {
      contact(l, p);
      l.text('Задача', p.task);
    },
    repair: function (l, p) {
      l.text('Объект', p.objectName)
        .text('Ремонт', p.repairName)
        .num('Площадь', p.area, function (v) { return group(v) + ' м²'; })
        .num('Потолок', p.ceiling, mm);
      if (hasNumber(p.min) && hasNumber(p.max)) l.add('Ориентир по калькулятору', group(p.min) + ' – ' + rub(p.max));
      contact(l, p);
    },
    bundle: function (l, p) {
      l.text('Ремонт', p.repairName)
        .num('Площадь', p.area, function (v) { return group(v) + ' м²'; });
      var items = (p.furniture || []).filter(function (f) { return f && hasText(f.name); }).map(function (f) {
        return hasNumber(f.meters) ? f.name + ', ' + group(f.meters) + ' п.м.' : f.name;
      });
      if (items.length) l.add('Мебель', items.join('; '));
      l.num('Скидка на мебель', p.discountPct, function (v) { return group(v) + '%'; })
        .num('Экономия', p.savings, rub)
        .num('Итого ориентир', p.total, rub);
      contact(l, p);
    },
    kitchen: function (l, p) {
      l.text('Форма', p.shapeName);
      var walls = p.walls || {};
      var w = ['A', 'B', 'C'].filter(function (k) { return hasNumber(walls[k]); }).map(function (k) { return k + ' ' + mm(walls[k]); });
      if (w.length) l.add('Стены', w.join(', '));
      l.num('Потолок', p.ceiling, mm)
        .text('Стиль', p.styleName)
        .text('Цвет', p.colorName)
        .text('Фасады', p.materialName)
        .num('Погонных метров', p.runMeters, group)
        .num('Ориентир цены', p.price, rub);
      if (p.withRepair === true) l.add('', 'Нужен и ремонт');
      l.text('Проект', p.link);
      contact(l, p);
    },
    job: function (l, p) {
      l.text('Вакансия', p.position);
      contact(l, p);
      l.text('Опыт', p.experience);
    }
  };

  function buildMessage(kind, payload, cityName) {
    var k = Object.prototype.hasOwnProperty.call(HEAD, kind) ? kind : 'general';
    var p = payload && typeof payload === 'object' ? payload : {};
    var lines = new Lines();
    lines.add('', HEAD[k]);
    lines.text('Город', cityName);
    BODY[k](lines, p);
    return lines.list.join('\n');
  }

  function whatsappUrl(text) {
    return 'https://wa.me/' + data.phone.whatsapp + '?text=' + encodeURIComponent(String(text || ''));
  }

  function telUrl() {
    return 'tel:' + data.phone.tel;
  }

  // mm: числа для текста WhatsApp (обычный пробел); на странице числа форматирует VROVEN.format
  var lead = { buildMessage: buildMessage, whatsappUrl: whatsappUrl, telUrl: telUrl, mm: mm };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = lead;
  } else {
    root.VROVEN = root.VROVEN || {};
    root.VROVEN.lead = lead;
  }
})(typeof window !== 'undefined' ? window : this);
