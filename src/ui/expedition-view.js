import { ENEMIES } from '../data/enemies.js';
import { GU_DEFS, ITEMS, REFINE_RECIPES, recipeOutputText } from '../data/gu.js';
import { FIELD_RECOMMENDED, GROTTO_GU, PLACES } from '../data/places.js';
import { expeditionProgress, materialSalePrice } from '../core/expedition.js';
import { RECIPE_DISCOVERIES, RECIPE_SOURCES, recipeOrigin } from '../core/refine.js';
import { availableLocalScenes, hasLocalLifeScene } from '../core/story-engine.js';
import { esc, SHOP_BATCH_LIMIT } from '../core/state.js';

const lockRequirements = {
  practiced: '完成演武场草人对练',
  kaike: '学堂开课后开放',
  'open:jiazhuge': '达到二转或获家族召见',
  'clear:xuefu': '讨伐血蝠洞首领'
};

const activityLabels = {
  rest: '歇息', cultivate: '打坐与突破', xuetang_gu: '领取本命蛊', xuetang_report: '交卷',
  practice_caoren: '草人对练', sparring: '切磋', shop: '交易', heal: '疗伤', rumor: '打听消息',
  recipes: '学习蛊方', quests: '委托与历练交付', clan_hall: '家族赏赐',
  explore: '探路、狩猎与讨伐', gather: '采集', huajiu_explore: '调查遗藏'
};

export function renderExpeditionDetails(gs, place, blocked = '') {
  const field = FIELD_RECOMMENDED[place.id];
  const enemies = [ENEMIES[place.exploreEnemy], ENEMIES[place.bossEnemy]].filter(Boolean);
  const materials = [...new Set([...(place.gather ?? []), place.rare?.item, ...enemies.map((e) => e.reward?.item)].filter(Boolean))];
  const gu = place.id === 'huajiu' ? GROTTO_GU : enemies.map((e) => e.reward?.gu).filter(Boolean);
  const discoveries = RECIPE_DISCOVERIES.filter(({ flag, place: id }) => id === place.id || flag === `clear:${place.id}`);
  const recipes = REFINE_RECIPES.filter(({ id }) => discoveries.some((recipe) => recipe.id === id)
    || RECIPE_SOURCES[id] === `looted:${place.id}`);
  const local = { ...gs, location: place.id };
  const scenes = !blocked && availableLocalScenes(local);
  return `<p class="muted">${esc(blocked || lockRequirements[place.lock?.flag] || (place.hidden ? '在血蝠洞找到水帘入口，或取得遗洞线索' : '开放'))}</p>
    <p>${esc(place.services.map((service) => activityLabels[service]).join(' · ') || '通行')}</p>
    ${field ? `<p>推荐 ${field.realm} · 危险 ${field.risk}</p>` : ''}
    ${enemies.length ? `<p>敌人 · ${enemies.map((e) => esc(e.name)).join('、')}<br>
      探路 ${expeditionProgress(gs, place.id)} 次 · ${gs.flags[`clear:${place.id}`] ? '首领已讨伐' : '首领未讨伐'}</p>` : ''}
    ${gs.flags[`trail:${place.id}`] && !gs.flags[`clear:${place.id}`] ? '<p>已找到野生蛊虫的踪迹，可准备讨伐。</p>' : ''}
    ${place.id === 'huajiu' ? `<p>${gs.flags['looted:huajiu'] ? '遗藏已领取' : '遗藏待调查'}</p>` : ''}
    ${materials.length ? `<p>山材 · ${materials.map((id) => esc(ITEMS[id].name)).join('、')}</p>` : ''}
    ${gu.length ? `<p>蛊虫 · ${gu.map((id) => esc(GU_DEFS[id].name)).join('、')}${enemies.length ? '（首领掉落）' : '（遗藏）'}</p>` : ''}
    ${recipes.map((recipe) => `<p>${esc(recipeOutputText(recipe))}蛊方 · ${esc(recipeOrigin(recipe))}</p>`).join('')}
    ${scenes?.length ? `<p>此地剧情 · ${scenes.map(({ title }) => esc(title)).join('、')}</p>` : ''}
    ${!blocked && hasLocalLifeScene(local) ? '<p>此地有新见闻</p>' : ''}`;
}

export function renderFieldTrade(gs) {
  const rows = Object.entries(gs.player.items).filter(([id, count]) => count > 0 && materialSalePrice(id))
    .map(([id, count]) => `<li class="list-row"><b>${esc(ITEMS[id].name)} ×${count}</b>
      <div class="shop-purchase">
        <input aria-label="${esc(ITEMS[id].name)}出售数量" type="number" min="1" max="${Math.min(count, SHOP_BATCH_LIMIT)}" value="1">
        <button class="sm" data-action="sellMaterial" data-id="${esc(id)}">卖 · ${materialSalePrice(id)} 元石/份</button>
      </div></li>`).join('');
  return `<section class="card"><h3>出售山材</h3><p class="muted">柜台回收采集和狩猎所得。口粮与炼材可留给自己的蛊虫。</p>
    ${rows ? `<ul class="list-rows">${rows}</ul>` : '<p class="muted">行囊里没有可出售的山材。</p>'}</section>`;
}
