#!/usr/bin/env python3
"""Maakt de responsieve WebP-varianten voor de marketingpagina.

De varianten worden één keer gegenereerd en daarna gecommit; `website/build.mjs` kiest
ze via srcset. Nodig: Pillow (in de ontwikkelomgeving aanwezig).

Gebruik: python3 scripts/website_responsive.py
"""
import os
import re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA = os.path.join(ROOT, 'website', 'media')
BRONNEN = [
    MEDIA,
    os.path.join(ROOT, 'docs', 'screenshots'),
    os.path.join(ROOT, 'docs', 'steam', 'beelden', 'screenshots'),
]
SLIDESHOWS = os.path.join(ROOT, 'website', 'slideshows.mjs')
KWALITEIT = 78


def bron(bestand):
    naam = os.path.basename(bestand)
    for map_ in BRONNEN:
        pad = os.path.join(map_, naam)
        if os.path.exists(pad):
            return pad
    raise SystemExit(f'bron niet gevonden: {bestand}')


def varianten(pad, stem, breedtes):
    with Image.open(pad) as afbeelding:
        afbeelding = afbeelding.convert('RGB')
        for breedte in breedtes:
            if afbeelding.width <= breedte:
                continue
            uit = os.path.join(MEDIA, f'{stem}-{breedte}.webp')
            kopie = afbeelding.resize(
                (breedte, round(afbeelding.height * breedte / afbeelding.width)),
                Image.LANCZOS,
            )
            kopie.save(uit, 'WEBP', quality=KWALITEIT, method=6)
            print(f'  {os.path.relpath(uit, ROOT)} ({kopie.width}×{kopie.height})')


def main():
    with open(SLIDESHOWS, encoding='utf-8') as bestand:
        slides = sorted(set(re.findall(r"img:\s*'([^']+)'", bestand.read())))
    for img in slides:
        varianten(bron(img), os.path.splitext(os.path.basename(img))[0], (640, 1024))
    varianten(os.path.join(MEDIA, 'hero-groningen.webp'), 'hero-groningen', (640, 1280))
    varianten(
        os.path.join(ROOT, 'docs', 'youtube', 'beelden', 'thumbnail_gameplaytrailer.jpg'),
        'trailer',
        (640, 960),
    )
    varianten(os.path.join(ROOT, 'docs', 'screenshots', 'stad-nacht.webp'), 'stad-nacht', (640,))
    print(f'Klaar: varianten voor {len(slides)} slides + hero/trailer/uitsmijter.')


if __name__ == '__main__':
    main()
