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

### Вариант 1. GitHub Pages (так опубликовано сейчас)

Репозиторий: https://github.com/shatskihton-boop/vroven-site, сайт: https://shatskihton-boop.github.io/vroven-site/

Публикует workflow `.github/workflows/pages.yml`: при каждом пуше в `main` он прогоняет `node --test` и выкладывает папку `site/`. Если тесты упали, сайт не обновится. Ход публикации виден на вкладке Actions репозитория.

### Вариант 2. Любой хостинг (Hostinger, Beget, Timeweb и другие)

1. Заархивируйте **содержимое** папки `site/` в zip (не саму папку).
2. В панели хостинга откройте файловый менеджер, папку сайта (обычно `public_html`) и загрузите туда архив, затем распакуйте.
3. Проверьте, что `index.html` лежит прямо в `public_html`.

Ролик загружается целиком одним файлом (Blob), поэтому скраб работает и на хостингах без поддержки частичной загрузки (HTTP Range).

### Адрес сайта в превью ссылок

В `<head>` четырёх страниц `og:image` и `og:url` указаны абсолютными адресами `https://shatskihton-boop.github.io/vroven-site/…`: так превью ссылки работает в Telegram, WhatsApp и VK. При переезде на свой домен замените этот адрес во всех четырёх страницах.

## Ролик героя

Ролик показывает ремонт по прокрутке: черновые бетонные стены, чистовая отделка, затем появляется кухня. Сырьё лежит вне сайта, в `media-raw/hero2/`: `seg1.mp4` (черновая → чистовая, 6 с) и `seg2.mp4` (чистовая → мебель, 6 с), оба 1912×1080, 24 fps. Склейка: первый кадр держится 1 с (бренд на черновых стенах), `seg2` берётся с 1-й секунды (пустая чистовая и так долго стоит), стык закрыт кроссфейдом 0,25 с. Получается 11,8 с, 284 кадра.

```
ffmpeg -i media-raw/hero2/seg1.mp4 -ss 1.0 -i media-raw/hero2/seg2.mp4 -filter_complex "[0:v]settb=1/24,tpad=start_duration=1:start_mode=clone,fps=24,setpts=PTS-STARTPTS[a];[1:v]fps=24,setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=0.25:offset=6.79,format=yuv420p[v]" -map "[v]" -an -r 24 -c:v libx264 -crf 12 -preset slow media-raw/hero2/hero-raw-v2.mp4
```

Перекодируйте склейку с коротким интервалом ключевых кадров, иначе прокрутка будет дёргаться. CRF 22 держит файл около 7 МБ (CRF 18 даёт 12 МБ, это много для первого экрана):

```
ffmpeg -i media-raw/hero2/hero-raw-v2.mp4 -c:v libx264 -crf 22 -preset slow -g 8 -keyint_min 8 -pix_fmt yuv420p -movflags +faststart -an site/assets/video/hero-scrub.mp4
ffmpeg -i site/assets/video/hero-scrub.mp4 -frames:v 1 -q:v 3 site/assets/img/hero/hero-start.jpg
ffmpeg -sseof -0.1 -i site/assets/video/hero-scrub.mp4 -update 1 -frames:v 1 -q:v 3 site/assets/img/hero/hero-final.jpg
ffmpeg -sseof -0.1 -i site/assets/video/hero-scrub.mp4 -update 1 -frames:v 1 -vf scale=960:-2 -q:v 3 site/assets/img/hero/hero-final-sm.jpg
ffmpeg -sseof -0.1 -i site/assets/video/hero-scrub.mp4 -update 1 -frames:v 1 -vf "scale=1200:-2,crop=1200:630" -q:v 3 site/assets/img/hero/og-image.jpg
```

`hero-start.jpg` (черновые стены) служит постером скраба, `hero-final*.jpg` (кухня) показывает статичный герой с file://, при reduced motion и до загрузки скрипта, `og-image.jpg` тоже кухня.

Полосы подписей (`data-band` в `index.html`, доли прокрутки героя) привязаны к фазам ролика: бренд 0–0,14 (черновые стены, штукатурка пошла с 0,15), «01 · ремонт» 0,17–0,6 (отделка до 0,3, дальше пустая чистовая), «02 · мебель» 0,64–0,88 (мебель появляется с 0,64), финальный блок 0,9–1 (кухня собрана). Если ролик поменяется, сверьте кадры и сдвиньте полосы.

После замены поправьте `VIDEO_BYTES` в `assets/js/hero-scrub.js` на новый размер файла в байтах.

### Герой на телефоне: кадры вместо ролика

На телефоне (первые четыре условия `GATES` в `hero-scrub.js`) ролик не грузится. `hero-frames.js` рисует на `<canvas>` 72 кадра `assets/img/hero/frames/f001.webp … f072.webp` по тому же прогрессу героя, подписи и полосы те же. Режим выбирает `chooseMode` в `hero-frames.js`:

- десктоп: видеоскраб, кадры не запрашиваются;
- телефон: кадры (сначала `f001` как постер, потом сетка через 8 и через 4, потом остальные);
- телефон с Save-Data или медленной сетью (`effectiveType` slow-2g, 2g, 3g): три картинки `phase-rough/finish/final.webp` с кроссфейдом;
- reduced motion и file://: статичный герой (готовая кухня).

Обрезка 900×1080 от x = 500 (стена с обоими светильниками и остров), масштаб 720×864, WebP качество 78; 72 кадра равномерно из 284, сумма около 1,3 МБ. На экране кадр идёт по ширине и прижат к низу, подписи сверху на тёмном поле; лёжа кадр по высоте справа. Рецепт (bash, из корня; `tmp/` удалить после):

```
mkdir -p tmp/hf site/assets/img/hero/frames
ffmpeg -i media-raw/hero2/hero-raw-v2.mp4 -vf "crop=900:1080:500:0,scale=720:864:flags=lanczos" tmp/hf/a%03d.png
for i in $(seq 0 71); do
  n=$(( (i*283*2 + 71) / (71*2) + 1 ))
  ffmpeg -y -i tmp/hf/a$(printf %03d $n).png -c:v libwebp -quality 78 -compression_level 6 site/assets/img/hero/frames/f$(printf %03d $((i+1))).webp
done
ffmpeg -y -i tmp/hf/a001.png -c:v libwebp -quality 82 site/assets/img/hero/phase-rough.webp
ffmpeg -y -i tmp/hf/a150.png -c:v libwebp -quality 82 site/assets/img/hero/phase-finish.webp
ffmpeg -y -i tmp/hf/a284.png -c:v libwebp -quality 82 site/assets/img/hero/phase-final.webp
```

Если поменяется число кадров, поправьте `FRAME_COUNT` в `hero-frames.js`; переходы лёгкого режима (`LIGHT_STOPS`) сверены с полосами подписей. `tests/hero-frames.test.js` проверяет, что кадры на месте и весят не больше 3 МБ, а каждая картинка фазы не больше 120 КБ.
