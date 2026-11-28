// Character dossiers: one casting card per character, the single source for who they are.
// Joins the data files and exposes lookups; the schema and the pure rules are in
// characterdossiers_base.js. Used by the Verhaal > Personages card (verhaalui.js, spoiler-free via
// `reveal`/`from`), the export (scripts/characterdossiers_export.mjs) and the consistency test
// (scripts/characterdossiers_test.mjs). Pure data, no DOM.
import { relationsOf, visibleFacts, fillStats, birthYears, ageIn, NA, ACTS } from './characterdossiers_base.js';
import { LEADS } from './characterdossiers_leads.js';
import { STORY } from './characterdossiers_story.js';
import { MINOR, FAMILY, CANDIDATES } from './characterdossiers_minor.js';
import { RELATION_LIST } from './characterdossiers_relations.js';
import { BIBLE } from './characterdossiers_bible.js';

export { NA, ACTS, birthYears, ageIn, fillStats };
export const DOSSIERS = [...LEADS, ...STORY, ...MINOR, ...FAMILY, ...CANDIDATES, ...BIBLE];
export const DOSSIER_BY_ID = new Map(DOSSIERS.map((d) => [d.id, d]));
export const RELATIONS = RELATION_LIST;

export const dossierOf = (id) => DOSSIER_BY_ID.get(id) || null;
export const relationsFor = (id) => relationsOf(RELATIONS, id);

// the facts the Personages card may show to this player (spoiler-free); `ctx` = { met, done: Set<stepId> }
export function cardFacts(id, ctx) {
  const d = DOSSIER_BY_ID.get(id);
  return d ? visibleFacts(d, RELATIONS, DOSSIER_BY_ID, ctx) : [];
}

// the cast list for the callsheet: characters grouped by tier
export const castByTier = () => {
  const out = {};
  for (const d of DOSSIERS) (out[d.tier] = out[d.tier] || []).push(d);
  return out;
};
