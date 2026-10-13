# Интерфейсы и правила проекта

Читается каждым исполнителем первым делом.

## Правила проекта

- Сайт живёт в `site/` и уходит в интернет целиком. Сырьё, тесты, бренд и документы лежат вне его: `media-raw/`, `tests/`, `brand/`, `docs/`.
- Чистый HTML, CSS и JS. Без npm, сборщиков, фреймворков и CDN-скриптов. Шрифты — только Google Fonts.
- Классические `<script defer>`, общее пространство имён `window.VROVEN`. Порядок подключения на каждой странице: `data.js`, затем `core.js`, затем модули страницы.
- Чистые модули (`pricing.js`, `kitchen-layout.js`, `lead.js`) не трогают DOM и в конце экспортируют себя: `if (typeof module !== 'undefined') module.exports = X;`. Вне Node они вешаются на `window.VROVEN.X`.
- Имена в коде на английском. Тексты сайта на русском, без длинного тире (—) и стоп-слов (leverage, seamless, «решения под ключ для вашего бизнеса» и прочий канцелярит). В тексте сайта используется короткое тире или запятая.
- Любой факт о компании, которого нет в `data.js`, не выдумывается. Заглушка выглядит как `[АДРЕС — уточняется]` и видна на странице.
- Размеры в конструкторе везде в миллиметрах, целыми числами.
- Мобильная ширина от 360 px без горизонтального скролла. `prefers-reduced-motion` гасит анимации до конечного состояния.
- Проверка: `node --test` из корня проекта (папку не передавать: Node 24 не принимает путь к папке). Один файл: `node --test tests/<имя>.test.js`. Предпросмотр: `python -m http.server 8130 --directory site`.

## Границы, решённые в спецификации

### `site/assets/js/data.js` — все факты (владелец: T01)
Объявляет `window.VROVEN.data`:
```js
{
  brand: { name: 'ВРОВЕНЬ', tagline: 'Ремонт и мебель вровень' },
  phone: { display: '+7 912 410 00 01', tel: '+79124100001', whatsapp: '79124100001', whatsappConfirmed: false },
  cities: {
    tyumen:   { id:'tyumen', name:'Тюмень', nameIn:'в Тюмени', office: {text:'[АДРЕС ОФИСА — уточняется]', placeholder:true}, workshop: {...} },
    nizhnevartovsk: { id:'nizhnevartovsk', name:'Нижневартовск', nameIn:'в Нижневартовске', ... }
  },
  defaultCity: 'tyumen',
  repairPrices: {           // ₽ за м², только работы; по городу; null = «по смете»
    tyumen: { apartment: { cosmetic:{value, source, placeholder:true}, capital:{...}, design:{...} }, commercial: { office:{...}|null, shop, cafe, salon } },
    nizhnevartovsk: { ... }
  },
  repairTypes: [{ id:'cosmetic', name:'Косметический', works:[...] }, { id:'capital', ... }, { id:'design', ... }],
  objectTypes: [{ id:'apartment', name:'Квартира' }, { id:'office', name:'Офис' }, { id:'shop', name:'Магазин' }, { id:'cafe', name:'Кафе, ресторан' }, { id:'salon', name:'Салон, студия' }],
  bundleDiscount: { cosmetic: 5, capital: 10, design: 15 },   // % на мебель при заказе ремонта
  kitchenOffer: 'При заказе кухни замер и проект ремонта бесплатно',
  furnitureMaterials: [{ id:'ldsp', name:'ЛДСП', perMeter:{value, source, placeholder:true} }, { id:'mdf-film', ... }, { id:'acrylic', ... }, { id:'enamel', ... }, { id:'veneer', ... }],  // ₽ за погонный метр, по городу если различается
  furnitureItems: [{ id:'kitchen', name:'Кухня' }, { id:'wardrobe', name:'Шкаф-купе' }, { id:'walkin', name:'Гардеробная' }, { id:'hallway', name:'Прихожая' }, { id:'kids', name:'Детская' }],  // с ориентиром цены за п.м. или null
  guarantees: { repairYears:{value:null, text:'[ГАРАНТИЯ НА РЕМОНТ — лет]', placeholder:true }, furnitureYears:{...}, penaltyPerDay:{...}, productionDays:{...} },
  jobs: [{ id:'painter', title:'Маляр', pay:{text:'[СТАВКА — уточняется]', placeholder:true}, schedule:{...}, perks:[...], requirements:[...] }, { id:'tiler', title:'Плиточник', ... }, { id:'laborer', title:'Разнорабочий', ... }],
  social: { telegram: null }
}
```

