#!/usr/bin/env python3
"""世界猫生ガチャ — 横向き歩き2コマ＋お見送り（rest）画像の生成。

    python3 tools/gen-walk.py                       # 未生成の全タイプ×3ポーズ
    python3 tools/gen-walk.py white lion --force    # 指定タイプだけ作り直す
    python3 tools/gen-walk.py --pose rest           # ポーズを絞る
    python3 tools/gen-walk.py --jobs 4              # 同時生成数

- 承認済みの試作3枚（downloads/proto-walk-1.png / proto-walk-2.png / proto-rest.png）を
  ベースに `images --edit` で毛色・体格だけを差し替え、ポーズ・画風・構図を保つ
- tools/cutout.py でクリーム/白背景を透過し、512x512 の軽量PNGにする
- 出力: assets/cats-walk/{type}-{walk-1|walk-2|rest}.png
"""
import argparse
import os
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "tmp", "walkgen")
OUT = os.path.join(ROOT, "assets", "cats-walk")
WORK = "/workspace"
PROTO = {
    "walk-1": os.path.join(WORK, "downloads", "proto-walk-1.png"),
    "walk-2": os.path.join(WORK, "downloads", "proto-walk-2.png"),
    "rest": os.path.join(WORK, "downloads", "proto-rest.png"),
}

STYLE = (" Same hand-drawn children's picture-book style: fine dark-brown ink-pen outlines, "
         "colored pencil and soft watercolour shading, visible warm paper grain. "
         "Flat plain {bg} background, no shadow under the cat, no text, no border, "
         "same canvas size and framing as the original.")

BG_CREAM = "pale warm cream"
# 白っぽい猫はクリーム背景だと輪郭が溶けて背景と一緒に抜けてしまうので、
# 淡い青みがかった灰色の背景にして、毛色との差を作る
BG_COOL = "very pale cool blue-grey"
LIGHT_TYPES = {"white", "fluffy", "persian", "ragdoll", "siamese", "snowleopard",
               "bobtail", "calico", "tuxedo"}

POSE = {
    "walk-1": ("Keep EXACTLY the same right-facing walking pose: the cat walks to the right, "
               "front legs stretched apart fore and aft, hind legs stretched apart, tail raised "
               "and curving up on the left side, head up and facing right with one eye visible."),
    "walk-2": ("Keep EXACTLY the same right-facing mid-step pose: the cat walks to the right, "
               "the front paws cross each other underneath the chest, the hind legs stand closer "
               "together, tail raised and curving up on the left side, head up facing right. "
               "It must NOT look like the same pose as the first frame: the legs are clearly in a "
               "different position, mid-stride."),
    "rest": ("Keep EXACTLY the same sleeping pose: the cat is curled up in a round ball on the ground, "
             "eyes peacefully closed, head resting on tucked front paws, tail wrapped around the body, "
             "and the small pale golden ring halo floats above the head in the same place."),
}

