"""Crops the brand tile out of the source render and writes every shipped size."""
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src/assets/brand/icon-source.png"
OUT = ROOT / "public"
BG = (20, 18, 21)
INK = "#16181D"

FONT_DIR = Path("/usr/share/fonts/truetype")
def font(name, size):
    for candidate in [FONT_DIR / "google-fonts" / name, FONT_DIR / "dejavu" / name]:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def tile() -> Image.Image:
    """The rounded-square mark, cropped square and alpha-masked to its corners."""
    im = Image.open(SRC).convert("RGB")
    arr = np.asarray(im).astype(int)
    mask = np.abs(arr - np.array(BG)).sum(axis=2) > 28
    ys, xs = np.where(mask)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    cropped = im.crop(box)

    # Square it off, then round the corners so the mark sits on any background.
    side = max(cropped.size)
    square = Image.new("RGB", (side, side), BG)
    square.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))

    radius = int(side * 0.184)  # measured off the source render
    alpha = Image.new("L", (side * 4, side * 4), 0)
    ImageDraw.Draw(alpha).rounded_rectangle(
        (0, 0, side * 4 - 1, side * 4 - 1), radius=radius * 4, fill=255
    )
    square.putalpha(alpha.resize((side, side), Image.LANCZOS))
    return square


def save(img: Image.Image, name: str, colors: int = 192, **kw):
    """Palette-quantises before writing, these are flat marks, and 24-bit PNG
    triples the byte size for gradients nobody can see at icon scale."""
    path = OUT / name
    if colors and max(img.size) >= 128:
        method = Image.FASTOCTREE if img.mode == "RGBA" else Image.MEDIANCUT
        img = img.quantize(colors=colors, method=method)
    img.save(path, **kw)
    print(f"  {name:<28} {img.size[0]}x{img.size[1]}  {path.stat().st_size // 1024} KB")


def on_dark(mark: Image.Image, size: int, scale: float) -> Image.Image:
    """Flattens the mark onto the brand background, for contexts with no alpha."""
    canvas = Image.new("RGB", (size, size), INK)
    inner = int(size * scale)
    canvas.paste(mark.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2,) * 2, mark.resize((inner, inner), Image.LANCZOS))
    return canvas


def og_card(mark: Image.Image) -> Image.Image:
    """1200x630 social card: mark, wordmark, and a strip of real palette colours."""
    W, H = 1200, 630
    card = Image.new("RGB", (W, H), INK)
    draw = ImageDraw.Draw(card)

    m = 200
    logo = mark.resize((m, m), Image.LANCZOS)
    card.paste(logo, (96, 150), logo)

    draw.text((330, 172), "Cohesive Colors", font=font("Poppins-Bold.ttf", 58), fill="#F5F3F0")
    draw.text(
        (334, 252),
        "Palettes harmonised with OKLCH colour math",
        font=font("Poppins-Regular.ttf", 27),
        fill="#9AA0A8",
    )
    draw.text(
        (334, 292),
        "3 to 10 swatches  ·  one shared key colour",
        font=font("Poppins-Regular.ttf", 27),
        fill="#9AA0A8",
    )

    # A real cohered palette along the bottom edge.
    swatches = ["#D99140", "#C4472E", "#6D8065", "#8B5C79", "#B45C15", "#9B2D1F", "#2B4B50", "#614C75"]
    y, h = H - 96, 96
    w = W / len(swatches)
    for i, hexcode in enumerate(swatches):
        draw.rectangle((i * w, y, (i + 1) * w, H), fill=hexcode)
    return card


def main():
    OUT.mkdir(exist_ok=True)
    mark = tile()
    print(f"source tile: {mark.size[0]}x{mark.size[1]}")

    # Transparent-corner PNGs — the general-purpose mark.
    for size in (512, 192, 180, 48, 32, 16):
        save(mark.resize((size, size), Image.LANCZOS), f"icon-{size}.png", optimize=True)

    # Apple wants an opaque square and applies its own mask.
    save(on_dark(mark, 180, 0.86), "apple-touch-icon.png", optimize=True)

    # Android maskable: the mark must survive an aggressive circular crop.
    save(on_dark(mark, 512, 0.62), "icon-512-maskable.png", optimize=True)

    save(og_card(mark), "og-image.png", colors=160, optimize=True)

    # Multi-resolution .ico for legacy tabs and Windows pins.
    ico = OUT / "favicon.ico"
    subprocess.run(
        ["convert", str(OUT / "icon-48.png"), "-define", "icon:auto-resize=48,32,16", str(ico)],
        check=True,
    )
    print(f"  {'favicon.ico':<28} 48/32/16     {ico.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
