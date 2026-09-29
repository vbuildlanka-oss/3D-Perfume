#!/usr/bin/env bash
# Motion rules, asserted numerically through the ?debug handle:
#   default         idle sway + bob are live, pointer tilts the shoe
#   reduced motion  idle sway, bob and tilt are all exactly 0, Lenis is off,
#                   and the scroll-driven pose still resolves
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/dist"
python3 -m http.server 4173 --bind 127.0.0.1 > /dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; agent-browser --session m1 close >/dev/null 2>&1; agent-browser --session m2 close >/dev/null 2>&1' EXIT
for _ in $(seq 1 20); do curl -s -o /dev/null http://127.0.0.1:4173/ && break; sleep 0.3; done

dbg() { agent-browser --session "$1" eval "JSON.stringify(window.__KESTREL_DEBUG__)" 2>/dev/null | tail -1; }

boot() { # session, [reduced]
  agent-browser --session "$1" open about:blank > /dev/null 2>&1
  agent-browser --session "$1" set viewport 1440 900 > /dev/null 2>&1
  [ "${2:-}" = reduced ] && agent-browser --session "$1" set media light reduced-motion > /dev/null 2>&1
  agent-browser --session "$1" open "http://127.0.0.1:4173/?debug" > /dev/null 2>&1
  sleep 9
}

echo "## default"
boot m1
A=$(dbg m1); sleep 2
agent-browser --session m1 eval "window.dispatchEvent(new PointerEvent('pointermove',{clientX:innerWidth*0.95,clientY:innerHeight*0.05})); 'ok'" > /dev/null 2>&1
sleep 2; B=$(dbg m1)
LENIS=$(agent-browser --session m1 eval "document.documentElement.classList.contains('lenis')" 2>/dev/null | tail -1)
python3 - "$A" "$B" "$LENIS" <<'PY'
import json, sys
a, b = (json.loads(json.loads(x)) for x in sys.argv[1:3])
ok = lambda c: 'PASS' if c else 'FAIL'
print(f"{ok(a['motionRotation'][1] != b['motionRotation'][1])}  idle sway moves the shoe")
print(f"{ok(a['motionPositionY'] != b['motionPositionY'])}  bob is live")
print(f"{ok(b['motionRotation'][0] < -0.02)}  pointer tilts the shoe (rot.x {b['motionRotation'][0]:.3f})")
print(f"{ok(sys.argv[3] == 'true')}  smooth scroll (Lenis) enabled")
PY

echo "## prefers-reduced-motion"
boot m2 reduced
agent-browser --session m2 eval "window.dispatchEvent(new PointerEvent('pointermove',{clientX:innerWidth*0.95,clientY:innerHeight*0.05})); 'ok'" > /dev/null 2>&1
sleep 2; C=$(dbg m2)
agent-browser --session m2 eval "window.scrollTo(0, innerHeight*3); 'ok'" > /dev/null 2>&1
sleep 2; D=$(dbg m2)
LENIS=$(agent-browser --session m2 eval "document.documentElement.classList.contains('lenis')" 2>/dev/null | tail -1)
python3 - "$C" "$D" "$LENIS" <<'PY'
import json, sys
c, d = (json.loads(json.loads(x)) for x in sys.argv[1:3])
ok = lambda x: 'PASS' if x else 'FAIL'
print(f"{ok(all(v == 0 for v in c['motionRotation']) and c['motionPositionY'] == 0)}  sway, bob and tilt are all 0")
print(f"{ok(abs(d['progress'] - 0.5) < 0.01)}  scroll still drives the story (p={d['progress']:.3f})")
print(f"{ok(sys.argv[3] == 'false')}  smooth scroll disabled")
PY
