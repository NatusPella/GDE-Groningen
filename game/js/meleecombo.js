// Leaf: de melee-reeks (#492). Losse slagen worden een reeks: de eerste ×1,00, de tweede ×1,15, de derde ×1,40 met extra
// knock, daarna begint de reeks opnieuw. Een misser of een venster zonder treffer zet hem terug op ×1,00.
// Puur: geen DOM, THREE, klok, opslag of Math.random. De stand hoort bij één aanvaller; combat.js bewaart er een per
// plek (world.meleeCombos), zodat de host en elke gast hun eigen reeks hebben. Getest in scripts/meleecombo_test.mjs.
export const VENSTER = 0.8; // s: een volgende slag telt mee als hij binnen dit venster na een geraakte slag landt (precies 0,8 s telt nog mee)
export const FACTOREN = [1, 1.15, 1.4]; // de eerste, tweede en derde slag van de reeks
export const KNOCK_DERDE = 0.2; // extra knock bij de derde slag

export function nieuweCombo() { return { count: 0, laatste: -Infinity }; }

// Hoeveelste slag van de reeks dit is (1 tot 3) en wat hij waard is; de stand verandert niet.
export function comboSlag(staat, nu) {
  const n = volgende(staat, nu);
  return { factor: FACTOREN[n - 1], knockExtra: n === FACTOREN.length ? KNOCK_DERDE : 0, count: n };
}

// De stand na deze slag: een treffer telt door (count is de slag die landde, laatste het moment), een misser wist de reeks.
// Een onbekende of NaN-tijd geeft veilig de lege stand (de volgende slag is dan weer de eerste).
export function comboUitslag(staat, nu, geraakt) {
  if (!geraakt || !Number.isFinite(nu)) return nieuweCombo();
  return { count: volgende(staat, nu), laatste: nu };
}

// De vorige slag in de reeks telt door binnen het venster en na een geraakte slag; anders begint de reeks bij 1.
function volgende(staat, nu) {
  if (!staat || !Number.isFinite(nu)) return 1;
  const vorige = staat.count | 0;
  if (vorige < 1 || vorige > FACTOREN.length) return 1; // leeg of een onbekende stand: gewoon de eerste slag
  const laatste = staat.laatste;
  if (!Number.isFinite(laatste) || nu < laatste || nu - laatste > VENSTER) return 1; // te laat, of een klok die terugloopt
  return (vorige % FACTOREN.length) + 1;
}
