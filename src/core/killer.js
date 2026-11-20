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
  }
];

export function killerPatternSequence(pattern) {
  return pattern.sequence.map((id) => GU_DEFS[id].name).join(' → ');
}

export function recordKillerSequence(gs, guIds) {
  if (gs.player.rank < 2 || guIds.length < 2) return;
  for (const pattern of KILLER_PATTERNS) {
    const { sequence, id } = pattern;
    if (guIds.length !== sequence.length || !sequence.every((gu, index) => gu === guIds[index])) continue;
    const practiced = (gs.player.killerPractice ??= []);
    if (practiced.includes(id)) return;
    practiced.push(id);
    gs.battle.logs.push(`搭配试阵通过：「${pattern.name}」可回空窍推演。`);
    addLog(gs, `【试阵】「${pattern.name}」搭配已验证。`, 'log-good');
    return;
  }
  gs.battle.logs.push('这组蛊虫已逐只催动，当前搭配或顺序未形成可推演的杀招。');
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
  if (!gs.player.killerPractice?.includes(pattern.id)) return '须按所示顺序完成试阵';
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
