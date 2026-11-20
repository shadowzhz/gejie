import { GU_DEFS, ITEMS, REFINE_RECIPES, recipeOutputText } from '../data/gu.js';
import { hasPlaceActions, PLACES } from '../data/places.js';
import { formatDateTime, isNight, MIN_PER_DAY, MIN_PER_MONTH, MIN_PER_SHICHEN } from '../core/calendar.js';
import { addGu, addItem, addLog, claimBenming, createAptitude, createNewGame, esc, feedGu, handleQuest, loadGame, minorXpNeed, purchaseShopEntry, RANK_NAMES, realmText, recalcStats, recordQuestProgress, refineBenming, saveGame, useHealItem, useHealingGu, useBoarGu, XIAO_NAMES } from '../core/state.js';
import { createKillerMove, discoveredKillerPatterns, forgetKillerMove, recordGuUsage } from '../core/killer.js';
import { battleAct, startBattle } from '../core/combat.js';
import { applyEventChoice, checkStoryTriggers } from '../core/story-engine.js';
import { advanceMinutes, moveToPlace, rewindSpringCicada, saveSpringSnapshot } from '../core/clock.js';
import { createRefineSession, isRecipeSold, stepRefineSession } from '../core/refine.js';
import { createBreakSession, realmGrowthText, realmGuRequirement, stepBreakSession, washMinorWall } from '../core/breakthrough.js';
import { renderBreakModal, renderCustomKillerModal, renderEventModal, renderRefineModal, renderStartScreen } from './rituals.js';
import { renderBattleView } from './battle-view.js';
import { renderPlaceView } from './place-view.js';
import { renderMapPanel } from './map-view.js';
import { renderApertureView } from './aperture-view.js';
import { renderRefineView } from './refine-view.js';
import { renderBagView, renderDeveloperView } from './bag-view.js';

let G = null;
let TAB = 'place';
let MODAL = null; // { kind: 'place'|'break'|'refine'|'killer'|'developer'|'dead'|'win', data: ... }
let START = { phase: 'intro', name: '方源', apt: null, step: 0, target: 25, done: false, hasSave: false };

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function openModal(kind, data) {
  MODAL = { kind, data };
  render();
}

function closeModal() {
  if (MODAL?.kind === 'refine') {
    if (G.refining?.state === 'ongoing') return;
    delete G.refining;
    saveGame(G);
  }
  MODAL = null;
  render();
}

function restoreRefining() {
  if (!G?.refining) return;
  if (!Array.isArray(G.refining.pending)) {
    delete G.refining;
    addLog(G, '【停炉】炼蛊流程已更新，旧炉次已结束。');
    saveGame(G);
    TAB = 'refine';
    return;
  }
  TAB = 'refine';
  MODAL = { kind: 'refine', data: G.refining };
}

function renderTopBar() {
  const p = G.player;
  const hpPct = Math.round(p.hp / Math.max(1, p.hpMax) * 100);
  const zyPct = Math.round(p.zy / Math.max(1, p.zyMax) * 100);
  const placeName = PLACES[G.location]?.name || '青茅山';
  return `<header class="topbar">
    <div class="top-row">
      <div class="top-id">
        <strong>${esc(p.name)}</strong>
        <span class="badge gold">${esc(realmText(p))}</span>
        <span class="badge">${esc(placeName)}</span>
      </div>
      <div class="clock-box">
        <span data-live="clock">${esc(formatDateTime(G.minutes))}</span>
        ${G.developerMode ? '<button class="sm gold" data-action="openDeveloper">开发者</button>' : ''}
        <button class="sm ghost" data-action="togglePause">${G.paused ? '▶ 继续流逝' : '⏸ 暂停'}</button>
      </div>
    </div>
    <div class="goal-bar"><b>当下目标：</b>${esc(G.goal)}</div>
    <div class="res-row">
      <div class="res-item"><div class="res-head"><span>气血${G.battle?.meShield ? ` · 护盾 ${G.battle.meShield}` : ''}</span><span data-live="hp">${Math.round(p.hp)}/${p.hpMax}</span></div><div class="bar hp"><i data-live="hp-bar" style="width:${hpPct}%"></i></div></div>
      <div class="res-item"><div class="res-head"><span>真元</span><span data-live="zy">${Math.round(p.zy)}/${p.zyMax}</span></div><div class="bar zy"><i data-live="zy-bar" style="width:${zyPct}%"></i></div></div>
      <div class="res-item"><div class="res-head"><span>元石</span><span>${p.yuanshi}</span></div><div class="muted" style="font-size:.75rem">${p.mo >= 30 ? `恶名 ${p.mo}` : `${p.grade}等资质`}</div></div>
    </div>
  </header>`;
}

