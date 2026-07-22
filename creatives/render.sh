#!/usr/bin/env bash
# Renders every creative HTML page to a 1080x1350 PNG.
# Usage: ./render.sh [brand-dir ...]   (defaults to all brand dirs)
set -euo pipefail
cd "$(dirname "$0")"

CHROME=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
[ -x "$CHROME" ] || CHROME=$(command -v chromium || command -v chromium-browser || command -v google-chrome)

DIRS=("$@")
[ ${#DIRS[@]} -eq 0 ] && DIRS=(trivd aimtogro tinkertaps ratetamer courtright-collective)

for dir in "${DIRS[@]}"; do
  mkdir -p "$dir/png" "$dir/pdf"
  for html in "$dir"/*.html; do
    [ -e "$html" ] || continue
    name=$(basename "$html" .html)
    "$CHROME" --headless --no-sandbox --disable-gpu \
      --screenshot="$dir/png/$name.png" \
      --window-size=1080,1350 --hide-scrollbars \
      --force-device-scale-factor=1 --virtual-time-budget=5000 \
      "file://$(pwd)/$html" 2>/dev/null | grep -o '^[0-9]* bytes' >/dev/null || true
    "$CHROME" --headless --no-sandbox --disable-gpu \
      --print-to-pdf="$dir/pdf/$name.pdf" --no-pdf-header-footer \
      --virtual-time-budget=5000 \
      "file://$(pwd)/$html" 2>/dev/null | grep -o '^[0-9]* bytes' >/dev/null || true
    echo "rendered $dir/png/$name.png + $dir/pdf/$name.pdf"
  done
  # Bundle the brand's 10 creatives into one PDF
  python3 - "$dir" <<'PY'
import sys, glob
from pypdf import PdfWriter, PdfReader
d = sys.argv[1]
files = sorted(glob.glob(f"{d}/pdf/[0-9][0-9]-*.pdf"))
if files:
    w = PdfWriter()
    for f in files:
        for p in PdfReader(f).pages:
            w.add_page(p)
    out = f"{d}/pdf/{d}-all-10.pdf"
    with open(out, "wb") as fh:
        w.write(fh)
    print(f"bundled {out} ({len(files)} pages)")
PY
done
