import { GU_DEFS, ITEMS } from '../data/gu.js';
import { MERCHANT_GU, PLACES, placeShopEntries } from '../data/places.js';
import { MIN_PER_DAY, makeTime, yearOf } from './calendar.js';

const QUEST_ROTATIONS = [
  [
    { id: 'caoren', name: '演武考核', desc: '击败演武草人 1 次', action: 'victory', subject: 'caoren', target: 1, reward: 8 },
    { id: 'yehua', name: '补充蛊粮', desc: '交付月兰花瓣 3 份', action: 'deliver', subject: 'yuelanhua', target: 3, reward: 9 },
    { id: 'xuetang_visit', name: '学堂巡查', desc: '前往学堂巡查 1 次', action: 'visit', subject: 'xuetang', target: 1, reward: 4 }
  ],
  [
    { id: 'yezhu', name: '竹林清患', desc: '击败铁鬃野猪 2 次', action: 'victory', subject: 'yezhu', target: 2, reward: 14 },
    { id: 'zhulin_gather', name: '竹林寻材', desc: '在月下竹林采集 2 次', action: 'gather', subject: 'zhulin', target: 2, reward: 10 },
    { id: 'kezhan_visit', name: '客栈传讯', desc: '前往山寨客栈传讯 1 次', action: 'visit', subject: 'kezhan', target: 1, reward: 4 }
  ],
  [
    { id: 'xuefu', name: '驱逐血蝠', desc: '击败赤眼血蝠 1 次', action: 'victory', subject: 'xuefu', target: 1, reward: 12 },
    { id: 'yaotang_visit', name: '药堂问询', desc: '前往药堂问询 1 次', action: 'visit', subject: 'yaotang', target: 1, reward: 4 },
    { id: 'rou', name: '补充兽肉', desc: '交付兽肉 2 份', action: 'deliver', subject: 'shourou', target: 2, reward: 10 }
  ]
];
const QUESTS = QUEST_ROTATIONS.flat();
const QUEST_ROTATION_MINUTES = 3 * MIN_PER_DAY;

export function questBoard(gs) {
  const firstDay = Math.floor(gs.startMinutes / MIN_PER_DAY) * MIN_PER_DAY;
  const elapsed = Math.max(0, gs.minutes - firstDay);
  const cycle = Math.floor(elapsed / QUEST_ROTATION_MINUTES);
  const offers = QUEST_ROTATIONS[cycle % QUEST_ROTATIONS.length];
  const active = QUESTS.filter((q) => {
    const record = gs.player.quests?.[q.id];
    return record?.progress !== undefined && record.claimedCycle === undefined && !offers.includes(q);
  });
  const entries = [...offers, ...active].map((quest) => {
    const record = gs.player.quests?.[quest.id];
    const claimed = record?.claimedCycle === cycle;
    const accepted = record?.progress !== undefined && record.claimedCycle === undefined;
    const progress = quest.action === 'deliver'
      ? Math.min(quest.target, gs.player.items[quest.subject] ?? 0)
      : record?.progress ?? 0;
    return { ...quest, accepted, claimed, progress };
  });
  return { cycle, entries, remaining: QUEST_ROTATION_MINUTES - elapsed % QUEST_ROTATION_MINUTES };
}

export function handleQuest(gs, id) {
  if (gs.location !== 'renwutang') return;
  const { cycle, entries } = questBoard(gs);
  const quest = entries.find((entry) => entry.id === id);
  if (!quest || quest.claimed) return;
  const quests = (gs.player.quests ??= {});
  if (!quest.accepted) {
    quests[id] = { progress: 0 };
    addLog(gs, `【委托】接取「${quest.name}」。`);
  } else if (quest.progress === quest.target) {
    if (quest.action === 'deliver' && !useItem(gs, quest.subject, quest.target)) return;
    quests[id].claimedCycle = cycle;
    gs.player.yuanshi += quest.reward;
    addLog(gs, `【委托】交付「${quest.name}」，获得 ${quest.reward} 块元石。`, 'log-gold');
  }
}

export function recordQuestProgress(gs, action, subject) {
  for (const quest of QUESTS) {
    if (quest.action !== action || quest.subject !== subject) continue;
    const record = gs.player.quests?.[quest.id];
    if (record?.progress === undefined || record.claimedCycle !== undefined || record.progress >= quest.target) continue;
    record.progress++;
    if (record.progress === quest.target) addLog(gs, `【委托】「${quest.name}」已完成，可回任务堂交付。`, 'log-good');
  }
}

export const SAVE_KEY = 'gujie_qingmaoshan_v1';
export const RANK_NAMES = ['', '一转', '二转', '三转', '四转'];
export const XIAO_NAMES = ['初阶', '中阶', '高阶', '巅峰'];
export const REALM_CAP_NEED = [0, 80, 260, 720];
export const BENMING_ZY_COST = 10;

