// Samen spelen (#95): transport met de vorm van memtransport (send, onmessage,
// isOpen, close) bovenop de IPC-brug van Electron (window.gdeDesktop.coop,
// preload.js), voor de IP-adres-route. De TCP-verbindingen zitten in het
// main-proces (coopcore.cjs); elke verbinding heeft een id (de host heeft er
// tot 7, een gast heeft altijd id 0). Zonder Electron bestaat er geen api.

export const onlineSupported = () => typeof window !== 'undefined' && !!(window.gdeDesktop && window.gdeDesktop.coop);

// Een transport voor één verbinding. open = true als de verbinding al geldig is (host: net aangemeld).
export function ipcTransport(api, id = 0, { open: startOpen = false } = {}) {
  let open = startOpen;
  const tr = {
    id, onmessage: null, onstate: null,
    isOpen: () => open,
    send(bytes) { if (!open) return false; api.send(id, bytes); return true; },
    close() { open = false; if (api.close) api.close(id); tr.dispose(); },
  };
  const off = api.onEvent((kind, payload) => {
    if (!payload || payload.id !== id) return;
    if (kind === 'msg' && tr.onmessage) tr.onmessage(new Uint8Array(payload.data));
    else if (kind === 'state') { open = payload.state === 'open'; if (tr.onstate) tr.onstate(payload.state); if (payload.state === 'closed') tr.dispose(); } // een gesloten verbinding hoeft niet meer te luisteren (elke terugkomer was er anders een luisteraar bij)
  });
  let weg = false;
  tr.dispose = () => { if (!weg) { weg = true; off(); } };
  return tr;
}

// Host: elke nieuwe geldige verbinding wordt een eigen transport. onTransport(transport) neemt hem over.
// Geeft een functie terug om te stoppen met luisteren.
export function listenForGuests(api, onTransport) {
  return api.onEvent((kind, payload) => {
    if (kind === 'conn' && payload && Number.isInteger(payload.id) && payload.id > 0) onTransport(ipcTransport(api, payload.id, { open: true }));
  });
}
