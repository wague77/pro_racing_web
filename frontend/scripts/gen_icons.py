"""Génère les icônes de marque TURF PRO WAGUE (fer à cheval)."""
import math
from PIL import Image, ImageDraw, ImageFont

OUT = "assets/images"
GREEN = (12, 138, 74)
GREEN_DARK = (5, 77, 41)
GOLD = (222, 184, 70)
WHITE = (255, 255, 255)


def load_font(size):
    for p in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def vgradient(size, top, bottom):
    img = Image.new("RGB", (size, size), top)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / size
        d.line(
            [(0, y), (size, y)],
            fill=(
                int(top[0] + (bottom[0] - top[0]) * t),
                int(top[1] + (bottom[1] - top[1]) * t),
                int(top[2] + (bottom[2] - top[2]) * t),
            ),
        )
    return img


def draw_horseshoe(draw, cx, cy, radius, thickness, color):
    # U "porte-bonheur" : ouverture en haut (gap centré à 270°/haut).
    box = [cx - radius, cy - radius, cx + radius, cy + radius]
    start, end = -55, 235  # ~290° d'arc, ouverture en haut
    draw.arc(box, start=start, end=end, fill=color, width=thickness)
    for ang in (start, end):
        a = math.radians(ang)
        ex, ey = cx + radius * math.cos(a), cy + radius * math.sin(a)
        rr = thickness / 2
        draw.ellipse([ex - rr, ey - rr, ex + rr, ey + rr], fill=color)
    # Trous de clous dorés
    n = 7
    for i in range(n):
        ang = start + 18 + i * ((end - start - 36) / (n - 1))
        a = math.radians(ang)
        hx, hy = cx + radius * math.cos(a), cy + radius * math.sin(a)
        r2 = max(4, thickness * 0.14)
        draw.ellipse([hx - r2, hy - r2, hx + r2, hy + r2], fill=GOLD)


def emblem(size, with_bg=True, show_name=False):
    S = size
    base = (vgradient(S, GREEN, GREEN_DARK).convert("RGBA") if with_bg
            else Image.new("RGBA", (S, S), (0, 0, 0, 0)))
    d = ImageDraw.Draw(base)
    cx = S / 2
    cy = S * (0.46 if show_name else 0.50)
    radius = S * 0.30
    thickness = int(S * 0.115)
    draw_horseshoe(d, cx, cy, radius, thickness, WHITE)
    if show_name:
        f = load_font(int(S * 0.082))
        name = "TURF PRO WAGUE"
        bb = d.textbbox((0, 0), name, font=f)
        tw = bb[2] - bb[0]
        d.text((cx - tw / 2 - bb[0], S * 0.80), name, font=f, fill=WHITE)
    return base


# icon.png (1024) — plein cadre, emblème seul (les stores masquent)
emblem(1024, with_bg=True, show_name=False).convert("RGB").save(f"{OUT}/icon.png")

# adaptive-icon.png (1024) — emblème centré dans la zone de sécurité, fond transparent
adaptive = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
emb = emblem(int(1024 * 0.64), with_bg=False)
o = (1024 - emb.size[0]) // 2
adaptive.paste(emb, (o, o), emb)
adaptive.save(f"{OUT}/adaptive-icon.png")

# splash-image.png — emblème + nom (fond via app.json)
splash = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
semb = emblem(int(1024 * 0.78), with_bg=False, show_name=True)
so = (1024 - semb.size[0]) // 2
splash.paste(semb, (so, so), semb)
splash.save(f"{OUT}/splash-image.png")

# favicon.png (196)
emblem(196, with_bg=True).convert("RGB").save(f"{OUT}/favicon.png")

print("OK")


################################################################################
