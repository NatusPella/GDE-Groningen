// Ankerpunten (#422): plaatsen waarvan de knoop uit de kaartgegevens niet in het winkelmidden ligt. Kaartlabel, bord en gebied
// (en dus "Reis erheen" bij het safehouse) wijzen dan naar het ankerpunt in plaats van naar de knoop. De tegels en de wereldbouw
// blijven zoals ze zijn. Alleen aangepast wat gemeten scheef staat (scripts/shopfront_audit.mjs): Delfzijl, waar de knoop 843 m
// ten westen van het winkelmidden ligt; Appingedam, Winschoten en Zoutkamp liggen binnen 150 m en houden hun knoop.
export const ANKERPUNTEN = { Delfzijl: [23852, -13004] };

// Het ankerpunt [x, y] van een plaats, of null.
export const ankerVan = (naam) => ANKERPUNTEN[naam] || null;