# タイプごとの見た目（既存の正面アセット assets/cats/{type}-adult.png に合わせる）
LOOK = {
    "tabby": "an ordinary brown mackerel tabby cat with warm golden-brown fur, dark brown vertical stripes, a lighter cream chin, chest and paws, amber eyes",
    "orange": "a bright ginger-orange tabby cat with vivid orange fur, deeper orange stripes, a white chest, muzzle and paws, amber eyes",
    "black": "a solid jet-black cat with glossy short black fur, a slightly lighter smoky sheen, bright amber-gold eyes, no other colours",
    "white": "a pure white cat with warm ivory-white fur, a clear fine warm-grey ink outline all around the silhouette, soft cool-grey shading under the belly and along the legs, long soft fluffy fur, a plush tail, one pale blue eye and one amber eye (odd eyes), pink nose and ears",
    "calico": "a calico cat with a white base coat and large soft orange and black patches on the head, back and tail, amber eyes",
    "tuxedo": "a tuxedo cat with glossy black fur on the head, back, tail and legs, and a crisp white chest, chin, muzzle and white paws",
    "gray": "a silver-gray tabby cat with pale silver-gray fur, darker grey mackerel stripes, a white chest and paws, pale green eyes",
    "siamese": "a Siamese cat with a pale cream body, dark chocolate-brown seal-point face mask, ears, lower legs and tail, vivid blue eyes, short sleek fur",
    "fluffy": "a very fluffy long-haired cream-and-white cat with a huge plume tail, soft feathery chest fur, round face, pale amber eyes",
    "lion": "a young lion with a warm golden-tan body, a big fluffy russet-brown mane around the head and neck, a tufted tail tip, small round ears and golden eyes, still soft and cute",
    "tiger": "a tiger cub with vivid orange fur, bold black tiger stripes, a white muzzle, chest and belly, black ear backs, amber eyes, still soft and cute",
    "leopard": "a leopard with golden-tawny fur covered in dark brown and black rosettes, a white chin and belly, rounded ears, amber eyes, still soft and cute",
    "wildcat": "an African wildcat with sandy tawny-brown fur, dark brown tabby stripes, dark rings around the legs and tail, a white muzzle, green-amber eyes",
    "scottish": "a Scottish Fold cat with plush solid blue-gray fur, a white chest and paws, both ears folded forward and lying flat on the round head, very round chubby face, big amber eyes",
    "sphynx": "a hairless Sphynx cat with pale warm pinkish-gray bare skin, visible soft wrinkles on the head, neck and shoulders, huge wide upright bat-like ears, big amber eyes, no fur at all",
    "munchkin": "a Munchkin cat with a normally sized body but very short stubby legs, brown mackerel tabby fur, dark stripes, white chin and paws, big amber eyes",
    "persian": "a Persian cat with long flowing cream fur, a very flat squashed face, a wide flat nose, small ears, round copper-amber eyes, a huge fluffy tail",
    "curl": "an American Curl cat with pale silver-gray tabby fur, soft grey stripes, and ears that curl backwards at the tips, big round amber eyes",
    "russian": "a Russian Blue cat with dense silvery blue-gray short plush fur, a slender elegant body, vivid emerald-green eyes, a slightly smiling mouth",
    "bengal": "a Bengal cat with golden-amber fur covered in dark brown and black rosettes and spots, a lighter cream belly, a spotted tail, green eyes, sleek muscular body",
    "abyssinian": "an Abyssinian cat with warm ruddy ticked sandy-brown fur (each hair banded with darker colour), a slightly darker spine line, large wide ears, slim elegant body, green-gold eyes",
    "tortie": "a tortoiseshell cat with a mottled mix of black and dark reddish-orange patches across the body, head and tail, a small cream chin patch, copper eyes",
    "mainecoon": "a Maine Coon cat with long shaggy brown tabby fur, dark mackerel stripes, a huge ruff of fur around the neck, lynx-like tufts on the ear tips, a big plume tail, tufts between the toes, amber eyes",
    "ragdoll": "a Ragdoll cat with a creamy white long-haired body, soft dark seal-brown points on the face mask, ears, front legs and fluffy tail, vivid blue eyes",
    "bobtail": "a Japanese Bobtail cat with a white base coat and soft orange and black calico patches on the head, back and tail, a short curled pom-pom bobtail, amber eyes",
    "snowleopard": "a snow leopard with pale smoky-gray fur, dark grey rosettes and spots, a white chest and belly, a very thick fluffy spotted tail, small rounded ears, pale green eyes, still soft and cute",
    "cheetah": "a cheetah with golden-tan fur covered in solid small black round spots, a white belly and chin, black tear-stripe lines running from the eyes down the muzzle, a slim deep-chested body, long legs, amber eyes, still soft and cute",
    "pallas": "a Pallas's cat (manul) with an extremely plump round body, dense fluffy silver-grey and warm brown fur with dark grey bands, very short low-set ears on the sides of a wide round face, a fluffy tail, bright amber-green eyes, grumpy cute expression",
    "serval": "a serval with warm tan-golden fur covered in bold solid black spots and stripes, very long legs, huge tall upright ears, a short black-ringed tail, green-amber eyes, still soft and cute",
    "caracal": "a caracal with smooth reddish-tan short fur, long slender legs, tall pointed ears with long black tufts at the tips, black markings on the face, a short tail, green-gold eyes, still soft and cute",
    "puma": "a puma (cougar) with uniform tawny sandy-brown short fur, a white chin and chest, small rounded ears, a very long thick tail, a broad muscular body, amber eyes, still soft and cute",
    "lynx": "a Eurasian lynx with pale greyish-tan fur, faint darker spots on the legs, long black tufts on the ear tips, a wide ruff of cheek fur, a very short stubby tail, amber eyes, still soft and cute",
    "rex": "a Devon Rex cat with short soft wavy cream-pink fur, a slender body, very large wide ears set low, a big head, huge round eyes, a slightly curly coat, pink nose",
}

TYPES = list(LOOK)


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def one(t, pose, force=False):
    out_final = os.path.join(OUT, f"{t}-{pose}.png")
    if os.path.exists(out_final) and not force:
        return f"skip {t}-{pose}"
    raw = os.path.join(RAW, f"{t}-{pose}.png")
    if force or not os.path.exists(raw):
        style = STYLE.replace("{bg}", BG_COOL if t in LIGHT_TYPES else BG_CREAM)
        prompt = f"Repaint this cat illustration as {LOOK[t]}. {POSE[pose]}{style}"
        r = run(["images", prompt, "--edit", PROTO[pose], "--out", raw], cwd=WORK)
        if r.returncode != 0 or not os.path.exists(raw):
            return f"FAIL gen {t}-{pose}: {(r.stdout + r.stderr)[:200]}"
    r = run([sys.executable, os.path.join(ROOT, "tools", "cutout.py"), raw, out_final], cwd=ROOT)
    if not os.path.exists(out_final):
        return f"FAIL cut {t}-{pose}: {(r.stdout + r.stderr)[:200]}"
    return f"ok {t}-{pose} {os.path.getsize(out_final)//1024}KB"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("types", nargs="*")
    ap.add_argument("--pose", action="append", choices=list(POSE))
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    poses = a.pose or ["walk-1", "walk-2", "rest"]
    types = [t for t in (a.types or TYPES) if t in LOOK]
    tasks = []
    for t in types:
        for p in poses:
            if t == "tabby":
                # 承認済みの試作をそのまま使う（キジトラ）
                dst = os.path.join(OUT, f"tabby-{p}.png")
                if not os.path.exists(dst) or a.force:
                    run([sys.executable, os.path.join(ROOT, "tools", "cutout.py"), PROTO[p], dst], cwd=ROOT)
                    print(f"ok tabby-{p} (proto)", flush=True)
                continue
            tasks.append((t, p))

    t0 = time.time()
    done = 0
    with ThreadPoolExecutor(max_workers=max(1, a.jobs)) as ex:
        futs = [ex.submit(one, t, p, a.force) for t, p in tasks]
        for f in futs:
            done += 1
            print(f"[{done}/{len(tasks)}] {f.result()}  ({time.time()-t0:.0f}s)", flush=True)


if __name__ == "__main__":
    main()
