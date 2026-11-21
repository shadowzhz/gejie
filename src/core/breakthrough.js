import { GU_DEFS } from '../data/gu.js';
import { activeCultivationWine, addLog, minorXpNeed, realmText, recalcStats, removeGuByUid } from './state.js';

export function realmGuRequirement(p) {
  const rank = p.xiao < 3 ? p.rank : p.rank + 1;
  const need = p.xiao < 3 ? p.xiao + 2 : 1;
  const count = p.gu.filter((g) => GU_DEFS[g.id]?.rank === rank).length;
  return { need, count, text: `持有 ${rank} 转蛊虫 ${count}/${need} 只` };
}

export function nextRealmRequirements(p) {
  const major = p.xiao >= 3;
  if (major && p.rank >= 4) return null;
  return {
    target: realmText({ rank: p.rank + Number(major), xiao: major ? 0 : p.xiao + 1 }),
    major,
    gu: realmGuRequirement(p),
    xp: major ? 0 : minorXpNeed(p),
    zy: Math.round(p.zyMax * (major ? 0.9 : p.hai < 6 && !activeCultivationWine(p) ? 0.75 : 0.6))
  };
}

export function realmGrowthText(before, after) {
  const stats = [['hpMax', '气血上限'], ['zyMax', '真元上限'], ['speed', '身法']];
  return stats.map(([key, label]) => `${label} ${before[key]} → ${after[key]}`).join(' · ');
}

export function washMinorWall(gs) {
  const p = gs.player;
  if (p.xiao >= 3) return { ok: false, reason: '已至本转巅峰，须破壁冲击大境界' };
  const { gu, xp: needXp, zy: needZy } = nextRealmRequirements(p);
  if (gu.count < gu.need) return { ok: false, reason: gu.text };
  if (p.xp < needXp) return { ok: false, reason: `修为不足（需 ${needXp}）` };
  if (p.zy < needZy) return { ok: false, reason: `真元不足（需 ${needZy}）` };
  const before = { ...p };
  p.xp -= needXp;
  p.zy -= needZy;
  p.xiao++;
  recalcStats(gs);
  const message = `晋入${realmText(p)} · ${realmGrowthText(before, p)}`;
  addLog(gs, `【冲刷窍壁】${message}`, 'log-gold');
  return { ok: true, message };
}

export function useSheli(gs, uid) {
  const p = gs.player;
  const gu = p.gu.find((entry) => entry.uid === uid);
  if (!gu || !['qingtong_sheli', 'chitie_sheli', 'baiyin_sheli'].includes(gu.id)) return { ok: false };
  if (p.rank !== GU_DEFS[gu.id].rank || p.xiao >= 3) {
    return { ok: false, reason: '仅限对应转数未达巅峰时使用' };
  }
  const before = { ...p };
  removeGuByUid(gs, uid);
  p.xiao++;
  recalcStats(gs);
  const message = `晋入${realmText(p)} · ${realmGrowthText(before, p)}`;
  addLog(gs, `【舍利破境】${message}`, 'log-gold');
  return { ok: true, message };
}

export function createBreakSession(gs) {
  const p = gs.player;
  if (p.rank >= 4) return { error: '青茅山卷暂止于三/四转' };
  if (p.xiao < 3) return { error: '须先修至本转巅峰，方可破壁' };
  const { gu, zy } = nextRealmRequirements(p);
  if (gu.count < gu.need) return { error: gu.text };
  if (p.zy < zy) return { error: '真元须温养至九成以上' };
  const crackMult = Math.min(2.2, 1 + 0.2 * (p.attempts || 0));
  const wine = activeCultivationWine(p);
  return {
    crack: 0,
    hurt: 0,
    zy: p.zy,
    zyMax: p.zyMax,
    stones: p.yuanshi,
    stonesUsed: 0,
    turn: p.rank,
    wallHeal: wine ? 2 : p.hai < 4 ? 7 : p.hai < 6 ? 5 : 3,
    crackMult,
    steps: 0,
    state: 'ongoing',
    lines: [
      wine ? '酒虫提纯真元，冲出的裂痕愈合得更慢。' : '你盘膝坐定，心神沉入空窍。窍壁薄如晶膜，却坚韧异常。',
      p.attempts ? `此前冲关 ${p.attempts} 次未成，此番心得令破壁裂痕多 ${Math.round((crackMult - 1) * 100)}%。` : '每次冲关后窍壁都会略微愈合，注意真元与震伤。'
    ]
  };
}

export function validBreakSession(gs, sess) {
  const p = gs.player;
  const inRange = (value, max) => Number.isFinite(value) && value >= 0 && value <= max;
  return sess?.state === 'ongoing' && !p.dead && !gs.battle && p.xiao === 3
    && sess.turn === p.rank && sess.turn >= 1 && sess.turn < 4 && sess.zyMax === p.zyMax
    && inRange(sess.zy, sess.zyMax) && inRange(sess.crack, 100) && sess.crack < 100
    && inRange(sess.hurt, 100) && sess.hurt < 100
    && Number.isSafeInteger(sess.stones) && Number.isSafeInteger(sess.stonesUsed)
    && sess.stones >= 0 && sess.stonesUsed >= 0 && sess.stones + sess.stonesUsed === p.yuanshi
    && [2, 3, 5, 7].includes(sess.wallHeal) && inRange(sess.crackMult, 2.2) && sess.crackMult >= 1
    && Number.isSafeInteger(sess.steps) && sess.steps >= 0
    && Array.isArray(sess.lines) && sess.lines.every((line) => typeof line === 'string');
}

