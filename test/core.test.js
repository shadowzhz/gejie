import { handleAction } from '../src/ui/actions.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, addGu, BENMING_ZY_COST, claimBenming, feedGu, handleQuest, loadGame, purchaseShopEntry, questBoard, refineBenming, realmText, recordQuestProgress, removeGuByUid, saveGame, useHealItem, useHealingGu, useBoarGu } from '../src/core/state.js';
import { PLACES, placeShopEntries, rareGathering } from '../src/data/places.js';
import { advanceMinutes, moveToPlace, rewindSpringCicada, saveSpringSnapshot } from '../src/core/clock.js';
import { makeTime, MIN_PER_DAY, MIN_PER_MONTH } from '../src/core/calendar.js';
import { applyEventChoice, availableLocalScenes, checkStoryTriggers, evalCond, finishStoryBattle, hasLocalLifeScene, lookForLifeScene, innRumors, nextRetreatTime } from '../src/core/story-engine.js';
import { createKillerMove, forgetKillerMove } from '../src/core/killer.js';
import { battleAct, battleGuPlan, startBattle } from '../src/core/combat.js';
import { createBreakSession, nextRealmRequirements, stepBreakSession, validBreakSession, washMinorWall } from '../src/core/breakthrough.js';
import { availableRecipeDiscovery, canStartRefine, createRefineSession, isRecipeSold, knowsRefineRecipe, purchaseRecipe, REFINE_SESSION_VERSION, refineChance, refineReady, refineRealm, refineTechniques, restoreRefineSession, stepRefineSession } from '../src/core/refine.js';
import { renderCustomKillerModal, renderEventModal } from '../src/ui/rituals.js';
import { mainGrowthGoal } from '../src/core/growth-guide.js';
import { fieldRecommendation } from '../src/core/field-trial.js';
import { renderCultivationView, renderGoalShortcut } from '../src/ui/cultivation-view.js';
import { renderPlaceView } from '../src/ui/place-view.js';
import { changeStoryRelation, storyRelation } from '../src/core/story-progress.js';
import { performPlaceAction } from '../src/core/place-actions.js';
import { renderBagView } from '../src/ui/bag-view.js';
import { STORY_EVENTS, STORY_QUESTS } from '../src/data/story.js';
import { importProgress } from '../src/ui/persistence.js';
import { GU_DEFS, ITEMS, REFINE_RECIPES } from '../src/data/gu.js';

test('破壁跨存档保留进度，成功、失败和退关都只结算一次', () => {
  for (const outcome of ['win', 'lose', 'stopped']) {
    let raw;
    const storage = { setItem: (_, value) => { raw = value; }, getItem: () => raw };
    const gs = createNewGame();
    gs.player.xiao = 3;
    addGu(gs, 'yuehen');
    gs.player.zy = gs.player.zyMax;
    gs.player.yuanshi = 50;
    gs.breakthrough = createBreakSession(gs);
    stepBreakSession(gs, gs.breakthrough, 'hard', () => 0.5);
    stepBreakSession(gs, gs.breakthrough, 'stone');
    assert.ok(saveGame(gs, storage));
    const loaded = loadGame(storage);
    const sess = loaded.breakthrough;
    assert.deepEqual(sess, gs.breakthrough);
    assert.equal(validBreakSession(loaded, sess), true);
    if (outcome === 'win') sess.crack = 99;
    if (outcome === 'lose') sess.hurt = 99;
    const action = outcome === 'stopped' ? 'stop' : 'hard';
    stepBreakSession(loaded, sess, action, () => 0.5);
    stepBreakSession(loaded, sess, action, () => 0.5);
    assert.equal(sess.state, outcome);
    assert.equal(loaded.player.yuanshi, 40);
    assert.equal(loaded.player.rank, outcome === 'win' ? 2 : 1);
    assert.equal(loaded.player.attempts, outcome === 'win' ? 0 : 1);
    assert.ok(saveGame(loaded, storage));
    assert.equal(loadGame(storage).breakthrough, undefined);
  }
});

test('炼蛊会话可从旧版恢复，未识别版本和损坏输入安全拒绝', () => {
  const gs = createNewGame();
  gs.player.recipes.push('r_yueguang');
  gs.player.yuanshi = 100;
  gs.player.items.yuanshi_zha = 1;
  const sess = createRefineSession(gs, 'r_yueguang');
  assert.equal(sess.version, REFINE_SESSION_VERSION);
  stepRefineSession(gs, sess, 'ignite');
  stepRefineSession(gs, sess, 'add:0', Math.random, 0.5);
  gs.player.recipes = [];
  const legacy = JSON.parse(JSON.stringify(sess));
  delete legacy.version;
  assert.deepEqual(restoreRefineSession(gs, legacy), sess);
  assert.equal(restoreRefineSession(gs, { ...sess, version: 999 }), null);
  assert.equal(restoreRefineSession(gs, { ...sess, pending: [null] }), null);
  assert.equal(restoreRefineSession(gs, { ...sess, pending: [{ item: { toString: null } }] }), null);
  assert.equal(restoreRefineSession(gs, { ...sess, turns: '5' }), null);
  assert.equal(restoreRefineSession(gs, { ...sess, flow: null }).flow, sess.flow);
  assert.equal(gs.player.yuanshi, 100 - sess.cost);
});

test('敌方真元不足时已预告的招式也不会执行，恰好足够时可施法', () => {
  for (const zy of [0, 49, 50]) {
    const gs = createNewGame();
    const b = startBattle(gs, 'caoren', '', () => 0.5);
    const move = { name: '重击', kind: 'attack', power: 20, cost: 50, cd: 2 };
    b.foe.moves = [move];
    b.foe.intent = move;
    b.foe.zy = zy;
    battleAct(gs, 'attack', '', () => 0.5);
    assert.equal(gs.player.hp, gs.player.hpMax - (zy === 50 ? 20 : 0));
    assert.equal(b.foe.zy, zy === 50 ? 0 : zy);
    assert.equal(b.foe.cds[move.name], zy === 50 ? 2 : undefined);
    assert.equal(b.foe.intent, null);
  }
});

test('跨三个月逐月发放月例，满血服药不扣库存或设置冷却', () => {
  const gs = createNewGame('试炼', { grade: '乙', hai: 7 });
  gs.flags.kaike = true;
  gs.minutes = makeTime(1, 11, 12);
  advanceMinutes(gs, 3 * MIN_PER_MONTH);
  assert.equal(gs.player.yuanshi, 48);
  const payouts = gs.logs.filter(({ text }) => text.startsWith('【月例】'));
  assert.equal(payouts.length, 3);
  assert.match(payouts[0].text, /第二年 二月初一/);
  assert.match(payouts[2].text, /第一年 腊月初一/);
  gs.player.items.shengjiye = 1;
  assert.equal(useHealItem(gs, 'shengjiye').ok, false);
  assert.equal(gs.player.items.shengjiye, 1);
  assert.equal(gs.player.healReadyAt, undefined);
  assert.equal(saveGame(gs, { setItem() { throw new Error('full'); } }), false);
});

test('卷一两条路线按日期连到卷末，证词和恶名改变查案与大比选项', () => {
  for (const outlaw of [false, true]) {
    const gs = createNewGame('试炼', { grade: '丁', hai: 3.2 });
    const choose = (id, choice, year, month, day) => {
      if (year) advanceMinutes(gs, makeTime(year, month, day) - gs.minutes);
      assert.equal(gs.pendingEventId, id);
      applyEventChoice(gs, id, choice);
      assert.equal(gs.flags[`event_done:${id}`], true);
    };
    choose('kaike', 0);
    assert.equal(nextRetreatTime(gs), makeTime(1, 3, 3));
    choose('toumin_lost', 0, 1, 3, 3);
    choose('uncle', outlaw ? 1 : 0, 1, 4, 1);
    choose('classmates', outlaw ? 1 : 0, 1, 5, 1);
    choose('wine_lead', outlaw ? 1 : 0, 1, 6, 1);
    choose('early_sheli', 0, 1, 7, 1);
    choose('jiuyecao_inheritance', outlaw ? 2 : 0, 1, 9, 1);
    assert.equal(gs.player.gu.some((gu) => gu.id === 'jiuyecao'), !outlaw);
    choose('nianmo_exam', 0, 1, 12, 15);
    choose('wolf_signs', outlaw ? 1 : 0, 2, 1, 1);
    choose('jia_missing', outlaw ? 1 : 0, 2, 3, 2);
    choose('jia_questions', outlaw ? 2 : 0, 2, 3, 6);
    choose('langchao_start', outlaw ? 3 : 1, 2, 6, 1);
    choose('bai_encounter', 1, 2, 6, 15);
    choose('wolf_breach', outlaw ? 1 : 0, 2, 7, 10);
    advanceMinutes(gs, makeTime(2, 8, 20) - gs.minutes);
    const hearing = renderEventModal(gs, 'tie_inquiry');
    assert.equal(hearing.includes('以失踪案证词或救援记录结案'), !outlaw);
    assert.equal(hearing.includes('迎战铁家追兵'), outlaw);
    applyEventChoice(gs, 'tie_inquiry', outlaw ? 0 : 3);
    assert.equal(gs.pendingEventId, 'tie_inquiry');
    choose('tie_inquiry', outlaw ? 2 : 0);
    assert.equal(gs.player.mo, outlaw ? 62 : 0);
    choose('three_clans', outlaw ? 2 : 0, 2, 9, 10);
    if (!outlaw) {
      assert.equal(gs.battle.foe.id, 'bainingbing');
      assert.equal(gs.player.gu.some((gu) => gu.id === 'chitie_sheli'), false);
      gs.battle.foe.hp = 1;
      battleAct(gs, 'attack', '', () => 0.5);
      assert.equal(gs.flags.tournament_won, true);
      assert.equal(gs.player.gu.some((gu) => gu.id === 'chitie_sheli'), true);
      gs.battle = null;
    }
    choose('blood_skull', outlaw ? 0 : 1, 2, 10, 1);
    assert.equal(gs.player.hai, outlaw ? 5.2 : 3.2);
    checkStoryTriggers(gs);
    choose('qingmao_endgame', 2);
    assert.equal(gs.flags.qingmao_finished, true);
  }
});

test('传闻使用当天采集资源，竞买帖与商队放货日期影响实付价格和库存', () => {
  const gs = createNewGame();
  gs.flags.practiced = true;
  gs.minutes = makeTime(1, 1, 2);
  assert.equal(rareGathering(gs, PLACES.zhulin), 'yezhuya');
  assert.match(innRumors(gs).join(' '), /月下竹林.*野猪牙/);
  gs.flags['gathered:zhulin'] = 1;
  assert.equal(rareGathering(gs, PLACES.zhulin), null);
  assert.doesNotMatch(innRumors(gs).join(' '), /野猪牙/);
  gs.location = 'gupu';
  gs.minutes = makeTime(2, 3, 6);
  gs.flags.wine_bid = true;
  gs.player.yuanshi = 45;
  assert.ok(!placeShopEntries(gs).includes('gu:chitie_sheli'));
  assert.match(renderPlaceView(gs), /竞买 · 45/);
  assert.equal(purchaseShopEntry(gs, 'gu:jiuchong', 1).ok, true);
  assert.equal(gs.player.yuanshi, 0);
  gs.minutes = makeTime(2, 3, 7);
  assert.ok(placeShopEntries(gs).includes('gu:chitie_sheli'));
});

