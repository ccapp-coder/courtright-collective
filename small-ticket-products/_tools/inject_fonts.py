#!/usr/bin/env python3
"""
Inline the Courtright Collective brand fonts into a self-contained HTML tool.

Usage:
    python3 inject_fonts.py <file.html> [more.html ...]

Looks for the marker line `/* @brand-fonts */` inside a <style> block and
replaces it with the base64 @font-face rules from brand-fonts.css. Running it
again is safe: an already-injected file is detected and re-injected cleanly,
so the marker is preserved and the file never doubles in size.
"""

import os
import re
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
MARKER = "/* @brand-fonts */"
START = "/* @brand-fonts:start */"
END = "/* @brand-fonts:end */"

fonts = open(os.path.join(TOOLS, "brand-fonts.css")).read().strip()
block = "%s\n%s\n%s\n%s" % (MARKER, START, fonts, END)

for path in sys.argv[1:]:
    html = open(path).read()
    # strip any previous injection back down to the bare marker
    html = re.sub(
        re.escape(MARKER) + r"\s*" + re.escape(START) + r".*?" + re.escape(END),
        MARKER,
        html,
        flags=re.S,
    )
    if MARKER not in html:
        print("skip %s (no %s marker)" % (path, MARKER))
        continue
    html = html.replace(MARKER, block, 1)
    open(path, "w").write(html)
    print("injected %s (%d KB)" % (path, os.path.getsize(path) // 1024))
