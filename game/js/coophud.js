// Samen spelen (#95): de kleine stukjes beeld rond een sessie. Een korte fade
// als de gast binnenkomt of vertrekt, en een partner-label met naam, status en
// een Ping-knop. Alleen DOM; wat het label toont komt uit partnerhud.js (getest).
// Niet in beeld bekeken. Markeringen op de kaart en de minimap zijn er nog niet
// (partnerhud.projectMarker is klaar voor gebruik).
import { pingGebaar } from './coopnet.js';
import { PING_TOETSEN } from './coopping.js';

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

const SHAPE = { driehoek: '▲', ruit: '◆', vierkant: '■', cirkel: '●', vijfhoek: '⬟', ster: '★', plus: '✚', kruis: '✖', maan: '☾', hart: '♥', bliksem: 'ϟ', druppel: '◖', blok: '▮', golf: '≈', schild: '⬢', bloem: '✿' };

// Elke frame vanuit main.js, alleen als er een sessie is. Het label verandert alleen als de tekst verandert.
// Toont alle andere spelers: vorm en kleur, naam en status (kleur is nooit het enige signaal).
export function updatePartnerChip(world) {
  if (typeof document === 'undefined') return;
  const lijst = world.coopPartners && world.coopPartners.length ? world.coopPartners : (world.coopPartner ? [world.coopPartner] : []);
  if (!lijst.length) { if (chip) { chip.remove(); chip = null; last = ''; } return; }
  if (!chip) {
    chip = document.createElement('div');
    chip.className = 'coop-chip';
    chip.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:700;display:flex;flex-direction:column;gap:4px;padding:6px 10px;background:rgba(15,40,26,0.85);color:#f0ede4;border-radius:6px;font:14px "Arial Narrow",Arial,sans-serif;';
    chip.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ping]');
      if (b && world.player) pingGebaar(world, b.getAttribute('data-ping'));
    });
    document.body.appendChild(chip);
  }
  // het label staat boven de minimap, niet erover (#374): de minimap zit linksonder en is ruim 250 px hoog
  const mm = document.querySelector('.hud-minimap-wrap');
  const r = mm && !document.body.classList.contains('hide-minimap') ? mm.getBoundingClientRect() : null;
  const onder = r && r.height > 0 && r.top < window.innerHeight ? Math.round(window.innerHeight - r.top + 8) : 16;
  if (chip.dataset.onder !== String(onder)) { chip.dataset.onder = String(onder); chip.style.bottom = onder + 'px'; }
  const menu = document.getElementById('pause-menu'); // het label hoort niet over de items van het pauzemenu te staan
  const film = document.body.classList.contains('cine-hide-hud'); // een filmpje verbergt de HUD, dus ook dit label
  chip.style.visibility = (menu && menu.classList.contains('visible')) || film ? 'hidden' : '';
  // afstand tot elke medespeler, afgerond zodat het label niet elke stap verspringt (#372)
  const pl = world.player;
  const afstand = (p) => { if (!pl || !p.zichtbaar || !Number.isFinite(p.x)) return ''; const d = Math.hypot(p.x - pl.x, p.y - pl.y); return d < 15 ? 'bij je' : d >= 1000 ? `${(d / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(d / 10) * 10} m`; };
  const key = lijst.map((p) => `${p.slot}|${p.naam}|${p.tekst}|${p.kleur}|${afstand(p)}`).join(';');
  if (key === last) return;
  last = key;
  chip.innerHTML = lijst.map((p) => `<div style="display:flex;gap:8px;align-items:center"><span style="color:${p.kleur}" aria-hidden="true">${SHAPE[p.vorm] || '●'}</span><span><b>${p.naam}</b> · ${p.tekst}${afstand(p) ? ' · ' + afstand(p) : ''}</span></div>`).join('') +
    '<div style="display:flex;gap:4px;flex-wrap:wrap">' + PING_TOETSEN.map((k) => `<button type="button" data-ping="${k.soort}" title="Toets ${k.toets.toUpperCase()}" style="background:#3fc97a;color:#0c140e;border:0;border-radius:4px;padding:2px 8px;cursor:pointer">${k.tekst} <small>${k.toets.toUpperCase()}</small></button>`).join('') + '</div>';
}
