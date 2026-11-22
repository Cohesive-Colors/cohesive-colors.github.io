"""Builds every launcher, splash and Play Store image from the site's brand source.

    python scripts/generate-assets.py

Source: ../src/assets/brand/icon-source.png (the same render the website uses).
Needs Pillow (`pip install pillow`).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "src" / "assets" / "brand" / "icon-source.png"
OUT = ROOT / "assets"
STORE = ROOT / "store"
BG = (19, 18, 21)          # the render's own background
TILE = 0.735               # rounded tile spans 73.5% of the source square

src = Image.open(SRC).convert("RGB")
OUT.mkdir(exist_ok=True)
STORE.mkdir(exist_ok=True)


def placed(canvas: int, tile_fraction: float, bg=BG, alpha=False) -> Image.Image:
    """The source scaled so its tile covers `tile_fraction` of a square canvas."""
    size = round(canvas * tile_fraction / TILE)
    img = src.resize((size, size), Image.LANCZOS)
    mode, fill = ("RGBA", (0, 0, 0, 0)) if alpha else ("RGB", bg)
    out = Image.new(mode, (canvas, canvas), fill)
    off = (canvas - size) // 2
    if alpha:
        # Keep only the tile: anything close to the background goes transparent.
        rgba = img.convert("RGBA")
        px = rgba.load()
        for y in range(size):
            for x in range(size):
                r, g, b, _ = px[x, y]
                if abs(r - BG[0]) + abs(g - BG[1]) + abs(b - BG[2]) < 24:
                    px[x, y] = (0, 0, 0, 0)
        out.paste(rgba, (off, off), rgba)
    else:
        out.paste(img, (off, off))
    return out


# Legacy / iOS icon: the full render.
src.resize((1024, 1024), Image.LANCZOS).save(OUT / "icon.png")

# Adaptive icon: only the centre 66/108 is guaranteed visible under every mask.
fg = placed(1024, 0.54, alpha=True)
fg.save(OUT / "android-icon-foreground.png")
Image.new("RGB", (1024, 1024), BG).save(OUT / "android-icon-background.png")

# Themed (Material You) icon: the tile's geometry as a single-colour mark —
# four columns plus the overlay band, separated by clear gaps.
mono = Image.new("L", (1024, 1024), 0)
d = ImageDraw.Draw(mono)
side = round(1024 * 0.54)
o = (1024 - side) // 2
d.rounded_rectangle([o, o, o + side, o + side], radius=round(side * 0.184), fill=255)
gap = 14
for i in (1, 2, 3):
    x = o + side * i / 4
    d.rectangle([x - gap / 2, o, x + gap / 2, o + side], fill=0)
for frac in (0.446, 0.541):
    yy = o + side * frac
    d.rectangle([o, yy - gap / 2, o + side, yy + gap / 2], fill=0)
white = Image.new("RGBA", (1024, 1024), (255, 255, 255, 255))
out = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
out.paste(white, (0, 0), mono)
out.save(OUT / "android-icon-monochrome.png")

# Splash mark: the tile without its background.
placed(1024, 0.9, alpha=True).save(OUT / "splash-icon.png")
src.resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png")

# Play Store listing assets.
src.resize((512, 512), Image.LANCZOS).save(STORE / "play-icon-512.png")

W, H = 1024, 500
feat = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(feat)
palettes = [
    ["#ffdcc5", "#e59388", "#a55f42", "#683733"],
    ["#020a14", "#2f1104", "#61001a", "#2f4282", "#20637c", "#bb4d3f", "#c75a8d"],
    ["#55261f", "#294390", "#932d53", "#3981ab", "#dd696f", "#81b7ff", "#ffb1c4", "#c5e4ff"],
]
y = 70
for colors in palettes:
    x0, w = 560, 400
    step = w / len(colors)
    for i, c in enumerate(colors):
        draw.rectangle([x0 + i * step, y, x0 + (i + 1) * step, y + 100], fill=c)
    y += 125
logo = src.resize((170, 170), Image.LANCZOS)
feat.paste(logo, (60, 90))
try:
    font = ImageFont.truetype("DejaVuSans-Bold.ttf", 52)
    small = ImageFont.truetype("DejaVuSans.ttf", 26)
except OSError:
    font = small = ImageFont.load_default()
draw.text((72, 290), "Cohesive", font=font, fill="#f9fafb")
draw.text((72, 350), "Colors", font=font, fill="#f9fafb")
draw.text((74, 420), "Palettes from 3 to 10 colors", font=small, fill="#b5b7bd")
feat.save(STORE / "feature-graphic-1024x500.png")
print("assets written")
