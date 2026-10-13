# Архитектура

Статичный сайт: `site/` публикуется целиком, без сборки, npm, фреймворков и CDN-скриптов (шрифты только Google Fonts). Решения: `docs/adr/0001`-`0004`.

## Поток данных

- `site/assets/js/data.js` — единственный источник фактов (телефон, города, цены, скидки, гарантии, вакансии). Объявляет `window.VROVEN.data`, в Node экспортирует себя.
- Страница читает `VROVEN.data` и считает через чистые модули, результат кладёт в DOM.
- Любая заявка идёт по цепочке `payload` -> `VROVEN.lead.buildMessage(kind, payload, cityName)` -> `whatsappUrl` -> ссылка `wa.me`; сервера и формы с отправкой нет.
- Ссылки на заявку размечены `data-lead="kind"` + `data-lead-payload` (JSON); после динамической смены payload вызвать `VROVEN.refreshLeads()`.
- Город: `VROVEN.city.get()/set(id)`, хранится в localStorage `vroven.city`, смена рассылает `document` -> `vroven:city`; `[data-city-text]` перерисовываются сами.
- Конструктор кухни: форма -> `kitchenApp.toLayoutInput` -> `kitchenLayout.layout` -> `kitchenRender` рисует SVG; состояние в хеше адреса (`kitchen.html#style=neoclassic&...`) и localStorage `vroven.kitchen`. Из лукбука ссылка «Хочу так» ведёт в этот хеш.

## Границы модулей

- Глобальное пространство имён `window.VROVEN`; скрипты классические `<script defer>`. Порядок на каждой странице: `data.js`, `core.js`, `lead.js`, затем модули страницы; `core.js` стартует на DOMContentLoaded.
- Чистые, без DOM, тестируются в Node: `pricing.js`, `kitchen-layout.js`, `lead.js`, `data.js`. Конец файла: `if (typeof module !== 'undefined') module.exports = X;`, вне Node вешаются на `window.VROVEN.X`.
- `kitchen-render.js` только рисует то, что дал `kitchen-layout`, расчётов раскладки в нём нет.
- `core.js` — общее: город, `format.rub/mm/num`, `placeholderBadge`, мобильное меню, активный пункт навигации. Шапка и подвал дублируются в HTML каждой страницы, не генерируются.
- Страничные модули: `index.js` (+ `hero-scrub.js`, `hero-frames.js`, `before-after.js`, `design-layers.js`), `kitchen-app.js` (+ `kitchen-accordion.js` — гармошка выбора стиля), `lookbook.js`, `jobs.js`; страничные стили лежат отдельно (`index.css`, `hero.css`, `kitchen.css`, `lookbook.css`, `jobs.css`), общие токены и компоненты в `site.css`.
- Вне `site/`: `tests/` (node:test, швы: pricing, kitchen-layout, lead, kitchen-app, kitchen-accordion, hero-frames, before-after, design-layers, furniture, jobs-photos, publish), `brand/` (Python-сборка, не часть сайта), `media-raw/` (сырьё, не в git), `docs/`, `ref/`.

## Соглашения

- Имена в коде на английском, тексты сайта на русском; без длинного тире (—), стоп-слов и канцелярита (проверяет `tests/publish.test.js`).
- Факт, которого нет в `data.js`, не выдумывается: видимая заглушка `[ЧТО – уточняется]`; у цены `placeholder: true` показывается метка «ориентир, уточняется».
- Размеры конструктора в миллиметрах, целыми числами; цена кухни считается от погонного метра нижнего ряда.
- Ставки в `data.js` читаются как `{value}` или по городу `{tyumen:{value}}`; `null` = «по смете».
- Мобильная ширина от 360 px без горизонтального скролла; `prefers-reduced-motion` гасит анимации до конечного состояния.
- Герой: режим выбирает `chooseMode` (`hero-frames.js`): широкий экран — скраб видео; телефон и вертикальный планшет — 72 кадра на canvas; телефон с Save-Data или 2g/3g — три картинки с кроссфейдом; file:// и reduced-motion — статичный финальный кадр.
- Раскладка кухни: стены A, B, C, стыки A->B->C; угол принадлежит A (на конце) и C (на начале); окно убирает верхние шкафы, дверной проём убирает все модули; дверь ближе 600 мм к стыку даёт ошибку `door`.
- Публикация: `site/README.md`; перед выкладкой выполнить DEPLOY STEP (абсолютный `og:image`, `og:url`).
