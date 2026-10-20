"""Собирает логотип «НА УРОВНЕ» для сайта: слово в кривых Forum и лазерный крест между «НА» и «УРОВНЕ».

Идея та же, что у первого экрана: горизонтальный луч нивелира проходит через середину букв,
а в промежутке между словами стоит крест с яркой точкой.

Запуск из корня проекта: python brand/build/build_logo_nu.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from glyphs import text_path, fmt  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITE = os.path.abspath(os.path.join(ROOT, "..", "site"))
SITE_LOGO = os.path.join(SITE, "assets", "img", "logo")

CANVAS = "#F2EDE4"
INK = "#26241F"
LASER = "#1FBF5B"
LASER_ON_DARK = "#35D873"

TRACK = 12      # разрядка букв, единицы кегля (прописная = 100)
GAP = 64        # промежуток между словами под крест
PAD_Y = 11      # поля сверху и снизу


def wordmark(ink, laser):
    na, w_na = text_path("НА", TRACK)
    ur, w_ur = text_path("УРОВНЕ", TRACK)
    x_ur = w_na + GAP
    w = x_ur + w_ur
    cx = w_na + GAP / 2
    h = 100 + PAD_Y * 2
    mid = PAD_Y + 50
    inner = (
        # луч через всё слово: под буквами, чтобы буквы его перекрывали
        f'<rect x="-6" y="{fmt(mid - 1.4)}" width="{fmt(w + 12)}" height="2.8" fill="{laser}" opacity=".75"/>'
        f'<g fill="{ink}" transform="translate(0 {PAD_Y})">{na}</g>'
        f'<g fill="{ink}" transform="translate({fmt(x_ur)} {PAD_Y})">{ur}</g>'
        # крест в промежутке
        f'<rect x="{fmt(cx - 1.6)}" y="{fmt(mid - 38)}" width="3.2" height="76" fill="{laser}"/>'
        f'<circle cx="{fmt(cx)}" cy="{fmt(mid)}" r="7.5" fill="{laser}"/>'
    )
    vb_x = -6
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(vb_x)} 0 {fmt(w + 12)} {fmt(h)}" '
            f'width="{fmt(w + 12)}" height="{fmt(h)}" role="img" aria-label="НА УРОВНЕ">'
            f"<title>НА УРОВНЕ</title>{inner}</svg>\n"), w + 12, h


def favicon():
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="НА УРОВНЕ">'
            '<title>НА УРОВНЕ</title><rect width="24" height="24" rx="5" fill="#0D0D0D"/>'
            f'<path fill="{LASER_ON_DARK}" d="M2 11.3H22V12.7H2ZM11.3 4H12.7V20H11.3Z"/>'
            f'<circle cx="12" cy="12" r="2.6" fill="{LASER_ON_DARK}"/></svg>\n')


def write(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print("записан", os.path.relpath(path, os.path.join(ROOT, "..")))


def main():
    light, w, h = wordmark(INK, LASER)
    dark, _, _ = wordmark(CANVAS, LASER_ON_DARK)
    write(os.path.join(SITE_LOGO, "naurovne-wordmark.svg"), light)
    write(os.path.join(SITE_LOGO, "naurovne-wordmark-inverse.svg"), dark)
    write(os.path.join(SITE, "favicon.svg"), favicon())
    print(f"размер слова: {fmt(w)} x {fmt(h)}")


if __name__ == "__main__":
    main()
