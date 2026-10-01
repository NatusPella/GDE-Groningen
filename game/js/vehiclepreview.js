import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildVehicleMesh } from './models3d_vehicles.js';
import { buildWeaponMesh, buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { buildProductMesh } from './shopmodels3d.js';

const OBJECT_KINDS = new Set(['weapon', 'person', 'product']);

// A rotating 3D vehicle on its own small canvas: the vehicle shops
// (shopui.js) and the garage viewer in the pause menu (garageui.js).
// spec = { kind, model, color, nameIdx, flags } for a vehicle, or
// { kind: 'weapon', weapon } / { kind: 'person', look } (a person appearance,
// as TAMMO_APPEARANCE) / { kind: 'product', product } (shopmodels3d.js key),
// framed by bounding box. opts.pixelRatio: backing pixels per CSS px. opts.interactive: drag to
// rotate, wheel to zoom (auto-rotation resumes after a moment). Renders
// only while shown and while active() says so; dispose() frees the GL context.
export function createVehiclePreview(canvas, { interactive = false, active = () => true, pixelRatio = () => devicePixelRatio } = {}) {
  const p = { renderer: null, scene: null, cam: null, mesh: null, key: '', raf: 0, angle: 0.6, zoom: 1, drag: null, idleAt: 0, spec: null, dead: false, fit: null, last: 0 };

  function disposeMesh(m) {
    m.traverse((o) => {
      if (o.geometry && !(o.geometry.userData && o.geometry.userData.shared)) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const mat of mats) if (!mat.userData || !mat.userData.shared) { if (mat.map) mat.map.dispose(); mat.dispose(); }
    });
  }

  function frame() {
    if (p.fit) {
      const { c, r } = p.fit;
      const d = (r / Math.sin((p.cam.fov * Math.PI) / 360)) * 0.95 * p.zoom / Math.min(1, p.cam.aspect * 0.9);
      p.cam.position.set(c.x, c.y + d * 0.28, c.z + d);
      p.cam.lookAt(c.x, c.y, c.z);
      return;
    }
    const len = (p.spec && p.spec.model && p.spec.model.len) || 4;
    const dist = Math.max(3.2, len * (p.spec && p.spec.kind === 'heli' ? 1.15 : 1.55)) * p.zoom;
    p.cam.position.set(0, len * 0.42 + 0.6 * p.zoom, dist);
    p.cam.lookAt(0, p.spec && p.spec.kind === 'heli' ? 1.5 : p.spec && p.spec.kind === 'car' ? 0.75 : 0.6, 0);
  }

  function tick() {
    if (p.dead || !p.mesh || !active()) { p.raf = 0; return; }
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const pr = pixelRatio();
    if (w && h && (canvas.width !== Math.round(w * pr) || canvas.height !== Math.round(h * pr))) {
      p.renderer.setPixelRatio(pr);
      p.renderer.setSize(w, h, false);
      p.cam.aspect = w / h;
      p.cam.updateProjectionMatrix();
    }
    const now = performance.now();
    const dt = Math.min(0.1, (now - (p.last || now)) / 1000);
    p.last = now;
    if (!p.drag && now > p.idleAt) p.angle += dt * 0.75;
    p.mesh.rotation.y = p.angle;
    if (p.spec.kind === 'person') animatePersonWalk(p.body, 0, dt);
    frame();
    p.renderer.render(p.scene, p.cam);
    p.raf = requestAnimationFrame(tick);
  }

  function show(spec) {
    const key = spec ? JSON.stringify(spec) : '';
    if (key === p.key && (p.raf || !spec)) return;
    p.key = key;
    if (p.mesh) { p.scene.remove(p.mesh); disposeMesh(p.mesh); p.mesh = null; }
    p.spec = spec;
    if (!spec) {
      canvas.classList.remove('on');
      cancelAnimationFrame(p.raf);
      p.raf = 0;
      return;
    }
    canvas.classList.add('on');
    if (!p.renderer) {
      try {
        p.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      } catch (err) {
        canvas.classList.remove('on');
        return;
      }
      p.renderer.outputColorSpace = THREE.SRGBColorSpace;
      p.scene = new THREE.Scene();
      p.scene.add(new THREE.HemisphereLight(0xf4f2ec, 0x2a3a2e, 1.6));
      const sun = new THREE.DirectionalLight(0xffffff, 2.2);
      sun.position.set(4, 6, 3);
      p.scene.add(sun);
      // back light so dark guns and hair read against the dark panel
      p.rim = new THREE.DirectionalLight(0xdff4e6, 1.8);
      p.rim.position.set(-3, 2.5, -5);
      p.scene.add(p.rim);
      p.cam = new THREE.PerspectiveCamera(32, 3, 0.1, 100);
    }
    p.fit = null;
    p.rim.visible = OBJECT_KINDS.has(spec.kind);
    if (OBJECT_KINDS.has(spec.kind)) {
      const body = spec.kind === 'weapon' ? buildWeaponMesh(spec.weapon)
        : spec.kind === 'person' ? buildPersonMesh(spec.look.shirt, spec.look.skin, spec.look)
          : buildProductMesh(spec.product);
      if (!body) { show(null); return; }
      p.mesh = new THREE.Group();
      p.mesh.add(body);
      p.body = body;
      if (spec.kind === 'person') {
        p.fit = spec.frame === 'head' ? { c: new THREE.Vector3(0, 1.5, 0), r: 0.36 } : { c: new THREE.Vector3(0, 0.95, 0), r: 0.95 };
      } else {
        body.updateMatrixWorld(true);
        const sphere = new THREE.Box3().setFromObject(body).getBoundingSphere(new THREE.Sphere());
        // turn about the model's own middle
        body.position.set(-sphere.center.x, 0, -sphere.center.z);
        p.fit = { c: new THREE.Vector3(0, sphere.center.y, 0), r: Math.max(0.05, sphere.radius) };
      }
    } else {
      const fake = { id: -1 - (spec.nameIdx || 0), model: { ...spec.model, color: spec.color }, isBike: spec.kind === 'bike', isScooter: spec.kind === 'scooter', isBoat: spec.kind === 'boat', isHeli: spec.kind === 'heli', ...(spec.flags || {}), health: 100 };
      p.mesh = buildVehicleMesh(fake);
    }
    p.scene.add(p.mesh);
    p.last = 0;
    if (!p.raf) p.raf = requestAnimationFrame(tick);
  }

  if (interactive) {
    canvas.addEventListener('pointerdown', (e) => { p.drag = { x: e.clientX, a: p.angle }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (p.drag) p.angle = p.drag.a + (e.clientX - p.drag.x) * 0.012; });
    const up = () => { p.drag = null; p.idleAt = performance.now() + 2500; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      p.zoom = Math.max(0.55, Math.min(1.8, p.zoom * (e.deltaY > 0 ? 1.1 : 0.9)));
    }, { passive: false });
  }

  return {
    show,
    // drop the shown model (the renderer stays for the next one)
    clear() { show(null); },
    // resume after active() was false for a while
    wake() { if (p.mesh && !p.raf && !p.dead) p.raf = requestAnimationFrame(tick); },
    dispose() {
      p.dead = true;
      cancelAnimationFrame(p.raf);
      p.raf = 0;
      if (p.mesh) { disposeMesh(p.mesh); p.mesh = null; }
      if (p.renderer) { p.renderer.dispose(); p.renderer.forceContextLoss(); p.renderer = null; }
    },
  };
}
