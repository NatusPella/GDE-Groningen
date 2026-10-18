// Samen spelen (#95): de kleine stukjes beeld rond een sessie. Een korte fade
// als de gast binnenkomt of vertrekt, en een partner-label met naam, status en
// een Ping-knop. Alleen DOM; wat het label toont komt uit partnerhud.js (getest).
// Niet in beeld bekeken. Markeringen op de kaart en de minimap zijn er nog niet
// (partnerhud.projectMarker is klaar voor gebruik).
import { sendPing } from './coopnet.js';

let fadeEl = null, chip = null, last = '';

// richting: 'in' (zwart naar beeld) of 'uit'
export function fadeFlash(richting = 'in') {
  if (typeof document === 'undefined') return;
  if (!fadeEl) {
    fadeEl = document.createElement('div');
    fadeEl.style.cssText = 'position:fixed;inset:0;z-index:8000;background:#000;opacity:0;pointer-events:none;transition:opacity 0.35s;';
    document.body.appendChild(fadeEl);
  }
  fadeEl.style.opacity = '1';
  setTimeout(() => { if (fadeEl) fadeEl.style.opacity = '0'; }, richting === 'in' ? 450 : 350);
}

// Elke frame vanuit main.js, alleen als er een sessie is. Het label verandert alleen als de tekst verandert.
export function updatePartnerChip(world) {
  if (typeof document === 'undefined') return;
  const p = world.coopPartner;
  if (!p) { if (chip) { chip.remove(); chip = null; last = ''; } return; }
  if (!chip) {
    chip = document.createElement('div');
    chip.className = 'coop-chip';
    chip.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:700;display:flex;gap:10px;align-items:center;padding:6px 10px;background:rgba(15,40,26,0.85);color:#f0ede4;border-radius:6px;font:14px "Arial Narrow",Arial,sans-serif;';
    chip.addEventListener('click', (e) => {
      if (e.target.closest('[data-ping]') && world.player) sendPing(world, world.player.x, world.player.y, 'hier');
    });
    document.body.appendChild(chip);
  }
  const key = `${p.naam}|${p.tekst}|${p.kleur}`;
  if (key === last) return;
  last = key;
  const vorm = p.vorm === 'ruit' ? '◆' : '▲';
  chip.innerHTML = `<span style="color:${p.kleur}" aria-hidden="true">${vorm}</span><span><b>${p.naam}</b> · ${p.tekst}</span><button type="button" data-ping style="background:#3fc97a;color:#0c140e;border:0;border-radius:4px;padding:2px 8px;cursor:pointer">Ping</button>`;
}
