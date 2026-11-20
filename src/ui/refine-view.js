import { GU_DEFS, REFINE_RECIPES, guEffectText, recipeIngredientsText } from '../data/gu.js';
import { canStartRefine } from '../core/refine.js';
import { esc } from '../core/state.js';

export function renderRefineView(gs) {
  const cards = REFINE_RECIPES.filter((r) => gs.player.recipes?.includes(r.id)).map((r) => {
    const chk = canStartRefine(gs, r.id);
    const out = GU_DEFS[r.out];
    return `<div class="card">
      <div class="kv"><b>${esc(out.name)}</b><span class="badge">${out.rank}转 · 基础 ${Math.round(r.rate * 100)}%</span></div>
      <div class="muted">${esc(recipeIngredientsText(r))} · 费用 ${r.cost} 元石</div>
      <div class="muted" style="margin-bottom:8px">${esc(guEffectText(out) || out.desc)}</div>
      <button class="primary" ${!chk.ok ? 'disabled' : ''} data-action="startRefine" data-id="${r.id}">
        ${chk.ok ? '开炉控火' : esc(chk.reason)}
      </button>
    </div>`;
  }).join('');

  return `<div class="card">
      <h3>合炼 · 三轮控火</h3>
      <div class="muted">${cards ? "合炼需守三轮火候（45°～75°最佳）。" : "尚未习得蛊方，可前往蛊铺购买。"}</div>
    </div>
    <div class="grid2">${cards}</div>`;
}
