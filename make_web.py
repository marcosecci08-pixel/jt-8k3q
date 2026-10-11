#!/usr/bin/env python3
"""Prépare docs/ (la web app) à partir de Data/trip.json et Assets/.

Usage : python3 make_web.py
 - copie trip.json
 - redimensionne les photos (≤ 1200 px) avec sips (macOS)
 - génère les icônes PNG, rappels.ics et la liste de précache du service worker
"""
import json, os, re, shutil, struct, subprocess, zlib, hashlib
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo  # Python 3.9+

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "docs")
os.makedirs(os.path.join(OUT, "img"), exist_ok=True)
os.makedirs(os.path.join(OUT, "icons"), exist_ok=True)

# 1. données
shutil.copyfile(os.path.join(ROOT, "Data", "trip.json"), os.path.join(OUT, "trip.json"))
trip = json.load(open(os.path.join(OUT, "trip.json"), encoding="utf-8"))

# 2. photos
src = os.path.join(ROOT, "Assets")
# Sans Assets/ ou sans sips (hors Mac), on garde les photos déjà présentes dans docs/img.
for f in (sorted(os.listdir(src)) if os.path.isdir(src) and shutil.which("sips") else []):
    if f.lower().endswith(".jpg"):
        dst = os.path.join(OUT, "img", f)
        subprocess.run(["sips", "-Z", "1200", "-s", "formatOptions", "70", os.path.join(src, f), "--out", dst],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# 3. icônes (fond vermillon + disque blanc, sans dépendance)
def png(size, path):
    cx = cy = size / 2
    r = size * 0.27
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            d = ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2) ** .5
            if d <= r - .7:
                px = (255, 255, 255)
            elif d <= r + .7:  # antialias
                t = (r + .7 - d) / 1.4
                px = tuple(int(c1 * t + c2 * (1 - t)) for c1, c2 in zip((255, 255, 255), (200, 16, 46)))
            else:
                px = (200, 16, 46)
            raw += bytes(px)
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    open(path, "wb").write(data)

for s in (180, 192, 512):
    png(s, os.path.join(OUT, "icons", f"icon-{s}.png"))

# 4. rappels.ics (alarme à l'heure exacte, fuseau de chaque entrée)
def esc(t):
    return t.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")

lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//JapanTrip//FR", "CALSCALE:GREGORIAN",
         "X-WR-CALNAME:Voyage au Japon – rappels"]
stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
for n in trip["notifications"]:
    start = datetime.strptime(f'{n["date"]} {n["time"]}', "%Y-%m-%d %H:%M").replace(tzinfo=ZoneInfo(n["tz"]))
    u = start.astimezone(ZoneInfo("UTC"))
    e = u + timedelta(minutes=15)
    lines += ["BEGIN:VEVENT", f'UID:{n["id"]}@japantrip', f"DTSTAMP:{stamp}",
              f'DTSTART:{u.strftime("%Y%m%dT%H%M%SZ")}', f'DTEND:{e.strftime("%Y%m%dT%H%M%SZ")}',
              f'SUMMARY:{esc(n["title"])}', f'DESCRIPTION:{esc(n["body"])}',
              "BEGIN:VALARM", "ACTION:DISPLAY", f'DESCRIPTION:{esc(n["title"])}', "TRIGGER:PT0S", "END:VALARM",
              "END:VEVENT"]
lines.append("END:VCALENDAR")
open(os.path.join(OUT, "rappels.ics"), "w", encoding="utf-8", newline="").write("\r\n".join(lines) + "\r\n")

# 5. liste de précache + version du service worker
files = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "trip.json", "rappels.ics"]
files += [f"icons/{f}" for f in sorted(os.listdir(os.path.join(OUT, "icons")))]
files += [f"img/{f}" for f in sorted(os.listdir(os.path.join(OUT, "img")))]
h = hashlib.sha1()
for f in files:
    p = os.path.join(OUT, f)
    if os.path.isfile(p):
        h.update(open(p, "rb").read())
sw = open(os.path.join(OUT, "sw.js"), encoding="utf-8").read()
sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{h.hexdigest()[:10]}';", sw)
sw = re.sub(r"const FILES = \[.*?\];", "const FILES = " + json.dumps(files) + ";", sw, flags=re.S)
open(os.path.join(OUT, "sw.js"), "w", encoding="utf-8").write(sw)
# version affichée dans l'app (Infos) : hash + date de build
from datetime import datetime as _dt
app = open(os.path.join(OUT, "app.js"), encoding="utf-8").read()
app = re.sub(r"const BUILD = '[^']*';", f"const BUILD = '{h.hexdigest()[:7]} · {_dt.now().strftime('%d/%m %H:%M')}';", app)
open(os.path.join(OUT, "app.js"), "w", encoding="utf-8").write(app)
print("OK :", len(files), "fichiers précachés")
