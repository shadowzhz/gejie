import { addLog, minorXpNeed, realmText, recalcStats } from './state.js';

export function realmGuRequirement(p) {
  const need = p.xiao < 3 ? p.xiao + 2 : p.rank + 3;
  const count = new Set(p.gu.map((g) => g.id)).size;
  return { need, count, text: `持有不同蛊虫 ${count}/${need} 种` };
}

export function realmGrowthText(before, after) {
  const stats = [['hpMax', '气血上限'], ['zyMax', '真元上限'], ['speed', '身法']];
  return stats.map(([key, label]) => `${label} ${before[key]} → ${after[key]}`).join(' · ');
}

export function washMinorWall(gs) {
  const p = gs.player;
  if (p.xiao >= 3) return { ok: false, reason: '已至本转巅峰，须破壁冲击大境界' };
  const gu = realmGuRequirement(p);
  if (gu.count < gu.need) return { ok: false, reason: gu.text };
  const needXp = minorXpNeed(p);
  const needZy = Math.round(p.zyMax * 0.6);
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

export function createBreakSession(gs) {
  const p = gs.player;
  if (p.rank >= 4) return { error: '青茅山卷暂止于三/四转' };
  if (p.xiao < 3) return { error: '须先修至本转巅峰，方可破壁' };
  const gu = realmGuRequirement(p);
  if (gu.count < gu.need) return { error: gu.text };
  if (p.zy < Math.round(p.zyMax * 0.9)) return { error: '真元须温养至九成以上' };
  const crackMult = Math.min(2.2, 1 + 0.2 * (p.attempts || 0));
  return {
    crack: 0,
    hurt: 0,
    zy: p.zy,
    zyMax: p.zyMax,
    stones: p.yuanshi,
    stonesUsed: 0,
    turn: p.rank,
    wallHeal: p.hai < 4.5 ? 5 : 3,
    crackMult,
    steps: 0,
    state: 'ongoing',
    lines: [
      '你盘膝坐定，心神沉入空窍。窍壁薄如晶膜，却坚韧异常。',
      p.attempts ? `此前冲关 ${p.attempts} 次未成，此番心得令破壁裂痕多 ${Math.round((crackMult - 1) * 100)}%。` : '每次冲关后窍壁都会略微愈合，注意真元与震伤。'
    ]
  };
}

export function stepBreakSession(gs, sess, key, rng = Math.random) {
  if (!sess || sess.state !== 'ongoing') return sess;
  sess.steps++;
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
    sess.state = 'stopped';
    gs.player.attempts = (gs.player.attempts || 0) + 1;
    gs.player.yuanshi = Math.max(0, gs.player.yuanshi - sess.stonesUsed);
    gs.player.zy = Math.round(sess.zy);
    sess.lines.push('你主动散去真元退关，此番心得已留存。');
    addLog(gs, '【退关】破壁暂止，已积攒冲关心得。', 'log-warn');
    return sess;
  }

  if (sess.crack >= 100) {
    sess.crack = 100;
    sess.state = 'win';
    gs.player.yuanshi = Math.max(0, gs.player.yuanshi - sess.stonesUsed);
    const before = { ...gs.player };
    gs.player.rank++;
    gs.player.xiao = 0;
    gs.player.xp = 0;
    gs.player.attempts = 0;
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
    sess.state = 'lose';
    gs.player.attempts = (gs.player.attempts || 0) + 1;
    gs.player.yuanshi = Math.max(0, gs.player.yuanshi - sess.stonesUsed);
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
