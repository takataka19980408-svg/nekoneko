#!/usr/bin/env python3
"""assets/cats-walk の全画像を、実際の紙色に重ねて一覧にする（目視チェック用）。

    python3 tools/walk-sheet.py [out.png] [types...]
"""
import glob
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "cats-walk")
POSES = ["walk-1", "walk-2", "rest"]


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "tmp", "walk-sheet.png")
    only = sys.argv[2:]
    types = sorted({os.path.basename(p).rsplit("-", 1)[0].replace("-walk", "") for p in glob.glob(os.path.join(OUT, "*.png"))})
    types = sorted({os.path.basename(p).replace("-walk-1.png", "").replace("-walk-2.png", "").replace("-rest.png", "")
                    for p in glob.glob(os.path.join(OUT, "*.png"))})
    if only:
        types = [t for t in types if t in only]
    cell, gap, lab = 200, 6, 16
    cols = len(POSES)
    W = cols * (cell + gap) + gap
    H = len(types) * (cell + gap + lab) + gap
    sheet = Image.new("RGB", (W, H), (247, 237, 215))
    d = ImageDraw.Draw(sheet)
    for r, t in enumerate(types):
        for c, p in enumerate(POSES):
            f = os.path.join(OUT, f"{t}-{p}.png")
            x = gap + c * (cell + gap)
            y = gap + r * (cell + gap + lab)
            d.text((x, y), f"{t} {p}", fill=(60, 45, 30))
            if not os.path.exists(f):
                d.rectangle([x, y + lab, x + cell, y + lab + cell], outline=(200, 60, 60))
                continue
            im = Image.open(f).convert("RGBA")
            im.thumbnail((cell, cell))
            sheet.paste(im, (x + (cell - im.width) // 2, y + lab + (cell - im.height) // 2), im)
    sheet.save(out)
    print(out, sheet.size, len(types), "types")


if __name__ == "__main__":
    main()
