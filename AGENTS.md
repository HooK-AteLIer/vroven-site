<!-- autopilot:start -->
# Сайт ВРОВЕНЬ: ремонт под ключ + корпусная мебель

Статичный сайт компании из Тюмени и Нижневартовска (4 страницы: главная, конструктор кухни, лукбук, вакансии). Для агента, который правит сайт, данные или бренд. Архитектура, потоки данных и границы модулей: `docs/architecture.md`. Термины (комплект, заглушка, стык, добор): `CONTEXT.md`.

## Команды

- Тесты (86 pass): `node --test` из корня. Один файл: `node --test tests/pricing.test.js`. Не `node --test tests/` (Node 24: MODULE_NOT_FOUND); можно `node --test tests/*.test.js`.
- Предпросмотр: `python -m http.server 8130 --directory site`, затем http://localhost:8130/ (сборки и npm нет; тот же сервер в `.claude/launch.json`, имя `site`).
- Бренд (логотипы, визитка PNG/PDF через headless Edge): `python brand/build/build_all.py`.

## Где что

- `site/assets/js/data.js` — все факты и цены компании; больше нигде не хранить.
- `site/assets/js/core.js`, `lead.js` — город, формат, заявка в WhatsApp; общие для всех страниц.
- `site/assets/js/pricing.js`, `kitchen-layout.js` — чистая логика, покрыта `tests/`.
- `site/assets/js/kitchen-app.js`, `kitchen-render.js`, `kitchen-styles.js` — UI конструктора, SVG, 8 стилей.
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
- Ролик героя `hero-scrub.mp4` перекодирован с частыми ключевыми кадрами; при замене поправить `VIDEO_BYTES` в `hero-scrub.js`. С file:// и на мобильных герой статичный: так задумано.
- `media-raw/` (сырьё AI-картинок и ролика) не в git: источника для перекодирования в репозитории нет.
- Edge в headless возвращается раньше, чем записан файл; ожидание файла в `brand/build/render.py`, не убирать.
- `og:image` относительный, пока не опубликовано: комментарий `DEPLOY STEP` в `<head>` каждой страницы.

## Как здесь работает Autopilot

Сборка ведётся навыком `/autopilot`. Требования, спецификация и таски — в `.autopilot/`.
Прогресс — `.autopilot/dashboard.html`. Требование из `manifest.md` может снять
только пользователь. Прерванную сборку продолжает «продолжи автопилот».
<!-- autopilot:end -->
