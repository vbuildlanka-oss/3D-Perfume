#!/usr/bin/env bash
# Walks the production build chapter by chapter and screenshots each one.
#
#   scripts/verify-story.sh [desktop|mobile] [out-dir]
#
# Every capture is downscaled to <= 1568px per side before the script exits
# (vision models reject multi-image requests with any side over 2000px).
set -uo pipefail

MODE="${1:-desktop}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${2:-$ROOT/../.work/shots-$MODE}"
SESSION="story-$MODE"
mkdir -p "$OUT"
rm -f "$OUT"/*.png

if [ "$MODE" = "mobile" ]; then W=390; H=844; else W=1440; H=900; fi

cd "$ROOT/dist"
python3 -m http.server 4173 --bind 127.0.0.1 > /dev/null 2>&1 &
SERVER=$!
ab() { agent-browser --session "$SESSION" "$@"; }
trap 'kill $SERVER 2>/dev/null; ab close >/dev/null 2>&1' EXIT
for _ in $(seq 1 20); do curl -s -o /dev/null http://127.0.0.1:4173/ && break; sleep 0.3; done

ab open "about:blank" > /dev/null 2>&1
ab set viewport "$W" "$H" > /dev/null 2>&1
ab open "http://127.0.0.1:4173/?debug" > /dev/null 2>&1
sleep 9

echo "=== page ==="
ab eval "JSON.stringify({
  vh: Math.round(document.documentElement.scrollHeight / innerHeight * 100),
  viewport: [innerWidth, innerHeight, devicePixelRatio],
  loader: !!document.querySelector('[aria-label^=\"Loading\"]'),
  canvas: (() => { const c = document.querySelector('canvas'); return c && [c.width, c.height]; })(),
})" 2>&1 | tail -1

shot() { # name, scrollY expression
  ab eval "window.scrollTo(0, $2); 'ok'" > /dev/null 2>&1
  sleep "${SETTLE:-3}"
  ab screenshot "$OUT/$1.png" > /dev/null 2>&1
  printf '%-12s %s\n' "$1" "$(ab eval 'JSON.stringify(window.__KESTREL_DEBUG__ && {p: +window.__KESTREL_DEBUG__.progress.toFixed(3), cam: window.__KESTREL_DEBUG__.camera.map(v=>+v.toFixed(2))})' 2>/dev/null | tail -1)"
}

for i in 0 1 2 3 4 5 6; do
  shot "c$i" "innerHeight * $i"
done
shot "after-reviews" "document.getElementById('reviews').offsetTop + document.getElementById('after').offsetTop - 60"
shot "after-journal" "document.getElementById('journal').offsetTop + document.getElementById('after').offsetTop - 60"
shot "after-footer"  "document.documentElement.scrollHeight"

echo "=== errors ==="
ab errors 2>&1 | tail -5

python3 "$ROOT/scripts/shrink-screenshots.py" "$OUT" --max 1568 | grep -c resized | sed 's/^/resized: /'
