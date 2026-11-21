"""Generate simple PNG home-screen icons without third-party dependencies."""

from pathlib import Path
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parent.parent / "public"
POINTS = [(78, 261), (161, 261), (195, 192), (246, 333), (289, 241), (315, 275), (434, 275)]
BACKGROUND = (23, 107, 145)


def distance_to_segment(x, y, start, end):
    x1, y1 = start
    x2, y2 = end
    dx, dy = x2 - x1, y2 - y1
    t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def make_icon(size, filename):
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            logical_x = (x + 0.5) * 512 / size
            logical_y = (y + 0.5) * 512 / size
            distance = min(distance_to_segment(logical_x, logical_y, a, b) for a, b in zip(POINTS, POINTS[1:]))
            coverage = max(0, min(1, 15.5 - distance))
            row.extend(round(channel * (1 - coverage) + 255 * coverage) for channel in BACKGROUND)
        rows.append(bytes(row))
    raw = b"".join(rows)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    (ROOT / filename).write_bytes(png)


for dimension, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
    make_icon(dimension, name)
