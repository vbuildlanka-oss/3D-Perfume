#!/usr/bin/env bash
# Exercises the shop flow against the production build:
#   colourway swap -> page accent + 3D material follow
#   add to bag without a size -> nudge, no item
#   pick a size, add -> bag count, toast
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/../.work}"
mkdir -p "$OUT"

cd "$ROOT/dist"
python3 -m http.server 4173 --bind 127.0.0.1 > /dev/null 2>&1 &
SERVER=$!
ab() { agent-browser --session interactions "$@"; }
trap 'kill $SERVER 2>/dev/null; ab close >/dev/null 2>&1' EXIT
for _ in $(seq 1 20); do curl -s -o /dev/null http://127.0.0.1:4173/ && break; sleep 0.3; done

ab open "about:blank" > /dev/null 2>&1
ab set viewport 1440 900 > /dev/null 2>&1
ab open "http://127.0.0.1:4173/?debug" > /dev/null 2>&1
sleep 9

q() { ab eval "$1" 2>/dev/null | tail -1; }
click() { q "(() => { const el = $1; if (!el) return 'missing'; el.click(); return 'ok'; })()" > /dev/null; sleep "${2:-0.6}"; }
buyBtn() { echo "[...document.querySelectorAll('#chapter-buy button')].find(b => b.textContent.trim()$1)"; }

q "window.scrollTo(0, innerHeight * 6); 'ok'" > /dev/null; sleep 3

check() { # label, expression, expected
  local got; got=$(q "$2")
  if [ "$got" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1 (got $got, want $3)"; fi
}

check "starts in Harbour"            "window.__KESTREL_DEBUG__.colorway"                        '"harbour"'
click "document.querySelectorAll('#chapter-buy [role=radio]')[2]" 1
check "swatch switches to Signal"    "window.__KESTREL_DEBUG__.colorway"                        '"signal"'
check "page accent follows"          "getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()" '"#d23b3d"'
check "shoe material swapped"        "window.__KESTREL_VARIANT__"                               '"street"'

click "$(buyBtn ".startsWith('Add')")"
check "no size -> nothing added"     "document.querySelector('header button[aria-expanded] span').textContent" '"0"'
check "no size -> nudge shown"       "document.querySelector('#chapter-buy [role=status]').className.includes('opacity-100')" 'true'

click "$(buyBtn " === '9.5'")"
check "sold-out size is disabled"    "$(buyBtn " === '9.5'").disabled" 'true'

click "$(buyBtn " === '9'")"
click "$(buyBtn ".startsWith('Add')")"
check "size 9 -> bag count 1"        "document.querySelector('header button[aria-expanded] span').textContent" '"1"'
check "toast confirms"               "document.querySelector('.toast')?.textContent.startsWith('Signal, US 9')" 'true'
ab screenshot "$OUT/interactions.png" > /dev/null 2>&1

click "document.querySelector('header button[aria-expanded]')"
check "bag lists the item"           "document.querySelector('header ul li')?.textContent.includes('Signal')" 'true'

echo "--- page errors"
ab errors 2>&1 | tail -5

python3 "$ROOT/scripts/shrink-screenshots.py" "$OUT/interactions.png" --max 1568 > /dev/null
