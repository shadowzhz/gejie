import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, addGu, BENMING_ZY_COST, claimBenming, handleQuest, purchaseShopEntry, questBoard, refineBenming, realmText, recordQuestProgress, useHealItem, useWhiteBoarGu } from '../src/core/state.js';
import { placeShopEntries } from '../src/data/places.js';
import { advanceMinutes, moveToPlace, rewindSpringCicada, saveSpringSnapshot } from '../src/core/clock.js';
import { makeTime } from '../src/core/calendar.js';
import { applyEventChoice, checkStoryTriggers } from '../src/core/story-engine.js';
import { createKillerMove } from '../src/core/killer.js';
import { battleAct, battleGuPlan, startBattle } from '../src/core/combat.js';
import { createBreakSession, stepBreakSession, washMinorWall } from '../src/core/breakthrough.js';
import { createRefineSession, stepRefineSession } from '../src/core/refine.js';

test('豕蛊加伤只作用于拳脚和力道攻伐', () => {
  const gs = createNewGame();
  gs.player.rank = 2;
  for (const id of ['yueguang', 'heishi']) addGu(gs, id);
  const whiteBoar = addGu(gs, 'baishi');
  assert.equal(gs.player.powerBonus, 6);
  assert.equal(useWhiteBoarGu(gs, whiteBoar.uid), true);
  assert.equal(useWhiteBoarGu(gs, whiteBoar.uid), false);
  const moon = createKillerMove(gs, 'yueguang', ['heishi']).move;
  const strength = createKillerMove(gs, 'heishi', []).move;
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
  assert.equal(damage('attack'), 27);
  assert.equal(damage('gu', 'yueguang'), 18);
  assert.equal(damage('move', moon.id), Math.round(moon.power * 1.01));
  assert.equal(damage('move', strength.id), Math.round((strength.power + 9) * 1.01));
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

test('二转自创杀招与常规战斗回合', () => {
  const gs = createNewGame('战者');
  addGu(gs, 'yueguang');
  addGu(gs, 'yupi');
  assert.equal(createKillerMove(gs, 'yueguang', ['yupi'], '月盾').ok, false);

  gs.player.rank = 2;
  const km = createKillerMove(gs, 'yueguang', ['yupi'], '月盾');
  assert.equal(km.ok, true);

  const b = startBattle(gs, 'yezhu', '测试战', () => 0.5);
  assert.ok(b);
  battleAct(gs, 'move', km.move.id, () => 0.5);
  assert.ok(b.foe.hp < b.foe.hpMax);
});

test('破壁冲关、三轮控火炼蛊与春秋蝉回溯', () => {
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
  stepRefineSession(gs, ref, 'steady', () => 0.2);
  stepRefineSession(gs, ref, 'steady', () => 0.2);
  stepRefineSession(gs, ref, 'steady', () => 0.2);
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
    for (let i = 0; i < 3; i++) stepRefineSession(gs, ref, 'steady', () => 0.2);
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
    for (let i = 0; i < 3; i++) stepRefineSession(gs, ref, 'steady', () => 0.2);
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
    assert.equal(gs.player.items[id], undefined);
    for (let i = 0; i < 3; i++) stepRefineSession(gs, ref, 'steady', () => 0.2);
    assert.equal(ref.success, true);
    assert.equal(gs.player.gu.length, expected);
    assert.ok(gs.player.gu.every((gu) => gu.id === 'jiuchong'));
    assert.equal(gs.player.benming, gs.player.gu[0].uid);
  }
});

test('四味酒虫缺任何一种酒都不能开炉，开炉后扣除四种酒', () => {
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
  assert.ok(wines.every((wine) => !(wine in gs.player.items)));
  for (let i = 0; i < 3; i++) stepRefineSession(gs, ref, 'steady', () => 0.2);
  assert.equal(ref.success, true);
  assert.ok(gs.player.gu.some((gu) => gu.id === 'siwei_jiu'));
  assert.ok(!gs.player.gu.some((gu) => gu.id === 'jiuchong'));
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