test('风雷杀招打断敌招并留下提速，力道破盾，血道只按实际伤害吸血', () => {
  const gs = createNewGame();
  gs.player.rank = 2;
  gs.player.yuanshi = 100;
  const run = (pattern, guIds, foeHp = 100, shield = 0) => {
    gs.battle = null;
    gs.player.equipped = guIds.map((id) => addGu(gs, id).uid);
    gs.player.usedGu = guIds;
    gs.player.zy = gs.player.zyMax;
    const { move } = createKillerMove(gs, pattern);
    const b = startBattle(gs, 'caoren', '', () => 0.5);
    b.foe.hp = foeHp;
    b.foe.shield = shield;
    battleAct(gs, 'move', move.id, () => 0.5);
    return b;
  };
  const wind = run('thunder_wind', ['xuanfeng', 'dianlang_gu']);
  assert.equal(wind.haste.turns, 1);
  assert.ok(wind.logs.some((line) => line.includes('错过了这一轮出手')));
  const ram = run('stone_ram', ['shoupi', 'shipi'], 100, 50);
  assert.equal(ram.foe.shield, 10);
  gs.player.hp = 40;
  const blood = run('hidden_bat', ['yinshi', 'xuefu_gu'], 5);
  assert.equal(blood.state, 'win');
  assert.equal(gs.player.hp, 43);
});

test('丁等冲刷更费真元，养好的酒虫能减轻冲刷和破壁压力', () => {
  const gs = createNewGame('试炼', { grade: '丁', hai: 3.2 });
  const player = gs.player;
  addGu(gs, 'yueguang');
  addGu(gs, 'shipi');
  player.xp = 1000;
  player.zy = Math.round(player.zyMax * 0.6);
  assert.match(washMinorWall(gs).reason, /真元不足/);
  const wine = addGu(gs, 'jiuchong');
  assert.equal(washMinorWall(gs).ok, true);
  player.xiao = 3;
  addGu(gs, 'yuehen');
  player.zy = player.zyMax;
  assert.equal(createBreakSession(gs).wallHeal, 2);
  wine.satiety = 0;
  wine.starveDays = 2;
  assert.equal(createBreakSession(gs).wallHeal, 7);
});

function loadFurnace(gs, session) {
  stepRefineSession(gs, session, 'ignite');
  for (const input of [...session.pending]) {
    stepRefineSession(gs, session, 'add:0', Math.random, 0.3);
    assert.ok(!session.pending.includes(input));
  }
}

function runRefining(gs, session, actions = ['force', 'force', 'gentle', 'gentle']) {
  loadFurnace(gs, session);
  for (const action of actions) stepRefineSession(gs, session, action);
  assert.ok(refineReady(session));
  stepRefineSession(gs, session, 'seal', () => 0);
}

test('豕蛊加伤只作用于拳脚和力道攻伐', () => {
  const gs = createNewGame();
  gs.player.rank = 2;
  for (const id of ['yueguang', 'xiaoguang']) addGu(gs, id);
  const blackBoar = addGu(gs, 'heishi');
  const whiteBoar = addGu(gs, 'baishi');
  assert.equal(gs.player.powerBonus, 0);
  assert.equal(useBoarGu(gs, blackBoar.uid), true);
  assert.equal(useBoarGu(gs, addGu(gs, 'heishi').uid), false);
  assert.equal(useBoarGu(gs, whiteBoar.uid), true);
  assert.equal(useBoarGu(gs, whiteBoar.uid), false);
  gs.player.usedGu = ['xiaoguang', 'yueguang'];
  gs.player.yuanshi = 100;
  const moon = createKillerMove(gs, 'light_moon').move;
  const damage = (action, id) => {
    gs.battle = null;
    gs.player.zy = gs.player.zyMax;
    const battle = startBattle(gs, 'caoren', '', () => 0.5);
    if (action === 'gu') {
      battleAct(gs, 'gu', gs.player.gu.find((gu) => gu.id === id).uid);
      battleAct(gs, 'resolveGu', '', () => 0.5);
    } else {
      battleAct(gs, action, id, () => 0.5);
    }
    return battle.foe.hpMax - battle.foe.hp;
  };
  assert.equal(gs.player.powerBonus, 24);
  assert.equal(damage('attack'), 30);
  assert.equal(damage('gu', 'yueguang'), 18);
  assert.equal(damage('move', moon.id), Math.round(moon.power * 1.01));
});

test('古月蛊开课后供应，商队酒虫与黑豕蛊限期分别出售一只', () => {
  const gs = createNewGame();
  gs.location = 'gupu';
  assert.deepEqual(placeShopEntries(gs), ['gu:shipi', 'gu:xuanfeng', 'item:shengjiye', 'gu:shoupi', 'gu:qingsi', 'item:fanran', 'item:langzi']);
  gs.flags.kaike = true;
  assert.ok(placeShopEntries(gs).includes('gu:yueguang'));
  assert.ok(placeShopEntries(gs).includes('gu:xiaoguang'));
  assert.ok(placeShopEntries(gs).includes('gu:henshi'));
  gs.minutes = makeTime(2, 3, 1) - 1;
  assert.ok(!placeShopEntries(gs).includes('gu:jiuchong'));
  gs.minutes++;
  assert.ok(placeShopEntries(gs).includes('gu:jiuchong'));
  assert.ok(placeShopEntries(gs).includes('gu:heishi'));
  gs.flags.merchant_jiuchong_bought = true;
  assert.ok(!placeShopEntries(gs).includes('gu:jiuchong'));
  assert.ok(placeShopEntries(gs).includes('gu:heishi'));
  gs.flags.merchant_heishi_bought = true;
  assert.ok(!placeShopEntries(gs).includes('gu:heishi'));
  gs.flags.merchant_jiuchong_bought = false;
  gs.minutes = makeTime(2, 3, 9);
  assert.ok(!placeShopEntries(gs).includes('gu:jiuchong'));
});

test('批量购买按总价扣款，商队蛊虫仍限售一只', () => {
  const gs = createNewGame();
  gs.location = 'jucaifang';
  gs.player.yuanshi = 20;
  assert.equal(purchaseShopEntry(gs, 'item:yuelanhua', 11).ok, false);
  assert.equal(purchaseShopEntry(gs, 'item:yuelanhua', 1.5).ok, false);
  assert.equal(gs.player.items.yuelanhua, 6);
  assert.equal(gs.player.yuanshi, 20);
  assert.equal(purchaseShopEntry(gs, 'item:yuelanhua', 5).ok, true);
  assert.equal(gs.player.items.yuelanhua, 11);
  assert.equal(gs.player.yuanshi, 10);

  gs.location = 'gupu';
  gs.minutes = makeTime(2, 3, 1);
  gs.player.yuanshi = 200;
  assert.equal(purchaseShopEntry(gs, 'gu:shipi', 2).ok, true);
  assert.equal(gs.player.gu.filter((gu) => gu.id === 'shipi').length, 2);
  assert.equal(purchaseShopEntry(gs, 'gu:jiuchong', 2).ok, false);
  assert.equal(purchaseShopEntry(gs, 'gu:jiuchong', 1).ok, true);
  assert.equal(purchaseShopEntry(gs, 'gu:jiuchong', 1).ok, false);
  assert.equal(gs.player.yuanshi, 105);
});

test('生机叶每次消耗一片，再用须等待一小时', () => {
  const gs = createNewGame();
  gs.player.items.shengjiye = 2;
  gs.player.hp = 1;
  assert.equal(useHealItem(gs, 'shengjiye').ok, true);
  assert.equal(gs.player.hp, 25);
  gs.minutes += 59;
  assert.equal(useHealItem(gs, 'shengjiye').ok, false);
  assert.equal(gs.player.items.shengjiye, 1);
  gs.minutes++;
  assert.equal(useHealItem(gs, 'shengjiye').ok, true);
  assert.equal(gs.player.items.shengjiye, undefined);
});

test('轻实时时钟推进与头名之争死线截胡', () => {
  const gs = createNewGame('测试者', { grade: '丙', hai: 5.0, desc: '' });
  applyEventChoice(gs, 'kaike', 0);
  assert.equal(gs.flags.kaike, true);
  assert.equal(gs.flags.toumin_race, true);

  // 推进至三月三日后，未交卷应触发头名旁落
  gs.minutes = makeTime(1, 3, 3, 1);
  const ev = checkStoryTriggers(gs);
  assert.equal(ev?.id, 'toumin_lost');
});

test('月光蛊须消耗真元手动炼化，炼化后才能交卷', () => {
  const gs = createNewGame();
  const p = gs.player;
  applyEventChoice(gs, 'kaike', 0);
  gs.location = 'xuetang';
  const initialZy = p.zy;
  claimBenming(gs);
  claimBenming(gs);
  assert.equal(p.items.yuelanhua, 14);
  assert.equal(p.zy, initialZy);
  assert.equal(p.benming, null);
  assert.deepEqual(p.gu, []);
  assert.deepEqual(p.equipped, []);
  assert.equal(checkStoryTriggers(gs, 'toumin_win'), null);

  p.zy = BENMING_ZY_COST - 1;
  assert.equal(refineBenming(gs).ok, false);
  assert.equal(p.zy, BENMING_ZY_COST - 1);
  assert.equal(p.unrefinedBenming, true);
  p.zy = initialZy;
  assert.equal(refineBenming(gs).ok, true);
  assert.equal(refineBenming(gs).ok, false);
  assert.equal(p.zy, initialZy - BENMING_ZY_COST);
  assert.equal(p.unrefinedBenming, false);
  assert.equal(p.gu.find((g) => g.uid === p.benming)?.id, 'yueguang');
  assert.deepEqual(p.equipped, [p.benming]);
  assert.equal(checkStoryTriggers(gs), null);
  assert.equal(checkStoryTriggers(gs, 'toumin_win')?.id, 'toumin_win');
});

test('任意已开放据点可直达，按最短路线推进时间', () => {
  const gs = createNewGame('行脚者');
  applyEventChoice(gs, 'kaike', 0);
  const start = gs.minutes;
  assert.equal(moveToPlace(gs, 'gupu').ok, true);
  assert.equal(gs.location, 'gupu');
  assert.equal(gs.minutes - start, 45);
  const blocked = moveToPlace(gs, 'zhulin');
  assert.equal(blocked.ok, false);
  assert.equal(gs.minutes - start, 45);

  gs.flags.practiced = true;
  const ok = moveToPlace(gs, 'zhulin');
  assert.equal(ok.ok, true);
  assert.equal(gs.location, 'zhulin');
  assert.equal(gs.minutes - start, 150);

  assert.equal(moveToPlace(gs, 'huajiu').ok, false);
  gs.flags['clue:huajiu'] = true;
  gs.minutes = makeTime(1, 3, 1, 6);
  assert.equal(moveToPlace(gs, 'huajiu').ok, true);
  assert.equal(gs.location, 'huajiu');
  assert.equal(gs.minutes - makeTime(1, 3, 1, 6), 150);
});

