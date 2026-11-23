#!/usr/bin/env python3
"""画像のクリーム背景を透過し、512x512 の軽量PNGに整える。

使い方:
    python3 tools/cutout.py <入力.png> <出力.png> [--size 512]

- 四辺から連結フラッドフィル（局所的なグラデーション追従）で背景を抜く
- 残った背景のフリンジは色デコンタミネーションでクリーム色を差し引く
- アルファを1pxフェザリングしてアンチエイリアス
- 被写体のバウンディングボックスで切り出し、中央に配置
"""
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter


def border_color(arr):
    h, w = arr.shape[:2]
    samples = []
    k = 4
    for y in range(k):
        for x in range(0, w, max(1, w // 30)):
            samples.append(arr[y, x])
            samples.append(arr[h - 1 - y, x])
    for x in range(k):
        for y in range(0, h, max(1, h // 30)):
            samples.append(arr[y, x])
            samples.append(arr[y, w - 1 - x])
    return np.median(np.array(samples), axis=0)


def cutout(path, size=512):
    im = Image.open(path).convert("RGB")
    # 処理を軽くするため長辺1024まで縮小
    if max(im.size) > 1024:
        im = im.resize((1024, round(im.size[1] * 1024 / im.size[0])), Image.LANCZOS)
    arr = np.asarray(im).astype(np.int16)
    h, w = arr.shape[:2]
    bg = border_color(arr)

    # --- 四辺から連結フラッドフィル ---
    removed = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        q.append((0, x)); q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0)); q.append((y, w - 1))

    def close_to_bg(px):
        return np.abs(px - bg).max() < 16

    def close_to_neighbour(px, nb):
        # 明るいグラデーション（影の裾）なら局所的に追従してよい
        return np.abs(px - nb).max() < 7 and px.mean() > 185

    while q:
        y, x = q.popleft()
        if removed[y, x]:
            continue
        px = arr[y, x]
        if not close_to_bg(px):
            continue
        removed[y, x] = True
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not removed[ny, nx]:
                nb = arr[y, x]
                if close_to_bg(arr[ny, nx]) or close_to_neighbour(arr[ny, nx], nb):
                    q.append((ny, nx))

    # --- 2パス目: 背景に接している「うすい影」も食べる ---
    # 影はクリームより少し濃いだけなので、明るさ・低彩度・背景色からの距離で判定し、
    # 背景とつながっているものだけを消す（白い胸毛や肉球は輪郭で囲われているので残る）
    bgd = np.abs(arr - bg).max(axis=2)
    lum = arr.mean(axis=2)
    sat = (arr.max(axis=2) - arr.min(axis=2)) / np.maximum(arr.max(axis=2), 1)
    shadowish = (bgd < 78) & (lum > 196) & (sat < 0.30)

    q2 = deque()
    for y in range(h):
        for x in range(w):
            if removed[y, x]:
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and not removed[ny, nx] and shadowish[ny, nx]:
                        q2.append((ny, nx))
    while q2:
        y, x = q2.popleft()
        if removed[y, x]:
            continue
        removed[y, x] = True
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not removed[ny, nx] and shadowish[ny, nx]:
                q2.append((ny, nx))

    # 背景に接しているが背景色でない画素（境界のアンチエイリアス）
    mask = ~removed

    # 小さな孤立した背景色の穴を埋める
    alpha = (mask * 255).astype(np.uint8)
    a_im = Image.fromarray(alpha, "L")

    # 境界のギザギザを少しだけ丸める
    a_im = a_im.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.6))
    a = np.asarray(a_im).astype(np.float32) / 255.0

    # 影の名残（下端の低彩度グレー）を弱める: 彩度が低く暗い画素はアルファを下げる
    rgb = arr.astype(np.float32)
    mx = rgb.max(axis=2); mn = rgb.min(axis=2)
    sat = (mx - mn) / np.maximum(mx, 1)
    luminance = rgb.mean(axis=2)
    shadowy = (sat < 0.12) & (luminance < 235) & (np.arange(h)[:, None] > h * 0.80)
    a = np.where(shadowy, a * 0.25, a)

    # --- 色デコンタミネーション（クリームの縁を差し引く） ---
    af = np.clip(a, 0, 1)[..., None]
    safe = np.maximum(af, 0.30)
    dec = (rgb - (1 - af) * bg) / safe
    dec = np.clip(dec, 0, 255)
    # ほぼ透明な部分は色も落としておく
    out_rgb = np.where(af > 0.02, dec, rgb)

    rgba = np.dstack([out_rgb, a * 255]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")

    # バウンディングボックスで切り出し
    bbox = out.split()[3].getbbox()
    if bbox:
        out = out.crop(bbox)

    # 512 のキャンバスへ（少し余白を持たせて中央配置）
    pad = 0.94
    target = int(size * pad)
    ow, oh = out.size
    scale = min(target / ow, target / oh)
    out = out.resize((max(1, round(ow * scale)), max(1, round(oh * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(out, ((size - out.width) // 2, (size - out.height) // 2), out)
    return canvas


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
    img.save(args[1], optimize=True)
    print(f"{args[1]}  {img.size}  {img.mode}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
