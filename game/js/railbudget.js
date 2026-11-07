// #651: de spoorchunks bouwden drie per frame, ongeacht hoe duur één chunk was
// (3-8 ms, dus 10-25 ms per frame). Een tijdsbudget met dezelfde "minstens één
// per frame"-regel begrenst dat. Pure regel, zodat de policy los te testen is.
export const RAIL_CHUNK_BUDGET_MS = 3;

export function railChunkAllowed(startedAt, now, made, budget = RAIL_CHUNK_BUDGET_MS) {
  if (made <= 0) return true; // altijd minstens één, anders verhongert de ring
  return now - startedAt <= budget;
}