### `site/assets/js/core.js` — общее для всех страниц (владелец: T01)
- `VROVEN.city.get(): string`, `VROVEN.city.set(id)` — хранится в localStorage `vroven.city`; при смене рассылает событие `document` → `vroven:city` с `detail.id`. Все элементы `[data-city-text="office"]` и подобные перерисовываются.
- `VROVEN.format.rub(n): string` → «1 250 000 ₽»; `VROVEN.format.mm(n)` → «2 400 мм».
- `VROVEN.placeholderBadge(el, isPlaceholder)` — ставит или снимает метку «ориентир, уточняется».
- Общая шапка и подвал размечены прямо в HTML каждой страницы (одинаковые блоки `<header class="site-header">` и `<footer class="site-footer">`); `core.js` вешает переключатель города, мобильное меню и активный пункт навигации.
- Призыв к заявке: `<a data-lead="general">` — `core.js` подставляет ссылку WhatsApp через `VROVEN.lead`.

### `site/assets/js/lead.js` — текст и ссылки заявки (владелец: T01, чистый)
- `buildMessage(kind, payload, cityName): string`, где `kind` — `'general' | 'repair' | 'bundle' | 'kitchen' | 'job'`. Многострочный русский текст, без пустых полей.
- `whatsappUrl(text): string` → `https://wa.me/79124100001?text=<encodeURIComponent>`.
- `telUrl(): string` → `tel:+79124100001`.

### `site/assets/js/pricing.js` — расчёты (владелец: T03, чистый)
- `repairEstimate({ city, objectType, repairType, area, ceiling }, data)` → `{ ok:true, min, max, perM2, placeholder } | { ok:false, reason:'area'|'ceiling'|'noPrice', message }`. Вилка ±15%. Потолок > 3000 мм даёт +10% к ставке. Площадь допустима от 1 до 5000 м².
- `bundle({ repairType, repairArea, city, furniture:[{ id, meters }] }, data)` → `{ repairTotal, furnitureTotal, discountPct, savings, total, placeholder }`.
- `kitchenEstimate({ runMeters, materialId, city, withRepair, repairType }, data)` → `{ price, discountPct, priceWithDiscount, placeholder }`.

### `site/assets/js/kitchen-layout.js` — раскладка (владелец: T03, чистый)
Вход:
```js
{ shape:'straight'|'corner'|'u'|'island',
  walls:{ A:mm, B?:mm, C?:mm }, ceiling:mm,
  window?:{ wall:'A'|'B'|'C', offset:mm, width:mm, sill:mm },
  door?:{ wall, offset, width },
  sink?:{ wall, offset }, stove?:{ wall, offset },
  island?:{ length:mm, depth:mm },
  options?:{ tallUnit:boolean, upperHeight:720|920 } }
```
Выход: `{ ok:true, walls:[{ id:'A', length, lower:[Module], upper:[Module], fillers:[{x,width}] }], island?, runMeters, warnings:[string] }` или `{ ok:false, errors:[{ field, message }] }`.
`Module = { x:mm, width:mm, kind:'base'|'drawers'|'sink'|'stove'|'dishwasher'|'corner'|'tall'|'upper'|'upper-corner'|'hood'|'open-shelf', doors:1|2|0, drawers?:3 }`.
Константы экспортируются: `PLINTH=100, BASE_H=720, TOP=38, UPPER_H=720, BASE_D=560, UPPER_D=300, UPPER_GAP=600, WIDTHS=[150,200,300,400,450,500,600,800,900]`.
Окно: над и под окном верхних шкафов нет. Дверной проём: модулей нет вовсе. Ошибки на русском, в `message`.

