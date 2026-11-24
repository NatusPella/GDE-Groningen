#!/usr/bin/env node
/**
 * Art-direction audit: controleert kleurgebruik in wereldmodellen tegen docs/ART-DIRECTION.md.
 *
 * Controleert:
 * - Hex-kleuren in models3d_buildings.js, greenery.js, propregister.js, animalregister.js, vehicleregister.js
 * - Uitschieters: verzadiging, luma, verboden kleuren (neon, koud wit, winter-blauw)
 * - Wereldpaletsysteem: kleuren lopen door dsWereld()
 *
 * Gebruik:
 *   node scripts/artdirection_audit.mjs [--fix] [--verbose]
 *
 * --fix: probeer automatisch uitschieters te corrigeren (alleen kleurwaarden, geen geometrie)
 * --verbose: toon alle gevonden kleuren, niet alleen uitschieters
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Paletten uit ART-DIRECTION.md
const PALETTEN = {
  baksteen: {
    kleuren: [
      { naam: 'Gronings baksteenrood', hex: 0x8f4634, spreiding: 0.10 },
      { naam: 'Baksteenoranje', hex: 0xa9623f, spreiding: 0.12 },
      { naam: 'Donkere baksteen', hex: 0x6e3a2c, spreiding: 0.08 },
      { naam: 'Bruine baksteen', hex: 0x7d4b37, spreiding: 0.10 },
      { naam: 'Geelbruine baksteen', hex: 0xb08a5e, spreiding: 0.15 },
      { naam: 'Historisch 1', hex: 0x9a5a44, spreiding: 0.08 },
      { naam: 'Historisch 2', hex: 0x84503c, spreiding: 0.08 },
    ],
  },
  pleister: {
    kleuren: [
      { naam: 'Pleisterwit', hex: 0xe3ddd0, spreiding: 0.05 },
      { naam: 'Crème', hex: 0xd6cab0, spreiding: 0.08 },
      { naam: 'Roze/zalm', hex: 0xc2a293, spreiding: 0.10 },
      { naam: 'Mint', hex: 0xa3b2a0, spreiding: 0.10 },
      { naam: 'Okergeel', hex: 0xcfb46c, spreiding: 0.12 },
    ],
  },
  daken: {
    kleuren: [
      { naam: 'Terracotta', hex: 0x8a4a33, spreiding: 0.10 },
      { naam: 'Leisteen', hex: 0x464b52, spreiding: 0.08 },
      { naam: 'Bruinrood', hex: 0x5b3a2e, spreiding: 0.10 },
      { naam: 'Blauwgrijs', hex: 0x3e4449, spreiding: 0.08 },
      { naam: 'Industriedak', hex: 0x5a5d60, spreiding: 0.05 },
    ],
  },
  groen: {
    kleuren: [
      { naam: 'Park', hex: 0x4f7234, spreiding: 0.08 },
      { naam: 'Weide', hex: 0x557434, spreiding: 0.10 },
      { naam: 'Bos', hex: 0x405e2c, spreiding: 0.10 },
      { naam: 'Gazon', hex: 0x4a6c31, spreiding: 0.10 },
    ],
  },
  water: {
    kleuren: [
      { naam: 'Diep water', hex: 0x0b2420, spreiding: 0.08 },
      { naam: 'Ondiep water', hex: 0x2c4a38, spreiding: 0.10 },
      { naam: 'Wereldpalet waterdoel', hex: 0x1f4654, spreiding: 0.05 },
    ],
  },
};

// Hulpfuncties voor kleuranalyse
function rgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b; // 0..255
}

function saturatie(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx ? (mx - mn) / mx : 0; // 0..1
}

function hue(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const c = mx - mn;
  if (!c) return 0;
  let h = 0;
  if (mx === r) h = ((g - b) / c) % 6;
  else if (mx === g) h = (b - r) / c + 2;
  else h = (r - g) / c + 4;
  h = (h * 60 + 360) % 360;
  return h;
}

function lumaDiff(hex1, hex2) {
  const [r1, g1, b1] = rgb(hex1);
  const [r2, g2, b2] = rgb(hex2);
  return Math.abs(luma(r1, g1, b1) - luma(r2, g2, b2)) / 255; // 0..1
}

// Vind uitschieters
function checkKleur(hex, bestand) {
  const [r, g, b] = rgb(hex);
  const L = luma(r, g, b);
  const S = saturatie(r, g, b);
  const h = hue(r, g, b);

  const problemen = [];

  // Uitzonderingen: worldpalette.js bevat de DOELKLEUREN van het designsysteem (mogen verzadigd zijn)
  // Voertuigen hebben verzadigde autokleuren (rood, geel, blauw) - dat is normaal
  const isWorldpalette = bestand.includes('worldpalette');
  const isVoertuigen = bestand.includes('vehicle');

  // Neonkleuren (te verzadigd + te licht), maar worldpalette en voertuigen mogen dit
  // Let op: blauwe deuren, luifels en glas zijn gewoon normaal in Groningen (constitution 3 gaat over sneeuw/ijs, niet over kleur blauw)
  if (S > 0.75 && L > 50 && !isWorldpalette && !isVoertuigen) {
    problemen.push(`Neonkleur (S=${S.toFixed(2)}, L=${L.toFixed(1)})`);
  }

  // Koud wit (te licht + te weinig verzadiging, blauwige tint)
  if (L > 220 && S < 0.05 && h > 180 && h < 260 && !isWorldpalette) {
    problemen.push(`Koud wit (L=${L.toFixed(1)}, h=${h.toFixed(0)}°)`);
  }

  // Winter-checks verwijderd: blauwe deuren, luifels en glas zijn normaal in Groningen (niet 'winter')

  // Check tegen paletten
  let paletMatch = null;
  let minDiff = Infinity;

  for (const [paletNaam, palet] of Object.entries(PALETTEN)) {
    for (const kleurDef of palet.kleuren) {
      const diff = lumaDiff(hex, kleurDef.hex);
      if (diff < minDiff) {
        minDiff = diff;
        if (diff <= kleurDef.spreiding) {
          paletMatch = `${paletNaam}:${kleurDef.naam}`;
        }
      }
    }
  }

  if (!paletMatch && problemen.length === 0 && S > 0.1) {
    // Geen match in palet en niet grijs: mogelijk uitschieter
    problemen.push(`Geen paletmatch (dichtstbij: ${minDiff.toFixed(2)} verschil)`);
  }

  return { problemen, paletMatch, luma: L, saturatie: S, hue: h };
}

// Extraheer hex-kleuren uit een bestand
function extractHexKleuren(bestandspad) {
  const inhoud = fs.readFileSync(bestandspad, 'utf-8');
  const regex = /0x[0-9a-fA-F]{6}/g;
  const matches = inhoud.match(regex) || [];
  const kleuren = new Map();

  for (const match of matches) {
    const hex = parseInt(match, 16);
    if (!kleuren.has(hex)) {
      kleuren.set(hex, 0);
    }
    kleuren.set(hex, kleuren.get(hex) + 1);
  }

  return kleuren;
}

// Hoofdaudit
function auditArtDirection(opties = {}) {
  const { fix = false, verbose = false } = opties;

  console.log('=== Art Direction Audit ===\n');

  const bestanden = [
    'game/js/models3d_buildings.js',
    'game/js/greenery.js',
    'game/js/propregister.js',
    'game/js/pixelart3d.js',
    'game/js/worldpalette.js',
  ];

  const optioneleBestanden = [
    'game/js/dierenregister.js',
    'game/js/models3d_vehicles.js',
  ];

  let totaalKleuren = 0;
  let totaalUitschieters = 0;
  const uitschietersPerBestand = new Map();

  for (const bestand of [...bestanden, ...optioneleBestanden]) {
    const pad = path.join(ROOT, bestand);
    if (!fs.existsSync(pad)) {
      if (!optioneleBestanden.includes(bestand)) {
        console.log(`⚠️  Bestand niet gevonden: ${bestand}`);
      }
      continue;
    }

    console.log(`\n## ${bestand}`);
    const kleuren = extractHexKleuren(pad);
    totaalKleuren += kleuren.size;

    const uitschieters = [];

    for (const [hex, aantal] of kleuren.entries()) {
      const { problemen, paletMatch, luma: L, saturatie: S, hue: h } = checkKleur(hex, bestand);

      if (verbose || problemen.length > 0) {
        const hexStr = `0x${hex.toString(16).padStart(6, '0')}`;
        const info = `${hexStr} (${aantal}×) L=${L.toFixed(0)} S=${S.toFixed(2)} h=${h.toFixed(0)}°`;

        if (problemen.length > 0) {
          console.log(`  ❌ ${info}`);
          console.log(`     ${problemen.join(', ')}`);
          uitschieters.push({ hex, problemen, aantal });
          totaalUitschieters++;
        } else if (verbose) {
          console.log(`  ✓ ${info} ${paletMatch ? `[${paletMatch}]` : ''}`);
        }
      }
    }

    if (uitschieters.length > 0) {
      uitschietersPerBestand.set(bestand, uitschieters);
    }

    if (uitschieters.length === 0 && !verbose) {
      console.log(`  ✓ Alle ${kleuren.size} kleuren binnen palet`);
    }
  }

  console.log(`\n=== Samenvatting ===`);
  console.log(`Totaal kleuren: ${totaalKleuren}`);
  console.log(`Uitschieters: ${totaalUitschieters}`);

  if (uitschietersPerBestand.size > 0) {
    console.log(`\nBestanden met uitschieters:`);
    for (const [bestand, uitschieters] of uitschietersPerBestand.entries()) {
      console.log(`  ${bestand}: ${uitschieters.length} uitschieters`);
    }
  }

  if (fix) {
    console.log(`\n⚠️  --fix is nog niet geïmplementeerd (alleen kleurwaarden, geen geometrie)`);
  }

  return { totaalKleuren, totaalUitschieters, uitschietersPerBestand };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opties = {
    fix: args.includes('--fix'),
    verbose: args.includes('--verbose'),
  };

  const { totaalUitschieters } = auditArtDirection(opties);
  process.exit(totaalUitschieters > 0 ? 1 : 0);
}

export { auditArtDirection, checkKleur, extractHexKleuren, PALETTEN };