test('任务堂每三日轮换，已接委托可继续完成和领赏', () => {
  const gs = createNewGame();
  applyEventChoice(gs, 'kaike', 0);
  gs.location = 'renwutang';
  const stones = gs.player.yuanshi;
  handleQuest(gs, 'yehua');
  handleQuest(gs, 'yehua');
  handleQuest(gs, 'yehua');
  assert.equal(gs.player.items.yuelanhua, 3);
  assert.equal(gs.player.yuanshi, stones + 9);

  handleQuest(gs, 'xuetang_visit');
  gs.minutes = makeTime(1, 3, 4);
  const next = questBoard(gs).entries;
  assert.ok(next.some((q) => q.id === 'zhulin_gather'));
  assert.ok(next.some((q) => q.id === 'xuetang_visit' && q.accepted));
  assert.ok(!next.some((q) => q.id === 'caoren'));
  handleQuest(gs, 'caoren');
  assert.equal(gs.player.quests.caoren, undefined);

  handleQuest(gs, 'zhulin_gather');
  recordQuestProgress(gs, 'gather', 'xuefu');
  recordQuestProgress(gs, 'gather', 'zhulin');
  assert.equal(gs.player.quests.zhulin_gather.progress, 1);
  recordQuestProgress(gs, 'gather', 'zhulin');
  moveToPlace(gs, 'xuetang');
  moveToPlace(gs, 'renwutang');
  handleQuest(gs, 'xuetang_visit');
  handleQuest(gs, 'zhulin_gather');
  assert.equal(gs.player.yuanshi, stones + 23);

  gs.minutes = makeTime(1, 3, 10);
  handleQuest(gs, 'yehua');
  handleQuest(gs, 'yehua');
  assert.equal(gs.player.yuanshi, stones + 32);
  assert.equal(gs.player.items.yuelanhua, undefined);
});

test('同回合蛊虫按点击顺序结算，敌方只还手一次', () => {
  for (const [order, expected] of [
    [['xiaoguang', 'yueguang'], 24],
    [['yueguang', 'xiaoguang'], 18]
  ]) {
    const gs = createNewGame();
    const gu = Object.fromEntries(order.map((id) => [id, addGu(gs, id).uid]));
    const b = startBattle(gs, 'caoren', '测试', () => 0.5);
    gs.player.zy = 8;
    const hp = gs.player.hp;
    for (const id of order) battleAct(gs, 'gu', gu[id]);
    assert.deepEqual(battleGuPlan(gs).queued.map(({ def }) => def.id), order);
    assert.equal(b.round, 1);
    assert.equal(gs.player.zy, 8);
    assert.equal(gs.player.hp, hp);
    assert.equal(b.foe.hp, b.foe.hpMax);

    battleAct(gs, 'resolveGu', '', () => 0.5);
    assert.equal(b.foe.hpMax - b.foe.hp, expected);
    assert.equal(gs.player.zy, 0);
    assert.equal(gs.player.hp, hp - 8);
    assert.equal(b.round, 2);
    assert.deepEqual(b.guQueue, []);
    gs.player.zy = 8;
    battleAct(gs, 'gu', gu.xiaoguang);
    assert.deepEqual(b.guQueue, []);
  }
});

test('同种蛊可分别入列，真元不足时无法追加，击败敌人后剩余蛊虫不扣真元', () => {
  const gs = createNewGame();
  const first = addGu(gs, 'yueguang').uid;
  const second = addGu(gs, 'yueguang').uid;
  const b = startBattle(gs, 'caoren', '测试', () => 0.5);
  gs.player.zy = 7;
  battleAct(gs, 'gu', first);
  battleAct(gs, 'gu', second);
  assert.deepEqual(b.guQueue, [first]);
  battleAct(gs, 'gu', first);
  assert.deepEqual(b.guQueue, []);
  gs.player.zy = 8;
  b.foe.hp = 18;
  battleAct(gs, 'gu', first);
  battleAct(gs, 'gu', second);
  assert.deepEqual(b.guQueue, [first, second]);
  battleAct(gs, 'resolveGu', '', () => 0.5);
  assert.equal(b.state, 'win');
  assert.equal(b.round, 1);
  assert.equal(gs.player.zy, 4);
  assert.deepEqual(b.guQueue, []);
});

test('杀招累计不同战斗实际催动过的蛊虫，可以推演、催动与删除', () => {
  const gs = createNewGame('战者');
  const moon = addGu(gs, 'yueguang');
  const light = addGu(gs, 'xiaoguang');
  assert.match(createKillerMove(gs, 'light_moon').reason, /二转/);
  assert.match(createKillerMove(gs, 'yueguang').reason, /搭配/);

  gs.player.rank = 2;
  assert.doesNotMatch(renderCustomKillerModal(gs), /凝光月刃/);
  const cast = (...gu) => {
    for (const { uid } of gu) battleAct(gs, 'gu', uid);
    battleAct(gs, 'resolveGu', '', () => 0.5);
  };
  const first = startBattle(gs, 'caoren', '试阵', () => 0.5);
  first.foe.hp = 18;
  cast(moon, light);
  assert.equal(first.state, 'win');
  assert.deepEqual(gs.player.usedGu, ['yueguang']);
  gs.battle = null;
  assert.match(createKillerMove(gs, 'light_moon').reason, /催动/);

  gs.player.zy = gs.player.zyMax;
  const fled = startBattle(gs, 'caoren', '试阵', () => 0.5);
  cast(light);
  assert.ok(gs.player.usedGu.includes('xiaoguang'));
  assert.match(renderCustomKillerModal(gs), /凝光月刃/);
  assert.doesNotMatch(renderCustomKillerModal(gs), /回风掠月/);
  battleAct(gs, 'flee', '', () => 0);
  assert.equal(fled.state, 'fled');
  gs.battle = null;
  gs.player.yuanshi = 23;
  assert.match(createKillerMove(gs, 'light_moon').reason, /元石不足/);
  assert.equal(gs.player.yuanshi, 23);
  gs.player.yuanshi = 24;
  const km = createKillerMove(gs, 'light_moon', '映月');
  assert.equal(km.ok, true);
  assert.equal(km.move.name, '映月');
  assert.equal(gs.player.yuanshi, 0);
  assert.match(createKillerMove(gs, 'light_moon').reason, /已推演/);

  gs.player.zy = gs.player.zyMax;
  const b = startBattle(gs, 'yezhu', '测试战', () => 0.5);
  gs.player.equipped = gs.player.equipped.filter((uid) => uid !== light.uid);
  battleAct(gs, 'move', km.move.id, () => 0.5);
  assert.equal(b.round, 1);
  removeGuByUid(gs, light.uid);
  battleAct(gs, 'move', km.move.id, () => 0.5);
  assert.equal(b.round, 1);
  addGu(gs, 'xiaoguang');
  battleAct(gs, 'move', km.move.id, () => 0.5);
  assert.ok(b.foe.hp < b.foe.hpMax);
  gs.battle = null;
  assert.equal(forgetKillerMove(gs, km.move.id)?.name, '映月');
  assert.deepEqual(gs.player.moves, []);
  assert.match(renderCustomKillerModal(gs), /凝光月刃/);
});

test('治疗蛊可在空窍催动，气血已满或真元不足时不生效', () => {
  const gs = createNewGame();
  const { uid } = addGu(gs, 'jiuyecao');
  gs.player.hp = gs.player.hpMax - 20;
  gs.player.zy = 7;
  assert.equal(useHealingGu(gs, uid), false);
  gs.player.zy = 16;
  assert.equal(useHealingGu(gs, uid), true);
  assert.equal(gs.player.hp, gs.player.hpMax);
  assert.equal(gs.player.zy, 8);
  assert.equal(useHealingGu(gs, uid), false);
  assert.equal(gs.player.zy, 8);
});

test('破壁冲关、炼蛊与春秋蝉回溯', () => {
  const gs = createNewGame('破境者');
  gs.player.xiao = 3;
  gs.player.zy = gs.player.zyMax;
  gs.player.yuanshi = 100;
  assert.ok(createBreakSession(gs).error);
  for (const id of ['yupi', 'xuanfeng', 'heishi', 'shipi']) addGu(gs, id);
  gs.player.zy = gs.player.zyMax;
  assert.match(createBreakSession(gs).error, /2 转蛊虫/);
  addGu(gs, 'baiyu');
  const brk = createBreakSession(gs);
  assert.ok(!brk.error);
  for (let i = 0; i < 12 && brk.state === 'ongoing'; i++) {
    const act = brk.zy >= Math.round(brk.zyMax * 0.5) ? 'hard' : 'stone';
    stepBreakSession(gs, brk, act, () => 0.5);
  }
  assert.ok(['win', 'lose'].includes(brk.state));

  addGu(gs, 'yueguang');
  addGu(gs, 'xiaoguang');
  gs.player.items.kuangshi = 1;
  gs.player.yuanshi = 100;
  assert.equal(createRefineSession(gs, 'r_yuemang').error, '尚未习得此蛊方');
  assert.equal(gs.player.yuanshi, 100);
  assert.equal(gs.player.items.kuangshi, 1);
  gs.player.recipes.push('r_yuemang');
  assert.equal(createRefineSession(gs, 'r_yuemang').error, '需要 2 只「小光蛊」');
  assert.equal(gs.player.yuanshi, 100);
  addGu(gs, 'xiaoguang');
  const ref = createRefineSession(gs, 'r_yuemang');
  assert.ok(!ref.error);
  runRefining(gs, ref);
  assert.equal(ref.state, 'done');
  assert.equal(ref.success, true);
  assert.equal(gs.player.gu.filter((gu) => gu.id === 'xiaoguang').length, 0);
  assert.ok(gs.player.gu.some((gu) => gu.id === 'yuemang'));

  addGu(gs, 'chunqiuchan');
  assert.equal(saveSpringSnapshot(gs).ok, true);
  gs.player.dead = true;
  const rw = rewindSpringCicada(gs);
  assert.equal(rw.ok, true);
  assert.equal(rw.state.player.dead, false);
  assert.equal(realmText(rw.state.player).includes('转'), true);
});

test('月光蛊能升炼成月旋蛊或月霓裳，本命蛊成功升炼后保留绑定', () => {
  for (const [recipeId, aux, out] of [['r_yuexuan', 'xuanfeng', 'yuexuan'], ['r_yueni', 'yupi', 'yueni']]) {
    const gs = createNewGame();
    gs.player.yuanshi = 100;
    gs.player.recipes.push(recipeId);
    gs.player.benming = addGu(gs, 'yueguang').uid;
    addGu(gs, aux);
    const ref = createRefineSession(gs, recipeId);
    runRefining(gs, ref);
    assert.equal(ref.success, true);
    assert.equal(gs.player.gu.find((gu) => gu.uid === gs.player.benming)?.id, out);
    assert.ok(!gs.player.gu.some((gu) => gu.id === aux || gu.id === 'yueguang'));
  }
});

test('月痕蛊和黑鬃蛊按蛊方消耗对应的一转蛊虫', () => {
  for (const [recipe, main, aux, result] of [
    ['r_yuehen', 'yueguang', 'henshi', 'yuehen'],
    ['r_heizong', 'heishi', 'qingsi', 'heizong']
  ]) {
    const gs = createNewGame();
    gs.player.yuanshi = 100;
    gs.player.recipes.push(recipe);
    addGu(gs, main);
    assert.match(createRefineSession(gs, recipe).error, /需要 1 只/);
    assert.equal(gs.player.yuanshi, 100);
    addGu(gs, aux);
    const ref = createRefineSession(gs, recipe);
    runRefining(gs, ref, result === 'heizong' ? ['force', 'signature', 'force', 'vent'] : undefined);
    assert.equal(ref.success, true);
    assert.deepEqual(gs.player.gu.map((gu) => gu.id), [result]);
  }
});

