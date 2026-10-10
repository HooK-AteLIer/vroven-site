"""Геометрический гротеск для логотипа ВРОВЕНЬ, построенный из прямых и дуг.

Буквы рисуются в системе координат кегля: верх прописной y=0, базовая линия y=100.
Каждая буква собирается из заливаемых контуров (правило nonzero): внешние контуры
идут по часовой стрелке, внутренние (просветы) против. Так перекрытия сливаются
в одну фигуру без шрифта, а SVG остаётся чистыми кривыми для печати и вывески.
"""

import math

CAP = 100.0


def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def rect(x, y, w, h):
    return f"M{fmt(x)} {fmt(y)}H{fmt(x + w)}V{fmt(y + h)}H{fmt(x)}Z"


def polygon(points):
    area = 0.0
    for i, (x1, y1) in enumerate(points):
        x2, y2 = points[(i + 1) % len(points)]
        area += x1 * y2 - x2 * y1
    if area < 0:  # нужен обход по часовой стрелке (в экранных координатах)
        points = list(reversed(points))
    head = f"M{fmt(points[0][0])} {fmt(points[0][1])}"
    return head + "".join(f"L{fmt(x)} {fmt(y)}" for x, y in points[1:]) + "Z"


def bowl(x0, top, bottom, right, w):
    """Чаша как у Р, В, Ь, Б: две горизонтали и полукруг справа, с просветом."""
    r_out = (bottom - top) / 2
    cx = right - r_out
    r_in = r_out - w
    outer = (f"M{fmt(x0)} {fmt(top)}H{fmt(cx)}"
             f"A{fmt(r_out)} {fmt(r_out)} 0 0 1 {fmt(cx)} {fmt(bottom)}H{fmt(x0)}Z")
    inner = (f"M{fmt(x0 + w)} {fmt(top + w)}V{fmt(bottom - w)}H{fmt(cx)}"
             f"A{fmt(r_in)} {fmt(r_in)} 0 0 0 {fmt(cx)} {fmt(top + w)}Z")
    return outer + inner


def ring(cx, cy, rx, ry, w_h, w_v):
    outer = (f"M{fmt(cx - rx)} {fmt(cy)}A{fmt(rx)} {fmt(ry)} 0 1 1 {fmt(cx + rx)} {fmt(cy)}"
             f"A{fmt(rx)} {fmt(ry)} 0 1 1 {fmt(cx - rx)} {fmt(cy)}Z")
    irx, iry = rx - w_h, ry - w_v
    inner = (f"M{fmt(cx - irx)} {fmt(cy)}A{fmt(irx)} {fmt(iry)} 0 1 0 {fmt(cx + irx)} {fmt(cy)}"
             f"A{fmt(irx)} {fmt(iry)} 0 1 0 {fmt(cx - irx)} {fmt(cy)}Z")
    return outer + inner


def diagonal(x_top, x_bottom, w):
    """Наклонный штрих постоянной толщины w от верха (y=0) до базовой линии."""
    dx = x_bottom - x_top
    t = w * math.hypot(dx, CAP) / CAP  # горизонтальная ширина штриха
    return polygon([(x_top - t / 2, 0), (x_top + t / 2, 0),
                    (x_bottom + t / 2, CAP), (x_bottom - t / 2, CAP)])


def stroke(x0, y0, x1, y1, w):
    """Наклонный штрих толщины w между двумя уровнями, концы срезаны горизонтально."""
    t = w * math.hypot(x1 - x0, y1 - y0) / abs(y1 - y0)
    return polygon([(x0 - t / 2, y0), (x0 + t / 2, y0), (x1 + t / 2, y1), (x1 - t / 2, y1)]), t


# Тип боковой стороны буквы для межбуквенного просвета:
# S прямая вертикаль, R круглая, O открытая (Т, Е справа), D диагональ.
SIDE = {"S": 1.0, "R": 0.78, "O": 0.5, "D": 0.7}


