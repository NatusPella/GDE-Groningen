// When the game is really over: the story's finale has played, every story
// mission is passed (a skipped one still counts as open) and every post-game
// challenge is done. Only then do the credits roll (story.js), once.
// No game imports, so the Node tests can check it.

// story: { finale (the epilogue has played), missions: [{ code, title, passed }] }
// challenges: [{ id, name, jelle, cleared }]
export function endingProgress(story, challenges) {
  const missions = story.missions.filter((m) => !m.passed);
  const left = challenges.filter((c) => !c.cleared);
  return {
    finale: !!story.finale,
    missions,
    challenges: left,
    count: missions.length + left.length,
    done: !!story.finale && !missions.length && !left.length,
  };
}

// The credits roll when everything is done, they haven't rolled in this save
// yet and nothing else is on screen.
export function creditsDue(progress, { seen = false, busy = false } = {}) {
  return progress.done && !seen && !busy;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// "2 uitdagingen van Jelle, 1 andere uitdaging en 1 missie": what stands
// between the player and the end, for the phone and the pause menu.
export function endingLeftText(progress) {
  const parts = [];
  const jelle = progress.challenges.filter((c) => c.jelle).length;
  const other = progress.challenges.length - jelle;
  if (jelle) parts.push(`${plural(jelle, 'uitdaging', 'uitdagingen')} van Jelle`);
  if (other) parts.push(plural(other, jelle ? 'andere uitdaging' : 'uitdaging', jelle ? 'andere uitdagingen' : 'uitdagingen'));
  if (progress.missions.length) parts.push(plural(progress.missions.length, 'missie', 'missies'));
  if (!parts.length) return '';
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}`;
}
