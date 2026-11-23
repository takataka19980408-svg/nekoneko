#!/usr/bin/env python3
"""猫画像から「首元」を推定し、首輪の座標マップを作る／確認用の絵を出す。

使い方:
    python3 tools/collar_map.py            # 全26枚の座標をJSONで出力 + debug/*.png
    python3 tools/collar_map.py --json     # JSONだけ

座標は画像に対する % （CATART の COLLAR マップと同じ形式）:
    {x: 中心x%, y: 中心y%, w: 幅%, r: 回転deg}
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

TYPES = ['tabby', 'orange', 'black', 'white', 'calico', 'tuxedo', 'gray',
         'siamese', 'fluffy', 'lion', 'tiger', 'leopard', 'wildcat']
STAGES = ['kitten', 'adult']
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def smooth(vals, k=9):
    pad = k // 2
    v = np.pad(vals, (pad, pad), mode='edge')
    out = np.array([np.median(v[i:i + k]) for i in range(len(vals))])
    return out


def profile(a):
    mask = a >= 128
    ys, xs = np.where(mask)
    t, b = ys.min(), ys.max()
    rows = []
    for y in range(t, b + 1):
        x = np.where(mask[y])[0]
        if len(x) == 0:
            rows.append((0, 0))
        else:
            rows.append((x.min(), x.max()))
    return mask, t, b, rows


def detect(path):
    a = np.asarray(Image.open(path).convert("RGBA"))[:, :, 3]
    H, W = a.shape
    mask, t, b, rows = profile(a)
    span = b - t + 1
    widths = np.array([r[1] - r[0] + 1 for r in rows], dtype=float)
    centers = np.array([(r[0] + r[1]) / 2 if r[1] > r[0] else W / 2 for r in rows], dtype=float)
    sw = smooth(widths, 9)

    lo = int(t + 0.34 * span)
    hi = int(t + 0.62 * span)
    head_hi = int(t + 0.36 * span)
    head_w = sw[:max(1, head_hi - t)].max() if head_hi > t else sw.max()

    # 首＝胸部より細い「くびれ」。局所最小を優先し、無ければ範囲内の最小
    candidates = []
    for y in range(lo, min(hi, b)):
        i = y - t
        if sw[i] <= sw[max(0, i - 3):i + 4].min() + 0.5:
            candidates.append((i, sw[i]))
    if candidates:
        # 頭の幅より細いくびれのうち、いちばん下（胸に近い）ものを首とする
        narrow = [c for c in candidates if c[1] < head_w * 0.94]
        pick = narrow[-1] if narrow else min(candidates, key=lambda c: c[1])
    else:
        i0 = int(t + 0.40 * span)
        i1 = int(t + 0.58 * span)
        seg = sw[i0 - t:i1 - t]
        pick = (i0 - t + int(np.argmin(seg)), seg.min())

    i, wneck = pick
    y_neck = t + i
    x_c = float(centers[i])
    wcol = wneck * 1.16
    wcol = max(min(wcol, 0.50 * W), 0.22 * W)
    return {
        "x": round(x_c / W * 100, 1),
        "y": round(y_neck / H * 100, 1),
        "w": round(wcol / W * 100, 1),
        "r": 0.0,
    }, dict(t=t, b=b, neck_w=float(wneck), head_w=float(head_w), span=span)


def draw(path, coord, out):
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    im = Image.alpha_composite(bg, im).convert("RGB")
    d = ImageDraw.Draw(im)
    W = im.size[0]
    bw = coord["w"] / 100 * W
    bh = bw * 52 / 120
    cx = coord["x"] / 100 * W
    cy = coord["y"] / 100 * im.size[1]

    def P(u, v):
        return (cx + (u - 60) * bw / 120, cy + (v - 26) * bh / 52)

    pts = []
    for s in range(41):
        tt = s / 40
        # 3次ベジェ (6,12)-(26,40)-(94,40)-(114,12)
        x = (1 - tt) ** 3 * 6 + 3 * (1 - tt) ** 2 * tt * 26 + 3 * (1 - tt) * tt ** 2 * 94 + tt ** 3 * 114
        y = (1 - tt) ** 3 * 12 + 3 * (1 - tt) ** 2 * tt * 40 + 3 * (1 - tt) * tt ** 2 * 40 + tt ** 3 * 12
        pts.append(P(x, y))
    d.line(pts, fill=(230, 30, 90), width=max(2, int(bw * 0.075)))
    bx, by = P(60, 40)
    r = bw * 11 / 120
    d.ellipse([bx - r, by - r, bx + r, by + r], outline=(255, 200, 0), width=2)
    d.line([(cx - 6, cy), (cx + 6, cy)], fill=(0, 120, 255), width=1)
    d.line([(cx, cy - 6), (cx, cy + 6)], fill=(0, 120, 255), width=1)
    im.save(out)


# 自動推定でズレた個体の目視調整値（画像を見て手で合わせた最終値）
OVERRIDES = {
    "siamese-adult": {"x": 43.5, "y": 47.5, "w": 33.0, "r": 0.0},
    "fluffy-kitten": {"x": 47.0, "y": 53.5, "w": 41.0, "r": 0.0},
    "tuxedo-adult": {"x": 44.8, "y": 56.5, "w": 35.6, "r": 0.0},
    "gray-adult": {"x": 41.6, "y": 55.5, "w": 39.6, "r": 0.0},
    "leopard-adult": {"x": 47.5, "y": 58.8, "w": 34.2, "r": 0.0},
    "tiger-adult": {"x": 55.7, "y": 57.5, "w": 38.7, "r": 0.0},
    "orange-adult": {"x": 53.3, "y": 49.6, "w": 38.5, "r": 0.0},
}


def main():
    out_json = {}
    dbg = os.path.join(ROOT, "tmp", "collar-debug")
    os.makedirs(dbg, exist_ok=True)
    for t in TYPES:
        for s in STAGES:
            p = os.path.join(ROOT, "assets", "cats", f"{t}-{s}.png")
            coord, info = detect(p)
            key = f"{t}-{s}"
            if key in OVERRIDES:
                coord = dict(OVERRIDES[key])
            out_json[key] = coord
            draw(p, coord, os.path.join(dbg, f"{t}-{s}.png"))
            print(f"{t}-{s:7s} x={coord['x']:5.1f} y={coord['y']:5.1f} w={coord['w']:5.1f} "
                  f"neckW={info['neck_w']:.0f} headW={info['head_w']:.0f} bbox={info['t']}-{info['b']}")
    if "--json" in sys.argv:
        print(json.dumps(out_json, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
