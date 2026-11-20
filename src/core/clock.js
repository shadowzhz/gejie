import { GU_DEFS } from '../data/gu.js';
import { PLACES } from '../data/places.js';
import { formatDateTime, MIN_PER_DAY, MIN_PER_KE, MIN_PER_MONTH } from './calendar.js';
import { activeCultivationWine, addLog, feedGu, hasGu, recalcStats, recordQuestProgress, removeGuByUid } from './state.js';
import { checkStoryTriggers } from './story-engine.js';

export function placeMoveList(gs) {
  if (!PLACES[gs.location]) return [];
  const routes = new Map([[gs.location, { minutes: 0, blocked: '' }]]);
  const pending = new Set([gs.location]);

  while (pending.size) {
    const id = [...pending].reduce((nearest, candidate) => (
      routes.get(candidate).minutes < routes.get(nearest).minutes ? candidate : nearest
    ));
    pending.delete(id);
    const route = routes.get(id);
    if (route.blocked) continue;

    for (const [next, duration] of Object.entries(PLACES[id].links)) {
      const target = PLACES[next];
      if (!target || (target.hidden && !gs.flags[target.hidden])) continue;
      const minutes = route.minutes + duration;
      if (minutes >= (routes.get(next)?.minutes ?? Infinity)) continue;
      const blocked = target.lock && !gs.flags[target.lock.flag] ? target.lock.msg : '';
      routes.set(next, { minutes, blocked });
      pending.add(next);
    }
  }

  routes.delete(gs.location);
  return [...routes].map(([id, route]) => ({ id, name: PLACES[id].name, ...route }));
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
  recordQuestProgress(gs, 'visit', targetId);
  checkStoryTriggers(gs);
  return { ok: true };
}

export function advanceMinutes(gs, minutes) {
  if (!gs || gs.player.dead || minutes <= 0) return;
  const oldDay = Math.floor(gs.minutes / MIN_PER_DAY);
  const oldMonth = Math.floor(gs.minutes / MIN_PER_MONTH);
  gs.minutes += minutes;
  const newDay = Math.floor(gs.minutes / MIN_PER_DAY);
  const newMonth = Math.floor(gs.minutes / MIN_PER_MONTH);

  const p = gs.player;
  const kes = minutes / MIN_PER_KE;
  const inLodge = gs.location === 'zhulou';
  const hpRegen = kes * (inLodge ? 1.2 : 0.4);
  const zyRegen = kes * (0.25 + p.hai * 0.05) * (inLodge ? 1.4 : 1.0);
  p.hp = Math.min(p.hpMax, Number((p.hp + hpRegen).toFixed(2)));
  p.zy = Math.min(p.zyMax, Number((p.zy + zyRegen).toFixed(2)));

  // 轻挂机修为缓涨（竹楼或正常时辰自然温养）
  if (p.xiao < 3) {
    const wineMul = activeCultivationWine(p) ? (p.rank === 1 ? 1.25 : 1.45) : 1;
    const xpGain = kes * (0.22 + p.hai * 0.04) * wineMul;
    p.xp = Number((p.xp + xpGain).toFixed(2));
  }

  // 跨日结算蛊虫饱食：饱食归零 2 日后进入虚弱无法出战，归零 5 日后非本命/非春秋蝉损毁
  const daysPassed = newDay - oldDay;
  if (daysPassed > 0) {
    for (let i = gs.player.gu.length - 1; i >= 0; i--) {
      const g = gs.player.gu[i];
      const def = GU_DEFS[g.id];
      if (!def || !def.food) continue;
      for (let day = 0; day < daysPassed; day++) {
        g.satiety = Math.max(0, g.satiety - 12);
        if (p.autoFeed && feedGu(gs, g, 51)) addLog(gs, `【自动喂养】已喂食「${def.name}」。`);
        if (g.satiety > 0) g.starveDays = 0;
        else g.starveDays = (g.starveDays || 0) + 1;
      }
      if (g.satiety > 0) continue;
      const canDie = g.uid !== p.benming && g.id !== 'chunqiuchan';
      if (g.starveDays >= 5 && canDie) {
        removeGuByUid(gs, g.uid);
        addLog(gs, `【饥毙】「${def.name}」断粮多日，气息彻底溃散，化作飞灰消散！`, 'log-bad');
      } else if (g.starveDays >= 2) {
        addLog(gs, `【虚弱】「${def.name}」饥饿过久已陷入虚弱，无法在战中催动！`, 'log-warn');
      } else {
        addLog(gs, `【饥饿】「${def.name}」腹中空空，若再不喂食恐将虚弱损毁！`, 'log-warn');
      }
    }
  }

  // 跨月发放学堂/家族月例
  if (gs.flags.kaike) {
    const base = { 甲: 18, 乙: 12, 丙: 8, 丁: 5 }[p.grade] || 8;
    const stipend = base * p.rank;
    for (let month = oldMonth + 1; month <= newMonth; month++) {
      p.yuanshi += stipend;
      addLog(gs, `【月例】${formatDateTime(month * MIN_PER_MONTH)}发俸，领得元石 +${stipend}。`, 'log-gold');
    }
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
  const cicada = snap.player.gu.find((g) => g.id === 'chunqiuchan');
  if (cicada) removeGuByUid(snap, cicada.uid);
  snap.snapshot = null;
  snap.player.dead = false;
  if (!PLACES[snap.location]) snap.location = 'shijie';
  addLog(snap, '【逆流重开】春秋蝉振翼长鸣，你自死亡前一瞬逆流回到旧影时刻！', 'log-gold');
  return { ok: true, state: snap };
}