export function stepBreakSession(gs, sess, key, rng = Math.random) {
  if (!sess || sess.state !== 'ongoing') return sess;
  const zyMax = sess.zyMax;
  const hardNeed = Math.max(1, Math.round(zyMax * 0.55));
  const softNeed = Math.max(1, Math.round(zyMax * 0.28));
  const steadyNeed = Math.max(1, Math.round(zyMax * 0.15));
  const stoneCost = sess.turn * 10;
  let msg = '';

  if (key === 'hard' || key === 'soft') {
    const need = key === 'hard' ? hardNeed : softNeed;
    const spend = Math.min(sess.zy, need);
    if (spend <= 0) return sess;
    const base = key === 'hard' ? 40 : 22;
    const gain = base * (spend / need) * sess.crackMult * (0.9 + rng() * 0.2);
    const hurtGain = key === 'hard' ? (7 + Math.floor(rng() * 5)) : (2 + Math.floor(rng() * 2));
    sess.zy = Math.max(0, sess.zy - spend);
    sess.crack = Math.min(100, sess.crack + gain);
    sess.hurt = Math.min(100, sess.hurt + hurtGain);
    msg = `${key === 'hard' ? '强行撞击' : '稳步冲击'}窍壁（真元 -${Math.round(spend)}），裂痕 +${gain.toFixed(1)}%，震伤 +${hurtGain}。`;
  } else if (key === 'stone') {
    if (sess.stones < stoneCost || sess.zy >= zyMax) return sess;
    const zyGain = Math.min(zyMax - sess.zy, Math.max(8, Math.round(zyMax * 0.42)));
    sess.stones -= stoneCost;
    sess.stonesUsed += stoneCost;
    sess.zy += zyGain;
    msg = `消耗 ${stoneCost} 块元石，空窍真元恢复 +${Math.round(zyGain)}。`;
  } else if (key === 'steady') {
    if (sess.zy < steadyNeed || sess.hurt <= 0) return sess;
    const heal = Math.min(sess.hurt, 16);
    sess.zy -= steadyNeed;
    sess.hurt -= heal;
    msg = `催动真元温养空窍（真元 -${steadyNeed}），震伤 -${heal}。`;
  } else if (key === 'stop') {
    sess.steps++;
    settleBreakSession(gs, sess, 'stopped');
    gs.player.zy = Math.round(sess.zy);
    sess.lines.push('你主动散去真元退关，此番心得已留存。');
    addLog(gs, '【退关】破壁暂止，已积攒冲关心得。', 'log-warn');
    return sess;
  } else {
    return sess;
  }

  sess.steps++;
  if (sess.crack >= 100) {
    sess.crack = 100;
    settleBreakSession(gs, sess, 'win');
    const before = { ...gs.player };
    gs.player.rank++;
    gs.player.xiao = 0;
    gs.player.xp = 0;
    recalcStats(gs);
    gs.player.zy = Math.round(gs.player.zyMax * 0.5);
    if (gs.player.rank >= 2) gs.flags['open:jiazhuge'] = true;
    sess.lines.push(msg, `轰然一声脆响，窍壁彻底碎裂，你晋入${realmText(gs.player)}！`);
    const growth = realmGrowthText(before, gs.player);
    sess.lines.push(growth);
    addLog(gs, `【破境】晋入${realmText(gs.player)} · ${growth}`, 'log-gold');
    return sess;
  }

  if (sess.hurt >= 100) {
    sess.hurt = 100;
    settleBreakSession(gs, sess, 'lose');
    gs.player.hp = Math.max(5, Math.round(gs.player.hp * 0.5));
    gs.player.zy = 0;
    sess.lines.push(msg, '空窍震伤过重，真元反噬，被迫中止冲关！');
    addLog(gs, '【冲关受挫】震伤过重，退回养伤（已攒下冲关心得）。', 'log-bad');
    return sess;
  }

  const healed = Math.min(sess.crack, sess.wallHeal);
  sess.crack = Math.max(0, sess.crack - healed);
  sess.zy = Math.min(zyMax, sess.zy + Math.max(2, Math.round(zyMax * 0.06)));
  sess.lines.push(`${msg} 窍壁自愈 ${healed.toFixed(1)}%。`);
  if (sess.lines.length > 6) sess.lines = sess.lines.slice(-6);
  return sess;
}

function settleBreakSession(gs, sess, state) {
  sess.state = state;
  const p = gs.player;
  p.yuanshi = Math.max(0, p.yuanshi - sess.stonesUsed);
  p.attempts = state === 'win' ? 0 : (p.attempts || 0) + 1;
  if (gs.breakthrough === sess) delete gs.breakthrough;
}
