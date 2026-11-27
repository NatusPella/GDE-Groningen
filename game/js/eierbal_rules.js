// The eierbal from the flat's fridge (#1344): pure rules, so a test can prove
// what E does. Nothing happens silently: you eat (and see the gain) or you are
// told why not.
export const EIERBAL_HEAL = 100; // health is refilled to the max

// state: { health, armor, now, lastAt, cooldown, perkArmor, armorCap }
// perkArmor = armour the Vetpot adds (0 without the fryer upgrade).
export function eierbalPlan({ health = 100, armor = 0, now = 0, lastAt = -Infinity, cooldown = 45, perkArmor = 0, armorCap = 0 } = {}) {
  const wait = cooldown - (now - lastAt);
  if (wait > 0) return { eat: false, msg: `Nog vol van de vorige eierbal. Over ${Math.ceil(wait)} seconden past er weer één in` };
  const heal = Math.max(0, 100 - health);
  const arm = perkArmor > 0 ? Math.max(0, Math.min(armorCap, armor + perkArmor) - armor) : 0;
  if (heal <= 0 && arm <= 0) return { eat: false, msg: 'Je gezondheid zit al vol, de eierbal blijft in de vriezer' };
  const gain = [heal > 0 ? `+${Math.round(heal)} gezondheid` : '', arm > 0 ? `+${Math.round(arm)} pantser` : ''].filter(Boolean).join(' en ');
  return { eat: true, heal, armor: arm, msg: `Eierbal gegeten: ${gain}` };
}
