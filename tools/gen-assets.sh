#!/bin/sh
# 猫アセット生成（子猫13種 → 成猫13種）
set -e
cd "$(dirname "$0")/.."
OUT=tmp/catgen
mkdir -p "$OUT" assets/cats

STYLE='Cute stylized Japanese 2D game illustration, clean soft dark brown outlines, warm cel-shaded pastel colors, isolated on a clean soft warm cream background, no text, centered, full body, kawaii, big sparkling eyes, sitting upright'

kitten() {
  key=$1; desc=$2
  if [ ! -s "$OUT/$key-kitten.png" ]; then
    images "Cute stylized Japanese 2D game illustration of a small chubby $desc kitten, clean soft dark brown outlines, warm cel-shaded pastel colors, isolated on a clean soft warm cream background, no text, centered, full body, kawaii, big sparkling eyes, sitting upright" --out "$OUT/$key-kitten.png"
    echo "kitten $key done"
  else
    echo "kitten $key exists"
  fi
}

adult() {
  key=$1; desc=$2
  if [ ! -s "$OUT/$key-adult.png" ]; then
    images "Same character, same art style: turn this cute kitten into the very same cat fully grown as an adult $desc. Mature adult cat proportions, taller body, longer legs, grown-up face, still adorable and friendly, clean soft dark brown outlines, warm cel-shaded pastel colors, isolated on a clean soft warm cream background, no text, centered, full body, sitting upright" --edit "$OUT/$key-kitten.png" --out "$OUT/$key-adult.png"
    echo "adult $key done"
  else
    echo "adult $key exists"
  fi
}

case "$1" in
  kittens)
    kitten orange 'orange tabby (ginger) cat with soft darker orange stripes and a white chest'
    kitten black 'solid black cat with glossy fur and bright amber-gold eyes'
    kitten white 'pure white cat with soft fluffy fur and clear sky-blue eyes'
    kitten calico 'calico cat with white fur and orange and black patches'
    kitten tuxedo 'black and white tuxedo cat with a white chest, white paws and a white blaze on the face'
    kitten gray 'silver gray tabby cat with darker gray stripes'
    kitten siamese 'siamese cat with a cream body and dark brown face mask, ears, paws and tail'
    kitten fluffy 'long-haired fluffy cream and light gray cat with a big fluffy tail'
    kitten lion 'baby lion cub with soft golden-tan fur and tiny round ears'
    kitten tiger 'tiger cub with bright orange fur and bold black stripes'
    kitten leopard 'leopard cub with golden fur and dark rosette spots'
    kitten wildcat 'small wildcat kitten with brown spotted tabby fur and a thick tail'
    ;;
  adults)
    adult orange 'orange tabby (ginger) cat with soft darker orange stripes and a white chest'
    adult black 'solid black cat with glossy fur and bright amber-gold eyes'
    adult white 'pure white cat with soft fluffy fur and clear sky-blue eyes'
    adult calico 'calico cat with white fur and orange and black patches'
    adult tuxedo 'black and white tuxedo cat with a white chest, white paws and a white blaze on the face'
    adult gray 'silver gray tabby cat with darker gray stripes'
    adult siamese 'siamese cat with a cream body and dark brown face mask, ears, paws and tail'
    adult fluffy 'long-haired fluffy cream and light gray cat with a big fluffy tail'
    adult lion 'lion with soft golden-tan fur and a full warm brown mane around the head'
    adult tiger 'tiger with bright orange fur and bold black stripes'
    adult leopard 'leopard with golden fur and dark rosette spots'
    adult wildcat 'small wildcat with brown spotted tabby fur and a thick tail'
    ;;
esac
echo done
