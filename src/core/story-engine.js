import { STORY_EVENTS } from '../data/story.js';
import { makeTime, MIN_PER_MONTH, parseTimeExpr } from './calendar.js';
import { GU_DEFS, ITEMS } from '../data/gu.js';
import { addGu, addItem, addLog, recalcStats } from './state.js';
import { startBattle } from './combat.js';
import { PLACES, rareGathering } from '../data/places.js';

export function finishStoryBattle(gs) {
  if (!gs.battle || gs.battle.state === 'ongoing') return false;
  if (gs.battle.storyEvent === 'qingmao_endgame' && gs.battle.state === 'fled') {
    delete gs.flags['event_done:qingmao_endgame'];
  }
  gs.battle = null;
  if (!gs.player.dead) checkStoryTriggers(gs);
  return true;
}

export function innRumors(gs) {
  const { flags, minutes, player } = gs;
  const news = [];
  if (minutes < makeTime(2, 3, 9)) news.push(`贾家商队${minutes < makeTime(2, 3, 1) ? '次年' : '今年'}三月初一至初八在蛊铺开市，第七日起有赤铁舍利蛊。持竞买帖的人可少付二十块买酒虫。`);
  if (flags['clue:huajiu'] && !flags['looted:huajiu']) news.push('从血蝠洞沿下游走，水帘背后便是暗涧遗洞。');
  if (flags['looted:huajiu']) news.push('酒虫要用青竹酒养着。酒虫饥饿虚弱，提纯真元的助益也会消失。');
  if (minutes < makeTime(2, 6, 1)) news.push('猎户说残狼越来越多。六月前备齐药粮，东门遇袭时有人能接应。');
  else if (!flags['event_done:wolf_breach']) news.push('东门和熊家的求援道只隔一道山坳。记过狼道的人知道该从哪儿绕。');
  if (flags.jia_evidence && !flags.jia_witness) news.push('贾富三月初六问话。收着商队失物的人，届时记得带去作证。');
  if (flags['event_done:jia_questions'] && !flags['event_done:tie_inquiry']) news.push(`铁家八月下旬入寨。你眼下恶名 ${player.mo}，达到 30 会遭追查；贾家凭证和守寨战功可供查验。`);
  if (flags.tie_bond && flags.chi_faction) news.push('赤城托人捎话，三寨大比时他能为你的保结作保。');
  for (const place of Object.values(PLACES)) {
    if (place.lock && !flags[place.lock.flag]) continue;
    const item = rareGathering(gs, place);
    if (item) news.push(`今日「${place.name}」有一处山材丰收，可一次采到 4 份「${ITEMS[item].name}」。`);
  }
  return news;
}

export function nextRetreatTime(gs) {
  const dates = STORY_EVENTS.filter((event) => !event.manual && !gs.flags[`event_done:${event.id}`])
    .map((event) => event.cond.match(/(?:^|&)after:([\d-]+)/)?.[1])
    .filter(Boolean).map(parseTimeExpr);
  if (gs.flags.wine_bid && !gs.flags.merchant_jiuchong_bought) dates.push(makeTime(2, 3, 1));
  return Math.min(gs.minutes + MIN_PER_MONTH, ...dates.filter((date) => date > gs.minutes));
}

function evalToken(gs, token) {
  if (!token) return true;
  if (token === 'benming') return !!gs.player.benming;
  if (token.startsWith('flag:')) return !!gs.flags[token.slice(5)];
  if (token.startsWith('at:')) return gs.location === token.slice(3);
  if (token.startsWith('before:')) return gs.minutes < parseTimeExpr(token.slice(7));
  if (token.startsWith('after:')) return gs.minutes >= parseTimeExpr(token.slice(6));
  if (token.startsWith('mo:')) return gs.player.mo >= Number(token.slice(3));
  if (token.startsWith('stones:')) return gs.player.yuanshi >= Number(token.slice(7));
  if (token.startsWith('rank:')) return gs.player.rank === Number(token.slice(5));
  if (token.startsWith('haiBelow:')) return gs.player.hai < Number(token.slice(9));
  if (token === 'true') return true;
  return false;
}

