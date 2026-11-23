#!/usr/bin/env python3
"""
card.py: a clean share card or gallery slide from a title, a line and a screenshot.

Every page you share needs an image: the Open Graph card that X, LinkedIn,
Slack and WhatsApp show under your link, plus the slides of a launch gallery.
Designing each one by hand does not survive a twelve-launch week. This script
makes them from the same template, so a series looks like a series.

Sizes
  og       1200 x 630    link previews (og:image, twitter:image)
  gallery  1270 x 760    Product Hunt gallery slides
  x        1600 x 900    an image post on X or LinkedIn
  square   1080 x 1080   Instagram, LinkedIn carousels

Usage
  pip install pillow
  python3 card.py "Junk" "A scratchpad, one shortcut away" --out junk-og.png
  python3 card.py "Junk" "Free and open source" --shot shots/junk-desktop.jpg --size gallery
  python3 card.py "Day 3 of 12" "Mang" --accent "#10B981" --bg "#0B0F0E" --size x

Design notes
  - One idea per card. If you need a second sentence, you need a second slide.
  - Text sits on a flat colour, never on the screenshot: it stays readable
    when the card is shrunk to a thumbnail in a feed.
  - Use a wide, sturdy font. Condensed fonts look elegant at full size and
    turn to mush at thumbnail size. Pass your own with --font.
  - Keep a safe margin. Platforms crop the edges of previews differently.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SIZES = {'og': (1200, 630), 'gallery': (1270, 760), 'x': (1600, 900), 'square': (1080, 1080)}
FONT_CANDIDATES = [
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',          # macOS
    'C:/Windows/Fonts/arialbd.ttf',                               # Windows
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',       # Linux
    '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
]


def font(path, size):
    for p in [path] + FONT_CANDIDATES:
        if p and Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def readable_on(bg):
    """Pick near-black or white text, whichever contrasts more with bg."""
    r, g, b = [c / 255 for c in bg]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return (24, 20, 18) if lum > 0.5 else (255, 255, 255)


def wrap(draw, text, f, max_w):
    """Break text into lines that fit max_w pixels, on word boundaries."""
    lines, line = [], ''
    for word in text.split():
        test = (line + ' ' + word).strip()
        if draw.textlength(test, font=f) > max_w and line:
            lines.append(line)
            line = word
        else:
            line = test
    return lines + ([line] if line else [])


def fit(draw, text, path, max_w, max_lines, start, floor):
    """Largest font size where the text fits in max_lines lines."""
    size = start
    while size > floor:
        f = font(path, size)
        lines = wrap(draw, text, f, max_w)
        if len(lines) <= max_lines:
            return f, lines
        size -= 4
    f = font(path, floor)
    return f, wrap(draw, text, f, max_w)[:max_lines]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('title')
    ap.add_argument('line', nargs='?', default='')
    ap.add_argument('--size', choices=SIZES, default='og')
    ap.add_argument('--bg', default='#FFF7ED')
    ap.add_argument('--accent', default='#DA552F')
    ap.add_argument('--shot', help='screenshot to place on the right (or bottom on square)')
    ap.add_argument('--logo', help='small square logo, top left')
    ap.add_argument('--footer', default='', help='small text at the bottom, e.g. your domain')
    ap.add_argument('--font')
    ap.add_argument('--out', default='card.png')
    a = ap.parse_args()

    W, H = SIZES[a.size]
    bg, accent = hex_rgb(a.bg), hex_rgb(a.accent)
    ink = readable_on(bg)
    im = Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(im)
    m = round(W * 0.06)                  # safe margin on every side
    square = a.size == 'square'
    text_w = W - 2 * m if (square or not a.shot) else round(W * 0.42)

    if a.shot:
        shot = Image.open(a.shot).convert('RGB')
        if square:
            box = (m, round(H * 0.48), W - m, H - m)
        else:
            box = (m + text_w + m // 2, m, W - m, H - m)
        bw, bh = box[2] - box[0], box[3] - box[1]
        # Cover the box, keeping the top of the screenshot (where the hero is).
        scale = max(bw / shot.width, bh / shot.height)
        shot = shot.resize((round(shot.width * scale), round(shot.height * scale)), Image.LANCZOS).crop((0, 0, bw, bh))
        # Soft shadow, then rounded corners: it reads as a window, not a photo.
        mask = Image.new('L', (bw, bh), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, bw, bh), radius=18, fill=255)
        shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle((box[0] + 6, box[1] + 14, box[2] + 6, box[3] + 14), 18, fill=(0, 0, 0, 70))
        im.paste(shadow.filter(ImageFilter.GaussianBlur(18)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(18)))
        im.paste(shot, box[:2], mask)

    y = m
    if a.logo:
        logo = Image.open(a.logo).convert('RGBA').resize((72, 72), Image.LANCZOS)
        im.paste(logo, (m, y), logo)
        y += 72 + 28
    d.rectangle((m, y, m + 64, y + 8), fill=accent)   # small accent bar, the series signature
    y += 36

    tf, tl = fit(d, a.title, a.font, text_w, 3, round(H * 0.12), 36)
    for ln in tl:
        d.text((m, y), ln, font=tf, fill=ink)
        y += round(tf.size * 1.12)
    if a.line:
        y += round(tf.size * 0.25)
        lf, ll = fit(d, a.line, a.font, text_w, 3, round(tf.size * 0.48), 22)
        for ln in ll:
            d.text((m, y), ln, font=lf, fill=accent)
            y += round(lf.size * 1.3)
    if a.footer:
        ff = font(a.font, 24)
        d.text((m, H - m - 24), a.footer, font=ff, fill=ink)

    im.save(a.out, optimize=True)
    print('saved', a.out, f'{W}x{H}')


if __name__ == '__main__':
    main()
