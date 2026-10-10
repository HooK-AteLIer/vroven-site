/*
 * ВРОВЕНЬ: стили кухонь для конструктора. Только данные, без DOM.
 * Признаки взяты из docs/research.md §4, цвета сверены с кадрами лукбука.
 *
 * Поля контракта: id, name, blurb, facade, handle, cornice, patina, glassUppers,
 * openShelves, colors[{ id, name, facade, accent, counter }].
 * Сверх контракта (их читает только kitchen-render.js):
 *   colors[].lower   — цвет нижнего ряда, если кухня двухцветная
 *   colors[].tall    — цвет пенала (пастельная деталь скандинавского стиля)
 *   colors[].wall    — цвет стены и фартука на чертеже
 *   lowerFacade      — фасад нижнего ряда, если отличается
 *   hood             — вид вытяжки: mantle | box | integrated | glass | pyramid | chimney | plaster
 *   apron            — фартук: stone | marble | plain | glass | brick | subway | terracotta
 *   topDrawer        — над дверцами нижних шкафов узкий ящик
 *   led              — подсветка под верхними шкафами
 *   toCeiling        — антресоли до потолка
 *   farmSink         — мойка с фартуком (керамическая)
 *   knobRing         — ручка-кнопка с кольцом
 *   gas              — газовая варочная (решётки на чертеже)
 *   patinaColor      — цвет патины, если не латунь стиля
 *   plinth           — цвет цоколя: facade | wood | steel | dark
 */
