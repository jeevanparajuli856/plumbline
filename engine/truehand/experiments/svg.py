"""Tiny SVG chart helpers so the figures need no plotting dependency."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from html import escape

import numpy as np

from truehand.experiments.report import LABEL
from truehand.model import FloatArray

WIDTH, HEIGHT = 720, 420
MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM = 70, 170, 60, 70
PALETTE = ("#1f4e79", "#c0504d", "#4f8a3a", "#8064a2", "#e08a1e", "#2a9d8f", "#6b6b6b")
FONT = "font-family='system-ui, sans-serif'"
TICKS = 5


def _text(
    x: float, y: float, content: str, size: int = 12, anchor: str = "start", extra: str = ""
) -> str:
    return (
        f"<text x='{x:.1f}' y='{y:.1f}' font-size='{size}' text-anchor='{anchor}' {FONT} {extra}>"
        f"{escape(content)}</text>"
    )


def document(title: str, body: list[str]) -> str:
    header = [
        f"<svg xmlns='http://www.w3.org/2000/svg' width='{WIDTH}' height='{HEIGHT}' "
        f"viewBox='0 0 {WIDTH} {HEIGHT}' role='img' aria-label='{escape(title)}'>",
        f"<title>{escape(title)}</title>",
        f"<rect width='{WIDTH}' height='{HEIGHT}' fill='white'/>",
        _text(MARGIN_LEFT, 24, title, 15, extra="font-weight='600'"),
        _text(MARGIN_LEFT, 42, f"Simulated. {LABEL}", 11, extra="fill='#a33'"),
    ]
    return "\n".join([*header, *body, "</svg>"]) + "\n"


def _plot_box() -> tuple[float, float, float, float]:
    return (
        MARGIN_LEFT,
        MARGIN_TOP,
        WIDTH - MARGIN_LEFT - MARGIN_RIGHT,
        HEIGHT - MARGIN_TOP - MARGIN_BOTTOM,
    )


def _axes(y_max: float, y_label: str, y_min: float = 0.0) -> list[str]:
    x0, y0, w, h = _plot_box()
    parts = [
        f"<line x1='{x0}' y1='{y0 + h}' x2='{x0 + w}' y2='{y0 + h}' stroke='#333'/>",
        f"<line x1='{x0}' y1='{y0}' x2='{x0}' y2='{y0 + h}' stroke='#333'/>",
    ]
    for i in range(TICKS + 1):
        value = y_min + (y_max - y_min) * i / TICKS
        y = y0 + h - h * i / TICKS
        parts.append(f"<line x1='{x0 - 4}' y1='{y:.1f}' x2='{x0 + w}' y2='{y:.1f}' stroke='#eee'/>")
        parts.append(_text(x0 - 8, y + 4, f"{value:g}", 10, "end"))
    parts.append(
        _text(16, y0 + h / 2, y_label, 11, "middle", f"transform='rotate(-90 16 {y0 + h / 2:.1f})'")
    )
    return parts


def _legend(names: Sequence[str]) -> list[str]:
    x = WIDTH - MARGIN_RIGHT + 14
    parts = []
    for i, name in enumerate(names):
        y = MARGIN_TOP + 10 + 18 * i
        parts.append(
            f"<rect x='{x}' y='{y - 9}' width='10' height='10' fill='{PALETTE[i % len(PALETTE)]}'/>"
        )
        parts.append(_text(x + 16, y, name, 11))
    return parts


def bar_chart(
    title: str,
    categories: Sequence[str],
    series: Mapping[str, Sequence[float]],
    y_label: str,
    y_max: float,
) -> str:
    x0, y0, w, h = _plot_box()
    body = _axes(y_max, y_label)
    group = w / max(len(categories), 1)
    bar = group * 0.8 / max(len(series), 1)
    for s, values in enumerate(series.values()):
        for c, value in enumerate(values):
            bar_h = h * min(value, y_max) / y_max
            x = x0 + c * group + group * 0.1 + s * bar
            body.append(
                f"<rect x='{x:.1f}' y='{y0 + h - bar_h:.1f}' width='{bar * 0.92:.1f}' "
                f"height='{bar_h:.1f}' fill='{PALETTE[s % len(PALETTE)]}'/>"
            )
            body.append(_text(x + bar * 0.46, y0 + h - bar_h - 3, f"{value:.1f}", 9, "middle"))
    for c, name in enumerate(categories):
        body.append(_text(x0 + c * group + group / 2, y0 + h + 16, name, 10, "middle"))
    return document(title, body + _legend(list(series)))


def line_chart(
    title: str,
    xs: Sequence[float],
    series: Mapping[str, Sequence[float]],
    x_label: str,
    y_label: str,
    y_min: float,
    y_max: float,
) -> str:
    x0, y0, w, h = _plot_box()
    body = _axes(y_max, y_label, y_min)
    lo, hi = min(xs), max(xs)
    span = (hi - lo) or 1.0

    def point(x: float, y: float) -> str:
        return f"{x0 + w * (x - lo) / span:.1f},{y0 + h - h * (y - y_min) / (y_max - y_min):.1f}"

    for s, ys in enumerate(series.values()):
        color = PALETTE[s % len(PALETTE)]
        body.append(
            f"<polyline fill='none' stroke='{color}' stroke-width='2' "
            f"points='{' '.join(point(x, y) for x, y in zip(xs, ys, strict=True))}'/>"
        )
    for x in xs:
        body.append(_text(x0 + w * (x - lo) / span, y0 + h + 16, f"{x:g}", 10, "middle"))
    body.append(_text(x0 + w / 2, y0 + h + 40, x_label, 11, "middle"))
    return document(title, body + _legend(list(series)))


def heatmap(title: str, matrix: FloatArray, labels: Sequence[str], value_label: str) -> str:
    x0, y0 = MARGIN_LEFT + 30, MARGIN_TOP
    size = min(WIDTH - x0 - MARGIN_RIGHT, HEIGHT - y0 - 20)
    cell = size / len(labels)
    scaled = np.log10(np.maximum(matrix, 1e-6))
    lo, hi = float(scaled.min()), float(scaled.max())
    body = []
    for i in range(len(labels)):
        for j in range(len(labels)):
            t = (scaled[i, j] - lo) / ((hi - lo) or 1.0)
            shade = int(255 * (1 - t))
            body.append(
                f"<rect x='{x0 + j * cell:.1f}' y='{y0 + i * cell:.1f}' width='{cell:.2f}' "
                f"height='{cell:.2f}' fill='rgb({shade},{shade},255)'/>"
            )
        body.append(_text(x0 - 4, y0 + i * cell + cell * 0.75, labels[i], 6, "end"))
    body.append(_text(WIDTH - MARGIN_RIGHT + 14, MARGIN_TOP + 10, value_label, 11))
    body.append(_text(WIDTH - MARGIN_RIGHT + 14, MARGIN_TOP + 28, f"white = {10**lo:.1e}", 10))
    body.append(_text(WIDTH - MARGIN_RIGHT + 14, MARGIN_TOP + 44, f"blue = {10**hi:.1f}", 10))
    return document(title, body)
