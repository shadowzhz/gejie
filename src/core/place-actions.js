import { canExpedition, EXPEDITION_MINUTES, expeditionProgress } from './expedition.js';
import { fieldTrialStatus, recordFieldTrial, settleFieldTrial } from './field-trial.js';
import { ENEMIES } from '../data/enemies.js';
import { GU_DEFS, ITEMS, REFINE_RECIPES, recipeOutputText } from '../data/gu.js';
import { CLAN_GIFT_GU, GROTTO_GU, PLACES, rareGathering } from '../data/places.js';
import { formatDateTime, MIN_PER_DAY, MIN_PER_SHICHEN } from './calendar.js';
import { addGu, addItem, addLog, claimBenming, recordQuestProgress } from './state.js';
import { startBattle } from './combat.js';
import { availableLocalScenes, hasLocalLifeScene, innRumors, lookForLifeScene, nextRetreatTime } from './story-engine.js';
import { advanceMinutes } from './clock.js';
import { availableRecipeDiscovery } from './refine.js';

function collectFieldMaterial(gs, id, count) {
  addItem(gs, id, count);
  recordQuestProgress(gs, 'gather', gs.location);
  recordFieldTrial(gs, 'gathered');
  const message = `采集完成，获得「${ITEMS[id].name}」×${count}`;
  addLog(gs, `${message}。`, 'log-good');
  return { ok: true, message, item: id, count };
}

function startFieldBattle(gs, place, boss, rng) {
  const battle = startBattle(gs, boss ? place.bossEnemy : place.exploreEnemy,
    boss ? `讨伐${place.name}` : `${place.name}遭遇`, rng);
  if (battle && place.id === 'zhulin' && fieldTrialStatus(gs)?.steps[0].done) battle.scouted = true;
}

function exploreField(gs, rng) {
  const place = PLACES[gs.location];
  if (!canExpedition(gs, place)) return { reason: '炼化本命蛊并完成演武训练后，可在开放的野外地点探路。' };
  advanceMinutes(gs, EXPEDITION_MINUTES);
  if (gs.pendingEventId || gs.player.dead) return { ok: true };
  const count = expeditionProgress(gs, place.id) + 1;
  (gs.player.expeditions ??= {})[place.id] = count;
  recordFieldTrial(gs, 'scouted');

  if (place.id === 'xuefu' && gs.flags['clear:xuefu'] && !gs.flags['clue:huajiu']) {
    gs.flags['clue:huajiu'] = true;
    const message = '循水声发现水帘后的暗涧遗洞，入口已标在地图上。';
    addLog(gs, `【探路】${message}`, 'log-gold');
    return { ok: true, receipt: { title: '发现暗涧遗洞', lines: [message] } };
  }
  if (availableRecipeDiscovery(gs)) return performPlaceAction(gs, 'discoverRecipe');
  if (count % 3 === 2) {
    startFieldBattle(gs, place, false, rng);
    return { ok: true };
  }
  if (count % 3 === 0) {
    if (hasLocalLifeScene(gs) && lookForLifeScene(gs, rng).event) return { ok: true };
    const scene = availableLocalScenes(gs)[0];
    if (scene) {
      const message = `沿路发现「${scene.title}」的线索，可在此地剧情查看。`;
      addLog(gs, `【探路】${message}`);
      return { ok: true, message };
    }
    const boss = ENEMIES[place.bossEnemy];
    const wildGu = GU_DEFS[boss?.reward?.gu];
    if (wildGu && !gs.flags[`clear:${place.id}`] && !gs.flags[`trail:${place.id}`]) {
      gs.flags[`trail:${place.id}`] = true;
      const message = `发现${wildGu.name}寄居在${boss.name}身上。准备好后，可在此地选择讨伐。`;
      addLog(gs, `【探路】${message}`, 'log-gold');
      return { ok: true, receipt: { title: '发现野生蛊虫的踪迹', lines: [message] } };
    }
  }
  return collectFieldMaterial(gs, place.gather[Math.floor(rng() * place.gather.length)], 1);
}

