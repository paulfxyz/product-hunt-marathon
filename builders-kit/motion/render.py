"""Render cover.html into an MP4 and a GIF, frame by frame.

The page exposes window.render(t) and window.DUR; this script steps t at a fixed
frame rate, screenshots each frame with Playwright and pipes them to ffmpeg.

  python3 render.py x            # 1600x900 for X  -> out/x.mp4, out/x.gif
  python3 render.py li           # 1080x1350 for LinkedIn
  python3 render.py x --still 2,15,18.5   # just a few PNG frames to check layout
"""
import argparse, asyncio, pathlib, subprocess
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
SIZES = {"x": (1600, 900), "li": (1080, 1350)}
GIF_SCALE = {"x": "800:450", "li": "600:750"}

async def main(a):
    w, h = SIZES[a.format]; out = HERE / "out"; out.mkdir(exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": w, "height": h})
        await pg.goto((HERE / "cover.html").as_uri() + f"?f={a.format}")
        await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(800)
        if a.still:
            for t in a.still.split(","):
                await pg.evaluate(f"render({t})"); await pg.screenshot(path=str(out / f"{a.format}_{t}.png"))
            return
        mp4 = out / f"{a.format}.mp4"; n = int(await pg.evaluate("DUR") * a.fps)
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(a.fps), "-i", "-",
                               "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(mp4)],
                              stdin=subprocess.PIPE)
        for i in range(n):
            await pg.evaluate(f"render({i / a.fps})"); ff.stdin.write(await pg.screenshot(type="png"))
        ff.stdin.close(); ff.wait(); await b.close()
    pal, gif, s = out / "palette.png", out / f"{a.format}.gif", GIF_SCALE[a.format]
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp4), "-vf", f"fps=15,scale={s}:flags=lanczos,palettegen=stats_mode=diff", str(pal)], check=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp4), "-i", str(pal), "-lavfi",
                    f"fps=15,scale={s}:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle", "-loop", "0", str(gif)], check=True)
    pal.unlink(); print(mp4, gif)

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("format", choices=SIZES); ap.add_argument("--fps", type=int, default=30); ap.add_argument("--still")
    asyncio.run(main(ap.parse_args()))
