import { STORY_CHARACTERS } from '../data/characters.js';
import { ITEMS } from '../data/gu.js';
import { MIN_PER_DAY } from './calendar.js';
import { addLog, useItem } from './state.js';
import { changeStoryRelation, storyRelation } from './story-progress.js';

const visits = {
  mobei: { place: 'yanwu', gift: 'shourou', chat: '“练的时候多吃点肉。手上有劲儿，上阵才不至于发抖。”' },
  chicheng: { place: 'jucaifang', gift: 'yuelanhua', chat: '“买口粮先看存货。轮到出寨才来找，掌柜可不会替你留。”' }
};

export function localPeople(gs) {
  if (!gs.flags.kaike || gs.player.dead || gs.player.escapedMountain) return [];
  return Object.keys(visits).filter((id) => visits[id].place === gs.location);
}

export function visitPerson(gs, id, gift = false) {
  if (gs.pendingEventId || gs.battle || !localPeople(gs).includes(id)) return null;
  const { name } = STORY_CHARACTERS[id];
  const { gift: item, chat } = visits[id];
  const day = Math.floor(gs.minutes / MIN_PER_DAY);
  const giftDays = (gs.story.giftDays ??= {});
  let response = chat;
  if (gift && giftDays[id] !== day && storyRelation(gs, id).favor < 100 && useItem(gs, item)) {
    const before = storyRelation(gs, id).favor;
    changeStoryRelation(gs, id, 5, 0);
    giftDays[id] = day;
    response = `送出 ${ITEMS[item].name} ×1。${name}收下了礼物，好感 +${storyRelation(gs, id).favor - before}。`;
    addLog(gs, `【${name}】${response}`, 'log-good');
  }
  const { favor, trust, progress } = storyRelation(gs, id);
  return {
    id, name, response, favor, trust, progress,
    giftName: ITEMS[item].name,
    giftReason: giftDays[id] === day ? '今天已送过礼' : favor >= 100 ? '好感已满' : !gs.player.items[item] ? '行囊里没有礼物' : ''
  };
}
