// Een treindienst starten op een station (#985, eigenaarsfeedback 20-11): bij de kaartautomaat kiest de speler een
// dienst (verzonnen vervoerder Noorderspoor, een richting, de haltes op de kaart) en stapt in een trein die op het
// perron klaarstaat. Het is de bestaande machinistdienst (machinist.js, machinistrules.js, traindrive.js): dezelfde
// regels, hetzelfde loon, dezelfde medailles. De regels van wat er klaarstaat staan in ovmissie.js (puur, met test);
// dit bestand is de lijm. Meldt zich in main.js als kind (de regelkaart tikt per beeld).
//
// Samen spelen: de trein is een gewone trein van de wereld; wie hem start is de machinist en de host van de dienst.
// Een gast draait geen eigen spelstap en start dus geen dienst; hij rijdt mee als conducteur of
// passagier via treincoop.js zoals altijd (#492). De beloning volgt dienstBeloning (machinist.js).

import { parkTrain, placeTrain, clearTrackFor } from './railway.js';
import { board } from './traindrive.js';
import { startDienst } from './machinist.js';
import { zetDienstStarter } from './stationtravel.js';
import { startKaart, toonRegelkaart } from './regelkaart.js';
import { treinPlek, stationKaart } from './ovmissie.js';

let kaart = null;
const FREE_S = 300; // s: zo lang houdt de dienstregeling afstand van het stuk waar jij begint

// De trein van de lijn van deze dienst staat klaar op het perron en jij zit erin. False als dat niet kan.
export function startTreindienst(w, station, optie) {
  const t = optie && optie.trein;
  if (!t || w.trainDriving || t.state === 'player' || t.state === 'mission') {
    w.addMessage('De trein staat nu niet klaar. Probeer het over een minuut.', 3);
    return false;
  }
  const pl = treinPlek(optie);
  Object.assign(t, { c: pl.c, dir: pl.cab, target: optie.idx, v: 0, pv: 0 });
  parkTrain(t); // 'parked': een klaargezette trein, geen kaping en dus geen sterren
  placeTrain(t);
  clearTrackFor(t, optie.s - 200, optie.s + 200, w, FREE_S);
  board(w, { t, cab: pl.cab });
  if (startDienst(w, t, null) === false) return false; // de dienst startte niet: geen trein zonder dienst melden
  try { kaart = startKaart({ kaart: stationKaart(optie) }, 'trein:' + optie.key); } catch (e) { kaart = null; }
  return true;
}

zetDienstStarter(startTreindienst);

function tik(dt, w) {
  if (!kaart) return;
  if (!w.trainDriving) { kaart = null; return; }
  toonRegelkaart(w, kaart, dt);
}

export const treinDienstKind = { id: 'treindienststart', tickPhase: 'late', tick: tik };

