import { STORY_EVENTS } from '../data/story.js';
import { parseTimeExpr } from './calendar.js';
import { addLog } from './state.js';
import { startBattle } from './combat.js';

function evalToken(gs, token) {
  if (!token) return true;
  if (token === 'benming') return !!gs.player.benming;
  if (token.startsWith('flag:')) return !!gs.flags[token.slice(5)];
  if (token.startsWith('at:')) return gs.location === token.slice(3);
  if (token.startsWith('before:')) return gs.minutes < parseTimeExpr(token.slice(7));
  if (token.startsWith('after:')) return gs.minutes >= parseTimeExpr(token.slice(6));
  return false;
}

export function evalCond(gs, cond) {
  if (!cond) return true;
  return cond.split('&').every((raw) => {
    const t = raw.trim();
    if (!t) return true;
    const neg = t.startsWith('!');
    const ok = evalToken(gs, neg ? t.slice(1) : t);
    return neg ? !ok : ok;
  });
}

export function checkStoryTriggers(gs, eventId) {
  if (!gs || gs.player.dead || gs.pendingEventId || gs.battle) return null;
  for (const ev of STORY_EVENTS) {
    if (eventId ? ev.id !== eventId : ev.manual) continue;
    if (gs.flags[`event_done:${ev.id}`]) continue;
    if (evalCond(gs, ev.cond)) {
      gs.pendingEventId = ev.id;
      return ev;
    }
  }
  return null;
}

export function applyEventChoice(gs, eventId, choiceIdx) {
  const ev = STORY_EVENTS.find((e) => e.id === eventId);
  if (!ev) { gs.pendingEventId = null; return; }
  const choice = ev.choices[choiceIdx] || ev.choices[0];
  gs.flags[`event_done:${ev.id}`] = true;
  gs.pendingEventId = null;

  for (const eff of choice.effects || []) {
    if (eff.startsWith('flag:')) {
      gs.flags[eff.slice(5)] = true;
    } else if (eff.startsWith('unflag:')) {
      delete gs.flags[eff.slice(7)];
    } else if (eff.startsWith('goal:')) {
      gs.goal = eff.slice(5);
    } else if (eff.startsWith('yuanshi:+')) {
      const add = Number(eff.slice(9)) || 0;
      gs.player.yuanshi += add;
      addLog(gs, `【${ev.title}】获得元石 +${add}。`, 'log-gold');
    } else if (eff.startsWith('mo:+')) {
      const add = Number(eff.slice(4)) || 0;
      gs.player.mo += add;
      addLog(gs, `【${ev.title}】恶名 +${add}。`, 'log-bad');
    } else if (eff === 'exam:nianmo') {
      const score = gs.player.rank * 25 + gs.player.xiao * 8 + gs.player.gu.length * 8 + (gs.flags['clear:zhulin'] ? 20 : 0);
      let reward = 10, grade = '丙等';
      if (score >= 85) { grade = '甲等'; reward = 45; }
      else if (score >= 60) { grade = '乙等'; reward = 25; }
      gs.player.yuanshi += reward;
      addLog(gs, `【年末大考】评定为${grade}，获族中赏赐元石 +${reward}。`, 'log-gold');
    } else if (eff.startsWith('battle:')) {
      startBattle(gs, eff.slice(7), ev.title);
    }
  }
  if (gs.player.rank >= 2) gs.flags['open:jiazhuge'] = true;
}