export function performPlaceAction(gs, id, rng = Math.random) {
  const p = gs.player;
  if (p.dead || gs.battle || gs.pendingEventId || gs.refining || gs.breakthrough) return;
  if (id === 'fieldExplore') return exploreField(gs, rng);
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
    if (gs.location !== 'xuetang' || p.benming || p.unrefinedBenming) return;
    claimBenming(gs);
    return { ok: true, receipt: {
      title: '学堂 · 领取本命蛊',
      lines: ['月光蛊 ×1（待炼化）', '月兰花瓣 ×8'],
      detail: '前往修行页面，消耗真元炼化月光蛊。'
    } };
  } else if (id === 'caoren') {
    if (gs.location !== 'yanwu') return;
    advanceMinutes(gs, 30);
    if (!gs.pendingEventId && !p.dead && startBattle(gs, 'caoren', '演武场练手')) gs.flags.practiced = true;
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
    if (gs.location !== 'jiazhuge' || p.rank < 2) return;
    if (!gs.flags['clan_gift_r2']) {
      gs.flags['clan_gift_r2'] = true;
      p.yuanshi += 40;
      for (const gu of CLAN_GIFT_GU) addGu(gs, gu);
      addLog(gs, '【家族赏赐】族长嘉许你晋入二转，赏元石 40、赤铁舍利蛊和玉皮蛊各 1 只！', 'log-gold');
      return { ok: true, receipt: { title: '族长阁 · 二转赏赐', lines: ['元石 ×40', '赤铁舍利蛊 ×1', '玉皮蛊 ×1'] } };
    } else {
      return { reason: '族中近来暂无新赏格' };
    }
  } else if (id === 'fieldScout') {
    const trial = fieldTrialStatus(gs);
    if (gs.location !== 'zhulin' || !trial?.active || trial.steps[0].done) return;
    advanceMinutes(gs, 30);
    if (gs.pendingEventId || p.dead) return { ok: true };
    recordFieldTrial(gs, 'scouted');
    const message = '你记下了兽径和月兰花丛的位置。此轮历练在竹林搜山时可看清对手意图。';
    addLog(gs, `【勘察】${message}`);
    return { ok: true, message };
  } else if (id.startsWith('fieldReward:') || id === 'fieldPatrol') {
    return settleFieldTrial(gs, id === 'fieldPatrol' ? id : id.slice('fieldReward:'.length));
  } else if (id === 'exploreFight' || id === 'exploreBoss') {
    const place = PLACES[gs.location];
    const boss = id === 'exploreBoss';
    if (!(boss ? place.bossEnemy : place.exploreEnemy) || (boss && gs.flags[`clear:${place.id}`])) return;
    advanceMinutes(gs, 60);
    if (!gs.pendingEventId && !p.dead) startFieldBattle(gs, place, boss, rng);
  } else if (id === 'gather' || id === 'gatherPetals') {
    const place = PLACES[gs.location];
    const petals = id === 'gatherPetals';
    if (!place.gather || (petals && (place.id !== 'zhulin' || !fieldTrialStatus(gs)?.steps[0].done))) return;
    advanceMinutes(gs, MIN_PER_SHICHEN);
    if (gs.pendingEventId || p.dead) return { ok: true };
    const rare = petals ? null : rareGathering(gs, place);
    if (rare) gs.flags[`gathered:${place.id}`] = Math.floor(gs.minutes / MIN_PER_DAY);
    const got = petals ? 'yuelanhua' : rare || place.gather[Math.floor(rng() * place.gather.length)];
    const count = rare ? 4 : 2;
    return collectFieldMaterial(gs, got, count);
  } else if (id === 'discoverRecipe') {
    const discovery = availableRecipeDiscovery(gs);
    if (!discovery) return;
    (p.recipes ??= []).push(discovery.id);
    const recipe = REFINE_RECIPES.find(({ id }) => id === discovery.id);
    const message = `习得「${recipeOutputText(recipe)}」蛊方`;
    addLog(gs, `【蛊方】${message}。`, 'log-gold');
    return { ok: true, message, receipt: { title: '发现蛊方', lines: [message, '可在炼蛊页查看材料与开炉条件。'] } };
  } else if (id === 'huajiuLoot') {
    if (gs.location !== 'huajiu' || !gs.flags['clue:huajiu']) return { reason: '请先找到并前往暗涧遗洞。' };
    if (gs.flags['looted:huajiu']) return { reason: '遗洞宝藏已被你取空' };
    gs.flags['looted:huajiu'] = true;
    advanceMinutes(gs, 60);
    p.yuanshi += 45;
    for (const gu of GROTTO_GU) addGu(gs, gu);
    addItem(gs, 'qingzhujiu', 5);
    const lines = [...GROTTO_GU.map((id) => `${GU_DEFS[id].name} ×1`), '青竹酒 ×5', '元石 ×45'];
    addLog(gs, `【花酒行者遗藏】获得${lines.join('、')}。`, 'log-gold');
    return { ok: true, receipt: {
      title: '暗涧遗洞 · 花酒行者遗藏',
      lines
    } };
  } else if (id === 'escapeMountain') {
    p.escapedMountain = true;
    return { ok: true, won: true };
  } else {
    return;
  }
  return { ok: true };
}
