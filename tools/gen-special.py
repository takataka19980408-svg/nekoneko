#!/usr/bin/env python3
"""世界猫生ガチャ — 6種のコメディ・超レア猫の専用イラスト生成。

    python3 tools/gen-special.py                 # 未生成の全6種×4ポーズ（24枚）
    python3 tools/gen-special.py star --force    # 指定の姿だけ作り直す
    python3 tools/gen-special.py --jobs 3

- 正面は既存の正面アセット（assets/cats/{type}-adult.png）を、
  歩き2コマ・眠り姿は承認済みの試作（downloads/proto-walk-*.png / proto-rest.png）を
  `images --edit` で塗り替え、ポーズ・画風・構図を保つ
- tools/cutout.py で背景を透過し、512x512 の軽量PNGにする
  （walk-1/walk-2 は共通切り出し矩形でサイズ・接地ズレを防ぐ）
- 出力: assets/cats-special/{form}/{front,walk-1,walk-2,rest}.png
"""
import argparse
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cutout  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = "/workspace"
RAW = os.path.join(ROOT, "tmp", "specialgen")
OUT = os.path.join(ROOT, "assets", "cats-special")
PROTO = {
    "walk-1": os.path.join(WORK, "downloads", "proto-walk-1.png"),
    "walk-2": os.path.join(WORK, "downloads", "proto-walk-2.png"),
    "rest": os.path.join(WORK, "downloads", "proto-rest.png"),
}
FRONT_BASE = {
    "maneki": os.path.join(WORK, "downloads", "proto-maneki.png"),
    "nekomata": "assets/cats/tabby-adult.png",
    "star": "assets/cats/gray-adult.png",
    "stationmaster": "assets/cats/calico-adult.png",
    "buffboss": "assets/cats/orange-adult.png",
    "spacecat": "assets/cats/white-adult.png",
}

STYLE = (" Same hand-drawn children's picture-book style: fine dark-brown ink-pen outlines, "
         "colored pencil and soft watercolour shading, visible warm paper grain. "
         "Flat plain pale warm cream background, no shadow under the cat, no text, no border, "
         "same canvas size and framing as the original.")

LOOK = {
    "maneki": ("a cute calico maneki-neko lucky cat: white base coat with soft orange and black patches, "
               "big warm amber eyes, a red collar with a large round gold bell, a big oval gold koban coin "
               "with raised ridges, and a round red zabuton cushion under it"),
    "nekomata": ("a mystical tabby nekomata cat: warm brown mackerel tabby fur with dark stripes, glowing amber eyes, "
                 "exactly TWO separate tails that split cleanly apart at the base and each taper to ONE single pointed tip "
                 "(the tails must NOT fork, branch, or split again at the tips), small pale blue-white ghost flames "
                 "(hitodama) floating around the body, and a faint silvery-blue mystical glow"),
    "star": ("a smug superstar cat: sleek silver-gray tabby fur with soft grey stripes, wearing a small crooked gold crown "
             "on its head and dark heart-shaped sunglasses, chin lifted with a confident smug grin"),
    "stationmaster": ("a charming stationmaster cat: white and soft orange calico fur, wearing a navy-blue railway "
                      "stationmaster's cap with a gold band and a small gold emblem, and a red scarf tied around the neck"),
    "buffboss": ("a ridiculous bodybuilder boss cat: orange mackerel tabby fur, absurdly huge bulging muscles on the chest, "
                 "shoulders and front legs like a bodybuilder, a small head with a tough confident boss expression "
                 "and a small scar across one eye"),
    "spacecat": ("a serene cosmic cat: fluffy cream-white fur with faint glowing pale-blue star markings, eyes closed in a "
                 "peaceful enlightened expression, floating calmly inside a soft pastel galaxy nebula halo in violet, pink "
                 "and pale blue, with a few tiny twinkling stars and a thin ring of golden light around it"),
}

POSE = {
    "front": {
        "maneki": ("Keep EXACTLY the same sitting pose and composition: the cat sits upright facing the viewer on the round "
                   "red cushion, the right front paw raised high in a beckoning gesture, the big gold koban held upright "
                   "against its belly with the left paw, tail curled around its side."),
        "nekomata": ("Keep EXACTLY the same front-facing sitting pose: both of the two tails curl up behind the body and are "
                     "clearly visible, one on each side, with clean single pointed tips."),
        "star": ("Keep EXACTLY the same front-facing sitting pose, but now the cat sits on an open cardboard box like a throne, "
                 "wearing the gold crown and heart-shaped sunglasses."),
        "stationmaster": ("Keep EXACTLY the same front-facing sitting pose, with the stationmaster cap on its head and the red "
                          "scarf around its neck."),
        "buffboss": ("Keep EXACTLY the same front-facing sitting pose, but give it the body of a bodybuilder: enormous muscular "
                     "shoulders and front legs, a small head, a confident tough scowl."),
        "spacecat": ("Keep EXACTLY the same front-facing sitting pose, floating a little above the ground inside the soft "
                     "galaxy nebula halo."),
    },
    "walk-1": ("Keep EXACTLY the same right-facing walking pose: the cat walks to the right, front legs stretched apart "
               "fore and aft, hind legs stretched apart, tail raised and curving up on the left side, head up and facing "
               "right with one eye visible. "),
    "walk-2": ("Keep EXACTLY the same right-facing mid-step pose: the cat walks to the right, the front paws cross each other "
               "underneath the chest, the hind legs stand closer together, tail raised and curving up on the left side, "
               "head up facing right. It must NOT look like the same pose as the first frame. "),
    "rest": ("Keep EXACTLY the same sleeping pose: the cat is curled up in a round ball on the ground, eyes peacefully closed, "
             "head resting on tucked front paws, tail wrapped around the body. "),
}

