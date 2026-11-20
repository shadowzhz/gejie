import { guEffectText } from '../data/gu.js';
import { battleGuPlan } from '../core/combat.js';
import { killerMoveBlock } from '../core/killer.js';
import { esc } from '../core/state.js';

export function renderBattleView(gs) {
  const b = gs.battle;
  const p = gs.player;
  const foe = b.foe;
  const hpRatio = foe.hpMax ? Math.max(0, foe.hp / foe.hpMax) : 0;
  const hpState = hpRatio > 0.6 ? '气息强盛' : hpRatio > 0.25 ? '已有伤势' : '摇摇欲坠';
  const hpLevel = hpRatio > 0.6 ? 'high' : hpRatio > 0.25 ? 'mid' : 'low';
  const foeHp = b.scouted
    ? `<div class="foe-hp"><span class="bar hp"><i style="width:${Math.round(hpRatio * 100)}%"></i></span><span>${foe.hp} / ${foe.hpMax}</span><span class="foe-zy">真元 ${foe.zy}/${foe.zyMax}</span></div>`
    : `<div class="foe-hp is-${hpLevel}">${hpState}</div>`;
  const intentText = foe.stunned
    ? '本轮受制，无法出手'
    : b.scouted && foe.intent
      ? `${foe.intent.name}（${foe.intent.kind === 'shield' ? '护盾' : foe.intent.kind === 'heal' ? '疗伤' : `威能约 ${foe.intent.power}`}）`
      : '未明';

  const { choices, queued, cost } = battleGuPlan(gs);
  const hasQueue = queued.length > 0;
  const guButtons = choices.map(({ uid, def, weak, cooldown }) => {
    const position = queued.findIndex((choice) => choice.uid === uid) + 1;
    const selected = position > 0;
    const disabled = b.playerStunned || (!selected && (weak || cooldown > 0 || p.zy - cost < def.cost));
    return `<button class="skill${selected ? ' is-picked' : ''}" aria-pressed="${selected}" title="${esc(weak ? '饥饿虚弱，喂食后方可催动' : guEffectText(def))}" ${disabled ? 'disabled' : ''} data-action="battleAct" data-kind="gu" data-id="${uid}">
      ${selected ? `<i class="skill-order">${position}</i>` : ''}${esc(def.name)}<small>${weak ? '虚弱' : cooldown > 0 ? `冷却 ${cooldown}` : def.cost}</small>
    </button>`;
  }).join('');

  const moveButtons = p.moves.map((m) => {
    const cd = Math.max(0, (b.cds[m.id] || 0) - 1);
    const blocked = killerMoveBlock(gs, m);
    const disabled = b.playerStunned || hasQueue || blocked || cd > 0 || p.zy < m.cost;
    return `<button class="skill is-move" ${disabled ? 'disabled' : ''} ${blocked ? `title="${esc(blocked)}"` : ''} data-action="battleAct" data-kind="move" data-id="${esc(m.id)}">
      ${esc(m.name)}<small>${cd > 0 ? `冷却 ${cd}` : blocked ? '不可用' : m.cost}</small>
    </button>`;
  }).join('');

  const logs = b.logs.slice(-40);
  const logHtml = logs.map((l, i) => `<div${i === logs.length - 1 ? ' class="is-latest"' : ''}>${esc(l)}</div>`).reverse().join('');

  let actions;
  if (b.state !== 'ongoing') {
    actions = `<button class="primary battle-finish" data-action="finishBattle">${b.state === 'win' ? '打扫战场离开' : b.state === 'fled' ? '脱身离开' : '查看结局'}</button>`;
  } else if (b.playerStunned) {
    actions = `<section class="card battle-actions">
        <div class="skill-head"><span class="log-warn">心神受震，本轮无法催动蛊虫与杀招</span></div>
        <div class="battle-basic">
          <button class="primary" data-action="battleAct" data-kind="recover">调息稳神</button>
          <span class="battle-spacer"></span>
          ${b.lethal ? '<span class="battle-lethal">死斗中 · 不可逃</span>' : ''}
        </div>
      </section>`;
  } else {
    actions = `<section class="card battle-actions">
        ${guButtons ? `<div class="skill-group">
          <div class="skill-head">
            <span>蛊虫<em>依次点选，再点取消</em></span>
            <span class="skill-plan">${hasQueue ? `${queued.map(({ def }) => esc(def.name)).join(' → ')} · ${cost} 真元` : ''}</span>
          </div>
          <div class="skill-list">${guButtons}</div>
          <button class="primary battle-go" ${hasQueue ? '' : 'disabled'} data-action="battleAct" data-kind="resolveGu">催动</button>
        </div>` : ''}
        ${moveButtons ? `<div class="skill-group">
          <div class="skill-head"><span>杀招</span></div>
          <div class="skill-list">${moveButtons}</div>
        </div>` : ''}
        <div class="battle-basic">
          <button class="sm ghost" ${hasQueue ? 'disabled' : ''} data-action="battleAct" data-kind="attack">拳脚试探</button>
          <button class="sm ghost" ${hasQueue || p.yuanshi < 2 ? 'disabled' : ''} title="消耗 2 元石回复真元" data-action="battleAct" data-kind="stone">元石回元</button>
          <span class="battle-spacer"></span>
          ${b.lethal
            ? '<span class="battle-lethal">死斗中 · 不可逃</span>'
            : `<button class="sm ghost" ${hasQueue ? 'disabled' : ''} data-action="battleAct" data-kind="flee">逃走</button>
               ${foe.practice ? '' : '<button class="sm blood" title="不留余地，之后无法逃走" data-action="battleAct" data-kind="lethal">下死手</button>'}`}
        </div>
      </section>`;
  }

  return `<section class="card battle-foe">
      <div class="foe-top">
        <div class="foe-name"><b>${esc(foe.name)}</b><span>${foe.rank}转</span></div>
        <span class="battle-round">${b.state === 'ongoing' ? `第 ${b.round} 回合` : ''}</span>
      </div>
      <div class="foe-status">
        ${foeHp}
        ${foe.shield > 0 ? `<span class="foe-shield">护盾 ${foe.shield}</span>` : ''}
      </div>
      <div class="foe-intent${foe.stunned ? ' is-stunned' : ''}"><span>意图</span>${esc(intentText)}${!b.scouted && !foe.stunned ? '<small>念息蛊可探知</small>' : ''}</div>
      <div class="battle-log">${logHtml}</div>
    </section>
    ${actions}`;
}
