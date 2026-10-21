// Leaf: the shop icon (a data URL). shops.js draws it and registers itself at load; shopui.js and
// dorpsuitjes.js ask through here so they are not part of shops.js's import cycle (#108).
let impl = null;
export function registerShopIcon(fn) { impl = fn; }
export function shopIconUrl(type, px = 64) { return impl ? impl(type, px) : ''; }
