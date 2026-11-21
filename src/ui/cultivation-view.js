import { formatDuration } from '../core/calendar.js';
import { PLACES } from '../data/places.js';
import { nextRealmRequirements } from '../core/breakthrough.js';
import { placeMoveList } from '../core/clock.js';
import { BENMING_ZY_COST, esc, realmText } from '../core/state.js';

export function renderGoalShortcut(gs, goal) {
  if (gs.battle || gs.player.dead || gs.pendingEventId || gs.refining || gs.breakthrough) return '';
  if (goal.tab) return '<button class="sm gold" data-action="navTab" data-tab="cultivation">前往修行</button>';
  if (!goal.place) return '';
  const name = PLACES[goal.place].name;
  if (gs.location === goal.place) return `<button class="sm gold" data-action="openPlace">进入${esc(name)}</button>`;
  const route = placeMoveList(gs).find(({ id }) => id === goal.place);
  if (!route || route.blocked) return `<small>${esc(route?.blocked || '此处无路可通')}</small>`;
  return `<button class="sm gold" data-action="walkTo" data-id="${goal.place}">前往${esc(name)} · ${formatDuration(route.minutes)}</button>`;
}

export function renderCultivationView(gs, goal) {
  const p = gs.player;
  const next = nextRealmRequirements(p);
  const requirements = next ? `
    <h3>下一境界 · ${esc(next.target)}</h3>
    <div class="kv"><span>蛊虫</span><b>${esc(next.gu.text)}</b></div>
    ${next.major ? '' : `<div class="kv"><span>修为</span><b data-live="cultivation-xp">${Math.floor(p.xp)} / ${next.xp}</b></div>`}
    <div class="kv"><span>真元</span><b data-live="cultivation-zy">${Math.floor(p.zy)} / ${next.zy}</b></div>
    <div class="row">
      <button class="primary" data-action="${next.major ? 'openBreak' : 'washMinor'}">${next.major ? '破壁冲关' : '冲刷窍壁'}</button>
      ${next.gu.count < next.gu.need ? `<button data-action="navTab" data-tab="refine">查看蛊方</button>${renderGoalShortcut(gs, { place: 'gupu' })}` : ''}
    </div>
    <p class="muted">${next.major ? '真元会随时间恢复。回竹楼打坐可加快恢复。' : '随时间流逝积累修为、恢复真元。也可回竹楼打坐吐纳。'}</p>
    ${renderGoalShortcut(gs, { place: 'zhulou' })}
  ` : '<p>已达到本卷境界上限。</p>';
  return `<section class="card">
      <h2>修行</h2>
      <p class="muted">当前境界 · ${esc(realmText(p))}</p>
      <h3>成长引导</h3>
      <p>${esc(goal.text)}</p>
      ${goal.refineBenming ? `<button class="primary" data-action="refineBenming">炼化本命蛊 · ${BENMING_ZY_COST} 真元</button>` : goal.tab ? '' : renderGoalShortcut(gs, goal)}
      ${gs.flags.toumin_won ? '<p class="muted">已夺得学堂头名。</p>' : gs.flags['event_done:toumin_lost'] ? '<p class="muted">学堂头名已旁落，仍可继续修行。</p>' : ''}
    </section>
    <section class="card">${requirements}</section>`;
}
