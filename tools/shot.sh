#!/bin/sh
# Screenshot a level with headless Chrome.
# usage: tools/shot.sh <level number | world:n (e.g. kerala:3) | world:boss:room (e.g. delhi:boss:3) | title | map> [frames] [out.png] [js to run first]
#   SHOT_SCALE=2 for 2x pixels; SHOT_SIZE=844,390 for a phone-sized window (default 960,540)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WHAT="${1:-1}"; FRAMES="${2:-60}"; OUT="${3:-$ROOT/tools/shot.png}"; PRE="${4:-}"
TMP="$(mktemp -d)"
case "$WHAT" in
  title) GO="" ;;
  map|menu) GO="openMenu(); $PRE; for (let i = 0; i < ${FRAMES}; i++) update();" ;;
  *:boss:*) R="${WHAT##*:}"; WID="${WHAT%%:*}"; GO="startAt(LEVELS.findIndex(l => WORLDS[l.world].id === '$WID' \&\& l.rooms), $R - 1); $PRE; for (let i = 0; i < $FRAMES; i++) update();" ;;
  *:*) GO="startAt(LEVELS.findIndex(l => WORLDS[l.world].id === '${WHAT%%:*}' \&\& l.num === ${WHAT##*:} - 1)); $PRE; for (let i = 0; i < $FRAMES; i++) update();" ;;
  *) GO="startAt($WHAT - 1); $PRE; for (let i = 0; i < $FRAMES; i++) update();" ;;
esac
sed -e "s#<head>#<head><base href=\"file://$ROOT/\">#" \
    -e "s#<script src=\"js/game.js\"></script>#<script src=\"js/game.js\"></script><script>$GO</script>#" \
    "$ROOT/index.html" > "$TMP/shot.html"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --allow-file-access-from-files --window-size=${SHOT_SIZE:-960,540} --force-device-scale-factor="${SHOT_SCALE:-1}" --virtual-time-budget=400 --screenshot="$OUT" "file://$TMP/shot.html" >/dev/null 2>&1
rm -rf "$TMP"
echo "$OUT"
