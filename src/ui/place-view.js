import { fieldTrialStatus } from '../core/field-trial.js';
import { renderGoalShortcut } from './cultivation-view.js';
import { GU_DEFS, ITEMS, REFINE_RECIPES, guEffectText, recipeIngredientsText, recipeOutputText } from '../data/gu.js';
import { MERCHANT_GU, PLACES, placeShopEntries, merchantRefuses, rareGathering, shopUnitPrice } from '../data/places.js';
import { formatDateTime, isNight } from '../core/calendar.js';
import { esc, questBoard, SHOP_BATCH_LIMIT } from '../core/state.js';
import { availableLocalScenes, evalCond, hasLocalLifeScene, nextRetreatTime } from '../core/story-engine.js';
import { availableRecipeDiscovery, isRecipeSold } from '../core/refine.js';
import { STORY_EVENTS } from '../data/story.js';

function renderFieldTrial(gs, trial) {
  if (!trial) return '';
  const progress = trial.steps.filter(({ done }) => done).length;
  if (gs.location === 'zhulin') {
    return trial.active ? `<p class="muted">${trial.title} · ${progress}/${trial.steps.length}
      ${trial.ready ? renderGoalShortcut(gs, { place: 'renwutang' }) : ''}</p>` : '';
  }
  const steps = trial.active
    ? `<ul>${trial.steps.map(({ text, done }) => `<li>${esc(text)} · ${done ? '已完成' : '待完成'}</li>`).join('')}</ul>`
    : '<p>去竹林勘察、采料、清理兽患后，可回任务堂领赏。</p>';
  const rewards = trial.rewards.map(({ id, text }) =>
    `<button class="gold" data-action="placeAct" data-id="fieldReward:${id}">${esc(text)}</button>`).join('');
  const controls = trial.ready ? `<p>选择一份奖赏并交付。</p><div class="row">${rewards}</div>`
    : trial.active ? renderGoalShortcut(gs, { place: 'zhulin' })
    : '<button class="primary" data-action="placeAct" data-id="fieldPatrol">接取竹林巡守</button>';
  return `<section class="card">
    <div class="kv"><h3>${trial.title}</h3>${trial.active ? `<b>${progress}/${trial.steps.length}</b>` : ''}</div>
    ${steps}
    ${controls}
  </section>`;
}

