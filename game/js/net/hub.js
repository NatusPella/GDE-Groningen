// Samen spelen (#95): de host als middelpunt van een ster met N spelers (minimaal 4,
// instelbaar tot 8). Per gast een eigen verbinding en HostSession (eigen invoer,
// eigen status, eigen token); de hub wijst de plekken en figuren toe (coopplayers.js),
// stuurt iedereen de lijst met spelers en laat de snapshots meelopen. Pure logica
// op elk transport met send/onmessage; geen DOM, geen echte sockets.

import { HostSession } from './session.js';
import { T, encodeJson, readHeader, decodeJson } from './codec.js';
import { checkHandshake } from './protocol.js';
import { schoonNaam, maakId } from './serverlijst.js';
import { createRoster, wijsPlekToe, verwijder, zetMax, zetVerbinding, zetAvatar, lijst, lijstEvent, charInfo, heeftPlek } from '../coopplayers.js';

export const PENDING_MAX = 20; // s: een verbinding die in zo lang geen geldige hello stuurde (of geweigerd is), wordt gesloten en vergeten

export class HostHub {
  // cfg: { info, seed, sim, caps, max, onJoin(slot, char), onLeave(slot, why), onLost(slot), onResumed(slot), onEvent(slot, body) }
  constructor(cfg) {
    this.cfg = cfg; this.roster = createRoster(cfg.max);
    this.sessions = new Map();   // slot -> HostSession
    this.pending = new Set();    // sessies die nog geen plek hebben
    this.onchange = null;        // roster veranderd (voor lobby en HUD)
    this.id = maakId(cfg.rand);  // de vaste identiteit van deze sessie (#450): de lijst en de gasten verwijzen ernaar
    this.openbaar = null;        // { naam } zolang de gastheer de sessie in de openbare lijst houdt (#438); standaard privé
    this.opOpenbaar = null;      // wie de regel plaatst (lobbyui.js): hoort het als hij aan- of uitgaat
    this.snapCache = null; this.snapTick = -1; this.tickN = 0;
  }

  // De openbare regel van deze sessie (#438, #450): de naam, het vaste id en het aantal spelers van dit moment. Null zolang
  // de gastheer de sessie privé houdt. Wie hem plaatst vraagt hem bij elke aankondiging opnieuw op, dus een gast die
  // binnenkomt of wegvalt telt meteen mee (een plek die op een terugkerende gast wacht telt niet).
  publiek() {
    if (!this.openbaar) return null;
    const nu = this.roster.spelers.filter((s) => s.verbinding !== 'lost').length;
    const zonderSpeler = this.cfg.koploos ? 1 : 0; // een gastheer zonder speler (#450) is geen speler in de lijst
    return { id: this.id, naam: this.openbaar.naam, spelers: Math.max(1, nu - zonderSpeler), max: this.roster.max };
  }

  // De sessie openbaar maken of weer privé (#438, #450). De naam gaat door hetzelfde filter als een online naam
  // (constitutie 10); het id blijft dat van deze sessie, ook als hij even privé was. Zo houdt de sessie één vaste regel in de
  // lijst in plaats van elke keer een nieuwe, en vindt wie hem zag hem terug. Geeft { ok, openbaar, naam?, id?, reason? }.
  zetOpenbaar(aan, naam) {
    const was = !!this.openbaar;
    if (!aan) {
      this.openbaar = null;
      if (was && this.opOpenbaar) this.opOpenbaar(null);
      return { ok: true, openbaar: false };
    }
    const r = schoonNaam(naam);
    if (!r.ok) return { ok: false, openbaar: was, reason: r.reason };
    this.openbaar = { naam: r.naam };
    if (this.opOpenbaar) this.opOpenbaar(this.publiek());
    return { ok: true, openbaar: true, naam: r.naam, id: this.id };
  }

  // Een nieuwe verbinding van een gast. Er is nog geen plek: die komt bij zijn eerste geldige hello.
  // Een gast die terugkomt met zijn token (nieuwe verbinding na wegvallen) krijgt zijn eigen plek terug.
  accept(link) {
    link.onmessage = (buf) => {
      const h = readHeader(buf);
      if (!h || h.type !== T.HELLO) return;
      const m = decodeJson(buf);
      const tok = m && m.body && m.body.token;
      const old = tok && [...this.sessions.values()].find((x) => x.guest && x.guest.token === tok);
      if (old) { old.rebind(link); old._raw(buf); return; }
      this._nieuweSessie(link)._raw(buf);
    };
    return link;
  }