(function (root) {
  'use strict';

  var kitchenStyles = [
    {
      id: 'classic',
      name: 'Классика',
      blurb: 'Филёнчатые фасады с патиной, арочные витрины, карниз и бронзовые ракушки.',
      facade: 'raised-panel', handle: 'shell',
      cornice: true, patina: true, glassUppers: true, openShelves: false,
      hood: 'mantle', apron: 'stone', topDrawer: true, gas: true, plinth: 'facade',
      colors: [
        { id: 'ivory', name: 'Слоновая кость', facade: '#E9DFC8', accent: '#A07C3E', counter: '#D8CDB8', wall: '#F1ECE3' },
        { id: 'white-gold', name: 'Белый с золотом', facade: '#F3EFE6', accent: '#BC9A45', counter: '#CEC6B8', wall: '#ECE6DC' },
        { id: 'walnut', name: 'Орех', facade: '#6E4D35', accent: '#C29A55', counter: '#E3D9C7', wall: '#EFE7DA' }
      ]
    },
    {
      id: 'neoclassic',
      name: 'Неоклассика',
      blurb: 'Рамочный фасад с узкой рамкой, эмаль приглушённого цвета, латунные ручки, мрамор.',
      facade: 'shaker', handle: 'brass-bar',
      cornice: true, patina: false, glassUppers: false, openShelves: false,
      hood: 'box', apron: 'marble', topDrawer: true, gas: true, plinth: 'facade',
      colors: [
        { id: 'sage', name: 'Шалфей', facade: '#9AA491', accent: '#B8995A', counter: '#EEEAE3', wall: '#EFEBE4' },
        { id: 'blue-grey', name: 'Серо-голубой', facade: '#8E9EA8', accent: '#B8995A', counter: '#EFEDE8', wall: '#EEEBE6' },
        { id: 'warm-grey', name: 'Тёплый серый', facade: '#B7AEA2', accent: '#A8834F', counter: '#F1EDE6', wall: '#F0EBE3' }
      ]
    },
    {
      id: 'modern',
      name: 'Модерн',
      blurb: 'Гладкие фасады, светлый верх и древесный низ, длинные ручки-рейлинги, подсветка.',
      facade: 'flat-matte', lowerFacade: 'wood-grain', handle: 'rail',
      cornice: false, patina: false, glassUppers: false, openShelves: false,
      hood: 'integrated', apron: 'plain', led: true, plinth: 'dark',
      colors: [
        { id: 'sand-oak', name: 'Песок и дуб', facade: '#D9CEBD', lower: '#C59D6F', accent: '#A69C8C', counter: '#F2EFE9', wall: '#F0EAE0' },
        { id: 'green-oak', name: 'Олива и дуб', facade: '#8F9C83', lower: '#BF9466', accent: '#9E9587', counter: '#EEEBE4', wall: '#EFEAE2' },
        { id: 'grey-graphite', name: 'Светло-серый и тёмный дуб', facade: '#D3D2CD', lower: '#5A4A3C', accent: '#9A9893', counter: '#ECEBE7', wall: '#EFEDE9' }
      ]
    },
    {
      id: 'minimal',
      name: 'Минимализм',
      blurb: 'Плоские фасады без ручек на профиле Gola, монохром, шкафы до потолка.',
      facade: 'flat-matte', handle: 'gola',
      cornice: false, patina: false, glassUppers: false, openShelves: false,
      hood: 'integrated', apron: 'plain', toCeiling: true, plinth: 'facade',
      colors: [
        { id: 'light-grey', name: 'Светло-серый', facade: '#CFCCC6', accent: '#8C8983', counter: '#ECEAE6', wall: '#F2F1EE' },
        { id: 'white', name: 'Белый', facade: '#EFEEEA', accent: '#A9A7A2', counter: '#E2E0DB', wall: '#F4F3F0' },
        { id: 'black', name: 'Чёрный мат', facade: '#34332F', accent: '#1F1E1C', counter: '#8A8780', wall: '#EDEBE7' }
      ]
    },
    {
      id: 'hitech',
      name: 'Хай-тек',
      blurb: 'Глухие глянцевые фасады без ручек, контраст глянца и мата, металл, стекло и подсветка.',
      facade: 'flat-gloss', handle: 'none',
      cornice: false, patina: false, glassUppers: false, openShelves: false,
      hood: 'glass', apron: 'glass', led: true, plinth: 'steel',
      colors: [
        { id: 'white-graphite', name: 'Белый глянец и графит', facade: '#F4F5F6', lower: '#3B3E43', tall: '#3B3E43', accent: '#C3C8CF', counter: '#ECECEC', wall: '#E9EAEC' },
        { id: 'navy', name: 'Тёмно-синий', facade: '#EEF0F3', lower: '#1F2B45', tall: '#1F2B45', accent: '#C3C8CF', counter: '#F0F0F0', wall: '#E7E9ED' },
        { id: 'graphite', name: 'Графит', facade: '#45484D', accent: '#B9BEC6', counter: '#E8E8E8', wall: '#E5E6E8' }
      ]
    },
    {
      id: 'loft',
      name: 'Лофт',
      blurb: 'Фасады с выраженной текстурой дерева или под бетон, открытые полки на чёрных кронштейнах, кирпич.',
      facade: 'wood-grain', handle: 'black-bar',
      cornice: false, patina: false, glassUppers: false, openShelves: true,
      hood: 'pyramid', apron: 'brick', gas: true, plinth: 'dark',
      colors: [
        { id: 'dark-oak', name: 'Тёмный дуб', facade: '#5E4837', accent: '#1C1B1A', counter: '#8A6544', wall: '#A86450' },
        { id: 'concrete-oak', name: 'Бетон и дуб', facade: '#9B978F', lower: '#5E4837', accent: '#1C1B1A', counter: '#8A6544', wall: '#A86450' },
        { id: 'graphite-wood', name: 'Графит и дерево', facade: '#3E3D3A', accent: '#141414', counter: '#9C7650', wall: '#9E5F4D' }
      ]
    },
    {
      id: 'scandi',
      name: 'Скандинавский',
      blurb: 'Белые гладкие фасады, светлое дерево, одна пастельная деталь, открытые полки и плитка «кабанчик».',
      facade: 'flat-matte', handle: 'knob',
      cornice: false, patina: false, glassUppers: false, openShelves: true,
      hood: 'chimney', apron: 'subway', plinth: 'wood',
      colors: [
        { id: 'white-blue', name: 'Белый и голубой', facade: '#F3F1EC', tall: '#A8BDCC', accent: '#C9A877', counter: '#D9BC90', wall: '#F6F4EF' },
        { id: 'white-sage', name: 'Белый и шалфей', facade: '#F3F1EC', tall: '#A9B89F', accent: '#C9A877', counter: '#D9BC90', wall: '#F6F4EF' },
        { id: 'white-rose', name: 'Белый и пудра', facade: '#F3F1EC', tall: '#DDBBB0', accent: '#C9A877', counter: '#D9BC90', wall: '#F6F4EF' }
      ]
    },
    {
      id: 'provence',
      name: 'Прованс',
      blurb: 'Рамочные фасады с вагонкой, выбеленная патина, витрины с решёткой, полки для посуды, кованые ручки.',
      facade: 'beadboard', handle: 'knob',
      cornice: true, patina: true, glassUppers: true, openShelves: true,
      hood: 'plaster', apron: 'terracotta', topDrawer: true, farmSink: true, knobRing: true, gas: true,
      patinaColor: '#FBF8F1', plinth: 'facade',
      colors: [
        { id: 'lavender', name: 'Лаванда', facade: '#A9A9C9', accent: '#3B3633', counter: '#E3D8C3', wall: '#F3EBDD' },
        { id: 'mint', name: 'Мята', facade: '#B3CDBF', accent: '#3B3633', counter: '#E3D8C3', wall: '#F3EBDD' },
        { id: 'milk', name: 'Молочный', facade: '#EEE6D4', accent: '#3B3633', counter: '#D9CBB2', wall: '#F2EADC' }
      ]
    }
  ];

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = kitchenStyles;
  } else {
    root.VROVEN = root.VROVEN || {};
    root.VROVEN.kitchenStyles = kitchenStyles;
  }
})(typeof window !== 'undefined' ? window : this);