function renderModal() {
  const modalEl = document.getElementById('modal');
  const sheetEl = document.getElementById('sheet');
  if (!modalEl || !sheetEl) return;

  if (MODAL?.kind === 'place' && (G.battle || G.player.dead)) MODAL = null;
  const placeShown = MODAL?.kind === 'place' && !G.pendingEventId;
  const refineShown = MODAL?.kind === 'refine';
  const activeRefineButton = refineShown && sheetEl.contains(document.activeElement) ? document.activeElement : null;
  const samePlaceSheet = sheetEl.classList.contains('place-sheet');
  const keepScroll = (placeShown && samePlaceSheet) || (refineShown
    && sheetEl.classList.contains('refine-sheet') && MODAL.data.state === 'ongoing' && MODAL.effect?.action !== 'ignite');
  const scrollTop = keepScroll ? sheetEl.scrollTop : 0;
  sheetEl.classList.toggle('place-sheet', placeShown);
  sheetEl.classList.toggle('refine-sheet', refineShown);
  if (placeShown || refineShown) sheetEl.setAttribute('aria-labelledby', placeShown ? 'place-title' : 'refine-title');
  else sheetEl.removeAttribute('aria-labelledby');

  if (G && G.pendingEventId && !G.battle && (!MODAL || MODAL.kind === 'place')) {
    sheetEl.innerHTML = renderEventModal(G.pendingEventId);
    modalEl.hidden = false;
    return;
  }
  if (!MODAL) {
    modalEl.hidden = true;
    sheetEl.innerHTML = '';
    return;
  }
  let html = '';
  if (MODAL.kind === 'place') {
    html = `<div class="place-sheet-controls"><button class="sm" data-action="closeModal">返回地图</button></div>${renderPlaceView(G)}`;
  } else if (MODAL.kind === 'break') html = renderBreakModal(MODAL.data);
  else if (refineShown) {
    html = renderRefineModal(MODAL.data, MODAL.effect);
    delete MODAL.effect;
  }
  else if (MODAL.kind === 'killer') html = renderCustomKillerModal(G);
  else if (MODAL.kind === 'developer') html = renderDeveloperView(G);
  else if (MODAL.kind === 'dead') {
    html = `<h2>身殒青茅山</h2>
      <p>你的修行止步于${esc(realmText(G.player))}。</p>
      <div class="row">
        ${G.snapshot ? '<button class="gold" data-action="rewindCicada">催动春秋蝉回到旧影</button>' : ''}
        <button class="blood" data-action="resetGame">重开一世</button>
      </div>`;
  } else if (MODAL.kind === 'win') {
    html = `<h2>走出青茅山 · 卷一圆满</h2>
      <p>血海翻涌、仙鹤坠落，你在两位三转强者的死斗边缘活了下来，终于踏出十万大山，走向五域天地！</p>
      <div class="card">
        <div class="kv"><span>最终境界</span><b>${esc(realmText(G.player))}</b></div>
        <div class="kv"><span>持有蛊虫</span><b>${G.player.gu.length} 只</b></div>
        <div class="kv"><span>剩余元石</span><b>${G.player.yuanshi}</b></div>
      </div>
      <div class="row">
        <button class="primary" data-action="closeModal">继续游历青茅余烬</button>
        <button class="gold" data-action="resetGame">再开新的一世</button>
      </div>`;
  }
  sheetEl.innerHTML = html;
  modalEl.hidden = false;
  sheetEl.scrollTop = scrollTop;
  if (placeShown && !samePlaceSheet) sheetEl.querySelector('[data-action="closeModal"]').focus();
  if (refineShown) {
    const buttons = [...sheetEl.querySelectorAll('button:not(:disabled)')];
    const next = activeRefineButton && buttons.find(({ dataset }) =>
      dataset.action === activeRefineButton.dataset.action && dataset.id === activeRefineButton.dataset.id);
    (next || buttons[0])?.focus({ preventScroll: true });
  }
}

