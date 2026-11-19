// De bon van de winkel (designsysteem v2, #980): wat een keuze kost vóór je kiest. Pure regels, zonder DOM:
// shopui.js tekent ze als papieren bon en probleem-callout. Alle bedragen komen uit hetzelfde saldo als de
// knop (world.money), dus de bon liegt nooit over wat er na het kopen overblijft.
import { itemStatus, needsConfirm, shortfall, brokeMessage } from './shoplist.js';

const heel = (n) => Math.max(0, Math.floor(Number(n) || 0));

// De regels van de bon: kopen (prijs, saldo, saldo erna, wat er mist), verkopen (opbrengst, saldo erna) of
// niets (kiezen, gratis, een rit zonder prijs). `mist` > 0 betekent dat het saldo niet toereikt.
export function bonRegels(it, money = 0) {
  if (!it || it.plain) return null;
  const saldo = heel(money);
  if (it.income > 0) return { soort: 'verkoop', bedrag: heel(it.income), saldo, na: saldo + heel(it.income), mist: 0 };
  if (it.price > 0) {
    const prijs = heel(it.price);
    return { soort: 'koop', bedrag: prijs, saldo, na: Math.max(0, saldo - prijs), mist: Math.max(0, prijs - saldo) };
  }
  return null;
}

// De beste uitweg als iets niet kan: het duurste dat je nu wel kunt kopen (dicht bij wat je wilde), anders het
// eerste dat kan. Geeft het item terug of null; kiezen en verkopen tellen mee als "kan nu".
export function alternatief(items, huidig, money = 0) {
  const kan = (items || []).filter((x) => x && x.id !== (huidig && huidig.id) && !x.plain && itemStatus(x, money).buyable && !(x.income > 0));
  if (!kan.length) return null;
  const betaalbaar = kan.filter((x) => x.price > 0 && x.price <= money).sort((a, b) => b.price - a.price);
  return betaalbaar[0] || kan[0];
}

// Het probleem bij een item dat niet kan: een kop, één zin, het ontbrekende bedrag en de oplossing (een ander
// item om naar te kijken). null als er niets mis is (ook "heb ik al": dat is geen probleem maar een stand).
export function probleemVan(it, items, money = 0) {
  if (!it) return null;
  const st = itemStatus(it, money);
  if (st.buyable || st.id === 'heb') return null;
  const alt = alternatief(items, it, money);
  const oplossing = alt ? { id: alt.id, label: alt.price > 0 ? `Toon ${alt.label} voor ${'€' + heel(alt.price).toLocaleString('nl-NL')}` : `Toon ${alt.label}` } : null;
  if (st.id === 'duur') {
    const mist = shortfall(it, money) || (it.price > 0 ? 0 : 1);
    return { id: 'duur', kop: 'Te weinig geld', tekst: brokeMessage(it, money), mist, oplossing };
  }
  if (st.id === 'slot') return { id: 'slot', kop: 'Op slot', tekst: it.disabled || 'Dit kan nog niet.', mist: 0, oplossing };
  return { id: 'nu', kop: 'Kan nu niet', tekst: it.disabled || 'Dit kan nu niet.', mist: 0, oplossing };
}

// De risicovolle keuze: een duur item of een item met eigen waarschuwing vraagt om een tweede druk. De zin staat
// onder de omlijnde knop; zonder tweede druk is er geen risico om te tonen.
export function risicoVan(it, money = 0) {
  if (!it || it.disabled || !needsConfirm(it, money)) return null;
  if (it.confirmText) return { tekst: it.confirmText };
  return { tekst: it.income > 0 ? 'Dit verkoop je niet zomaar terug. Je bevestigt het nog een keer.' : 'Dit is een grote uitgave. Je bevestigt het nog een keer.' };
}
