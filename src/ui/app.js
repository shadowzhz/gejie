import { PLACES } from '../data/places.js';
import { formatDateTime } from '../core/calendar.js';
import { esc, loadGame, realmText } from '../core/state.js';
import { renderStartScreen } from './rituals.js';
import { renderBattleView } from './battle-view.js';
import { renderMapPanel } from './map-view.js';
import { renderApertureView } from './aperture-view.js';
import { renderRefineView } from './refine-view.js';
import { mainGrowthGoal } from '../core/growth-guide.js';
import { renderCultivationView, renderGoalShortcut } from './cultivation-view.js';
import { renderBagView } from './bag-view.js';
import { createStartState, handleAction } from './actions.js';
import { startGameLoop } from './game-loop.js';
import { renderModal } from './modal-controller.js';
import { restoreSessions } from './persistence.js';

const ui = { game: loadGame(), tab: 'place', modal: null, start: createStartState() };

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function renderTopBar(goal) {
  const p = ui.game.player;
  const hpPct = Math.round(p.hp / Math.max(1, p.hpMax) * 100);
  const zyPct = Math.round(p.zy / Math.max(1, p.zyMax) * 100);
  const placeName = PLACES[ui.game.location]?.name || '青茅山';
  return `<header class="topbar">
    <div class="top-row">
      <div class="top-id">
        <strong>${esc(p.name)}</strong>
        <span class="badge gold">${esc(realmText(p))}</span>
        <span class="badge">${esc(placeName)}</span>
      </div>
      <div class="clock-box">
        <span data-live="clock">${esc(formatDateTime(ui.game.minutes))}</span>
        ${ui.game.developerMode ? '<button class="sm gold" data-action="openDeveloper">开发者</button>' : ''}
        <button class="sm ghost" data-action="togglePause">${ui.game.paused ? '▶ 继续流逝' : '⏸ 暂停'}</button>
      </div>
    </div>
    <div class="goal-bar"><span>目标</span><div>${esc(goal.text)}</div>${ui.tab === 'cultivation' ? '' : renderGoalShortcut(ui.game, goal)}</div>
    <div class="res-row">
      <div class="res-item"><div class="res-head"><span>气血${ui.game.battle?.meShield ? ` · 盾 ${ui.game.battle.meShield}` : ''}</span><span data-live="hp">${Math.round(p.hp)}/${p.hpMax}</span></div><div class="bar hp"><i data-live="hp-bar" style="width:${hpPct}%"></i></div></div>
      <div class="res-item"><div class="res-head"><span>真元</span><span data-live="zy">${Math.round(p.zy)}/${p.zyMax}</span></div><div class="bar zy"><i data-live="zy-bar" style="width:${zyPct}%"></i></div></div>
      <div class="res-item res-meta"><div class="res-head"><span>元石 <b>${p.yuanshi}</b></span><span>${p.mo >= 30 ? `恶名 ${p.mo}` : `${p.grade}等`}</span></div></div>
    </div>
  </header>`;
}

export function render() {
  const app = document.getElementById('app');
  if (!app) return;
  if (!ui.game) {
    ui.start.hasSave = !!loadGame();
    app.innerHTML = renderStartScreen(ui.start);
    renderModal(ui);
    return;
  }

  const goal = mainGrowthGoal(ui.game);
  let body = '';
  if (ui.game.battle) {
    body = renderBattleView(ui.game);
  } else if (ui.tab === 'place') {
    body = renderMapPanel(ui.game);
  } else if (ui.tab === 'cultivation') {
    body = renderCultivationView(ui.game, goal);
  } else if (ui.tab === 'aperture') {
    body = renderApertureView(ui.game);
  } else if (ui.tab === 'refine') {
    body = renderRefineView(ui.game);
  } else {
    body = renderBagView(ui.game, ui.tab);
  }

  const navButtons = [
    ['place', '地图'], ['cultivation', '修行'], ['aperture', '空窍'],
    ['refine', '炼蛊'], ['bag', '行囊'], ['journal', '行纪']
  ].map(([id, label]) => `<button class="${ui.tab === id ? 'on' : ''}" data-action="navTab" data-tab="${id}">${label}</button>`).join('');

  app.innerHTML = `<div class="shell">
    ${renderTopBar(goal)}
    <main class="main">${body}</main>
    <nav class="nav">${navButtons}</nav>
  </div>`;
  renderModal(ui);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button) handleAction(ui, button, { render, showToast });
});

restoreSessions(ui, showToast);
render();
startGameLoop(ui, render);
