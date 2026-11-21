import { guEffectText } from '../data/gu.js';
import { battleGuPlan } from '../core/combat.js';
import { killerEffectText, killerMoveBlock } from '../core/killer.js';
import { esc } from '../core/state.js';
import { renderEnemyEmblemSvg } from './visuals.js';

function guShortStat(def) {
  if (def.kind === '攻击') return `伤 ${def.power}`;
  if (def.kind === '控制') return `控 ${def.power}`;
  if (def.kind === '防御') return `盾 ${def.power}`;
  if (def.kind === '隐匿') return `盾 ${Math.round(def.power * 0.6)}`;
  if (def.kind === '治疗') return `疗 ${def.power}`;
  if (def.kind === '增益') return '月+35%';
  if (def.kind === '探知') return '探情';
  return '';
}

export function renderBattleView(gs, battleFx) {
  const b = gs.battle;
  const p = gs.player;
  const foe = b.foe;
  const hpRatio = foe.hpMax ? Math.max(0, foe.hp / foe.hpMax) : 0;
  const hpState = hpRatio > 0.6 ? '气息强盛' : hpRatio > 0.25 ? '已有伤势' : '摇摇欲坠';
  const hpLevel = hpRatio > 0.6 ? 'high' : hpRatio > 0.25 ? 'mid' : 'low';
  const foeHp = b.scouted
    ? `<div class="foe-hp"><span class="bar hp"><i style="width:${Math.round(hpRatio * 100)}%"></i></span><span>${foe.hp} / ${foe.hpMax}</span><span class="foe-zy">真元 ${foe.zy}/${foe.zyMax}</span></div>`
    : `<div class="foe-hp is-${hpLevel}">气机 · ${hpState}</div>`;
  const intentBadge = foe.stunned ? '受制' : !b.scouted ? '未知' : {
    attack: '攻伐',
    drain: '噬血',
    stun: '震神',
    shield: '结盾',
    heal: '回气'
  }[foe.intent?.kind] || '暂歇';
  const intentText = foe.stunned
    ? '本轮受制，无法出手'
    : b.scouted && foe.intent
      ? `${foe.intent.name}（${foe.intent.kind === 'shield' ? `护盾 ${foe.intent.power}` : foe.intent.kind === 'heal' ? `回血 ${foe.intent.power}` : `威能约 ${foe.intent.power}`}）`
      : b.scouted ? '暂歇调息' : '气机晦暗（念息蛊可探明）';

  const fxFresh = battleFx && (Date.now() - battleFx.ts) < 1600;
  const foeHitCls = fxFresh && battleFx.foeDmg > 0 ? ' is-struck' : '';
  const fxPop = fxFresh ? [
    battleFx.foeDmg > 0 ? `<span class="fx-pop is-dmg">−${battleFx.foeDmg}</span>` : '',
    battleFx.foeShieldGain > 0 ? `<span class="fx-pop is-shield">+${battleFx.foeShieldGain} 盾</span>` : '',
    battleFx.foeStunned ? '<span class="fx-pop is-stun">受制</span>' : ''
  ].join('') : '';

  const { choices, queued, cost } = battleGuPlan(gs);
  const hasQueue = queued.length > 0;
  const guButtons = choices.map(({ uid, def, weak, cooldown }) => {
    const position = queued.findIndex((choice) => choice.uid === uid) + 1;
    const selected = position > 0;
    const disabled = b.playerStunned || (!selected && (weak || cooldown > 0 || p.zy - cost < def.cost));
    const stat = guShortStat(def);
    return `<button class="skill${selected ? ' is-picked' : ''}" aria-pressed="${selected}" title="${esc(weak ? '饥饿虚弱，喂食后方可催动' : guEffectText(def))}" ${disabled ? 'disabled' : ''} data-action="battleAct" data-kind="gu" data-id="${uid}">
      ${selected ? `<i class="skill-order">${position}</i>` : ''}
      <span class="skill-name">${esc(def.name)}</span>
      ${stat ? `<em class="skill-stat">${stat}</em>` : ''}
      <small>${weak ? '虚弱' : cooldown > 0 ? `冷 ${cooldown}` : `${def.cost}元`}</small>
    </button>`;
  }).join('');

  const moveButtons = p.moves.map((m) => {
    const cd = Math.max(0, (b.cds[m.id] || 0) - 1);
    const blocked = killerMoveBlock(gs, m);
    const disabled = b.playerStunned || hasQueue || blocked || cd > 0 || p.zy < m.cost;
    return `<button class="skill is-move" ${disabled ? 'disabled' : ''} title="${esc(blocked || killerEffectText(m))}" data-action="battleAct" data-kind="move" data-id="${esc(m.id)}">
      <span class="skill-name">${esc(m.name)}</span>
      <em class="skill-stat">${esc(m.kind)}</em>
      <small>${cd > 0 ? `冷 ${cd}` : blocked ? '受阻' : `${m.cost}元`}</small>
    </button>`;
  }).join('');

  const logs = b.logs.slice(-40);
  const logHtml = logs.map((l, i) => `<div${i === logs.length - 1 ? ' class="is-latest"' : ''}>${esc(l)}</div>`).reverse().join('');

  let actions;
  if (b.state !== 'ongoing') {
    actions = `<button class="primary battle-finish" data-action="finishBattle">${b.state === 'win' ? '打扫战场离开' : b.state === 'fled' ? '脱身离开' : '查看结局'}</button>`;
  } else if (b.playerStunned) {
    actions = `<section class="card battle-actions">
        <div class="skill-head"><span class="log-warn">心神受震，本轮仅能调息稳神</span></div>
        <div class="battle-basic">
          <button class="primary" data-action="battleAct" data-kind="recover">调息稳神</button>
          <span class="battle-spacer"></span>
          ${b.lethal ? '<span class="battle-lethal">死斗中 · 不可退避</span>' : ''}
        </div>
      </section>`;
  } else {
    actions = `<section class="card battle-actions">
        ${guButtons ? `<div class="skill-group">
          <div class="skill-head">
            <span>空窍蛊虫</span>
            <span class="skill-plan">${hasQueue ? `催动序：${queued.map(({ def }) => esc(def.name)).join(' → ')} · 耗 ${cost} 真元` : ''}</span>
          </div>
          <div class="skill-list">${guButtons}</div>
          <button class="primary battle-go" ${hasQueue ? '' : 'disabled'} data-action="battleAct" data-kind="resolveGu">催动蛊虫</button>
        </div>` : ''}
        ${moveButtons ? `<div class="skill-group">
          <div class="skill-head"><span>自创杀招</span></div>
          <div class="skill-list">${moveButtons}</div>
        </div>` : ''}
        <div class="battle-basic">
          <button class="sm ghost" ${hasQueue ? 'disabled' : ''} data-action="battleAct" data-kind="attack">拳脚试探</button>
          <button class="sm ghost" ${hasQueue || p.yuanshi < 2 ? 'disabled' : ''} data-action="battleAct" data-kind="stone">碎元石回元 · 2石</button>
          <span class="battle-spacer"></span>
          ${b.lethal
            ? '<span class="battle-lethal">死斗中 · 不退半步</span>'
            : `<button class="sm ghost" ${hasQueue ? 'disabled' : ''} data-action="battleAct" data-kind="flee">脱身</button>
               ${foe.practice ? '' : '<button class="sm blood" data-action="battleAct" data-kind="lethal">下死手</button>'}`}
        </div>
      </section>`;
  }

  return `<section class="card battle-foe${foeHitCls}">
      <div class="foe-arena">
        ${renderEnemyEmblemSvg(foe.id, foe.rank)}
        <div class="foe-core">
          <div class="foe-top">
            <div class="foe-name"><b>${esc(foe.name)}</b><span class="badge">${foe.rank}转</span>${fxPop}</div>
            <span class="battle-round">${b.state === 'ongoing' ? `第 ${b.round} 合` : esc(b.tag)}</span>
          </div>
          <div class="foe-status">
            ${foeHp}
            ${foe.shield > 0 ? `<span class="foe-shield">护盾 ${foe.shield}</span>` : ''}
          </div>
          <div class="foe-intent${foe.stunned ? ' is-stunned' : ''}">
            <span class="intent-pill">${intentBadge}</span>
            <span>${esc(intentText)}</span>
          </div>
        </div>
      </div>
      <div class="battle-log">${logHtml}</div>
    </section>
    ${actions}`;
}
