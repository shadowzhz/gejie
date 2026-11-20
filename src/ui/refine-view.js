import { GU_DEFS, ITEMS, REFINE_RECIPES, guEffectText, recipeIngredientsText, recipeOutputText } from '../data/gu.js';
import { canStartRefine, knowsRefineRecipe, refineRealm, refineSuccessRate } from '../core/refine.js';
import { esc } from '../core/state.js';

export function renderRefineView(gs) {
  const realm = refineRealm(gs.player);
  const cards = REFINE_RECIPES.filter((r) => knowsRefineRecipe(gs, r)).map((r) => {
    const chk = canStartRefine(gs, r.id);
    const out = GU_DEFS[r.out] || ITEMS[r.out];
    return `<div class="card">
      <div class="kv"><b>${esc(recipeOutputText(r))}</b><span class="badge">${out.rank ? `${out.rank}转 · ` : ''}${r.method ?? '合炼'}</span></div>
      <div class="muted">${esc(recipeIngredientsText(r))} · 费用 ${r.cost} 元石 · 稳炉成算 ${Math.round(refineSuccessRate(r.rate, realm.bonus, true) * 100)}%</div>
      <div class="muted" style="margin-bottom:8px">${esc(out.desc)}${guEffectText(out) ? `<br>${esc(guEffectText(out))}` : ''}</div>
      <button class="primary" ${!chk.ok ? 'disabled' : ''} data-action="startRefine" data-id="${r.id}">
        ${chk.ok ? '查看炉方' : esc(chk.reason)}
      </button>
    </div>`;
  }).join('');

  return `<div class="card">
      <h3>炼蛊</h3>
      <div>炼道 · ${realm.name}</div>
      <div class="muted">炼道心得 ${realm.insight}${realm.next ? ` / ${realm.next}` : ''}</div>
      <div class="muted">${cards ? "看准时机逐份投料，再调火候、收炉成蛊。" : "尚未习得蛊方。蛊铺出售常见蛊方，传承蛊方随剧情或历练习得。"}</div>
    </div>
    <div class="grid2">${cards}</div>`;
}
