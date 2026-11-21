import { mainStoryGoal } from '../core/growth-guide.js';
import { formatDuration } from '../core/calendar.js';
import { PLACES } from '../data/places.js';
import { nextRealmRequirements } from '../core/breakthrough.js';
import { placeMoveList } from '../core/clock.js';
import { BENMING_ZY_COST, esc } from '../core/state.js';

export function renderGoalShortcut(gs, goal) {
  if (gs.battle || gs.player.dead || gs.pendingEventId || gs.refining || gs.breakthrough) return '';
  if (goal.tab) return `<button class="sm gold" data-action="navTab" data-tab="${esc(goal.tab)}">${esc(goal.label ?? '前往修行')}</button>`;
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
  const story = mainStoryGoal(gs);
  const requirements = next ? `
    <h3>下一境界 · ${esc(next.target)}</h3>
    <div class="kv"><span>蛊虫要求</span><b>${esc(next.gu.text)}</b></div>
    ${next.major ? '' : `<div class="kv"><span>修为积累</span><b data-live="cultivation-xp">${Math.floor(p.xp)} / ${next.xp}</b></div>`}
    <div class="kv"><span>真元蓄势</span><b data-live="cultivation-zy">${Math.floor(p.zy)} / ${next.zy}</b></div>
    <div class="row" style="margin-top:8px">
      <button class="primary" data-action="${next.major ? 'openBreak' : 'washMinor'}">${next.major ? '破壁冲关' : '冲刷窍壁'}</button>
      ${next.gu.count < next.gu.need ? `<button data-action="navTab" data-tab="refine">查看蛊方</button>${renderGoalShortcut(gs, { place: 'gupu' })}` : ''}
    </div>
    <p class="muted" style="margin-top:8px">${next.major ? '真元会随时间恢复，在竹楼恢复更快。' : '赶路、探路或打坐时，修为会随游戏时间增长。'}</p>
    ${renderGoalShortcut(gs, { place: 'zhulou' })}
  ` : '<p class="muted">已臻本卷修行尽头。</p>';

  const storyCard = p.benming
    ? `<section class="card"><h3>主线</h3><p>${esc(story.text)}</p>${renderGoalShortcut(gs, story)}</section>`
    : `<section class="card"><h3>成长引导</h3><p>${esc(goal.text)}</p>
      ${goal.refineBenming ? `<button class="primary" data-action="refineBenming">炼化本命蛊 · ${BENMING_ZY_COST} 真元</button>` : renderGoalShortcut(gs, goal)}
    </section>`;
  return `${storyCard}<section class="card">${requirements}</section>`;
}
