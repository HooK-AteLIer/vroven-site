/*
 * ВРОВЕНЬ: все факты сайта в одном месте.
 * Заказчик меняет цифры и тексты только здесь.
 * placeholder:true значит «ориентир рынка или заглушка»:
 * интерфейс показывает рядом метку «ориентировочно», пока флаг стоит.
 * Цены: ₽ за м² (ремонт, только работы) и ₽ за погонный метр (мебель).
 * Источник каждой цены: docs/research.md §5.
 */
(function (root) {
  'use strict';

  function price(value, source) {
    return { value: value, source: source, placeholder: true };
  }

  var SRC = {
    kaskad: 'https://kaskad72.ru/price',
    remontoff: 'https://remontoff72.ru/',
    proffRemont: 'https://nizhnevartovsk.proff-remont.ru/kapitalnyj_remont/',
    exclusiveDesign: 'https://xn----7sbeobbvkoce8b2a.xn--p1ai/kuxni-na-zakaz-tyumen-ceny/',
    mebellin: 'https://tumen.mebellin.com/kitchen'
  };

  // Коммерция: подробных прайсов по нашим городам нет, считаем по смете после замера.
  function commercialBySurvey() {
    return { office: null, shop: null, cafe: null, salon: null };
  }

  var PHONE_DISPLAY = '+7 912 410 00 01';

  function job(id, title, duties) {
    return {
      id: id,
      title: title,
      duties: duties,
      pay: { text: 'Условия обсуждаем по телефону ' + PHONE_DISPLAY, placeholder: false },
      schedule: { text: 'Обсуждаем по телефону', placeholder: false },
      perks: [],
      requirements: []
    };
  }

  var data = {
    brand: { name: 'ВРОВЕНЬ', tagline: 'Ремонт и мебель вровень' },

    phone: {
      display: PHONE_DISPLAY,
      tel: '+79124100001',
      whatsapp: '79124100001',
      whatsappConfirmed: false // есть ли WhatsApp на номере, подтвердит заказчик
    },

    cities: {
      tyumen: {
        id: 'tyumen',
        name: 'Тюмень',
        nameIn: 'в Тюмени',
        office: { text: '[АДРЕС ОФИСА – уточняется]', placeholder: true },
        workshop: { text: '[АДРЕС ЦЕХА – уточняется]', placeholder: true }
      },
      nizhnevartovsk: {
        id: 'nizhnevartovsk',
        name: 'Нижневартовск',
        nameIn: 'в Нижневартовске',
        office: { text: '[АДРЕС ОФИСА – уточняется]', placeholder: true },
        workshop: { text: '[АДРЕС ЦЕХА – уточняется]', placeholder: true }
      }
    },

    defaultCity: 'tyumen',

    // null = «по смете после замера»
    repairPrices: {
      tyumen: {
        apartment: {
          cosmetic: price(8900, SRC.remontoff),
          capital: price(14000, SRC.kaskad),
          design: price(16000, SRC.kaskad)
        },
        commercial: commercialBySurvey()
      },
      nizhnevartovsk: {
        apartment: {
          cosmetic: null,
          capital: price(8900, SRC.proffRemont),
          design: null
        },
        commercial: commercialBySurvey()
      }
    },

    repairTypes: [
      {
        id: 'cosmetic',
        name: 'Косметический',
        works: ['Шпаклёвка и покраска стен', 'Обои', 'Потолки', 'Напольные покрытия', 'Замена дверей, розеток и выключателей']
      },
      {
        id: 'capital',
        name: 'Капитальный',
        works: ['Демонтаж', 'Электрика и сантехника с заменой труб', 'Выравнивание стен и пола', 'Плитка в санузле и на кухне', 'Чистовая отделка']
      },
      {
        id: 'design',
        name: 'Дизайнерский',
        works: ['Дизайн-проект и визуализация', 'Перепланировка по проекту', 'Сложные потолки и подсветка', 'Отделка по проекту', 'Авторский надзор']
      }
    ],

    objectTypes: [
      { id: 'apartment', name: 'Квартира' },
      { id: 'office', name: 'Офис' },
      { id: 'shop', name: 'Магазин' },
      { id: 'cafe', name: 'Кафе, ресторан' },
      { id: 'salon', name: 'Салон, студия' }
    ],

    // % скидки на мебель при заказе ремонта
    bundleDiscount: { cosmetic: 5, capital: 10, design: 15 },

    kitchenOffer: 'При заказе кухни замер и проект ремонта бесплатно',

    // ₽ за погонный метр кухни, нижняя граница по Тюмени; по Нижневартовску отдельного разбивочного прайса нет
    furnitureMaterials: [
      { id: 'ldsp', name: 'ЛДСП', perMeter: price(10000, SRC.exclusiveDesign) },
      { id: 'mdf-film', name: 'МДФ в плёнке', perMeter: price(25000, SRC.exclusiveDesign) },
      { id: 'acrylic', name: 'Акрил', perMeter: price(50000, SRC.exclusiveDesign) },
      { id: 'enamel', name: 'МДФ эмаль', perMeter: price(40000, SRC.exclusiveDesign) },
      { id: 'veneer', name: 'Шпон', perMeter: price(70000, SRC.exclusiveDesign) }
    ],

    // perMeter: ориентир ₽ за п.м. или null (цен в наших городах не нашли)
    furnitureItems: [
      { id: 'kitchen', name: 'Кухня', perMeter: price(27200, SRC.mebellin) },
      { id: 'wardrobe', name: 'Шкаф-купе', perMeter: null },
      { id: 'walkin', name: 'Гардеробная', perMeter: null },
      { id: 'hallway', name: 'Прихожая', perMeter: null },
      { id: 'kids', name: 'Детская', perMeter: null }
    ],

    // Гарантии и сроки по практике фирм из исследования (решение заказчика 2026-10-11, G01):
    // ремонт 2 года (Профф-Ремонт: 24 мес.; c-b-c: до 5 лет), корпус мебели 3 года (Любимая кухня),
    // фурнитура Blum/Hettich по гарантии производителя, неустойка 1 000 ₽ в день (c-b-c),
    // производство мебели 20 рабочих дней (рынок 14–25). Источники: docs/research.md.
    guarantees: {
      repairYears: { value: 2, text: '2 года', placeholder: false },
      furnitureYears: { value: 3, text: '3 года на корпус, фурнитура по гарантии производителя', placeholder: false },
      penaltyPerDay: { value: 1000, text: '1 000 ₽ в день', placeholder: false },
      productionDays: { value: 20, text: '20 рабочих дней', placeholder: false }
    },

    // Условия вакансий заказчик обсуждает по телефону (решение 2026-10-11, G02).
    jobs: [
      job('painter', 'Маляр', 'Шпаклёвка, шлифовка и покраска стен и потолков на объектах'),
      job('tiler', 'Плиточник', 'Укладка плитки и керамогранита в санузлах, на кухнях и полах'),
      job('laborer', 'Разнорабочий', 'Демонтаж, подноска материалов, уборка и помощь мастерам на объекте')
    ],

    social: { telegram: null }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = data;
  } else {
    root.VROVEN = root.VROVEN || {};
    root.VROVEN.data = data;
  }
})(typeof window !== 'undefined' ? window : this);
