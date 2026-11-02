#!/bin/sh
# Store / portal screenshots at 1920x1080, one per world plus title and menu, into marketing/screenshots/.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/marketing/screenshots"
mkdir -p "$OUT"
export SHOT_SCALE=2
"$ROOT/tools/shot.sh" title 0 "$OUT/00-title.png"
"$ROOT/tools/shot.sh" menu 0 "$OUT/01-menu.png" "save.level=23; G.sel=21"
"$ROOT/tools/shot.sh" mumbai:4 75 "$OUT/02-mumbai-train.png" "G.held.right=true"
"$ROOT/tools/shot.sh" delhi:1 110 "$OUT/03-delhi-cow.png" "G.held.right=true"
"$ROOT/tools/shot.sh" rajasthan:8 120 "$OUT/04-rajasthan-camels.png"
"$ROOT/tools/shot.sh" kerala:6 120 "$OUT/05-kerala-houseboat.png"
"$ROOT/tools/shot.sh" himalaya:10 150 "$OUT/06-himalaya-finale.png" "G.held.right=true"