test('幡然蛊和浪子蛊分别将四味酒虫逆炼成一只和两只酒虫', () => {
  for (const [id, expected] of [['fanran', 1], ['langzi', 2]]) {
    const gs = createNewGame();
    gs.player.yuanshi = 100;
    const recipe = `r_jiuchong_${id}`;
    gs.player.recipes.push(recipe);
    gs.player.benming = addGu(gs, 'siwei_jiu').uid;
    assert.match(createRefineSession(gs, recipe).error, /缺少/);
    assert.equal(gs.player.yuanshi, 100);
    gs.player.items[id] = 1;
    const ref = createRefineSession(gs, recipe);
    assert.equal(gs.player.items[id], 1);
    runRefining(gs, ref, ['force', 'signature', 'gentle']);
    assert.equal(gs.player.items[id], undefined);
    assert.equal(ref.success, true);
    assert.equal(gs.player.gu.length, expected);
    assert.ok(gs.player.gu.every((gu) => gu.id === 'jiuchong'));
    assert.equal(gs.player.benming, gs.player.gu[0].uid);
  }
});

test('蛊铺出售月光蛊和小光蛊的蛊方，开课不会自动习得', () => {
  const gs = createNewGame();
  gs.location = 'gupu';
  const recipes = renderPlaceView(gs);
  assert.match(recipes, /data-id="r_shipi"/);
  assert.doesNotMatch(recipes, /data-id="r_(?:chunqiuchan|chitie_sheli)"|原创/);
  gs.flags.kaike = true;
  for (const id of ['r_yueguang', 'r_xiaoguang']) {
    const recipe = REFINE_RECIPES.find((entry) => entry.id === id);
    assert.match(recipes, new RegExp(`data-id="${id}"`));
    assert.equal(isRecipeSold(recipe), true);
    assert.equal(knowsRefineRecipe(gs, recipe), false);
    assert.match(canStartRefine(gs, id).reason, /尚未习得/);
    gs.player.yuanshi = 8;
    assert.ok(purchaseRecipe(gs, id));
    assert.equal(gs.player.yuanshi, 0);
    assert.equal(knowsRefineRecipe(gs, recipe), true);
  }
  assert.ok(placeShopEntries(gs).includes('gu:yueguang'));
  assert.ok(placeShopEntries(gs).includes('gu:xiaoguang'));
});

test('聚财坊不出售光阴河水，旧档已有河水仍可喂养春秋蝉', () => {
  const gs = createNewGame();
  gs.location = 'jucaifang';
  gs.player.yuanshi = 100;
  gs.player.items.guangyin_water = 1;
  assert.equal(placeShopEntries(gs).includes('item:guangyin_water'), false);
  assert.equal(purchaseShopEntry(gs, 'item:guangyin_water', 1).ok, false);
  const cicada = addGu(gs, 'chunqiuchan', 25);
  assert.equal(feedGu(gs, cicada), true);
  assert.equal(cicada.satiety, 75);
  assert.equal(gs.player.items.guangyin_water, undefined);
  assert.equal(saveSpringSnapshot(gs).ok, true);
});

test('电狼蛊与血蝠蛊的掉落及蛊方发现相互独立', () => {
  for (const [gu, place, flag] of [['dianlang_gu', 'jiazhuge', 'clear:langchao'], ['xuefu_gu', 'xuefu', 'clear:xuefu']]) {
    const gs = createNewGame();
    const recipe = REFINE_RECIPES.find(({ out }) => out === gu);
    gs.location = place;
    addGu(gs, gu);
    assert.equal(availableRecipeDiscovery(gs), undefined);
    gs.flags[flag] = true;
    assert.equal(availableRecipeDiscovery(gs)?.id, recipe.id);
    assert.equal(knowsRefineRecipe(gs, recipe), false);
    gs.player.recipes.push(recipe.id);
    assert.equal(availableRecipeDiscovery(gs), undefined);
    assert.equal(knowsRefineRecipe(gs, recipe), true);
  }
});

test('四味酒虫缺任何一种酒都不能开炉，酒在投入时逐份扣除', () => {
  const gs = createNewGame();
  gs.player.yuanshi = 100;
  gs.player.recipes.push('r_siwei');
  addGu(gs, 'jiuchong');
  addGu(gs, 'jiuchong');
  const wines = ['suanjiu', 'tianjiu', 'kujiu', 'lajiu'];
  for (const wine of wines) gs.player.items[wine] = 1;
  for (const wine of wines) {
    delete gs.player.items[wine];
    assert.match(createRefineSession(gs, 'r_siwei').error, /缺少/);
    assert.equal(gs.player.yuanshi, 100);
    gs.player.items[wine] = 1;
  }
  const ref = createRefineSession(gs, 'r_siwei');
  assert.ok(!ref.error);
  assert.ok(wines.every((wine) => gs.player.items[wine] === 1));
  runRefining(gs, ref, ['force', 'gentle', 'signature', 'gentle', 'gentle']);
  assert.ok(wines.every((wine) => !(wine in gs.player.items)));
  assert.equal(ref.success, true);
  assert.ok(gs.player.gu.some((gu) => gu.id === 'siwei_jiu'));
  assert.ok(!gs.player.gu.some((gu) => gu.id === 'jiuchong'));
});

test('手动选料并按时机投炉，撤火只损失已投辅材和开炉费', () => {
  const gs = createNewGame();
  gs.player.yuanshi = 100;
  gs.player.recipes.push('r_siwei');
  addGu(gs, 'jiuchong');
  addGu(gs, 'jiuchong');
  for (const wine of ['suanjiu', 'tianjiu', 'kujiu', 'lajiu']) gs.player.items[wine] = 1;

  const session = createRefineSession(gs, 'r_siwei');
  stepRefineSession(gs, session, 'ignite');
  assert.equal(gs.player.items.suanjiu, 1);
  stepRefineSession(gs, session, 'force');
  assert.equal(session.turns, session.flow.turns);
  assert.equal(refineChance(session), 0);

  const wine = session.pending.findIndex(({ item }) => item === 'tianjiu');
  stepRefineSession(gs, session, `add:${wine}`, Math.random, 0.5);
  assert.equal(session.progress, 1);
  assert.equal(gs.player.items.tianjiu, undefined);
  assert.equal(gs.player.items.suanjiu, 1);

  const resumed = JSON.parse(JSON.stringify(session));
  stepRefineSession(gs, resumed, 'add:0', Math.random, 0);
  assert.equal(resumed.pressure, 1);
  assert.equal(resumed.pending.length, 4);
  stepRefineSession(gs, resumed, 'abort');
  assert.equal(resumed.state, 'aborted');
  assert.equal(gs.player.gu.length, 2);
  assert.equal(gs.player.yuanshi, 100 - session.cost);
});

test('通用炼炉可踩点鼓风，偏拍后可掀盖降温并合盖', () => {
  const gs = createNewGame();
  gs.player.yuanshi = 100;
  gs.player.recipes.push('r_yuehen');
  addGu(gs, 'yueguang');
  addGu(gs, 'henshi');
  const ref = createRefineSession(gs, 'r_yuehen');
  stepRefineSession(gs, ref, 'ignite');
  for (let i = 0; i < 2; i++) stepRefineSession(gs, ref, 'add:0', Math.random, 0.5);
  stepRefineSession(gs, ref, 'pulse', Math.random, 0);
  assert.equal(ref.progress, 2);
  assert.equal(ref.pressure, 1);
  for (let i = 0; i < 2; i++) stepRefineSession(gs, ref, 'pulse', Math.random, 0.5);
  assert.ok(ref.pressure > ref.flow.safePressure);
  stepRefineSession(gs, ref, 'vent');
  assert.equal(ref.pressure, 0);
  stepRefineSession(gs, ref, 'pulse', Math.random, 0.5);
  assert.ok(refineReady(ref));
  stepRefineSession(gs, ref, 'seal', () => 0);
  assert.equal(ref.success, true);
});

test('炼道晋级提高成算，仙蛊与舍利蛊没有本篇蛊方', () => {
  const gs = createNewGame();
  gs.player.yuanshi = 100;
  gs.player.recipes.push('r_yuehen');
  addGu(gs, 'yueguang');
  addGu(gs, 'henshi');
  gs.player.refineInsight = 2;
  const first = createRefineSession(gs, 'r_yuehen');
  loadFurnace(gs, first);
  stepRefineSession(gs, first, 'force');
  const chance = refineChance(first);
  const ready = { ...first, progress: first.flow.target, pressure: 0 };
  assert.notEqual(refineChance(ready), refineChance({ ...ready, baseRate: REFINE_RECIPES.find(({ id }) => id === 'r_yuexuan').rate }));
  assert.ok(refineChance(ready) < 1);
  stepRefineSession(gs, first, 'seal', () => 0.99);
  assert.equal(refineRealm(gs.player).name, '大师');
  assert.ok(refineChance({ ...first, realmBonus: refineRealm(gs.player).bonus }) > chance);
  for (const { id, food } of Object.values(GU_DEFS)) {
    assert.ok(ITEMS[food], id);
    assert.equal(REFINE_RECIPES.some(({ out }) => out === id), !['chunqiuchan', 'qingtong_sheli', 'chitie_sheli', 'baiyin_sheli'].includes(id), id);
  }
});

test('护蛊耗一次运炉，强行收炉或炸炉时仍保住本命蛊', () => {
  for (const overload of [false, true]) {
    const gs = createNewGame();
    gs.player.yuanshi = 100;
    gs.player.recipes.push('r_yuemang');
    gs.player.benming = addGu(gs, 'yueguang').uid;
    const aux = addGu(gs, 'xiaoguang');
    addGu(gs, 'xiaoguang');
    const ref = createRefineSession(gs, 'r_yuemang');
    assert.equal(gs.player.yuanshi, 100);
    loadFurnace(gs, ref);
    if (overload) stepRefineSession(gs, ref, `protect:${aux.uid}`);
    stepRefineSession(gs, ref, 'force');
    assert.ok(refineChance(ref) > 0 && refineChance(ref) < 1);
    if (overload) {
      for (let i = 0; i < 3; i++) stepRefineSession(gs, ref, 'force');
      assert.match(ref.lines.join(' '), /炸炉/);
    } else {
      stepRefineSession(gs, ref, 'seal', () => 0.99);
    }
    assert.equal(ref.state, 'done');
    assert.equal(ref.success, false);
    assert.deepEqual(gs.player.gu.map((gu) => gu.uid), overload ? [gs.player.benming, aux.uid] : [gs.player.benming]);
    stepRefineSession(gs, ref, 'seal', () => 0);
    assert.equal(gs.player.yuanshi, 75);
  }
});

test('月道炼蛊可在夜里引月一次，撤火只保住蛊虫', () => {
  const gs = createNewGame();
  gs.player.yuanshi = 100;
  gs.player.recipes.push('r_yuehen');
  addGu(gs, 'yueguang');
  addGu(gs, 'henshi');
  assert.equal(refineTechniques(createRefineSession(gs, 'r_yuehen')).find(({ id }) => id === 'signature').enabled, false);
  gs.minutes = makeTime(1, 3, 1, 10);
  const ref = createRefineSession(gs, 'r_yuehen');
  loadFurnace(gs, ref);
  stepRefineSession(gs, ref, 'signature');
  assert.equal(ref.progress, 2);
  stepRefineSession(gs, ref, 'signature');
  assert.equal(ref.progress, 2);
  stepRefineSession(gs, ref, 'abort');
  assert.equal(ref.state, 'aborted');
  assert.equal(gs.player.gu.length, 2);
  assert.equal(gs.player.yuanshi, 75);
});

