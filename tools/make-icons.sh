#!/bin/sh
# Regenerates icons/ from tools/icon.html (needs Google Chrome; uses macOS sips to resize).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shoot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --default-background-color=00000000 \
  --window-size=512,512 --virtual-time-budget=300 --screenshot="$2" "file://$ROOT/tools/icon.html$1" >/dev/null 2>&1; }
shoot "" "$ROOT/icons/icon-512.png"
shoot "?maskable" "$ROOT/icons/icon-maskable-512.png"
sips -z 192 192 "$ROOT/icons/icon-512.png" --out "$ROOT/icons/icon-192.png" >/dev/null
sips -z 180 180 "$ROOT/icons/icon-maskable-512.png" --out "$ROOT/icons/apple-touch-icon.png" >/dev/null   # iOS rounds corners itself
ls -la "$ROOT/icons"
