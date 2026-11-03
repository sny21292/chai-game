#!/bin/sh
# Portal cover images (CrazyGames: 1920x1080, 800x1200, 800x800) into marketing/covers/.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/marketing/covers"; mkdir -p "$OUT"
for size in 1920x1080 800x1200 800x800; do
  w=${size%x*}; h=${size#*x}
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --window-size=$w,$h --virtual-time-budget=500 --screenshot="$OUT/cover-$size.png" "file://$ROOT/tools/cover.html?w=$w&h=$h" >/dev/null 2>&1
  echo "$OUT/cover-$size.png"
done