export function render() {
  const app = document.getElementById('app');
  if (!app) return;
  if (!G) {
    START.hasSave = !!loadGame();
    app.innerHTML = renderStartScreen(START);
    renderModal();
    return;
  }

  let body = '';
  if (G.battle) {
    body = renderBattleView(G);
  } else if (TAB === 'place') {
    body = renderMapPanel(G);
  } else if (TAB === 'aperture') {
    body = renderApertureView(G);
  } else if (TAB === 'refine') {
    body = renderRefineView(G);
  } else {
    body = renderBagView(G, TAB);
  }

  const navButtons = [
    ['place', '地图'], ['aperture', '空窍'],
    ['refine', '炼蛊'], ['bag', '行囊'], ['journal', '行纪']
  ].map(([id, label]) => `<button class="${TAB === id ? 'on' : ''}" data-action="navTab" data-tab="${id}">${label}</button>`).join('');

  app.innerHTML = `<div class="shell">
    ${renderTopBar()}
    <main class="main">${body}</main>
    <nav class="nav">${navButtons}</nav>
  </div>`;
  renderModal();
}

function handlePlaceAction(id) {
  const p = G.player;
  if (id === 'meditate') { advanceMinutes(G, 120); addLog(G, '你盘膝打坐一个时辰，吐纳天地灵气。'); }
  else if (id === 'rest') { advanceMinutes(G, 480); addLog(G, '你在竹楼安歇四个时辰，精神恢复了不少。'); }
  else if (id === 'pickBenming') {
    claimBenming(G);
  } else if (id === 'caoren') {
    advanceMinutes(G, 30);
    G.flags['practiced'] = true;
    startBattle(G, 'caoren', '演武场练手');
  } else if (id === 'sparring') {
    advanceMinutes(G, 60);
    startBattle(G, 'fangzheng', '同窗切磋');
  } else if (id === 'docHeal') {
    if (p.yuanshi < 10) { showToast('元石不足 10 块'); return; }
    p.yuanshi -= 10;
    p.hp = p.hpMax;
    addLog(G, '你在药堂敷药调理，气血已然回满。', 'log-good');
  } else if (id === 'rumor') {
    if (p.yuanshi < 12) { showToast('元石不足 12 块'); return; }
    p.yuanshi -= 12;
    advanceMinutes(G, 30);
    if (!G.flags['clue:huajiu']) {
      G.flags['clue:huajiu'] = true;
      addLog(G, '【密闻】酒客低声提起：血蝠洞下游瀑布后，藏着花酒行者的暗涧遗洞。', 'log-gold');
    } else {
      addLog(G, '【传闻】听说山外狼群正在集结，明年夏天怕是要闹狼潮。');
    }
  } else if (id === 'clanGift') {
    if (!G.flags['clan_gift_r2']) {
      G.flags['clan_gift_r2'] = true;
      p.yuanshi += 40;
      addGu(G, 'qingtong_sheli');
      addGu(G, 'yupi');
      addLog(G, '【家族赏赐】族长嘉许你晋入二转，赏元石 40、青铜舍利蛊和玉皮蛊各 1 只！', 'log-gold');
    } else {
      showToast('族中近来暂无新赏格');
      return;
    }
  } else if (id === 'exploreFight') {
    const place = PLACES[G.location];
    advanceMinutes(G, 60);
    if (!G.battle && place.exploreEnemy) startBattle(G, place.exploreEnemy, `${place.name}遭遇`);
  } else if (id === 'exploreBoss') {
    const place = PLACES[G.location];
    advanceMinutes(G, 60);
    if (!G.battle && place.bossEnemy) startBattle(G, place.bossEnemy, `讨伐${place.name}`);
  } else if (id === 'gather') {
    advanceMinutes(G, 120);
    const pool = ['yuelanhua', 'shourou', 'fengmi', 'kuangshi', 'yuanshi_zha'];
    const got = pool[Math.floor(Math.random() * pool.length)];
    addItem(G, got, 2);
    recordQuestProgress(G, 'gather', G.location);
    const message = `采集完成，获得「${ITEMS[got].name}」×2`;
    addLog(G, `${message}。`, 'log-good');
    showToast(message);
  } else if (id === 'huajiuLoot') {
    if (G.flags['looted:huajiu']) { showToast('遗洞宝藏已被你取空'); return; }
    G.flags['looted:huajiu'] = true;
    advanceMinutes(G, 60);
    p.yuanshi += 45;
    addGu(G, 'jiuchong', 100);
    addGu(G, 'baishi');
    addGu(G, 'yupi');
    addGu(G, 'chunqiuchan', 100);
    addItem(G, 'qingzhujiu', 5);
    addLog(G, '【遗洞奇遇】你从花酒遗藏中取得酒虫、白豕蛊、玉皮蛊与 45 元石。', 'log-gold');
    addLog(G, '【遗洞奇遇】你还发现一只气息微弱的「春秋蝉（残）」。', 'log-gold');
  } else if (id === 'escapeMountain') {
    p.escapedMountain = true;
    openModal('win', {});
  }
  saveGame(G);
  render();
}

