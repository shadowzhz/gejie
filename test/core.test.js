import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, addGu, BENMING_ZY_COST, claimBenming, refineBenming, realmText } from '../src/core/state.js';
import { advanceMinutes, moveToPlace, rewindSpringCicada, saveSpringSnapshot } from '../src/core/clock.js';
import { makeTime } from '../src/core/calendar.js';
import { applyEventChoice, checkStoryTriggers } from '../src/core/story-engine.js';
import { createKillerMove } from '../src/core/killer.js';
import { battleAct, startBattle } from '../src/core/combat.js';
import { createBreakSession, stepBreakSession } from '../src/core/breakthrough.js';
import { createRefineSession, stepRefineSession } from '../src/core/refine.js';

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
  const ref = createRefineSession(gs, 'r_yuemang');
  assert.ok(!ref.error);
  stepRefineSession(gs, ref, 'steady', () => 0.2);
  stepRefineSession(gs, ref, 'steady', () => 0.2);
  stepRefineSession(gs, ref, 'steady', () => 0.2);
  assert.equal(ref.state, 'done');

  addGu(gs, 'chunqiuchan');
  assert.equal(saveSpringSnapshot(gs).ok, true);
  gs.player.dead = true;
  const rw = rewindSpringCicada(gs);
  assert.equal(rw.ok, true);
  assert.equal(rw.state.player.dead, false);
  assert.equal(realmText(rw.state.player).includes('转'), true);
});
