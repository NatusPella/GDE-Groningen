// De keuring van de testbankstap 'bezit' (suite 'alles'; epic Bezit, #1104 en #1102): wat elk venster zag, als lijst fouten. Puur: geen Electron, geen netwerk.
// De stap zelf (bezitAlles in scripts/coop/coop.page.js) laat de host een snackwagen kopen en op 'park' zetten, de gast 'dorp' kopen, en gast2 meewerken in de wagen van de host.
// Verwacht per venster (data = het 'alles-bezit'-logbericht van die instantie, null = niets gelogd):
//   host:  eigen = [park], anderen noemen dorp van de gast; na het werk van gast2: werkDag gezet en de omzetbonus (mod) aanwezig;
//   gast:  eigen = [dorp], anderen noemen park van de host;
//   gast2: eigen leeg, anderen noemen park en dorp; het meewerken lukte en het loon is nieuw geld (minstens 80).
export const BEZIT_STAP = { host: { spot: 'park' }, gast: { spot: 'dorp' }, werker: 'gast2', doel: 'park' };

const noemt = (lijst, spot) => Array.isArray(lijst) && lijst.some((x) => String(x).startsWith(spot + ':'));
const heeft = (lijst, spot) => Array.isArray(lijst) && lijst.includes(spot);

// E: { host, gast, gast2 } -> [fout]. Een stap die zich overslaat (skip) of een fout meldt telt hier niet mee; dat doet de aanroeper.
export function keurBezitStap(E) {
  const f = [];
  const h = E.host, g = E.gast, w = E[BEZIT_STAP.werker];
  if (h && !h.skip && !h.fout) {
    if (!heeft(h.claims && h.claims.eigen, 'park')) f.push('bezit: de host heeft zijn eigen plek park niet in zijn claims');
    if (!noemt(h.claims && h.claims.anderen, 'dorp')) f.push('bezit: de host ziet de plek dorp van de gast niet');
    if (!(h.bonus && h.bonus.werkDag >= 0 && h.bonus.mod)) f.push('bezit: de eigenaar (host) kreeg geen verkoopbonus van het meewerken van gast2 (' + JSON.stringify(h.bonus || null) + ')');
  }
  if (g && !g.skip && !g.fout) {
    if (!heeft(g.claims && g.claims.eigen, 'dorp')) f.push('bezit: de gast heeft zijn eigen plek dorp niet in zijn claims');
    if (!noemt(g.claims && g.claims.anderen, 'park')) f.push('bezit: de gast ziet de plek park van de host niet');
  }
  if (w && !w.skip && !w.fout) {
    if (w.claims && w.claims.eigen && w.claims.eigen.length) f.push('bezit: gast2 kocht niets maar heeft eigen claims');
    if (!noemt(w.claims && w.claims.anderen, 'park') || !noemt(w.claims && w.claims.anderen, 'dorp')) f.push('bezit: gast2 ziet niet beide plekken van de anderen');
    if (!(w.werk && w.werk.ok)) f.push('bezit: gast2 kon niet meewerken (' + JSON.stringify(w.werk || null) + ')');
    if (!(w.loon >= 80)) f.push('bezit: gast2 kreeg geen uurloon (' + w.loon + ')');
  }
  return f;
}
