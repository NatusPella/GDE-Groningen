// De ondertitel van de radioreclames (#409): een regel onderin beeld, in de stijl van de autoondertitel
// (banter.js), met de firma vooraan. Ondertitelgrootte, donker vlak en hoog contrast volgen a11y.css via #radio-sub.

let el = null;
function subEl() {
  if (el) return el;
  el = document.createElement('div');
  el.id = 'radio-sub';
  el.setAttribute('aria-live', 'polite');
  Object.assign(el.style, {
    position: 'fixed', left: '50%', bottom: '27vh', transform: 'translateX(-50%)', width: 'min(86vw, 760px)',
    textAlign: 'center', font: "clamp(15px, 1.5vw, 20px) 'Arial Narrow', Arial, sans-serif", color: '#fff',
    letterSpacing: '0.3px', textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.6)', pointerEvents: 'none',
    opacity: '0', transition: 'opacity 0.25s', zIndex: '40',
  });
  el.innerHTML = '<span class="rs-firma" style="font-weight:bold;margin-right:6px"></span><span class="rs-line"></span>';
  document.body.appendChild(el);
  return el;
}

export function showRadioSub(firma, text) {
  if (typeof document === 'undefined') return;
  const e = subEl();
  e.querySelector('.rs-firma').textContent = firma ? firma + ':' : '';
  e.querySelector('.rs-line').textContent = text;
  e.style.opacity = '1';
}

export function hideRadioSub() {
  if (el) el.style.opacity = '0';
}
