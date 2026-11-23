#!/usr/bin/env python3
"""首輪フィットの確認シート（全キャラ・子猫/成猫）を作る。

    python3 tools/collar_sheet.py <出力ディレクトリ>

js/catart.js の COLLAR を読み、CSS と同じ寸法で首輪を重ねた画像を
4列×2行ずつ（8枚/シート）書き出す。1枚を大きく見せるので、
「首輪が浮いていない・輪郭からはみ出していない」を目で確認できる。
"""
import json
import os
import re
import sys

from PIL import Image, ImageDraw

import collar_map as CM

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATART = os.path.join(ROOT, "js", "catart.js")
CELL = 340
COLS = 4


def read_collar():
    src = open(CATART).read()
    m = re.search(r"const COLLAR = \{(.*?)\n  \};", src, re.S)
    body = m.group(1)
    out = {}
    for k, x, y, w, r in re.findall(
            r"'([a-z]+-(?:kitten|adult))':\s*\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+),"
            r"\s*w:\s*([\d.]+),\s*r:\s*([\d.]+)", body):
        out[k] = {"x": float(x), "y": float(y), "w": float(w), "r": float(r)}
    return out


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") \
        else os.path.join(ROOT, "tmp", "collar-check")
    os.makedirs(outdir, exist_ok=True)
    collar = read_collar()
    stage = "both"
    for i, a in enumerate(sys.argv):
        if a == "--stage":
            stage = sys.argv[i + 1]
    stages = ["kitten", "adult"] if stage == "both" else [stage]

    made = []
    for st in stages:
        keys = [f"{t}-{st}" for t in CM.TYPES]
        for ci in range(0, len(keys), COLS * 2):
            chunk = keys[ci:ci + COLS * 2]
            rows = (len(chunk) + COLS - 1) // COLS
            S = Image.new("RGB", (COLS * CELL, rows * CELL), (255, 250, 244))
            d = ImageDraw.Draw(S)
            for j, key in enumerate(chunk):
                p = os.path.join(ROOT, "assets", "cats", f"{key}.png")
                c = collar.get(key, {"x": 50, "y": 50, "w": 30, "r": 0})
                one = os.path.join(outdir, f"_{key}.png")
                CM.draw(p, c, one, scale=2)
                im = Image.open(one).resize((CELL, CELL), Image.LANCZOS)
                x, y = (j % COLS) * CELL, (j // COLS) * CELL
                S.paste(im, (x, y))
                d.rectangle([x, y, x + CELL - 1, y + 18], fill=(62, 42, 38))
                d.text((x + 5, y + 4), key, fill=(255, 236, 228))
                os.remove(one)
            out = os.path.join(outdir, f"collar-{st}-{ci // (COLS * 2) + 1}.png")
            S.save(out)
            made.append(out)
            print(out)
    return made


if __name__ == "__main__":
    main()
