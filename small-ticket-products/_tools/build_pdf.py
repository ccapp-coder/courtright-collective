#!/usr/bin/env python3
"""
Courtright Collective - branded Markdown to PDF builder.

Usage:
    python3 build_pdf.py <input.md> <output.pdf> [--brand courtright|tinkertaps|trivd]
                          [--title "..."] [--subtitle "..."] [--kicker "..."]

Reads a Markdown file, renders it into a branded HTML document (cover page +
styled body), then prints it to PDF with headless Chromium.

Cover metadata can also be supplied via an HTML comment block at the very top
of the Markdown file:

    <!--pdf
    title: Founder's Copy Bank
    subtitle: 120 lines of marketing copy you can steal today
    kicker: Courtright Collective
    brand: courtright
    -->
"""

import base64
import os
import re
import subprocess
import sys
import tempfile

import markdown

TOOLS = os.path.dirname(os.path.abspath(__file__))
CHROME_CANDIDATES = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/opt/pw-browsers/chromium/chrome-linux/chrome",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
]

THEMES = {
    "courtright": {
        "ink": "#0E1520",
        "ash": "#1A2030",
        "accent": "#C45C28",
        "accent_lt": "#D97040",
        "gold": "#D9A030",
        "gold_lt": "#F0B840",
        "smoke": "#7A7268",
        "parchment": "#F4EBD9",
        "cream": "#FAF6EF",
        "wordmark": "Courtright<span>Collective</span>",
        "site": "courtrightco.com",
    },
    "tinkertaps": {
        "ink": "#1F1405",
        "ash": "#33230C",
        "accent": "#F0B800",
        "accent_lt": "#FFD24D",
        "gold": "#E86A33",
        "gold_lt": "#FF8A4C",
        "smoke": "#7A6A50",
        "parchment": "#FFF3D6",
        "cream": "#FFFBF2",
        "wordmark": "Tinker<span>Taps</span>",
        "site": "tinkertaps.courtrightco.com",
    },
    "trivd": {
        "ink": "#150A18",
        "ash": "#2A1030",
        "accent": "#FF2D92",
        "accent_lt": "#FF6BB0",
        "gold": "#7B5BFF",
        "gold_lt": "#9E86FF",
        "smoke": "#7A6A80",
        "parchment": "#FFE7F3",
        "cream": "#FFF7FB",
        "wordmark": "Triv<span>d</span>",
        "site": "trivd.courtrightco.com",
    },
}

FONT_CSS = open(os.path.join(TOOLS, "brand-fonts.css")).read()

