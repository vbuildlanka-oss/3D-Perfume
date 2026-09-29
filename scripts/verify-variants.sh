#!/usr/bin/env bash
# Asserts the motion rules numerically via the ?debug handle:
#   - default      : idle spin + bob + pointer tilt all active
#   - mobile       : 15 bokeh particles, camera travel compressed to 60%
#   - reduced motion: spin / bob / tilt all inert, scroll camera still live
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p /projects/sandbox/.kiro/artifacts/screenshots

cd "$ROOT/dist"
python3 -m http.server 4173 --bind 127.0.0.1 > /tmp/serve.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT
for _ in $(seq 1 20); do curl -s -o /dev/null http://127.0.0.1:4173/ && break; sleep 0.5; done

dbg () { agent-browser --session "$1" eval "JSON.stringify(window.__NOIR_DEBUG__)" 2>/dev/null | tail -1; }

# ================================================================ DEFAULT
echo "################ DEFAULT (desktop, motion allowed) ################"
agent-browser --session d close > /dev/null 2>&1
agent-browser --session d open "http://127.0.0.1:4173/?debug" > /dev/null 2>&1
sleep 12
A=$(dbg d); sleep 4; B=$(dbg d)
python3 - "$A" "$B" <<'PY'
import json, sys
a = json.loads(json.loads(sys.argv[1])); b = json.loads(json.loads(sys.argv[2]))
print(f"  rotationY: {a['groupRotationY']:.5f} -> {b['groupRotationY']:.5f}")
print(f"  positionY: {a['groupPositionY']:.5f} -> {b['groupPositionY']:.5f}")
print(f"  camera   : {[round(v,3) for v in a['cameraPosition']]}")
spin = b['groupRotationY'] != a['groupRotationY']
bob  = b['groupPositionY'] != a['groupPositionY']
print(f"  idle auto-rotation active : {'PASS' if spin else 'FAIL'}")
print(f"  vertical bob active       : {'PASS' if bob else 'FAIL'}")
print(f"  hero camera == [0,0,6]    : {'PASS' if [round(v,3) for v in a['cameraPosition']]==[0,0,6] else 'FAIL'}")
PY

echo "  --- pointer parallax should tilt rotation.x ---"
agent-browser --session d eval "window.dispatchEvent(new PointerEvent('pointermove',{clientX:window.innerWidth*0.9,clientY:window.innerHeight*0.1})); 'ok'" > /dev/null 2>&1
sleep 4
C=$(dbg d)
python3 - "$B" "$C" <<'PY'
import json, sys
b = json.loads(json.loads(sys.argv[1])); c = json.loads(json.loads(sys.argv[2]))
print(f"  rotationX: {b['groupRotationX']:.5f} -> {c['groupRotationX']:.5f}")
print(f"  pointer tilt responds     : {'PASS' if abs(c['groupRotationX']-b['groupRotationX'])>1e-4 else 'FAIL'}")
print(f"  tilt within +/-0.08 limit : {'PASS' if abs(c['groupRotationX'])<=0.0801 else 'FAIL'}")
PY

echo "  --- cap lift must be scrubbable in BOTH directions ---"
for target in 0.0 2.0 2.6 3.2 2.6 2.0 0.0; do
  agent-browser --session d eval "window.scrollTo(0, window.innerHeight*$target); 'ok'" > /dev/null 2>&1
  sleep 3
  R=$(dbg d)
  python3 - "$target" "$R" <<'PY'
import json, sys
r = json.loads(json.loads(sys.argv[2]))
print(f"    scrollVh={float(sys.argv[1])*100:6.0f}  p={r['progress']:.3f}  capProgress={r['capProgress']:.3f}  capY={r['capPositionY']:.3f}  capRotY={r['capRotationY']:.3f}")
PY
done
agent-browser --session d close > /dev/null 2>&1