export function renderPlaceView(gs) {
  const place = PLACES[gs.location] || PLACES.zhulou;
  const night = isNight(gs.minutes);
  const trial = ['zhulin', 'renwutang'].includes(place.id) ? fieldTrialStatus(gs) : null;
  const scenes = availableLocalScenes(gs).map(({ id, title }) =>
    `<button class="gold" data-action="checkEvents" data-id="${esc(id)}">${esc(title)}</button>`);
  if (hasLocalLifeScene(gs)) scenes.push('<button data-action="lookForLifeScene">留意四周</button>');
  const actions = [];
  const discovery = availableRecipeDiscovery(gs);
  if (discovery) actions.push(`<button class="gold" data-action="placeAct" data-id="discoverRecipe">${esc(discovery.action)}</button>`);

  if (place.services.includes('cultivate')) {
    actions.push('<button class="primary" data-action="placeAct" data-id="meditate">打坐吐纳 · 1 时辰</button>');
    actions.push('<button data-action="placeAct" data-id="rest">歇息养伤 · 4 时辰</button>');
    actions.push(`<button title="闭关期间照常消耗蛊虫口粮，请先备料并开启自动喂养" data-action="placeAct" data-id="retreat">闭关至${esc(formatDateTime(nextRetreatTime(gs)))}</button>`);
    if (gs.player.xiao < 3) actions.push('<button class="gold" data-action="washMinor">冲刷窍壁</button>');
    else actions.push('<button class="gold" data-action="openBreak">破壁冲关</button>');
  }
  if (place.services.includes('xuetang_gu')) {
    if (!gs.player.benming && !gs.player.unrefinedBenming) actions.push('<button class="gold" data-action="placeAct" data-id="pickBenming">进蛊室领本命蛊（月光蛊）</button>');
    if (gs.player.unrefinedBenming) actions.push('<button class="primary" data-action="navTab" data-tab="cultivation">前往修行炼化月光蛊</button>');
    const submission = STORY_EVENTS.find((event) => event.id === 'toumin_win');
    if (evalCond(gs, submission.cond)) actions.push('<button class="primary" data-action="checkEvents" data-id="toumin_win">向家老交卷夺头名</button>');
  }
  if (place.services.includes('practice_caoren')) {
    actions.push('<button class="gold" data-action="placeAct" data-id="caoren">与草人傀儡对练 · 2 刻</button>');
    actions.push('<button data-action="placeAct" data-id="sparring">与同窗切磋（古月方正）</button>');
  }
  if (place.services.includes('heal')) {
    actions.push('<button data-action="placeAct" data-id="docHeal">药堂疗伤（10 元石回满）</button>');
  }
  if (place.services.includes('rumor')) {
    actions.push('<button class="gold" data-action="placeAct" data-id="rumor">打听近况 · 2 刻</button>');
    if (!gs.flags['clue:huajiu']) actions.push('<button data-action="placeAct" data-id="secretRumor">买暗涧遗洞消息（12 元石）</button>');
  }
  if (place.services.includes('clan_hall')) {
    actions.push('<button class="gold" data-action="placeAct" data-id="clanGift">领取二转赏赐</button>');
  }
  if (place.services.includes('explore')) {
    if (trial?.active && !trial.steps[0].done) {
      actions.push('<button class="primary" data-action="placeAct" data-id="fieldScout">勘察兽径 · 2 刻</button>');
    }
    if (trial?.steps[0].done) {
      actions.push('<button data-action="placeAct" data-id="gatherPetals">采月兰花瓣 ×2 · 1 时辰</button>');
    }
    actions.push('<button class="blood" data-action="placeAct" data-id="exploreFight">深入搜山（遭遇战）</button>');
    if (place.bossEnemy && !gs.flags[`clear:${place.id}`]) {
      actions.push('<button class="gold" data-action="placeAct" data-id="exploreBoss">直捣兽王巢穴</button>');
    }
    actions.push('<button data-action="placeAct" data-id="gather">采集山材 · 1 时辰</button>');
  }
  if (place.services.includes('huajiu_explore')) {
    actions.push('<button class="gold" data-action="placeAct" data-id="huajiuLoot">搜寻花酒行者遗藏</button>');
  }
  if (place.id === 'zhaimen' && gs.flags['qingmao_finished']) {
    actions.push('<button class="gold" data-action="placeAct" data-id="escapeMountain">告别青茅山（卷一通关）</button>');
  }

  let shopHtml = '';
  const shop = placeShopEntries(gs);
  const sellsRecipes = place.services.includes('recipes');
  if (shop.length) {
    const rows = shop.map((entry) => {
      const [kind, id] = entry.split(':');
      const def = kind === 'gu' ? GU_DEFS[id] : ITEMS[id];
      if (!def) return '';
      const limited = MERCHANT_GU.includes(id);
      const price = shopUnitPrice(gs, id, def.price);
      const affordable = gs.player.yuanshi >= price;
      const recipes = sellsRecipes ? REFINE_RECIPES.filter(isRecipeSold)
        .filter((recipe) => kind === 'gu' ? recipe.gu[id] : recipe.materials[id])
        .map(recipeOutputText) : [];
      const effect = kind === 'gu' ? guEffectText(def) : '';
      return `<li class="list-row">
        <div class="list-main">
          <div class="list-title">
            <b>${esc(def.name)}</b>
            ${kind === 'gu' ? `<span class="list-meta">${def.rank}转 · ${esc(def.kind)}</span>` : `<span class="list-meta">${esc(def.kind)}</span>`}
            ${limited ? '<span class="gu-tag">商队限售一只</span>' : ''}
          </div>
          <div class="list-sub" ${effect ? `title="${esc(effect)}"` : ''}>${esc(def.desc)}${effect ? ` · ${esc(effect)}` : ''}</div>
          ${recipes.length ? `<div class="list-hint">蛊方材料：${esc(recipes.join('、'))}</div>` : ''}
        </div>
        <div class="shop-purchase">
          ${limited ? '' : `<input type="number" min="1" max="${SHOP_BATCH_LIMIT}" step="1" value="1" aria-label="${esc(def.name)}购买数量" ${affordable ? '' : 'disabled'}>`}
          <button class="sm ${affordable ? '' : 'ghost'}" ${affordable ? '' : 'disabled'} data-action="buyItem" data-id="${esc(entry)}">${id === 'jiuchong' && gs.flags.wine_bid ? '竞买' : '买'} · ${price}${limited ? '' : kind === 'gu' ? '/只' : '/份'}</button>
        </div>
      </li>`;
    }).join('');
    shopHtml = `<div class="card"><div class="list-head"><h3>${esc(place.name)}货架</h3><span class="muted">余额 ${gs.player.yuanshi} 元石</span></div><ul class="list-rows">${rows}</ul></div>`;
  }

  const board = place.services.includes('quests') ? questBoard(gs) : null;
  const questHtml = board ? `<div class="card">
      <div class="list-head"><h3>族中委托</h3><span class="muted">轮换 · ${esc(formatDateTime(gs.minutes + board.remaining))}</span></div>
      <ul class="list-rows">${board.entries.map((q) => {
        const ready = q.progress === q.target;
        return `<li class="list-row">
          <div class="list-main">
            <div class="list-title"><b>${esc(q.name)}</b><span class="list-meta">赏 ${q.reward} 元石${q.accepted ? ` · ${q.progress}/${q.target}` : ''}</span></div>
            <div class="list-sub">${esc(q.desc)}</div>
          </div>
          <div class="list-side">
            <button class="sm ${ready && q.accepted && !q.claimed ? 'primary' : ''}" ${q.claimed || (q.accepted && !ready) ? 'disabled' : ''} data-action="quest" data-id="${q.id}">
              ${q.claimed ? '已交付' : !q.accepted ? '接取' : ready ? '交付领赏' : '进行中'}
            </button>
          </div>
        </li>`;
      }).join('')}</ul>
    </div>` : '';

  const recipeHtml = sellsRecipes ? `<div class="card">
      <div class="list-head"><h3>蛊方</h3></div>
      <ul class="list-rows">${REFINE_RECIPES.filter(isRecipeSold).map((r) => {
        const owned = gs.player.recipes?.includes(r.id);
        const out = GU_DEFS[r.out] || ITEMS[r.out];
        return `<li class="list-row">
          <div class="list-main">
            <div class="list-title"><b>${esc(recipeOutputText(r))}${r.method ?? ''}蛊方</b>${out.rank ? `<span class="list-meta">${out.rank}转</span>` : ''}</div>
            <div class="list-sub">${esc(recipeIngredientsText(r))}</div>
          </div>
          <div class="list-side">
            <button class="sm" ${owned || gs.player.yuanshi < r.price ? 'disabled' : ''} data-action="buyRecipe" data-id="${r.id}">${owned ? '已习得' : `买 · ${r.price} 元石`}</button>
          </div>
        </li>`;
      }).join('')}</ul>
    </div>` : '';

  return `<section class="stage ${night ? 'is-night' : ''}">
      <div class="stage-loc">${esc(formatDateTime(gs.minutes))} · ${esc(place.region)}</div>
      <h1 id="place-title">${esc(place.name)}</h1>
      <p class="stage-desc">${esc(night ? place.night : place.day)}</p>
      ${place.gather ? `<p class="muted">常见山材 · ${esc([...new Set(place.gather)].map((id) => ITEMS[id].name).join('、'))}${rareGathering(gs, place) ? ` · 今日山材丰收，可采${esc(ITEMS[place.rare.item].name)} ×4` : ''}</p>` : ''}
      <div class="row">${actions.join('')}</div>
    </section>
    ${scenes.length ? `<section class="card"><h3>此地剧情</h3><div class="row">${scenes.join('')}</div></section>` : ''}
    ${merchantRefuses(gs) ? '<p class="card muted">贾家封了你的货帖，商队暂不与你做生意。</p>' : ''}
    ${renderFieldTrial(gs, trial)}
    ${questHtml}
    ${shopHtml}
    ${recipeHtml}`;
}
