/*
 * ВРОВЕНЬ: главная. Цены услуг по городу, комплект «ремонт + мебель»,
 * калькулятор ремонта, финальная заявка. Расчёты только через VROVEN.pricing.
 * Подключается после data.js, core.js, lead.js и pricing.js.
 */
(function (root, doc) {
  'use strict';

  var V = root.VROVEN || {};
  var data = V.data;
  var pricing = V.pricing;
  var BY_SURVEY = 'по смете после замера';

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function rub(n) { return V.format.rub(n); }
  function cityId() { return V.city.get(); }
  function cityName(id) { return data.cities[id || cityId()].name; }

  function el(tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function toNumber(v) {
    var n = Number(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }

  // метка «ориентировочно» внутри элемента (а не после него)
  function badgeInside(host, on) {
    var b = host.querySelector('.badge-placeholder');
    if (on && !b) {
      b = el('span', 'badge-placeholder', 'ориентировочно');
      host.appendChild(b);
    } else if (!on && b) {
      b.remove();
    }
  }

  /* ---------- радиогруппа из чипов ---------- */

  function chipGroup(box, items, current, onPick) {
    box.textContent = '';
    items.forEach(function (it) {
      var b = el('button', 'chip');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('data-value', it.id);
      b.appendChild(doc.createTextNode(it.name));
      if (it.note) b.appendChild(el('span', 'chip__note mono', it.note));
      box.appendChild(b);
    });
    function set(id, silent) {
      $$('[data-value]', box).forEach(function (b) {
        var on = b.getAttribute('data-value') === id;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      if (!silent) onPick(id);
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-value]');
      if (b) set(b.getAttribute('data-value'));
    });
    box.addEventListener('keydown', function (e) {
      var keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (keys.indexOf(e.key) < 0) return;
      var btns = $$('[data-value]', box);
      var i = btns.findIndex(function (b) { return b.getAttribute('aria-checked') === 'true'; });
      var step = (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 1;
      var next = btns[(i + step + btns.length) % btns.length];
      set(next.getAttribute('data-value'));
      next.focus();
      e.preventDefault();
    });
    set(current, true);
    return { set: set };
  }

  /* ---------- цены «от» по городу ---------- */

  function repairRate(city, typeId) {
    var r = data.repairPrices[city] && data.repairPrices[city].apartment[typeId];
    return r && r.value ? r : null;
  }

  function renderPrices() {
    var city = cityId();

    // «от» в первом блоке: самая низкая ставка квартиры в городе
    var from = null;
    data.repairTypes.forEach(function (t) {
      var r = repairRate(city, t.id);
      if (r && (!from || r.value < from.value)) from = r;
    });
    $$('[data-price="repair-from"]').forEach(function (n) {
      n.textContent = from ? 'от ' + rub(from.value) : BY_SURVEY;
      badgeInside(n.parentNode, !!(from && from.placeholder));
    });

    var kitchen = byId(data.furnitureItems, 'kitchen');
    var kp = kitchen && kitchen.perMeter;
    $$('[data-price="kitchen-from"]').forEach(function (n) {
      n.textContent = kp ? 'от ' + rub(kp.value) : BY_SURVEY;
      badgeInside(n.parentNode, !!(kp && kp.placeholder));
    });

    var pcts = Object.keys(data.bundleDiscount).map(function (k) { return data.bundleDiscount[k]; });
    $$('[data-price="bundle-max"]').forEach(function (n) { n.textContent = 'до ' + Math.max.apply(null, pcts) + '%'; });

    // карточки типов ремонта
    var box = $('[data-repair-types]');
    if (box) {
      box.textContent = '';
      data.repairTypes.forEach(function (t, i) {
        var card = el('article', 'repair-type card');
        var head = el('div', 'repair-type__head');
        head.appendChild(el('span', 'repair-type__num mono', '0' + (i + 1)));
        head.appendChild(el('h3', null, t.name));
        card.appendChild(head);
        var r = repairRate(city, t.id);
        var price = el('p', 'repair-type__price');
        if (r) {
          price.appendChild(el('span', 'repair-type__from', 'от ' + rub(r.value)));
          price.appendChild(el('span', 'repair-type__unit', ' за м²'));
          badgeInside(price, r.placeholder);
        } else {
          price.appendChild(el('span', 'repair-type__survey', BY_SURVEY));
        }
        card.appendChild(price);
        var ul = el('ul', 'repair-type__works');
        t.works.forEach(function (w) { ul.appendChild(el('li', null, w)); });
        card.appendChild(ul);
        var pct = data.bundleDiscount[t.id];
        if (pct) card.appendChild(el('p', 'repair-type__bonus', '−' + pct + '% на мебель при этом ремонте'));
        box.appendChild(card);
      });
    }

    // мебель
    $$('[data-furniture-price]').forEach(function (n) {
      var it = byId(data.furnitureItems, n.getAttribute('data-furniture-price'));
      var pm = it && it.perMeter;
      n.textContent = pm ? 'от ' + rub(pm.value) + ' за п.м.' + (pm.placeholder ? ' · ориентировочно' : '') : BY_SURVEY;
    });

    var mat = $('[data-materials]');
    if (mat) {
      mat.textContent = '';
      data.furnitureMaterials.slice().sort(function (a, b) {
        return (a.perMeter ? a.perMeter.value : Infinity) - (b.perMeter ? b.perMeter.value : Infinity);
      }).forEach(function (m) {
        var li = el('li', 'materials__item');
        li.appendChild(el('span', 'materials__name', m.name));
        li.appendChild(el('span', 'materials__price mono', m.perMeter ? 'от ' + rub(m.perMeter.value) : BY_SURVEY));
        mat.appendChild(li);
      });
      var anyPh = data.furnitureMaterials.some(function (m) { return m.perMeter && m.perMeter.placeholder; });
      badgeInside($('.materials__title'), anyPh);
    }
  }

  /* ---------- комплект ---------- */

  var DEFAULT_METERS = { kitchen: 3.6, wardrobe: 2.4, walkin: 4, hallway: 1.8, kids: 2.4 };

  function initBundle() {
    var root_ = $('[data-bundle]');
    if (!root_) return;
    var stage = $('[data-bundle-stage]', root_);
    var areaInput = $('[data-bundle-area]', root_);
    var areaError = $('[data-bundle-area-error]', root_);
    var itemsBox = $('[data-bundle-items]', root_);
    var leadLink = $('[data-bundle-lead]', root_);
    var out = {};
    $$('[data-bundle-out]', root_).forEach(function (n) { out[n.getAttribute('data-bundle-out')] = n; });
    var state = { repairType: 'capital' };

    var repairChips = chipGroup($('[data-bundle-repair]', root_), data.repairTypes.map(function (t) {
      return { id: t.id, name: t.name, note: '−' + data.bundleDiscount[t.id] + '%' };
    }), state.repairType, function (id) { state.repairType = id; update(); });

    data.furnitureItems.forEach(function (it) {
      var li = el('li', 'bundle-item');
      li.setAttribute('data-item', it.id);
      var label = el('label', 'bundle-item__check');
      var cb = el('input');
      cb.type = 'checkbox';
      cb.value = it.id;
      label.appendChild(cb);
      label.appendChild(el('span', 'bundle-item__name', it.name));
      li.appendChild(label);
      var unit = el('div', 'field__unit bundle-item__meters');
      unit.setAttribute('data-unit', 'п.м.');
      var m = el('input');
      m.type = 'text';
      m.inputMode = 'decimal';
      m.autocomplete = 'off';
      m.value = String(DEFAULT_METERS[it.id] || 2).replace('.', ',');
      m.disabled = true;
      m.setAttribute('aria-label', it.name + ', погонных метров');
      unit.appendChild(m);
      li.appendChild(unit);
      li.appendChild(el('span', 'bundle-item__price mono', it.perMeter ? '' : 'по смете'));
      itemsBox.appendChild(li);
      cb.addEventListener('change', function () {
        m.disabled = !cb.checked;
        li.classList.toggle('is-on', cb.checked);
        update();
      });
      m.addEventListener('input', update);
    });

    areaInput.addEventListener('input', update);

    function selected() {
      return $$('.bundle-item', itemsBox).filter(function (li) {
        return $('input[type=checkbox]', li).checked;
      }).map(function (li) {
        return { id: li.getAttribute('data-item'), meters: toNumber($('.bundle-item__meters input', li).value) };
      });
    }

    function update() {
      var city = cityId();
      var area = toNumber(areaInput.value);
      var areaOk = isFinite(area) && area >= pricing.AREA_MIN && area <= pricing.AREA_MAX;
      areaError.hidden = areaOk;
      areaInput.closest('.field').classList.toggle('is-invalid', !areaOk);
      if (!areaOk) areaError.textContent = areaInput.value.trim() === '' ? 'Укажите площадь, хотя бы примерно' : 'Площадь от 1 до 5000 м²';

      var furniture = selected();
      var r = pricing.bundle({ repairType: state.repairType, repairArea: area, city: city, furniture: furniture }, data);

      // ремонт
      if (!areaOk) out.repair.textContent = 'укажите площадь';
      else out.repair.textContent = r.repairTotal ? '≈ ' + rub(r.repairTotal) : BY_SURVEY;

      // мебель: цена каждой отмеченной позиции
      $$('.bundle-item', itemsBox).forEach(function (li) {
        var id = li.getAttribute('data-item');
        var priceEl = $('.bundle-item__price', li);
        var found = r.items.filter(function (x) { return x.id === id; })[0];
        var meta = byId(data.furnitureItems, id);
        if (found && found.price) priceEl.textContent = rub(found.price);
        else priceEl.textContent = meta.perMeter ? '' : 'по смете';
      });
      var hasFurniture = r.items.length > 0;
      if (!hasFurniture) out.furniture.textContent = 'ничего не отмечено';
      else if (r.furnitureTotal > 0) out.furniture.textContent = '≈ ' + rub(r.furnitureTotal) + (r.bySurvey ? ' + по смете' : '');
      else out.furniture.textContent = BY_SURVEY;

      // итог
      out.discount.textContent = r.discountPct + '%';
      out.savings.textContent = r.savings > 0 ? rub(r.savings) : '0 ₽';
      if (!hasFurniture) {
        out.hint.textContent = 'Отметьте мебель, и скидка ' + r.discountPct + '% ляжет на её стоимость';
      } else if (r.savings > 0 && r.bySurvey) {
        out.hint.textContent = 'Плюс ' + r.discountPct + '% от сметы на позиции «по смете»';
      } else if (r.savings > 0) {
        out.hint.textContent = 'Скидка ' + r.discountPct + '% на мебель за то, что ремонт тоже у нас';
      } else {
        out.hint.textContent = 'Скидка ' + r.discountPct + '% применится к смете на мебель после замера';
      }
      var totalKnown = areaOk && r.repairTotal && !r.bySurvey;
      out.total.textContent = totalKnown ? '≈ ' + rub(r.total) : (r.total > 0 && areaOk ? '≈ ' + rub(r.total) + ' + смета' : BY_SURVEY);
      badgeInside(out.total.parentNode, r.placeholder);

      // линия уровня: обе части выбраны, и карточки встают вровень
      var level = areaOk && !!state.repairType && hasFurniture;
      stage.classList.toggle('is-level', level);

      var repairType = byId(data.repairTypes, state.repairType);
      leadLink.setAttribute('data-lead-payload', JSON.stringify({
        repairName: repairType ? repairType.name : '',
        area: areaOk ? area : null,
        furniture: r.items.map(function (x) { return { name: x.name, meters: x.meters }; }),
        discountPct: hasFurniture ? r.discountPct : null,
        savings: r.savings,
        total: totalKnown ? r.total : null
      }));
      if (V.refreshLeads) V.refreshLeads();
    }

    doc.addEventListener('vroven:city', update);
    update();
    return repairChips;
  }

  /* ---------- калькулятор ремонта ---------- */

  function initCalc() {
    var form = $('[data-calc]');
    if (!form) return;
    var objectSel = $('[data-calc-object]', form);
    var area = $('#calc-area', form);
    var ceiling = $('#calc-ceiling', form);
    var range = $('[data-calc-out="range"]', form);
    var meta = $('[data-calc-out="meta"]', form);
    var works = $('[data-calc-works]', form);
    var leadLink = $('[data-calc-lead]', form);
    var state = { repairType: 'capital' };

    data.objectTypes.forEach(function (o) {
      var opt = el('option', null, o.name);
      opt.value = o.id;
      objectSel.appendChild(opt);
    });

    var cityChips = chipGroup($('[data-calc-city]', form), Object.keys(data.cities).map(function (id) {
      return { id: id, name: data.cities[id].name };
    }), cityId(), function (id) { V.city.set(id); });

    chipGroup($('[data-calc-type]', form), data.repairTypes, state.repairType, function (id) {
      state.repairType = id;
      update();
    });

    function showError(field, message) {
      $$('[data-calc-field]', form).forEach(function (f) {
        var on = f.getAttribute('data-calc-field') === field;
        f.classList.toggle('is-invalid', on);
        var err = $('[data-calc-error]', f);
        err.hidden = !on;
        if (on) err.textContent = message;
        $('input', f).setAttribute('aria-invalid', on ? 'true' : 'false');
      });
    }

    function update() {
      var city = cityId();
      var input = {
        city: city,
        objectType: objectSel.value,
        repairType: state.repairType,
        area: area.value,
        ceiling: ceiling.value
      };
      var r = pricing.repairEstimate(input, data);
      var type = byId(data.repairTypes, state.repairType);
      var object = byId(data.objectTypes, objectSel.value);
      works.textContent = type ? 'Входит: ' + type.works.map(function (w, i) { return i ? w.charAt(0).toLowerCase() + w.slice(1) : w; }).join(', ') : '';
      range.parentNode.classList.toggle('is-muted', !r.ok);

      if (r.ok) {
        showError(null);
        range.textContent = rub(r.min).replace(/\s₽$/, '') + ' – ' + rub(r.max);
        meta.textContent = 'Ставка ' + rub(r.perM2) + ' за м²' + (toNumber(ceiling.value) > pricing.HIGH_CEILING ? ', с учётом высокого потолка' : '');
      } else if (r.reason === 'noPrice') {
        showError(null);
        range.textContent = 'По смете после замера';
        meta.textContent = object && object.id !== 'apartment'
          ? 'Для коммерции считаем по смете: у каждого помещения свои требования.'
          : 'Для этого ремонта ' + data.cities[city].nameIn + ' пока считаем по смете.';
      } else {
        showError(r.reason, r.message);
        range.textContent = r.reason === 'area' ? 'Укажите площадь' : 'Проверьте высоту потолка';
        meta.textContent = r.message;
      }
      badgeInside(meta, !!(r.ok && r.placeholder));

      leadLink.setAttribute('data-lead-payload', JSON.stringify({
        objectName: object ? object.name : '',
        repairName: type ? type.name : '',
        area: toNumber(area.value) || null,
        ceiling: toNumber(ceiling.value) || null,
        min: r.ok ? r.min : null,
        max: r.ok ? r.max : null
      }));
      if (V.refreshLeads) V.refreshLeads();
    }

    objectSel.addEventListener('change', update);
    area.addEventListener('input', update);
    ceiling.addEventListener('input', update);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    doc.addEventListener('vroven:city', function (e) {
      cityChips.set(e.detail.id, true);
      update();
    });
    update();
  }

  /* ---------- финальная заявка ---------- */

  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  function initLeadForm() {
    var form = $('[data-lead-form]');
    if (!form) return;
    var citySel = $('[data-lead-city]', form);
    var phone = $('#lead-phone', form);
    var phoneField = $('[data-lead-field="phone"]', form);
    var err = $('[data-lead-error]', form);
    var done = $('[data-lead-done]', form);
    var fallback = $('[data-lead-fallback]', form);

    Object.keys(data.cities).forEach(function (id) {
      var opt = el('option', null, data.cities[id].name);
      opt.value = id;
      citySel.appendChild(opt);
    });
    citySel.value = cityId();
    doc.addEventListener('vroven:city', function (e) { citySel.value = e.detail.id; });
    citySel.addEventListener('change', function () { V.city.set(citySel.value); });

    function setPhoneError(msg) {
      phoneField.classList.toggle('is-invalid', !!msg);
      phone.setAttribute('aria-invalid', msg ? 'true' : 'false');
      err.hidden = !msg;
      err.textContent = msg || '';
    }
    phone.addEventListener('input', function () {
      if (!err.hidden && digits(phone.value).length >= 10) setPhoneError(null);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = digits(phone.value);
      if (!n) { setPhoneError('Оставьте телефон, чтобы мы могли перезвонить'); phone.focus(); return; }
      if (n.length < 10 || n.length > 12) { setPhoneError('Проверьте номер: нужно 10 или 11 цифр'); phone.focus(); return; }
      setPhoneError(null);
      var text = V.lead.buildMessage('general', {
        name: $('#lead-name', form).value,
        phone: phone.value.trim(),
        task: $('#lead-task', form).value
      }, cityName(citySel.value));
      var url = V.lead.whatsappUrl(text);
      fallback.href = url;
      done.hidden = false;
      // без 'noopener' в третьем аргументе: с ним open() всегда возвращает null
      var w = root.open(url, '_blank');
      if (w) { try { w.opener = null; } catch (er) { /* чужое окно */ } }
      else root.location.href = url;
    });
  }

  /* ---------- этапы: линия идёт по шагам при прокрутке ---------- */

  function initSteps() {
    var list = $('[data-steps]');
    if (!list) return;
    var steps = $$('.step', list);
    var reduce = root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in root)) {
      list.classList.add('is-in');
      steps.forEach(function (s) { s.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -15% 0px' });
    io.observe(list);
    steps.forEach(function (s) { io.observe(s); });
  }

  function init() {
    if (!data || !pricing || !V.city || !V.lead) return;
    renderPrices();
    doc.addEventListener('vroven:city', renderPrices);
    initBundle();
    initCalc();
    initLeadForm();
    initSteps();
  }

  // core.js стартует на DOMContentLoaded раньше нас (подключён выше)
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
