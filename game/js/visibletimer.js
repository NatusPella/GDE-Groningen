// Een interval dat niet tikt zolang het tabblad of venster verborgen is (#1074): de permanente pollers van de overlays en
// panelen doen dan niets, en de eerste tik na het zichtbaar worden volgt binnen één periode. Testsessies (?stil: geen pauze
// bij een verborgen tabblad) en omgevingen zonder document tikken gewoon door.
import { FLAGS } from './devflags.js';

export function setVisibleInterval(fn, ms, doc = typeof document !== 'undefined' ? document : null, keepOn = !!FLAGS.stil) {
  const id = setInterval(() => {
    if (!keepOn && doc && doc.hidden) return;
    fn();
  }, ms);
  return id;
}
