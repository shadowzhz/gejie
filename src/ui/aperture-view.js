import { GU_DEFS, guEffectText } from '../data/gu.js';
import { BENMING_ZY_COST, esc, minorXpNeed, realmText } from '../core/state.js';

import { realmGuRequirement } from '../core/breakthrough.js';

export function renderApertureView(gs) {
  const p = gs.player;
  const needXp = minorXpNeed(p);
  const xpPct = needXp ? Math.min(100, Math.round(p.xp / needXp * 100)) : 100;

  const chips = p.gu.map((g) => {
    const def = GU_DEFS[g.id];
    if (!def) return '';
    const isBm = p.benming === g.uid;
    return `<span class="gu-chip ${g.satiety <= 20 ? 'weak' : ''}">${isBm ? '★' : ''}${esc(def.name)} <small>${g.satiety}%</small></span>`;
  }).join('');

  const guRows = p.gu.map((g) => {
    const def = GU_DEFS[g.id];
    if (!def) return '';
    const eq = p.equipped.includes(g.uid);
    const isBm = p.benming === g.uid;
    const isSheli = g.id === 'qingtong_sheli' || g.id === 'chitie_sheli';
    const foodCount = def.food ? (p.items[def.food] || 0) : 0;
    return `<div class="card">
      <div class="kv">
        <b>${isBm ? '★ ' : ''}${esc(def.name)} <span class="badge">${def.rank}转 · ${esc(def.kind)}</span></b>
        <span class="muted">饱食 ${g.satiety}%</span>
      </div>
      <div class="muted" style="margin-bottom:8px">${esc(def.desc)}${guEffectText(def) ? `<br>${esc(guEffectText(def))}` : ''}</div>
      <div class="row">
        ${def.food ? `<button class="sm" ${foodCount <= 0 || g.satiety >= 100 ? 'disabled' : ''} data-action="feedGu" data-id="${g.uid}">喂食(${foodCount})</button>` : ''}
        ${['攻击', '防御', '治疗', '增益', '控制', '探知', '隐匿'].includes(def.kind) ? `<button class="sm ${eq ? 'primary' : ''}" data-action="toggleEquip" data-id="${g.uid}">${eq ? '已出战' : '设出战'}</button>` : ''}
        ${isSheli ? `<button class="sm gold" data-action="useSheli" data-id="${g.uid}">炼化破境</button>` : ''}
      </div>
    </div>`;
  }).join('');

  const movesHtml = p.moves.length
    ? p.moves.map((m) => `<div class="card">
        <div class="kv"><b>${esc(m.name)}</b><span class="badge gold">${esc(m.kind)} · 耗${m.cost}</span></div>
        <div class="muted">威能 ${m.power}${m.bonusShield ? ` · 盾+${m.bonusShield}` : ''}${m.bonusHeal ? ` · 疗+${m.bonusHeal}` : ''} · 冷却 ${m.cd}</div>
      </div>`).join('')
    : '<div class="muted">尚未创出杀招。</div>';

  return `<div class="aperture-canvas">
      <div class="kv">
        <b>${esc(realmText(p))} · ${esc(p.grade)}等资质（元海 ${p.hai} 成）</b>
        <span>${p.xiao < 3 ? `修为 ${Math.floor(p.xp)} / ${needXp}` : '本转巅峰 · 可破壁'}</span>
      </div>
      <div class="aperture-gu-list">${chips || '<span class="muted">空窍尚空</span>'}</div>
      <div class="bar"><i style="width:${xpPct}%"></i></div>
    </div>
    <div class="card">
      <div class="muted">${esc(realmGuRequirement(p).text)}</div>
      <div class="row">
        ${p.xiao < 3 ? '<button class="primary" data-action="washMinor">冲刷窍壁</button>' : '<button class="gold" data-action="openBreak">破壁冲关</button>'}
        <button data-action="feedAll">一键喂饱</button>
        <button data-action="toggleAutoFeed" aria-pressed="${!!p.autoFeed}">自动喂蛊：${p.autoFeed ? '开' : '关'}</button>
        <span class="muted">饱食降至 50% 或以下时，使用行囊口粮。</span>
        <button class="gold" ${p.rank >= 2 ? '' : 'disabled'} data-action="openCustomKiller">自创杀招${p.rank < 2 ? '（需二转）' : ''}</button>
      </div>
    </div>
    ${p.unrefinedBenming ? `<div class="card">
      <div class="kv"><b>月光蛊</b><span class="badge">待炼化</span></div>
      <button class="gold" ${p.zy < BENMING_ZY_COST ? 'disabled' : ''} data-action="refineBenming">炼化本命蛊 · ${BENMING_ZY_COST} 真元</button>
      ${p.zy < BENMING_ZY_COST ? '<span class="muted">真元不足</span>' : ''}
    </div>` : ''}
    <div class="card"><h3>杀招</h3><div class="grid2">${movesHtml}</div></div>
    <div class="card"><h3>蛊囊（${p.gu.length} 只）</h3><div class="grid2">${guRows || '<span class="muted">暂无蛊虫</span>'}</div></div>`;
}
