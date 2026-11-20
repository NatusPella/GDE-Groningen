// De losse wachtclips van een mens (rondkijken, horloge, wippen, koffie, lezen), puur: geen three.js, geen scène (#985). Eerst in wachtprops.js
// (de wachtfiguur bij een stap); hier uitgepakt zodat models3d_people.js ze ook kan gebruiken voor iedereen die stilstaat, zonder import van de scène.

function zetNeutraal(p) {
  p.pelvisDrop = 0; p.pelvisZ = 0; p.pelvisRX = 0; p.pelvisRY = 0;
  p.chest.x = 0; p.chest.y = 0; p.chest.z = 0;
  p.head.x = 0; p.head.y = 0; p.head.z = 0;
  p.armL.x = 0; p.armL.z = 0.08; p.armL.e = 0.15;
  p.armR.x = 0; p.armR.z = 0.08; p.armR.e = 0.15;
  p.legL.z = 0; p.legL.k = -0.06; p.legR.z = 0; p.legR.k = -0.06;
}
const naar = (a, b, k) => a + (b - a) * k;
const gladde = (k) => { k = k < 0 ? 0 : k > 1 ? 1 : k; return k * k * (3 - 2 * k); };

// Schrijft de pose van één clip op tijd tl in `p` (een neutralPose), zonder iets aan te maken. Het begin en het
// einde van elke clip lopen vanuit de neutrale stand (envelop), dus de overgang tussen clips is zacht.
export function idlePose(p, clip, tl, dur) {
  zetNeutraal(p);
  const env = gladde(Math.min(tl / 0.6, (dur - tl) / 0.6, 1));
  p.chest.x = Math.sin(tl * 1.8) * 0.012; // ademen
  if (clip === 'rondkijken') {
    const k = Math.sin(tl * 0.9) * 0.75 * env;
    p.head.y = k; p.chest.y = k * 0.25;
  } else if (clip === 'horloge') { // linkerarm omhoog, kijkt naar beneden
    p.armL.z = naar(0.08, 1.35, env); p.armL.e = naar(0.15, 2.0, env);
    p.head.x = 0.35 * env; p.head.y = -0.2 * env;
  } else if (clip === 'wippen') {
    const w = Math.max(0, Math.sin(tl * 4.2)) * env;
    p.pelvisDrop = -0.03 * w; p.legL.k = -0.06 - 0.1 * w; p.legR.k = -0.06 - 0.1 * w;
  } else if (clip === 'koffie') { // rechterhand met het kopje naar de mond, af en toe een slokje
    const slok = 0.5 + 0.5 * Math.sin(tl * 1.5);
    p.armR.z = naar(0.08, 1.3, env); p.armR.e = naar(0.15, 1.95 + 0.15 * slok, env);
    p.head.x = -0.12 * slok * env;
  } else if (clip === 'telefoon') { // rechterhand tegen het oor, hoofd een beetje scheef, af en toe een knik
    p.armR.z = naar(0.08, 1.45, env); p.armR.e = naar(0.15, 2.2, env);
    p.head.z = 0.14 * env; p.head.y = Math.sin(tl * 0.8) * 0.2 * env;
    p.head.x = 0.06 * Math.max(0, Math.sin(tl * 2.4)) * env;
  } else if (clip === 'praten') { // gesprek: beide handen bewegen mee, kop knikt (#963: twee wachtenden die kletsen)
    const g = Math.sin(tl * 3.1) * env;
    p.armR.z = naar(0.08, 0.9, env) + 0.25 * g; p.armR.e = naar(0.15, 1.4, env) + 0.3 * g;
    p.armL.z = naar(0.08, 0.5, env) - 0.15 * g; p.armL.e = naar(0.15, 1.0, env);
    p.head.x = 0.1 * Math.max(0, Math.sin(tl * 2.2 + 1)) * env; p.head.y = Math.sin(tl * 0.6) * 0.3 * env;
  } else if (clip === 'lezen') {
    p.armL.z = naar(0.08, 0.7, env); p.armL.e = naar(0.15, 1.7, env);
    p.armR.z = naar(0.08, 0.7, env); p.armR.e = naar(0.15, 1.7, env);
    p.head.x = 0.28 * env; p.head.y = Math.sin(tl * 0.7) * 0.08 * env;
  }
  return p;
}