CSS_TEMPLATE = """
%(fonts)s
:root{
  --ink:%(ink)s; --ash:%(ash)s; --accent:%(accent)s; --accent-lt:%(accent_lt)s;
  --gold:%(gold)s; --gold-lt:%(gold_lt)s; --smoke:%(smoke)s;
  --parchment:%(parchment)s; --cream:%(cream)s;
  --display:'Cormorant Garamond',Georgia,serif;
  --body:'Outfit',-apple-system,Segoe UI,sans-serif;
}
@page{ size:Letter; margin:0; }
*{ box-sizing:border-box; }
html,body{ margin:0; padding:0; }
body{
  font-family:var(--body); color:var(--ink); background:#fff;
  font-size:10.6pt; line-height:1.62; -webkit-print-color-adjust:exact; print-color-adjust:exact;
}

/* ---------- COVER ---------- */
.cover{
  position:relative; height:11in; width:8.5in; overflow:hidden;
  background:
    radial-gradient(ellipse 70% 55% at 78% 22%, rgba(255,255,255,0.10) 0%, transparent 68%),
    radial-gradient(ellipse 90% 70% at 15% 88%, %(accent)s55 0%, transparent 62%),
    radial-gradient(ellipse 80% 60% at 88% 70%, %(gold)s3D 0%, transparent 64%),
    linear-gradient(155deg, %(ink)s 0%, %(ash)s 58%, %(ink)s 100%);
  color:var(--parchment); page-break-after:always;
  padding:1.05in 0.95in 0.9in;
  display:flex; flex-direction:column;
}
.cover::after{
  content:''; position:absolute; left:0; right:0; bottom:0; height:14px;
  background:linear-gradient(90deg,%(accent)s 0%,%(gold_lt)s 50%,%(accent_lt)s 100%);
}
.cover-mark{
  font-family:var(--display); font-weight:300; letter-spacing:.14em;
  font-size:15pt; color:var(--parchment); text-transform:none;
}
.cover-mark span{ color:%(accent_lt)s; font-weight:600; }
.cover-kicker{
  margin-top:auto; font-size:8pt; font-weight:700; letter-spacing:.30em;
  text-transform:uppercase; color:%(gold_lt)s;
}
.cover h1{
  font-family:var(--display); font-weight:600; font-size:52pt; line-height:1.03;
  margin:.16in 0 0; color:#fff; letter-spacing:-0.01em;
}
.cover h1 em{ font-style:italic; color:%(gold_lt)s; }
.cover .rule{
  width:2.1in; height:5px; margin:.28in 0 .24in; border-radius:99px;
  background:linear-gradient(90deg,%(accent)s,%(gold_lt)s);
}
.cover .sub{
  font-size:14.5pt; font-weight:300; line-height:1.45; color:%(parchment)s;
  max-width:5.6in; opacity:.94;
}
.cover-foot{
  margin-top:.55in; display:flex; justify-content:space-between; align-items:flex-end;
  font-size:8.5pt; letter-spacing:.12em; text-transform:uppercase; color:%(parchment)s; opacity:.7;
}
.cover-badges{ margin-top:.34in; display:flex; gap:.14in; flex-wrap:wrap; }
.cover-badges span{
  border:1px solid %(gold_lt)s66; color:%(gold_lt)s; border-radius:99px;
  padding:.06in .17in; font-size:8pt; letter-spacing:.14em; text-transform:uppercase; font-weight:600;
}

/* ---------- BODY PAGES ---------- */
.page{ padding:.72in .85in 1in; background:var(--cream); min-height:11in; }
.page h1{
  font-family:var(--display); font-size:30pt; font-weight:600; line-height:1.1;
  margin:.28in 0 .06in; color:var(--ink); page-break-before:always; page-break-after:avoid;
}
.page > h1:first-child{ page-break-before:auto; margin-top:0; }
.page h1::after{
  content:''; display:block; width:1.5in; height:4px; border-radius:99px; margin-top:.09in;
  background:linear-gradient(90deg,%(accent)s,%(gold_lt)s);
}
h2{
  font-family:var(--body); font-size:14pt; font-weight:700; letter-spacing:-.01em;
  color:%(accent)s; margin:.30in 0 .07in; page-break-after:avoid;
  border-left:5px solid %(gold)s; padding-left:.13in;
}
h3{
  font-size:11.4pt; font-weight:700; color:var(--ink); margin:.20in 0 .04in; page-break-after:avoid;
}
h3::before{ content:'\\25AA'; color:%(accent)s; margin-right:.07in; }
h4{ font-size:10.4pt; font-weight:700; color:%(smoke)s; text-transform:uppercase;
  letter-spacing:.1em; margin:.17in 0 .04in; page-break-after:avoid; }
p{ margin:.055in 0 .085in; }
ul,ol{ margin:.05in 0 .10in; padding-left:.24in; }
li{ margin:.028in 0; }
ul li::marker{ color:%(accent)s; }
ol li::marker{ color:%(accent)s; font-weight:700; }
strong{ color:var(--ink); font-weight:700; }
em{ color:%(smoke)s; }
a{ color:%(accent)s; text-decoration:none; font-weight:600; }
hr{
  border:0; height:3px; border-radius:99px; margin:.26in 0;
  background:linear-gradient(90deg,%(accent)s 0%,%(gold_lt)s 42%,transparent 100%);
}
blockquote{
  margin:.14in 0; padding:.14in .18in; border-radius:0 8px 8px 0;
  background:linear-gradient(90deg,%(gold_lt)s2E,%(gold_lt)s10);
  border-left:5px solid %(gold)s; page-break-inside:avoid;
}
blockquote p{ margin:.03in 0; }
blockquote strong{ color:%(accent)s; }
code{
  font-family:'DejaVu Sans Mono',Menlo,Consolas,monospace; font-size:9pt;
  background:%(accent)s18; color:%(accent)s; padding:.01in .05in; border-radius:4px;
}
pre{
  background:var(--ink); color:var(--parchment); padding:.16in .18in; border-radius:9px;
  overflow-x:auto; page-break-inside:avoid; border-left:5px solid %(accent)s; font-size:8.6pt;
  line-height:1.5;
}
pre code{ background:none; color:var(--parchment); padding:0; font-size:8.6pt; }
table{
  width:100%%; border-collapse:collapse; margin:.14in 0; font-size:9.2pt;
  page-break-inside:avoid; border-radius:8px; overflow:hidden;
}
th{
  background:var(--ink); color:var(--parchment); text-align:left; font-weight:600;
  padding:.075in .1in; font-size:8.6pt; letter-spacing:.06em; text-transform:uppercase;
}
td{ padding:.07in .1in; border-bottom:1px solid %(ink)s1A; vertical-align:top; }
tbody tr:nth-child(even) td{ background:%(gold_lt)s16; }
.page > p:first-of-type{ font-size:11.6pt; color:%(smoke)s; }
</style>
"""

