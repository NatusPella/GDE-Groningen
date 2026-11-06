// #587: what the page may do with a URL, without Electron in the mix. The
// renderer is sandboxed, the main process is not: a URL from the page must
// never go straight to shell.openExternal. Only http(s) may open in the
// player's browser; the game's own app://game/ pages stay inside the app; all
// other schemes (file:, ms-msdt:, search-ms:, javascript:, data:, mailto:, ...)
// are refused. Pure functions, so scripts/externurl_test.mjs runs without
// starting Electron.

function parse(raw) {
  try { return new URL(String(raw)); } catch { return null; }
}

// A page of the game itself: its own scheme and host, without a port or login
// that would make it a different origin. Such a URL may load in an app window.
function isGameUrl(raw, scheme, host) {
  const url = parse(raw);
  return !!url && url.protocol === scheme + ':' && url.host === host && !url.username && !url.password;
}

// The address the player's browser may open, or null when it is refused. Only
// http and https: the game has no mailto links.
function safeExternalUrl(raw) {
  const url = parse(raw);
  return url && (url.protocol === 'http:' || url.protocol === 'https:') ? url.href : null;
}

module.exports = { isGameUrl, safeExternalUrl };
