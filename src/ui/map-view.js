import { renderExpeditionDetails } from './expedition-view.js';
import { hasPlaceActions, PLACES } from '../data/places.js';
import { formatDuration, isNight } from '../core/calendar.js';
import { placeMoveList } from '../core/clock.js';
import { esc } from '../core/state.js';

export function renderMapPanel(gs, title = '青茅山舆图') {
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
      const label = `<b>${esc(place.name)}</b><small>身处此地</small>`;
      nodes += hasPlaceActions(gs)
        ? `<button type="button" class="map-node is-here" style="${style}" data-action="openPlace">${label}</button>`
        : `<div class="map-node is-here" style="${style}">${label}</div>`;
    } else if (mv) {
      nodes += `<button type="button" class="map-node is-move" style="${style}" data-action="walkTo" data-id="${pid}" ${mv.blocked ? 'disabled title="' + esc(mv.blocked) + '"' : ''}>
        <b>${esc(place.name)}</b><small>${esc(mv.blocked ? '受阻' : formatDuration(mv.minutes))}</small>
      </button>`;
    } else {
      nodes += `<div class="map-node is-far" style="${style}"><b>${esc(place.name)}</b></div>`;
    }
  }

  const directory = visibleIds.map((id) => {
    const place = PLACES[id];
    const blocked = id === gs.location ? '' : moveMap[id]?.blocked || (!moveMap[id] ? place.lock?.msg || '当前没有通路' : '');
    return `<details><summary>${esc(place.name)} · ${blocked ? '受阻' : '开放'}</summary>
      <p>${esc(isNight(gs.minutes) ? place.night : place.day)}</p>
      ${renderExpeditionDetails(gs, place, blocked)}
      ${!blocked && id !== gs.location ? `<button class="sm gold" data-action="walkTo" data-id="${id}">前往 · ${formatDuration(moveMap[id].minutes)}</button>` : ''}
    </details>`;
  }).join('');

  const blockedHints = moves.filter((m) => m.blocked).map((m) => `<div>· ${esc(m.name)}：${esc(m.blocked)}</div>`).join('');

  return `<div class="map-sheet-wrap">
    <div class="list-head">
      <h3>${esc(title)}</h3>
      <span class="muted">南疆 · 青茅山疆域</span>
    </div>
    <div class="map-scroll">
      <div class="map-canvas ${isNight(gs.minutes) ? 'is-night' : ''}">
        <svg class="map-terrain" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <!-- 山寨疆界与青茅等高线 -->
          <path d="M4,8 Q32,4 58,14 L60,88 Q28,94 4,88 Z" fill="rgba(41, 69, 58, 0.14)" stroke="rgba(196, 168, 108, 0.2)" stroke-width="0.35" stroke-dasharray="1.5 1.2"/>
          <path d="M62,10 Q80,6 96,22 Q98,62 90,92 Q74,95 62,80 Z" fill="rgba(22, 36, 32, 0.35)" stroke="rgba(92, 163, 136, 0.14)" stroke-width="0.3"/>
          <path d="M64,55 Q74,64 82,78 T95,94" fill="none" stroke="rgba(82, 145, 168, 0.32)" stroke-width="0.7"/>
          <path d="M66,18 Q76,12 88,26" fill="none" stroke="rgba(196, 168, 108, 0.12)" stroke-width="0.3"/>
          <path d="M12,34 Q24,28 38,38" fill="none" stroke="rgba(196, 168, 108, 0.12)" stroke-width="0.3"/>
          <text x="8" y="94" font-size="3.2" fill="rgba(207, 169, 104, 0.45)" font-family="serif">古月山寨</text>
          <text x="72" y="94" font-size="3.2" fill="rgba(140, 150, 142, 0.5)" font-family="serif">十万大山外缘</text>
          ${edges}
        </svg>
        ${nodes}
      </div>
    </div>
    <div class="map-legend">
      <span><i class="dot-here"></i>当前所在</span>
      <span><i class="dot-move"></i>可启程前往</span>
      <span><i class="dot-lock"></i>前路受阻</span>
    </div>
    ${blockedHints ? `<div class="map-blocked">${blockedHints}</div>` : ''}
    <section class="card"><h3>地点志</h3>${directory}</section>
  </div>`;
}
