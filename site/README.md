# Сайт ВРОВЕНЬ

Статичный сайт: чистые HTML, CSS и JavaScript, без сборки и npm. Папка `site/` публикуется целиком, как есть.

## Что внутри

| Файл | Что это |
|---|---|
| `index.html` | главная: кинематографичный герой, ремонт, мебель, комплект, калькулятор, гарантии, вакансии, заявка |
| `kitchen.html` | конструктор кухни |
| `lookbook.html` | лукбук (визуализации проектов) |
| `jobs.html` | вакансии |
| `favicon.svg` | знак бренда для вкладки браузера |
| `assets/js/data.js` | **все факты сайта**: телефон, адреса, цены, скидки, гарантии, вакансии |
| `assets/video/hero-scrub.mp4` | ролик героя, перекодирован для прокрутки скроллом |
| `assets/img/hero/` | первый кадр (постер), финальный кадр (статичный герой) и `og-image.jpg` для превью в мессенджерах |

Цены, адреса и условия меняются только в `assets/js/data.js`. Пока у цены стоит `placeholder: true`, рядом с ней показывается метка «ориентировочно».

## Посмотреть у себя

Двойной щелчок по `index.html` откроет сайт, но со статичным героем: браузер не даёт странице с диска загрузить ролик. Чтобы увидеть ролик, который крутится скроллом, запустите локальный сервер из корня проекта:

```
python -m http.server 8130 --directory site
```

и откройте http://localhost:8130 в браузере.

На телефоне (ширина меньше 768 px), на вертикальном планшете и при включённом «уменьшении движения» герой всегда статичный: финальный кадр и тот же текст. Это задумано, а не ошибка.

## Опубликовать

Публикуем только после «да» заказчика.

### Вариант 1. GitHub Pages (бесплатно)

1. Создайте репозиторий на GitHub и загрузите в него **содержимое** папки `site/` (чтобы `index.html` лежал в корне репозитория).
2. В репозитории: Settings → Pages → Source: Deploy from a branch → ветка `main`, папка `/ (root)` → Save.
3. Через минуту-две сайт откроется по адресу `https://<логин>.github.io/<репозиторий>/`. Свой домен подключается там же, в поле Custom domain.

### Вариант 2. Любой хостинг (Hostinger, Beget, Timeweb и другие)

1. Заархивируйте **содержимое** папки `site/` в zip (не саму папку).
2. В панели хостинга откройте файловый менеджер, папку сайта (обычно `public_html`) и загрузите туда архив, затем распакуйте.
3. Проверьте, что `index.html` лежит прямо в `public_html`.

Ролик загружается целиком одним файлом (Blob), поэтому скраб работает и на хостингах без поддержки частичной загрузки (HTTP Range).

### После публикации (DEPLOY STEP)

Превью ссылки в Telegram, WhatsApp и VK требует абсолютного адреса картинки. В `<head>` каждой из четырёх страниц найдите комментарий `DEPLOY STEP` и:

1. замените `content="assets/img/hero/og-image.jpg"` на `content="https://ВАШ-ДОМЕН/assets/img/hero/og-image.jpg"`;
2. добавьте строку `<meta property="og:url" content="https://ВАШ-ДОМЕН/имя-страницы.html">`.

Потом проверьте: откройте сайт на компьютере и на телефоне, прокрутите героя вверх и вниз, отправьте ссылку себе в мессенджер.

## Ролик героя

Сырьё лежит вне сайта: `media-raw/hero/hero-raw-v1.mp4`. Если ролик заменят, перекодируйте его с коротким интервалом ключевых кадров, иначе прокрутка будет дёргаться:

```
ffmpeg -i media-raw/hero/hero-raw-v1.mp4 -c:v libx264 -crf 18 -preset slow -g 8 -keyint_min 8 -pix_fmt yuv420p -movflags +faststart -an site/assets/video/hero-scrub.mp4
ffmpeg -i site/assets/video/hero-scrub.mp4 -frames:v 1 -q:v 3 site/assets/img/hero/hero-start.jpg
ffmpeg -sseof -0.1 -i site/assets/video/hero-scrub.mp4 -update 1 -frames:v 1 -q:v 3 site/assets/img/hero/hero-final.jpg
ffmpeg -sseof -0.1 -i site/assets/video/hero-scrub.mp4 -update 1 -frames:v 1 -vf scale=960:-2 -q:v 3 site/assets/img/hero/hero-final-sm.jpg
ffmpeg -sseof -0.1 -i site/assets/video/hero-scrub.mp4 -update 1 -frames:v 1 -vf "scale=1200:-2,crop=1200:630" -q:v 3 site/assets/img/hero/og-image.jpg
```

После замены поправьте `VIDEO_BYTES` в `assets/js/hero-scrub.js` на новый размер файла в байтах.