  _nieuweSessie(link) {
    const hub = this;
    let ses = null;
    const cfg = {
      info: this.cfg.info, seed: this.cfg.seed, caps: this.cfg.caps,
      sessie: () => ({ id: hub.id, naam: hub.openbaar ? hub.openbaar.naam : '' }), // de gast weet bij welke sessie hij hoort (#450)
      sim: { applyInput: (slot, input, seq) => this.cfg.sim.applyInput(slot, input, seq), snapshot: () => this._snapshot(), fullState: () => this.cfg.sim.fullState(), extra: (slot, tick) => (this.cfg.sim.extra ? this.cfg.sim.extra(slot, tick) : null) },
      assign(hello) {
        const p = wijsPlekToe(hub.roster, hello && hello.char);
        if (!p) return null;
        hub.pending.delete(ses); hub.sessions.set(p.slot, ses);
        if (hello && hello.avatar) zetAvatar(hub.roster, p.slot, hello.avatar); // de online-avatar van de gast (#455)
        const c = charInfo(p.char);
        return { slot: p.slot, extra: { char: p.char, naam: c.naam, kleur: c.kleur, max: hub.roster.max, lijst: lijstEvent(hub.roster).lijst } }; // de korte lijst (zonder naam en kleur): met 16 spelers past de volle lijst niet in een welkomstbericht (MAX_JSON)
      },
      onRelease(slot, why) {
        hub.sessions.delete(slot); verwijder(hub.roster, slot);
        if (hub.cfg.sim.vergeet) hub.cfg.sim.vergeet(slot); // wat de extra wereld die plek vertelde, geldt niet voor de volgende speler
        if (why === 'verlopen') { try { ses.link.close && ses.link.close(); } catch (e) { /* weg */ } } // niet teruggekomen binnen het venster: de verbinding zelf ook dicht
        if (hub.cfg.onLeave) hub.cfg.onLeave(slot, why);
        hub._announceList();
      },
    };
    ses = new HostSession(link, cfg, this.cfg.rand);
    this.pending.add(ses); ses.pendingSinds = 0;
    ses.onjoin = (slot) => { if (this.cfg.onJoin) this.cfg.onJoin(slot, this.roster.spelers.find((s) => s.slot === slot).char, this.roster.spelers.find((s) => s.slot === slot).avatar || null); this._announceList(); };
    ses.onlost = (slot) => { zetVerbinding(this.roster, slot, 'lost'); if (this.cfg.onLost) this.cfg.onLost(slot); this._announceList(); };
    ses.onstatus = (st) => {
      const slot = ses.slot;
      if (!this.sessions.has(slot)) return;
      if (st === 'ok') {
        const was = this.roster.spelers.find((s) => s.slot === slot);
        const voorheen = was && was.verbinding;
        zetVerbinding(this.roster, slot, 'ok');
        if (voorheen === 'lost' && this.cfg.onResumed) this.cfg.onResumed(slot);
        this._announceList();
      }
      else if (st === 'lag') { zetVerbinding(this.roster, slot, 'lag'); this._announceList(); }
    };
    ses.onevent = (b) => { if (this.cfg.onEvent) this.cfg.onEvent(ses.slot, b); };
    return ses;
  }

  _snapshot() { // één snapshot per tick voor alle spelers
    if (this.snapTick !== this.tickN || !this.snapCache) { this.snapCache = this.cfg.sim.snapshot(); this.snapTick = this.tickN; }
    return this.snapCache;
  }
  _announceList() {
    const ev = lijstEvent(this.roster);
    for (const s of this.sessions.values()) if (s.guest) s.announce(ev);
    if (this.onchange) this.onchange(this.roster);
  }

  tick(dt) {
    this.tickN++;
    for (const s of [...this.pending, ...this.sessions.values()]) s.tick(dt);
    for (const s of [...this.pending]) { // een geweigerde of stille verbinding blijft niet eeuwig staan (elke nieuwe poging was er een erbij)
      s.pendingSinds += dt;
      if (s.pendingSinds >= PENDING_MAX || (s.link && s.link.isOpen && !s.link.isOpen())) { this.pending.delete(s); try { s.link.close && s.link.close(); } catch (e) { /* weg */ } }
    }
  }
  // voor de duurtest en de diagnose: wat de hub vasthoudt
  stats() {
    let relPending = 0, relAhead = 0;
    for (const s of [...this.pending, ...this.sessions.values()]) { relPending = Math.max(relPending, s.rel.pending.length); relAhead = Math.max(relAhead, s.rel.ahead.size); }
    return { sessies: this.sessions.size, wachtend: this.pending.size, relPending, relAhead };
  }
  // naar één speler of naar iedereen (betrouwbaar)
  announce(body, slot = null) {
    if (slot != null) { const s = this.sessions.get(slot); return !!s && s.announce(body); }
    let ok = false; for (const s of this.sessions.values()) ok = s.announce(body) || ok; return ok;
  }
  kick(slot, reden = 'verwijderd') {
    const s = this.sessions.get(slot); if (!s) return false;
    s.announce({ k: 'weg', reden });
    return true;
  }
  release(slot) { const s = this.sessions.get(slot); if (s) s.leave(); }
  setMax(n) { const m = zetMax(this.roster, n); this._announceList(); return m; }
  get vrijePlekken() { return heeftPlek(this.roster); }
  status(slot) { const s = this.sessions.get(slot); return s ? s.status : null; }
  closeAll() {
    if (this.openbaar) this.zetOpenbaar(false); // de sessie stopt: weg uit de lijst (#450)
    for (const s of [...this.sessions.values()]) s.leave();
    for (const s of this.pending) { try { s.link.close && s.link.close(); } catch (e) { /* weg */ } }
    this.pending.clear();
  }
}
