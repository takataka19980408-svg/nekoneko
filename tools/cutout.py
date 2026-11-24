#!/usr/bin/env python3
"""画像のクリーム背景を透過し、512x512 の軽量PNGに整える。

使い方:
    python3 tools/cutout.py <入力.png> <出力.png> [--size 512]

- 四辺から連結フラッドフィルで背景を抜く（背景色に近い画素のみ。白い毛を食べない）
- **外周から届かない透明領域（体の内側の穴）は必ず不透明に埋め戻す**
  （＝「透明な猫」バグの再発防止。色は周囲の不透明画素から最も近い色で補間）
- 輪郭は1pxだけフェザリングしてアンチエイリアス
- 猫の体の内側は alpha=255（完全不透明）に正規化
- 色デコンタミネーションで縁のクリーム色を差し引く
- 被写体のバウンディングボックスで切り出し、中央に配置
"""
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter


def border_color(arr):
    h, w = arr.shape[:2]
    samples = []
    k = 5
    step = max(1, w // 40)
    for y in range(k):
        for x in range(0, w, step):
            samples.append(arr[y, x])
            samples.append(arr[h - 1 - y, x])
    for x in range(k):
        for y in range(0, h, step):
            samples.append(arr[y, x])
            samples.append(arr[y, w - 1 - x])
    return np.median(np.array(samples), axis=0)


def flood_bg(arr, bg, tol=18):
    """外周から、背景色に近い画素だけを連結フラッドフィルで取り除く。"""
    h, w = arr.shape[:2]
    dist = np.abs(arr - bg).max(axis=2)
    close = dist < tol
    removed = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if close[y, x] and not removed[y, x]:
                removed[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if close[y, x] and not removed[y, x]:
                removed[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and close[ny, nx] and not removed[ny, nx]:
                removed[ny, nx] = True
                q.append((ny, nx))
    return removed


def border_connected(mask):
    """mask==True のうち外周に連結している画素。"""
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


def fill_holes(mask, rgb, max_ratio=1.0):
    """mask==True(不透明) の内部にある透明の穴を、周囲の色で埋めて不透明にする。

    戻り値: (新しい mask, 新しい rgb, 埋めた画素数)
    """
    h, w = mask.shape
    holes = ~mask & ~border_connected(~mask)
    if not holes.any():
        return mask, rgb, 0
    filled = mask.copy()
    out = rgb.copy()
    # 多始点BFS: 不透明画素から穴へ色を伝播させる
    q = deque()
    src = np.full((h, w, 3), -1, dtype=np.int16)
    ys, xs = np.where(mask)
    for y, x in zip(ys, xs):
        src[y, x] = rgb[y, x]
        q.append((y, x))
    seen = mask.copy()
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and holes[ny, nx]:
                seen[ny, nx] = True
                src[ny, nx] = src[y, x]
                q.append((ny, nx))
    filled = mask | holes
    out[holes] = src[holes]
    return filled, out, int(holes.sum())


def shrink_rgba(img, colors=256):
    """RGBだけ256色に量子化して軽くする（alphaの滑らかなエッジはそのまま保つ）。

    透明部分のRGBは平均色で埋めてから量子化する（パレットの無駄を防ぐ）。
    """
    a = img.getchannel("A")
    arr = np.asarray(img.convert("RGB")).astype(np.float32)
    visible = np.asarray(a) > 8
    if visible.any():
        arr[~visible] = arr[visible].mean(axis=0)
    filled = Image.fromarray(arr.astype(np.uint8), "RGB")
    q = filled.quantize(colors=colors, method=Image.MEDIANCUT,
                        dither=Image.FLOYDSTEINBERG).convert("RGB")
    return Image.merge("RGBA", (*q.split(), a))


def prepare(path, tol=18):
    """透過・穴埋め・フェザリング・色デコンタミネーションまで（切り出し前の実寸RGBA）。"""
    im = Image.open(path).convert("RGB")
    if max(im.size) > 1400:
        im = im.resize((1400, round(im.size[1] * 1400 / im.size[0])), Image.LANCZOS)
    arr = np.asarray(im).astype(np.int16)
    bg = border_color(arr)

    removed = flood_bg(arr, bg, tol=tol)
    mask = ~removed
    rgb = arr.astype(np.int16)

    # --- 体の内側の透明穴を埋め戻す（透明な猫の再発防止） ---
    holes_before = int((~mask & ~border_connected(~mask)).sum())
    mask, rgb, _ = fill_holes(mask, rgb)

    # --- 輪郭のフェザリング（1pxだけ） ---
    a = (mask * 255).astype(np.float32)
    a_im = Image.fromarray(a.astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(0.9))
    a = np.asarray(a_im).astype(np.float32) / 255.0
    # 外側2pxと内側2pxは確定値に戻す（半透明の内側を作らない）
    inner = mask.copy()
    for _ in range(2):
        n = inner.copy()
        n[1:, :] &= inner[:-1, :]
        n[:-1, :] &= inner[1:, :]
        n[:, 1:] &= inner[:, :-1]
        n[:, :-1] &= inner[:, 1:]
        inner = n
    outer = ~mask
    for _ in range(2):
        n = outer.copy()
        n[1:, :] |= outer[:-1, :]
        n[:-1, :] |= outer[1:, :]
        n[:, 1:] |= outer[:, :-1]
        n[:, :-1] |= outer[:, 1:]
        outer = n
    a[inner] = 1.0
    a[outer] = 0.0

    # --- 色デコンタミネーション（縁のクリームを差し引く） ---
    af = np.clip(a, 0, 1)[..., None]
    safe = np.maximum(af, 0.35)
    dec = (rgb - (1 - af) * bg) / safe
    dec = np.clip(dec, 0, 255)
    out_rgb = np.where(af > 0.02, dec, rgb)

    rgba = np.dstack([out_rgb, a * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def finish(out, bbox, size=512, pad=0.94, verbose=True):
    """同じ矩形(bbox)で切り出して512に収める。2コマで同じbboxを渡すと拡大率が揃い、歩きがぶれない。"""
    if bbox:
        out = out.crop(bbox)

    target = int(size * pad)
    ow, oh = out.size
    scale = min(target / ow, target / oh)
    out = out.resize((max(1, round(ow * scale)), max(1, round(oh * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(out, ((size - out.width) // 2, (size - out.height) // 2), out)

    # --- 仕上げ: 内側は必ず alpha=255 に正規化（再サンプリングの半透明を消す） ---
    fin = np.asarray(canvas).copy()
    fa = fin[:, :, 3]
    opaque = fa >= 128
    # 外側2px(透明側)に接していない不透明画素は 255 とする
    inner2 = opaque.copy()
    for _ in range(2):
        n = inner2.copy()
        n[1:, :] &= inner2[:-1, :]
        n[:-1, :] &= inner2[1:, :]
        n[:, 1:] &= inner2[:, :-1]
        n[:, :-1] &= inner2[:, 1:]
        inner2 = n
    fa[inner2] = 255
    fin[:, :, 3] = fa
    canvas = Image.fromarray(fin, "RGBA")
    canvas = shrink_rgba(canvas)

    if verbose:
        h2 = int((fin[:, :, 3] < 250).sum())
        print(f"  translucentPx={h2}")

    return canvas


def cutout(path, size=512, tol=18, verbose=True):
    """1枚を透過して512x512に整える。"""
    out = prepare(path, tol)
    bbox = out.split()[3].getbbox()
    return finish(out, bbox, size, verbose=verbose)


def cutout_pair(paths, size=512, tol=18, verbose=True):
    """2コマを「同じ切り出し矩形」で512に収める（フレーム間で大きさ・位置がぶれない）。

    walk-1 と walk-2 は同じ猫の別ポーズなので、拡大率と接地位置を揃えないと
    切り替えのたびに猫が伸び縮みして見える。
    """
    imgs = [prepare(p, tol) for p in paths]
    boxes = [im.split()[3].getbbox() for im in imgs]
    boxes = [b for b in boxes if b]
    union = (min(b[0] for b in boxes), min(b[1] for b in boxes),
             max(b[2] for b in boxes), max(b[3] for b in boxes))
    return [finish(im, union, size, verbose=verbose) for im in imgs]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    size = 512
    for i, a in enumerate(sys.argv[1:]):
        if a == "--size":
            size = int(sys.argv[i + 2])
    if len(args) < 2:
        print("usage: cutout.py <in.png> <out.png> [--size 512]")
        return 1
    img = cutout(args[0], size)
    img.save(args[1], optimize=True, compress_level=9)
    print(f"{args[1]}  {img.size}  {img.mode}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
