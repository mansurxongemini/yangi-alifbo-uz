"""Android ikonka va splash rasmlarini brend logotipidan yasaydi (build/icon.png, build/android/*)."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
full = Image.open(ROOT / 'build' / 'icon.png').convert('RGBA')
fg = Image.open(ROOT / 'build' / 'android' / 'ic_launcher_foreground.png').convert('RGBA')

LEGACY = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
FORE = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}

def circle(img):
    mask = Image.new('L', img.size, 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).ellipse((0, 0, img.size[0] - 1, img.size[1] - 1), fill=255)
    bg = Image.new('RGBA', img.size, (11, 106, 148, 255))
    bg.alpha_composite(fg.resize(img.size, Image.LANCZOS))
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(bg, (0, 0), mask)
    return out

for d, s in LEGACY.items():
    folder = RES / f'mipmap-{d}'
    full.resize((s, s), Image.LANCZOS).save(folder / 'ic_launcher.png')
    circle(Image.new('RGBA', (s, s))).save(folder / 'ic_launcher_round.png')
    fg.resize((FORE[d], FORE[d]), Image.LANCZOS).save(folder / 'ic_launcher_foreground.png')

# Moslashuvchan ikonka foni — brend rangi
(RES / 'values' / 'ic_launcher_background.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0B6A94</color>\n</resources>\n')

# Splash: och fon markazida logotip
for p in RES.glob('drawable*/splash.png'):
    w, h = Image.open(p).size
    canvas = Image.new('RGBA', (w, h), (244, 246, 248, 255))
    s = int(min(w, h) * 0.28)
    canvas.alpha_composite(full.resize((s, s), Image.LANCZOS), ((w - s) // 2, (h - s) // 2))
    canvas.convert('RGB').save(p)
print('ok')
