import { restoreStoryProgress } from '../core/story-progress.js';
import { PLACES } from '../data/places.js';
import { addLog, recalcStats, saveGame, SAVE_KEY } from '../core/state.js';
import { restoreRefineSession } from '../core/refine.js';
import { validBreakSession } from '../core/breakthrough.js';

export function clearRefineProgress(gs) {
  delete gs.refining;
  saveGame(gs);
}

export function restoreSessions(ui, showToast, save = false) {
  if (!ui.game) return;
  ui.modal = null;
  const notices = [];
  if (Object.hasOwn(ui.game, 'breakthrough')) {
    if (validBreakSession(ui.game, ui.game.breakthrough)) {
      ui.tab = 'aperture';
      ui.modal = { kind: 'break', data: ui.game.breakthrough };
    } else {
      delete ui.game.breakthrough;
      notices.push('破壁会话无法恢复，已退出冲关。');
      save = true;
    }
  }
  if (Object.hasOwn(ui.game, 'refining')) {
    const sess = !ui.game.breakthrough && restoreRefineSession(ui.game, ui.game.refining);
    if (sess) {
      save ||= ui.game.refining.version !== sess.version;
      ui.game.refining = sess;
      ui.tab = 'refine';
      ui.modal = { kind: 'refine', data: sess };
    } else {
      delete ui.game.refining;
      notices.push('炼蛊会话无法恢复，已安全停炉，蛊虫保留。已扣除的元石和辅材按存档保留原结算。');
      save = true;
    }
  }
  for (const notice of notices) addLog(ui.game, `【会话恢复】${notice}`, 'log-warn');
  if (save && !saveGame(ui.game)) notices.push('保存失败，请检查本地存储。');
  if (notices.length) showToast(notices.join(' '));
  return notices.length > 0;
}

export function importProgress(raw) {
  const parsed = JSON.parse(raw);
  if (!parsed?.player || !Array.isArray(parsed.player.gu)) throw new Error('Invalid save');
  if (!PLACES[parsed.location]) parsed.location = 'shijie';
  restoreStoryProgress(parsed);
  restoreStoryProgress(parsed.snapshot);
  recalcStats(parsed);
  return parsed;
}

export function resetProgress() {
  globalThis.localStorage?.removeItem(SAVE_KEY);
}
