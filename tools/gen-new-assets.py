#!/usr/bin/env python3
"""世界猫生ガチャ — 特徴の強い猫種（子猫／成猫）を追加生成する。

    python3 tools/gen-new-assets.py                 # 未生成のタイプを全部
    python3 tools/gen-new-assets.py scottish lynx   # 指定タイプだけ
    python3 tools/gen-new-assets.py --adults        # 子猫から成猫だけ作る
    python3 tools/gen-new-assets.py --force persian # 既存も作り直す

- 子猫は既存アセット（assets/cats/tabby-kitten.png）を --edit して
  画風・ポーズ・太め焦げ茶輪郭をそろえる
- 成猫は同じ子猫画像を --edit して「同じ子が育った姿」にする
- どちらも tools/cutout.py でクリーム背景を透過し、内部透けゼロの 512px PNG に
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "tmp", "newgen")
OUT = os.path.join(ROOT, "assets", "cats")
BASE = os.path.join(OUT, "tabby-kitten.png")

STYLE = ("Keep this exact cute 2D Japanese game illustration style, the same sitting pose, "
         "the same framing, the same thick soft dark-brown outlines and warm cel-shaded pastel "
         "shading, but change the cat into ")
BG = (", sitting facing the viewer, big sparkling eyes, isolated on a clean flat soft warm cream "
      "background, no shadow under the cat, no text, centered, full body")

# key: (子猫の説明, 成猫のときの補足)
NEW = {
    # ---- イエネコ・純血種系 ----
    "scottish": (
        "a Scottish Fold kitten: both ears folded forward and lying flat against the round head "
        "like little flaps, very round chubby face, huge round amber eyes, plush solid blue-gray "
        "fur with a white chest and white paws, no stripes, no tabby markings, chubby small body",
        "a Scottish Fold adult: folded ears still flat against the head, plush solid blue-gray fur, "
        "round chubby face, calm half-lidded amber eyes"),
    "sphynx": (
        "a hairless Sphynx kitten: completely hairless bare skin in pale warm pinkish gray, visible "
        "soft wrinkles on the head and chest, huge wide upright bat-like ears, wrinkled forehead, "
        "slim body with a round pot belly, no fur, no stripes",
        "a hairless Sphynx adult: bare pinkish-gray wrinkled skin, huge bat-like ears, long slim "
        "body with a pot belly, no fur at all"),
    "munchkin": (
        "a Munchkin kitten with comically short stubby legs: a low-slung chubby body sitting close "
        "to the floor, big round head, tiny short front legs with small paws tucked right under the "
        "chest, warm brown mackerel tabby fur with bold dark brown stripes and a white chest",
        "a Munchkin adult with comically short stubby legs: a low-slung body sitting close to the "
        "floor, very short front legs clearly visible, brown mackerel tabby stripes, big round eyes"),
    "persian": (
        "a Persian kitten with a clearly visible body and four legs: extremely flat pushed-in face "
        "with a tiny nose sitting between the eyes, long flowing fluffy cream-white fur, small "
        "low-set round ears, big round copper eyes, front legs and paws standing squarely under "
        "the fluffy chest, a very fluffy tail beside the body",
        "a Persian adult with a clearly visible body and four legs: extremely flat pushed-in face, "
        "long flowing cream-white fur, small low-set ears, fluffy chest, front paws standing "
        "under the body, a very fluffy tail, round copper eyes"),
    "curl": (
        "an American Curl kitten: ears curling backwards away from the face in a smooth arc, "
        "silky silver-gray and white fur with soft shading, round face, big round eyes",
        "an American Curl adult: ears curled backwards in a smooth arc, silky silver-gray fur, "
        "round face, alert eyes"),
    "russian": (
        "a Russian Blue kitten: short dense silver-blue plush fur, vivid emerald green eyes, slim "
        "elegant body, small neat ears, no stripes, no white patches",
        "a Russian Blue adult: short dense silver-blue plush fur, vivid emerald green eyes, slim "
        "long elegant body, small neat ears"),
    "bengal": (
        "a Bengal kitten: golden-amber coat with dark brown rosette spots and a glittering sheen, "
        "small rounded ears, bold black tear lines from the eyes, sleek muscular body, spotted tail",
        "a Bengal adult: golden-amber coat covered with dark brown rosette spots, glittering sheen, "
        "sleek muscular body, bold black tear lines"),
    "abyssinian": (
        "an Abyssinian kitten: warm ruddy reddish-brown ticked coat with darker shading along the "
        "spine, very large upright ears set wide apart, slender athletic body, almond amber eyes, "
        "pale chin, no stripes, no spots",
        "an Abyssinian adult: ruddy ticked reddish-brown coat, very large upright ears, long "
        "slender athletic body, almond amber eyes"),
    "tortie": (
        "a tortoiseshell (sabi) kitten: mottled patchwork of black and warm red-orange fur with "
        "no white at all, face split into black and orange patches, amber eyes, soft fluffy fur",
        "a tortoiseshell adult: mottled black and red-orange patchwork fur with no white, split "
        "face pattern, amber eyes, fluffy coat"),
    "mainecoon": (
        "a Maine Coon kitten: large longhaired brown tabby, lynx-tipped ears with long tufts, big "
        "fluffy neck ruff, huge bushy tail, big round paws, tufts of fur between the toes",
        "a Maine Coon adult: large longhaired brown tabby, long lynx tufts on the ears, huge fluffy "
        "neck ruff, bushy tail, big paws, tufts between the toes"),
    "ragdoll": (
        "a Ragdoll kitten: semi-longhair cream coat with dark chocolate-brown colorpoint on the "
        "face mask, ears and paws, big bright blue eyes, very fluffy tail and chest",
        "a Ragdoll adult: semi-longhair cream coat with dark chocolate-brown face mask, ears and "
        "paws, big bright blue eyes, very fluffy tail"),
    "bobtail": (
        "a Japanese Bobtail kitten: a clear short pom-pom stub of a tail sticking up at the back "
        "like a little cotton ball, calico white with orange and black patches, big upright ears, "
        "slim body, white paws",
        "a Japanese Bobtail adult: a clear short pom-pom stub tail sticking up at the back, calico "
        "white with orange and black patches, big upright ears, slim elegant body"),
    "rex": (
        "a Cornish Rex kitten: a short coat that is wavy and curly all over like a soft rippled "
        "wave pattern, very large upright ears, slim arched back, long thin tail, big round eyes, "
        "cream and soft peach coloring with no stripes",
        "a Cornish Rex adult: a short wavy curly rippled coat, very large upright ears, slim arched "
        "body, long thin tail, big round eyes, cream coloring with no stripes"),
    # ---- 野生のネコ科 ----
    "snowleopard": (
        "a snow leopard cub: very pale smoky white and silver-gray fur with dark gray rosette "
        "spots, extremely thick long fluffy tail, small rounded ears, thick fluffy neck ruff, "
        "stocky body, big fluffy paws",
        "a snow leopard adult: pale smoky white-gray fur with dark gray rosette spots, extremely "
        "thick long fluffy tail, small rounded ears, thick neck ruff, stocky powerful body"),
    "cheetah": (
        "a cheetah cub: golden-yellow coat covered in small solid black spots, and two bold black "
        "tear-mark stripes clearly running from the inner corners of both eyes straight down to the "
        "sides of the mouth, small round head, slim body, long spotted tail",
        "a cheetah adult: golden-yellow coat covered in small solid black spots, two bold black "
        "tear-mark stripes clearly running from the inner corners of both eyes down to the sides of "
        "the mouth, small round head, slim deep-chested body, long spotted tail"),
    "pallas": (
        "a Pallas's cat (manul) kitten: extremely round stocky body, flat round face, tiny low-set "
        "rounded ears on the sides of the head, very thick dense gray-beige fur, short thick "
        "fluffy tail, grumpy cute expression",
        "a Pallas's cat (manul) adult: extremely round stocky body, flat round face, tiny low-set "
        "ears on the sides of the head, very thick dense gray-beige fur, short thick tail, grumpy "
        "cute expression"),
    "serval": (
        "a serval kitten: tall slender body with very long legs, huge tall rounded ears with black "
        "backs and a white bar, golden-tan coat with bold solid black spots, short tail with black "
        "rings",
        "a serval adult: very long legs, huge tall rounded ears with black backs, golden-tan coat "
        "with bold black spots, short ringed tail"),
    "caracal": (
        "a caracal kitten: plain sandy-tawny coat with no spots, very long black tufts of fur at "
        "the tips of tall pointed ears, black facial stripes, slim long-legged body, short tail",
        "a caracal adult: plain sandy-tawny coat, long black tufts at the tips of tall pointed "
        "ears, black facial stripes, slim long-legged body, short tail"),
    "puma": (
        "a puma (cougar) cub: plain solid tawny sandy fur with no spots or stripes, stocky "
        "muscular body, small rounded ears, black nose and black muzzle line, thick long tail, "
        "pale cream belly",
        "a puma (cougar) adult: plain solid tawny sandy fur with no spots, muscular powerful body, "
        "small rounded ears, black nose, thick long tail, pale belly"),
    "lynx": (
        "a lynx kitten: tufted pointed ears with black tips, big fluffy white cheek ruff, pale "
        "gray-brown spotted fur, very short bobbed tail with a black tip, huge fluffy paws",
        "a lynx adult: long black tufts on the ears, big fluffy cheek ruff, pale gray-brown "
        "spotted fur, very short black-tipped bobbed tail, huge fluffy paws"),
}

ORDER = list(NEW.keys())


def run(cmd):
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if p.returncode != 0:
        print("  FAILED:", cmd[:120])
        print("  ", (p.stderr or p.stdout).strip()[:400])
        return False
    return True


def gen_kitten(key, force=False):
    raw = os.path.join(RAW, f"{key}-kitten-raw.png")
    dst = os.path.join(OUT, f"{key}-kitten.png")
    if os.path.exists(dst) and not force:
        print(f"skip {key}-kitten (exists)")
        return True
    os.makedirs(RAW, exist_ok=True)
    if not os.path.exists(os.path.join(RAW, f"{key}-kitten-raw.png")):
        prompt = STYLE + NEW[key][0] + BG
        if not run(f'images "{prompt}" --edit "{BASE}" --out "{raw}"'):
            return False
    return run(f'python3 tools/cutout.py "{raw}" "{dst}"')


def gen_adult(key, force=False):
    src = os.path.join(RAW, f"{key}-kitten-raw.png")
    raw = os.path.join(RAW, f"{key}-adult-raw.png")
    dst = os.path.join(OUT, f"{key}-adult.png")
    if os.path.exists(dst) and not force:
        print(f"skip {key}-adult (exists)")
        return True
    if not os.path.exists(src):
        print(f"  missing {src} (kitten first)")
        return False
    if not os.path.exists(raw):
        prompt = ("Same character, same art style and the same sitting pose: turn this cute "
                  "kitten into the very same cat fully grown, as " + NEW[key][1] +
                  ". Mature adult cat proportions, taller body, longer legs, grown-up face, still "
                  "adorable and friendly, thick soft dark-brown outlines, warm cel-shaded pastel "
                  "shading, isolated on a clean flat soft warm cream background, no shadow under "
                  "the cat, no text, centered, full body")
        if not run(f'images "{prompt}" --edit "{src}" --out "{raw}"'):
            return False
    return run(f'python3 tools/cutout.py "{raw}" "{dst}"')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    adults_only = "--adults" in sys.argv
    keys = args or ORDER
    for k in keys:
        if k not in NEW:
            print("unknown key", k)
            continue
        print(f"== {k}")
        if not adults_only:
            gen_kitten(k, force)
        gen_adult(k, force)
    print("done")


if __name__ == "__main__":
    main()
