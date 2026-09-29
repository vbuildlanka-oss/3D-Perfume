#!/usr/bin/env bash
# Headless visual verification of the production build.
# Serves dist/, drives a headless browser through the scroll sequence,
# captures a screenshot per section, then tears the server down.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHOTS="/projects/sandbox/.kiro/artifacts/screenshots"
SESSION="noir"
mkdir -p "$SHOTS"

cd "$ROOT/dist"
python3 -m http.server 4173 --bind 127.0.0.1 > /tmp/serve.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT

for _ in $(seq 1 20); do
  if curl -s -o /dev/null http://127.0.0.1:4173/; then break; fi
  sleep 0.5
done
echo "server up (pid $SERVER_PID)"

ab() { agent-browser --session "$SESSION" "$@"; }

ab open "http://127.0.0.1:4173/" 2>&1 | tail -5
# Keep captures under the 2000 px per-side limit for multi-image model requests.
ab viewport 1440 900 > /dev/null 2>&1
sleep 8

echo "=== WebGL / scene diagnostics ==="
ab eval "
(() => {
  const canvas = document.querySelector('canvas');
  const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
  return JSON.stringify({
    canvasPresent: !!canvas,
    canvasSize: canvas ? [canvas.width, canvas.height] : null,
    canvasZIndex: canvas ? getComputedStyle(canvas).zIndex : null,
    webglContextLost: gl ? gl.isContextLost() : 'no-context',
    renderer: (() => { try { const d = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(d.UNMASKED_RENDERER_WEBGL); } catch (e) { return 'unknown'; } })(),
    docHeightVh: Math.round((document.documentElement.scrollHeight / window.innerHeight) * 100),
    loaderStillMounted: !!document.querySelector('[aria-label=\"Loading NOIR AMBRE\"]'),
    bokehCount: document.querySelectorAll('.bokeh-particle').length,
    bgLayerZ: Array.from(document.querySelectorAll('[aria-hidden=\"true\"] > div')).map(d => getComputedStyle(d).zIndex),
    cssVars: ['--bg-base','--accent-gold','--liquid-amber'].map(v => getComputedStyle(document.documentElement).getPropertyValue(v).trim()),
    displayFont: getComputedStyle(document.querySelector('h1')).fontFamily
  }, null, 1);
})()
" 2>&1 | tail -30

echo "=== console errors ==="
ab eval "JSON.stringify(window.__errs || [])" 2>&1 | tail -5

echo "=== section 1 (hero) ==="
ab screenshot "$SHOTS/01-hero.png" 2>&1 | tail -2

scroll_to () {
  ab eval "window.scrollTo(0, window.innerHeight * $1); 'ok'" > /dev/null 2>&1
  sleep 4
}

echo "=== section 2 ==="; scroll_to 1;   ab screenshot "$SHOTS/02-notes.png" 2>&1 | tail -2
echo "=== section 3 (cap lift) ==="; scroll_to 2; ab screenshot "$SHOTS/03-caplift.png" 2>&1 | tail -2
echo "=== section 4 ==="; scroll_to 3;  ab screenshot "$SHOTS/04-craft.png" 2>&1 | tail -2
echo "=== section 5 ==="; scroll_to 4;  ab screenshot "$SHOTS/05-cta.png" 2>&1 | tail -2

echo "=== scroll-state readout at bottom ==="
ab eval "
(() => {
  const cap = [];
  return JSON.stringify({
    scrollY: Math.round(window.scrollY),
    maxScroll: Math.round(document.documentElement.scrollHeight - window.innerHeight),
    ctaVisible: (() => { const b = document.querySelector('button'); return b ? getComputedStyle(b.parentElement).opacity : null; })(),
    ctaText: document.querySelector('button')?.innerText,
    ctaBg: document.querySelector('button') ? getComputedStyle(document.querySelector('button')).backgroundColor : null,
    cap
  }, null, 1);
})()
" 2>&1 | tail -12

echo "=== scrub back up to mid-cap-lift, confirm reversibility ==="
ab eval "window.scrollTo(0, window.innerHeight * 2.5); 'ok'" > /dev/null 2>&1
sleep 4
ab screenshot "$SHOTS/06-scrub-back.png" 2>&1 | tail -2

echo "=== downscale screenshots (<=1568 px per side) ==="
python3 -c "import PIL" 2>/dev/null || pip install -q pillow > /dev/null 2>&1
python3 "$ROOT/scripts/shrink-screenshots.py" "$SHOTS"

ls -la "$SHOTS"
