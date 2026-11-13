// #835: de Hogelandrit. Je start met een voertuig bij Warffum en rijdt via Usquert naar
// Uithuizen; de klok loopt en de volgende etappe staat als waypoint. Geen nieuw scherm:
// de bestaande HUD, waypoint en medaille-uitslag doen het werk.
import { hoofdspeler } from './players.js';
import { setUserWaypoint } from './routing.js';
import { recordChallengeResult } from './achievements.js';
import { STREEKUITDAGING, startBij, doelBij, checkpoints, medailleVoor } from './streekuitdaging.js';

let run = null;

export const streekuitdagingActief = () => !!run;
export const getStreekuitdagingSpotsForRender = () => [{ ...STREEKUITDAGING.start, kind: 'streekuitdaging', naam: STREEKUITDAGING.naam }];

export function tryStreekuitdaging(world) {
  if (!world || run || world.coopRole === 'client') return false;
  const inp = world.input;
  if (!inp || !inp.wasPressed || !inp.wasPressed('e')) return false;
  const p = hoofdspeler(world);
  if (!p || !p.inVehicle || !startBij(p.x, p.y)) return false;
  run = { t: 0, index: 0 };
  inp.consume?.('e');
  setUserWaypoint(checkpoints()[0].x, checkpoints()[0].y, checkpoints()[0].naam);
  world.addMessage(`Hogelandrit: via Usquert naar Uithuizen. De klok loopt!`, 3.2, { kind: 'tip' });
  return true;
}

export function updateStreekuitdaging(world, dt) {
  if (!run || !world) return;
  const p = hoofdspeler(world);
  if (!p || !p.inVehicle) { run = null; world.addMessage('Hogelandrit gestopt: je stapte uit.', 3); return; }
  run.t += dt;
  const c = checkpoints()[run.index];
  if (!doelBij(p.x, p.y, run.index)) return;
  run.index++;
  if (run.index >= checkpoints().length) {
    const medal = medailleVoor(run.t);
    recordChallengeResult(world, STREEKUITDAGING.id, { value: Math.round(run.t), medal, lower: true });
    world.money += STREEKUITDAGING.beloning;
    world.addMessage(`Hogelandrit klaar in ${Math.round(run.t)} s · ${medal ? ['', 'brons', 'zilver', 'goud'][medal] : 'geen medaille'} · +€${STREEKUITDAGING.beloning}`, 5, { kind: 'prestatie' });
    run = null;
    return;
  }
  setUserWaypoint(checkpoints()[run.index].x, checkpoints()[run.index].y, checkpoints()[run.index].naam);
  world.addMessage(`Volgende: ${checkpoints()[run.index].naam}`, 2.4);
}
