import { performPlaceAction } from '../core/place-actions.js';
import { mainGrowthGoal } from '../core/growth-guide.js';
import { formatDateTime, isNight, MIN_PER_DAY, MIN_PER_KE, MIN_PER_SHICHEN } from '../core/calendar.js';
import { minorXpNeed, saveGame } from '../core/state.js';
import { nextRealmRequirements } from '../core/breakthrough.js';
import { advanceMinutes } from '../core/clock.js';
import { setModal } from './modal-controller.js';

function updateLiveDisplay(ui) {
  const p = ui.game.player;
  const need = minorXpNeed(p);
  const next = ui.tab === 'cultivation' ? nextRealmRequirements(p) : null;
  const labels = {
    'cultivation-xp': `${Math.floor(p.xp)} / ${next?.xp}`,
    'cultivation-zy': `${Math.floor(p.zy)} / ${next?.zy}`,
    clock: formatDateTime(ui.game.minutes),
    hp: `${Math.round(p.hp)}/${p.hpMax}`,
    zy: `${Math.round(p.zy)}/${p.zyMax}`,
    xp: `修为 ${Math.floor(p.xp)} / ${need}`
  };
  const bars = {
    'hp-bar': p.hp / Math.max(1, p.hpMax),
    'zy-bar': p.zy / Math.max(1, p.zyMax),
    'xp-bar': need ? p.xp / need : 1
  };
  for (const node of document.querySelectorAll('[data-live]')) {
    const key = node.dataset.live;
    if (Object.hasOwn(labels, key) && node.textContent !== labels[key]) node.textContent = labels[key];
    if (Object.hasOwn(bars, key)) node.style.width = `${Math.min(100, Math.round(bars[key] * 100))}%`;
  }
  document.querySelector('.map-canvas')?.classList.toggle('is-night', isNight(ui.game.minutes));
}

export const FIELD_GATHER_TICKS = MIN_PER_SHICHEN / MIN_PER_KE;

export function tickFieldGather(ui) {
  if (ui.modal?.kind !== 'expedition' || !ui.modal.data.gathering) return false;
  const gs = ui.game;
  const session = ui.modal.data;
  if (session.location !== gs.location || gs.pendingEventId || gs.battle || gs.player.dead) {
    ui.modal = null;
    return true;
  }
  if (--session.ticks > 0) return false;
  const result = performPlaceAction(gs, session.action ?? 'gather');
  if (result?.item) {
    session.items[result.item] = (session.items[result.item] ?? 0) + result.count;
    session.ticks = FIELD_GATHER_TICKS;
  } else {
    ui.modal = null;
  }
  saveGame(gs);
  return true;
}

// 轻实时时间流：现实 1 秒 = 游戏 1 刻 (15 分钟)
export function startGameLoop(ui, render) {
  return setInterval(() => {
    if (ui.modal?.kind === 'expedition' && ui.modal.data.gathering) {
      if (tickFieldGather(ui)) render();
      else {
        const countdown = document.querySelector('[data-gather-ticks]');
        if (countdown) countdown.textContent = ui.modal.data.ticks;
      }
      return;
    }
    if (!ui.game || ui.game.paused || ui.game.player.dead || ui.game.battle || ui.game.pendingEventId || ui.modal) return;
    const day = Math.floor(ui.game.minutes / MIN_PER_DAY);
    const hallOpen = ui.game.flags['open:jiazhuge'];
    const goal = mainGrowthGoal(ui.game).text;
    advanceMinutes(ui.game, 15);
    const goalChanged = goal !== mainGrowthGoal(ui.game).text;
    if (ui.game.pendingEventId) saveGame(ui.game);
    if (ui.game.player.dead) {
      setModal(ui, 'dead', {});
      render();
    } else if (ui.game.battle || ui.game.pendingEventId || day !== Math.floor(ui.game.minutes / MIN_PER_DAY)
      || goalChanged || hallOpen !== ui.game.flags['open:jiazhuge']) render();
    else updateLiveDisplay(ui);
  }, 1000);
}
