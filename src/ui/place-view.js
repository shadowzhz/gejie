import { GU_DEFS, ITEMS, REFINE_RECIPES, guEffectText, recipeIngredientsText, recipeOutputText } from '../data/gu.js';
import { MERCHANT_GU, PLACES, placeShopEntries } from '../data/places.js';
import { formatDateTime, isNight } from '../core/calendar.js';
import { esc, questBoard } from '../core/state.js';
import { evalCond } from '../core/story-engine.js';
import { STORY_EVENTS } from '../data/story.js';

export function renderPlaceView(gs) {
  const place = PLACES[gs.location] || PLACES.zhulou;
  const night = isNight(gs.minutes);
  const actions = [];

  if (place.services.includes('cultivate')) {
    actions.push('<button class="primary" data-action="placeAct" data-id="meditate">打坐吐纳 · 1 时辰</button>');
    actions.push('<button data-action="placeAct" data-id="rest">歇息养伤 · 4 时辰</button>');
    if (gs.player.xiao < 3) actions.push('<button class="gold" data-action="washMinor">冲刷窍壁</button>');
    else actions.push('<button class="gold" data-action="openBreak">破壁冲关</button>');
  }
  if (place.services.includes('xuetang_gu')) {
    if (!gs.player.benming && !gs.player.unrefinedBenming) actions.push('<button class="gold" data-action="placeAct" data-id="pickBenming">进蛊室领本命蛊（月光蛊）</button>');
    if (gs.player.unrefinedBenming) actions.push('<button class="primary" data-action="navTab" data-tab="aperture">前往空窍炼化月光蛊</button>');
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
    actions.push('<button class="gold" data-action="placeAct" data-id="rumor">打听后山消息（12 元石）</button>');
  }
  if (place.services.includes('clan_hall')) {
    actions.push('<button class="gold" data-action="placeAct" data-id="clanGift">领取二转赏赐</button>');
  }
  if (place.services.includes('explore')) {
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
  if (shop.length) {
    const rows = shop.map((entry) => {
      const [kind, id] = entry.split(':');
      const def = kind === 'gu' ? GU_DEFS[id] : ITEMS[id];
      if (!def) return '';
      return `<div class="kv">
        <span><b>${esc(def.name)}</b> ${kind === 'gu' ? `<span class="badge">${def.rank}转</span>` : ''} ${MERCHANT_GU.includes(id) ? '<span class="badge">贾家商队 · 限一只</span>' : ''} <span class="muted">${esc(def.desc)}${kind === "gu" && guEffectText(def) ? `<br>${esc(guEffectText(def))}` : ''}</span></span>
        <button class="sm" ${gs.player.yuanshi < def.price ? 'disabled' : ''} data-action="buyItem" data-id="${esc(entry)}">买 · ${def.price}元石</button>
      </div>`;
    }).join('');
    shopHtml = `<div class="card"><h3>${esc(place.name)}货架</h3>${rows}</div>`;
  }

  const board = place.services.includes('quests') ? questBoard(gs) : null;
  return `<section class="stage ${night ? 'is-night' : ''}">
      <div class="stage-loc">${esc(formatDateTime(gs.minutes))} · ${esc(place.region)}</div>
      <h1 id="place-title">${esc(place.name)}</h1>
      <p class="stage-desc">${esc(night ? place.night : place.day)}</p>
      <div class="row">${actions.join('')}</div>
    </section>
    ${board ? `<div class="card"><h3>族中委托</h3>
      <div class="muted">下次轮换 · ${esc(formatDateTime(gs.minutes + board.remaining))}</div>
      ${board.entries.map((q) => {
        const ready = q.progress === q.target;
        return `<div class="kv"><span><b>${esc(q.name)}</b> · ${esc(q.desc)} · 赏 ${q.reward} 元石
          ${q.accepted ? ` · ${q.progress}/${q.target}` : ''}</span>
          <button class="sm" ${q.claimed || (q.accepted && !ready) ? 'disabled' : ''} data-action="quest" data-id="${q.id}">
            ${q.claimed ? '已交付' : !q.accepted ? '接取' : ready ? '交付领赏' : '进行中'}
          </button></div>`;
      }).join('')}</div>` : ''}
    ${shopHtml}
    ${place.services.includes('recipes') ? `<div class="card"><h3>蛊方</h3>${REFINE_RECIPES.map((r) => {
      const owned = gs.player.recipes?.includes(r.id);
      const out = GU_DEFS[r.out];
      return `<div class="kv"><span>${esc(recipeOutputText(r))}${r.method ?? ''}蛊方 · ${out.rank}转<br><small class="muted">${esc(recipeIngredientsText(r))}</small></span>
        <button class="sm" ${owned || gs.player.yuanshi < r.price ? 'disabled' : ''} data-action="buyRecipe" data-id="${r.id}">${owned ? '已习得' : `买 · ${r.price} 元石`}</button></div>`;
    }).join('')}</div>` : ''}`;
}
