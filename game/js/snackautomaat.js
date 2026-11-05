import { hoofdspeler } from './players.js';
// The Muurkroket: a snack vending machine in the wall at the snack bars and
// the stations (an invented brand). E puts a few euros in and out comes an
// eierbal, a kroket or a frikandel that heals a little. Simple on purpose:
// no menu, one item at random, a short pause between pulls.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { dist } from './util.js';
import { getScene } from './scene3d.js';
import { getShopsForRender } from './shops.js';

export const MACHINE_PRICE = 3;
export const MACHINE_HEAL = 8;
export const MACHINE_RADIUS = 1.4;
const PAUSE_S = 2.5;
const ITEMS = [
  ['eierbal', 'Een eierbal'],
  ['kroket', 'Een kroket'],
  ['frikandel', 'Een frikandel'],
];

let machines = [];
let readyAt = 0;
let built = false;

export function getMachines() {
  return machines;
}

export function initSnackMachines(world) {
  const map = world.map;
  machines = [];
  const add = (x, y, where) => {
    if (machines.some((m) => dist(m.x, m.y, x, y) < 12)) return;
    const [mx, my] = map.escapeBuilding ? map.escapeBuilding(x, y, 1.0) : [x, y];
    machines.push({ x: mx, y: my, where, angle: 0 });
  };
  for (const s of getShopsForRender()) if (s.type === 'snack' && !s.country) add(s.x + 3.4, s.y + 0.6, s.name || 'de snackbar');
  for (const st of map.stations || []) add(st.x + 3, st.y + 2, st.name || 'het station');
  built = false;
}

// the scene may not exist yet when the machines are placed
export function updateSnackMachines() {
  if (!built && machines.length && getScene()) { buildMeshes(); built = true; }
}

export function nearestMachine(world) {
  if (!machines.length || hoofdspeler(world).inVehicle || hoofdspeler(world).swimming) return null;
  const { x, y } = hoofdspeler(world);
  let best = null, bd = MACHINE_RADIUS;
  for (const m of machines) {
    const d = dist(x, y, m.x, m.y);
    if (d <= bd) { best = m; bd = d; }
  }
  return best;
}

export function machinePrompt(world) {
  const m = nearestMachine(world);
  if (!m) return null;
  const broke = world.money < MACHINE_PRICE;
  const wait = world.time < readyAt;
  return {
    id: 'muurkroket-' + Math.round(m.x) + ',' + Math.round(m.y), x: m.x, y: m.y, h: 1.6, key: 'E', label: 'Muurkroket',
    sub: broke ? `Te weinig geld (€${MACHINE_PRICE})` : wait ? 'De automaat is nog aan het rammelen' : `€${MACHINE_PRICE}: eierbal, kroket of frikandel`,
    ring: true, dim: broke || wait,
  };
}

// Pull a snack. Returns true when E was used on a machine.
export function useMachine(world, rng = Math.random) {
  const m = nearestMachine(world);
  if (!m) return false;
  if (world.time < readyAt) return true;
  if (world.money < MACHINE_PRICE) {
    world.addMessage(`De Muurkroket slikt je kleingeld niet: €${MACHINE_PRICE} nodig.`, 3);
    return true;
  }
  readyAt = world.time + PAUSE_S;
  world.money -= MACHINE_PRICE;
  const [, name] = ITEMS[Math.floor(rng() * ITEMS.length)];
  world.health = Math.min(100, world.health + MACHINE_HEAL);
  world.addMessage(`Muurkroket: ${name.toLowerCase()} uit de muur, -€${MACHINE_PRICE}. Warm en iets te zout.`, 3.2);
  return true;
}

export function tryMachineInteract(world) {
  const { input } = world;
  if (!input || !(input.wasPressed('e') || input.wasPressed('f'))) return false;
  if (!nearestMachine(world)) return false;
  input.consume('e');
  input.consume('f');
  return useMachine(world);
}

export function resetSnackMachines() {
  readyAt = 0;
}

// --- 3D: a boxy red machine with a lit window and the name on top ------------

function labelTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#b3261e'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#f6e7b8'; g.font = 'bold 40px Arial Narrow, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('MUURKROKET', 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildMeshes() {
  const scene = getScene();
  if (!scene || typeof document === 'undefined') return;
  const body = new THREE.MeshLambertMaterial({ color: 0xb3261e });
  const glass = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a2220 });
  const sign = new THREE.MeshBasicMaterial({ map: labelTexture() });
  for (const m of machines) {
    const g = new THREE.Group();
    g.name = 'muurkroket';
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.6), body);
    box.position.y = 0.9;
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.8, 0.02), glass);
    win.position.set(0, 1.2, 0.31);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.02), dark);
    slot.position.set(0, 0.5, 0.31);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.22, 0.02), sign);
    top.position.set(0, 1.66, 0.31);
    g.add(box, win, slot, top);
    g.position.set(m.x, 0, m.y);
    scene.add(g);
  }
}

