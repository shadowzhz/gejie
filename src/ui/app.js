import { GU_DEFS, ITEMS } from '../data/gu.js';
import { PLACES } from '../data/places.js';
import { formatDateTime } from '../core/calendar.js';
import { addGu, addItem, addLog, claimBenming, createAptitude, createNewGame, esc, loadGame, realmText, recalcStats, refineBenming, saveGame, useItem } from '../core/state.js';
import { createKillerMove } from '../core/killer.js';
import { battleAct, startBattle } from '../core/combat.js';
import { applyEventChoice, checkStoryTriggers } from '../core/story-engine.js';
import { advanceMinutes, moveToPlace, rewindSpringCicada, saveSpringSnapshot } from '../core/clock.js';
import { createRefineSession, stepRefineSession } from '../core/refine.js';
import { createBreakSession, stepBreakSession, washMinorWall } from '../core/breakthrough.js';
import { renderBreakModal, renderCustomKillerModal, renderEventModal, renderRefineModal, renderStartScreen } from './rituals.js';
import { renderBattleView } from './battle-view.js';
import { renderPlaceView } from './place-view.js';
import { renderApertureView } from './aperture-view.js';
import { renderRefineView } from './refine-view.js';
import { renderBagView } from './bag-view.js';

let G = null;
let TAB = 'place';
let MODAL = null; // { kind: 'break'|'refine'|'killer'|'event'|'dead'|'win', data: ... }
let START = { phase: 'intro', name: '方源', apt: null, step: 0, target: 25, done: false, hasSave: false };
let KM_DRAFT = { coreId: '', auxIds: [], name: '' };

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
  MODAL = null;
  render();
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
        <span>${esc(formatDateTime(G.minutes))}</span>
        <button class="sm ghost" data-action="togglePause">${G.paused ? '▶ 继续流逝' : '⏸ 暂停'}</button>
      </div>
    </div>
    <div class="goal-bar"><b>当下目标：</b>${esc(G.goal)}</div>
    <div class="res-row">
      <div class="res-item"><div class="res-head"><span>气血</span><span>${Math.round(p.hp)}/${p.hpMax}</span></div><div class="bar hp"><i style="width:${hpPct}%"></i></div></div>
      <div class="res-item"><div class="res-head"><span>真元</span><span>${Math.round(p.zy)}/${p.zyMax}</span></div><div class="bar zy"><i style="width:${zyPct}%"></i></div></div>
      <div class="res-item"><div class="res-head"><span>元石</span><span>${p.yuanshi}</span></div><div class="muted" style="font-size:.75rem">${p.mo >= 30 ? `恶名 ${p.mo}` : `${p.grade}等资质`}</div></div>
    </div>
  </header>`;
}

function renderModal() {
  const modalEl = document.getElementById('modal');
  const sheetEl = document.getElementById('sheet');
  if (!modalEl || !sheetEl) return;

  if (G && G.pendingEventId && !G.battle && !MODAL) {
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
  if (MODAL.kind === 'break') html = renderBreakModal(MODAL.data);
  else if (MODAL.kind === 'refine') html = renderRefineModal(MODAL.data);
  else if (MODAL.kind === 'killer') html = renderCustomKillerModal(G, KM_DRAFT);
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
    body = renderPlaceView(G, 'place');
  } else if (TAB === 'explore') {
    body = renderPlaceView(G, 'explore');
  } else if (TAB === 'aperture') {
    body = renderApertureView(G);
  } else if (TAB === 'refine') {
    body = renderRefineView(G);
  } else {
    body = renderBagView(G, TAB);
  }

  const navButtons = [
    ['place', '据点'], ['explore', '历练'], ['aperture', '空窍'],
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
  else if (id === 'wait') { advanceMinutes(G, 120); }
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
      addLog(G, '【密闻】酒客低声提起：血蝠洞下游瀑布后，藏着花酒行者的暗涧遗洞，须入夜方可潜入！', 'log-gold');
    } else {
      addLog(G, '【传闻】听说山外狼群正在集结，明年夏天怕是要闹狼潮。');
    }
  } else if (id === 'clanGift') {
    if (!G.flags['clan_gift_r2']) {
      G.flags['clan_gift_r2'] = true;
      p.yuanshi += 40;
      addGu(G, 'qingtong_sheli');
      addLog(G, '【家族赏赐】族长嘉许你晋入二转，赏元石 40、青铜舍利蛊 1 只！', 'log-gold');
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
    addLog(G, `你在山间采集了 2 份「${ITEMS[got].name}」。`, 'log-good');
  } else if (id === 'huajiuLoot') {
    if (G.flags['looted:huajiu']) { showToast('遗洞宝藏已被你取空'); return; }
    G.flags['looted:huajiu'] = true;
    advanceMinutes(G, 60);
    p.yuanshi += 45;
    addGu(G, 'jiuchong', 100);
    addGu(G, 'chunqiuchan', 100);
    addItem(G, 'qingzhujiu', 5);
    addLog(G, '【遗洞奇遇】你在石室酒坛中觅得「酒虫」、45 元石，以及一只气息微弱的「春秋蝉（残）」！', 'log-gold');
  } else if (id === 'escapeMountain') {
    p.escapedMountain = true;
    openModal('win', {});
  }
  saveGame(G);
  render();
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
    render();
  } else if (act === 'navTab') {
    TAB = el.dataset.tab || 'place';
    render();
  } else if (act === 'togglePause') {
    G.paused = !G.paused;
    render();
  } else if (act === 'walkTo') {
    const res = moveToPlace(G, id);
    if (!res.ok) showToast(res.reason);
    saveGame(G);
    render();
  } else if (act === 'placeAct') {
    handlePlaceAction(id);
  } else if (act === 'buyItem') {
    const [kind, itemId] = id.split(':');
    const def = kind === 'gu' ? GU_DEFS[itemId] : ITEMS[itemId];
    if (!def || G.player.yuanshi < def.price) { showToast('元石不足'); return; }
    G.player.yuanshi -= def.price;
    if (kind === 'gu') addGu(G, itemId, 100);
    else addItem(G, itemId, 1);
    addLog(G, `购入「${def.name}」（-${def.price} 元石）。`);
    saveGame(G);
    render();
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
    if (!res.ok) showToast(res.reason);
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
    const sess = createRefineSession(G, id);
    if (sess.error) { showToast(sess.error); return; }
    openModal('refine', sess);
  } else if (act === 'refineAct' && MODAL?.kind === 'refine') {
    stepRefineSession(G, MODAL.data, id);
    saveGame(G);
    render();
  } else if (act === 'openCustomKiller') {
    KM_DRAFT = { coreId: '', auxIds: [], name: '' };
    openModal('killer', {});
  } else if (act === 'kmPickCore') {
    KM_DRAFT.coreId = id;
    KM_DRAFT.auxIds = KM_DRAFT.auxIds.filter((x) => x !== id);
    render();
  } else if (act === 'kmToggleAux') {
    const i = KM_DRAFT.auxIds.indexOf(id);
    if (i >= 0) KM_DRAFT.auxIds.splice(i, 1);
    else if (KM_DRAFT.auxIds.length < 2) KM_DRAFT.auxIds.push(id);
    render();
  } else if (act === 'kmCreate') {
    const nm = document.getElementById('kmName')?.value || '';
    const res = createKillerMove(G, KM_DRAFT.coreId, KM_DRAFT.auxIds, nm);
    if (!res.ok) { showToast(res.reason); return; }
    closeModal();
    saveGame(G);
    render();
  } else if (act === 'feedGu') {
    const g = G.player.gu.find((x) => String(x.uid) === id);
    const def = g && GU_DEFS[g.id];
    if (!g || !def?.food || !useItem(G, def.food, 1)) return;
    g.satiety = Math.min(100, g.satiety + 50);
    saveGame(G);
    render();
  } else if (act === 'feedAll') {
    let fed = 0;
    for (const g of G.player.gu) {
      const def = GU_DEFS[g.id];
      if (def?.food && g.satiety < 85 && useItem(G, def.food, 1)) {
        g.satiety = Math.min(100, g.satiety + 50);
        fed++;
      }
    }
    showToast(fed ? `已喂养 ${fed} 只蛊虫` : '无需喂养或口粮不足');
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
  } else if (act === 'useSheli') {
    const uid = Number(id);
    const g = G.player.gu.find((x) => x.uid === uid);
    if (!g) return;
    const targetRank = g.id === 'qingtong_sheli' ? 1 : 2;
    if (G.player.rank !== targetRank || G.player.xiao >= 3) {
      showToast('仅限对应转数未达巅峰时使用');
      return;
    }
    G.player.gu = G.player.gu.filter((x) => x.uid !== uid);
    G.player.xiao++;
    recalcStats(G);
    addLog(G, `【舍利破境】炼化「${GU_DEFS[g.id].name}」，直接晋入${realmText(G.player)}！`, 'log-gold');
    saveGame(G);
    render();
  } else if (act === 'useHealItem') {
    const def = ITEMS[id];
    if (!def?.heal || !useItem(G, id, 1)) return;
    G.player.hp = Math.min(G.player.hpMax, G.player.hp + def.heal);
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

// 轻实时时间流：现实 1 秒 = 游戏 1 刻 (15 分钟)
setInterval(() => {
  if (!G || G.paused || G.player.dead || G.battle || G.pendingEventId || MODAL) return;
  advanceMinutes(G, 15);
  if (G.player.dead) openModal('dead', {});
  render();
}, 1000);

G = loadGame();
render();
