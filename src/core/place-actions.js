import { ITEMS, REFINE_RECIPES, recipeOutputText } from '../data/gu.js';
import { PLACES, rareGathering } from '../data/places.js';
import { formatDateTime, MIN_PER_DAY } from './calendar.js';
import { addGu, addItem, addLog, claimBenming, recordQuestProgress } from './state.js';
import { startBattle } from './combat.js';
import { innRumors, nextRetreatTime } from './story-engine.js';
import { advanceMinutes } from './clock.js';
import { availableRecipeDiscovery } from './refine.js';

export function performPlaceAction(gs, id) {
  const p = gs.player;
  if (p.dead || gs.battle || gs.pendingEventId || gs.refining || gs.breakthrough) return;
  if (id === 'meditate') {
    advanceMinutes(gs, 120);
    addLog(gs, '你盘膝打坐一个时辰，吐纳天地灵气。');
  } else if (id === 'rest') {
    advanceMinutes(gs, 480);
    addLog(gs, '你在竹楼安歇四个时辰，精神恢复了不少。');
  } else if (id === 'retreat') {
    if (gs.location !== 'zhulou') return;
    const until = nextRetreatTime(gs);
    while (gs.minutes < until && !gs.pendingEventId && !p.dead) {
      const toDawn = MIN_PER_DAY - gs.minutes % MIN_PER_DAY;
      advanceMinutes(gs, Math.min(toDawn, until - gs.minutes));
    }
    addLog(gs, `【闭关】出关时已是${formatDateTime(gs.minutes)}。`);
  } else if (id === 'pickBenming') {
    claimBenming(gs);
  } else if (id === 'caoren') {
    advanceMinutes(gs, 30);
    gs.flags['practiced'] = true;
    if (!gs.pendingEventId) startBattle(gs, 'caoren', '演武场练手');
  } else if (id === 'sparring') {
    advanceMinutes(gs, 60);
    if (!gs.pendingEventId) startBattle(gs, 'fangzheng', '同窗切磋');
  } else if (id === 'docHeal') {
    if (p.yuanshi < 10) return { reason: '元石不足 10 块' };
    p.yuanshi -= 10;
    p.hp = p.hpMax;
    addLog(gs, '你在药堂敷药调理，气血已然回满。', 'log-good');
  } else if (id === 'rumor') {
    advanceMinutes(gs, 30);
    const news = innRumors(gs);
    if (!news.length) news.push('酒客正在等新的行脚商人进寨，暂时没有新的山外消息。');
    for (const line of news) addLog(gs, `【客栈】${line}`);
    return { ok: true, message: news.at(-1) };
  } else if (id === 'secretRumor') {
    if (gs.flags['clue:huajiu']) return;
    if (p.yuanshi < 12) return { reason: '元石不足 12 块' };
    p.yuanshi -= 12;
    advanceMinutes(gs, 30);
    gs.flags['clue:huajiu'] = true;
    const line = '血蝠洞下游瀑布后，藏着花酒行者的暗涧遗洞。';
    addLog(gs, `【密闻】${line}`, 'log-gold');
    return { ok: true, message: line };
  } else if (id === 'clanGift') {
    if (!gs.flags['clan_gift_r2']) {
      gs.flags['clan_gift_r2'] = true;
      p.yuanshi += 40;
      addGu(gs, 'chitie_sheli');
      addGu(gs, 'yupi');
      addLog(gs, '【家族赏赐】族长嘉许你晋入二转，赏元石 40、赤铁舍利蛊和玉皮蛊各 1 只！', 'log-gold');
    } else {
      return { reason: '族中近来暂无新赏格' };
    }
  } else if (id === 'exploreFight') {
    const place = PLACES[gs.location];
    advanceMinutes(gs, 60);
    if (!gs.pendingEventId && place.exploreEnemy) startBattle(gs, place.exploreEnemy, `${place.name}遭遇`);
  } else if (id === 'exploreBoss') {
    const place = PLACES[gs.location];
    advanceMinutes(gs, 60);
    if (!gs.pendingEventId && place.bossEnemy) startBattle(gs, place.bossEnemy, `讨伐${place.name}`);
  } else if (id === 'gather') {
    const place = PLACES[gs.location];
    if (!place.gather) return;
    advanceMinutes(gs, 120);
    const rare = rareGathering(gs, place);
    if (rare) gs.flags[`gathered:${place.id}`] = Math.floor(gs.minutes / MIN_PER_DAY);
    const got = rare || place.gather[Math.floor(Math.random() * place.gather.length)];
    const count = rare ? 4 : 2;
    addItem(gs, got, count);
    recordQuestProgress(gs, 'gather', gs.location);
    const message = `采集完成，获得「${ITEMS[got].name}」×${count}`;
    addLog(gs, `${message}。`, 'log-good');
    return { ok: true, message };
  } else if (id === 'discoverRecipe') {
    const discovery = availableRecipeDiscovery(gs);
    if (!discovery) return;
    (p.recipes ??= []).push(discovery.id);
    const recipe = REFINE_RECIPES.find(({ id }) => id === discovery.id);
    const message = `习得「${recipeOutputText(recipe)}」蛊方`;
    addLog(gs, `【蛊方】${message}。`, 'log-gold');
    return { ok: true, message };
  } else if (id === 'huajiuLoot') {
    if (gs.flags['looted:huajiu']) return { reason: '遗洞宝藏已被你取空' };
    gs.flags['looted:huajiu'] = true;
    advanceMinutes(gs, 60);
    p.yuanshi += 45;
    addGu(gs, 'jiuchong', 100);
    addGu(gs, 'baishi');
    addGu(gs, 'yupi');
    addGu(gs, 'chunqiuchan', 100);
    addItem(gs, 'qingzhujiu', 5);
    addLog(gs, '【遗洞奇遇】你从花酒遗藏中取得酒虫、白豕蛊、玉皮蛊与 45 元石。', 'log-gold');
    addLog(gs, '【遗洞奇遇】你还发现一只气息微弱的「春秋蝉（残）」。', 'log-gold');
  } else if (id === 'escapeMountain') {
    p.escapedMountain = true;
    return { ok: true, won: true };
  } else {
    return;
  }
  return { ok: true };
}
