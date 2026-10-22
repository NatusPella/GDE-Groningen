// Menu sounds for a menu that moves without DOM focus or clicks (#413): one line from that menu, the sound is the one of every other menu
// (sfx/menunav.js rules, sfx/ui.js sounds on the UI bus). A leaf, like pausestate.js: any menu may import it, it imports nothing; sfx/ui.js
// registers the sink when the audio starts. A menu with buttons and focus needs nothing: it is heard through the DOM events when it is part
// of the pause menu or has the class `gm` (menu.css).
//   menuSound('move')      the choice moved
//   menuSound('select')    chosen
//   menuSound('back')      one step back
//   menuSound('toggle', on)
//   menuSound('open')      the menu appeared (the focus it takes is no move)
let sink = null;
export function setMenuSoundSink(fn) { sink = typeof fn === 'function' ? fn : null; }
export function menuSound(which, on) {
  if (sink) sink(which, on);
}
