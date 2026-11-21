import { STORY_EVENTS, STORY_QUESTS } from '../data/story.js';
import { isNight, makeTime, MIN_PER_DAY, MIN_PER_MONTH, MIN_PER_SHICHEN, parseTimeExpr } from './calendar.js';
import { GU_DEFS, ITEMS } from '../data/gu.js';
import { addGu, addItem, addLog, hasGu, recalcStats, useItem } from './state.js';
import { startBattle } from './combat.js';
import { PLACES, rareGathering } from '../data/places.js';
import { addStoryClue, advanceStoryQuest, changeStoryRelation, storyRelation } from './story-progress.js';

export function finishStoryBattle(gs) {
  if (!gs.battle || gs.battle.state === 'ongoing') return false;
  if (gs.battle.storyEvent === 'qingmao_endgame' && gs.battle.state === 'fled') {
    delete gs.flags['event_done:qingmao_endgame'];
  }
  if (gs.battle.storyEvent === 'bai_encounter') {
    if (gs.battle.state === 'win') changeStoryRelation(gs, 'bainingbing', 15, 20, '切磋取胜');
    else changeStoryRelation(gs, 'bainingbing', -2, 0, '切磋未能占上风');
  }
  if (gs.battle.storyEvent === 'three_clans' && gs.battle.state === 'win') {
    changeStoryRelation(gs, 'bainingbing', 6, 8, '三寨大比决出胜负');
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
  for (const [id, progress] of Object.entries(gs.story.quests)) {
    if (!gs.flags[`event_done:${STORY_QUESTS[id].followupEvent}`] && progress.followupAt) dates.push(progress.followupAt);
  }
  return Math.min(gs.minutes + MIN_PER_MONTH, ...dates.filter((date) => date > gs.minutes));
}

function evalToken(gs, token) {
  if (!token) return true;
  if (token === 'night') return isNight(gs.minutes);
  if (token === 'day') return !isNight(gs.minutes);
  if (token.startsWith('gu:')) return hasGu(gs, token.slice(3));
  if (token === 'benming') return !!gs.player.benming;
  if (token.startsWith('flag:')) return !!gs.flags[token.slice(5)];
  if (token.startsWith('at:')) return gs.location === token.slice(3);
  if (token.startsWith('before:')) return gs.minutes < parseTimeExpr(token.slice(7));
  if (token.startsWith('after:')) return gs.minutes >= parseTimeExpr(token.slice(6));
  if (token.startsWith('mo:')) return gs.player.mo >= Number(token.slice(3));
  if (token.startsWith('stones:')) return gs.player.yuanshi >= Number(token.slice(7));
  if (token.startsWith('rank:')) return gs.player.rank === Number(token.slice(5));
  if (token.startsWith('haiBelow:')) return gs.player.hai < Number(token.slice(9));
  const [kind, questId, value] = token.split(':');
  const quest = gs.story.quests[questId];
  if (kind === 'item') return (gs.player.items[questId] ?? 0) >= Number(value);
  if (kind === 'quest') return quest?.stage === value;
  if (kind === 'clue') return !!quest?.clues.includes(value);
  if (kind === 'outcome') return quest?.outcome === value;
  if (kind === 'due') return Number.isFinite(quest?.followupAt) && gs.minutes >= quest.followupAt;
  if (token.startsWith('trust:') || token.startsWith('favor:')) {
    const [axis, id, minimum] = token.split(':');
    const relation = storyRelation(gs, id);
    return !!relation && relation[axis] >= Number(minimum);
  }
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

export function availableLocalScenes(gs) {
  return STORY_EVENTS.filter((ev) => (ev.quest || ev.person) && ev.manual
    && !gs.flags[`event_done:${ev.id}`] && evalCond(gs, ev.cond));
}

function storyBlocked(gs) {
  return !gs || gs.player.dead || gs.pendingEventId || gs.battle || gs.refining || gs.breakthrough;
}

function localLifeScenes(gs) {
  return STORY_EVENTS.filter((ev) => ev.ambient
    && !gs.flags[`event_done:${ev.id}`] && evalCond(gs, ev.cond));
}

function lifeSceneCoolingDown(gs) {
  return gs.minutes < (gs.story.lifeReadyAt ?? 0);
}

export function hasLocalLifeScene(gs) {
  return !storyBlocked(gs) && !gs.player.escapedMountain
    && !lifeSceneCoolingDown(gs) && localLifeScenes(gs).length > 0;
}

export function lookForLifeScene(gs, rng = Math.random) {
  if (storyBlocked(gs) || gs.player.escapedMountain) return { message: '眼下不便打听。' };
  if (lifeSceneCoolingDown(gs)) return { message: '方才已留意过四周，过些时辰再来。' };
  const scenes = localLifeScenes(gs);
  if (!scenes.length) return { message: '暂时没有新见闻。' };
  if (rng() >= 0.7) {
    gs.story.lifeReadyAt = gs.minutes + MIN_PER_SHICHEN;
    return { message: '暂时没有新见闻。' };
  }
  const event = scenes[Math.floor(rng() * scenes.length)];
  gs.story.lifeReadyAt = gs.minutes + MIN_PER_DAY;
  gs.pendingEventId = event.id;
  return { event };
}

export function checkStoryTriggers(gs, eventId) {
  if (storyBlocked(gs)) return null;
  for (const ev of STORY_EVENTS) {
    if (ev.ambient || (eventId ? ev.id !== eventId : ev.manual)) continue;
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
  if (!ev || gs.flags[`event_done:${eventId}`]) return;
  const choice = ev.choices[choiceIdx];
  if (gs.pendingEventId !== eventId || gs.player.dead || gs.battle || !choice || !evalCond(gs, choice.cond)) return;
  gs.flags[`event_done:${ev.id}`] = true;
  gs.pendingEventId = null;
  gs.story.history[eventId] = { minute: gs.minutes, choice: choiceIdx };

  for (const eff of choice.effects || []) {
    if (eff.startsWith('flag:')) {
      gs.flags[eff.slice(5)] = true;
    } else if (eff.startsWith('unflag:')) {
      delete gs.flags[eff.slice(7)];
    } else if (eff.startsWith('relation:')) {
      const [, id, favor, trust, progress] = eff.split(':');
      changeStoryRelation(gs, id, Number(favor), Number(trust), progress);
    } else if (eff.startsWith('clue:')) {
      const [, quest, clue] = eff.split(':');
      addStoryClue(gs, quest, clue);
    } else if (eff.startsWith('quest:')) {
      const [, quest, stage, outcome] = eff.split(':');
      advanceStoryQuest(gs, quest, stage, outcome);
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
    } else if (eff.startsWith('take:')) {
      const [, id, count] = eff.split(':');
      useItem(gs, id, Number(count));
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
  if (eventId === 'tie_inquiry') {
    advanceStoryQuest(gs, 'caravan', 'failed', gs.flags.jia_missing_stones ? 'theft' : 'expired');
  }
  if (gs.player.rank >= 2) gs.flags['open:jiazhuge'] = true;
}
