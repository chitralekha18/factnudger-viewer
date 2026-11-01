#!/usr/bin/env python3
"""Build GitHub Pages from an explicit allowlist. Never reads .env."""
from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'docs'
OUT.mkdir(exist_ok=True)
(OUT/'media').mkdir(exist_ok=True)
for name in ('app.js','style.css'):
    shutil.copyfile(ROOT/'static'/name,OUT/name)
html=(ROOT/'static/index.html').read_text()
html=html.replace('<head>','''<head><meta name="app-mode" content="public"><meta name="referrer" content="strict-origin-when-cross-origin"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://i.ytimg.com; media-src 'self'; connect-src https://www.googleapis.com; frame-src https://www.youtube.com https://www.tiktok.com https://drive.google.com; object-src 'none'; base-uri 'self'; form-action 'none'">''')
(OUT/'index.html').write_text(html)
(OUT/'.nojekyll').touch()
for n in (1,2):
    shutil.copyfile(ROOT/f'media/poster{n}.jpg',OUT/f'media/poster{n}.jpg')
    shutil.copyfile(ROOT/f'media/video{n}.mp4',OUT/f'media/video{n}.mp4')
print('Built docs/: public interface, thumbnails, and browser-compatible demo videos.')