function handleDeveloperAction(action) {
  if (!G?.developerMode || MODAL?.kind !== 'developer') return;
  const p = G.player;
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
    addGu(G, id);
    message = `已获得「${GU_DEFS[id].name}」×1`;
  } else if (action === 'item') {
    const id = document.getElementById('dev-item')?.value;
    if (!Object.hasOwn(ITEMS, id)) return;
    addItem(G, id, 20);
    message = `已获得「${ITEMS[id].name}」×20`;
  } else if (action === 'realm') {
    const rank = Number(document.getElementById('dev-rank')?.value);
    const stage = Number(document.getElementById('dev-stage')?.value);
    if (!RANK_NAMES[rank] || !XIAO_NAMES[stage]) return;
    p.rank = rank;
    p.xiao = stage;
    p.xp = 0;
    if (rank >= 2) G.flags['open:jiazhuge'] = true;
    recalcStats(G);
    message = `境界已设为${realmText(p)}`;
  } else if (Object.hasOwn(durations, action) && !G.battle && !p.dead) {
    advanceMinutes(G, durations[action]);
    message = `时间已推进至${formatDateTime(G.minutes)}`;
  } else {
    return;
  }
  addLog(G, `【开发者】${message}。`);
  saveGame(G);
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

function handleAction(el) {
  const act = el.dataset.action;
  if (!act) return;
  const id = el.dataset.id || '';

  if (act === 'startKaiqiao') {
    const input = document.getElementById('startName');
    START.name = (input?.value || '').trim() || '方源';
    START.apt = createAptitude();
    START.step = 0;
    START.target = Math.max(10, Math.min(48, Math.round(START.apt.hai * 5)));
    START.done = false;
    START.phase = 'kaiqiao';
    render();
  } else if (act === 'kaiqiaoStep') {
    START.step = Math.min(START.target, START.step + 5);
    if (START.step >= START.target) START.done = true;
    render();
  } else if (act === 'kaiqiaoSkip') {
    START.step = START.target;
    START.done = true;
    render();
  } else if (act === 'kaiqiaoFinish') {
    G = createNewGame(START.name, START.apt);
    START.phase = 'intro';
    TAB = 'place';
    saveGame(G);
    render();
  } else if (act === 'continueSave') {
    G = loadGame();
    if (!G) { showToast('未找到可用存档'); return; }
    TAB = 'place';
    restoreRefining();
    render();
  } else if (act === 'navTab') {
    if (MODAL?.kind === 'place') MODAL = null;
    TAB = el.dataset.tab || 'place';
    render();
  } else if (act === 'togglePause') {
    G.paused = !G.paused;
    render();
  } else if (act === 'toggleDeveloper') {
    if (!G) return;
    G.developerMode = !G.developerMode;
    MODAL = G.developerMode ? { kind: 'developer' } : null;
    saveGame(G);
    render();
  } else if (act === 'openDeveloper') {
    if (G?.developerMode && !MODAL) openModal('developer');
  } else if (act === 'devAction') {
    handleDeveloperAction(id);
  } else if (act === 'walkTo') {
    const res = moveToPlace(G, id);
    if (!res.ok) showToast(res.reason);
    else if (G.location === id) {
      MODAL = hasPlaceActions(G) ? { kind: 'place' } : null;
      const sheet = document.getElementById('sheet');
      if (sheet) sheet.scrollTop = 0;
    }
    saveGame(G);
    render();
  } else if (act === 'openPlace') {
    if (G && !G.battle && !G.player.dead && hasPlaceActions(G)) openModal('place');
  } else if (act === 'placeAct') {
    handlePlaceAction(id);
  } else if (act === 'quest') {
    handleQuest(G, id);
    saveGame(G);
    render();
  } else if (act === 'buyRecipe') {
    const recipe = REFINE_RECIPES.find((r) => r.id === id);
    const p = G.player;
    if (!PLACES[G.location]?.services.includes('recipes') || !recipe || !isRecipeSold(recipe)
      || p.recipes?.includes(id) || p.yuanshi < recipe.price) return;
    p.yuanshi -= recipe.price;
    (p.recipes ??= []).push(id);
    const message = `已习得「${recipeOutputText(recipe)}」${recipe.method ?? ''}蛊方，花费 ${recipe.price} 元石`;
    addLog(G, `【蛊方】${message}。`, 'log-gold');
    saveGame(G);
    render();
    showToast(message);
  } else if (act === 'buyItem') {
    const input = el.closest('.shop-purchase')?.querySelector('input[type="number"]');
    const result = purchaseShopEntry(G, id, input?.valueAsNumber ?? 1);
    if (!result.ok) { showToast(result.reason); return; }
    saveGame(G);
    render();
    showToast(result.message);
  } else if (act === 'checkEvents') {
    checkStoryTriggers(G, id);
    render();
  } else if (act === 'refineBenming') {
    const res = refineBenming(G);
    if (!res.ok) { showToast(res.reason); return; }
    saveGame(G);
    render();
  } else if (act === 'chooseEvent') {
    applyEventChoice(G, id, Number(el.dataset.idx) || 0);
    saveGame(G);
    render();
  } else if (act === 'washMinor') {
    const res = washMinorWall(G);
    showToast(res.ok ? res.message : res.reason);
    saveGame(G);
    render();
  } else if (act === 'openBreak') {
    const sess = createBreakSession(G);
    if (sess.error) { showToast(sess.error); return; }
    openModal('break', sess);
  } else if (act === 'breakAct' && MODAL?.kind === 'break') {
    stepBreakSession(G, MODAL.data, id);
    saveGame(G);
    render();
  } else if (act === 'startRefine') {
    if (G.refining || G.battle || G.player.dead) return;
    const sess = createRefineSession(G, id);
    if (sess.error) { showToast(sess.error); return; }
    G.refining = sess;
    openModal('refine', sess);
  } else if (act === 'refineAct' && MODAL?.kind === 'refine') {
    const sess = MODAL.data;
    const { state, turns } = sess;
    const pending = sess.pending.length;
    const track = el.closest('.refine-ritual')?.querySelector('.refine-timing');
    let timing;
    if (track) {
      const { left, width } = track.getBoundingClientRect();
      const marker = track.firstElementChild.getBoundingClientRect();
      if (width) timing = Math.max(0, Math.min(1, (marker.left + marker.width / 2 - left) / width));
    }
    stepRefineSession(G, sess, id, Math.random, timing);
    if (state === sess.state && turns === sess.turns && pending === sess.pending.length) return;
    MODAL.effect = { action: id.split(':')[0], input: el.dataset.input };
    saveGame(G);
    render();
  } else if (act === 'openCustomKiller') {
    if (!G.battle && discoveredKillerPatterns(G.player).length) openModal('killer');
  } else if (act === 'kmCreate' && MODAL?.kind === 'killer') {
    const nm = document.getElementById('kmName')?.value || '';
    const res = createKillerMove(G, id, nm);
    if (!res.ok) { showToast(res.reason); return; }
    saveGame(G);
    closeModal();
    showToast(`推演成功：「${res.move.name}」`);
  } else if (act === 'forgetKiller') {
    const move = forgetKillerMove(G, id);
    if (!move) return;
    saveGame(G);
    render();
    showToast(`已删除「${move.name}」`);
  } else if (act === 'toggleAutoFeed') {
    G.player.autoFeed = !G.player.autoFeed;
    if (G.player.autoFeed) {
      for (const gu of G.player.gu) feedGu(G, gu, 51);
    }
    saveGame(G);
    render();
  } else if (act === 'feedGu' || act === 'feedAll') {
    if (act === 'feedGu') {
      if (!feedGu(G, G.player.gu.find((g) => String(g.uid) === id))) return;
    } else {
      const fed = G.player.gu.filter((g) => feedGu(G, g, 85)).length;
      showToast(fed ? `已喂养 ${fed} 只蛊虫` : '无需喂养或口粮不足');
    }
    saveGame(G);
    render();
  } else if (act === 'toggleEquip') {
    const uid = Number(id);
    const i = G.player.equipped.indexOf(uid);
    if (i >= 0) G.player.equipped.splice(i, 1);
    else if (G.player.equipped.length < 6) G.player.equipped.push(uid);
    else showToast('至多同时出战 6 只蛊');
    saveGame(G);
    render();
  } else if (act === 'useHealingGu') {
    const uid = Number(id);
    if (!useHealingGu(G, uid)) {
      showToast(G.player.hp >= G.player.hpMax ? '气血已满' : '无法催动治疗蛊，请检查真元');
      return;
    }
    recordGuUsage(G, [G.player.gu.find((gu) => gu.uid === uid).id]);
    saveGame(G);
    render();
  } else if (act === 'useBoarGu') {
    if (!useBoarGu(G, Number(id))) return;
    saveGame(G);
    render();
  } else if (act === 'useSheli') {
    const uid = Number(id);
    const g = G.player.gu.find((x) => x.uid === uid);
    if (!g) return;
    if (!['qingtong_sheli', 'chitie_sheli'].includes(g.id)) return;
    const targetRank = g.id === 'qingtong_sheli' ? 1 : 2;
    if (G.player.rank !== targetRank || G.player.xiao >= 3) {
      showToast('仅限对应转数未达巅峰时使用');
      return;
    }
    const gu = realmGuRequirement({ ...G.player, gu: G.player.gu.filter((x) => x.uid !== uid) });
    if (gu.count < gu.need) { showToast(gu.text); return; }
    const before = { ...G.player };
    G.player.gu = G.player.gu.filter((x) => x.uid !== uid);
    G.player.xiao++;
    recalcStats(G);
    const message = `晋入${realmText(G.player)} · ${realmGrowthText(before, G.player)}`;
    addLog(G, `【舍利破境】${message}`, 'log-gold');
    showToast(message);
    saveGame(G);
    render();
  } else if (act === 'useHealItem') {
    const result = useHealItem(G, id);
    if (!result.ok) {
      if (result.reason) showToast(result.reason);
      return;
    }
    saveGame(G);
    render();
  } else if (act === 'battleAct') {
    battleAct(G, el.dataset.kind, id);
    saveGame(G);
    render();
  } else if (act === 'finishBattle') {
    const dead = G.player.dead;
    G.battle = null;
    if (dead) openModal('dead', {});
    else checkStoryTriggers(G);
    saveGame(G);
    render();
  } else if (act === 'saveCicada') {
    const res = saveSpringSnapshot(G);
    showToast(res.ok ? '已留下春秋蝉旧影' : res.reason);
    saveGame(G);
    render();
  } else if (act === 'rewindCicada') {
    const res = rewindSpringCicada(G);
    if (!res.ok) { showToast(res.reason); return; }
    G = res.state;
    closeModal();
    saveGame(G);
    render();
  } else if (act === 'manualSave') {
    saveGame(G);
    showToast('进度已保存');
  } else if (act === 'exportSave') {
    const text = JSON.stringify(G, null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast('存档 JSON 已复制到剪贴板'));
    else showToast('请从控制台查看存档');
  } else if (act === 'resetGame') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('gujie_qingmaoshan_v1');
    G = null;
    MODAL = null;
    START = { phase: 'intro', name: '方源', apt: null, step: 0, target: 25, done: false, hasSave: false };
    render();
  } else if (act === 'closeModal') {
    closeModal();
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) handleAction(btn);
});

function updateLiveDisplay() {
  const p = G.player;
  const need = minorXpNeed(p);
  const labels = {
    clock: formatDateTime(G.minutes),
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
  document.querySelector('.map-canvas')?.classList.toggle('is-night', isNight(G.minutes));
}

// 轻实时时间流：现实 1 秒 = 游戏 1 刻 (15 分钟)
setInterval(() => {
  if (!G || G.paused || G.player.dead || G.battle || G.pendingEventId || MODAL) return;
  const day = Math.floor(G.minutes / MIN_PER_DAY);
  const hallOpen = G.flags['open:jiazhuge'];
  advanceMinutes(G, 15);
  if (G.player.dead) openModal('dead', {});
  else if (G.battle || G.pendingEventId || day !== Math.floor(G.minutes / MIN_PER_DAY)
    || hallOpen !== G.flags['open:jiazhuge']) render();
  else updateLiveDisplay();
}, 1000);

G = loadGame();
restoreRefining();
render();
