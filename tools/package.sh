#!/bin/sh
# Build the zip to upload to CrazyGames (Developer Portal → HTML5 upload): just the game files, no tools or docs.
# usage: tools/package.sh   →   dist/floor-pe-dhokha-web.zip
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node tools/tests/flow.js >/dev/null && node tools/tests/i18n.js >/dev/null || { echo "tests failed, not packaging"; exit 1; }
mkdir -p dist
rm -f dist/floor-pe-dhokha-web.zip
zip -qr dist/floor-pe-dhokha-web.zip index.html privacy.html manifest.webmanifest sw.js js icons -x '*.DS_Store'
ls -l dist/floor-pe-dhokha-web.zip | awk '{print $5 " bytes  " $9}'