test('自动喂蛊消耗口粮，同种蛊虫计入升阶，委托只能领赏一次', () => {
  const gs = createNewGame();
  const p = gs.player;
  addGu(gs, 'yueguang', 60);
  p.autoFeed = true;
  advanceMinutes(gs, 1440);
  assert.equal(p.gu[0].satiety, 98);
  assert.equal(p.items.yuelanhua, 5);

  p.xp = 500;
  p.xiao = 2;
  addGu(gs, 'baiyu');
  assert.equal(washMinorWall(gs).ok, false);
  for (let i = 0; i < 3; i++) addGu(gs, 'yueguang');
  const result = washMinorWall(gs);
  assert.equal(result.ok, true);
  assert.match(result.message, /气血上限 .*真元上限 .*身法/);

  gs.location = 'renwutang';
  const stones = p.yuanshi;
  recordQuestProgress(gs, 'victory', 'caoren');
  handleQuest(gs, 'caoren');
  handleQuest(gs, 'caoren');
  assert.equal(p.yuanshi, stones);
  recordQuestProgress(gs, 'victory', 'caoren');
  handleQuest(gs, 'caoren');
  handleQuest(gs, 'caoren');
  assert.equal(p.yuanshi, stones + 8);
});

test('饱食归零数日后进入虚弱无法出战，继续断粮则非本命蛊损毁', () => {
  const gs = createNewGame();
  const bm = addGu(gs, 'yueguang', 10);
  gs.player.benming = bm.uid;
  const pet = addGu(gs, 'shipi', 10);

  advanceMinutes(gs, 1440);
  assert.equal(bm.satiety, 0);
  assert.equal(bm.starveDays, 1);
  assert.equal(battleGuPlan({ ...gs, battle: { guQueue: [], cds: {} } }).choices.every((c) => !c.weak), true);

  advanceMinutes(gs, 1440);
  assert.equal(pet.starveDays, 2);
  const b = startBattle(gs, 'caoren', '', () => 0.5);
  assert.equal(battleGuPlan(gs).choices.every((c) => c.weak), true);
  battleAct(gs, 'gu', pet.uid);
  assert.deepEqual(b.guQueue, []);

  gs.battle = null;
  advanceMinutes(gs, 1440 * 3);
  assert.equal(gs.player.gu.some((g) => g.uid === pet.uid), false);
  assert.equal(gs.player.gu.some((g) => g.uid === bm.uid), true);
});

test('小光蛊可增幅进阶月道蛊，月痕蛊穿半盾，切磋不可下死手，受震须调息', () => {
  const gs = createNewGame();
  const light = addGu(gs, 'xiaoguang');
  const mark = addGu(gs, 'yuehen');
  const goldMoon = addGu(gs, 'huangjinyue');
  gs.player.zy = gs.player.zyMax = 60;

  const b = startBattle(gs, 'caoren', '切磋', () => 0.5);
  battleAct(gs, 'lethal');
  assert.equal(b.lethal, false);

  b.foe.hpMax = 200;
  b.foe.hp = 200;
  b.foe.shield = 20;
  battleAct(gs, 'gu', light.uid);
  battleAct(gs, 'gu', mark.uid);
  battleAct(gs, 'resolveGu', '', () => 0.5);
  // 22 * 1.35 = 30；穿半盾，最多被挡 15，造成 15 伤害
  assert.equal(b.foe.shield, 5);
  assert.equal(b.foe.hp, 185);

  b.foe.shield = 0;
  b.cds = {};
  const hpBefore = b.foe.hp;
  battleAct(gs, 'gu', light.uid);
  battleAct(gs, 'gu', goldMoon.uid);
  battleAct(gs, 'resolveGu', '', () => 0.5);
  assert.equal(hpBefore - b.foe.hp, Math.round(58 * 1.35));

  b.playerStunned = true;
  const round = b.round;
  battleAct(gs, 'attack', '', () => 0.5);
  assert.equal(b.round, round);
  battleAct(gs, 'recover', '', () => 0.5);
  assert.equal(b.playerStunned, false);
  assert.equal(b.round, round + 1);
});

test('三转蛊虫可由二转蛊合炼并满足三转破壁条件', () => {
  const gs = createNewGame();
  gs.player.rank = 2;
  gs.player.xiao = 3;
  gs.player.zy = gs.player.zyMax;
  gs.player.yuanshi = 300;
  gs.player.items.yuanshi_zha = 4;
  gs.player.recipes.push('r_huangjinyue');
  addGu(gs, 'yuemang');
  addGu(gs, 'yuehen');

  const ref = createRefineSession(gs, 'r_huangjinyue');
  assert.ok(!ref.error);
  runRefining(gs, ref);
  assert.equal(ref.success, true);
  assert.ok(gs.player.gu.some((g) => g.id === 'huangjinyue'));
  gs.player.zy = gs.player.zyMax;
  assert.ok(!createBreakSession(gs).error);
});

function caravanGame(firstChoice) {
  const gs = createNewGame();
  gs.minutes = makeTime(2, 3, 2);
  gs.pendingEventId = 'jia_missing';
  for (const id of ['kaike', 'uncle', 'classmates', 'wine_lead', 'early_sheli', 'jiuyecao_inheritance', 'nianmo_exam', 'wolf_signs']) {
    gs.flags[`event_done:${id}`] = true;
  }
  gs.flags.kaike = true;
  applyEventChoice(gs, 'jia_missing', firstChoice);
  return gs;
}

function caravanHearing(gs, choice) {
  advanceMinutes(gs, makeTime(2, 3, 6) - gs.minutes);
  assert.equal(gs.pendingEventId, 'jia_questions');
  applyEventChoice(gs, 'jia_questions', choice);
}

function caravanScene(gs, place, id, choice) {
  gs.location = place;
  assert.equal(checkStoryTriggers(gs, id)?.id, id);
  applyEventChoice(gs, id, choice);
}

test('人物好感和信任分别封顶，存档恢复保留绝对值', () => {
  const gs = createNewGame();
  assert.deepEqual(storyRelation(gs, 'bainingbing'), { favor: -5, trust: 0, progress: '' });
  changeStoryRelation(gs, 'bainingbing', 250, -150, '初见');
  assert.deepEqual(storyRelation(gs, 'bainingbing'), { favor: 100, trust: -100, progress: '初见' });
  assert.ok(evalCond(gs, 'favor:bainingbing:100&!trust:bainingbing:0'));
  changeStoryRelation(gs, 'bainingbing', -107, 120);
  const restored = importProgress(JSON.stringify(gs));
  assert.deepEqual(storyRelation(restored, 'bainingbing'), { favor: -7, trust: 20, progress: '初见' });
  assert.equal(evalCond(restored, 'trust:unknown:0'), false);
});

test('商队卷宗需要互证，铁家回信在两日后开启听证选择', () => {
  const gs = caravanGame(0);
  assert.equal(gs.story.quests.caravan.stage, 'investigate');
  assert.match(renderBagView(gs, 'journal'), /雨中足迹与失物/);
  caravanHearing(gs, 0);
  assert.equal(gs.story.quests.caravan.stage, 'verify');

  gs.location = 'renwutang';
  assert.ok(checkStoryTriggers(gs, 'jia_submit_case'));
  applyEventChoice(gs, 'jia_submit_case', 0);
  assert.equal(gs.pendingEventId, 'jia_submit_case');
  gs.pendingEventId = null;
  caravanScene(gs, 'kezhan', 'jia_witness_visit', 0);
  caravanScene(gs, 'renwutang', 'jia_submit_case', 0);
  assert.equal(gs.story.quests.caravan.stage, 'completed');
  assert.equal(gs.story.quests.caravan.outcome, 'iron');
  assert.equal(checkStoryTriggers(gs, 'jia_missing'), null);
  assert.equal(checkStoryTriggers(gs, 'jia_road_visit'), null);
  assert.equal(nextRetreatTime(gs), gs.story.quests.caravan.followupAt);
  advanceMinutes(gs, 2 * MIN_PER_DAY - 1);
  assert.equal(gs.pendingEventId, null);
  advanceMinutes(gs, 1);
  assert.equal(gs.pendingEventId, 'jia_case_followup');
  assert.doesNotMatch(renderEventModal(gs, 'tie_inquiry'), /出示复核卷宗/);
  applyEventChoice(gs, 'jia_case_followup', 0);
  assert.match(renderEventModal(gs, 'tie_inquiry'), /出示复核卷宗/);
  assert.match(renderBagView(gs, 'journal'), /铁若男的复核回函/);
});

test('贾富只向可信玩家公开私账，回信和危机援助跨刷新且只结算一次', () => {
  const suspicious = caravanGame(0);
  caravanHearing(suspicious, 2);
  suspicious.location = 'gupu';
  assert.equal(checkStoryTriggers(suspicious, 'jia_private_ledger'), null);

  const gs = caravanGame(2);
  caravanHearing(gs, 2);
  gs.location = 'gupu';
  assert.match(renderPlaceView(gs), /贾富的私账/);
  caravanScene(gs, 'gupu', 'jia_private_ledger', 0);
  let raw;
  const storage = { setItem: (_, value) => { raw = value; }, getItem: () => raw };
  assert.ok(saveGame(gs, storage));
  const loaded = loadGame(storage);
  assert.deepEqual(loaded.story, gs.story);
  caravanScene(loaded, 'renwutang', 'jia_submit_case', 1);
  advanceMinutes(loaded, 2 * MIN_PER_DAY);
  assert.ok(saveGame(loaded, storage));
  const letter = loadGame(storage);
  assert.equal(letter.pendingEventId, 'jia_case_followup');
  const stones = letter.player.yuanshi;
  applyEventChoice(letter, 'jia_case_followup', 1);
  assert.ok(saveGame(letter, storage));
  const finished = loadGame(storage);
  applyEventChoice(finished, 'jia_case_followup', 1);
  assert.equal(checkStoryTriggers(finished, 'jia_case_followup'), null);
  assert.equal(finished.player.yuanshi, stones + 24);
  assert.match(renderEventModal(finished, 'wolf_breach'), /用贾富留下的货车/);
});

test('放弃、扣款和逾期会归档为失败，铁家听证仍有可选路线', () => {
  for (const [opening, choice, outcome] of [[2, 2, 'refused'], [1, 3, 'theft'], [0, null, 'expired']]) {
    const gs = caravanGame(opening);
    caravanHearing(gs, 2);
    if (choice !== null) {
      caravanScene(gs, 'renwutang', 'jia_submit_case', choice);
      advanceMinutes(gs, 2 * MIN_PER_DAY);
      assert.equal(gs.pendingEventId, 'jia_case_followup');
      applyEventChoice(gs, 'jia_case_followup', opening === 1 ? 2 : 3);
    }
    assert.match(renderEventModal(gs, 'tie_inquiry'), /领取协查文书|迎战铁家追兵/);
    gs.pendingEventId = 'tie_inquiry';
    applyEventChoice(gs, 'tie_inquiry', gs.player.mo >= 30 ? 2 : 1);
    assert.equal(gs.story.quests.caravan.stage, 'failed');
    assert.equal(gs.story.quests.caravan.outcome, outcome);
    assert.equal(checkStoryTriggers(gs, 'jia_missing'), null);
    assert.match(renderBagView(gs, 'journal'), /已失败/);
    if (opening === 1) assert.equal(storyRelation(gs, 'tieruonan').trust, -15);
  }
});

