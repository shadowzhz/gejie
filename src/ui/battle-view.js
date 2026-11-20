import { guEffectText } from '../data/gu.js';
import { battleGuPlan } from '../core/combat.js';
import { killerMoveBlock } from '../core/killer.js';
import { esc } from '../core/state.js';

export function renderBattleView(gs) {
  const b = gs.battle;
  const p = gs.player;
  const foe = b.foe;
  const hpPct = Math.round(p.hp / Math.max(1, p.hpMax) * 100);
  const zyPct = Math.round(p.zy / Math.max(1, p.zyMax) * 100);
  const foeHpText = b.scouted ? `${foe.hp} / ${foe.hpMax}` : (foe.hp > foe.hpMax * 0.6 ? '气息强盛' : foe.hp > foe.hpMax * 0.25 ? '已有伤势' : '摇摇欲坠');
  const intentText = foe.stunned
    ? '敌方本轮受制，无法出手'
    : (b.scouted && foe.intent ? `敌方下步：${foe.intent.name}（${foe.intent.kind === 'shield' ? '护盾' : foe.intent.kind === 'heal' ? '疗伤' : `威能约 ${foe.intent.power}`}）` : '敌方意图未明（可用念息蛊探知，或稳扎稳打）');

  const { choices, queued, cost } = battleGuPlan(gs);
  const hasQueue = queued.length > 0;
  const guButtons = choices.map(({ uid, def, cooldown }) => {
    const position = queued.findIndex((choice) => choice.uid === uid) + 1;
    const selected = position > 0;
    const disabled = !selected && (cooldown > 0 || p.zy - cost < def.cost);
    return `<button class="sm${selected ? ' gold' : ''}" aria-pressed="${selected}" title="${esc(guEffectText(def))}" ${disabled ? 'disabled' : ''} data-action="battleAct" data-kind="gu" data-id="${uid}">
      ${selected ? `${position}. ` : ''}${esc(def.name)} <span class="muted">${cooldown > 0 ? `冷却${cooldown}` : `耗${def.cost}`}</span>
    </button>`;
  }).join('');

  const moveButtons = p.moves.map((m) => {
    const cd = Math.max(0, (b.cds[m.id] || 0) - 1);
    const blocked = killerMoveBlock(gs, m);
    const disabled = hasQueue || blocked || cd > 0 || p.zy < m.cost;
    return `<button class="sm gold" ${disabled ? 'disabled' : ''} data-action="battleAct" data-kind="move" data-id="${esc(m.id)}">
      ${esc(m.name)} <span class="muted">${esc(blocked || (cd > 0 ? `冷却${cd}` : `耗${m.cost}`))}</span>
    </button>`;
  }).join('');

  const footer = b.state === 'ongoing'
    ? `<div class="card">
        <h3>第 ${b.round} 回合</h3>
        <div class="row" style="margin-bottom:8px">
          <button ${hasQueue ? 'disabled' : ''} data-action="battleAct" data-kind="attack">拳脚试探</button>
          <button ${hasQueue || p.yuanshi < 2 ? 'disabled' : ''} data-action="battleAct" data-kind="stone">消耗元石回元（-2元石）</button>
          ${!b.lethal ? '<button class="blood" data-action="battleAct" data-kind="lethal">下死手</button>' : '<span class="badge blood">死斗中 · 不可逃</span>'}
          ${!b.lethal ? `<button class="ghost" ${hasQueue ? 'disabled' : ''} data-action="battleAct" data-kind="flee">脱身逃走</button>` : ''}
        </div>
        ${guButtons ? `
          <div class="muted" style="margin-bottom:4px">按顺序选择蛊虫，再点一次可取消</div>
          <div class="row" style="margin-bottom:8px">${guButtons}</div>
          <div class="row" style="margin-bottom:8px">
            <button class="primary" ${hasQueue ? '' : 'disabled'} data-action="battleAct" data-kind="resolveGu">催动</button>
            ${hasQueue ? `<span class="muted">${queued.map(({ def }) => esc(def.name)).join(' → ')} · 耗 ${cost} 真元</span>` : ''}
          </div>` : ''}
        ${moveButtons ? `<div class="muted" style="margin-bottom:4px">催动杀招</div><div class="row">${moveButtons}</div>` : ''}
      </div>`
    : `<div class="card">
        <button class="primary" data-action="finishBattle">${b.state === 'win' ? '打扫战场离开' : b.state === 'fled' ? '脱身离开' : '查看结局'}</button>
      </div>`;

  return `<div class="card">
      <div class="kv">
        <strong>${esc(foe.name)} <span class="badge">${foe.rank}转</span></strong>
        <span>气血：${esc(foeHpText)}${foe.shield > 0 ? ` · 护盾 ${foe.shield}` : ''}</span>
      </div>
      <div class="intent-box">${esc(intentText)}</div>
    </div>
    <div class="card">
      <div class="kv"><span>我方气血 <b>${Math.round(p.hp)} / ${p.hpMax}</b></span><span>真元 <b>${Math.round(p.zy)} / ${p.zyMax}</b>${b.meShield ? ` · 护盾 ${b.meShield}` : ''}</span></div>
      <div class="bar hp" style="margin-bottom:6px"><i style="width:${hpPct}%"></i></div>
      <div class="bar zy"><i style="width:${zyPct}%"></i></div>
    </div>
    ${footer}
    <div class="card loglist">${b.logs.slice(-10).map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
}
