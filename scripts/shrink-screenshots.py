#!/usr/bin/env python3
"""
Downscale screenshots so they can be sent to vision models in batches.

Multi-image requests reject any image whose width or height exceeds 2000 px
("At least one of the image dimensions exceed max allowed size for many-image
requests: 2000 pixels"). This resizes every PNG/JPEG in the given directories
(or files) in place so the longest side is <= MAX_SIDE, preserving aspect ratio.

Usage: python3 scripts/shrink-screenshots.py <dir-or-file> [...] [--max 1568]
"""
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install pillow")

args = sys.argv[1:]
max_side = 1568  # comfortably under the 2000 px hard limit
if "--max" in args:
    i = args.index("--max")
    max_side = int(args[i + 1])
    del args[i : i + 2]
if not args:
    sys.exit(__doc__)

files = []
for a in args:
    p = Path(a)
    if p.is_dir():
        files += [f for f in sorted(p.iterdir()) if f.suffix.lower() in (".png", ".jpg", ".jpeg")]
    elif p.is_file():
        files.append(p)

for f in files:
    with Image.open(f) as im:
        w, h = im.size
        if max(w, h) <= max_side:
            print(f"  ok      {f.name}: {w}x{h}")
            continue
        scale = max_side / max(w, h)
        new = (max(1, round(w * scale)), max(1, round(h * scale)))
        im.resize(new, Image.LANCZOS).save(f, optimize=True)
        print(f"  resized {f.name}: {w}x{h} -> {new[0]}x{new[1]}")