export function createAptitude(rng = Math.random) {
  const r = rng();
  if (r < 0.14) return { grade: '甲', hai: Number((8.0 + rng() * 1.6).toFixed(1)), desc: '甲等资质，元海深厚，族中必定重点栽培。' };
  if (r < 0.44) return { grade: '乙', hai: Number((6.0 + rng() * 1.9).toFixed(1)), desc: '乙等资质，修行稳健，足可冲击二三转。' };
  if (r < 0.82) return { grade: '丙', hai: Number((4.0 + rng() * 1.9).toFixed(1)), desc: '丙等资质，元海平平，须靠奇遇与苦修补足。' };
  return { grade: '丁', hai: Number((2.2 + rng() * 1.6).toFixed(1)), desc: '丁等资质，元海浅薄，每一步都要精打细算。' };
}

export function createNewGame(name = '无名', apt = null) {
  const a = apt || createAptitude();
  const startMin = makeTime(1, 3, 1, 3); // 第一年 三月初一 卯时
  const state = {
    v: 1,
    player: {
      name: String(name || '无名').trim() || '无名',
      rank: 1,
      xiao: 0,
      grade: a.grade,
      hai: a.hai,
      hp: 100,
      hpMax: 100,
      zy: 40,
      zyMax: 40,
      xp: 0,
      yuanshi: 12,
      mo: 0,
      speed: 8,
      powerBonus: 0,
      benming: null,
      unrefinedBenming: false,
      gu: [],
      recipes: [],
      autoFeed: false,
      quests: {},
      equipped: [],
      moves: [],
      items: { yuelanhua: 6 },
      attempts: 0,
      dead: false,
      escapedMountain: false
    },
    minutes: startMin,
    startMinutes: startMin,
    location: 'zhulou',
    flags: {},
    goal: '前往「学堂」参加开课，领取你的第一只本命蛊',
    logs: [
      { text: `开窍大典落定：测出${a.grade}等资质，元海 ${a.hai} 成。`, cls: 'log-gold' },
      { text: '你回到竹楼，摸了摸钱袋里的 12 块元石，准备动身去学堂。', cls: '' }
    ],
    snapshot: null,
    battle: null,
    pendingEventId: 'kaike',
    paused: false
  };
  recalcStats(state);
  state.player.hp = state.player.hpMax;
  state.player.zy = state.player.zyMax;
  return state;
}

export function recalcStats(gs) {
  const p = gs.player;
  const r = p.rank;
  const x = p.xiao;
  const haiMul = 0.65 + p.hai * 0.08;
  const boarStrength = (p.whiteBoarStrength ?? 0) + (p.blackBoarStrength ?? 0);
  const passiveHp = boarStrength * 35 + (hasGu(gs, 'tongpi') ? 25 : 0);
  const passivePower = boarStrength * 12;
  p.hpMax = Math.round((85 + r * 35 + x * 14) * (1 + (r - 1) * 0.18) + passiveHp);
  p.zyMax = Math.round((28 + r * 18 + x * 6) * haiMul);
  p.speed = 6 + r * 3 + x;
  p.powerBonus = passivePower;
  p.hp = Math.min(p.hp, p.hpMax);
  p.zy = Math.min(p.zy, p.zyMax);
}

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function realmText(p) {
  return `${RANK_NAMES[p.rank] || `${p.rank}转`}${XIAO_NAMES[p.xiao] || '初阶'}`;
}

export function minorXpNeed(p) {
  if (p.xiao >= 3) return 0;
  return Math.round((REALM_CAP_NEED[p.rank] || 700) * (1 + p.xiao * 0.45));
}

export function addLog(gs, text, cls = '') {
  gs.logs.unshift({ text, cls, age: yearOf(gs.minutes) });
  if (gs.logs.length > 80) gs.logs.length = 80;
}

export function hasGu(gs, id) {
  return gs.player.gu.some((g) => g.id === id);
}

export function isGuWeak(gu) {
  return (gu?.starveDays ?? 0) >= 2 && gu.satiety <= 0;
}

export function addGu(gs, id, satiety = 100) {
  const def = GU_DEFS[id];
  if (!def) return null;
  let uid = Date.now() + Math.floor(Math.random() * 10000);
  while (gs.player.gu.some((gu) => gu.uid === uid)) uid++;
  const inst = { uid, id, satiety, starveDays: 0 };
  gs.player.gu.push(inst);
  if (gs.player.equipped.length < 6 && ['攻击', '防御', '治疗', '增益', '控制', '探知', '隐匿'].includes(def.kind)) {
    gs.player.equipped.push(inst.uid);
  }
  recalcStats(gs);
  return inst;
}

export function claimBenming(gs) {
  const p = gs.player;
  if (gs.location !== 'xuetang' || p.benming || p.unrefinedBenming) return;
  p.unrefinedBenming = true;
  addItem(gs, 'yuelanhua', 8);
  addLog(gs, '【本命蛊】你在学堂领到「月光蛊」，附赠 8 片月兰花瓣。', 'log-gold');
  gs.goal = '前往「空窍」，消耗真元炼化月光蛊';
}

