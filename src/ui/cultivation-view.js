import { formatDuration } from '../core/calendar.js';
import { PLACES } from '../data/places.js';
import { nextRealmRequirements } from '../core/breakthrough.js';
import { placeMoveList } from '../core/clock.js';
import { BENMING_ZY_COST, esc, RANK_NAMES, realmText, XIAO_NAMES } from '../core/state.js';

export function renderGoalShortcut(gs, goal) {
  if (gs.battle || gs.player.dead || gs.pendingEventId || gs.refining || gs.breakthrough) return '';
  if (goal.tab) return '<button class="sm gold" data-action="navTab" data-tab="cultivation">前往修行</button>';
  if (!goal.place) return '';
  const name = PLACES[goal.place].name;
  if (gs.location === goal.place) {
    return gs.modal?.kind === 'place' ? '' : `<button class="sm gold" data-action="openPlace">查看${esc(name)}</button>`;
  }
  const route = placeMoveList(gs).find(({ id }) => id === goal.place);
  if (!route || route.blocked) return `<small>${esc(route?.blocked || '此处无路可通')}</small>`;
  return `<button class="sm gold" data-action="walkTo" data-id="${goal.place}">前往${esc(name)} · ${formatDuration(route.minutes)}</button>`;
}

export function renderCultivationView(gs, goal) {
  const p = gs.player;
  const next = nextRealmRequirements(p);
  const requirements = next ? `
    <h3>下一境界 · ${esc(next.target)}</h3>
    <div class="kv"><span>蛊虫要求</span><b>${esc(next.gu.text)}</b></div>
    ${next.major ? '' : `<div class="kv"><span>修为积累</span><b data-live="cultivation-xp">${Math.floor(p.xp)} / ${next.xp}</b></div>`}
    <div class="kv"><span>真元蓄势</span><b data-live="cultivation-zy">${Math.floor(p.zy)} / ${next.zy}</b></div>
    <div class="row" style="margin-top:8px">
      <button class="primary" data-action="${next.major ? 'openBreak' : 'washMinor'}">${next.major ? '破壁冲关' : '冲刷窍壁'}</button>
      ${next.gu.count < next.gu.need ? `<button data-action="navTab" data-tab="refine">查看蛊方</button>${renderGoalShortcut(gs, { place: 'gupu' })}` : ''}
    </div>
    <p class="muted" style="margin-top:8px">${next.major ? '真元随光阴缓缓流转恢复，回竹楼打坐吐纳可加快蓄元。' : '修为随光阴吐纳增长，回竹楼静室打坐更为迅捷。'}</p>
    ${renderGoalShortcut(gs, { place: 'zhulou' })}
  ` : '<p class="muted">已臻本卷修行尽头。</p>';

  const seaNames = ['', '青铜真元', '赤铁真元', '白银真元', '黄金真元'];
  const ladder = [1, 2, 3, 4].map((r) => {
    const active = p.rank === r;
    const passed = p.rank > r;
    return `<div class="realm-step${active ? ' is-now' : passed ? ' is-done' : ''}">
      <b>${RANK_NAMES[r]}</b>
      <span>${seaNames[r]}</span>
      <small>${active ? XIAO_NAMES[p.xiao] : passed ? '已越壁' : '未至'}</small>
    </div>`;
  }).join('');

  return `<section class="card">
      <div class="list-head"><h2>修行命盘</h2><span class="badge gold">${esc(realmText(p))}</span></div>
      <div class="realm-ladder">${ladder}</div>
      <div class="kv" style="margin-top:8px"><span>先天资质 · 真元海</span><b>${esc(p.grade)}等 · ${p.hai} 成真元</b></div>
      <h3>成长引导</h3>
      <p>${esc(goal.text)}</p>
      ${goal.refineBenming ? `<button class="primary" data-action="refineBenming">炼化本命蛊 · ${BENMING_ZY_COST} 真元</button>` : goal.tab ? '' : renderGoalShortcut(gs, goal)}
      ${gs.flags.toumin_won ? '<p class="muted">已夺得学堂头名。</p>' : gs.flags['event_done:toumin_lost'] ? '<p class="muted">学堂头名已旁落，修行仍须自勉。</p>' : ''}
    </section>
    <section class="card">${requirements}</section>`;
}
