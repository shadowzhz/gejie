import { GU_DEFS } from '../data/gu.js';
import { addLog, hasGu } from './state.js';

// 青茅山篇的推演路线，依据蛊虫已有的用途设计。
export const KILLER_PATTERNS = [
  {
    id: 'light_moon', name: '凝光月刃', sequence: ['xiaoguang', 'yueguang'],
    desc: '小光先聚光，再以月光蛊斩出月刃。',
    fee: 24, kind: '攻击', power: 31, cost: 9, cd: 2
  },
  {
    id: 'guarded_moon', name: '披月斩', sequence: ['yueni', 'yuemang'],
    desc: '月霓裳先护身，再用月芒蛊反击。',
    fee: 36, kind: '攻击', power: 39, bonusShield: 30, cost: 15, cd: 3
  },
  {
    id: 'bristle_armor', name: '青丝黑鬃甲', sequence: ['qingsi', 'heizong'],
    desc: '先以青丝护身，再催黑鬃覆住薄弱处，结成双层护甲。',
    fee: 36, kind: '防御', power: 76, cost: 20, cd: 3
  },
  { id: 'wind_moon', name: '回风掠月', sequence: ['xuanfeng', 'yuexuan'],
    desc: '先以山风扰乱身法，再以弧形月刃追击。', fee: 28, kind: '攻击', power: 49, cost: 12, cd: 2 },
  { id: 'sighted_moon', name: '照隙月刃', sequence: ['nianxi', 'yuehen'],
    desc: '念息辨出破绽，由月痕蛊在远处补上一刀。', fee: 22, kind: '攻击', power: 28, cost: 8, cd: 2 },
  { id: 'jade_moon', name: '玉甲藏月', sequence: ['yupi', 'yuemang'],
    desc: '玉皮先护身，月芒紧随其后。', fee: 28, kind: '攻击', power: 36, bonusShield: 22, cost: 13, cd: 2 },
  { id: 'stone_hide', name: '石甲兽衣', sequence: ['shoupi', 'shipi'],
    desc: '兽皮卸力，石皮在外挡下重击。', fee: 20, kind: '防御', power: 38, cost: 7, cd: 2 },
  { id: 'bronze_jade', name: '铜胎白玉甲', sequence: ['tongpi', 'baiyu'],
    desc: '铜皮为底，白玉覆面。', fee: 40, kind: '防御', power: 90, cost: 16, cd: 3 },
  { id: 'thunder_wind', name: '风裹惊雷', sequence: ['xuanfeng', 'dianlang_gu'],
    desc: '借旋风开路，再催电狼蛊放出雷击。', fee: 36, kind: '攻击', power: 56, cost: 14, cd: 3 },
  { id: 'hidden_bat', name: '伏影蝠袭', sequence: ['yinshi', 'xuefu_gu'],
    desc: '隐去身形，趁敌手失去目标时放出血蝠。', fee: 32, kind: '攻击', power: 42, bonusShield: 8, cost: 12, cd: 3 }
];

export function discoveredKillerPatterns(player) {
  return player.rank < 2 ? [] : KILLER_PATTERNS.filter((pattern) => hasUsedKillerGu(player, pattern));
}

function hasUsedKillerGu(player, pattern) {
  return pattern.sequence.every((id) => player.usedGu?.includes(id));
}
export function killerPatternSequence(pattern) {
  return pattern.sequence.map((id) => GU_DEFS[id].name).join('、');
}

export function recordGuUsage(gs, guIds) {
  const player = gs.player;
  const used = new Set(player.usedGu);
  if (guIds.every((id) => used.has(id))) return;
  const known = discoveredKillerPatterns(player);
  for (const id of guIds) used.add(id);
  player.usedGu = [...used];
  for (const pattern of discoveredKillerPatterns(player)) {
    if (known.includes(pattern)) continue;
    const message = `「${pattern.name}」所需蛊虫均已催动过，可回空窍推演。`;
    gs.battle?.logs.push(message);
    addLog(gs, `【杀招】${message}`, 'log-good');
  }
}

function killerPatternBlock(gs, pattern) {
  if (gs.player.rank < 2) return '须晋入二转';
  const missing = pattern.sequence.find((id) => !hasGu(gs, id));
  return missing ? `缺少「${GU_DEFS[missing].name}」` : '';
}

export function killerMoveBlock(gs, move) {
  const pattern = KILLER_PATTERNS.find((entry) => entry.id === move?.patternId);
  if (!pattern) return '旧杀招需要重新推演';
  const blocked = killerPatternBlock(gs, pattern);
  if (blocked) return blocked;
  const { gu, equipped } = gs.player;
  const resting = pattern.sequence.find((id) => !gu.some((entry) => entry.id === id && equipped.includes(entry.uid)));
  return resting ? `「${GU_DEFS[resting].name}」未出战` : '';
}

export function killerCraftBlock(gs, pattern) {
  if (gs.player.moves.some((move) => move.patternId === pattern.id)) return '已推演';
  const blocked = killerPatternBlock(gs, pattern);
  if (blocked) return blocked;
  if (!hasUsedKillerGu(gs.player, pattern)) return '须分别催动过所需蛊虫';
  if (gs.player.yuanshi < pattern.fee) return `元石不足（需 ${pattern.fee}）`;
  return '';
}

export function forgetKillerMove(gs, id) {
  if (gs.battle) return null;
  const index = gs.player.moves.findIndex((move) => move.id === id);
  if (index === -1) return null;
  const [move] = gs.player.moves.splice(index, 1);
  addLog(gs, `【杀招】已删除「${move.name}」。`);
  return move;
}

export function createKillerMove(gs, patternId, customName = '') {
  const pattern = KILLER_PATTERNS.find((entry) => entry.id === patternId);
  if (!pattern) return { ok: false, reason: '这组蛊虫没有可推演的搭配' };
  if (gs.battle) return { ok: false, reason: '请在战斗结束后推演' };
  const reason = killerCraftBlock(gs, pattern);
  if (reason) return { ok: false, reason };

  const { kind, power, bonusShield, cost, cd } = pattern;
  const move = {
    id: `km_${pattern.id}`,
    patternId: pattern.id,
    name: String(customName).trim().slice(0, 10) || pattern.name,
    kind, power, bonusShield, cost, cd
  };
  gs.player.yuanshi -= pattern.fee;
  gs.player.moves.push(move);
  addLog(gs, `【自创杀招】花费 ${pattern.fee} 元石，推演成「${move.name}」。`, 'log-gold');
  return { ok: true, move };
}
