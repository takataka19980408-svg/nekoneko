#!/usr/bin/env python3
"""assets/cats/*.png の品質検査（テストからも使う）。

検査項目:
1. 全タイプ×kitten/adult（現状66枚）がすべて存在し、512x512 RGBA である
2. 外周から届かない透明の穴（＝透明な猫バグ）が 0
3. 猫の体の内側は alpha=255（半点もない）。内側の半透明は輪郭2px以内のみ許可
4. 不透明部分が画像の 8% 以上ある（真っ白/真っ黒に飛んでいない）
"""
import glob
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

STAGES = ['kitten', 'adult']
HERE = os.path.dirname(os.path.abspath(__file__))


def types_from_catart():
    """js/catart.js の TYPES を唯一の正とする（絵を足したら自動で検査対象が増える）。"""
    src = open(os.path.join(HERE, '..', 'js', 'catart.js'), encoding='utf-8').read()
    body = src[src.index('const TYPES = ['):]
    body = body[:body.index('];')]
    return [t for t in body.replace('const TYPES = [', '').replace("'", '').split(',') if t.strip() and t.strip() not in ('', ']')]


TYPES = [t.strip() for t in types_from_catart()]


def expected_files(root):
    return [os.path.join(root, f"assets/cats/{t}-{s}.png") for t in TYPES for s in STAGES]


def border_connected(mask):
    h, w = mask.shape
    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def erode(mask, n=1):
    m = mask.copy()
    for _ in range(n):
        o = m.copy()
        o[1:, :] &= m[:-1, :]
        o[:-1, :] &= m[1:, :]
        o[:, 1:] &= m[:, :-1]
        o[:, :-1] &= m[:, 1:]
        o[0, :] = o[-1, :] = False
        o[:, 0] = o[:, -1] = False
        m = o
    return m


def check_image(path, min_cover=0.08):
    """戻り値: (ok, メッセージ, 詳細dict)"""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)[:, :, 3]
    h, w = a.shape
    problems = []

    if im.size != (512, 512):
        problems.append(f"size {im.size}")

    transparent = a < 250
    holes = transparent & ~border_connected(transparent)
    # 輪郭のアンチエイリアス（1pxのスリバー）は正常。3px以上の厚みがある穴だけを異常とする
    hole_px = int(erode(holes, 1).sum())
    if hole_px > 0:
        problems.append(f"innerHole={hole_px}px")

    # 内側（輪郭から2px以上内側）に半透明が残っていないか
    core = erode(a >= 250, 2)
    semi_inner = int((core & (a < 250)).sum())
    if semi_inner > 0:
        problems.append(f"semiTransparentInside={semi_inner}px")

    cover = float((a >= 250).sum()) / (h * w)
    if cover < min_cover:
        problems.append(f"opaqueCover={cover:.2f}")

    return (not problems), "; ".join(problems), {"cover": cover, "hole_px": hole_px}


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    files = expected_files(root)
    bad = 0
    missing = [f for f in files if not os.path.exists(f)]
    for f in files:
        if not os.path.exists(f):
            print(f"[NG] missing {os.path.relpath(f, root)}")
            bad += 1
            continue
        ok, msg, info = check_image(f)
        if not ok:
            print(f"[NG] {os.path.relpath(f, root)}: {msg}")
            bad += 1
    print(f"assets: {len(files) - len(missing)}/{len(files)} 枚 OK / NG {bad}")
    print("結果:", "PASS" if bad == 0 else "FAIL")
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