export function evalCond(gs, cond) {
  if (!cond) return true;
  const grouped = cond.replace(/\(([^()]*)\)/g, (_, group) => String(evalCond(gs, group)));
  if (grouped !== cond) return evalCond(gs, grouped);
  return cond.split('|').some((alternative) => alternative.split('&').every((raw) => {
    const t = raw.trim();
    if (!t) return true;
    const neg = t.startsWith('!');
    const ok = evalToken(gs, neg ? t.slice(1) : t);
    return neg ? !ok : ok;
  }));
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
  const choice = ev.choices[choiceIdx];
  if (gs.pendingEventId !== eventId || gs.player.dead || gs.battle || !choice || !evalCond(gs, choice.cond)) return;
  gs.flags[`event_done:${ev.id}`] = true;
  gs.pendingEventId = null;

  for (const eff of choice.effects || []) {
    if (eff.startsWith('flag:')) {
      gs.flags[eff.slice(5)] = true;
    } else if (eff.startsWith('unflag:')) {
      delete gs.flags[eff.slice(7)];
    } else if (eff.startsWith('goal:')) {
      gs.goal = eff.slice(5);
    } else if (eff.startsWith('yuanshi:')) {
      const add = Number(eff.slice(8));
      gs.player.yuanshi += add;
      addLog(gs, `【${ev.title}】元石 ${add >= 0 ? '+' : ''}${add}。`, 'log-gold');
    } else if (eff.startsWith('mo:')) {
      const before = gs.player.mo;
      gs.player.mo = Math.max(0, before + Number(eff.slice(3)));
      const change = gs.player.mo - before;
      if (change) addLog(gs, `【${ev.title}】恶名 ${change > 0 ? '+' : ''}${change}。`, change > 0 ? 'log-bad' : 'log-good');
    } else if (eff.startsWith('item:')) {
      const [, id, count] = eff.split(':');
      addItem(gs, id, Number(count));
      addLog(gs, `【${ev.title}】获得「${ITEMS[id].name}」×${count}。`, 'log-gold');
    } else if (eff.startsWith('hai:')) {
      const p = gs.player;
      const before = p.zyMax;
      const previousHai = p.hai;
      p.hai = Math.min(9.9, Math.round((p.hai + Number(eff.slice(4))) * 10) / 10);
      p.grade = p.hai >= 8 ? '甲' : p.hai >= 6 ? '乙' : p.hai >= 4 ? '丙' : '丁';
      recalcStats(gs);
      p.zy = Math.min(p.zyMax, p.zy + p.zyMax - before);
      addLog(gs, `【${ev.title}】元海 ${previousHai} 成 → ${p.hai} 成，资质 ${p.grade} 等。`, 'log-gold');
    } else if (eff === 'exam:nianmo') {
      const score = gs.player.rank * 25 + gs.player.xiao * 8 + gs.player.gu.length * 8 + (gs.flags['clear:zhulin'] ? 20 : 0);
      let reward = 10, grade = '丙等';
      if (score >= 85) { grade = '甲等'; reward = 45; }
      else if (score >= 60) { grade = '乙等'; reward = 25; }
      gs.player.yuanshi += reward;
      addLog(gs, `【年末大考】评定为${grade}，获族中赏赐元石 +${reward}。`, 'log-gold');
    } else if (eff.startsWith('gu:')) {
      const gu = addGu(gs, eff.slice(3));
      if (gu) addLog(gs, `【${ev.title}】获得「${GU_DEFS[gu.id].name}」。`, 'log-gold');
    } else if (eff.startsWith('battle:')) {
      const value = (prefix) => choice.effects.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
      startBattle(gs, eff.slice(7), ev.title, Math.random, {
        shield: Number(value('shield:') ?? 0),
        winFlag: value('onwin:'),
        winGu: value('wingu:'),
        storyEvent: ev.id
      });
    }
  }
  if (gs.player.rank >= 2) gs.flags['open:jiazhuge'] = true;
}
