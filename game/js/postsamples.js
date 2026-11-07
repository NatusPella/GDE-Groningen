// #658: de MSAA-samplekeuze hing aan de pixelratio, waardoor een adaptieve stap
// omlaag (pr onder 1,75) juist van 2 naar 4 samples sprong en de post-keten
// opnieuw bouwde. De keuze hangt nu aan het kwaliteitsniveau en verandert alleen
// als dat niveau echt wisselt; de rebuild-hysterese is daarmee gratis.
export function postSampleCount(level) {
  return level === 'laag' ? 4 : 2;
}

export function postNeedsRebuild(currentSamples, level) {
  return currentSamples !== postSampleCount(level);
}
