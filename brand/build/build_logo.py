"""Собирает логотип ВРОВЕНЬ: поиски знака, 5 версий логотипа в SVG.

Запуск из корня проекта: python brand/build/build_logo.py
PNG делает render.sh (headless Microsoft Edge).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from glyphs import text_path, fmt  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LOGO = os.path.join(ROOT, "logo")
EXPL = os.path.join(LOGO, "explorations")

# Палитра бренда (те же значения на бренд-доске)
CANVAS = "#F2EDE4"   # тёплая штукатурка
INK = "#26241F"      # графит
OAK = "#B38755"      # дуб
ACCENT = "#B5852E"   # латунь, охра
LASER = "#1FBF5B"    # зелёный луч нивелира
LASER_ON_DARK = "#35D873"

WORD = "ВРОВЕНЬ"
TAGLINE = "РЕМОНТ И МЕБЕЛЬ ПОД КЛЮЧ"


# ---------- знак: сетка 24 × 24, всё на целых модулях ----------

def mark_main(ink, laser):
    """Выбранный знак «Разрез». Стена (ствол буквы В), верхний и нижний
    шкафы (чаши В) и луч уровня между ними, на высоте столешницы."""
    body = (
        "M4 2H8V22H4Z"                                  # стена
        "M8 2H16V10H8ZM10 4V8H14V4Z"                    # верхний шкаф, рамка 2
        "M8 13H19V22H8ZM10 15V20H17V15Z"                # нижний шкаф, глубже
    )
    return (f'<path fill="{ink}" fill-rule="evenodd" d="{body}"/>'
            f'<path fill="{laser}" d="M1 11H23V12H1Z"/>')


def mark_joint(ink, laser):
    """Поиск А «Стык»: плита стены и корпус шкафа, верх корпуса на луче."""
    body = (
        "M3 2H9V22H3Z"
        "M9 9H22V22H9ZM11 11V20H14.5V11ZM16.5 11V20H20V11Z"
    )
    return (f'<path fill="{ink}" fill-rule="evenodd" d="{body}"/>'
            f'<path fill="{laser}" d="M1 7H23V8H1Z"/>')


def mark_vial(ink, laser):
    """Поиск Б «Пузырёк»: колба уровня, пузырёк стоит ровно по центру."""
    body = (
        "M5 7H19A5 5 0 0 1 19 17H5A5 5 0 0 1 5 7Z"
        "M5 9A3 3 0 0 0 5 15H19A3 3 0 0 0 19 9Z"
        "M8.5 9H9.5V15H8.5ZM14.5 9H15.5V15H14.5Z"
    )
    return (f'<path fill="{ink}" fill-rule="nonzero" d="{body}"/>'
            f'<circle fill="{laser}" cx="12" cy="12" r="2"/>')


def svg(w, h, inner, bg=None, title="ВРОВЕНЬ"):
    back = f'<rect width="{fmt(w)}" height="{fmt(h)}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fmt(w)} {fmt(h)}" '
            f'width="{fmt(w)}" height="{fmt(h)}" role="img" aria-label="{title}">'
            f"<title>{title}</title>{back}{inner}</svg>\n")


def g(inner, x, y, s=1.0, fill=None):
    f = f' fill="{fill}"' if fill else ""
    return f'<g transform="translate({fmt(x)} {fmt(y)}) scale({s:.6g})"{f}>{inner}</g>'


WORD_D, WORD_W = text_path(WORD, w=14, tracking=30)
TAG_D, TAG_W = text_path(TAGLINE, w=10, tracking=34, space=110)


def primary(ink, laser, bg=None):
    """Основной: знак сверху, слово, подпись."""
    mark_s = 7.5                         # знак 180 по высоте модуля 24
    pad = 60
    word_s = 1.0
    tag_s = 0.2
    width = max(WORD_W * word_s, TAG_W * tag_s) + pad * 2
    cx = width / 2
    y = pad
    out = g(mark_main(ink, laser), cx - 12 * mark_s, y, mark_s)
    y += 24 * mark_s + 34
    out += g(WORD_D, cx - WORD_W * word_s / 2, y, word_s, ink)
    y += 100 * word_s + 34
    out += g(TAG_D, cx - TAG_W * tag_s / 2, y, tag_s, ink)
    y += 100 * tag_s + pad
    return svg(width, y, out, bg)


def horizontal(ink, laser, bg=None, with_tag=True):
    """Горизонтальный: знак слева, луч знака на высоте средней черты букв."""
    pad = 40
    mark_s = 5.0                         # ствол знака 20 модулей = прописная 100
    word_x = pad + 24 * mark_s + 56
    top = pad
    out = g(mark_main(ink, laser), pad, top - 2 * mark_s, mark_s)
    out += g(WORD_D, word_x, top, 1.0, ink)
    h = top + 100
    if with_tag:
        tag_s = WORD_W / TAG_W           # подпись ровно по ширине слова
        out += g(TAG_D, word_x, top + 100 + 26, tag_s, ink)
        h = top + 100 + 26 + 100 * tag_s
    width = word_x + WORD_W + pad
    return svg(width, h + pad, out, bg)


def mark_only(ink, laser, bg=None):
    return svg(24, 24, mark_main(ink, laser), bg)


def exploration(mark_fn, title):
    mark_s = 10
    width = 520
    out = g(mark_fn(INK, LASER), width / 2 - 120, 40, mark_s)
    ws = 0.62
    out += g(WORD_D, width / 2 - WORD_W * ws / 2, 40 + 240 + 40, ws, INK)
    return svg(width, 40 + 240 + 40 + 62 + 40, out, CANVAS, title)


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def main():
    write(os.path.join(EXPL, "concept-a-joint.svg"), exploration(mark_joint, "Поиск А. Стык"))
    write(os.path.join(EXPL, "concept-b-section.svg"), exploration(mark_main, "Поиск Б. Разрез"))
    write(os.path.join(EXPL, "concept-c-vial.svg"), exploration(mark_vial, "Поиск В. Пузырёк"))

    write(os.path.join(LOGO, "vroven-primary.svg"), primary(INK, LASER))
    write(os.path.join(LOGO, "vroven-horizontal.svg"), horizontal(INK, LASER))
    write(os.path.join(LOGO, "vroven-mark.svg"), mark_only(INK, LASER))
    write(os.path.join(LOGO, "vroven-inverse.svg"), primary(CANVAS, LASER_ON_DARK, bg=INK))
    write(os.path.join(LOGO, "vroven-mono.svg"), primary(INK, INK))
    # для визитки и доски: светлые и тёмные части без фона
    write(os.path.join(LOGO, "vroven-horizontal-inverse.svg"), horizontal(CANVAS, LASER_ON_DARK, bg=INK))
    print("word", round(WORD_W), "tag", round(TAG_W))


if __name__ == "__main__":
    main()
