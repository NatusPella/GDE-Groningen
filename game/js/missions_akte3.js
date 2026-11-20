// AAA-upgrade van akte 3 (M12 tot M16, AAA-upgradeplan): wat de missies van de Eemsdelta, het Oldambt en de Dollard
// erbij krijgen op de bouwstenen die er al zijn: een regelkaart per stap (regelkaart.js), een wachtfiguur bij het
// wachten (wachtprops.js), aankleding om het doel (missiedecor.js), een binnenset voor de toast (stagesets.js) en
// stings op de stappen (`aaa: true`, de runner geeft dan bij elke voltooide tussenstap een sting).
//
// Alleen data: canon, ids, volgorde, beloning en stappen blijven zoals ze waren (saves). applyNieuw
// (missions_nieuw.js) roept applyAkte3 aan als laatste, op de lijst met defs.
//
// Samen spelen (voor alle missies hieronder): een verhaalmissie is van wie het spel opende; een gast kiest bij Meedoen?
// (J of N, geen antwoord is nee). Aankleding, wachtfiguur, regelkaart, binnenset en sting zijn lokaal beeld bij de speler
// die de stap draait: er gaat niets over het net en er wordt niets in beloning of voortgang geschreven (per speler,
// #429). Wie wegvalt of later aansluit mist alleen beeld; de stap blijft bij wie de missie opende (coopmissie.js).
import { makeStrip } from './planecontrol.js';
import { registreerAankleding } from './missiedecor.js';

const PI2 = Math.PI / 2;

// --- aankleding ------------------------------------------------------------------------------------------------------
// Lokale maten t.o.v. het anker (along = kijkrichting van de speler, side = rechts). Alles ligt binnen 16 m van het anker
// en is dus bruikbaar in elke richting: een plan dat naast een landingsstrook of een kade staat, staat nergens op de
// strook zolang het anker ver genoeg van de strook ligt (zie AFSTAND_STROOK).

const look = (shirt, skin, seed, variant = 'male') => ({ shirt, skin, seed, variant });

// De kade van de Eemshaven bij nacht: kisten en vaten, twee havenwerkers die een eind verderop praten (geen publiek: de
// missie is een sluiptocht).
export const PLAN_HAVEN = {
  props: [
    { kind: 'kist', along: 6.0, side: -8.5, a: 0.3 },
    { kind: 'kist', along: 7.4, side: -9.4, a: 0.9 },
    { kind: 'kist', along: 5.0, side: 9.0, a: -0.4 },
    { kind: 'ton', along: -6.5, side: 8.2, a: 0 },
    { kind: 'ton', along: -5.4, side: 9.0, a: 0 },
    { kind: 'ton', along: 9.0, side: 7.8, a: 0 },
  ],
  people: [
    { look: look(0xe08a2a, 0xd9a06e, 8801), along: 12, side: -10, a: PI2, anim: 'talk' },
    { look: look(0xe08a2a, 0xa9744a, 8802, 'female'), along: 12.9, side: -9.1, a: PI2 + 0.5, anim: 'point' },
  ],
  crowd: null,
};

// Roelfiens strook bij Midwolda: de trekker, wat balen en kisten, Roelfien en een buurman.
export const PLAN_GRAANSTROOK = {
  props: [
    { kind: 'tractor', along: -9, side: 6.5, a: 1.2 },
    { kind: 'baal', along: 4.0, side: -7.5, a: 0.3 },
    { kind: 'baal', along: 5.1, side: -8.3, a: 1.1 },
    { kind: 'baal', along: 4.5, side: -7.9, a: 2.0, y: 0.9 },
    { kind: 'kist', along: -3.5, side: -6.0, a: -0.3 },
    { kind: 'ton', along: 8.5, side: 6.0, a: 0 },
  ],
  people: [
    { look: look(0xb23a2e, 0xf1c9a5, 8901, 'female'), along: 2.5, side: 4.0, a: -PI2, anim: 'wave' },
    { look: look(0x4a5a6a, 0xd9a06e, 8902), along: 3.6, side: 5.2, a: -PI2 - 0.4, anim: 'talk' },
  ],
  crowd: null,
};

// De landing: hetzelfde erf, met tien kermisgangers die zijn meegekomen om het vliegtuig te zien landen, en een spandoek.
export const PLAN_GRAANLANDING = {
  props: [...PLAN_GRAANSTROOK.props, { kind: 'banner', along: 11, side: 3.5, a: 0, title: 'WELKOM TERUG, ROELFIEN', sub: 'Het spandoek hing boven de kermis' }],
  people: PLAN_GRAANSTROOK.people.map((q) => ({ ...q, look: { ...q.look }, anim: q.anim === 'talk' ? 'cheer' : q.anim })),
  crowd: { shape: 'line', pts: [[-5, 9], [12, 9]], count: 10, side: 2.2, spread: 2.6 },
};

// De afstand van het anker tot de as van de strook voor de aankleding naast Roelfiens strook (strook 34 m breed, plus de
// marge van planecontrol.js: 23 m vanaf de as; het plan reikt 16 m).
export const AFSTAND_STROOK = 45;

