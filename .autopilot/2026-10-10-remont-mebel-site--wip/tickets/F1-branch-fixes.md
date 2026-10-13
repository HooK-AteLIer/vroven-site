# F1 — Правки по ревью ветки

**Требования:** G02, G03, R07, R19
**Зависит от:** —
**Зона:** `site/index.html` · `site/kitchen.html` · `site/lookbook.html` · `site/jobs.html` · `site/assets/js/index.js` · `site/assets/js/kitchen-app.js` · `site/assets/js/kitchen-render.js` · `site/assets/js/core.js` · `site/assets/js/lead.js` · `site/assets/js/jobs.js` · `site/assets/js/pricing.js` · `tests/`
**Волна:** 4
**Ревью:** да — ремонт ветки
**Модель:** сильная

## Что должно заработать

Сайт говорит ровно то, что решил заказчик 2026-10-11: цены «ориентировочно», условия вакансий «обсуждаем по телефону». Вилки цен круглые. Номер телефона виден и без JS. Числа форматируются одинаково.

## Из брифа, дословно

> «цены ориентиры по рынку, условия вакансий по телефону»

## Разделы спецификации

«Открытые места» (строки G02, G03), истории 13, 29; `interfaces.md` (T01: VROVEN.format).

## Критерии приёмки

- [ ] Spec · site/assets/js/index.js:41 и :152, kitchen-app.js:559 · метка «ориентир, уточняется» и «ориентир» противоречат решению G03. Условие: на всех страницах метка цены звучит ровно «ориентировочно»; заодно поправлены устаревшие комментарии core.js:75 и index.js:37.
- [ ] Spec · site/assets/js/jobs.js:93 · «Условия уточняются, пока расскажем по телефону…» противоречит G02. Условие: `grep -n "уточняются" site/assets/js/jobs.js` пуст, в заметке «Условия обсуждаем по телефону».
- [ ] Craft · site/assets/js/pricing.js:93-94 · вилка ±15% выводится с точностью до рубля. Условие: min и max у repairEstimate кратны 100; тесты pricing.test пересчитаны.
- [ ] Craft · site/*.html (`<a data-phone href="#"></a>`, `<a data-tel href="#">`) · без JS номер не виден. Условие: в HTML уже стоит текст «+7 912 410 00 01» и `href="tel:+79124100001"`, JS только перезаписывает.
- [ ] Craft · форматирование чисел в 4 копиях (core.js:64, lead.js:34, kitchen-app.js:220, kitchen-render.js:79), разные пробелы. Условие: на странице один хелпер (V.format), разделитель NBSP везде; для текста WhatsApp в lead.js обычный пробел допустим.
- [ ] Craft · site/index.html (.contacts__phone) · высота ссылки 26 px. Условие: min-height не меньше 44 px.