# ================================================================= MOBILE
echo
echo "################ MOBILE (emulated width 390) ################"
agent-browser --session m close > /dev/null 2>&1
agent-browser --session m open --init-script "$ROOT/scripts/emulate-mobile.js" "http://127.0.0.1:4173/?debug" > /dev/null 2>&1
sleep 12
agent-browser --session m eval "JSON.stringify({bokeh: document.querySelectorAll('.bokeh-particle').length, expected: 15})" 2>/dev/null | tail -1
# NB: scroll by a fraction of the real max scroll, not by window.innerHeight —
# the emulation overrides innerHeight, so viewport multiples no longer land on
# a section boundary. 25% of max scroll is exactly the section-2 keyframe.
agent-browser --session m eval "window.scrollTo(0, (document.documentElement.scrollHeight - document.documentElement.clientHeight)*0.25); 'ok'" > /dev/null 2>&1
sleep 5
M=$(dbg m)
python3 - "$M" <<'PY'
import json, sys
m = json.loads(json.loads(sys.argv[1]))
cam = [round(v,3) for v in m['cameraPosition']]
print(f"  isMobile flag            : {'PASS' if m['isMobile'] else 'FAIL'}")
print(f"  progress                 : {m['progress']:.3f}  (expect 0.250)")
print(f"  camera at section 2      : {cam}")
# Desktop section-2 keyframe is [1.2,0.3,4.5]. Mobile compresses travel to 60%
# of the offset from the hero anchor [0,0,6]  ->  [0.72, 0.18, 5.10].
want = [0.72, 0.18, 5.10]
ok = all(abs(cam[i]-want[i]) < 0.08 for i in range(3))
print(f"  expected {want} (60% travel) : {'PASS' if ok else 'FAIL'}")
if not ok and abs(m['progress']-0.25) > 0.02:
    print("    (progress never settled on the keyframe — scrub still catching up)")
PY
agent-browser --session m close > /dev/null 2>&1

# ======================================================== REDUCED MOTION
echo
echo "################ PREFERS-REDUCED-MOTION ################"
agent-browser --session r close > /dev/null 2>&1
agent-browser --session r open --init-script "$ROOT/scripts/emulate-reduced-motion.js" "http://127.0.0.1:4173/?debug" > /dev/null 2>&1
sleep 12
P=$(dbg r); sleep 5; Q=$(dbg r)
agent-browser --session r eval "window.dispatchEvent(new PointerEvent('pointermove',{clientX:10,clientY:10})); 'ok'" > /dev/null 2>&1
sleep 4
S=$(dbg r)
python3 - "$P" "$Q" "$S" <<'PY'
import json, sys
p, q, s = (json.loads(json.loads(a)) for a in sys.argv[1:4])
print(f"  reducedMotion flag        : {'PASS' if p['reducedMotion'] else 'FAIL'}")
print(f"  rotationY over 5s         : {p['groupRotationY']:.6f} -> {q['groupRotationY']:.6f}")
print(f"  auto-rotation disabled    : {'PASS' if p['groupRotationY']==q['groupRotationY']==0 else 'FAIL'}")
print(f"  positionY (bob)           : {q['groupPositionY']:.6f}  -> {'PASS' if q['groupPositionY']==0 else 'FAIL'}")
print(f"  rotationX after pointer   : {s['groupRotationX']:.6f}  -> {'PASS' if s['groupRotationX']==0 else 'FAIL'}")
PY

echo "  --- scroll-tied camera must still work ---"
agent-browser --session r eval "window.scrollTo(0, document.documentElement.scrollHeight); 'ok'" > /dev/null 2>&1
sleep 4
T=$(dbg r)
python3 - "$T" <<'PY'
import json, sys
t = json.loads(json.loads(sys.argv[1]))
cam = [round(v,3) for v in t['cameraPosition']]
print(f"  progress at bottom        : {t['progress']:.3f}")
print(f"  camera                    : {cam}  (expect [0,0,5.5])")
print(f"  scroll camera still live  : {'PASS' if abs(cam[2]-5.5)<0.2 else 'FAIL'}")
print(f"  cap re-seated for finish  : {'PASS' if abs(t['capProgress'])<0.02 else 'FAIL'}")
PY
agent-browser --session r close > /dev/null 2>&1

# ============================================= CSS reduced-motion rule
echo
echo "################ CSS prefers-reduced-motion rule ################"
echo "(JS matchMedia patching cannot affect CSS, so this is a static check)"
grep -A 12 "prefers-reduced-motion" "$ROOT/src/index.css" | sed 's/^/  /'
