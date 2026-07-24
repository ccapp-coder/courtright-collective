#!/usr/bin/env python3
"""Cutalog — full brand asset build. Philosophy: 'The Clean Cut'."""
import math, os
from PIL import Image, ImageDraw, ImageFont, ImageOps

FONTS = "/root/.claude/skills/canvas-design/canvas-fonts"
OUT = "/tmp/claude-0/-home-user-courtright-collective/af4674a7-c72c-52ef-ad40-23b9f645c67e/scratchpad/out"
os.makedirs(OUT, exist_ok=True)

INK = (26, 29, 34, 255)
PAPER = (247, 245, 240, 255)
EMBER = (240, 90, 50, 255)
MUTE = (140, 138, 132, 255)
SS = 4
TEXT = "cutalog"


def F(name, size):
    return ImageFont.truetype(f"{FONTS}/{name}", size)


# ---------------------------------------------------------------- wordmark
def make_wordmark(px, fill, ember=EMBER):
    f = F("Outfit-Bold.ttf", px)
    dummy = ImageDraw.Draw(Image.new("L", (4, 4)))
    track = -0.015 * px
    xs, x = [], px * 0.12
    for ch in TEXT:
        xs.append(x)
        x += dummy.textlength(ch, font=f) + track
    W, H = int(x + px * 0.12), int(px * 1.5)
    y_text = px * 0.12

    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    l_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd, ld = ImageDraw.Draw(base), ImageDraw.Draw(l_layer)
    for i, ch in enumerate(TEXT):
        (ld if i == 4 else bd).text((xs[i], y_text), ch, font=f, fill=fill)

    lx0, ly0, lx1, ly1 = l_layer.getbbox()
    b = math.radians(18)
    cy = ly0 + (ly1 - ly0) * 0.34
    cx = (lx0 + lx1) / 2
    span = W
    left_pt = (cx - span, cy + math.tan(b) * span)
    right_pt = (cx + span, cy - math.tan(b) * span)

    top_mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(top_mask).polygon(
        [left_pt, right_pt, (W, 0), (0, 0)], fill=255)
    bot_mask = ImageOps.invert(top_mask)

    l_top = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    l_top.paste(l_layer, (0, 0), top_mask)
    l_bot = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    l_bot.paste(l_layer, (0, 0), bot_mask)

    alpha = l_top.split()[3]
    l_top_e = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    l_top_e.paste(Image.new("RGBA", (W, H), ember), (0, 0), alpha)

    u = (math.cos(b), -math.sin(b))
    n = (-math.sin(b), -math.cos(b))
    slide, gap = px * 0.030, px * 0.030
    dx = u[0] * slide + n[0] * gap
    dy = u[1] * slide + n[1] * gap

    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(base, (0, 0))
    out.alpha_composite(l_bot, (0, 0))
    out.alpha_composite(l_top_e, (int(round(dx)), int(round(dy))))
    return out.crop(out.getbbox())


# ---------------------------------------------------------------- icon
def make_icon(size, bg=INK, bar=PAPER, radius_frac=0.225, transparent_bg=False):
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if not transparent_bg:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius_frac), fill=bg)

    bar_w, bar_h, gap_y = S * 0.52, S * 0.085, S * 0.085
    block_h = 3 * bar_h + 2 * gap_y
    x0, y0 = (S - bar_w) / 2, (S - block_h) / 2

    bars = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bars)
    for i in range(3):
        y = y0 + i * (bar_h + gap_y)
        bd.rounded_rectangle([x0, y, x0 + bar_w, y + bar_h],
                             radius=int(bar_h / 2), fill=bar)

    a = math.radians(16)
    x_abs = x0 + bar_w * 0.66
    h = S
    top = (x_abs + math.tan(a) * h / 2, 0)
    bot = (x_abs - math.tan(a) * h / 2, h)
    left_mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(left_mask).polygon([(0, 0), top, bot, (0, h)], fill=255)
    right_mask = ImageOps.invert(left_mask)
    left = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    left.paste(bars, (0, 0), left_mask)
    rp = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    rp.paste(bars, (0, 0), right_mask)
    alpha = rp.split()[3]
    right = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    right.paste(Image.new("RGBA", (S, S), EMBER), (0, 0), alpha)

    ux, uy = (bot[0] - top[0], bot[1] - top[1])
    L = math.hypot(ux, uy)
    ux, uy = ux / L, uy / L
    slide, gap = S * 0.030, S * 0.016
    sx, sy = ux * slide - uy * gap, uy * slide + ux * gap
    img.alpha_composite(left, (0, 0))
    img.alpha_composite(right, (int(round(sx)), int(round(sy))))
    return img.resize((size, size), Image.LANCZOS)