WALK_NOTE = {
    "maneki": "The cat now wears the red collar with a big gold bell and carries the big oval gold koban coin in its mouth.",
    "nekomata": ("Both of the two tails are raised behind the body, clearly separate, each with ONE clean pointed tip "
                 "and no fork at the ends."),
    "star": "The cat struts with its chin up, still wearing the small gold crown and dark heart-shaped sunglasses.",
    "stationmaster": "The stationmaster cap stays on its head and the red scarf flutters at its neck as it patrols.",
    "buffboss": "Its front legs and shoulders are absurdly huge and muscular, and it stomps along heavily.",
    "spacecat": "It floats slightly above the ground inside the soft pastel galaxy nebula halo, with tiny stars around it.",
}

REST_NOTE = {
    "maneki": ("The cat sleeps curled up on a small round red zabuton cushion, still wearing the red collar with the gold "
               "bell. Replace the pale golden halo ring above the head with nothing."),
    "nekomata": ("Both of the two tails are curled around the body with clean single pointed tips, and the pale golden halo "
                 "ring above the head is replaced by one small pale-blue ghost flame."),
    "star": ("The cat is dead asleep and still wearing the small gold crown on its head. Replace the pale golden halo ring "
             "above the head with nothing."),
    "stationmaster": ("The stationmaster cap stays on its head while it dozes. Replace the pale golden halo ring above the "
                      "head with nothing."),
    "buffboss": ("Its huge muscular front legs are folded across its chest like crossed arms as it sleeps with great dignity. "
                 "Replace the pale golden halo ring above the head with nothing."),
    "spacecat": ("It sleeps curled up, floating in the soft pastel galaxy nebula halo, and the thin golden ring of light "
                 "stays around it."),
}

FORMS = list(LOOK)
POSES = ["front", "walk-1", "walk-2", "rest"]


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def flatten_front(form):
    """正面のベースをクリーム背景のRGBに敷く（透過のままだと背景が黒く焼けることがある）。"""
    src = FRONT_BASE[form]
    if not src.startswith("/"):
        src = os.path.join(ROOT, src)
    dst = os.path.join(RAW, f"base-{form}-front.png")
    if os.path.exists(dst):
        return dst
    im = Image.open(src).convert("RGBA")
    if max(im.size) < 900:
        im = im.resize((1024, round(im.size[1] * 1024 / im.size[0])), Image.LANCZOS) \
            if im.size[0] >= im.size[1] else im.resize((round(im.size[0] * 1025 / im.size[1]), 1025), Image.LANCZOS)
    bg = Image.new("RGB", im.size, (250, 243, 226))
    bg.paste(im, (0, 0), im)
    bg.save(dst)
    return dst


def prompt_for(form, pose):
    head = f"Repaint this cat illustration as {LOOK[form]}. "
    if pose == "front":
        body = POSE["front"][form]
    elif pose in ("walk-1", "walk-2"):
        body = POSE[pose] + WALK_NOTE[form]
    else:
        body = POSE["rest"] + REST_NOTE[form]
    return head + body + STYLE


def one(form, pose, force=False):
    out_final = os.path.join(OUT, form, f"{pose}.png")
    if os.path.exists(out_final) and not force:
        return f"skip {form}-{pose}"
    raw = os.path.join(RAW, f"{form}-{pose}.png")
    if force or not os.path.exists(raw):
        base = flatten_front(form) if pose == "front" else PROTO[pose]
        r = run(["images", prompt_for(form, pose), "--edit", base, "--out", raw], cwd=WORK)
        if r.returncode != 0 or not os.path.exists(raw):
            return f"FAIL gen {form}-{pose}: {(r.stdout + r.stderr)[:240]}"
    if pose in ("walk-1", "walk-2"):
        return f"raw {form}-{pose} {os.path.getsize(raw)//1024}KB"
    im = cutout.cutout(raw, 512, verbose=False)
    os.makedirs(os.path.join(OUT, form), exist_ok=True)
    im.save(out_final, optimize=True, compress_level=9)
    return f"ok {form}-{pose} {os.path.getsize(out_final)//1024}KB"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("forms", nargs="*")
    ap.add_argument("--jobs", type=int, default=3)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    forms = [f for f in (a.forms or FORMS) if f in LOOK]

    tasks = [(f, p) for f in forms for p in POSES]
    t0 = time.time()
    done = 0
    with ThreadPoolExecutor(max_workers=max(1, a.jobs)) as ex:
        futs = [ex.submit(one, f, p, a.force) for f, p in tasks]
        for fu in futs:
            done += 1
            print(f"[{done}/{len(tasks)}] {fu.result()}  ({time.time()-t0:.0f}s)", flush=True)

    # 歩き2コマは、共通の切り出し矩形でそろえる（サイズ・接地位置のズレ防止）
    for f in forms:
        raws = [os.path.join(RAW, f"{f}-walk-1.png"), os.path.join(RAW, f"{f}-walk-2.png")]
        if not all(os.path.exists(x) for x in raws):
            print(f"skip pair {f}: 原画なし")
            continue
        outs = cutout.cutout_pair(raws, 512, verbose=False)
        for pose, im in zip(("walk-1", "walk-2"), outs):
            im.save(os.path.join(OUT, f, f"{pose}.png"), optimize=True, compress_level=9)
        print(f"pair {f}: walk-1 / walk-2 を共通矩形で仕上げ")


if __name__ == "__main__":
    main()