### `site/assets/js/kitchen-styles.js` — стили (владелец: T05)
`VROVEN.kitchenStyles = [{ id, name, blurb, facade:'raised-panel'|'shaker'|'flat-matte'|'flat-gloss'|'wood-grain'|'beadboard', handle:'shell'|'brass-bar'|'rail'|'gola'|'none'|'black-bar'|'knob', cornice:boolean, patina:boolean, glassUppers:boolean, openShelves:boolean, colors:[{ id, name, facade:'#hex', accent:'#hex', counter:'#hex' }] }]` — 8 стилей: `classic, neoclassic, modern, minimal, hitech, loft, scandi, provence`.

### `site/assets/js/kitchen-render.js` — SVG (владелец: T05)
- `renderElevation(svgEl, wallLayout, style, colorId, ceiling)` — фасадная развёртка одной стены в масштабе, размерные линии в мм.
- `renderPlan(svgEl, layout)` — вид сверху всех стен и острова.
- Никаких расчётов раскладки внутри — только рисует то, что дал `kitchen-layout`.

### Страницы и их якоря
- `index.html` — разделы `#hero`, `#about`, `#repair`, `#commercial`, `#furniture`, `#bundle`, `#calc`, `#kitchen-teaser`, `#lookbook-teaser`, `#steps`, `#trust`, `#faq`, `#jobs`, `#contacts`, `#lead`.
- `kitchen.html` — читает `#style=<id>&...` из адреса. Ссылка из лукбука: `kitchen.html#style=neoclassic`.
- `lookbook.html` — данные кадров в `site/assets/js/lookbook-data.js`: `VROVEN.lookbook = [{ src, w, h, category:'kitchen'|'wardrobe'|'walkin'|'hallway'|'repair', style?, title, alt }]`.
- `jobs.html` — вакансии из `data.jobs`.

### Стили CSS
`site/assets/css/site.css` (владелец: T01) — токены на `:root`: `--canvas, --panel, --ink, --ink-2, --oak, --accent, --accent-hover, --laser, --line`; шрифты `--f-display: 'Jost'`, `--f-body: 'Onest'`, `--f-mono: 'JetBrains Mono'`; общие компоненты `.btn`, `.btn--ghost`, `.card`, `.section`, `.level-line`, `.badge-placeholder`, `.field`, `.chip`. Страничные стили — в отдельных файлах (`kitchen.css`, `lookbook.css`) у владельцев своих страниц.

## Швы для тестов
- `tests/pricing.test.js` → `pricing.js` с `data.js` (data.js тоже экспортирует себя для Node).
- `tests/kitchen-layout.test.js` → `kitchen-layout.js`.
- `tests/lead.test.js` → `lead.js`.

## Что построили завершённые таски
(дописывается после каждого таска)

### T01 — каркас (готово)
- `VROVEN.data` по форме выше, плюс: `jobs[].duties`; `perks/requirements: [{text, placeholder}]`; `furnitureItems[].perMeter: {value,source,placeholder}|null` (у шкафа-купе, гардеробной, прихожей, детской = null — pricing.bundle должен это учитывать: «по смете»); `repairPrices.*.commercial.{office,shop,cafe,salon} = null`.
- `VROVEN.lead.buildMessage(kind, payload, cityName)`, `whatsappUrl(text)`, `telUrl()`. Поля payload: general {name,phone,task}; repair {objectName,repairName,area,ceiling,min,max}; bundle {repairName,area,furniture:[{name,meters}],discountPct,savings,total}; kitchen {shapeName,walls{A,B,C},ceiling,styleName,colorName,materialName,runMeters,price,withRepair,link}; job {position,name,phone,experience}. Пустые поля в текст не попадают.
- `VROVEN.city.get()/set(id)/current()`, событие `vroven:city` {detail.id}, localStorage `vroven.city`.
- `VROVEN.format.rub/mm/num` (разделитель NBSP). `VROVEN.placeholderBadge(el, isPlaceholder, label?)`. `VROVEN.leadUrl(kind,payload)`, `VROVEN.refreshLeads()` — вызвать после динамической смены `data-lead-payload`.
- Разметка: `data-city-switch`, `data-city-text`, `data-phone`, `data-tel`, `data-lead` + `data-lead-payload` (JSON), `data-fact="path"`, `data-reveal`, `body[data-page]`, `nav a[data-nav]`.
- Порядок скриптов: `data.js` → `core.js` → `lead.js` → модули страницы (core.js стартует на DOMContentLoaded).
- CSS-токены сверх списка: `--panel-2, --ink-3, --oak-deep, --laser-glow, --line-strong, --on-ink, --on-ink-2`; классы `.eyebrow, .lead-text, .btn--dark/--sm/--block, .btn-row, .btn-note, .is-placeholder, .page-intro, .container, .section--panel/--ink`.
- Заглушки пишутся с коротким тире: `[АДРЕС ОФИСА – уточняется]`.