def rescale(img, f):
    return img.resize((img.width // f, img.height // f), Image.LANCZOS)


# ---------------------------------------------------------------- exports
wm_ink = rescale(make_wordmark(480 * SS, INK), SS)
wm_paper = rescale(make_wordmark(480 * SS, PAPER), SS)
wm_ink.save(f"{OUT}/cutalog-wordmark-ink.png")
wm_paper.save(f"{OUT}/cutalog-wordmark-paper.png")

icon = make_icon(1024)
icon.save(f"{OUT}/cutalog-icon-1024.png")
make_icon(1024, transparent_bg=True, bar=INK).save(f"{OUT}/cutalog-mark-transparent-ink.png")
make_icon(1024, transparent_bg=True, bar=PAPER).save(f"{OUT}/cutalog-mark-transparent-paper.png")


def lockup(wm, mark_bar, pad_frac=0.0):
    """Horizontal lockup: bare mark + wordmark, optically aligned."""
    h = wm.height
    mark = make_icon(int(h * 1.9), transparent_bg=True, bar=mark_bar)
    mark = mark.crop(mark.getbbox())
    mh = int(h * 0.92)
    mark = mark.resize((int(mark.width * mh / mark.height), mh), Image.LANCZOS)
    gap = int(h * 0.42)
    W = mark.width + gap + wm.width
    H = int(h * 1.12)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(mark, (0, (H - mark.height) // 2 + int(h * 0.03)))
    out.alpha_composite(wm, (mark.width + gap, (H - wm.height) // 2))
    return out.crop(out.getbbox())


lockup(wm_ink, INK).save(f"{OUT}/cutalog-lockup-ink.png")
lockup(wm_paper, PAPER).save(f"{OUT}/cutalog-lockup-paper.png")

# ---------------------------------------------------------------- brand sheet
W, H = 2200, 2800
M = 150  # margin
sheet = Image.new("RGBA", (W, H), PAPER)
d = ImageDraw.Draw(sheet)

mono_s = F("GeistMono-Regular.ttf", 30)
mono_xs = F("GeistMono-Regular.ttf", 26)
outfit_r = F("Outfit-Regular.ttf", 34)

# header annotations
d.text((M, M), "CUTALOG — BRAND MARK", font=mono_s, fill=INK)
w = d.textlength("FIG. 01 / THE CLEAN CUT", font=mono_s)
d.text((W - M - w, M), "FIG. 01 / THE CLEAN CUT", font=mono_s, fill=MUTE)
d.line([(M, M + 70), (W - M, M + 70)], fill=INK, width=3)

# primary wordmark, centered
wm_big = rescale(make_wordmark(340 * SS, INK), SS)
y_wm = 480
sheet.alpha_composite(wm_big, ((W - wm_big.width) // 2, y_wm))
cap = "cut · a · log — one blade, one ember"
w = d.textlength(cap, font=mono_xs)
d.text(((W - w) / 2, y_wm + wm_big.height + 60), cap, font=mono_xs, fill=MUTE)

# middle row: icon on paper + dark panel with paper lockup
y_mid = 1180
panel_h = 700
# icon left
ic = make_icon(panel_h - 120)
sheet.alpha_composite(ic, (M + 60, y_mid + 60))
# dark panel right
px0 = M + panel_h + 60
d.rounded_rectangle([px0, y_mid, W - M, y_mid + panel_h], radius=48, fill=INK)
wm_dark = rescale(make_wordmark(185 * SS, PAPER), SS)
sheet.alpha_composite(
    wm_dark, (px0 + (W - M - px0 - wm_dark.width) // 2,
              y_mid + (panel_h - wm_dark.height) // 2))
# labels under row
d.text((M + 60, y_mid + panel_h + 40), "APP MARK / 1024", font=mono_xs, fill=MUTE)
w = d.textlength("REVERSED / INK FIELD", font=mono_xs)
d.text((W - M - w, y_mid + panel_h + 40), "REVERSED / INK FIELD", font=mono_xs, fill=MUTE)

# palette chips
y_pal = 2120
chip_w, chip_h, chip_gap = 560, 300, 60
chips = [("INK", INK, "#1A1D22"), ("PAPER", PAPER, "#F7F5F0"), ("EMBER", EMBER, "#F05A32")]
x = (W - (3 * chip_w + 2 * chip_gap)) // 2
for name, col, hexc in chips:
    d.rounded_rectangle([x, y_pal, x + chip_w, y_pal + chip_h], radius=36,
                        fill=col, outline=(210, 207, 200, 255) if name == "PAPER" else None,
                        width=3)
    lab = INK if name == "PAPER" else PAPER
    d.text((x + 36, y_pal + chip_h - 84), name, font=mono_s, fill=lab)
    w = d.textlength(hexc, font=mono_xs)
    d.text((x + chip_w - 36 - w, y_pal + chip_h - 80), hexc, font=mono_xs, fill=lab)
    x += chip_w + chip_gap

# footer
d.line([(M, H - M - 60), (W - M, H - M - 60)], fill=INK, width=3)
d.text((M, H - M - 10), "COURTRIGHT COLLECTIVE", font=mono_xs, fill=MUTE)
w = d.textlength("OUTFIT BOLD / BLADE 18°", font=mono_xs)
d.text((W - M - w, H - M - 10), "OUTFIT BOLD / BLADE 18°", font=mono_xs, fill=MUTE)

sheet.convert("RGB").save(f"{OUT}/cutalog-brand-sheet.png")
print("all saved")
