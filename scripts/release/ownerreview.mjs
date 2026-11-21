// Eigenaar-review: 20 screenshots (de laatste stap vóór desktop/release.sh, docs/RELEASEGATE.md).
// De coördinator maakt met één Electron-instantie 20 echte in-game screenshots van afgerond UI/UX-werk, de eigenaar geeft
// feedback en blokkerende feedback wordt eerst verwerkt. Daarna schrijft de coördinator het bewijsbestand
// release/owner-review.json: { "datum": "2026-11-21", "aantal": 20, "status": "akkoord" | "feedback verwerkt", "bestanden": [..] }.
// `release_gate.mjs --verify` keurt een release pas met dat bewijs. Nooduitgang: GDE_RELEASE_SKIP_OWNERREVIEW=1, alleen met akkoord van de eigenaar.
// Puur: geen bestandstoegang; de CLI geeft de ingelezen JSON door.
export const OWNER_REVIEW_FILE = 'release/owner-review.json';
export const MIN_SCREENSHOTS = 20;
export const OWNER_REVIEW_STATUS = ['akkoord', 'feedback verwerkt'];

// -> { ok, problemen, skipped, samenvatting }
export function checkOwnerReview(bewijs, { skip = false, vandaag = new Date().toISOString().slice(0, 10) } = {}) {
  if (skip) return { ok: true, skipped: true, problemen: [], samenvatting: 'owner_review: OVERGESLAGEN (GDE_RELEASE_SKIP_OWNERREVIEW=1, alleen met akkoord van de eigenaar)' };
  const problemen = [];
  if (!bewijs || typeof bewijs !== 'object') {
    return { ok: false, skipped: false, problemen: [`geen eigenaar-review: ${OWNER_REVIEW_FILE} ontbreekt of is onleesbaar (20 screenshots, feedback, daarna dit bewijs)`], samenvatting: 'owner_review: ontbreekt' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(bewijs.datum || ''))) problemen.push('owner-review.json: datum ontbreekt of is geen JJJJ-MM-DD');
  else if (bewijs.datum > vandaag) problemen.push('owner-review.json: datum ligt in de toekomst');
  if (!Number.isInteger(bewijs.aantal) || bewijs.aantal < MIN_SCREENSHOTS) problemen.push(`owner-review.json: aantal screenshots ${bewijs.aantal} is minder dan ${MIN_SCREENSHOTS}`);
  if (!OWNER_REVIEW_STATUS.includes(bewijs.status)) problemen.push(`owner-review.json: status "${bewijs.status}" moet ${OWNER_REVIEW_STATUS.map((s) => `"${s}"`).join(' of ')} zijn (openstaande blokkerende feedback is nog niet verwerkt)`);
  if (!Array.isArray(bewijs.bestanden) || !bewijs.bestanden.length) problemen.push('owner-review.json: de lijst met bestanden ontbreekt');
  else if (Number.isInteger(bewijs.aantal) && bewijs.bestanden.length < bewijs.aantal) problemen.push(`owner-review.json: ${bewijs.bestanden.length} bestanden genoemd voor ${bewijs.aantal} screenshots`);
  const ok = problemen.length === 0;
  return { ok, skipped: false, problemen, samenvatting: ok ? `owner_review: ${bewijs.status}, ${bewijs.aantal} screenshots, ${bewijs.datum}` : 'owner_review: niet groen' };
}
