<!-- autopilot:start -->
# Сайт НА УРОВНЕ: ремонт под ключ + корпусная мебель

Бренд переименован 2026-10-20 из ВРОВЕНЬ в НА УРОВНЕ (по решению заказчика). Внутренние имена остались прежними: пространство `window.VROVEN`, событие `vroven:city`, адрес репозитория `vroven-site`. Логотип сайта собирает `brand/build/build_logo_nu.py`; доска и визитка в `brand/` пока на ВРОВЕНЬ.

Статичный сайт компании из Тюмени и Нижневартовска (4 страницы: главная, конструктор кухни, лукбук, вакансии). Для агента, который правит сайт, данные или бренд. Архитектура, потоки данных и границы модулей: `docs/architecture.md`. Термины (комплект, заглушка, стык, добор): `CONTEXT.md`.

## Команды

- Тесты (116 pass): `node --test` из корня. Один файл: `node --test tests/pricing.test.js`. Не `node --test tests/` (Node 24: MODULE_NOT_FOUND); можно `node --test tests/*.test.js`.
- Предпросмотр: `node tools/serve.js 8130`, затем http://localhost:8130/ (сборки и npm нет; тот же сервер в `.claude/launch.json`, имя `site`). Не `python -m http.server`: на Windows рвёт соединения.
- Бренд (логотипы, визитка PNG/PDF через headless Edge): `python brand/build/build_all.py`.

## Где что

- `site/assets/js/data.js` — все факты и цены компании; больше нигде не хранить.
- `site/assets/js/core.js`, `lead.js` — город, формат, заявка в WhatsApp; общие для всех страниц.
- `site/assets/js/pricing.js`, `kitchen-layout.js` — чистая логика, покрыта `tests/`.
- `site/assets/js/kitchen-app.js`, `kitchen-render.js`, `kitchen-styles.js`, `kitchen-accordion.js` — UI конструктора, SVG, 8 стилей, гармошка выбора стиля (раскрытая полоса показывает `colors[].scene`).
- `site/assets/js/lookbook-data.js` — кадры лукбука; картинки в `site/assets/img/lookbook/`.
- `site/README.md` — публикация, DEPLOY STEP, рецепт перекодирования ролика героя.
- `docs/adr/` — 4 решения (статика, WhatsApp, 2D-конструктор, факты в data.js); `docs/research.md` — рынок.
- `brand/` — логотипы, визитка, исходники сборки в `brand/build/`.

## Подводные камни

- `node --test tests/` падает на Node 24; передавать файлы или ничего.
- Скрипты классические (`<script defer>`, `window.VROVEN`), не ES-модули: сайт должен открываться и с file://. Порядок: `data.js`, `core.js`, `lead.js`, затем модули страницы.
- `tests/publish.test.js` режет длинное тире (—), стоп-слова и канцелярит в HTML четырёх страниц.
- Неизвестный факт: видимая заглушка `[ЧТО – уточняется]` (короткое тире), цена с `placeholder: true` получает метку «ориентировочно».
- Размеры конструктора в мм, целые числа.
- Первый экран — `hero-laser.js` + `hero-laser.css`: буквы «НА УРОВНЕ» выравниваются, лазер 3 с открывает пару кадров «до/после» (`assets/img/hero/laser-*-w.webp` компьютер, `-m.webp` телефон, ширина/высота < 0,8), крест встаёт между словами; reduced motion — сразу финал, без JS — финальный кадр фоном CSS. Пары кадров должны совпадать по ракурсу (исходники в `media-raw/hero-assembly/`). Сроки фаз — объект `T` в начале модуля.
- GitHub Pages иногда отвечает 503 на отдельные файлы: любую загрузку картинок/кадров делать с повтором (`loadWithRetry` в `kitchen-accordion.js`, `loadImg` в `hero-laser.js`), иначе на телефоне герой молча уходит в статичный режим. Диагностика героя на телефоне: открыть сайт с `?debug=1`.
- `media-raw/` (сырьё AI-картинок и ролика) не в git: источника для перекодирования в репозитории нет.
- Edge в headless возвращается раньше, чем записан файл; ожидание файла в `brand/build/render.py`, не убирать.
- Сайт публикуется на GitHub Pages workflow `.github/workflows/pages.yml` при пуше в `main` (сначала `node --test`): https://hook-atelier.github.io/vroven-site/. `og:image` и `og:url` абсолютные на этот адрес; при смене домена поправить в четырёх страницах.

## Как здесь работает Autopilot

Сборка ведётся навыком `/autopilot`. Требования, спецификация и таски — в `.autopilot/`.
Прогресс — `.autopilot/dashboard.html`. Требование из `manifest.md` может снять
только пользователь. Прерванную сборку продолжает «продолжи автопилот».
<!-- autopilot:end -->
