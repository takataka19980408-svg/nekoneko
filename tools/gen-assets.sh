#!/bin/sh
# 猫アセット生成（子猫13種 → 成猫13種）→ 背景透過 → assets/cats/
#
#   sh tools/gen-assets.sh kittens            # 子猫13枚すべて
#   sh tools/gen-assets.sh adults             # 成猫13枚すべて（子猫画像を --edit で成長させる）
#   sh tools/gen-assets.sh kitten black       # 子猫1枚だけ
#   sh tools/gen-assets.sh adult black        # 成猫1枚だけ
#
# 生成物は tmp/catgen/ に残し、tools/cutout.py で背景を抜いて assets/cats/ に置く。
set -e
cd "$(dirname "$0")/.."
OUT="$(pwd)/tmp/catgen"
mkdir -p "$OUT" assets/cats

BG='isolated on a clean flat soft warm cream background, no shadow under the cat, no text, centered, full body, sitting facing the viewer'

kitten() {
  key=$1; desc=$2
  images "Cute stylized Japanese 2D game illustration of a small chubby $desc kitten, clean soft dark brown outlines, warm cel-shaded pastel colors, $BG, kawaii, big sparkling eyes" --out "$OUT/$key-kitten.png"
  python3 tools/cutout.py "$OUT/$key-kitten.png" "assets/cats/$key-kitten.png"
  echo "kitten $key done"
}

adult() {
  key=$1; desc=$2
  if [ ! -s "$OUT/$key-kitten.png" ]; then
    echo "missing $OUT/$key-kitten.png (kitten first)"; return 1
  fi
  images "Same character, same art style: turn this cute kitten into the very same cat fully grown as an adult $desc. Mature adult cat proportions, taller body, longer legs, grown-up face, still adorable and friendly, clean soft dark brown outlines, warm cel-shaded pastel colors, $BG" --edit "$OUT/$key-kitten.png" --out "$OUT/$key-adult.png"
  python3 tools/cutout.py "$OUT/$key-adult.png" "assets/cats/$key-adult.png"
  echo "adult $key done"
}

DESC_TABBY='brown mackerel tabby cat with warm brown fur and bold dark brown stripes'
DESC_ORANGE='orange tabby (ginger) cat with soft darker orange stripes and a white chest'
DESC_BLACK='solid black cat with glossy fur and bright amber-gold eyes'
DESC_WHITE='pure white cat with soft fluffy fur and clear sky-blue eyes'
DESC_CALICO='calico cat with white fur and orange and black patches'
DESC_TUXEDO='black and white tuxedo cat with a white chest, white paws and a white blaze on the face'
DESC_GRAY='silver gray tabby cat with darker gray stripes'
DESC_SIAMESE='siamese cat with a cream body and dark brown face mask, ears, paws and tail'
DESC_FLUFFY='long-haired fluffy cream and light gray cat with a big fluffy tail'
DESC_LION='lion cub with soft golden-tan fur and tiny round ears'
DESC_LION_A='lion with soft golden-tan fur and a full warm brown mane around the head'
DESC_TIGER='tiger cub with bright orange fur and bold black stripes'
DESC_LEOPARD='leopard cub with golden fur and dark rosette spots'
DESC_WILDCAT='small wildcat kitten with brown spotted tabby fur and a thick tail'

desc_for() {
  case "$1" in
    tabby) echo "$DESC_TABBY" ;;
    orange) echo "$DESC_ORANGE" ;;
    black) echo "$DESC_BLACK" ;;
    white) echo "$DESC_WHITE" ;;
    calico) echo "$DESC_CALICO" ;;
    tuxedo) echo "$DESC_TUXEDO" ;;
    gray) echo "$DESC_GRAY" ;;
    siamese) echo "$DESC_SIAMESE" ;;
    fluffy) echo "$DESC_FLUFFY" ;;
    lion) echo "$DESC_LION" ;;
    tiger) echo "$DESC_TIGER" ;;
    leopard) echo "$DESC_LEOPARD" ;;
    wildcat) echo "$DESC_WILDCAT" ;;
  esac
}

desc_for_adult() {
  if [ "$1" = "lion" ]; then echo "$DESC_LION_A"; else desc_for "$1"; fi
}

KEYS='tabby orange black white calico tuxedo gray siamese fluffy lion tiger leopard wildcat'

run_kittens() {
  for k in $KEYS; do kitten "$k" "$(desc_for $k)"; done
}

run_adults() {
  for k in $KEYS; do adult "$k" "$(desc_for_adult $k)"; done
}

case "$1" in
  kittens) run_kittens ;;
  adults) run_adults ;;
  kitten) kitten "$2" "$(desc_for "$2")" ;;
  adult) adult "$2" "$(desc_for_adult "$2")" ;;
  *) echo "usage: gen-assets.sh kittens|adults|kitten <key>|adult <key>"; exit 1 ;;
esac
echo done
