"""Рендер PNG и PDF через headless Microsoft Edge (уже стоит в Windows).

python brand/build/render.py png <file.svg> <out.png> <width> [bg]
python brand/build/render.py pdf <page.html> <out.pdf>
python brand/build/render.py shot <page.html> <out.png> <width> <height>
"""

import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]


def edge():
    for p in EDGE_CANDIDATES:
        if os.path.exists(p):
            return p
    raise SystemExit("Microsoft Edge не найден")


def run(args, out):
    """Edge-лаунчер возвращается раньше, чем файл записан: ждём файл."""
    out = Path(out)
    if out.exists():
        out.unlink()
    profile = tempfile.mkdtemp(prefix="vroven-edge-")
    cmd = [edge(), "--headless=new", "--disable-gpu", "--hide-scrollbars",
           "--no-first-run", "--no-default-browser-check",
           f"--user-data-dir={profile}"] + args
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    last = -1
    for _ in range(300):
        time.sleep(0.2)
        if out.exists():
            size = out.stat().st_size
            if size > 0 and size == last:
                return
            last = size
    raise SystemExit(f"Edge не создал {out}")


def png(svg_path, out, width, bg=None):
    svg_path = Path(svg_path).resolve()
    text = svg_path.read_text(encoding="utf-8")
    m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', text)
    vw, vh = float(m.group(1)), float(m.group(2))
    height = round(width * vh / vw)
    page = Path(tempfile.mkdtemp(prefix="vroven-png-")) / "page.html"
    background = bg or "transparent"
    page.write_text(
        "<!doctype html><meta charset='utf-8'><style>html,body{margin:0;background:"
        f"{background}}}img{{display:block;width:{width}px;height:{height}px}}</style>"
        f"<img src='{svg_path.as_uri()}'>", encoding="utf-8")
    args = [f"--screenshot={Path(out).resolve()}", f"--window-size={width},{height}"]
    if not bg:
        args.append("--default-background-color=00000000")
    run(args + [page.as_uri()], out)


def pdf(html_path, out):
    run([f"--print-to-pdf={Path(out).resolve()}", "--no-pdf-header-footer",
         "--virtual-time-budget=8000", Path(html_path).resolve().as_uri()], out)


def shot(html_path, out, width, height):
    """Скриншот HTML-страницы (бренд-доска, проверка визитки)."""
    run([f"--screenshot={Path(out).resolve()}", f"--window-size={width},{height}",
         "--virtual-time-budget=8000", Path(html_path).resolve().as_uri()], out)


if __name__ == "__main__":
    kind = sys.argv[1]
    if kind == "png":
        png(sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5] if len(sys.argv) > 5 else None)
    elif kind == "pdf":
        pdf(sys.argv[2], sys.argv[3])
    elif kind == "shot":
        shot(sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]))
