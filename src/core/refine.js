import { GU_DEFS, ITEMS, REFINE_RECIPES, recipeOutputText } from '../data/gu.js';
import { addGu, addLog, removeGuByUid, useItem } from './state.js';

export function canStartRefine(gs, recipeId) {
  const rc = REFINE_RECIPES.find((r) => r.id === recipeId);
  if (!rc) return { ok: false, reason: '未知蛊方' };
  if (!gs.player.recipes?.includes(recipeId)) return { ok: false, reason: '尚未习得此蛊方' };
  if (gs.player.yuanshi < rc.cost) return { ok: false, reason: `元石不足（需 ${rc.cost}）` };
  const guUids = [];
  for (const [id, count] of Object.entries(rc.gu)) {
    const matches = gs.player.gu.filter((g) => g.id === id);
    if (matches.length < count) return { ok: false, reason: `需要 ${count} 只「${GU_DEFS[id].name}」` };
    guUids.push(...matches.slice(0, count).map((g) => g.uid));
  }
  for (const [id, count] of Object.entries(rc.materials)) {
    if ((gs.player.items[id] || 0) < count) return { ok: false, reason: `缺少「${ITEMS[id].name}」×${count}` };
  }
  return { ok: true, rc, guUids };
}

export function createRefineSession(gs, recipeId) {
  const chk = canStartRefine(gs, recipeId);
  if (!chk.ok) return { error: chk.reason };
  const rc = chk.rc;
  gs.player.yuanshi -= rc.cost;
  for (const [id, count] of Object.entries(rc.materials)) useItem(gs, id, count);
  return {
    outId: rc.out,
    outCount: rc.outCount ?? 1,
    guUids: chk.guUids,
    outName: recipeOutputText(rc),
    method: rc.method ?? '合炼',
    round: 1,
    maxRounds: 3,
    heat: 50,      // 最佳温区 45~75
    rateBonus: 0,
    baseRate: rc.rate,
    state: 'ongoing', // ongoing | done | aborted
    success: false,
    lines: [`地火燃起，投入${rc.method ?? '合炼'}所需蛊虫，共守三轮火候。`]
  };
}

export function stepRefineSession(gs, sess, mode, rng = Math.random) {
  if (!sess || sess.state !== 'ongoing') return sess;
  if (mode === 'abort') {
    sess.state = 'aborted';
    sess.lines.push('你果断撤去地火开炉，主蛊虽未升炼，却安然保住。');
    addLog(gs, `【停炉】炼制「${sess.outName}」中途撤火，保住了主蛊。`, 'log-warn');
    return sess;
  }
  if (!sess.guUids.every((uid) => gs.player.gu.some((g) => g.uid === uid))) {
    sess.state = 'aborted';
    sess.lines.push('入炉的蛊虫已不齐，炼蛊中止。');
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
    const auxUid = sess.guUids[1];
    const damage = auxUid === undefined ? '保住了主蛊。' : '损毁了一只辅蛊，保住了主蛊。';
    if (auxUid !== undefined) removeGuByUid(gs, auxUid);
    sess.lines.push(`炉温失控炸炉！${damage}`);
    addLog(gs, `【炼蛊炸炉】「${sess.outName}」${sess.method}失控。${damage}`, 'log-bad');
    return sess;
  }

  if (sess.round >= sess.maxRounds) {
    sess.state = 'done';
    const sweetBonus = (sess.heat >= 45 && sess.heat <= 75) ? 0.10 : 0;
    const finalRate = Math.min(0.95, sess.baseRate + sess.rateBonus + sweetBonus);
    const usesBenming = sess.guUids.includes(gs.player.benming);
    for (const uid of sess.guUids) removeGuByUid(gs, uid);

    if (rng() < finalRate) {
      sess.success = true;
      const result = addGu(gs, sess.outId, 100);
      if (usesBenming) gs.player.benming = result.uid;
      for (let count = 1; count < sess.outCount; count++) addGu(gs, sess.outId, 100);
      sess.lines.push(`成算 ${Math.round(finalRate * 100)}% —— 炉盖掀开，得「${sess.outName}」！`);
      addLog(gs, `【炼蛊大成】成功${sess.method}出「${sess.outName}」！`, 'log-gold');
    } else {
      sess.success = false;
      sess.lines.push(`成算 ${Math.round(finalRate * 100)}% —— 炉中青烟散尽，${sess.method}功亏一篑。`);
      addLog(gs, `【炼蛊失败】「${sess.outName}」${sess.method}未成。`, 'log-bad');
    }
    return sess;
  }

  sess.round++;
  return sess;
}
