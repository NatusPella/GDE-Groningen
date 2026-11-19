// QoL (#985): één plek voor bedragen in tekst, zodat "€25.000" overal met duizendscheiding staat (nl-NL).
// Pure functies zonder imports; de HUD gebruikt zijn eigen "€ 12.500" in hudmoney.js.
export const euro = (n) => '€' + Math.round(Number(n) || 0).toLocaleString('nl-NL');
