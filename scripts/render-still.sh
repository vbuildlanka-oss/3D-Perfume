#!/usr/bin/env bash
# Renders a clean studio still of the shoe from the live scene, with all page
# chrome hidden, for use as editorial imagery.
#
#   scripts/render-still.sh <out.png> <chapter-index> <colourway-index> [bg]
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$1"; CHAPTER="$2"; COLOUR="$3"; BG="${4:-#f1efeb}"

cd "$ROOT/dist"
python3 -m http.server 4173 --bind 127.0.0.1 > /dev/null 2>&1 &
SERVER=$!
ab() { agent-browser --session still "$@"; }
trap 'kill $SERVER 2>/dev/null; ab close >/dev/null 2>&1' EXIT
for _ in $(seq 1 20); do curl -s -o /dev/null http://127.0.0.1:4173/ && break; sleep 0.3; done

ab open about:blank > /dev/null 2>&1
ab set viewport 1400 1000 > /dev/null 2>&1
ab set media light reduced-motion > /dev/null 2>&1   # no sway/bob: a steady pose
ab open "http://127.0.0.1:4173/?debug" > /dev/null 2>&1
sleep 9
ab eval "document.querySelectorAll('#chapter-colour [role=radio]')[$COLOUR].click(); 'ok'" > /dev/null 2>&1
ab eval "window.scrollTo(0, innerHeight * $CHAPTER); 'ok'" > /dev/null 2>&1
sleep 2
ab eval "(() => {
  const s = document.createElement('style');
  s.textContent = 'header, [data-copy], .pin, #after, [aria-hidden=true] > * { visibility: hidden !important; } body, html { background: $BG !important; }';
  document.head.appendChild(s); return 'ok';
})()" > /dev/null 2>&1
sleep 1.5
ab screenshot "$OUT" > /dev/null 2>&1
python3 "$ROOT/scripts/shrink-screenshots.py" "$OUT" --max 1568 > /dev/null
echo "rendered $OUT"
