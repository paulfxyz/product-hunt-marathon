#!/usr/bin/env python3
"""
shots.py: screenshots and animated loops of your live product, on demand.

Gallery images go stale fast. A button gets renamed, a price changes, and the
picture on your launch page no longer matches what people find. During the
Marathon every gallery was checked against the live product. This script makes
that cheap: rerun it after each release and your images are true again.

What it makes, for each URL
  <name>-desktop.jpg        1440 x 900 viewport (2x pixels, sharp on retina)
  <name>-mobile.jpg         390 x 844, a modern phone
  ...-dark.jpg              the same in dark mode, with --dark
  ...-full.jpg              the whole page, top to bottom, with --full
  <name>-scroll.gif / .mp4  a smooth scroll through the page, with --gif
  <name>-live.gif / .mp4    a few seconds of the page as it moves, with --record 4

Usage
  pip install playwright pillow && python3 -m playwright install chromium
  python3 shots.py https://example.com
  python3 shots.py https://example.com https://example.com/pricing --dark --mobile
  python3 shots.py https://example.com --gif --hide ".cookie-banner" --out gallery/
  python3 shots.py https://example.com --record 4 --click "#play"

Tips
  - GIFs get heavy fast. Keep loops under about 8 seconds and 900 px wide, or
    use the MP4 (made when ffmpeg is installed), which is often 10x smaller.
  - --hide removes cookie banners, chat bubbles and anything else that has no
    place in a product shot. Pass several selectors separated by commas.
  - Seed your demo with believable data before shooting. Lorem ipsum reads as
    unfinished; a real-looking list reads as a product.
"""
import argparse
import re
import shutil
import subprocess
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

SIZES = {'desktop': (1440, 900), 'mobile': (390, 844)}


def slug(url):
    s = re.sub(r'^https?://', '', url).strip('/')
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-') or 'page'


def save_jpg(png_bytes, path, max_w=None):
    """Playwright gives PNG. JPG at quality 88 is a fifth of the size and
    looks the same for screenshots with photos or gradients."""
    from io import BytesIO
    im = Image.open(BytesIO(png_bytes)).convert('RGB')
    if max_w and im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    im.save(path, quality=88, optimize=True, progressive=True)


def to_gif(frames, path, fps, width):
    """Assemble frames into a looping GIF. A single shared palette keeps the
    colours from flickering between frames."""
    ims = [f.resize((width, round(f.height * width / f.width)), Image.LANCZOS) for f in frames]
    pal = ims[len(ims) // 2].convert('P', palette=Image.ADAPTIVE, colors=255)
    out = [im.quantize(palette=pal, dither=Image.Dither.NONE) for im in ims]
    out[0].save(path, save_all=True, append_images=out[1:], duration=round(1000 / fps), loop=0, optimize=True)


def to_mp4(frames, path, fps):
    """Same frames as H.264. Ideal for X, LinkedIn and gallery videos."""
    if not shutil.which('ffmpeg'):
        return False
    tmp = Path(path).with_suffix('')
    tmp.mkdir(exist_ok=True)
    for i, f in enumerate(frames):
        f.convert('RGB').save(tmp / f'{i:04d}.png')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', str(tmp / '%04d.png'),
                    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(path)], check=True)
    shutil.rmtree(tmp)
    return True


def grab(page):
    from io import BytesIO
    return Image.open(BytesIO(page.screenshot())).convert('RGB')


def ease(t):
    """Ease in and out, so the scroll starts and stops gently like a person."""
    return t * t * (3 - 2 * t)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('urls', nargs='+')
    ap.add_argument('--out', default='shots')
    ap.add_argument('--dark', action='store_true', help='also shoot dark mode')
    ap.add_argument('--mobile', action='store_true', help='also shoot the phone size')
    ap.add_argument('--full', action='store_true', help='also shoot the full page')
    ap.add_argument('--gif', action='store_true', help='scroll animation (GIF and MP4)')
    ap.add_argument('--record', type=float, default=0, help='seconds of live animation to capture')
    ap.add_argument('--click', help='selector to click before shooting, e.g. "#play"')
    ap.add_argument('--hide', default='', help='comma-separated selectors to hide')
    ap.add_argument('--wait', type=int, default=1200, help='ms to wait for fonts and animations')
    ap.add_argument('--fps', type=int, default=12)
    ap.add_argument('--width', type=int, default=900, help='width of GIFs')
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    schemes = ['light', 'dark'] if a.dark else ['light']
    sizes = ['desktop', 'mobile'] if a.mobile else ['desktop']

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for url in a.urls:
            for scheme in schemes:
                for size in sizes:
                    w, h = SIZES[size]
                    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2,
                                              color_scheme=scheme, is_mobile=size == 'mobile',
                                              reduced_motion='no-preference')
                    page = ctx.new_page()
                    page.goto(url, wait_until='networkidle')
                    if a.hide:
                        page.add_style_tag(content=a.hide + '{display:none!important}')
                    if a.click:
                        page.click(a.click)
                    page.wait_for_timeout(a.wait)
                    name = f'{slug(url)}-{size}' + ('-dark' if scheme == 'dark' else '')
                    save_jpg(page.screenshot(), out / f'{name}.jpg')
                    print('saved', out / f'{name}.jpg')
                    if a.full:
                        save_jpg(page.screenshot(full_page=True), out / f'{name}-full.jpg', max_w=w * 2)
                        print('saved', out / f'{name}-full.jpg')
                    # Animations only once per URL, from the first variant.
                    if scheme == schemes[0] and size == sizes[0]:
                        if a.gif:
                            total = page.evaluate('document.documentElement.scrollHeight - innerHeight')
                            n = max(2, int(a.fps * min(8, 2 + total / 900)))
                            frames = []
                            for i in range(n + a.fps):  # one extra second resting at the end
                                y = round(total * ease(min(1, i / n)))
                                page.evaluate(f'scrollTo(0,{y})')
                                page.wait_for_timeout(40)
                                frames.append(grab(page))
                            to_gif(frames, out / f'{slug(url)}-scroll.gif', a.fps, a.width)
                            to_mp4(frames, out / f'{slug(url)}-scroll.mp4', a.fps)
                            print('saved', out / f'{slug(url)}-scroll.gif')
                            page.evaluate('scrollTo(0,0)')
                        if a.record:
                            frames, t0 = [], time.time()
                            while time.time() - t0 < a.record:
                                frames.append(grab(page))
                                page.wait_for_timeout(round(1000 / a.fps))
                            fps = max(1, round(len(frames) / a.record))  # real rate, so playback speed is true
                            to_gif(frames, out / f'{slug(url)}-live.gif', fps, a.width)
                            to_mp4(frames, out / f'{slug(url)}-live.mp4', fps)
                            print('saved', out / f'{slug(url)}-live.gif')
                    ctx.close()
        browser.close()


if __name__ == '__main__':
    main()
