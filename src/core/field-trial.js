import { GU_DEFS, ITEMS } from '../data/gu.js';
import { addItem, addLog, isGuWeak } from './state.js';

const fieldTrialSteps = [
  { id: 'scouted', text: '勘察竹林兽径' },
  { id: 'gathered', text: '在竹林采集一次' },
  { id: 'won', text: '击败一只铁鬃野猪或野猪王' }
];

const fieldRewards = [
  { id: 'stones', stones: [18, 3] },
  { id: 'healing', stones: [6, 1], item: 'zhixuegao', count: [3, 1] },
  { id: 'food', stones: [6, 1], item: 'yuelanhua', count: [12, 3] }
];

export function fieldTrialStatus(gs) {
  const p = gs.player;
  if (!p.benming || !gs.flags.practiced || p.escapedMountain) return null;
  const record = p.fieldTrial;
  const repeat = !!record?.firstClaimed;
  const active = !repeat || !!record.active;
  const steps = fieldTrialSteps.map((step) => ({ ...step, done: active && record?.[step.id] === true }));
  const next = steps.find((step) => !step.done);
  const ready = active && !next;
  return {
    title: repeat ? '竹林巡守' : '首次出寨试炼',
    active, steps, next, ready, repeat,
    rewards: ready ? fieldRewards.map(({ id, stones, item, count }) => {
      const index = Number(repeat);
      const quantity = count?.[index];
      const text = `${stones[index]} 元石${item ? ` ＋ ${ITEMS[item].name} ×${quantity}` : ''}`;
      return { id, stones: stones[index], item, quantity, text };
    }) : []
  };
}

export function recordFieldTrial(gs, step) {
  if (gs.location !== 'zhulin') return;
  const trial = fieldTrialStatus(gs);
  const entry = trial?.steps.find(({ id }) => id === step);
  if (!trial?.active || !entry || entry.done) return;
  (gs.player.fieldTrial ??= {})[step] = true;
  const progress = trial.steps.filter(({ done }) => done).length + 1;
  addLog(gs, `【${trial.title}】${entry.text} · ${progress}/${trial.steps.length}${progress === trial.steps.length ? '，可回任务堂交付' : ''}。`, 'log-good');
}

export function settleFieldTrial(gs, id) {
  const trial = fieldTrialStatus(gs);
  if (gs.location !== 'renwutang' || !trial) return { ok: false, reason: '请到任务堂办理历练。' };
  if (id === 'fieldPatrol' && !trial.active) {
    gs.player.fieldTrial = { firstClaimed: true, active: true };
    addLog(gs, '【竹林巡守】已接取巡守，去月下竹林勘察、采集与清理兽患。');
    return { ok: true, message: '已接取竹林巡守' };
  }
  const reward = trial.rewards.find((entry) => entry.id === id);
  if (!reward) return { ok: false, reason: '请完成三项历练后再选领赏格。' };
  gs.player.fieldTrial = { firstClaimed: true };
  gs.player.yuanshi += reward.stones;
  if (reward.item) addItem(gs, reward.item, reward.quantity);
  const message = `${trial.title}已交付，获得 ${reward.text}`;
  addLog(gs, `【历练】${message}。`, 'log-gold');
  return { ok: true, message, receipt: {
    title: `任务堂 · ${trial.title}已交付`,
    lines: [reward.text]
  } };
}

export function fieldRecommendation(gs) {
  const { player: p, flags } = gs;
  if (!p.benming || !flags.practiced || p.escapedMountain) return null;
  const attack = p.gu.some((gu) => {
    const def = GU_DEFS[gu.id];
    return p.equipped.includes(gu.uid) && !isGuWeak(gu)
      && ['攻击', '控制'].includes(def?.kind) && p.zy >= def.cost * 2;
  });
  if (p.hp < p.hpMax / 2) return { place: 'zhulou', text: '气血不足一半，先回竹楼歇息。' };
  if (!attack) return { place: 'zhulin', text: '先在月下竹林勘察、采集。备好出战的攻击蛊和真元后再搜山。' };
  if (flags['clear:xuefu'] && (p.rank >= 3 || (p.rank === 2 && p.xiao >= 2))) {
    return { place: 'langchao', text: '可去电狼坡迎战电狼，采集矿石等山材。' };
  }
  if (p.rank >= 2 || (p.xiao >= 2 && flags['clear:zhulin'])) {
    return { place: 'xuefu', text: '可去血蝠洞搜山，收集玉石与元石渣。' };
  }
  return { place: 'zhulin', text: '月下竹林适合练手。先采口粮、打铁鬃野猪攒元石，再考虑挑战野猪王。' };
}
