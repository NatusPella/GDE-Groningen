// #801: op een touchscreen geen toetsnamen in de UI. Eén plek voor de vraag,
// zodat pauzemenu, winkel, minigames en het verhaal dezelfde regel volgen.
export function isTouchUi(doc = typeof document !== 'undefined' ? document : null) {
  return !!doc && !!doc.documentElement && !!doc.documentElement.classList
    && typeof doc.documentElement.classList.contains === 'function'
    && doc.documentElement.classList.contains('touch-device');
}

// Kies de tekst die bij het apparaat past: toetsenbordtekst of tiktekst.
export function deviceText(mouseText, touchText, doc) {
  return isTouchUi(doc) ? touchText : mouseText;
}
