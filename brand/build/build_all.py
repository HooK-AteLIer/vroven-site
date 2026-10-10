"""Полная сборка бренда ВРОВЕНЬ: логотип, визитка, бренд-доска, PNG и PDF.

Запуск из корня проекта: python brand/build/build_all.py
Нужен только Python и установленный Microsoft Edge (PNG и PDF).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import build_logo  # noqa: E402
import build_card  # noqa: E402
import render  # noqa: E402
from build_logo import INK, LASER, ROOT, mark_main, write  # noqa: E402

LOGO = os.path.join(ROOT, "logo")
PNG = os.path.join(LOGO, "png")
CARD = os.path.join(ROOT, "card")
HERE = os.path.dirname(__file__)


def grid_svg():
    """Схема построения знака: сетка модулей, знак, охранное поле, размеры."""
    lines = []
    for i in range(25):
        lines.append(f'<path d="M{i} 0V24M0 {i}H24" stroke="#B9AE9C" stroke-width="0.03"/>')
    dims = [
        (6, -0.6, "4"), (12, -0.6, "8"), (13.5, 23.3, "11"),
    ]
    labels = "".join(
        f'<text x="{x}" y="{y}" font-size="0.75" text-anchor="middle" '
        f'font-family="JetBrains Mono, monospace" fill="#5E5950">{t}</text>'
        for x, y, t in dims)
    return ('<svg viewBox="-3 -3 30 30" xmlns="http://www.w3.org/2000/svg" role="img" '
            'aria-label="Построение знака на сетке 24 на 24">'
            + "".join(lines)
            + '<rect x="-1" y="0" width="26" height="24" fill="none" stroke="#3b7de0" '
              'stroke-width="0.06" stroke-dasharray="0.4 0.3"/>'
            + f'<g opacity="0.92">{mark_main(INK, LASER)}</g>'
            + labels
            + '<text x="25.6" y="11.9" font-size="0.75" font-family="JetBrains Mono, monospace" '
              'fill="#5E5950">1</text>'
            + '<text x="12" y="26.4" font-size="0.75" text-anchor="middle" '
              'font-family="JetBrains Mono, monospace" fill="#3b7de0">охранное поле 2 модуля</text>'
            + "</svg>")


def guides_svg():
    """Направляющие визитки поверх макета: обрез и безопасное поле."""
    return ('<svg class="guides" viewBox="0 0 94 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
            '<rect x="2" y="2" width="90" height="50" fill="none" stroke="#e2483d" '
            'stroke-width="0.25" stroke-dasharray="1 0.6"/>'
            '<rect x="5" y="5" width="84" height="44" fill="none" stroke="#3b7de0" '
            'stroke-width="0.25" stroke-dasharray="1 0.6"/></svg>')


def board():
    tpl = open(os.path.join(HERE, "board-template.html"), encoding="utf-8").read()
    front = open(os.path.join(CARD, "card-front.svg"), encoding="utf-8").read().strip()
    back = open(os.path.join(CARD, "card-back.svg"), encoding="utf-8").read().strip()
    html = (tpl.replace("{{GRID}}", grid_svg())
               .replace("{{GUIDES}}", guides_svg())
               .replace("{{CARD_FRONT}}", front)
               .replace("{{CARD_BACK}}", back))
    write(os.path.join(ROOT, "index.html"), html)


def pngs():
    os.makedirs(PNG, exist_ok=True)
    for name in ["primary", "horizontal", "mark", "inverse", "mono", "horizontal-inverse"]:
        src = os.path.join(LOGO, f"vroven-{name}.svg")
        render.png(src, os.path.join(PNG, f"vroven-{name}.png"), 1024)
    # проверочный рендер знака в 24 px на фоне штукатурки
    render.png(os.path.join(LOGO, "vroven-mark.svg"), os.path.join(PNG, "vroven-mark-24.png"), 24, "#F2EDE4")


def pdfs():
    for side in ["front", "back"]:
        render.pdf(os.path.join(CARD, "print", f"card-{side}.html"), os.path.join(CARD, f"card-{side}.pdf"))


def main():
    build_logo.main()
    build_card.main()
    board()
    pngs()
    pdfs()
    print("готово:", ROOT)


if __name__ == "__main__":
    main()
