import { GU_DEFS, ITEMS, REFINE_RECIPES, recipeOutputText } from '../data/gu.js';
import { PLACES } from '../data/places.js';
import { canExpedition, materialSalePrice } from './expedition.js';
import { placeMoveList } from './clock.js';
import { canStartRefine, knowsRefineRecipe } from './refine.js';
import { isGuWeak } from './state.js';
import { fieldRecommendation, fieldTrialStatus } from './field-trial.js';
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

export function mainStoryGoal(gs) {
  const { flags, player: p, minutes, pendingEventId } = gs;
  if (p.escapedMountain) return { text: '已走出青茅山' };
  if (pendingEventId) {
    const event = STORY_EVENTS.find(({ id }) => id === pendingEventId);
    if (event) return { text: `处理眼前事件 · ${event.title}` };
  }
  if (flags.qingmao_finished) return { text: '从青茅寨门离开青茅山', place: 'zhaimen' };
  if (!p.benming) {
    if (p.unrefinedBenming) return { text: '消耗真元，炼化本命蛊', tab: 'cultivation', refineBenming: true };
    return { text: '到学堂的蛊室领取本命蛊', place: 'xuetang' };
  }
  if (!flags['event_done:toumin_win'] && evalCond({ ...gs, location: 'xuetang' }, submission.cond)) {
    return { text: '三月三日前回学堂向家老交卷', place: 'xuetang' };
  }
  if (!flags.practiced) return { text: '到演武场与草人傀儡对练，开启出寨历练', place: 'yanwu' };
  if (flags['clue:huajiu'] && !flags['looted:huajiu'] && !flags.langchao_seen) {
    return { text: '探索暗涧遗洞，搜寻花酒行者遗藏', place: 'huajiu' };
  }
  const next = milestones.find(({ id }) => !flags[`event_done:${id}`]);
  if (next) {
    const when = minutes < next.date ? ` · ${formatDateTime(next.date)}` : '';
    return { text: `${next.title}${when}。 ${next.hint}` };
  }
  return { text: gs.goal };
}

export function freeGrowthGoal(gs) {
  const { player: p, flags } = gs;
  if (!p.benming || p.escapedMountain || flags.qingmao_finished || p.dead) return null;
  if (!flags.practiced) return { text: '到演武场与草人对练，开放竹林和血蝠洞。', place: 'yanwu' };

  const trial = fieldTrialStatus(gs);
  if (trial?.ready) return { text: `${trial.title}已完成，回任务堂交付并选择奖励。`, place: 'renwutang' };
  const recommendation = fieldRecommendation(gs);
  if (recommendation.place === 'zhulou') return recommendation;

  const benming = p.gu.find(({ uid }) => uid === p.benming);
  const food = GU_DEFS[benming?.id]?.food;
  if (food && isGuWeak(benming)) {
    if (p.items[food]) return { text: `本命蛊虚弱。到空窍用${ITEMS[food].name}喂养，再去狩猎。`, tab: 'aperture', label: '前往喂养' };
    const shop = Object.values(PLACES).find((place) => place.shop?.includes(`item:${food}`));
    if (shop && p.yuanshi >= ITEMS[food].price) {
      return { text: `本命蛊缺粮。到${shop.name}购买${ITEMS[food].name}。`, place: shop.id };
    }
    const field = Object.values(PLACES).find((place) => place.gather?.includes(food)
      && (place.id === gs.location || placeMoveList(gs).some(({ id, blocked }) => id === place.id && !blocked)));
    if (field) return { text: `本命蛊缺粮。到${field.name}采集${ITEMS[food].name}后，回空窍喂养。`, place: field.id };
    if (shop) return { text: `本命蛊缺粮。可先到竹林采山材，卖了换元石后再买${ITEMS[food].name}。`, place: 'zhulin' };
  }
  if (trial?.active && !trial.repeat) return { text: `${trial.title} · ${trial.next.text}`, place: 'zhulin' };

  const ready = REFINE_RECIPES.find((recipe) => canStartRefine(gs, recipe.id).ok);
  if (ready) return { text: `材料和元石已经齐备，可尝试炼制${recipeOutputText(ready)}。`, tab: 'refine', label: '前往炼蛊' };

  const starterRecipe = REFINE_RECIPES.find(({ id }) => id === 'r_shoupi');
  if (!knowsRefineRecipe(gs, starterRecipe) && p.yuanshi >= starterRecipe.price + starterRecipe.cost
    && p.items.shourou >= starterRecipe.materials.shourou && !p.gu.some(({ id }) => id === starterRecipe.out)) {
    return { text: '兽肉和元石已经够用。到蛊铺买兽皮蛊方，可把兽肉炼成防御蛊。', place: 'gupu' };
  }

  const surplus = Object.entries(p.items).some(([id, count]) => materialSalePrice(id) && count >= 6);
  if (p.yuanshi < 12 && surplus) return { text: '元石偏少，可到聚财坊出售多余山材，保留口粮和需要的炼材。', place: 'jucaifang' };

  if (canExpedition(gs) && !recommendation.cautious && (gs.location === recommendation.place || gs.location === 'zhulin')) {
    return { text: `就在${PLACES[gs.location].name}探路或采集。想确定遇敌时，可主动狩猎。`, place: gs.location };
  }
  if (gs.location === recommendation.place) return recommendation;
  const route = placeMoveList(gs).find(({ id }) => id === recommendation.place);
  if (route && !route.blocked) return recommendation;
  return { text: '先回竹楼歇息，也可在蛊铺查看蛊方和货源。', place: 'zhulou' };
}

export function mainGrowthGoal(gs) {
  const { player, flags, pendingEventId } = gs;
  if (!player.benming || pendingEventId || flags.qingmao_finished || player.escapedMountain || !flags.practiced) {
    return mainStoryGoal(gs);
  }
  const story = mainStoryGoal(gs);
  if (story.place === 'xuetang') return story;
  return freeGrowthGoal(gs) ?? story;
}
