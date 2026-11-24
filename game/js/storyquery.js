// Leaf: read-only questions about the story (the current step, a flag, the save) for the modules that
// only need to ask. story.js registers the real functions when it loads; without it they answer as a
// story that has not started does. This keeps shops, padel, banter and the rest out of story.js's
// import cycle (#108).
const impl = {};
export function registerStoryQueries(o) { Object.assign(impl, o); }

export const currentStep = () => (impl.currentStep ? impl.currentStep() : null);
export const storyFlag = (name) => (impl.storyFlag ? impl.storyFlag(name) : false);
export const getStorySteps = () => (impl.getStorySteps ? impl.getStorySteps() : []);
export const getStoryView = () => (impl.getStoryView ? impl.getStoryView() : { end: false });
export const storyVoorschotInfo = (id) => (impl.storyVoorschotInfo ? impl.storyVoorschotInfo(id) : null);
export const prepareStoryShop = () => { if (impl.prepareStoryShop) impl.prepareStoryShop(); };
export const getStorySave = () => (impl.getStorySave
  ? impl.getStorySave()
  : { v: 2, done: [], skipped: [], fails: {}, waived: [], voorschot: [], cards: [], flags: [] });
// de ontgrendelpoort (unlockgate.js): zonder story.js is alles open, zoals een oude save
export const storyWorldOpen = (id) => (impl.storyWorldOpen ? impl.storyWorldOpen(id) : true);
export const storyGateHint = (id) => (impl.storyGateHint ? impl.storyGateHint(id) : null);
// de stand van die poort (unlockgate.js progressFrom), met de poort van het verhaal zelf; null zonder story.js
export const storyGateProgress = () => (impl.storyGateProgress ? impl.storyGateProgress() : null);
