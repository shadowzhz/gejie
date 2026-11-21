import { GU_DEFS, ITEMS, REFINE_RECIPES } from '../data/gu.js';
import { hasPlaceActions } from '../data/places.js';
import { formatDateTime, MIN_PER_DAY, MIN_PER_MONTH, MIN_PER_SHICHEN } from '../core/calendar.js';
import { addGu, addItem, addLog, createAptitude, createNewGame, feedGu, handleQuest, loadGame, purchaseShopEntry, RANK_NAMES, realmText, recalcStats, refineBenming, saveGame, useHealItem, useHealingGu, useBoarGu, XIAO_NAMES } from '../core/state.js';
import { createKillerMove, discoveredKillerPatterns, forgetKillerMove, recordGuUsage } from '../core/killer.js';
import { battleAct } from '../core/combat.js';
import { applyEventChoice, checkStoryTriggers, finishStoryBattle, lookForLifeScene } from '../core/story-engine.js';
import { advanceMinutes, moveToPlace, rewindSpringCicada, saveSpringSnapshot } from '../core/clock.js';
import { createRefineSession, knowsRefineRecipe, purchaseRecipe, stepRefineSession } from '../core/refine.js';
import { createBreakSession, stepBreakSession, useSheli, washMinorWall } from '../core/breakthrough.js';
import { performPlaceAction } from '../core/place-actions.js';
import { dismissModal, setModal } from './modal-controller.js';
import { importProgress, resetProgress, restoreSessions } from './persistence.js';

export function createStartState() {
  return { phase: 'intro', name: '方源', apt: null, step: 0, target: 25, done: false, hasSave: false };
}

function handlePlaceAction(ui, id, { openModal, render, showToast }) {
  const result = performPlaceAction(ui.game, id);
  if (!result?.ok) {
    if (result?.reason) showToast(result.reason);
    return;
  }
  if (result.won) openModal('win', {});
  if (result.message) showToast(result.message);
  saveGame(ui.game);
  render();
}

function handleDeveloperAction(ui, action, { render, showToast }) {
  if (!ui.game?.developerMode || ui.modal?.kind !== 'developer') return;
  const p = ui.game.player;
  const durations = { hours: MIN_PER_SHICHEN, day: MIN_PER_DAY, month: MIN_PER_MONTH };
  let message;
  if (action === 'stones') {
    p.yuanshi += 1000;
    message = '元石 +1000';
  } else if (action === 'restore') {
    p.hp = p.hpMax;
    p.zy = p.zyMax;
    message = '气血与真元已回满';
  } else if (action === 'recipes') {
    p.recipes = [...new Set([...p.recipes, ...REFINE_RECIPES.map((recipe) => recipe.id)])];
    message = '已习得全部蛊方';
  } else if (action === 'gu') {
    const id = document.getElementById('dev-gu')?.value;
    if (!Object.hasOwn(GU_DEFS, id)) return;
    addGu(ui.game, id);
    message = `已获得「${GU_DEFS[id].name}」×1`;
  } else if (action === 'item') {
    const id = document.getElementById('dev-item')?.value;
    if (!Object.hasOwn(ITEMS, id)) return;
    addItem(ui.game, id, 20);
    message = `已获得「${ITEMS[id].name}」×20`;
  } else if (action === 'realm') {
    const rank = Number(document.getElementById('dev-rank')?.value);
    const stage = Number(document.getElementById('dev-stage')?.value);
    if (!RANK_NAMES[rank] || !XIAO_NAMES[stage]) return;
    p.rank = rank;
    p.xiao = stage;
    p.xp = 0;
    if (rank >= 2) ui.game.flags['open:jiazhuge'] = true;
    recalcStats(ui.game);
    message = `境界已设为${realmText(p)}`;
  } else if (Object.hasOwn(durations, action) && !ui.game.battle && !p.dead) {
    advanceMinutes(ui.game, durations[action]);
    message = `时间已推进至${formatDateTime(ui.game.minutes)}`;
  } else {
    return;
  }
  addLog(ui.game, `【开发者】${message}。`);
  saveGame(ui.game);
  if (action === 'gu' || action === 'item') {
    const select = document.getElementById(`dev-${action}`);
    const value = select.value;
    render();
    document.getElementById(`dev-${action}`).value = value;
  } else {
    render();
  }
  showToast(message);
}

