// Renders world.phoneNotifications ({text, duration}[], oldest first) as a
// single reused phone-notification card that slides up from below the
// viewport, holds, then slides back down before the next one takes its turn.
const HOLD_DEFAULT = 4;
const SLIDE_OUT_BUFFER = 0.5; // covers the 0.4s CSS transition plus margin

let card = null;
let bodyEl = null;
let queueState = 'idle'; // 'idle' | 'hold' | 'out'
let timer = 0;

function injectStyle() {
  if (document.getElementById('phonefeed-style')) return;
  const style = document.createElement('style');
  style.id = 'phonefeed-style';
  style.textContent = `
#hud .phonefeed-card {
  position: absolute;
  left: 50%;
  bottom: 90px;
  width: min(360px, calc(100vw - 32px));
  transform: translate(-50%, 160%);
  opacity: 0;
  transition: transform 0.4s ease, opacity 0.3s ease;
  background: linear-gradient(180deg, rgba(32,34,30,0.97), rgba(18,20,17,0.97));
  border: 1px solid rgba(63, 201, 122, 0.35);
  border-radius: 18px;
  box-shadow: 0 10px 26px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.4);
  overflow: hidden;
  pointer-events: none;
}
#hud .phonefeed-card.phonefeed-visible {
  transform: translate(-50%, 0);
  opacity: 1;
}
#hud .phonefeed-accent {
  height: 4px;
  background: linear-gradient(90deg, #1e9e56, #3fc97a);
}
#hud .phonefeed-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 4px;
}
#hud .phonefeed-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(63, 201, 122, 0.18);
  font-size: 13px;
  line-height: 1;
}
#hud .phonefeed-wordmark {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #f2f2f2;
  text-transform: uppercase;
}
#hud .phonefeed-time {
  margin-left: auto;
  font-size: 10px;
  color: rgba(255,255,255,0.45);
}
#hud .phonefeed-body {
  padding: 2px 14px 14px;
  color: #f2f2f2;
  font-size: 14px;
  line-height: 1.35;
}
`;
  document.head.appendChild(style);
}

export function initPhoneFeed(world) {
  if (!world.phoneNotifications) world.phoneNotifications = [];
  injectStyle();

  const root = document.getElementById('hud');
  card = document.createElement('div');
  card.className = 'phonefeed-card';
  card.innerHTML =
    '<div class="phonefeed-accent"></div>' +
    '<div class="phonefeed-header">' +
      '<span class="phonefeed-icon">\u{1F514}</span>' +
      '<span class="phonefeed-wordmark">Sikkom</span>' +
      '<span class="phonefeed-time">nu</span>' +
    '</div>' +
    '<div class="phonefeed-body" aria-live="polite"></div>';
  root.appendChild(card);
  bodyEl = card.querySelector('.phonefeed-body');

  queueState = 'idle';
  timer = 0;
}

export function updatePhoneFeed(dt, world) {
  if (!card) return;
  if (!world.phoneNotifications) world.phoneNotifications = [];

  if (queueState === 'idle') {
    const next = world.phoneNotifications.shift();
    if (!next) return;
    bodyEl.textContent = next.text;
    card.classList.add('phonefeed-visible');
    timer = Math.max(1.5, next.duration || HOLD_DEFAULT);
    queueState = 'hold';
    return;
  }

  if (queueState === 'hold') {
    timer -= dt;
    if (timer <= 0) {
      card.classList.remove('phonefeed-visible');
      timer = SLIDE_OUT_BUFFER;
      queueState = 'out';
    }
    return;
  }

  timer -= dt;
  if (timer <= 0) queueState = 'idle';
}
