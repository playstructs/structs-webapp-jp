"""Japanese victory and defeat banners for structs-webapp's Lottie animations.

webapp's banners (public/lottie/{victory,defeat}-banner) are 28 pixel-art
frames of 96x32: a flash, a box opening, the word (clean frames and glitch
frames), the box closing. Only the frames with letters are redrawn here:

  - the clean frame is the original with its letters replaced by 勝利 or 敗北,
    set in Galmuri11 (the pixel face the site serves) at its 12px grid and
    drawn twice as wide, like webapp's wide pixel face;
  - each glitch frame is the original's distortion, measured row by row
    against the clean original (sideways shifts of the band, blanked rows,
    dimmed pixels), applied to the Japanese clean frame.

The frames go to ja/public/lottie/, which the build serves over webapp's at
the same paths. banners.json records the upstream frames they were drawn
from; ja/audit.cjs reports them as stale if upstream redraws its banners.

    python3 -m pip install pillow fonttools brotli
    python3 ja/art/banners.py
"""
import hashlib
import io
import json
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
UPSTREAM = ROOT / "structs-webapp/src/public/lottie"
OUT = ROOT / "ja/public/lottie"
FONT = ROOT / "ja/public/ja/fonts/Galmuri11.woff2"
RECORD = Path(__file__).with_name("banners.json")

# The box's inside, where the letters are.
BOX_LEFT, BOX_RIGHT = 16, 80
BAND_TOP, BAND_BOTTOM = 10, 22
MAX_SHIFT = 8

BANNERS = {
    "victory-banner": {"word": "勝利", "clean": 13, "frames": range(11, 21)},
    "defeat-banner": {"word": "敗北", "clean": 14, "frames": range(12, 21)},
}


# webapp's banner face is twice as wide as it is tall: so is ours.
STRETCH = 2
GAP = 4


def face():
    """Galmuri11 at its own pixel size, from the woff2 the site serves."""
    font = TTFont(FONT)
    font.flavor = None
    ttf = io.BytesIO()
    font.save(ttf)
    ttf.seek(0)
    return ImageFont.truetype(ttf, 12)


def word_bitmap(word):
    """The word's characters side by side; True is ink."""
    font = face()
    glyphs = []
    for char in word:
        image = Image.new("1", (24, 24), 0)
        ImageDraw.Draw(image).text((4, 4), char, font=font, fill=1)
        glyphs.append(image)
    boxes = [glyph.getbbox() for glyph in glyphs]
    top, bottom = min(box[1] for box in boxes), max(box[3] for box in boxes)
    rows = [[] for _ in range(top, bottom)]
    for index, (glyph, box) in enumerate(zip(glyphs, boxes)):
        for y in range(top, bottom):
            if index:
                rows[y - top] += [False] * GAP
            for x in range(box[0], box[2]):
                rows[y - top] += [bool(glyph.getpixel((x, y)))] * STRETCH
    return rows


def palette(frame):
    """Band background, ink and the dimmed ink of a clean frame."""
    pixels = frame.load()
    counts = {}
    for y in range(BAND_TOP, BAND_BOTTOM):
        for x in range(BOX_LEFT, BOX_RIGHT):
            counts[pixels[x, y]] = counts.get(pixels[x, y], 0) + 1
    background, ink = sorted(counts, key=counts.get, reverse=True)[:2]
    dim = tuple((a + b) // 2 for a, b in zip(ink[:3], background[:3])) + (255,)
    return background, ink, dim


def japanese_clean(original, bitmap, background, ink):
    frame = original.copy()
    pixels = frame.load()
    for y in range(BAND_TOP, BAND_BOTTOM):
        for x in range(BOX_LEFT, BOX_RIGHT):
            pixels[x, y] = background
    height, width = len(bitmap), len(bitmap[0])
    left = BOX_LEFT + (BOX_RIGHT - BOX_LEFT - width) // 2
    top = BAND_TOP + (BAND_BOTTOM - BAND_TOP - height) // 2
    for y, row in enumerate(bitmap):
        for x, on in enumerate(row):
            if on:
                pixels[left + x, top + y] = ink
    return frame


def row(frame, y):
    pixels = frame.load()
    return [pixels[x, y] for x in range(frame.width)]


def shifted(clean_row, shift, background):
    """The band row moved sideways, as webapp's glitches move it."""
    out = list(clean_row)
    transparent = (0, 0, 0, 0)
    for x in range(BOX_LEFT, BOX_RIGHT):
        out[x] = transparent if clean_row[x] == transparent else background
    for x in range(BOX_LEFT, BOX_RIGHT):
        target = x + shift
        if 0 <= target < len(out):
            out[target] = clean_row[x]
    return out


def measure(glitch, clean, background, ink):
    """Per band row: ('blank',) or ('shift', s), and the dimmed pixels."""
    rows = {}
    for y in range(BAND_TOP, BAND_BOTTOM):
        glitch_row, clean_row = row(glitch, y), row(clean, y)
        has_ink = any(pixel == ink for pixel in glitch_row)
        if not has_ink and any(pixel == ink for pixel in clean_row):
            rows[y] = ("blank",)
            continue
        best = min(
            range(-MAX_SHIFT, MAX_SHIFT + 1),
            key=lambda s: (sum(a != b for a, b in zip(shifted(clean_row, s, background), glitch_row)), abs(s)),
        )
        rows[y] = ("shift", best)
    return rows


def apply(rows, japanese, glitch, background, ink, dim):
    frame = glitch.copy()
    pixels = frame.load()
    glitch_pixels = glitch.load()
    for y, (kind, *args) in rows.items():
        japanese_row = row(japanese, y)
        if kind == "blank":
            new = [background if BOX_LEFT <= x < BOX_RIGHT else pixel for x, pixel in enumerate(japanese_row)]
        else:
            new = shifted(japanese_row, args[0], background)
            # Where the original's band reached past the box, so does ours.
            for x, pixel in enumerate(row(glitch, y)):
                if pixel != (0, 0, 0, 0) and new[x] == (0, 0, 0, 0):
                    new[x] = background
        for x, pixel in enumerate(new):
            pixels[x, y] = pixel
            # The original's dimmed pixels land on our ink where it is there.
            if glitch_pixels[x, y] not in (ink, background, (0, 0, 0, 0)) and pixel == ink:
                pixels[x, y] = dim
    return frame


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    record = {}
    for name, banner in BANNERS.items():
        source = UPSTREAM / name / "images"
        target = OUT / name / "images"
        target.mkdir(parents=True, exist_ok=True)
        clean = Image.open(source / f"img_{banner['clean']}.png").convert("RGBA")
        background, ink, dim = palette(clean)
        japanese = japanese_clean(clean, word_bitmap(banner["word"]), background, ink)
        for index in banner["frames"]:
            path = source / f"img_{index}.png"
            original = Image.open(path).convert("RGBA")
            rows = measure(original, clean, background, ink)
            apply(rows, japanese, original, background, ink, dim).save(target / path.name)
            record[f"public/lottie/{name}/images/{path.name}"] = sha256(path)
    RECORD.write_text(json.dumps(record, indent=2) + "\n")
    print(f"wrote {len(record)} frames")


if __name__ == "__main__":
    main()
