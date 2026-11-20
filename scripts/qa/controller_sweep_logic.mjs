// Pure kant van scripts/qa/controller_sweep.mjs (geen Electron, node-safe): wat telt als bevinding in het resultaat van een scherm? (#985)
export function bevindingen(r) {
  const b = [];
  if (!r || typeof r !== 'object') return b;
  if (r.opm && [].concat(r.opm).some((o) => /geen focus/.test(o))) b.push('geen focus te krijgen met de D-pad');
  if (r.onbereikbaar && r.onbereikbaar.length) b.push(`${r.onbereikbaar.length} klikdoel(en) onbereikbaar met de D-pad`);
  if (r.focusVal) b.push('focus valt op de pagina (body) tijdens het lopen');
  if (r.dubbeleRing) b.push(`${r.dubbeleRing} extra focusring(en)`);
  if (typeof r.aKlik === 'string' && /^GEEN/.test(r.aKlik)) b.push('A klikt de gefocuste knop niet');
  if (r.bTerug === 'GEEN REACTIE') b.push('B doet niets');
  if (r.scroll && !r.scroll.bewogen) b.push('rechterstick scrolt de lijst niet');
  if (r.kbHint && r.kbHint.length) b.push(`${r.kbHint.length} toetsenbordhint(s) blijven staan bij een controller`);
  if (r.woordHint && r.woordHint.length) b.push(`${r.woordHint.length} tekst(en) noemen een toets of muisklik`);
  return b;
}

