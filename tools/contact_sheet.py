#!/usr/bin/env python3
"""全キャラ（子猫／成猫）のコンタクトシートを出す。画風・破綻の目視確認用。

    python3 tools/contact_sheet.py kitten            # 32枚を4列で
    python3 tools/contact_sheet.py adult
    python3 tools/contact_sheet.py kitten --cols 6 --cell 240
"""
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets", "cats")
TYPES = ['tabby', 'orange', 'black', 'white', 'calico', 'tuxedo', 'gray',
         'siamese', 'fluffy', 'lion', 'tiger', 'leopard', 'wildcat',
         'scottish', 'sphynx', 'munchkin', 'persian', 'curl', 'russian',
         'bengal', 'abyssinian', 'tortie', 'mainecoon', 'ragdoll', 'bobtail',
         'snowleopard', 'cheetah', 'pallas', 'serval', 'caracal', 'puma', 'lynx', 'rex']


def main():
    stage = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "kitten"
    cols = 6
    cell = 220
    for i, a in enumerate(sys.argv):
        if a == "--cols":
            cols = int(sys.argv[i + 1])
        if a == "--cell":
            cell = int(sys.argv[i + 1])
    label_h = 22
    rows = (len(TYPES) + cols - 1) // cols
    W = cols * cell
    H = rows * (cell + label_h)
    sheet = Image.new("RGB", (W, H), (255, 250, 244))
    d = ImageDraw.Draw(sheet)
    for i, t in enumerate(TYPES):
        p = os.path.join(ASSETS, f"{t}-{stage}.png")
        cx = (i % cols) * cell
        cy = (i // cols) * (cell + label_h)
        if os.path.exists(p):
            im = Image.open(p).convert("RGBA")
            im = im.resize((cell, cell), Image.LANCZOS)
            sheet.paste(im, (cx, cy + label_h), im)
        d.rectangle([cx, cy, cx + cell - 1, cy + label_h - 1], fill=(255, 240, 232))
        d.text((cx + 6, cy + 5), f"{i+1}. {t}", fill=(120, 80, 70))
    out = os.path.join(ROOT, "tmp", f"contact-{stage}.png")
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main()
