import { PLACES } from '../data/places.js';
import { formatDuration, isNight } from '../core/calendar.js';
import { placeMoveList } from '../core/clock.js';
import { esc } from '../core/state.js';

export function renderMapPanel(gs, title = '青茅山舆图 · 可去之处') {
  const moves = placeMoveList(gs);
  const moveMap = Object.fromEntries(moves.map((m) => [m.id, m]));
  const visibleIds = Object.keys(PLACES).filter((id) => !PLACES[id].hidden || gs.flags[PLACES[id].hidden]);
  const drawn = {};
  let edges = '', nodes = '';

  for (const pid of visibleIds) {
    const place = PLACES[pid];
    for (const tid of Object.keys(place.links || {})) {
      if (!PLACES[tid] || (PLACES[tid].hidden && !gs.flags[PLACES[tid].hidden])) continue;
      const key = pid < tid ? `${pid}|${tid}` : `${tid}|${pid}`;
      if (drawn[key]) continue;
      drawn[key] = true;
      const target = PLACES[tid];
      const active = pid === gs.location || tid === gs.location;
      const other = pid === gs.location ? tid : pid;
      const cls = active ? (moveMap[other]?.blocked ? 'map-edge is-blocked' : 'map-edge is-active') : 'map-edge';
      edges += `<line class="${cls}" x1="${place.x}" y1="${place.y}" x2="${target.x}" y2="${target.y}"/>`;
    }

    const mv = moveMap[pid];
    const style = `left:${place.x}%;top:${place.y}%`;
    if (pid === gs.location) {
      nodes += `<div class="map-node is-here" style="${style}"><b>${esc(place.name)}</b><small>在此</small></div>`;
    } else if (mv) {
      nodes += `<button type="button" class="map-node is-move" style="${style}" data-action="walkTo" data-id="${pid}" ${mv.blocked ? 'disabled title="' + esc(mv.blocked) + '"' : ''}>
        <b>${esc(place.name)}</b><small>${esc(mv.blocked ? '受阻' : formatDuration(mv.minutes))}</small>
      </button>`;
    } else {
      nodes += `<div class="map-node is-far" style="${style}"><b>${esc(place.name)}</b></div>`;
    }
  }

  const blockedHints = moves.filter((m) => m.blocked).map((m) => `<div>· ${esc(m.name)}：${esc(m.blocked)}</div>`).join('');

  return `<div class="card">
    <div class="kv"><h3>${esc(title)}</h3><span class="muted">点击金框相邻地点行脚</span></div>
    <div class="map-scroll">
      <div class="map-canvas ${isNight(gs.minutes) ? 'is-night' : ''}">
        <svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>
        ${nodes}
      </div>
    </div>
    ${blockedHints ? `<div class="muted" style="margin-top:8px;font-size:.82rem">${blockedHints}</div>` : ''}
  </div>`;
}
