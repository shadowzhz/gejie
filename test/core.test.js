import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, addGu, BENMING_ZY_COST, claimBenming, handleQuest, refineBenming, realmText, recordQuestVictory, useHealItem, useWhiteBoarGu } from '../src/core/state.js';
import { placeShopEntries } from '../src/data/places.js';
import { advanceMinutes, moveToPlace, rewindSpringCicada, saveSpringSnapshot } from '../src/core/clock.js';
import { makeTime } from '../src/core/calendar.js';
import { applyEventChoice, checkStoryTriggers } from '../src/core/story-engine.js';
import { createKillerMove } from '../src/core/killer.js';
import { battleAct, startBattle } from '../src/core/combat.js';
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
    battleAct(gs, action, id, () => 0.5);
    return battle.foe.hpMax - battle.foe.hp;
  };
  assert.equal(damage('attack'), 27);
  assert.equal(damage('gu', 'yueguang'), 18);
  assert.equal(damage('move', moon.id), Math.round(moon.power * 1.01));
  assert.equal(damage('move', strength.id), Math.round((strength.power + 9) * 1.01));
});

test('古月蛊开课后供应，商队酒虫限期出售且只卖一只', () => {
  const gs = createNewGame();
  gs.location = 'gupu';
  assert.deepEqual(placeShopEntries(gs), ['gu:shipi', 'gu:xuanfeng', 'item:shengjiye']);
  gs.flags.kaike = true;
  assert.ok(placeShopEntries(gs).includes('gu:yueguang'));
  assert.ok(placeShopEntries(gs).includes('gu:xiaoguang'));
  gs.minutes = makeTime(2, 3, 1) - 1;
  assert.ok(!placeShopEntries(gs).includes('gu:jiuchong'));
  gs.minutes++;
  assert.ok(placeShopEntries(gs).includes('gu:jiuchong'));
  gs.flags.merchant_jiuchong_bought = true;
  assert.ok(!placeShopEntries(gs).includes('gu:jiuchong'));
  gs.flags.merchant_jiuchong_bought = false;
  gs.minutes = makeTime(2, 3, 9);
  assert.ok(!placeShopEntries(gs).includes('gu:jiuchong'));
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

test('舆图门禁与隐藏遗洞解锁', () => {
  const gs = createNewGame('行脚者');
  applyEventChoice(gs, 'kaike', 0);
  moveToPlace(gs, 'shijie');
  moveToPlace(gs, 'zhaimen');
  const blocked = moveToPlace(gs, 'zhulin');
  assert.equal(blocked.ok, false);

  gs.flags.practiced = true;
  const ok = moveToPlace(gs, 'zhulin');
  assert.equal(ok.ok, true);
  assert.equal(gs.location, 'zhulin');
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
  recordQuestVictory(gs, 'caoren');
  handleQuest(gs, 'caoren');
  handleQuest(gs, 'caoren');
  assert.equal(p.yuanshi, stones);
  recordQuestVictory(gs, 'caoren');
  handleQuest(gs, 'caoren');
  handleQuest(gs, 'caoren');
  assert.equal(p.yuanshi, stones + 8);
});
