import { GU_DEFS, ITEMS, REFINE_RECIPES, recipeIngredientsText, recipeOutputText } from '../data/gu.js';
import { canStartRefine, knowsRefineRecipe, recipeOrigin, refineRealm, refineSuccessRate } from '../core/refine.js';
import { esc } from '../core/state.js';

export function renderRefineView(gs) {
  const realm = refineRealm(gs.player);
  const known = REFINE_RECIPES.filter((r) => knowsRefineRecipe(gs, r)).map((r) => {
    const check = canStartRefine(gs, r.id);
    return { r, ok: check.ok, reason: check.reason };
  });
  known.sort((a, b) => Number(b.ok) - Number(a.ok));

  const rows = known.map(({ r, ok, reason }) => {
    const out = GU_DEFS[r.out] || ITEMS[r.out];
    const rate = Math.round(refineSuccessRate(r.rate, realm.bonus, true) * 100);
    const parts = [
      ...Object.entries(r.gu).map(([id, count]) => {
        const have = gs.player.gu.filter((g) => g.id === id).length;
        const name = `${GU_DEFS[id].name}${count > 1 ? ` ×${count}` : ''}`;
        return `<span class="${have >= count ? '' : 'is-lack'}">${esc(name)}</span>`;
      }),
      ...Object.entries(r.materials).map(([id, count]) => {
        const have = gs.player.items[id] || 0;
        const name = `${ITEMS[id].name}${count > 1 ? ` ×${count}` : ''}`;
        return `<span class="${have >= count ? '' : 'is-lack'}">${esc(name)}</span>`;
      })
    ].join('<span> + </span>');

    return `<li class="list-row${ok ? ' is-ready' : ''}">
      <div class="list-main">
        <div class="list-title">
          <b>${esc(recipeOutputText(r))}</b>
          <span class="list-meta">${out.rank ? `${out.rank}转 · ` : ''}${r.method ?? '合炼'}</span>
        </div>
        <div class="list-sub">${parts}</div>
      </div>
      <div class="list-side">
        <span class="list-note" title="${esc(reason || '材料齐备，可立即开炉')}">成算 ${rate}% · ${r.cost} 元石</span>
        <button class="sm ${ok ? 'primary' : 'ghost'}" data-action="startRefine" data-id="${r.id}">${ok ? '开炉' : '缺料'}</button>
      </div>
    </li>`;
  }).join('');

  const unknown = REFINE_RECIPES.filter((recipe) => !knowsRefineRecipe(gs, recipe))
    .map((recipe) => `<li>${esc(recipeOutputText(recipe))} · ${esc(recipeOrigin(recipe))}</li>`).join('');

  return `<div class="card">
      <div class="list-head">
        <h3>炼蛊</h3>
        <span class="muted">炼道 · ${realm.name}（心得 ${realm.insight}${realm.next ? ` / ${realm.next}` : ''}）</span>
      </div>
      ${rows ? `<ul class="list-rows">${rows}</ul>` : '<div class="muted">尚未习得蛊方。</div>'}
    </div>${unknown ? `<section class="card"><details><summary>未习得蛊方的来源</summary><ul>${unknown}</ul></details></section>` : ''}`;
}

export function renderRefineRequirements(materials, cost, rate, bonus) {
  return `<div class="muted">${esc(materials)}<br>开炉 ${cost} 元石 · 稳炉成算 ${Math.round(refineSuccessRate(rate, bonus, true) * 100)}%</div>`;
}

export function renderRefineDetails(gs, recipe, reason) {
  return `<h2>${esc(recipeOutputText(recipe))}</h2>
    ${renderRefineRequirements(recipeIngredientsText(recipe), recipe.cost, recipe.rate, refineRealm(gs.player).bonus)}
    <div class="log-warn">${esc(reason)}</div>
    <button data-action="closeModal">返回炼蛊</button>`;
}