test('延迟回信等待进行中的战斗、会话和已有剧情，遭遇战不会遮住刚触发的剧情', () => {
  for (const blocker of ['battle', 'refining', 'breakthrough', 'pendingEventId']) {
    const gs = caravanGame(2);
    caravanHearing(gs, 2);
    caravanScene(gs, 'renwutang', 'jia_submit_case', 2);
    gs[blocker] = blocker === 'pendingEventId' ? 'uncle' : {};
    advanceMinutes(gs, 2 * MIN_PER_DAY);
    assert.equal(gs.pendingEventId, blocker === 'pendingEventId' ? 'uncle' : null);
    delete gs[blocker];
    assert.equal(checkStoryTriggers(gs)?.id, 'jia_case_followup');
  }
  const gs = caravanGame(2);
  caravanHearing(gs, 2);
  caravanScene(gs, 'renwutang', 'jia_submit_case', 2);
  gs.minutes = gs.story.quests.caravan.followupAt - 1;
  gs.location = 'zhulin';
  performPlaceAction(gs, 'exploreFight');
  assert.equal(gs.pendingEventId, 'jia_case_followup');
  assert.equal(gs.battle, null);
});

test('旧存档和春秋蝉旧影按已有旗标迁移，保留原奖励和路线', () => {
  const gs = caravanGame(0);
  caravanHearing(gs, 0);
  Object.assign(gs.flags, { chi_faction: true, tie_bond: true, bai_read: true });
  delete gs.story;
  gs.snapshot = JSON.parse(JSON.stringify(gs));
  const raw = JSON.stringify(gs);
  const loaded = loadGame({ getItem: () => raw });
  assert.equal(loaded.story.quests.caravan.stage, 'completed');
  assert.equal(loaded.story.quests.caravan.followupAt, null);
  assert.deepEqual(loaded.snapshot.story, loaded.story);
  assert.deepEqual(loaded.story.quests.caravan.clues, ['tracks']);
  assert.equal(loaded.player.yuanshi, gs.player.yuanshi);
  assert.match(renderEventModal(loaded, 'three_clans'), /护盾 28/);
  assert.match(renderBagView(loaded, 'journal'), /旧档记录/);
  assert.equal(checkStoryTriggers(loaded, 'jia_missing'), null);
  assert.equal(checkStoryTriggers(loaded, 'jia_case_followup'), null);
});

test('白凝冰切磋胜负影响大比准备，战后重复确认不再改变关系', () => {
  const gs = createNewGame();
  gs.pendingEventId = 'bai_encounter';
  gs.flags.tie_cleared = true;
  applyEventChoice(gs, 'bai_encounter', 0);
  assert.doesNotMatch(renderEventModal(gs, 'three_clans'), /护盾 28/);
  gs.battle.foe.hp = 1;
  battleAct(gs, 'attack', '', () => 0.5);
  finishStoryBattle(gs);
  assert.match(renderEventModal(gs, 'three_clans'), /护盾 28/);
  const relation = storyRelation(gs, 'bainingbing');
  assert.equal(finishStoryBattle(gs), false);
  assert.deepEqual(storyRelation(gs, 'bainingbing'), relation);
});

function localStoryGame() {
  const gs = createNewGame('剧情验收', { grade: '乙', hai: 7 });
  gs.pendingEventId = null;
  gs.flags.kaike = true;
  return gs;
}

function finishLocalScene(gs, place, id, choice = 0) {
  gs.location = place;
  assert.ok(availableLocalScenes(gs).some((event) => event.id === id), id);
  assert.equal(checkStoryTriggers(gs, id)?.id, id);
  applyEventChoice(gs, id, choice);
  assert.equal(gs.pendingEventId, null, id);
  assert.ok(gs.story.history[id], id);
  assert.equal(checkStoryTriggers(gs, id), null, id);
}

test('五条新支线可逐阶段走完两种结局，读档保留线索和后续选择', () => {
  const paths = [
    ['estate', 'event_done:uncle', [
      ['renwutang', 'estate_start'], ['renwutang', 'estate_receipt'], ['kezhan', 'estate_terms']
    ], ['public', 'private'], [
      ['tie_inquiry', /在册的证人和伤者/], ['jiuyecao_inheritance', /先把药圃收入留给赈济/]
    ]],
    ['grotto', 'clue:huajiu', [
      ['huajiu', 'grotto_start'], ['huajiu', 'grotto_measure', 1], ['huajiu', 'grotto_dispose']
    ], ['closed', 'marked'], [
      ['qingmao_endgame', /隐蔽路线避过混战/], ['wolf_breach', /循遗洞记号开通水道/]
    ]],
    ['hunter', 'kaike', [
      ['kezhan', 'hunter_start'], ['zhulin', 'hunter_spoor'], ['renwutang', 'hunter_report']
    ], ['patrol', 'hidden'], [
      ['langchao_start', /用备好的药粮接济守军/], ['langchao_start', /随猎户从私道引走/]
    ]],
    ['survivors', 'event_done:langchao_start', [
      ['yaotang', 'survivor_start'], ['yaotang', 'survivor_roster'], ['renwutang', 'survivor_terms']
    ], ['record', 'shelter'], [
      ['tie_inquiry', /在册的证人和伤者/], ['qingmao_endgame', /隐蔽路线避过混战/]
    ]],
    ['furnace', 'event_done:wine_lead', [
      ['gupu', 'furnace_start'], ['gupu', 'furnace_check', 1], ['renwutang', 'furnace_terms']
    ], ['open', 'private'], [
      ['wolf_breach', /开炉坊的公示后巷/], ['wolf_breach', /商人签过的药费单/]
    ]]
  ];
  for (const [questId, flag, steps, outcomes, exits] of paths) {
    for (const outcomeIndex of [0, 1]) {
      let gs = localStoryGame();
      const quest = STORY_QUESTS[questId];
      gs.flags[flag] = true;
      finishLocalScene(gs, ...steps[0]);
      assert.equal(gs.story.quests[questId].stage, Object.keys(quest.steps)[0]);
      gs = importProgress(JSON.stringify(gs));
      finishLocalScene(gs, ...steps[1]);
      assert.equal(gs.story.quests[questId].stage, Object.keys(quest.steps)[1]);
      assert.deepEqual(gs.story.quests[questId].clues, Object.keys(quest.clues));
      gs = importProgress(JSON.stringify(gs));
      finishLocalScene(gs, ...steps[2], outcomeIndex);
      const loaded = importProgress(JSON.stringify(gs));
      assert.equal(loaded.story.quests[questId].stage, 'completed');
      assert.equal(loaded.story.quests[questId].outcome, outcomes[outcomeIndex]);
      const [main, text] = exits[outcomeIndex];
      assert.match(renderEventModal(loaded, main), text);
      const [otherMain, otherText] = exits[1 - outcomeIndex];
      assert.doesNotMatch(renderEventModal(loaded, otherMain), otherText);
      assert.match(renderBagView(loaded, 'journal'), /已完成/);
    }
  }
});

test('漠北、赤城和白凝冰均有完整的合作与竞争路线，分支影响主线', () => {
  for (const rival of [0, 1]) {
    const mobei = localStoryGame();
    mobei.flags['event_done:classmates'] = true;
    finishLocalScene(mobei, 'yanwu', 'mobei_roster', rival);
    assert.equal(checkStoryTriggers(mobei, 'mobei_watch'), null);
    mobei.flags['event_done:nianmo_exam'] = true;
    finishLocalScene(mobei, 'yanwu', 'mobei_watch', rival);
    mobei.flags['event_done:langchao_start'] = true;
    finishLocalScene(mobei, 'yanwu', 'mobei_wall', rival);
    mobei.player.rank = 2;
    assert.equal(renderEventModal(mobei, 'wolf_breach').includes('把后队调到东门'), !rival);
    assert.equal(renderEventModal(mobei, 'three_clans').includes('公开比试约一并呈上'), Boolean(rival));

    const chi = localStoryGame();
    chi.flags['event_done:classmates'] = true;
    finishLocalScene(chi, 'jucaifang', 'chi_delivery', rival);
    assert.equal(checkStoryTriggers(chi, 'chi_quota'), null);
    chi.minutes = makeTime(2, 1, 1);
    finishLocalScene(chi, 'jucaifang', 'chi_quota', rival);
    chi.flags['event_done:wolf_breach'] = true;
    finishLocalScene(chi, 'jucaifang', 'chi_guarantee', rival);
    assert.equal(renderEventModal(chi, 'tie_inquiry').includes('赤城签过的互保文书'), !rival);
    assert.equal(renderEventModal(chi, 'three_clans').includes('出示公买凭据'), Boolean(rival));

    const bai = localStoryGame();
    bai.flags['event_done:classmates'] = true;
    finishLocalScene(bai, 'zhulin', 'bai_footprints', rival);
    bai.flags['event_done:bai_encounter'] = true;
    finishLocalScene(bai, 'zhulin', 'bai_after_spar', rival);
    bai.flags.tie_cleared = true;
    assert.equal(renderEventModal(bai, 'three_clans').includes('与白凝冰交换的起手'), !rival);
    bai.flags['event_done:three_clans'] = true;
    finishLocalScene(bai, 'zhulin', 'bai_broken_flag', rival);
    assert.equal(renderEventModal(bai, 'qingmao_endgame').includes('白凝冰指过的落脚点'), Boolean(rival));
    assert.equal(renderEventModal(bai, 'qingmao_endgame').includes('带人出山'), !rival);
  }
});

test('七种见闻可在各自地点时辰触发，冷却、进行中的剧情及已阅状态均跨档', () => {
  const sightings = [
    ['life_inn', 'kezhan', 0, () => {}],
    ['life_carrier', 'jucaifang', 6, (gs) => { gs.flags.chi_open_books = true; }],
    ['life_school', 'xuetang', 6, (gs) => { gs.minutes = makeTime(1, 5, 1, 6); }],
    ['life_apprentice', 'gupu', 6, (gs) => { gs.player.benming = addGu(gs, 'yueguang').uid; }],
    ['life_whisper', 'kezhan', 0, (gs) => {
      gs.flags['event_done:life_inn'] = true;
      gs.player.rank = 2;
      changeStoryRelation(gs, 'jiafu', 10, 0);
      gs.story.quests.caravan = { stage: 'verify', clues: ['ledger'], followupAt: null };
    }],
    ['life_bamboo', 'zhulin', 6, (gs) => { gs.flags.practiced = true; }],
    ['life_east_lamp', 'yaotang', 0, (gs) => { gs.flags['event_done:langchao_start'] = true; }]
  ];
  for (const [id, place, time, prep] of sightings) {
    let gs = localStoryGame();
    gs.minutes = makeTime(2, 3, 1, time);
    gs.location = place;
    prep(gs);
    assert.equal(hasLocalLifeScene(gs), true, id);
    assert.equal(checkStoryTriggers(gs, id), null);
    assert.equal(lookForLifeScene(gs, () => 0.99).event, undefined);
    gs = importProgress(JSON.stringify(gs));
    assert.equal(hasLocalLifeScene(gs), false, id);
    assert.match(lookForLifeScene(gs, () => 0).message, /过些时辰/);
    gs.minutes = gs.story.lifeReadyAt;
    assert.equal(hasLocalLifeScene(gs), true, id);
    assert.equal(lookForLifeScene(gs, () => 0).event?.id, id);
    const readyAt = gs.story.lifeReadyAt;
    gs = importProgress(JSON.stringify(gs));
    assert.equal(gs.pendingEventId, id);
    assert.equal(gs.story.lifeReadyAt, readyAt);
    assert.equal(lookForLifeScene(gs, () => 0).event, undefined);
    const event = STORY_EVENTS.find((entry) => entry.id === id);
    const choice = event.choices.findIndex((entry) => evalCond(gs, entry.cond));
    assert.ok(choice >= 0);
    applyEventChoice(gs, id, choice);
    assert.equal(hasLocalLifeScene(gs), false, id);
    gs.minutes = readyAt;
    assert.equal(hasLocalLifeScene(gs), false, id);
    assert.notEqual(lookForLifeScene(gs, () => 0).event?.id, id);
    if (id === 'life_inn') assert.equal(gs.story.quests.hunter.stage, 'spoor');
    if (id === 'life_apprentice') assert.equal(gs.story.quests.furnace.stage, 'inspect');
  }
  const gs = localStoryGame();
  gs.location = 'kezhan';
  gs.minutes = makeTime(1, 5, 1, 6);
  assert.equal(hasLocalLifeScene(gs), false);
  assert.equal(lookForLifeScene(gs, () => 0).event, undefined);
  assert.equal(gs.story.lifeReadyAt, undefined);
  gs.minutes = makeTime(1, 5, 1);
  assert.equal(hasLocalLifeScene(gs), true);
  for (const blocker of ['battle', 'refining', 'breakthrough', 'pendingEventId']) {
    gs[blocker] = {};
    assert.equal(hasLocalLifeScene(gs), false);
    assert.match(lookForLifeScene(gs, () => 0).message, /眼下不便/);
    delete gs[blocker];
  }
});

