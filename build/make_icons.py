"""Brend logotipidan (public/logo.svg) barcha platformalar uchun ikonka yasaydi.
Ishlatish: python3 build/make_icons.py   (Chrome + Playwright + Pillow kerak)"""
import asyncio, io
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
SVG = (ROOT / 'public' / 'logo.svg').read_text()
ACCENT = '#0B6A94'


async def render(svg: str, size: int) -> Image.Image:
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/bin/google-chrome')
        pg = await b.new_page(viewport={'width': size, 'height': size})
        await pg.set_content(f'<html><body style="margin:0;background:transparent">{svg.replace("<svg ", f"<svg width=\"{size}\" height=\"{size}\" ", 1)}</body></html>')
        png = await pg.screenshot(omit_background=True)
        await b.close()
    return Image.open(io.BytesIO(png)).convert('RGBA')


async def main():
    full = await render(SVG, 1024)
    full.save(ROOT / 'build' / 'icon.png')
    full.save(ROOT / 'build' / 'icon.ico', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    icons = ROOT / 'build' / 'icons'
    icons.mkdir(exist_ok=True)
    for s in (16, 32, 48, 64, 128, 256, 512, 1024):
        full.resize((s, s), Image.LANCZOS).save(icons / f'{s}x{s}.png')

    # Android: moslashuvchan ikonka uchun oldingi qatlam (faqat oq «Ö», shaffof fon)
    fg_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <g transform="translate(256 256) scale(0.62) translate(-256 -256)">
      <circle cx="256" cy="296" r="102" fill="none" stroke="#fff" stroke-width="50"/>
      <circle cx="206" cy="130" r="30" fill="#fff"/><circle cx="306" cy="130" r="30" fill="#fff"/></g></svg>'''
    fg = await render(fg_svg, 432)
    (ROOT / 'build' / 'android').mkdir(exist_ok=True)
    fg.save(ROOT / 'build' / 'android' / 'ic_launcher_foreground.png')
    full.resize((512, 512), Image.LANCZOS).save(ROOT / 'build' / 'android' / 'ic_launcher.png')
    print('ok')

asyncio.run(main())
