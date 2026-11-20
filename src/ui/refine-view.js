import { GU_DEFS, ITEMS, REFINE_RECIPES, recipeIngredientsText, recipeOutputText } from '../data/gu.js';
import { knowsRefineRecipe, refineRealm, refineSuccessRate } from '../core/refine.js';
import { esc } from '../core/state.js';

export function renderRefineView(gs) {
  const realm = refineRealm(gs.player);
  const cards = REFINE_RECIPES.filter((r) => knowsRefineRecipe(gs, r)).map((r) => {
    const out = GU_DEFS[r.out] || ITEMS[r.out];
    return `<div class="card">
      <div class="kv"><b>${esc(recipeOutputText(r))}</b><span class="badge">${out.rank ? `${out.rank}转 · ` : ''}${r.method ?? '合炼'}</span></div>
      <button class="sm" data-action="startRefine" data-id="${r.id}">查看蛊方</button>
    </div>`;
  }).join('');

  return `<div class="card">
      <h3>炼蛊</h3>
      <div>炼道 · ${realm.name}</div>
      <div class="muted">炼道心得 ${realm.insight}${realm.next ? ` / ${realm.next}` : ''}</div>
      ${cards ? '' : '<div class="muted">尚未习得蛊方。</div>'}
    </div>
    <div class="grid2">${cards}</div>`;
}

export function renderRefineRequirements(materials, cost, rate, bonus) {
  return `<div class="muted">${esc(materials)}<br>开炉 ${cost} 元石 · 稳炉成算 ${Math.round(refineSuccessRate(rate, bonus, true) * 100)}%</div>`;
}

export function renderRefineDetails(gs, recipe, reason) {
  return `<h2>${esc(recipeOutputText(recipe))}</h2>
    ${renderRefineRequirements(recipeIngredientsText(recipe), recipe.cost, recipe.rate, refineRealm(gs.player).bonus)}
    <div>${esc(reason)}</div>
    <button data-action="closeModal">返回炼蛊</button>`;
}
