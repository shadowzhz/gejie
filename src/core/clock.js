import { GU_DEFS } from '../data/gu.js';
import { PLACES } from '../data/places.js';
import { MIN_PER_DAY, MIN_PER_KE, dayOf, isNight } from './calendar.js';
import { addLog, feedGu, hasGu, recalcStats } from './state.js';
import { startBattle } from './combat.js';
import { checkStoryTriggers } from './story-engine.js';

export function placeMoveList(gs) {
  const here = PLACES[gs.location];
  if (!here) return [];
  const p = gs.player;
  return Object.entries(here.links || {})
    .filter(([id]) => {
      const target = PLACES[id];
      return target && (!target.hidden || gs.flags[target.hidden]);
    })
    .map(([id, minutes]) => {
      const target = PLACES[id];
      let blocked = '';
      if (target.lock && !gs.flags[target.lock.flag]) blocked = target.lock.msg;
      else if (target.nightOnly && !isNight(gs.minutes + minutes)) blocked = '须入夜后方可潜入';
      return { id, name: target.name, minutes, blocked };
    });
}

export function moveToPlace(gs, targetId) {
  if (!gs || gs.player.dead || gs.battle) return { ok: false, reason: '当前无法行脚' };
  const route = placeMoveList(gs).find((m) => m.id === targetId);
  if (!route) return { ok: false, reason: '此处无路可通' };
  if (route.blocked) return { ok: false, reason: route.blocked };
  advanceMinutes(gs, route.minutes);
  if (gs.player.dead || gs.battle) return { ok: true };
  gs.location = targetId;
  addLog(gs, `你来到了「${PLACES[targetId].name}」。`);
  checkStoryTriggers(gs);
  return { ok: true };
}

export function advanceMinutes(gs, minutes, rng = Math.random) {
  if (!gs || gs.player.dead || minutes <= 0) return;
  const oldDay = Math.floor(gs.minutes / MIN_PER_DAY);
  const oldMonth = Math.floor(gs.minutes / (MIN_PER_DAY * 30));
  gs.minutes += minutes;
  const newDay = Math.floor(gs.minutes / MIN_PER_DAY);
  const newMonth = Math.floor(gs.minutes / (MIN_PER_DAY * 30));

  const p = gs.player;
  const kes = minutes / MIN_PER_KE;
  const inLodge = gs.location === 'zhulou';
  const hpRegen = kes * (inLodge ? 1.2 : 0.4);
  const zyRegen = kes * (0.25 + p.hai * 0.05) * (inLodge ? 1.4 : 1.0);
  p.hp = Math.min(p.hpMax, Number((p.hp + hpRegen).toFixed(2)));
  p.zy = Math.min(p.zyMax, Number((p.zy + zyRegen).toFixed(2)));

  // 轻挂机修为缓涨（竹楼或正常时辰自然温养）
  if (p.xiao < 3) {
    let wineMul = 1;
    if (p.rank === 1 && hasGu(gs, 'jiuchong')) wineMul = 1.25;
    if (p.rank === 2 && hasGu(gs, 'siwei_jiu')) wineMul = 1.45;
    const xpGain = kes * (0.22 + p.hai * 0.04) * wineMul;
    p.xp = Number((p.xp + xpGain).toFixed(2));
  }

  // 跨日结算蛊虫饱食
  const daysPassed = newDay - oldDay;
  if (daysPassed > 0) {
    for (let i = gs.player.gu.length - 1; i >= 0; i--) {
      const g = gs.player.gu[i];
      const def = GU_DEFS[g.id];
      if (!def || !def.food) continue;
      if (p.autoFeed) {
        for (let day = 0; day < daysPassed; day++) {
          g.satiety = Math.max(0, g.satiety - 12);
          if (feedGu(gs, g, 51)) addLog(gs, `【自动喂养】已喂食「${def.name}」。`);
        }
      } else {
        g.satiety = Math.max(0, g.satiety - daysPassed * 12);
      }
      if (g.satiety === 0) {
        addLog(gs, `【饥饿】「${def.name}」腹中空空，气息衰弱，须尽快喂食！`, 'log-warn');
      }
    }
    // 魔道恶名追捕
    if (p.mo >= 30 && !gs.battle && ['zhulin', 'xuefu', 'langchao', 'zhaimen'].includes(gs.location)) {
      const cooldown = gs.flags['pursuit_cd'] || 0;
      if (newDay >= cooldown && rng() < Math.min(0.45, (p.mo - 20) / 140) * (hasGu(gs, 'yinshi') ? 0.55 : 1)) {
        gs.flags['pursuit_cd'] = newDay + 7;
        addLog('【追捕】恶名招致正道捕手循迹而来！', 'log-bad');
        startBattle(gs, p.mo >= 60 ? 'tiexueleng' : 'modao', '正道围捕', rng);
      }
    }
  }

  // 跨月发放学堂/家族月例
  if (newMonth > oldMonth && gs.flags['kaike']) {
    const base = { 甲: 18, 乙: 12, 丙: 8, 丁: 5 }[p.grade] || 8;
    const stipend = base * p.rank;
    p.yuanshi += stipend;
    addLog(gs, `【月例】${dayOf(gs.minutes)}日发俸，按${p.grade}等资质与${p.rank}转修为领得元石 +${stipend}。`, 'log-gold');
  }

  if (p.rank >= 2) gs.flags['open:jiazhuge'] = true;
  recalcStats(gs);
  checkStoryTriggers(gs);
}

export function saveSpringSnapshot(gs) {
  if (!gs || !hasGu(gs, 'chunqiuchan')) return { ok: false, reason: '尚未持有春秋蝉' };
  const copy = JSON.parse(JSON.stringify(gs));
  copy.snapshot = null;
  copy.battle = null;
  gs.snapshot = copy;
  addLog(gs, '【春秋蝉】你于光阴长河留下一道旧影，若此世身殒，可借蝉鸣重返此刻。', 'log-gold');
  return { ok: true };
}

export function rewindSpringCicada(gs) {
  if (!gs || !gs.snapshot) return { ok: false, reason: '未曾留下春秋蝉旧影' };
  const snap = JSON.parse(JSON.stringify(gs.snapshot));
  // 消耗春秋蝉
  const idx = snap.player.gu.findIndex((g) => g.id === 'chunqiuchan');
  if (idx >= 0) snap.player.gu.splice(idx, 1);
  snap.snapshot = null;
  snap.player.dead = false;
  if (!PLACES[snap.location]) snap.location = 'shijie';
  addLog(snap, '【逆流重开】春秋蝉振翼长鸣，你自死亡前一瞬逆流回到旧影时刻！', 'log-gold');
  return { ok: true, state: snap };
}
