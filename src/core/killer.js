import { GU_DEFS } from '../data/gu.js';
import { addLog, hasGu } from './state.js';

export function canCraftKillerMove(gs) {
  return !!gs && gs.player.rank >= 2;
}

export function buildKillerMove(coreId, auxIds = [], customName = '') {
  const core = GU_DEFS[coreId];
  if (!core) return null;
  const cleanAux = [...new Set(auxIds)].filter((id) => id && id !== coreId && GU_DEFS[id]).slice(0, 2);
  const all = [coreId, ...cleanAux];
  let power = core.power * 1.45;
  let cost = core.cost + 3;
  let cd = Math.max(2, core.cd + 1);
  let bonusShield = 0;
  let bonusHeal = 0;
  let stunChance = 0;
  let boostMul = 1;

  for (const aid of cleanAux) {
    const ag = GU_DEFS[aid];
    cost += Math.max(2, Math.round(ag.cost * 0.6));
    if (ag.kind === '攻击') power += ag.power * 0.65;
    else if (ag.kind === '防御') bonusShield += Math.round(ag.power * 0.75);
    else if (ag.kind === '治疗') bonusHeal += Math.round(ag.power * 0.75);
    else if (aid === 'xiaoguang' && coreId === 'yueguang') boostMul += 0.22;
    else if (ag.kind === '控制') stunChance += 0.28;
  }

  power = Math.round(power * boostMul);
  const name = String(customName || '').trim().slice(0, 10) || `自创·${core.name.replace(/蛊$/, '')}杀招`;
  return {
    id: `km_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name,
    coreId,
    auxIds: cleanAux,
    guIds: all,
    kind: core.kind === '防御' ? '防御' : (core.kind === '治疗' ? '治疗' : '攻击'),
    power,
    bonusShield,
    bonusHeal,
    stunChance,
    cost,
    cd
  };
}

export function createKillerMove(gs, coreId, auxIds, customName) {
  if (!canCraftKillerMove(gs)) return { ok: false, reason: '须晋入二转，方可自创杀招' };
  if (!hasGu(gs, coreId)) return { ok: false, reason: '未持有核心蛊' };
  for (const aid of auxIds || []) {
    if (!hasGu(gs, aid)) return { ok: false, reason: '未持有指定辅蛊' };
  }
  const move = buildKillerMove(coreId, auxIds, customName);
  if (!move) return { ok: false, reason: '核心蛊无效' };
  gs.player.moves.push(move);
  addLog(gs, `【自创杀招】你以「${GU_DEFS[coreId].name}」为核心，推演成「${move.name}」。`, 'log-gold');
  return { ok: true, move };
}