export function refineBenming(gs) {
  const p = gs.player;
  if (!p.unrefinedBenming || p.benming) return { ok: false, reason: '没有待炼化的本命蛊' };
  if (p.zy < BENMING_ZY_COST) return { ok: false, reason: '真元不足' };
  p.zy -= BENMING_ZY_COST;
  p.benming = addGu(gs, 'yueguang').uid;
  p.unrefinedBenming = false;
  addLog(gs, `【本命蛊】你消耗 ${BENMING_ZY_COST} 点真元，炼化了「月光蛊」。`, 'log-gold');
  gs.goal = gs.flags.toumin_race ? '赶在三月三日前回「学堂」向家老交卷夺取头名赏' : '前往「演武场」找草人傀儡练手';
  return { ok: true };
}

export function removeGuByUid(gs, uid) {
  const idx = gs.player.gu.findIndex((g) => g.uid === uid);
  if (idx < 0) return false;
  const removed = gs.player.gu.splice(idx, 1)[0];
  gs.player.equipped = gs.player.equipped.filter((u) => u !== uid);
  if (gs.player.benming === uid) gs.player.benming = null;
  recalcStats(gs);
  return removed;
}

export function addItem(gs, id, n = 1) {
  if (!id || n <= 0) return;
  gs.player.items[id] = (gs.player.items[id] || 0) + n;
}

export const SHOP_BATCH_LIMIT = 99;

export function purchaseShopEntry(gs, entry, count) {
  if (gs.battle || gs.player.dead || !placeShopEntries(gs).includes(entry)) {
    return { ok: false, reason: '当前无法购买这件货物' };
  }
  const [kind, id] = entry.split(':');
  const def = kind === 'gu' ? GU_DEFS[id] : ITEMS[id];
  if (!def) return { ok: false, reason: '当前无法购买这件货物' };
  const limited = MERCHANT_GU.includes(id);
  const limit = limited ? 1 : SHOP_BATCH_LIMIT;
  if (!Number.isSafeInteger(count) || count < 1 || count > limit) {
    return { ok: false, reason: limited ? '商队限售一只' : `数量须为 1 到 ${limit} 的整数` };
  }
  const cost = def.price * count;
  if (gs.player.yuanshi < cost) return { ok: false, reason: `元石不足，需 ${cost} 块` };
  gs.player.yuanshi -= cost;
  if (kind === 'gu') {
    for (let i = 0; i < count; i++) addGu(gs, id);
  } else {
    addItem(gs, id, count);
  }
  if (limited) gs.flags[`merchant_${id}_bought`] = true;
  const message = `已购入「${def.name}」×${count}，花费 ${cost} 元石`;
  addLog(gs, `${message}。`);
  return { ok: true, message };
}

export function useHealingGu(gs, uid) {
  const p = gs.player;
  const gu = p.gu.find((entry) => entry.uid === uid);
  const def = GU_DEFS[gu?.id];
  if (gs.battle || p.dead || def?.kind !== '治疗' || p.hp >= p.hpMax || p.zy < def.cost) return false;
  const healed = Math.min(def.power, p.hpMax - p.hp);
  p.zy -= def.cost;
  p.hp += healed;
  addLog(gs, `【${def.name}】催动疗伤，回复 ${Math.round(healed)} 点气血。`, 'log-good');
  return true;
}

export function useBoarGu(gs, uid) {
  const { player } = gs;
  const gu = player.gu.find((entry) => entry.uid === uid);
  if (gs.battle || !gu || !['heishi', 'baishi'].includes(gu.id)) return false;
  const strength = gu.id === 'heishi' ? 'blackBoarStrength' : 'whiteBoarStrength';
  if (player[strength]) return false;
  removeGuByUid(gs, uid);
  player[strength] = 1;
  recalcStats(gs);
  addLog(gs, `【${GU_DEFS[gu.id].name}】蛊虫消散，你添了一猪之力。`, 'log-good');
  return true;
}

export function feedGu(gs, gu, threshold = 100) {
  const food = GU_DEFS[gu?.id]?.food;
  if (!food || gu.satiety >= threshold || !useItem(gs, food, 1)) return false;
  gu.satiety = Math.min(100, gu.satiety + 50);
  gu.starveDays = 0;
  return true;
}

export function useItem(gs, id, n = 1) {
  if ((gs.player.items[id] || 0) < n) return false;
  gs.player.items[id] -= n;
  if (gs.player.items[id] <= 0) delete gs.player.items[id];
  return true;
}

export function useHealItem(gs, id) {
  const def = ITEMS[id];
  if (!def?.heal) return { ok: false };
  const p = gs.player;
  if (gs.minutes < (p.healReadyAt?.[id] ?? 0)) {
    return { ok: false, reason: '上一片生机叶的药力未散，请稍候再用' };
  }
  if (!useItem(gs, id, 1)) return { ok: false };
  p.hp = Math.min(p.hpMax, p.hp + def.heal);
  if (def.healCooldown) (p.healReadyAt ??= {})[id] = gs.minutes + def.healCooldown;
  return { ok: true };
}

export function saveGame(gs, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage || !gs) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(gs));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.player) return null;
    if (!PLACES[parsed.location]) parsed.location = 'shijie';
    recalcStats(parsed);
    return parsed;
  } catch {
    return null;
  }
}
