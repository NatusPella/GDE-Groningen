// Coöp online (#95): transport met de vorm van memtransport (send, onmessage,
// isOpen, close) bovenop de IPC-brug van Electron (window.gdeDesktop.coop,
// preload.js). De TCP-verbinding zelf zit in het main-proces (coopcore.cjs).
// Zonder Electron bestaat er geen api, dus geen online modus.

export const onlineSupported = () => typeof window !== 'undefined' && !!(window.gdeDesktop && window.gdeDesktop.coop);

export function ipcTransport(api) {
  let open = false;
  const tr = {
    onmessage: null, onstate: null,
    isOpen: () => open,
    send(bytes) { if (!open) return false; api.send(bytes); return true; },
    close() { open = false; api.stop(); },
  };
  const off = api.onEvent((kind, payload) => {
    if (kind === 'msg' && tr.onmessage) tr.onmessage(new Uint8Array(payload));
    else if (kind === 'state') { open = payload.state === 'open'; if (tr.onstate) tr.onstate(payload.state); }
  });
  tr.dispose = () => { off(); };
  return tr;
}
