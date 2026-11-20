import { GU_DEFS, REFINE_RECIPES, guEffectText, recipeIngredientsText, recipeOutputText } from '../data/gu.js';
import { canStartRefine } from '../core/refine.js';
import { esc } from '../core/state.js';

export function renderRefineView(gs) {
  const cards = REFINE_RECIPES.filter((r) => gs.player.recipes?.includes(r.id)).map((r) => {
    const chk = canStartRefine(gs, r.id);
    const out = GU_DEFS[r.out];
    return `<div class="card">
      <div class="kv"><b>${esc(recipeOutputText(r))}</b><span class="badge">${out.rank}转 · ${r.method ?? '合炼'}</span></div>
      <div class="muted">${esc(recipeIngredientsText(r))} · 费用 ${r.cost} 元石</div>
      <div class="muted" style="margin-bottom:8px">${esc(out.desc)}${guEffectText(out) ? `<br>${esc(guEffectText(out))}` : ''}</div>
      <button class="primary" ${!chk.ok ? 'disabled' : ''} data-action="startRefine" data-id="${r.id}">
        ${chk.ok ? '查看炉方' : esc(chk.reason)}
      </button>
    </div>`;
  }).join('');

  return `<div class="card">
      <h3>炼蛊</h3>
      <div class="muted">${cards ? "用有限火候达到蛊方的炼成度和安全炉压，再收炉成蛊。" : "尚未习得蛊方，可前往蛊铺购买。"}</div>
    </div>
    <div class="grid2">${cards}</div>`;
}
