#!/usr/bin/env python3
"""猫画像から「首元」を測り、首輪がぴったり巻かれる座標マップを作る／確認用の絵を出す。

    python3 tools/collar_map.py                 # 全タイプ×子猫/成猫の座標を出力 + tmp/collar-debug/*.png
    python3 tools/collar_map.py --json          # JSONだけ
    python3 tools/collar_map.py --only tabby    # 1タイプだけ
    python3 tools/collar_map.py --sheet         # 一覧シート（tmp/collar-sheet-*.png）

座標は画像に対する % （js/catart.js の COLLAR マップと同じ形式）:
    {x: 中心x%, y: 中心y%, w: 幅%, r: 回転deg}

計算の考え方
------------
首輪のSVG（viewBox 120x52・帯は M6 12 C26 40 94 40 114 12・太さ9.6・
丸キャップ）を CSS と同じ寸法で画像に重ねる。帯の見えている横幅は
ほぼ「w の 99%」、帯の左右の端は中心から上へ 0.117w、いちばん下は
中心から下へ 0.098w、鈴の底は +0.218w になる。

そこで、まず画像の輪郭から「首のくびれ（頭のすぐ下で最も細い行）」を測り、
  - 帯の外側の幅 = 首の幅 × 1.00（= 輪郭の内側にきっちり収まる）
  - 帯の左右の端の中心が、その首の細い行に来るように y を置く
と決める。頭のすぐ下がくびれない猫（ペルシャなど）は、頭の幅×0.60 を
首の幅とみなして同じ式で置く。
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

TYPES = ['tabby', 'orange', 'black', 'white', 'calico', 'tuxedo', 'gray',
         'siamese', 'fluffy', 'lion', 'tiger', 'leopard', 'wildcat',
         'scottish', 'sphynx', 'munchkin', 'persian', 'curl', 'russian',
         'bengal', 'abyssinian', 'tortie', 'mainecoon', 'ragdoll', 'bobtail',
         'snowleopard', 'cheetah', 'pallas', 'serval', 'caracal', 'puma', 'lynx', 'rex']
STAGES = ['kitten', 'adult']
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# SVG 120x52 の帯の形（CSS と同じ比率）
END_UP = 0.117     # 帯の端は中心から上へ この×w
BAND_LOW = 0.098   # 帯の最下点は中心から下へ この×w
BELL_LOW = 0.218   # 鈴の底は中心から下へ この×w
COVER = 0.99       # 帯の見えている横幅 = w × これ
TARGET = 1.00      # 帯の幅 / 首の幅（1.00 = 輪郭にぴったり）


def edge_width(mask, row):
    """その行の「毛の先まで含めた」輪郭幅（1pxの飛びを除いた 0.6〜99.4%点）。"""
    xs = np.where(mask[row])[0]
    if len(xs) < 12:
        return (int(xs.min()), int(xs.max())) if len(xs) else (0, 0)
    return int(np.percentile(xs, 0.6)), int(np.percentile(xs, 99.4))


def smooth(vals, k=11):
    k = max(3, k | 1)
    pad = k // 2
    v = np.pad(vals, (pad, pad), mode='edge')
    return np.array([np.median(v[i:i + k]) for i in range(len(vals))])


def profile(a):
    mask = a >= 128
    ys, xs = np.where(mask)
    t, b = int(ys.min()), int(ys.max())
    rows = []
    for y in range(t, b + 1):
        x = np.where(mask[y])[0]
        rows.append((0, 0) if len(x) == 0 else (int(x.min()), int(x.max())))
    return mask, t, b, rows


def detect_rows(mask, t, b, rows, H, W, stage='kitten'):
    """首輪の「帯の左右の端が乗る行」と、その行の輪郭幅を返す。

    このスプライトは全部「正面を向いておすわり」の同じ構図なので、
    あごの下＝首の線は 子猫で枠の50%・成猫で35.5% あたりに来る。
    その前後を少し探して、いちばん細い（＝首のくびれ）行に合わせる。
    """
    span = b - t + 1
    widths = np.array([r[1] - r[0] + 1 for r in rows], dtype=float)
    sw = smooth(widths, max(5, int(span * 0.025) | 1))
    head_w = float(sw[:int(span * 0.30)].max())

    prior = 0.35 if stage == 'adult' else 0.50
    lo = int(span * max(0.08, prior - 0.09))
    hi = int(span * min(0.78, prior + 0.09))
    i = lo + int(np.argmin(sw[lo:hi]))
    x_l, x_r = edge_width(mask, t + i)
    # 幅は「毛先のギザギザを除いた体の幅」（中央値）。毛の長い猫でも首輪が広がりすぎない
    width_at = float(sw[i])
    cx = (x_l + x_r) / 2 if x_r > x_l else W / 2
    kind = 'pinch' if width_at < head_w * 0.99 else 'flat'
    return dict(neck_row=t + i, neck_w=width_at, cx=cx, head_w=head_w,
                head_row=t + int(np.argmax(sw[:int(span * 0.30)])),
                kind=kind, span=span)


# 目の高さなどで自動推定が合わない猫の、帯の端を乗せる行（枠に対する割合）
OVERRIDE_ROW = {
    # 自動のくびれ推定が顔に掛かった／胸に落ちた猫（目視で選び直した行）
    'munchkin-adult': 0.52,
    'munchkin-kitten': 0.58,
    'lynx-adult': 0.50,
    'persian-kitten': 0.50,
    'pallas-kitten': 0.50,
    'fluffy-kitten': 0.46,
    'caracal-adult': 0.44,
    'fluffy-adult': 0.40,
    'persian-adult': 0.34,
    'pallas-adult': 0.44,
    'lion-adult': 0.46,
    'leopard-adult': 0.42,
    'abyssinian-kitten': 0.50,
    'abyssinian-adult': 0.38,
}

# 毛が長くて輪郭が読めない猫は、首輪の幅を実測の「体の幅」ではなく目で決める（画像に対する%）
OVERRIDE_WPCT = {
    # 毛が長い猫・顔が小さい猫は、輪郭の実測ではなく目で決めた幅（画像に対する%）
    'fluffy-kitten': 35.0,
    'persian-kitten': 34.0,
    'pallas-kitten': 39.8,
    'munchkin-adult': 38.0,
    'caracal-adult': 22.0,
    'lynx-adult': 37.0,
    'fluffy-adult': 34.0,
    'persian-adult': 38.0,
    'ragdoll-adult': 32.0,
    'pallas-adult': 46.0,
    'lion-adult': 46.0,
    'leopard-adult': 28.0,
    'munchkin-kitten': 50.0,
    'abyssinian-kitten': 27.5,
    'abyssinian-adult': 20.0,
}


def coord_for(path, key=None):
    a = np.asarray(Image.open(path).convert("RGBA"))[:, :, 3]
    H, W = a.shape
    mask, t, b, rows = profile(a)
    info = detect_rows(mask, t, b, rows, H, W, stage='adult' if path.endswith('-adult.png') else 'kitten')
    if key is None:
        key = os.path.basename(path).replace('.png', '')
    if key in OVERRIDE_ROW:
        span = info['span']
        i = int(span * OVERRIDE_ROW[key])
        widths = np.array([r[1] - r[0] + 1 for r in rows], dtype=float)
        sw = smooth(widths, max(5, int(span * 0.025) | 1))
        info['neck_row'] = t + i
        x_l, x_r = edge_width(mask, t + i)
        info['neck_w'] = float(sw[i])
        info['cx'] = (x_l + x_r) / 2 if x_r > x_l else W / 2
        info['kind'] = 'override'
    nw = info['neck_w']

    # 帯の外側の横幅 = 首の幅 × TARGET  →  SVGボックスの幅 w
    w_px = nw * TARGET / COVER
    # 首の幅で置くと窮屈/ゆるい猫が出るので、画像内の他の行でも検算して微調整
    w_px = min(w_px, W * 0.60)

    if key in OVERRIDE_WPCT:
        w_px = OVERRIDE_WPCT[key] / 100 * W
    y_px = info['neck_row'] + END_UP * w_px      # 帯の端の中心が首の細い行に来る
    return {
        "x": round(info['cx'] / W * 100, 1),
        "y": round(y_px / H * 100, 1),
        "w": round(w_px / W * 100, 1),
        "r": 0.0,
    }, info, (W, H)


def bezier_pts(w_px):
    """SVGの帯を CSS と同じ寸法でサンプリング（画像px・中心原点）。"""
    h = w_px * 52 / 120

    def P(u, v):
        return ((u - 60) * w_px / 120, (v - 26) * h / 52)

    out = []
    for s in range(49):
        tt = s / 48
        x = (1 - tt) ** 3 * 6 + 3 * (1 - tt) ** 2 * tt * 26 + 3 * (1 - tt) * tt ** 2 * 94 + tt ** 3 * 114
        y = (1 - tt) ** 3 * 12 + 3 * (1 - tt) ** 2 * tt * 40 + 3 * (1 - tt) * tt ** 2 * 40 + tt ** 3 * 12
        out.append(P(x, y))
    return out, P


def draw(path, coord, out, scale=1):
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    flat = Image.alpha_composite(bg, im).convert("RGB")
    if scale != 1:
        flat = flat.resize((flat.width * scale, flat.height * scale), Image.LANCZOS)
    W, H = flat.size
    d = ImageDraw.Draw(flat, "RGBA")
    w_px = coord["w"] / 100 * W
    cx = coord["x"] / 100 * W
    cy = coord["y"] / 100 * H
    pts, P = bezier_pts(w_px)
    pts = [(cx + x, cy + y) for x, y in pts]
    band = max(2, int(round(w_px * 9.6 / 120)))
    d.line(pts, fill=(122, 23, 48, 56), width=band + max(2, band // 2), joint="curve")
    d.line(pts, fill=(241, 86, 111, 255), width=band, joint="curve")
    for p in (pts[0], pts[-1]):
        r = band / 2
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=(241, 86, 111, 255))
    # ベル
    bx, by = cx + 0.0, cy + (40 - 26) * (w_px * 52 / 120) / 52
    r = w_px * 11 / 120
    d.ellipse([bx - r, by - r, bx + r, by + r], fill=(255, 211, 92), outline=(180, 125, 20),
              width=max(1, int(r * 0.2)))
    d.ellipse([bx - r * 0.3, by - r * 0.45, bx - r * 0.02, by - r * 0.12], fill=(255, 253, 242))
    flat.save(out)


def sheet(pairs, out, cell=220):
    n = len(pairs)
    cols = 6
    rows = (n + cols - 1) // cols
    S = Image.new("RGB", (cols * cell, rows * cell), (255, 250, 244))
    d = ImageDraw.Draw(S)
    for i, (p, c) in enumerate(pairs):
        one = os.path.join(ROOT, "tmp", "collar-one.png")
        draw(p, c, one)
        im = Image.open(one).resize((cell, cell), Image.LANCZOS)
        x, y = (i % cols) * cell, (i // cols) * cell
        S.paste(im, (x, y))
        d.rectangle([x, y, x + cell - 1, y + 16], fill=(60, 40, 36))
        d.text((x + 4, y + 4), os.path.basename(p).replace('.png', ''), fill=(255, 235, 225))
    S.save(out)
    return out


def try_rows(key, fracs, out):
    p = os.path.join(ROOT, "assets", "cats", f"{key}.png")
    a = np.asarray(Image.open(p).convert("RGBA"))[:, :, 3]
    H, W = a.shape
    mask, t, b, rows = profile(a)
    info = detect_rows(mask, t, b, rows, H, W, stage='adult' if key.endswith('-adult.png') else 'kitten')
    total = 0
    for f in fracs:
        OVERRIDE_ROW[key] = f
        coord, _i, _ = coord_for(p, key)
        one = os.path.join(ROOT, "tmp", f"try-{key}-{f}.png")
        draw(p, coord, one)
        total += 1
    cell = 300
    S = Image.new("RGB", (cell * len(fracs), cell + 18), (255, 250, 244))
    d = ImageDraw.Draw(S)
    for j, f in enumerate(fracs):
        im = Image.open(os.path.join(ROOT, "tmp", f"try-{key}-{f}.png")).resize((cell, cell), Image.LANCZOS)
        S.paste(im, (j * cell, 18))
        d.text((j * cell + 4, 4), f"{key} row={f:.2f}", fill=(90, 40, 40))
    S.save(out)
    del OVERRIDE_ROW[key]
    print(out, [f for f in fracs])


def main():
    for i, a in enumerate(sys.argv):
        if a == "--try":
            key = sys.argv[i + 1]
            fracs = [float(x) for x in sys.argv[i + 2].split(",")]
            try_rows(key, fracs, os.path.join(ROOT, "tmp", f"try-{key}.png"))
            return
    out_json = {}
    dbg = os.path.join(ROOT, "tmp", "collar-debug")
    os.makedirs(dbg, exist_ok=True)
    only = None
    for i, a in enumerate(sys.argv):
        if a == "--only":
            only = sys.argv[i + 1]
    types = [only] if only else TYPES
    pairs = []
    for t in types:
        for s in STAGES:
            p = os.path.join(ROOT, "assets", "cats", f"{t}-{s}.png")
            coord, info, (W, H) = coord_for(p, f'{t}-{s}')
            key = f"{t}-{s}"
            out_json[key] = coord
            draw(p, coord, os.path.join(dbg, f"{key}.png"))
            pairs.append((p, coord))
            print(f"{key:18s} x={coord['x']:5.1f} y={coord['y']:5.1f} w={coord['w']:5.1f} "
                  f"neckW={info['neck_w']:.0f} headW={info['head_w']:.0f} "
                  f"span={info['span']} ({info['kind']})")
    if "--json" in sys.argv:
        print(json.dumps(out_json, ensure_ascii=False, indent=1))
    if "--sheet" in sys.argv:
        for st in STAGES:
            ps = [(p, c) for p, c in pairs if p.endswith(f"-{st}.png")]
            print(sheet(ps, os.path.join(ROOT, "tmp", f"collar-sheet-{st}.png")))


if __name__ == "__main__":
    main()


def compare(key, scales, out):
    """同じ行のまま幅だけ変えた見本を横に並べる（目視で幅を決めるため）。"""
    p = os.path.join(ROOT, "assets", "cats", f"{key}.png")
    coord, _info, _ = coord_for(p, key)
    cell = 300
    S = Image.new("RGB", (cell * len(scales), cell + 18), (255, 250, 244))
    d = ImageDraw.Draw(S)
    for j, sc in enumerate(scales):
        c = dict(coord)
        c["w"] = round(coord["w"] * sc, 1)
        one = os.path.join(ROOT, "tmp", f"cmp-{key}-{sc}.png")
        draw(p, c, one)
        im = Image.open(one).resize((cell, cell), Image.LANCZOS)
        S.paste(im, (j * cell, 18))
        d.text((j * cell + 4, 4), f"{key} w×{sc:.2f} ({c['w']:.1f}%)", fill=(90, 40, 40))
    S.save(out)
    print(out)