export function handleAction(ui, el, { render, showToast }) {
  const act = el.dataset.action;
  if (!act) return;
  if (ui.game?.pendingEventId && (!ui.modal || ui.modal.kind === 'place') && !ui.game.battle
    && act !== 'chooseEvent' && act !== 'togglePause') return;
  if (ui.game?.breakthrough && act !== 'breakAct') return;
  if (ui.modal?.kind === 'refine' && act !== 'refineAct' && act !== 'closeModal') return;
  const id = el.dataset.id || '';
  const openModal = (kind, data) => { setModal(ui, kind, data); render(); };
  const closeModal = () => { if (dismissModal(ui)) render(); };

  if (act === 'startKaiqiao') {
    const input = document.getElementById('startName');
    ui.start.name = (input?.value || '').trim() || '方源';
    ui.start.apt = createAptitude();
    ui.start.step = 0;
    ui.start.target = Math.max(10, Math.min(48, Math.round(ui.start.apt.hai * 5)));
    ui.start.done = false;
    ui.start.phase = 'kaiqiao';
    render();
  } else if (act === 'kaiqiaoStep') {
    ui.start.step = Math.min(ui.start.target, ui.start.step + 5);
    if (ui.start.step >= ui.start.target) ui.start.done = true;
    render();
  } else if (act === 'kaiqiaoSkip') {
    ui.start.step = ui.start.target;
    ui.start.done = true;
    render();
  } else if (act === 'kaiqiaoFinish') {
    ui.game = createNewGame(ui.start.name, ui.start.apt);
    ui.start.phase = 'intro';
    ui.tab = 'cultivation';
    saveGame(ui.game);
    render();
  } else if (act === 'continueSave') {
    ui.game = loadGame();
    if (!ui.game) { showToast('未找到可用存档'); return; }
    ui.tab = 'place';
    restoreSessions(ui, showToast);
    render();
  } else if (act === 'navTab') {
    if (ui.modal?.kind === 'place') ui.modal = null;
    ui.tab = el.dataset.tab || 'place';
    render();
  } else if (act === 'togglePause') {
    ui.game.paused = !ui.game.paused;
    render();
  } else if (act === 'toggleDeveloper') {
    if (!ui.game) return;
    ui.game.developerMode = !ui.game.developerMode;
    ui.modal = ui.game.developerMode ? { kind: 'developer' } : null;
    saveGame(ui.game);
    render();
  } else if (act === 'openDeveloper') {
    if (ui.game?.developerMode && !ui.modal) openModal('developer');
  } else if (act === 'devAction') {
    handleDeveloperAction(ui, id, { render, showToast });
  } else if (act === 'walkTo') {
    const res = moveToPlace(ui.game, id);
    if (!res.ok) showToast(res.reason);
    else if (ui.game.location === id) {
      ui.tab = 'place';
      ui.modal = hasPlaceActions(ui.game) ? { kind: 'place' } : null;
      const sheet = document.getElementById('sheet');
      if (sheet) sheet.scrollTop = 0;
    }
    saveGame(ui.game);
    render();
  } else if (act === 'openPlace') {
    if (ui.game && !ui.game.battle && !ui.game.player.dead && hasPlaceActions(ui.game)) {
      ui.tab = 'place';
      openModal('place');
    }
  } else if (act === 'placeAct') {
    handlePlaceAction(ui, id, { openModal, render, showToast });
  } else if (act === 'quest') {
    handleQuest(ui.game, id);
    saveGame(ui.game);
    render();
  } else if (act === 'buyRecipe') {
    const message = purchaseRecipe(ui.game, id);
    if (!message) return;
    saveGame(ui.game);
    render();
    showToast(message);
  } else if (act === 'buyItem') {
    const input = el.closest('.shop-purchase')?.querySelector('input[type="number"]');
    const result = purchaseShopEntry(ui.game, id, input?.valueAsNumber ?? 1);
    if (!result.ok) { showToast(result.reason); return; }
    saveGame(ui.game);
    render();
    showToast(result.message);
  } else if (act === 'lookForLifeScene' && ui.modal?.kind === 'place') {
    const { message } = lookForLifeScene(ui.game);
    saveGame(ui.game);
    if (message) showToast(message);
    render();
  } else if (act === 'checkEvents') {
    if (!checkStoryTriggers(ui.game, id)) return;
    saveGame(ui.game);
    render();
  } else if (act === 'refineBenming') {
    const res = refineBenming(ui.game);
    if (!res.ok) { showToast(res.reason); return; }
    ui.tab = 'cultivation';
    saveGame(ui.game);
    render();
  } else if (act === 'chooseEvent') {
    applyEventChoice(ui.game, id, Number(el.dataset.idx) || 0);
    checkStoryTriggers(ui.game);
    saveGame(ui.game);
    render();
  } else if (act === 'washMinor') {
    const res = washMinorWall(ui.game);
    showToast(res.ok ? res.message : res.reason);
    saveGame(ui.game);
    render();
  } else if (act === 'openBreak') {
    if (ui.game.breakthrough || ui.game.refining || ui.game.battle || ui.game.player.dead) return;
    const sess = createBreakSession(ui.game);
    if (sess.error) { showToast(sess.error); return; }
    ui.game.breakthrough = sess;
    if (!saveGame(ui.game)) showToast('破壁进度保存失败，请检查本地存储。');
    openModal('break', sess);
  } else if (act === 'breakAct' && ui.modal?.kind === 'break' && ui.game.breakthrough) {
    stepBreakSession(ui.game, ui.game.breakthrough, id);
    if (!saveGame(ui.game)) showToast('破壁进度保存失败，请检查本地存储。');
    render();
  } else if (act === 'startRefine') {
    if (ui.game.refining || ui.game.battle || ui.game.player.dead) return;
    const recipe = REFINE_RECIPES.find((entry) => entry.id === id);
    if (!recipe || !knowsRefineRecipe(ui.game, recipe)) return;
    const sess = createRefineSession(ui.game, id);
    if (sess.error) { openModal('refineInfo', { recipe, reason: sess.error }); return; }
    ui.game.refining = sess;
    if (!saveGame(ui.game)) showToast('炼蛊进度保存失败，请检查本地存储。');
    openModal('refine', sess);
  } else if (act === 'refineAct' && ui.modal?.kind === 'refine') {
    const sess = ui.modal.data;
    const { state, turns } = sess;
    const pending = sess.pending.length;
    const track = el.closest('.refine-ritual')?.querySelector('.refine-timing');
    let timing;
    if (track) {
      const { left, width } = track.getBoundingClientRect();
      const marker = track.firstElementChild.getBoundingClientRect();
      if (width) timing = Math.max(0, Math.min(1, (marker.left + marker.width / 2 - left) / width));
    }
    stepRefineSession(ui.game, sess, id, Math.random, timing);
    if (state === sess.state && turns === sess.turns && pending === sess.pending.length) return;
    ui.modal.effect = { action: id.split(':')[0], input: el.dataset.input };
    if (!saveGame(ui.game)) showToast('炼蛊进度保存失败，请检查本地存储。');
    render();
  } else if (act === 'openCustomKiller') {
    if (!ui.game.battle && discoveredKillerPatterns(ui.game.player).length) openModal('killer');
  } else if (act === 'kmCreate' && ui.modal?.kind === 'killer') {
    const nm = document.getElementById('kmName')?.value || '';
    const res = createKillerMove(ui.game, id, nm);
    if (!res.ok) { showToast(res.reason); return; }
    saveGame(ui.game);
    closeModal();
    showToast(`推演成功：「${res.move.name}」`);
  } else if (act === 'forgetKiller') {
    const move = forgetKillerMove(ui.game, id);
    if (!move) return;
    saveGame(ui.game);
    render();
    showToast(`已删除「${move.name}」`);
  } else if (act === 'toggleAutoFeed') {
    ui.game.player.autoFeed = !ui.game.player.autoFeed;
    if (ui.game.player.autoFeed) {
      for (const gu of ui.game.player.gu) feedGu(ui.game, gu, 51);
    }
    saveGame(ui.game);
    render();
  } else if (act === 'feedGu' || act === 'feedAll') {
    if (act === 'feedGu') {
      if (!feedGu(ui.game, ui.game.player.gu.find((g) => String(g.uid) === id))) return;
    } else {
      const fed = ui.game.player.gu.filter((g) => feedGu(ui.game, g, 85)).length;
      showToast(fed ? `已喂养 ${fed} 只蛊虫` : '无需喂养或口粮不足');
    }
    saveGame(ui.game);
    render();
  } else if (act === 'toggleEquip') {
    const uid = Number(id);
    const i = ui.game.player.equipped.indexOf(uid);
    if (i >= 0) ui.game.player.equipped.splice(i, 1);
    else if (ui.game.player.equipped.length < 6) ui.game.player.equipped.push(uid);
    else showToast('至多同时出战 6 只蛊');
    saveGame(ui.game);
    render();
  } else if (act === 'useHealingGu') {
    const uid = Number(id);
    if (!useHealingGu(ui.game, uid)) {
      showToast(ui.game.player.hp >= ui.game.player.hpMax ? '气血已满' : '无法催动治疗蛊，请检查真元');
      return;
    }
    recordGuUsage(ui.game, [ui.game.player.gu.find((gu) => gu.uid === uid).id]);
    saveGame(ui.game);
    render();
  } else if (act === 'useBoarGu') {
    if (!useBoarGu(ui.game, Number(id))) return;
    saveGame(ui.game);
    render();
  } else if (act === 'useSheli') {
    const result = useSheli(ui.game, Number(id));
    if (result.message || result.reason) showToast(result.message || result.reason);
    if (!result.ok) return;
    saveGame(ui.game);
    render();
  } else if (act === 'useHealItem') {
    const result = useHealItem(ui.game, id);
    if (!result.ok) {
      if (result.reason) showToast(result.reason);
      return;
    }
    saveGame(ui.game);
    render();
  } else if (act === 'battleAct') {
    battleAct(ui.game, el.dataset.kind, id);
    saveGame(ui.game);
    render();
  } else if (act === 'finishBattle') {
    const foe = ui.game.battle?.foe.id;
    if (!finishStoryBattle(ui.game)) return;
    if (ui.game.player.dead) setModal(ui, 'dead', {});
    else if (!ui.game.pendingEventId && ui.game.location === 'zhulin' && ['yezhu', 'zhuwang'].includes(foe)) {
      ui.tab = 'place';
      setModal(ui, 'place');
    }
    saveGame(ui.game);
    render();
  } else if (act === 'saveCicada') {
    const res = saveSpringSnapshot(ui.game);
    showToast(res.ok ? '已留下春秋蝉旧影' : res.reason);
    saveGame(ui.game);
    render();
  } else if (act === 'rewindCicada') {
    const res = rewindSpringCicada(ui.game);
    if (!res.ok) { showToast(res.reason); return; }
    ui.game = res.state;
    restoreSessions(ui, showToast, true);
    render();
  } else if (act === 'manualSave') {
    showToast(saveGame(ui.game) ? '进度已保存' : '保存失败，请检查本地存储。');
  } else if (act === 'exportSave') {
    const text = JSON.stringify(ui.game, null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast('存档 JSON 已复制到剪贴板'));
    else showToast('请从控制台查看存档');
  } else if (act === 'openImport') {
    openModal('import', {});
  } else if (act === 'doImportSave') {
    const raw = document.getElementById('importJson')?.value?.trim();
    if (!raw) { showToast('请先粘贴存档 JSON'); return; }
    try {
      ui.game = importProgress(raw);
      const warned = restoreSessions(ui, showToast, true);
      render();
      if (!warned) showToast('存档已导入');
    } catch {
      showToast('存档格式无效，导入失败');
    }
  } else if (act === 'resetGame') {
    resetProgress();
    ui.game = null;
    ui.modal = null;
    ui.start = createStartState();
    render();
  } else if (act === 'closeModal') {
    closeModal();
  }
}
