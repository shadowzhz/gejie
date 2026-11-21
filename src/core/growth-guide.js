import { fieldTrialStatus } from './field-trial.js';
import { STORY_EVENTS } from '../data/story.js';
import { formatDateTime, parseTimeExpr } from './calendar.js';
import { evalCond } from './story-engine.js';

const submission = STORY_EVENTS.find(({ id }) => id === 'toumin_win');
const milestones = [
  ['nianmo_exam', '先修行与历练，为年末大考做准备。'],
  ['langchao_start', '趁狼潮未至，提升境界并备好疗伤物资。'],
  ['wolf_breach', '补充气血与真元，准备应对东门战事。'],
  ['tie_inquiry', '铁家将查问狼潮战事与商队失踪案。'],
  ['three_clans', '养好出战蛊虫，准备参加三寨大比。'],
  ['qingmao_endgame', '备好药粮，准备应对青茅山最后一战。']
].map(([id, hint]) => {
  const event = STORY_EVENTS.find((entry) => entry.id === id);
  const date = parseTimeExpr(event.cond.split('&')[0].slice('after:'.length));
  return { id, title: event.title, date, hint };
});

export function mainGrowthGoal(gs) {
  const { flags, player: p, minutes, pendingEventId } = gs;
  if (p.escapedMountain) return { text: '已走出青茅山' };
  if (pendingEventId) {
    const event = STORY_EVENTS.find(({ id }) => id === pendingEventId);
    if (event) return { text: `处理眼前事件 · ${event.title}` };
  }
  if (flags.qingmao_finished) return { text: '从青茅寨门离开青茅山', place: 'zhaimen' };
  if (!p.benming) {
    if (p.unrefinedBenming) return { text: '消耗真元，炼化本命蛊', tab: 'cultivation' };
    return { text: '到学堂的蛊室领取本命蛊', place: 'xuetang' };
  }
  if (!flags['event_done:toumin_win'] && evalCond({ ...gs, location: 'xuetang' }, submission.cond)) {
    return { text: '三月三日前回学堂向家老交卷', place: 'xuetang' };
  }
  if (!flags.practiced) return { text: '到演武场与草人傀儡对练，开启出寨历练', place: 'yanwu' };
  const trial = fieldTrialStatus(gs);
  if (trial?.active && (!trial.repeat || trial.ready)) {
    if (trial.ready) return { text: `${trial.title}已完成，回任务堂交付并选择奖励`, place: 'renwutang' };
    return { text: `${trial.title} · ${trial.next.text}`, place: 'zhulin' };
  }
  if (flags['clue:huajiu'] && !flags['looted:huajiu'] && !flags.langchao_seen) {
    return { text: '探索暗涧遗洞，搜寻花酒行者遗藏', place: 'huajiu' };
  }
  const next = milestones.find(({ id }) => !flags[`event_done:${id}`]);
  if (next) {
    const when = minutes < next.date ? ` · ${formatDateTime(next.date)}` : '';
    return { text: `${next.title}${when}。 ${next.hint}`, place: 'zhulou' };
  }
  return { text: gs.goal };
}