def glyph(ch, w):
    """Возвращает (path, ширина, левая сторона, правая сторона)."""
    mid = CAP / 2
    if ch == "Н":
        W = 72
        return rect(0, 0, w, CAP) + rect(W - w, 0, w, CAP) + rect(0, mid - w / 2, W, w), W, "S", "S"
    if ch == "Е":
        W = 54
        return (rect(0, 0, w, CAP) + rect(0, 0, W, w) + rect(0, mid - w / 2, W - 5, w)
                + rect(0, CAP - w, W, w)), W, "S", "O"
    if ch == "Т":
        W = 62
        return rect(0, 0, W, w) + rect(W / 2 - w / 2, 0, w, CAP), W, "O", "O"
    if ch == "Р":
        W = 62
        return rect(0, 0, w, CAP) + bowl(0, 0, 56, W, w), W, "S", "R"
    if ch == "В":
        W = 64
        return (rect(0, 0, w, CAP) + bowl(0, 0, mid + w / 2, W - 6, w)
                + bowl(0, mid - w / 2, CAP, W, w)), W, "S", "R"
    if ch == "Ь":
        W = 60
        return rect(0, 0, w, CAP) + bowl(0, mid - w / 2 - 4, CAP, W, w), W, "S", "R"
    if ch == "Б":
        W = 62
        return (rect(0, 0, w, CAP) + rect(0, 0, W - 6, w)
                + bowl(0, mid - w / 2 - 4, CAP, W, w)), W, "S", "R"
    if ch == "О":
        W = 102
        return ring(W / 2, mid, W / 2, mid + 1.6, w * 1.1, w * 0.98), W, "R", "R"
    if ch == "И":
        W = 72
        return (rect(0, 0, w, CAP) + rect(W - w, 0, w, CAP)
                + diagonal(W - w / 2, w / 2, w * 0.92)), W, "S", "S"
    if ch == "М":
        W = 86
        d = w * 0.92
        return (rect(0, 0, w, CAP) + rect(W - w, 0, w, CAP)
                + diagonal(w / 2, W / 2, d) + diagonal(W - w / 2, W / 2, d)), W, "S", "S"
    if ch == "Л":
        W = 68
        foot = 0
        top_x = 16
        return (rect(W - w, 0, w, CAP) + rect(top_x, 0, W - top_x, w)
                + diagonal(top_x + w / 2, foot + w / 2, w)), W, "D", "S"
    if ch == "П":
        W = 68
        return rect(0, 0, w, CAP) + rect(W - w, 0, w, CAP) + rect(0, 0, W, w), W, "S", "S"
    if ch == "Д":
        # треугольник как у Л, основание с выносными ножками под строку
        W = 76
        top_x = 18
        right = W - 6
        drop = 14
        leg, _ = stroke(top_x + w / 2, 0, 6 + w / 2, CAP, w)
        return (rect(right - w, 0, w, CAP) + rect(top_x, 0, right - top_x, w) + leg
                + rect(0, CAP - w, W, w) + rect(0, CAP, w, drop)
                + rect(W - w, CAP, w, drop)), W, "S", "S"
    if ch == "К":
        W = 62
        d = w * 0.92
        _, t = stroke(0, 0, W, mid, d)
        j = w + t * 0.15                 # узел ветвей у ствола
        up, _ = stroke(j, mid, W - t / 2, 0, d)
        down, _ = stroke(j, mid, W - t / 2, CAP, d)
        return rect(0, 0, w, CAP) + up + down, W, "S", "D"
    if ch == "Ю":
        ring_w = 84
        gap = 12
        W = w + gap + ring_w
        return (rect(0, 0, w, CAP) + rect(0, mid - w / 2, w + gap + w, w)
                + ring(w + gap + ring_w / 2, mid, ring_w / 2, mid + 1.6, w * 1.1, w * 0.98)), W, "S", "R"
    if ch == "Ч":
        W = 64
        r = 14                           # внутренний радиус скругления
        bar_bottom = 60
        yc = bar_bottom - w - r
        cx = w + r
        hook = (f"M0 0H{fmt(w)}V{fmt(yc)}A{fmt(r)} {fmt(r)} 0 0 0 {fmt(cx)} {fmt(yc + r)}"
                f"H{fmt(W - w)}V{fmt(bar_bottom)}H{fmt(cx)}"
                f"A{fmt(r + w)} {fmt(r + w)} 0 0 1 0 {fmt(yc)}Z")
        return hook + rect(W - w, 0, w, CAP), W, "S", "S"
    raise ValueError(f"нет буквы {ch!r}")


def text_path(text, w, tracking, space=34):
    """Набирает строку в контуры. Возвращает (d, ширина) в единицах кегля 100."""
    x = 0.0
    parts = []
    prev_right = None
    for ch in text:
        if ch == " ":
            x += space
            prev_right = None
            continue
        d, W, left, right = glyph(ch, w)
        if prev_right is not None:
            x += tracking * (SIDE[prev_right] + SIDE[left]) / 2
        parts.append(f'<path transform="translate({fmt(x)} 0)" d="{d}"/>')
        x += W
        prev_right = right
    return "".join(parts), x