test('见闻按钮受日期、前置剧情和关系条件限制', () => {
  const gs = localStoryGame();
  gs.location = 'jucaifang';
  gs.flags.chi_open_books = true;
  gs.minutes = makeTime(1, 12, 15, 6);
  assert.equal(hasLocalLifeScene(gs), false);
  gs.minutes = makeTime(2, 1, 1, 6);
  assert.equal(hasLocalLifeScene(gs), true);
  gs.minutes = makeTime(2, 6, 1, 6);
  assert.equal(hasLocalLifeScene(gs), false);

  gs.location = 'yaotang';
  gs.minutes = makeTime(2, 6, 1);
  assert.equal(hasLocalLifeScene(gs), false);
  gs.flags['event_done:langchao_start'] = true;
  assert.equal(hasLocalLifeScene(gs), true);

  gs.location = 'kezhan';
  gs.flags['event_done:life_inn'] = true;
  gs.player.rank = 2;
  gs.story.quests.caravan = { stage: 'verify', clues: ['ledger'] };
  assert.equal(hasLocalLifeScene(gs), false);
  changeStoryRelation(gs, 'jiafu', 10, 0);
  assert.equal(hasLocalLifeScene(gs), true);
});

test('行纪人物资料按相遇、交往及个人线结局解锁，旧档和读档都可还原', () => {
  const gs = localStoryGame();
  const profiles = (game = gs) => renderBagView(game, 'journal').match(/<h3>人物关系<\/h3>(.*?)<\/section>/s)[1];
  assert.equal(profiles(gs).match(/未知人物/g).length, 6);
  changeStoryRelation(gs, 'tieruonan', 30, 40, '收到卷宗');
  gs.flags.jia_iron_review = true;
  assert.doesNotMatch(profiles(), /铁若男|铁血冷|收到卷宗/);

  gs.flags['event_done:classmates'] = true;
  assert.match(profiles(), /古月漠北.*古月赤城/s);
  assert.doesNotMatch(profiles(), /带同窗练出|公开竞争可换来/);
  gs.flags['event_done:mobei_watch'] = true;
  assert.match(profiles(), /带同窗练出/);
  assert.doesNotMatch(profiles(), /公开竞争可换来/);
  gs.flags['event_done:mobei_wall'] = true;
  assert.match(profiles(importProgress(JSON.stringify(gs))), /公开竞争可换来/);

  gs.flags['event_done:jia_questions'] = true;
  assert.match(profiles(), /贾家行商/);
  assert.doesNotMatch(profiles(), /护住同行伙计/);
  gs.flags['event_done:jia_private_ledger'] = true;
  assert.match(profiles(), /找出贾金生的去向/);
  gs.flags['event_done:tie_inquiry'] = true;
  assert.match(profiles(), /铁若男.*铁血冷/s);
  assert.doesNotMatch(profiles(), /铁家办案公信/);
  gs.flags.tie_cleared = true;
  assert.match(profiles(importProgress(JSON.stringify(gs))), /铁家办案公信/);
});

test('商队封帖保留至读档，依然可以使用寨中蛊铺，补录证人可参与听证', () => {
  const gs = caravanGame(1);
  caravanHearing(gs, 3);
  const loaded = importProgress(JSON.stringify(gs));
  loaded.location = 'gupu';
  assert.match(renderPlaceView(loaded), /贾家封了你的货帖/);
  assert.ok(placeShopEntries(loaded).includes('gu:yueguang'));
  assert.ok(!placeShopEntries(loaded).includes('gu:jiuchong'));
  assert.equal(purchaseShopEntry(loaded, 'gu:jiuchong', 1).ok, false);
  const witness = caravanGame(0);
  caravanHearing(witness, 0);
  finishLocalScene(witness, 'kezhan', 'jia_witness_visit');
  finishLocalScene(witness, 'renwutang', 'jia_submit_case');
  advanceMinutes(witness, 2 * MIN_PER_DAY);
  applyEventChoice(witness, 'jia_case_followup', 0);
  finishLocalScene(witness, 'renwutang', 'jia_safe_statement');
  assert.match(renderEventModal(witness, 'tie_inquiry'), /手压着自己写下的证词/);
});

test('真实炼蛊成果、狼潮旧行径与救济物资改变可选剧情', () => {
  const gs = localStoryGame();
  gs.flags['event_done:wine_lead'] = true;
  gs.flags['event_done:langchao_start'] = true;
  gs.player.yuanshi = 100;
  gs.player.recipes.push('r_yuexuan');
  addGu(gs, 'yueguang');
  addGu(gs, 'xuanfeng');
  runRefining(gs, createRefineSession(gs, 'r_yuexuan'));
  assert.equal(gs.flags.story_refined_gu, true);
  finishLocalScene(gs, 'gupu', 'furnace_start');
  finishLocalScene(gs, 'gupu', 'furnace_check');
  finishLocalScene(gs, 'renwutang', 'furnace_terms', 2);
  assert.match(renderEventModal(gs, 'qingmao_endgame'), /带人出山/);
  finishLocalScene(gs, 'yaotang', 'survivor_start');
  finishLocalScene(gs, 'yaotang', 'survivor_roster');
  gs.player.items.zhixuegao = 2;
  finishLocalScene(gs, 'renwutang', 'survivor_terms', 2);
  assert.equal(gs.player.items.zhixuegao, undefined);
  assert.doesNotMatch(renderEventModal(gs, 'tie_inquiry'), /承认改引狼道/);
  gs.pendingEventId = 'wolf_breach';
  gs.flags.wolf_trail = true;
  applyEventChoice(gs, 'wolf_breach', 1);
  assert.match(renderEventModal(gs, 'tie_inquiry'), /有人动了路|把改引狼道的经过写进案卷/);
  gs.pendingEventId = 'tie_inquiry';
  const hearing = STORY_EVENTS.find(({ id }) => id === 'tie_inquiry');
  applyEventChoice(gs, 'tie_inquiry', hearing.choices.findIndex(({ text }) => text.includes('改引狼道')));
  assert.equal(gs.flags.wolf_betrayal_admitted, true);
  assert.equal(gs.flags.tie_bond, true);
});

test('方源夜行的线索能提前指向遗洞，也能留到铁家查验值夜记录', () => {
  for (const choice of [0, 1]) {
    const gs = localStoryGame();
    gs.pendingEventId = 'toumin_lost';
    gs.flags.toumin_race = true;
    applyEventChoice(gs, 'toumin_lost', 1);
    finishLocalScene(gs, 'kezhan', 'fangyuan_night_road', choice);
    assert.equal(Boolean(gs.flags['clue:huajiu']), choice === 0);
    gs.story.quests.caravan = { stage: 'verify', clues: ['trail'], followupAt: null };
    assert.equal(renderEventModal(gs, 'tie_inquiry').includes('方源交卷当晚'), choice === 1);
  }
});

test('保护商队证人能换来私路救援，撤离分支可在原终章结算', () => {
  const gs = caravanGame(0);
  caravanHearing(gs, 0);
  finishLocalScene(gs, 'kezhan', 'jia_witness_visit');
  finishLocalScene(gs, 'renwutang', 'jia_submit_case');
  advanceMinutes(gs, MIN_PER_DAY * 2);
  applyEventChoice(gs, 'jia_case_followup', 0);
  finishLocalScene(gs, 'renwutang', 'jia_safe_statement', 1);
  gs.pendingEventId = 'wolf_breach';
  const rescue = STORY_EVENTS.find(({ id }) => id === 'wolf_breach');
  applyEventChoice(gs, rescue.id, rescue.choices.findIndex(({ text }) => text.includes('证人走过的私路')));
  assert.equal(gs.flags.wolf_rescue, true);
  gs.pendingEventId = 'qingmao_endgame';
  const endgame = STORY_EVENTS.find(({ id }) => id === 'qingmao_endgame');
  applyEventChoice(gs, endgame.id, endgame.choices.findIndex(({ text }) => text.includes('带人出山')));
  assert.equal(gs.flags.qingmao_finished, true);
  assert.equal(gs.flags.escape_with_survivors, true);
  gs.location = 'zhaimen';
  assert.equal(performPlaceAction(gs, 'escapeMountain').won, true);
  assert.equal(gs.player.escapedMountain, true);
});

test('修行指引在夺得头名、错过交卷和错过领蛊后都能接到出寨历练', () => {
  for (const route of ['win', 'lateSubmit', 'lateClaim']) {
    const gs = createNewGame();
    const p = gs.player;
    applyEventChoice(gs, 'kaike', 0);
    assert.equal(mainGrowthGoal(gs).place, 'xuetang');
    assert.match(renderGoalShortcut(gs, mainGrowthGoal(gs)), /data-id="xuetang"/);
    if (route === 'lateClaim') {
      gs.minutes = makeTime(1, 3, 3);
      assert.equal(checkStoryTriggers(gs)?.id, 'toumin_lost');
      applyEventChoice(gs, 'toumin_lost', 1);
      assert.equal(mainGrowthGoal(gs).place, 'xuetang');
    }
    assert.ok(moveToPlace(gs, 'xuetang').ok);
    performPlaceAction(gs, 'pickBenming');
    assert.equal(mainGrowthGoal(gs).tab, 'cultivation');
    assert.match(renderCultivationView(gs, mainGrowthGoal(gs)), /data-action="refineBenming"/);
    assert.ok(refineBenming(gs).ok);
    if (route !== 'lateClaim') assert.equal(mainGrowthGoal(gs).place, 'xuetang');

    if (route === 'win') {
      assert.equal(checkStoryTriggers(gs, 'toumin_win')?.id, 'toumin_win');
      const stones = p.yuanshi;
      applyEventChoice(gs, 'toumin_win', 0);
      assert.equal(p.yuanshi, stones + 20);
    } else if (route === 'lateSubmit') {
      gs.minutes = makeTime(1, 3, 3);
      assert.equal(checkStoryTriggers(gs)?.id, 'toumin_lost');
      applyEventChoice(gs, 'toumin_lost', 0);
    }

    assert.equal(mainGrowthGoal(gs).place, 'yanwu');
    assert.ok(moveToPlace(gs, 'yanwu').ok);
    assert.ok(performPlaceAction(gs, 'caoren').ok);
    gs.battle.state = 'win';
    assert.ok(finishStoryBattle(gs));
    assert.equal(mainGrowthGoal(gs).place, 'zhulin');
    assert.match(renderGoalShortcut(gs, mainGrowthGoal(gs)), /data-id="zhulin"/);
    assert.ok(moveToPlace(gs, 'zhulin').ok);
  }
});