HTML_TEMPLATE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>%(title)s</title>
<style>%(css)s
</head>
<body>
<section class="cover">
  <div class="cover-mark">%(wordmark)s</div>
  <div class="cover-kicker">%(kicker)s</div>
  <h1>%(title_html)s</h1>
  <div class="rule"></div>
  <div class="sub">%(subtitle)s</div>
  %(badges)s
  <div class="cover-foot"><span>%(site)s</span><span>Built in Nashville</span></div>
</section>
<main class="page">
%(body)s
</main>
</body></html>
"""


def parse_meta(text):
    meta = {}
    m = re.match(r"\s*<!--pdf\s*(.*?)-->\s*", text, re.S)
    if m:
        for line in m.group(1).strip().splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip().lower()] = v.strip()
        text = text[m.end():]
    return meta, text


def title_markup(title):
    """Italicise the final word of the title in the display accent color."""
    words = title.split()
    if len(words) < 2:
        return title
    return " ".join(words[:-1]) + " <em>" + words[-1] + "</em>"


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        return 1
    src, dst = args[0], args[1]
    opts = {}
    i = 2
    while i < len(args) - 1:
        if args[i].startswith("--"):
            opts[args[i][2:]] = args[i + 1]
            i += 2
        else:
            i += 1

    raw = open(src).read()
    meta, body_md = parse_meta(raw)
    meta.update(opts)

    theme = THEMES.get(meta.get("brand", "courtright"), THEMES["courtright"])
    title = meta.get("title") or "Courtright Collective"
    subtitle = meta.get("subtitle", "")
    kicker = meta.get("kicker", "Courtright Collective")
    badges = meta.get("badges", "")

    body_html = markdown.markdown(
        body_md, extensions=["tables", "fenced_code", "sane_lists", "attr_list"]
    )

    css_vars = dict(theme)
    css_vars["fonts"] = FONT_CSS
    css = CSS_TEMPLATE % css_vars

    badge_html = ""
    if badges:
        chips = "".join("<span>%s</span>" % b.strip() for b in badges.split("|"))
        badge_html = '<div class="cover-badges">%s</div>' % chips

    html = HTML_TEMPLATE % {
        "title": title,
        "title_html": title_markup(title),
        "subtitle": subtitle,
        "kicker": kicker,
        "badges": badge_html,
        "wordmark": theme["wordmark"],
        "site": theme["site"],
        "css": css,
        "body": body_html,
    }

    chrome = next((c for c in CHROME_CANDIDATES if os.path.exists(c)), None)
    if not chrome:
        raise SystemExit("No Chromium binary found")

    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as fh:
        fh.write(html)
        tmp = fh.name

    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    subprocess.run(
        [chrome, "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
         "--no-pdf-header-footer", "--print-to-pdf=" + os.path.abspath(dst),
         "--virtual-time-budget=4000", tmp],
        check=True, capture_output=True,
    )
    os.unlink(tmp)
    print("built %s (%d KB)" % (dst, os.path.getsize(dst) // 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
