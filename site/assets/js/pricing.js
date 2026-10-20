/*
 * НА УРОВНЕ: расчёты цен. Чистый модуль, без DOM.
 * Все ставки приходят из data.js (второй аргумент), здесь только арифметика.
 *
 *   repairEstimate({ city, objectType, repairType, area, ceiling }, data)
 *     → { ok:true, min, max, perM2, placeholder } | { ok:false, reason:'area'|'ceiling'|'noPrice', message }
 *     Вилка ±15%. Потолок > 3000 мм: +10% к ставке. Площадь от 1 до 5000 м².
 *   bundle({ repairType, repairArea, city, furniture:[{ id, meters }] }, data)
 *     → { repairTotal, furnitureTotal, discountPct, savings, total, placeholder, bySurvey, items }
 *     repairTotal = null, если ставки ремонта нет; мебель без ставки идёт «по смете» (bySurvey).
 *   kitchenEstimate({ runMeters, materialId, city, withRepair, repairType }, data)
 *     → { price, discountPct, priceWithDiscount, placeholder }; price = null, если считать не из чего.
 */
(function (root) {
  'use strict';

  var SPREAD = 0.15;
  var HIGH_CEILING = 3000;
  var HIGH_CEILING_MARKUP = 0.10;
  var AREA_MIN = 1;
  var AREA_MAX = 5000;
  var CEILING_MIN = 2000;
  var CEILING_MAX = 6000;
  var METERS_MAX = 100;

  // «12,5», 12.5, ' 40 ' → число; пусто и мусор → NaN
  function toNumber(v) {
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') return NaN;
    var s = v.trim().replace(/\s/g, '').replace(',', '.');
    return s === '' ? NaN : Number(s);
  }

  function isEmpty(v) {
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  }

  function own(obj, key) {
    return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
  }

  // Ставка бывает { value } или по городу { tyumen: { value } }; null = нет ставки.
  function rateValue(rate, city) {
    if (!rate) return null;
    if (typeof rate.value === 'number' && isFinite(rate.value) && rate.value > 0) return rate;
    if (city && own(rate, city)) return rateValue(rate[city], null);
    return null;
  }

  function repairRate(data, city, objectType, repairType) {
    var byCity = data && data.repairPrices && data.repairPrices[city];
    if (!byCity) return null;
    if (!objectType || objectType === 'apartment') {
      return rateValue(byCity.apartment && byCity.apartment[repairType], null);
    }
    var com = byCity.commercial && byCity.commercial[objectType];
    if (!com) return null;
    // общая ставка для объекта или своя по типу ремонта
    return rateValue(com, null) || rateValue(com[repairType], null);
  }

  function discountFor(data, repairType) {
    var d = data && data.bundleDiscount;
    var pct = d && own(d, repairType) ? Number(d[repairType]) : 0;
    return isFinite(pct) && pct > 0 ? pct : 0;
  }

  function fail(reason, message) {
    return { ok: false, reason: reason, message: message };
  }

  function repairEstimate(input, data) {
    var p = input || {};
    var area = toNumber(p.area);
    if (isEmpty(p.area)) return fail('area', 'Укажите площадь в м²');
    if (!isFinite(area)) return fail('area', 'Площадь числом, в м²');
    if (area < AREA_MIN) return fail('area', 'Площадь от 1 м²');
    if (area > AREA_MAX) return fail('area', 'Больше 5000 м² посчитаем по смете после замера');

    var ceiling = toNumber(p.ceiling);
    if (!isEmpty(p.ceiling) && (!isFinite(ceiling) || ceiling < CEILING_MIN || ceiling > CEILING_MAX)) {
      return fail('ceiling', 'Высота потолка в мм, от 2000 до 6000');
    }

    var rate = repairRate(data, p.city, p.objectType, p.repairType);
    if (!rate) return fail('noPrice', 'По смете после замера');

    var perM2 = rate.value * (ceiling > HIGH_CEILING ? 1 + HIGH_CEILING_MARKUP : 1);
    perM2 = Math.round(perM2);
    var base = perM2 * area;
    return {
      ok: true,
      min: Math.round(base * (1 - SPREAD) / 100) * 100, // вилка круглая: до сотни рублей
      max: Math.round(base * (1 + SPREAD) / 100) * 100,
      perM2: perM2,
      placeholder: !!rate.placeholder
    };
  }

  function findById(list, id) {
    if (!list) return null;
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
    return null;
  }

  function bundle(input, data) {
    var p = input || {};
    var placeholder = false;
    var bySurvey = false;

    var repairTotal = null;
    var area = toNumber(p.repairArea);
    var rate = repairRate(data, p.city, 'apartment', p.repairType);
    if (rate && isFinite(area) && area >= AREA_MIN && area <= AREA_MAX) {
      repairTotal = Math.round(rate.value * area);
      placeholder = placeholder || !!rate.placeholder;
    }

    var items = [];
    var furnitureTotal = 0;
    (p.furniture || []).forEach(function (f) {
      if (!f) return;
      var meta = findById(data && data.furnitureItems, f.id);
      var meters = toNumber(f.meters);
      if (!meta || !isFinite(meters) || meters <= 0 || meters > METERS_MAX) return;
      var r = rateValue(meta.perMeter, p.city);
      var price = r ? Math.round(r.value * meters) : null;
      if (r) {
        furnitureTotal += price;
        placeholder = placeholder || !!r.placeholder;
      } else {
        bySurvey = true;
      }
      items.push({ id: meta.id, name: meta.name, meters: meters, price: price });
    });

    var discountPct = discountFor(data, p.repairType);
    var savings = Math.round(furnitureTotal * discountPct / 100);
    return {
      repairTotal: repairTotal,
      furnitureTotal: furnitureTotal,
      discountPct: discountPct,
      savings: savings,
      total: (repairTotal || 0) + furnitureTotal - savings,
      placeholder: placeholder,
      bySurvey: bySurvey,
      items: items
    };
  }

  function minDiscount(data) {
    var d = (data && data.bundleDiscount) || {};
    var vals = Object.keys(d).map(function (k) { return Number(d[k]); }).filter(function (n) { return isFinite(n) && n > 0; });
    return vals.length ? Math.min.apply(null, vals) : 0;
  }

  function kitchenEstimate(input, data) {
    var p = input || {};
    var meta = findById(data && data.furnitureMaterials, p.materialId);
    var rate = meta ? rateValue(meta.perMeter, p.city) : null;
    var meters = toNumber(p.runMeters);
    var discountPct = 0;
    if (p.withRepair === true) {
      discountPct = discountFor(data, p.repairType) || minDiscount(data);
    }
    if (!rate || !isFinite(meters) || meters <= 0) {
      return { price: null, discountPct: discountPct, priceWithDiscount: null, placeholder: !!(rate && rate.placeholder) };
    }
    var price = Math.round(rate.value * meters);
    return {
      price: price,
      discountPct: discountPct,
      priceWithDiscount: Math.round(price * (100 - discountPct) / 100),
      placeholder: !!rate.placeholder
    };
  }

  var pricing = {
    repairEstimate: repairEstimate,
    bundle: bundle,
    kitchenEstimate: kitchenEstimate,
    HIGH_CEILING: HIGH_CEILING,
    AREA_MIN: AREA_MIN,
    AREA_MAX: AREA_MAX
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = pricing;
  } else {
    root.VROVEN = root.VROVEN || {};
    root.VROVEN.pricing = pricing;
  }
})(typeof window !== 'undefined' ? window : this);
