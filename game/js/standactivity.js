import { hoofdspeler } from './players.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { toonStartkaart } from './startkaart.js';

// The activity object (activities.js) for a minigame that starts where you
// stand on one spot: the E prompt at the spot, the place label nearby, the map
// icon and the spot check entry. The game file supplies the behaviour:
//   c = { id, name, label, note, accent, stand() -> {x, y}, origin() -> {x, y}, useRadius, labelRadius,
//         sub (prompt line), hint (place label sub), recText() -> string|null, ubboSub(), glyph(ctx, s),
//         isActive(), start(w, { force }), quit(w), update(dt, w), tick(dt, w), camera(w), debug(w) -> object }
export function standActivity(c) {
  const near = (w) => {
    const p = hoofdspeler(w), s = c.stand();
    if (c.isActive() || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return false;
    return Math.hypot(p.x - s.x, p.y - s.y) < (c.useRadius || 3);
  };
  return {
    id: c.id,
    layer: c.id,
    legend: { kind: 'act-' + c.id, label: c.label, note: c.note },
    init(w) { window['__' + c.id] = c.debug ? c.debug(w) : {}; },
    spots: () => [{ id: c.id, name: c.name, x: c.stand().x, y: c.stand().y }],
    prompt(w) {
      if (!near(w)) return null;
      const why = activityBlock(w);
      const s = c.stand();
      return { id: c.id, x: s.x, y: s.y, h: 2.2, key: 'E', label: c.label, sub: why || (c.recText && c.recText()) || c.sub, ring: true, dim: !!why };
    },
    secondary(w) {
      if (c.isActive() || hoofdspeler(w).inVehicle) return [];
      const o = c.origin ? c.origin() : c.stand(), s = c.stand();
      if (Math.hypot(hoofdspeler(w).x - o.x, hoofdspeler(w).y - o.y) > (c.labelRadius || 120)) return [];
      return [{ id: c.id + '-2', x: s.x, y: s.y, h: 2.2, label: c.name, sub: c.hint || 'Loop erheen en druk E', kind: 'place' }];
    },
    interact(w) {
      if (!near(w)) return false;
      const why = activityBlock(w);
      if (why) { w.addMessage(why, 2.5); return true; }
      // #678: één standaard startkaart (doel, medailles, beloning, samen, record), daarna het spel zelf
      toonStartkaart(w, c.id, { record: c.recText ? c.recText() : null });
      c.start(w, {});
      return true;
    },
    active: () => c.isActive(),
    quit: (w) => c.quit(w),
    update(dt, w) {
      if (!c.isActive()) return;
      if (w.pendingRespawn) { c.quit(w); return; }
      c.update(dt, w);
    },
    tick: (dt, w) => c.tick(dt, w),
    camera: (w) => c.camera(w),
    icon(ctx, s) {
      iconDisc(ctx, s, c.accent);
      ctx.save();
      ctx.scale(s, s);
      c.glyph(ctx);
      ctx.restore();
    },
    mapSub: () => (c.recText && c.recText()) || c.note,
    ubbo(w) {
      const s = c.stand();
      return { name: c.name, sub: c.ubboSub, dist: Math.hypot(s.x - hoofdspeler(w).x, s.y - hoofdspeler(w).y), x: s.x, y: s.y, play: c.id, where: c.where || c.name, hint: 'loop erheen en druk E' };
    },
  };
}

// The record line of a challenge: lower is better for times.
export function recLine(rec, fmt, medals) {
  if (!rec || rec.best == null) return null;
  return `Record: ${fmt(rec.best)}${rec.medal ? ' · ' + medals[rec.medal].toLowerCase() : ''}`;
}

