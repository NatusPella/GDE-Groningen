// De mock van game/js/scene3d.js voor tests in node (het echte bestand haalt tientallen zware modules en WebGL binnen): alleen wat de THREE-modules van Bezit nodig hebben.
// getScene() geeft een Scene van de three-mock (de test pakt hem met mockScene()); disposeObject doet wat het echte doet voor geometrie en materiaal (gedeelde, userData.shared, blijven staan).
import { Scene } from './threemock.mjs';

const scene = new Scene();
export const mockScene = () => scene;
export const getScene = () => scene;
export function disposeObject(root) {
  root.traverse((o) => {
    const g = o.geometry;
    if (g && !(g.userData && g.userData.shared)) g.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) if (!(m.userData && m.userData.shared)) m.dispose();
  });
}
