import { GU_DEFS, ITEMS, guEffectText } from '../data/gu.js';
import { BENMING_ZY_COST, esc, minorXpNeed, realmText } from '../core/state.js';

import { realmGuRequirement } from '../core/breakthrough.js';
import { discoveredKillerPatterns, killerMoveBlock } from '../core/killer.js';

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

  const order = (g) => (p.benming === g.uid ? 0 : 2) + (p.equipped.includes(g.uid) ? 0 : 1);
  const sortedGu = p.gu
    .map((g, i) => ({ g, i }))
    .sort((a, b) => order(a.g) - order(b.g)
      || (GU_DEFS[b.g.id]?.rank ?? 0) - (GU_DEFS[a.g.id]?.rank ?? 0)
      || a.i - b.i)
    .map(({ g }) => g);
  const equippedCount = p.gu.filter((g) => p.equipped.includes(g.uid)).length;

  const guRows = sortedGu.map((g) => {
    const def = GU_DEFS[g.id];
    if (!def) return '';
    const eq = p.equipped.includes(g.uid);
    const isBm = p.benming === g.uid;
    const isSheli = g.id === 'qingtong_sheli' || g.id === 'chitie_sheli';
    const food = ITEMS[def.food];
    const foodCount = p.items[def.food] ?? 0;
    const stats = guStats(def);
    const hungry = g.satiety <= 20;
    const boarKey = g.id === 'heishi' ? 'blackBoarStrength' : 'whiteBoarStrength';
    const actions = [
      food ? `<button class="sm ghost" ${foodCount <= 0 || g.satiety >= 100 ? 'disabled' : ''} data-action="feedGu" data-id="${g.uid}">喂食</button>` : '',
      EQUIP_KINDS.includes(def.kind) ? `<button class="sm ${eq ? 'primary' : 'ghost'}" aria-pressed="${eq}" title="${eq ? '点击撤下' : '战斗中可催动'}" data-action="toggleEquip" data-id="${g.uid}">${eq ? '出战中' : '出战'}</button>` : '',
      isSheli ? `<button class="sm gold" data-action="useSheli" data-id="${g.uid}">炼化破境</button>` : '',
      def.kind === '治疗' ? `<button class="sm gold" data-action="useHealingGu" data-id="${g.uid}">疗伤</button>` : '',
      ['heishi', 'baishi'].includes(g.id) ? (p[boarKey]
        ? '<span class="gu-note">已得一猪之力</span>'
        : `<button class="sm gold" title="消耗此蛊，增一猪之力" data-action="useBoarGu" data-id="${g.uid}">催动</button>`) : ''
    ].join('');
    return `<li class="gu-row${eq ? ' is-equipped' : ''}">
      <div class="gu-main">
        <div class="gu-title">
          <b>${esc(def.name)}</b>
          <span class="gu-meta">${def.rank}转 · ${esc(def.kind)}</span>
          ${isBm ? '<span class="gu-tag" title="合炼失败时保留，炼成后由成蛊继承本命绑定">本命</span>' : ''}
        </div>
        <p class="gu-desc">${esc(def.desc)}</p>
        ${stats.length ? `<div class="gu-stats" title="${esc(guEffectText(def))}">${stats.map((s) => `<span>${esc(s)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="gu-side">
        <div class="gu-hunger${hungry ? ' is-low' : ''}" title="饱食 ${g.satiety}%">
          <span class="bar"><i style="width:${g.satiety}%"></i></span><span>${g.satiety}%</span>
        </div>
        <div class="gu-food${food && foodCount <= 0 ? ' is-empty' : ''}">${food ? `${esc(food.name)} ×${foodCount}` : '无需喂食'}</div>
        <div class="gu-actions">${actions}</div>
      </div>
    </li>`;
  }).join('');

  const movesHtml = p.moves.length
    ? p.moves.map((m) => `<div class="card">
        <div class="kv"><b>${esc(m.name)}</b><button class="sm ghost" data-action="forgetKiller" data-id="${esc(m.id)}">删除</button></div>
        <span class="badge gold">${esc(m.kind)} · 耗${m.cost} 真元</span>
        <div class="muted">${esc(killerMoveBlock(gs, m) || `威能 ${m.power}${m.bonusShield ? ` · 盾+${m.bonusShield}` : ''} · 间隔 ${m.cd - 1} 回合`)}</div>
      </div>`).join('')
    : '<div class="muted">尚未创出杀招。</div>';

  return `<div class="aperture-canvas">
      <div class="kv">
        <b>${esc(realmText(p))} · ${esc(p.grade)}等资质（元海 ${p.hai} 成）</b>
        <span ${p.xiao < 3 ? 'data-live="xp"' : ''}>${p.xiao < 3 ? `修为 ${Math.floor(p.xp)} / ${needXp}` : '本转巅峰 · 可破壁'}</span>
      </div>
      <div class="aperture-gu-list">${chips || '<span class="muted">空窍尚空</span>'}</div>
      <div class="bar"><i data-live="xp-bar" style="width:${xpPct}%"></i></div>
    </div>
    <div class="card">
      <div class="muted">${p.rank >= 4 && p.xiao >= 3 ? '已达本卷境界上限' : esc(realmGuRequirement(p).text)}</div>
      <div class="row">
        ${p.xiao < 3 ? '<button class="primary" data-action="washMinor">冲刷窍壁</button>' : '<button class="gold" data-action="openBreak">破壁冲关</button>'}
        <button data-action="feedAll">一键喂饱</button>
        <button data-action="toggleAutoFeed" aria-pressed="${!!p.autoFeed}" title="饱食降至 50% 或以下时，使用行囊口粮">自动喂蛊：${p.autoFeed ? '开' : '关'}</button>
        ${discoveredKillerPatterns(p).length ? '<button class="gold" data-action="openCustomKiller">自创杀招</button>' : ''}
      </div>
    </div>
    ${p.unrefinedBenming ? `<div class="card">
      <div class="kv"><b>月光蛊</b><span class="badge">待炼化</span></div>
      <button class="gold" ${p.zy < BENMING_ZY_COST ? 'disabled' : ''} data-action="refineBenming">炼化本命蛊 · ${BENMING_ZY_COST} 真元</button>
      ${p.zy < BENMING_ZY_COST ? '<span class="muted">真元不足</span>' : ''}
    </div>` : ''}
    <div class="card"><h3>杀招</h3><div class="grid2">${movesHtml}</div></div>
    <div class="card">
      <div class="gu-head"><h3>蛊囊</h3><span class="muted">${p.gu.length} 只 · 出战 ${equippedCount}</span></div>
      ${guRows ? `<ul class="gu-list">${guRows}</ul>` : '<span class="muted">暂无蛊虫</span>'}
    </div>`;
}

const EQUIP_KINDS = ['攻击', '防御', '治疗', '增益', '控制', '探知', '隐匿'];

// 卡片上只列关键数值，完整说明放在 title 中。
function guStats(def) {
  const main = {
    攻击: `伤害 ${def.power}`,
    控制: `伤害 ${def.power}`,
    防御: `护盾 ${def.power}`,
    隐匿: `护盾 ${Math.round(def.power * 0.6)}`,
    治疗: `回血 ${def.power}`,
    增益: '月光蛊伤害 +35%',
    探知: '看破敌情'
  }[def.kind];
  if (!main) return [];
  const stats = [main];
  if (def.kind === '控制' || def.id === 'dianlang_gu') stats.push('35% 打断');
  if (def.id === 'xuefu_gu') stats.push('吸血 35%');
  stats.push(`真元 ${def.cost}`);
  const wait = Math.max(0, def.cd - 1);
  if (wait) stats.push(`冷却 ${wait}`);
  return stats;
}