export const PLANNEN_AKTE3 = { haven: PLAN_HAVEN, graanstrook: PLAN_GRAANSTROOK, graanlanding: PLAN_GRAANLANDING };
for (const [kind, plan] of Object.entries(PLANNEN_AKTE3)) registreerAankleding(kind, plan);

// --- regelkaarten ----------------------------------------------------------------------------------------------------

const stap = (icoon, label) => ({ icoon, label });
const stappen = (label, klaar, lijst, extra = {}) => ({ type: 'stappen', inv: { label, klaar, stappen: lijst }, ...extra });

// De regelkaarten per missie, op sleutel; applyAkte3 hangt ze aan de stappen. Elke kaart heeft een doel en hoogstens drie regels.
export const KAARTEN = {
  M13: [
    { doel: 'Sluip naar de kraan aan de kade', druk: 'acht minuten tot het schip vertrekt', afloop: 'ziet een bewaker je, dan stuurt hij je terug: de missie blijft',
      regels: [stappen('Het plan', 0, [stap('pijl', 'Kraan'), stap('klok', 'Stil staan'), stap('pakje', 'Container 4471'), stap('hand', 'Papieren')], { na: 8, duur: 8 }),
        { type: 'wijzer', inv: { afstand: 130, hoek: 0, label: 'Kraan' }, tekst: 'Blijf uit de lichtbundels en uit het zicht van de camera.', na: 17, duur: 7 }] },
    { doel: 'Blijf stil in de kooi tot de bewaker wegloopt',
      regels: [{ type: 'teller', inv: { rest: 9, totaal: 9, label: 'Stil staan' }, tekst: 'Negen seconden stil staan; bij het tweede piepje kijkt hij omhoog.', na: 2, duur: 7 }] },
    { doel: 'Zoek container 4471, de blauwe naast de rode',
      regels: [{ type: 'wijzer', inv: { afstand: 150, hoek: 0, label: 'Container 4471' }, tekst: 'De blauwe container staat naast de rode, onder de stapel.', na: 8, duur: 7 }] },
    { doel: 'Verwissel de papieren van container 4471',
      regels: [{ type: 'teller', inv: { rest: 6, totaal: 6, label: 'Papieren' }, tekst: 'Zes seconden rustig staan: de oude papieren eruit, de nieuwe erin.', na: 2, duur: 6 }] },
    { doel: 'Terug naar Lammert aan de kade',
      regels: [{ type: 'wijzer', inv: { afstand: 270, hoek: 0, label: 'Lammert' }, tekst: 'Nog één bewaker op de terugweg. Het schip vertrekt om zes uur.', na: 7, duur: 7 }] },
  ],
  M14: [
    { doel: 'Stap in de auto naast de trekker-limo' },
    { doel: 'Wees eerder bij de sluis dan Jelles deurwaarder', afloop: 'is de limo eerst, dan is het beslag gelegd: opnieuw proberen',
      regels: [stappen('Zo win je', 0, [stap('auto', 'Over de dijk'), stap('pijl', 'Naar de sluis'), stap('hart', 'Eerst aan de sluis')], { na: 8, duur: 8 }),
        { type: 'wijzer', inv: { afstand: 8000, hoek: 0, label: 'Sluis van Delfzijl' }, tekst: 'De sluis van Delfzijl ligt acht kilometer vooruit, langs de dijk. Let op de schapen.', na: 18, duur: 8 }] },
  ],
  M15: [
    { doel: 'Stap in het vliegtuig van Roelfien',
      regels: [stappen('Zo vlieg je', 0, [stap('pijl', 'Gas met W'), stap('meter', 'Trek op bij 30 m/s'), stap('hart', 'Laag door de poorten')], { na: 6, duur: 9 })] },
    { doel: 'Laag over het graan, het spandoek over de kermis', afloop: 'te hoog, te laag of een poort gemist: het spandoek hangt er niet',
      regels: [{ type: 'limiet', inv: { waarde: 12, limiet: 24, marge: 6, max: 30, eenheid: 'm', label: 'Hoogte' }, tekst: 'Eerste poort: tussen 3 en 24 meter. Laag over het graan.', na: 8, duur: 9 },
        { type: 'wijzer', inv: { afstand: 3000, hoek: 0, label: 'De molen' }, tekst: 'Spandoek mee. Nu de molen rechts houden en naar de kermis.', bij: 'poort1', duur: 7 },
        stappen('De rest', 2, [stap('hart', 'Spandoek'), stap('hart', 'Molen'), stap('hart', 'Kermis'), stap('pijl', 'Terug')], { tekst: 'De kermis ligt onder je: door de rij kramen, daarna omhoog.', bij: 'poort3', duur: 7 })] },
    { doel: 'Land op de strook bij Roelfien',
      regels: [stappen('Zo land je', 0, [stap('pijl', 'Gas terug, niet eraf'), stap('meter', 'Neus iets omlaag'), stap('hand', 'Rem met Shift')], { na: 6, duur: 9 })] },
  ],
  M12: [
    { doel: 'Vlieg Dijkstra\'s lunch naar het UMCG', afloop: 'de ballon ontsnapt over de Dollard: opnieuw proberen',
      regels: [stappen('Het plan', 0, [stap('pakje', 'Lunch naar het UMCG'), stap('pijl', 'Achter de ballon aan'), stap('hand', 'Stil naast de mand')], { na: 8, duur: 8 }),
        { type: 'toets', inv: { label: 'Heli', toetsen: ['Spatie', 'W', 'A', 'D'], handeling: 'tik' }, tekst: 'Spatie omhoog, W vooruit, A en D draaien. Dijkstra vliegt de lange stukken.', na: 17, duur: 8 }] },
  ],
  M16: {
    doel: 'Volg Durk en Douwe langs drie tenten', druk: 'honderd seconden', afloop: 'de menigte duwt: blijf overeind',
    regels: [stappen('Drie tenten', 0, [stap('hart', 'De Gouden Aar'), stap('hart', 'Het Scheve Rad'), stap('hart', 'De Laatste Zweefmolen')], { na: 8, duur: 8 }),
      stappen('Drie tenten', 1, [stap('hart', 'De Gouden Aar'), stap('hart', 'Het Scheve Rad'), stap('hart', 'De Laatste Zweefmolen')], { tekst: 'Eén tent gehaald. Proost, en door.', bij: 'punt2', duur: 5 }),
      stappen('Drie tenten', 2, [stap('hart', 'De Gouden Aar'), stap('hart', 'Het Scheve Rad'), stap('hart', 'De Laatste Zweefmolen')], { tekst: 'Twee tenten. Nog één drankje, dan de botsauto\'s.', bij: 'punt4', duur: 5 })],
  },
};

