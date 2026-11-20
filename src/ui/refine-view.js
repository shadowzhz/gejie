import { GU_DEFS, REFINE_RECIPES } from '../data/gu.js';
import { canStartRefine } from '../core/refine.js';
import { esc } from '../core/state.js';

export function renderRefineView(gs) {
  const atForge = gs.location === 'liangu';
  const cards = REFINE_RECIPES.map((r) => {
    const chk = canStartRefine(gs, r.id);
    const out = GU_DEFS[r.out];
    return `<div class="card">
      <div class="kv"><b>${esc(out.name)}</b><span class="badge">${out.rank}转 · 基础 ${Math.round(r.rate * 100)}%</span></div>
      <div class="muted" style="margin-bottom:8px">${esc(r.desc)} · 费用 ${r.cost} 元石</div>
      <button class="primary" ${!atForge || !chk.ok ? 'disabled' : ''} data-action="startRefine" data-id="${r.id}">
        ${!atForge ? '须在「炼蛊房」开炉' : chk.ok ? '开炉控火' : esc(chk.reason)}
      </button>
    </div>`;
  }).join('');

  return `<div class="card">
      <h3>炼蛊房 · 三轮控火</h3>
      <div class="muted">${atForge ? '地火已备，合炼时需守三轮火候（45°～75°最佳），若觉不稳可中途停炉保住主蛊。' : '请先前往山寨「炼蛊房」再开炉。'}</div>
    </div>
    <div class="grid2">${cards}</div>`;
}
