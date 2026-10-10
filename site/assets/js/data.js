/*
 * ВРОВЕНЬ: все факты сайта в одном месте.
 * Заказчик меняет цифры и тексты только здесь.
 * placeholder:true значит «ориентир рынка или заглушка, уточняется»:
 * интерфейс показывает рядом метку, пока флаг стоит.
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

  var data = {
    brand: { name: 'ВРОВЕНЬ', tagline: 'Ремонт и мебель вровень' },

    phone: {
      display: '+7 912 410 00 01',
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

    guarantees: {
      repairYears: { value: null, text: '[ГАРАНТИЯ НА РЕМОНТ – лет, уточняется]', placeholder: true },
      furnitureYears: { value: null, text: '[ГАРАНТИЯ НА МЕБЕЛЬ – лет, уточняется]', placeholder: true },
      penaltyPerDay: { value: null, text: '[НЕУСТОЙКА ЗА ДЕНЬ ПРОСРОЧКИ – уточняется]', placeholder: true },
      productionDays: { value: null, text: '[СРОК ПРОИЗВОДСТВА – рабочих дней, уточняется]', placeholder: true }
    },

    jobs: [
      {
        id: 'painter',
        title: 'Маляр',
        duties: 'Шпаклёвка, шлифовка и покраска стен и потолков на объектах',
        pay: { text: '[СТАВКА – уточняется]', placeholder: true },
        schedule: { text: '[ГРАФИК – уточняется]', placeholder: true },
        perks: [
          { text: '[ВЫПЛАТЫ: КАК ЧАСТО – уточняется]', placeholder: true },
          { text: '[ИНСТРУМЕНТ И СПЕЦОДЕЖДА – уточняется]', placeholder: true },
          { text: '[ЖИЛЬЁ И ПРОЕЗД – уточняется]', placeholder: true }
        ],
        requirements: [{ text: '[ОПЫТ И ДОКУМЕНТЫ – уточняется]', placeholder: true }]
      },
      {
        id: 'tiler',
        title: 'Плиточник',
        duties: 'Укладка плитки и керамогранита в санузлах, на кухнях и полах',
        pay: { text: '[СТАВКА – уточняется]', placeholder: true },
        schedule: { text: '[ГРАФИК – уточняется]', placeholder: true },
        perks: [
          { text: '[ВЫПЛАТЫ: КАК ЧАСТО – уточняется]', placeholder: true },
          { text: '[ИНСТРУМЕНТ И СПЕЦОДЕЖДА – уточняется]', placeholder: true },
          { text: '[ЖИЛЬЁ И ПРОЕЗД – уточняется]', placeholder: true }
        ],
        requirements: [{ text: '[ОПЫТ И ДОКУМЕНТЫ – уточняется]', placeholder: true }]
      },
      {
        id: 'laborer',
        title: 'Разнорабочий',
        duties: 'Демонтаж, подноска материалов, уборка и помощь мастерам на объекте',
        pay: { text: '[СТАВКА – уточняется]', placeholder: true },
        schedule: { text: '[ГРАФИК – уточняется]', placeholder: true },
        perks: [
          { text: '[ВЫПЛАТЫ: КАК ЧАСТО – уточняется]', placeholder: true },
          { text: '[СПЕЦОДЕЖДА – уточняется]', placeholder: true },
          { text: '[ЖИЛЬЁ И ПРОЕЗД – уточняется]', placeholder: true }
        ],
        requirements: [{ text: '[ТРЕБОВАНИЯ – уточняется]', placeholder: true }]
      }
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
