"""Надписи логотипа ВРОВЕНЬ в кривых шрифта Forum (Denis Masharov, OFL 1.1).

Шрифт лежит рядом: fonts/Forum-Regular.ttf, лицензия fonts/OFL.txt.
Контуры берутся из TTF через fontTools (python -m pip install --user fonttools),
поэтому SVG остаётся чистыми кривыми: без <text> и без установленного шрифта.

Система координат кегля: верх прописной y=0, базовая линия y=100
(высота прописной Forum 660 единиц из 1000 = 100). Круглые буквы
чуть выходят за 0 и 100 (компенсация свисания), это нормально.
"""

import os

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

CAP = 100.0
FONT_PATH = os.path.join(os.path.dirname(__file__), "fonts", "Forum-Regular.ttf")

_font = None


def font():
    global _font
    if _font is None:
        _font = TTFont(FONT_PATH)
    return _font


def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def text_path(text, tracking, space=None):
    """Строка прописными в один path Forum.

    tracking: разрядка между буквами в единицах кегля (прописная = 100).
    space: ширина пробела в тех же единицах (по умолчанию пробел шрифта).
    Возвращает (d, ширина): контур сдвинут так, что краска первой буквы
    начинается в x=0, а ширина считается по краске последней буквы,
    без её правого полуапроша, чтобы подпись выравнивалась ровно по слову.
    """
    f = font()
    cap = f["OS/2"].sCapHeight
    k = CAP / cap
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    hmtx = f["hmtx"]

    pen = SVGPathPen(gs, ntos=fmt)
    bounds = BoundsPen(gs)
    x = 0.0
    for i, ch in enumerate(text):
        name = cmap[ord(ch)]
        adv = hmtx[name][0] * k
        if ch == " ":
            x += (space if space is not None else adv) + tracking
            continue
        # шрифт: y вверх от базовой линии; кегль: y вниз от верха прописной
        t = (k, 0, 0, -k, x, CAP)
        gs[name].draw(TransformPen(pen, t))
        gs[name].draw(TransformPen(bounds, t))
        x += adv + (tracking if i < len(text) - 1 else 0)
    x0, _, x1, _ = bounds.bounds
    d = pen.getCommands()
    return f'<path transform="translate({fmt(-x0)} 0)" d="{d}"/>', x1 - x0
