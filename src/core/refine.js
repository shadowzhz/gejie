import { GU_DEFS, REFINE_RECIPES } from '../data/gu.js';
import { addGu, addLog, hasGu, removeGuByUid, useItem } from './state.js';

export function canStartRefine(gs, recipeId) {
  const rc = REFINE_RECIPES.find((r) => r.id === recipeId);
  if (!rc) return { ok: false, reason: '未知蛊方' };
  if (!gs.player.recipes?.includes(recipeId)) return { ok: false, reason: '尚未习得此蛊方' };
  if (gs.player.yuanshi < rc.cost) return { ok: false, reason: `元石不足（需 ${rc.cost}）` };
  if ((gs.player.items[rc.mat] || 0) < 1) return { ok: false, reason: '缺少炼制辅材' };
  const mainCount = gs.player.gu.filter((g) => g.id === rc.main).length;
  const auxCount = gs.player.gu.filter((g) => g.id === rc.aux).length;
  if (rc.main === rc.aux) {
    if (mainCount < 2) return { ok: false, reason: `需要两只「${GU_DEFS[rc.main].name}」` };
  } else {
    if (mainCount < 1 || auxCount < 1) return { ok: false, reason: '缺少所需主蛊或辅蛊' };
  }
  return { ok: true, rc };
}

export function createRefineSession(gs, recipeId) {
  const chk = canStartRefine(gs, recipeId);
  if (!chk.ok) return { error: chk.reason };
  const rc = chk.rc;
  gs.player.yuanshi -= rc.cost;
  useItem(gs, rc.mat, 1);
  return {
    recipeId: rc.id,
    outName: GU_DEFS[rc.out].name,
    round: 1,
    maxRounds: 3,
    heat: 50,      // 最佳温区 45~75
    rateBonus: 0,
    baseRate: rc.rate,
    state: 'ongoing', // ongoing | done | aborted
    success: false,
    lines: [`地火燃起，投入「${GU_DEFS[rc.main].name}」与辅材，共守三轮火候。`]
  };
}

export function stepRefineSession(gs, sess, mode, rng = Math.random) {
  if (!sess || sess.state !== 'ongoing') return sess;
  const rc = REFINE_RECIPES.find((r) => r.id === sess.recipeId);
  if (!rc) return sess;

  if (mode === 'abort') {
    sess.state = 'aborted';
    sess.lines.push('你果断撤去地火开炉，主蛊虽未升炼，却安然保住。');
    addLog(gs, `【停炉】炼制「${sess.outName}」中途撤火，保住了主蛊。`, 'log-warn');
    return sess;
  }

  if (mode === 'steady') {
    sess.heat = Math.max(20, Math.min(90, sess.heat + (rng() * 14 - 5)));
    sess.rateBonus += 0.05;
    sess.lines.push(`第 ${sess.round} 轮稳火温养，炉温 ${Math.round(sess.heat)}°（成算 +5%）。`);
  } else if (mode === 'fierce') {
    sess.heat += 14 + Math.round(rng() * 14);
    sess.rateBonus += 0.12;
    sess.lines.push(`第 ${sess.round} 轮猛火催炼，炉温飙至 ${Math.round(sess.heat)}°（成算 +12%）。`);
  } else if (mode === 'cool') {
    sess.heat = Math.max(15, sess.heat - (14 + Math.round(rng() * 10)));
    sess.rateBonus += 0.04;
    sess.lines.push(`第 ${sess.round} 轮收火降温，炉温回落至 ${Math.round(sess.heat)}°（成算 +4%）。`);
  }

  if (sess.heat > 96 || sess.heat < 15) {
    sess.state = 'done';
    sess.success = false;
    const auxInst = gs.player.gu.find((g) => g.id === rc.aux);
    if (auxInst) removeGuByUid(gs, auxInst.uid);
    sess.lines.push('炉温失控炸炉！辅蛊损毁，好在保住了主蛊。');
    addLog(gs, `【炼蛊炸炉】「${sess.outName}」合炼失控，损毁了一只辅蛊。`, 'log-bad');
    return sess;
  }

  if (sess.round >= sess.maxRounds) {
    sess.state = 'done';
    const sweetBonus = (sess.heat >= 45 && sess.heat <= 75) ? 0.10 : 0;
    const finalRate = Math.min(0.95, sess.baseRate + sess.rateBonus + sweetBonus);
    const mainInst = gs.player.gu.find((g) => g.id === rc.main);
    const auxInst = gs.player.gu.find((g) => g.id === rc.aux && (!mainInst || g.uid !== mainInst.uid));
    if (mainInst) removeGuByUid(gs, mainInst.uid);
    if (auxInst) removeGuByUid(gs, auxInst.uid);

    if (rng() < finalRate) {
      sess.success = true;
      addGu(gs, rc.out, 100);
      sess.lines.push(`成算 ${Math.round(finalRate * 100)}% —— 炉盖掀开，一只「${sess.outName}」振翼而出！`);
      addLog(gs, `【炼蛊大成】成功合炼出「${sess.outName}」！`, 'log-gold');
    } else {
      sess.success = false;
      sess.lines.push(`成算 ${Math.round(finalRate * 100)}% —— 炉中青烟散尽，合炼功亏一篑。`);
      addLog(gs, `【炼蛊失败】「${sess.outName}」合炼未成。`, 'log-bad');
    }
    return sess;
  }

  sess.round++;
  return sess;
}
