"""Визитка ВРОВЕНЬ: лицо и оборот 94 × 54 мм (обрез 90 × 50, вылеты 2 мм,
безопасное поле 3 мм от обреза). Логотип в кривых Forum, имя набрано Forum,
остальной текст Onest и JetBrains Mono (Google Fonts); в PDF шрифты встраиваются
при печати из Edge.

Запуск из корня проекта: python brand/build/build_card.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from glyphs import fmt  # noqa: E402
from build_logo import (CANVAS, INK, OAK, LASER, LASER_ON_DARK, WORD_D, WORD_W,  # noqa: E402
                        TAG_D, TAG_W, PRIMARY_MARK_S, mark_main, g, write, ROOT)

CARD = os.path.join(ROOT, "card")
W, H = 94, 54            # с вылетами
BLEED = 2
SAFE = BLEED + 3         # от края файла до безопасной зоны
INK_2 = "#5E5950"

FONTS_URL = ("https://fonts.googleapis.com/css2?family=Forum&"
             "family=Onest:wght@400;500&family=JetBrains+Mono:wght@500&display=block")

CONTACT = {
    "name": "[ИМЯ ФАМИЛИЯ]",
    "role": "[ДОЛЖНОСТЬ]",
    "phone": "+7 912 410 00 01",
    "cities": "Тюмень · Нижневартовск",
    "site": "[САЙТ]",
    "mail": "[ПОЧТА]",
}


def card_svg(inner, bg):
    style = (f"<style>@import url('{FONTS_URL.replace('&', '&amp;')}');"
             ".n{font-family:Forum,serif;font-weight:400}"
             ".b{font-family:Onest,sans-serif;font-weight:400}"
             ".m{font-family:'JetBrains Mono',monospace;font-weight:500}</style>")
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" '
            f'viewBox="0 0 {W} {H}">{style}'
            f'<rect width="{W}" height="{H}" fill="{bg}"/>{inner}</svg>\n')


def front():
    """Лицо: графит в край, основной логотип, луч уровня проходит через всю карту."""
    s = 0.064                            # 1 единица кегля логотипа в мм
    mark_s = PRIMARY_MARK_S
    tag_s = WORD_W / TAG_W               # подпись ровно по ширине слова
    total_h = (24 * mark_s + 44 - 2 * mark_s + 100 + 34 + 100 * tag_s) * s
    top = (H - total_h) / 2
    cx = W / 2
    mark_x = cx - 12 * mark_s * s
    # луч знака: модуль 11..12 сетки; продлеваем его на вылеты с обеих сторон
    beam_y = top + 11 * mark_s * s
    beam_h = 1 * mark_s * s
    out = g(mark_main(CANVAS, "none"), mark_x, top, mark_s * s)
    out += f'<rect x="0" y="{fmt(beam_y)}" width="{W}" height="{fmt(beam_h)}" fill="{LASER_ON_DARK}"/>'
    y = top + (22 * mark_s + 44) * s     # низ стены знака + зазор, как в основном логотипе
    out += g(WORD_D, cx - WORD_W * s / 2, y, s, CANVAS)
    y += (100 + 34) * s
    out += g(TAG_D, cx - WORD_W * s / 2, y, tag_s * s, OAK)
    return card_svg(out, INK)


def back():
    """Оборот: штукатурка, контакты в безопасной зоне, короткий луч уровня."""
    x = SAFE + 2.5
    c = CONTACT
    out = []
    out.append(f'<text class="n" x="{x}" y="14.2" font-size="4" letter-spacing="0.12" fill="{INK}">{c["name"]}</text>')
    out.append(f'<text class="b" x="{x}" y="18.6" font-size="2.5" fill="{INK_2}">{c["role"]}</text>')
    # луч уровня: от левого вылета до знака, совпадает с лучом знака
    mark_s = 0.5
    beam_y = 26.5
    mark_x = W - SAFE - 1 - 24 * mark_s
    mark_y = beam_y - 11 * mark_s
    beam_end = mark_x + 23 * mark_s
    out.append(g(mark_main(INK, "none"), mark_x, mark_y, mark_s))
    out.append(f'<rect x="0" y="{fmt(beam_y)}" width="{fmt(beam_end)}" height="{fmt(mark_s)}" fill="{LASER}"/>')
    out.append(f'<text class="m" x="{x}" y="35.6" font-size="3.5" fill="{INK}">{c["phone"]}</text>')
    out.append(f'<text class="b" x="{x}" y="40.4" font-size="2.45" fill="{INK}">{c["cities"]}</text>')
    out.append(f'<text class="b" x="{x}" y="45.4" font-size="2.3" fill="{INK_2}">{c["site"]}</text>')
    out.append(f'<text class="b" x="{x + 16}" y="45.4" font-size="2.3" fill="{INK_2}">{c["mail"]}</text>')
    return card_svg("".join(out), CANVAS)


def print_page(svg_text, title):
    return ("<!doctype html><html lang='ru'><head><meta charset='utf-8'>"
            f"<title>{title}</title>"
            f"<link rel='stylesheet' href='{FONTS_URL}'>"
            "<style>@page{size:94mm 54mm;margin:0}html,body{margin:0;padding:0}"
            "svg{display:block;width:94mm;height:54mm}</style></head><body>"
            f"{svg_text}</body></html>\n")


def main():
    f_svg, b_svg = front(), back()
    write(os.path.join(CARD, "card-front.svg"), f_svg)
    write(os.path.join(CARD, "card-back.svg"), b_svg)
    write(os.path.join(CARD, "print", "card-front.html"), print_page(f_svg, "Визитка ВРОВЕНЬ, лицо"))
    write(os.path.join(CARD, "print", "card-back.html"), print_page(b_svg, "Визитка ВРОВЕНЬ, оборот"))


if __name__ == "__main__":
    main()
