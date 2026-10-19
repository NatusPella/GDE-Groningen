// The game's name and the GDE wordmark (CSS: .gde-logo in index.html). The
// series is GDE + a place on a place-name sign + a subtitle per game; a
// sequel only swaps PLACE and SUBTITLE. index.html repeats the markup for the
// loading and title screens, which show before any module has loaded.

export const SERIES = 'GDE';
export const SERIES_MEANING = 'Grootste Diefstal Ever';
const PLACE = 'Groningen';
export const SUBTITLE = 'Zomer vol misdaad';
export const GAME_NAME = `${SERIES} ${PLACE}`;
export const GAME_TITLE = `${GAME_NAME} – ${SUBTITLE}`;

// sub: the subtitle; meaning: "Grootste Diefstal Ever" in small caps;
// decorative: hidden from screen readers (the name is said elsewhere)
export function logoHtml({ sub = true, meaning = false, cls = '', decorative = false } = {}) {
  const a11y = decorative ? 'aria-hidden="true"' : `role="img" aria-label="${GAME_TITLE}"`;
  return `<div class="gde-logo${cls ? ' ' + cls : ''}" ${a11y}>`
    + `<span class="gde-mark">${SERIES}</span><span class="gde-sign">${PLACE}</span>`
    + (sub ? `<span class="gde-sub">${SUBTITLE}</span>` : '')
    + (meaning ? `<span class="gde-meaning">${SERIES_MEANING}</span>` : '')
    + '</div>';
}
