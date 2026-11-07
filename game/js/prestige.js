// #675: het laatste bord na het verhaal: "Grunn is van jou". Eén bord dat de grote verzamelingen
// samenbrengt — alle missies goud, alle buurten, alle vissen en alle eierballen — zodat de endgame een
// climax heeft naast Veroverd. Puur: de stand wordt van buiten aangeleverd (achievements, visboek,
// buurten), zodat dit bestand niet van de wereld of de opslag afhangt.
export const PRESTIGE = {
  naam: 'Grunn is van jou',
  uitleg: 'Alles wat Grunn te bieden heeft, in één bord: de missies, de buurten, de vissen en de eierballen.',
  eisen: ['missies', 'buurten', 'vissen', 'eierballen'],
};
// Aantallen die niet bekend zijn (0) maken een eis nog niet klaar; de regel zegt dan wat er nog telt.
export function prestigeStand({
  missiesGoud = 0, missiesTotaal = 0,
  buurten = 0, buurtenTotaal = 0,
  vissen = 0, vissenTotaal = 0,
  eierballen = 0, eierballenTotaal = 0,
} = {}) {
  const rij = (id, naam, klaar, tekst) => ({ id, naam, klaar: !!klaar, tekst });
  const rijen = [
    rij('missies', 'Alle missies goud', missiesTotaal > 0 && missiesGoud >= missiesTotaal, `${missiesGoud} van ${missiesTotaal} missies goud`),
    rij('buurten', 'Alle buurten gezien', buurtenTotaal > 0 && buurten >= buurtenTotaal, buurtenTotaal > 0 ? `${buurten} van ${buurtenTotaal} buurten` : 'de buurten tellen mee zodra je de kaart opent'),
    rij('vissen', 'Alle vissen in je visboek', vissenTotaal > 0 && vissen >= vissenTotaal, `${vissen} van ${vissenTotaal} soorten`),
    rij('eierballen', 'Alle eierballen', eierballenTotaal > 0 && eierballen >= eierballenTotaal, `${eierballen} van ${eierballenTotaal} eierballen`),
  ];
  return { naam: PRESTIGE.naam, uitleg: PRESTIGE.uitleg, klaar: rijen.every((r) => r.klaar), rijen, gedaan: rijen.filter((r) => r.klaar).length, totaal: rijen.length };
}
// De regel onder het bord ("3 van 4 · nog dit ontbreekt").
export function prestigeTekst(stand) {
  if (!stand) return '';
  if (stand.klaar) return 'Grunn is van jou: alles is gedaan.';
  const open = stand.rijen.filter((r) => !r.klaar).map((r) => r.naam);
  return `${stand.gedaan} van ${stand.totaal} · nog ${open.join(', ')}.`;
}