test('修行页与冲刷、破壁共用蛊虫、修为和真元门槛', () => {
  const gs = createNewGame('测试者', { grade: '丙', hai: 5, desc: '' });
  const p = gs.player;
  addGu(gs, 'yueguang');
  addGu(gs, 'shipi');
  const minor = nextRealmRequirements(p);
  assert.equal(minor.zy, Math.round(p.zyMax * 0.75));
  assert.equal(minor.gu.count, minor.gu.need);
  assert.match(renderCultivationView(gs, mainGrowthGoal(gs)), /下一境界 · 一转中阶/);
  p.xp = minor.xp - 1;
  p.zy = minor.zy;
  assert.match(washMinorWall(gs).reason, /修为不足/);
  p.xp++;
  p.zy--;
  assert.match(washMinorWall(gs).reason, /真元不足/);
  p.zy++;
  assert.ok(washMinorWall(gs).ok);

  p.xiao = 3;
  const major = nextRealmRequirements(p);
  assert.equal(major.xp, 0);
  assert.equal(major.gu.count, 0);
  assert.equal(createBreakSession(gs).error, major.gu.text);
  addGu(gs, 'yuehen');
  p.zy = nextRealmRequirements(p).zy - 1;
  assert.match(createBreakSession(gs).error, /真元/);
  p.zy++;
  assert.equal(createBreakSession(gs).state, 'ongoing');
  p.rank = 4;
  assert.equal(nextRealmRequirements(p), null);
});

test('首次出寨试炼和重复巡守串起竹林行动、跨存档交付与单次领赏', () => {
  const storage = new Map();
  const save = { setItem: (key, value) => storage.set(key, value), getItem: (key) => storage.get(key) };
  let gs = createNewGame('试炼者', { grade: '丙', hai: 5, desc: '' });
  applyEventChoice(gs, 'kaike', 0);
  moveToPlace(gs, 'xuetang');
  claimBenming(gs);
  refineBenming(gs);
  assert.equal(checkStoryTriggers(gs, 'toumin_win')?.id, 'toumin_win');
  applyEventChoice(gs, 'toumin_win', 0);
  assert.ok(moveToPlace(gs, 'yanwu').ok);
  assert.ok(performPlaceAction(gs, 'caoren').ok);
  for (let i = 0; i < 10 && gs.battle.state === 'ongoing'; i++) battleAct(gs, 'attack', '', () => 0.5);
  assert.equal(gs.battle.state, 'win');
  finishStoryBattle(gs);
  assert.equal(mainGrowthGoal(gs).place, 'zhulin');
  assert.ok(moveToPlace(gs, 'zhulin').ok);
  assert.match(renderPlaceView(gs), /勘察兽径/);
  const unscoutedBoss = structuredClone(gs);
  assert.ok(performPlaceAction(unscoutedBoss, 'exploreBoss').ok);
  assert.equal(unscoutedBoss.battle.scouted, false);
  assert.ok(performPlaceAction(gs, 'fieldScout').ok);
  const scoutedBoss = structuredClone(gs);
  assert.ok(performPlaceAction(scoutedBoss, 'exploreBoss').ok);
  assert.equal(scoutedBoss.battle.scouted, true);
  const petals = gs.player.items.yuelanhua;
  assert.ok(performPlaceAction(gs, 'gatherPetals').ok);
  assert.equal(gs.player.items.yuelanhua, petals + 2);
  assert.match(renderPlaceView(gs), /2\/3/);

  assert.ok(performPlaceAction(gs, 'exploreFight').ok);
  assert.equal(gs.battle.scouted, true);
  battleAct(gs, 'flee', '', () => 0);
  assert.equal(gs.battle.state, 'fled');
  finishStoryBattle(gs);
  assert.equal(mainGrowthGoal(gs).place, 'zhulin');
  assert.ok(performPlaceAction(gs, 'exploreFight').ok);
  for (let i = 0; i < 10 && gs.battle.state === 'ongoing'; i++) {
    battleAct(gs, 'gu', gs.player.benming);
    battleAct(gs, 'resolveGu', '', () => 0.5);
  }
  assert.equal(gs.battle.state, 'win');
  finishStoryBattle(gs);
  assert.equal(mainGrowthGoal(gs).place, 'renwutang');
  assert.equal(performPlaceAction(gs, 'fieldReward:healing').ok, false);

  assert.ok(saveGame(gs, save));
  gs = loadGame(save);
  assert.equal(mainGrowthGoal(gs).place, 'renwutang');
  assert.ok(moveToPlace(gs, 'renwutang').ok);
  assert.match(renderPlaceView(gs), /止血草膏 ×3/);
  assert.match(renderPlaceView(gs), /勘察竹林兽径/);
  assert.match(renderPlaceView(gs), /3\/3/);
  const stones = gs.player.yuanshi;
  assert.ok(performPlaceAction(gs, 'fieldReward:healing').ok);
  assert.equal(gs.player.items.zhixuegao, 3);
  assert.equal(gs.player.yuanshi, stones + 6);
  assert.equal(performPlaceAction(gs, 'fieldReward:stones').ok, false);
  assert.ok(performPlaceAction(gs, 'fieldPatrol').ok);
  assert.equal(performPlaceAction(gs, 'fieldPatrol').ok, false);
  assert.match(renderPlaceView(gs), /竹林巡守[\s\S]*0\/3[\s\S]*勘察竹林兽径/);
  assert.doesNotMatch(renderCultivationView(gs, mainGrowthGoal(gs)), /<h3>竹林巡守<\/h3>|勘察竹林兽径/);
  assert.ok(moveToPlace(gs, 'zhulin').ok);
  assert.match(renderPlaceView(gs), /0\/3/);

  // 复巡可先采集再勘察，重复采集仍只算一项。
  performPlaceAction(gs, 'gather');
  performPlaceAction(gs, 'gather');
  assert.match(renderPlaceView(gs), /1\/3/);
  performPlaceAction(gs, 'fieldScout');
  performPlaceAction(gs, 'exploreFight');
  gs.battle.foe.hp = 1;
  battleAct(gs, 'attack', '', () => 0.5);
  finishStoryBattle(gs);
  assert.ok(moveToPlace(gs, 'renwutang').ok);
  const food = gs.player.items.yuelanhua;
  const patrolStones = gs.player.yuanshi;
  assert.match(renderPlaceView(gs), /3 元石/);
  assert.ok(performPlaceAction(gs, 'fieldReward:food').ok);
  assert.equal(gs.player.items.yuelanhua, food + 3);
  assert.equal(gs.player.yuanshi, patrolStones + 1);
});

test('历练推荐照顾受伤玩家，并随境界和区域解锁切换', () => {
  const gs = createNewGame();
  const p = gs.player;
  p.benming = addGu(gs, 'yueguang').uid;
  gs.flags.practiced = true;
  assert.equal(fieldRecommendation(gs).place, 'zhulin');
  p.rank = 2;
  p.xiao = 2;
  assert.equal(fieldRecommendation(gs).place, 'xuefu');
  gs.flags['clear:xuefu'] = true;
  assert.equal(fieldRecommendation(gs).place, 'langchao');
  p.zy = 0;
  assert.equal(fieldRecommendation(gs).place, 'zhulin');
  p.hp = 1;
  assert.equal(fieldRecommendation(gs).place, 'zhulou');
});

test('修行和行纪按同一优先级引导试炼、交付、突破与探索', () => {
  const gs = createNewGame();
  applyEventChoice(gs, 'kaike', 0);
  const p = gs.player;
  p.benming = addGu(gs, 'yueguang').uid;
  gs.flags.practiced = true;

  function assertGuide(expected) {
    const goal = mainGrowthGoal(gs);
    assert.match(goal.text, expected);
    assert.match(renderCultivationView(gs, goal), new RegExp(`<h3>成长引导</h3>\\s*<p>${goal.text}</p>`));
    assert.match(renderBagView(gs, 'journal'), new RegExp(`<h3>成长引导</h3>\\s*<p>${goal.text}</p>`));
  }

  assertGuide(/首次出寨试炼 · 勘察/);
  p.fieldTrial = { scouted: true, gathered: true, won: true };
  assertGuide(/首次出寨试炼已完成，回任务堂/);
  p.fieldTrial = { firstClaimed: true, active: true };
  assertGuide(/突破至一转中阶/);
  Object.assign(p.fieldTrial, { scouted: true, gathered: true, won: true });
  assertGuide(/竹林巡守已完成，回任务堂/);
  p.fieldTrial = { firstClaimed: true };
  p.rank = 4;
  p.xiao = 3;
  assertGuide(/血蝠洞/);
});

test('花酒遗藏只发放现阶段奖励，确认后回到遗洞', () => {
  const gs = createNewGame();
  applyEventChoice(gs, 'kaike', 0);
  gs.location = 'huajiu';
  const ui = { game: gs, tab: 'place', modal: { kind: 'place' } };
  const hooks = { render() {}, showToast() {} };

  handleAction(ui, { dataset: { action: 'placeAct', id: 'huajiuLoot' } }, hooks);
  assert.equal(ui.modal.kind, 'receipt');
  assert.match(ui.modal.data.title, /花酒行者遗藏/);
  assert.deepEqual(ui.modal.data.lines, ['酒虫 ×1', '白豕蛊 ×1', '玉皮蛊 ×1', '青竹酒 ×5', '元石 ×45']);
  assert.ok(!gs.player.gu.some(({ id }) => id === 'chunqiuchan'));
  assert.match(gs.logs[0].text, /花酒行者遗藏.*青竹酒/);
  assert.doesNotMatch(renderBagView(gs, 'journal'), /春秋蝉/);
  const stones = gs.player.yuanshi;

  handleAction(ui, { dataset: { action: 'closeModal' } }, hooks);
  assert.equal(ui.modal.kind, 'place');
  handleAction(ui, { dataset: { action: 'placeAct', id: 'huajiuLoot' } }, hooks);
  assert.equal(gs.player.yuanshi, stones);
});

test('战利品同时记录元石和掉落物，退出战斗后可在行纪查看', () => {
  const gs = createNewGame();
  applyEventChoice(gs, 'kaike', 0);
  gs.location = 'zhulin';
  const battle = startBattle(gs, 'yezhu');
  battle.foe.hp = 1;
  battleAct(gs, 'attack', '', () => 0.5);
  const loot = ['元石 ×8', `${ITEMS.shourou.name} ×1`];
  assert.deepEqual(battle.rewards, loot);
  finishStoryBattle(gs);
  assert.ok(renderBagView(gs, 'journal').includes(loot.join('、')));
});