### T03 — раскладка кухни (готово)
- `VROVEN.kitchenLayout.layout(input)` / `module.exports.layout`; вход по контракту выше.
- Константы сверх контракта: `UPPER_H_TALL=920, WORKTOP_H=858, WORKTOP_D=600, UPPER_TALL_AUTO_CEILING=2600, TALL_W=600`.
- Выход сверх контракта: `upperHeight` (720|920), `ceiling`; у стены `upperFillers:[{x,width}]` (`fillers` — только низ), `openings:[{type:'window'|'door', x, width, sill?}]`, `joins:{start,end}`; `island: {length, depth, lower, fillers}`.
- Геометрия: x слева направо у каждой стены; стыки A→B→C. Угол принадлежит A (на её конце) и C (на её начале): нижний глухой угол 1000/900 и `upper-corner` 600; соседняя стена начинает низ с 600, верх с 300. `offset` у мойки и плиты — левый край модуля.
- `runMeters` = фронт низа без проёмов и без чужого углового квадрата + длина острова (угловая 3000/2000 → 4.40).
- Ошибки: `field` ∈ `walls.A|B|C, ceiling, window, door, sink, stove, shape, island.length, island.depth, options.upperHeight`. Предупреждения (`warnings`) — тоже показывать пользователю.
- дверь ближе 600 мм к стыку стен → ошибка field 'door' (решение ремонта T03)

### T06 — лукбук и вакансии (готово)
- `VROVEN.lookbook = [{src, thumb, w, h, category, style?, title, alt}]` (thumb — превью 800 px). Кадры: site/assets/img/lookbook/*.webp и *-sm.webp.
- «Хочу так» → kitchen.html#style=<id>; «Хочу похожее»/«Откликнуться» через VROVEN.leadUrl('general'|'job', …).

### T04 — главная (готово)
- `VROVEN.pricing = { repairEstimate, bundle, kitchenEstimate, HIGH_CEILING=3000, AREA_MIN=1, AREA_MAX=5000 }`; `bundle` возвращает ещё `bySurvey`, `items:[{id,name,meters,price|null}]`; `repairTotal=null` без ставки; `kitchenEstimate` → `price/priceWithDiscount=null` при неверных метрах/материале, при withRepair без repairType — минимальная ступень лесенки. Потолок вне 2000–6000 → reason 'ceiling'.
- Ставки читаются как `{value}` или по городу `{tyumen:{value}}`.
- Разметка главной: `data-price="repair-from|kitchen-from|bundle-max"`, `data-furniture-price`, `data-bundle*`, `data-calc*`, `data-lead-form`. В head index.html подключены index.css, pricing.js, index.js.

### T05 — конструктор (готово)
- `VROVEN.kitchenStyles` (8) + необязательные colors[].lower/tall/wall и style.lowerFacade/hood/apron/topDrawer/led/toCeiling/farmSink/knobRing/gas/patinaColor/plinth.
- `VROVEN.kitchenRender.renderElevation(svgEl, wallLayout, style, colorId, ceiling, opts?)`, `renderPlan(svgEl, layout, opts?)`, `swatch(style, colorId)`.
- `VROVEN.kitchenApp`: defaults, toHash, fromHash, sanitize, toLayoutInput, estimate, buildMessage. Hash: style,color,shape,a,b,c,h,win,door,sink,stove,isl,tall,up,mat,rep; localStorage `vroven.kitchen`.