// --- de toepassing ---------------------------------------------------------------------------------------------------

// Zet de aankleding van akte 3 op de defs. `list` is de lijst van missions.js (na applyNieuw); een missie die er niet is
// (een andere opbouw) wordt overgeslagen.
export function applyAkte3(list) {
  const by = (label) => list.find((d) => d.label === label);

  // M13 Het containerlabyrint: kaart, wachtfiguur (de bewaker met koffie bij de kooi, een krantenlezer bij de container),
  // aankleding op de kade en stings. De bewakers zelf zijn die van de heist (watch); het mislukken blijft "teruggestuurd".
  const m13 = by('Het containerlabyrint');
  if (m13 && m13.stages && m13.stages.length >= 5) {
    m13.aaa = true;
    m13.stages.forEach((s, i) => { s.kaart = KAARTEN.M13[i]; });
    const q = m13.start;
    m13.stages[0].dressing = 'haven';
    m13.stages[0].dressingAt = { x: q.x + 6, y: q.y - 14 };
    m13.stages[1].wacht = { figuur: true, prop: 'koffie', seed: 0.35 };
    m13.stages[3].wacht = { figuur: true, prop: 'krant', seed: 0.7 };
    const l = m13.stages[4].target;
    m13.stages[4].dressing = 'haven';
    m13.stages[4].dressingAt = { x: l.x - 4, y: l.y + 12 };
  }

  // M14 De dijk: de regel wordt gezegd; de race zelf (racedecor.js) was er al.
  const m14 = by('De dijk');
  if (m14 && m14.stages && m14.stages.length >= 2) {
    m14.aaa = true;
    m14.stages.forEach((s, i) => { s.kaart = KAARTEN.M14[i]; });
  }

  // M15 Laag over het graan: regelkaarten (instappen, poorten met hoogte, landen), de strook met Roelfien en een trekker, bij
  // de landing een publiek van tien kermisgangers. De aankleding staat 45 m naast de strook, in elke richting buiten de baan.
  const m15 = by('Laag over het graan');
  if (m15 && m15.stages && m15.stages.length >= 3) {
    m15.aaa = true;
    m15.stages.forEach((s, i) => { s.kaart = KAARTEN.M15[i]; });
    const spec = m15.stages[0].strip;
    if (spec) {
      const strook = makeStrip(spec);
      const naast = (langs) => ({ ...strook.point(langs, AFSTAND_STROOK) });
      m15.stages[0].dressing = 'graanstrook';
      m15.stages[0].dressingAt = naast(40);
      m15.stages[2].dressing = 'graanlanding';
      m15.stages[2].dressingAt = naast(strook.length * 0.5);
    }
  }

  // M12 Het staat niet in het rooster: de regelkaart van de heli (de landing met koeien staat in cutscenes_akte3.js)
  const m12 = by('Het staat niet in het rooster');
  if (m12 && m12.stages && m12.stages.length >= 1) {
    m12.aaa = true;
    m12.stages[0].kaart = KAARTEN.M12[0];
  }

  // M16 Nog eentje dan: een kaart voor de hele tocht (een missie zonder stappen heeft def.kaart) en de toast in een
  // kroeg-binnenset: de tent als bar, met de kastelein en een gast.
  const m16 = by('Nog eentje dan');
  if (m16 && m16.waypoints) {
    m16.aaa = true;
    m16.kaart = KAARTEN.M16;
    m16.toastSet = 'kroeg';
  }
}
