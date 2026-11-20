import { GU_DEFS, ITEMS } from '../data/gu.js';
import { esc, hasGu, realmText, RANK_NAMES, XIAO_NAMES } from '../core/state.js';

export function renderDeveloperView(gs) {
  const p = gs.player;
  const options = (defs) => Object.values(defs)
    .map(({ id, name }) => `<option value="${esc(id)}">${esc(name)}</option>`).join('');
  return `<h2>开发者模式</h2>
    <p class="muted">操作会写入当前存档。</p>
    <div class="row">
      <button data-action="devAction" data-id="stones">元石 +1000</button>
      <button data-action="devAction" data-id="restore">补满气血与真元</button>
      <button data-action="devAction" data-id="recipes">习得全部蛊方</button>
    </div>
    <div class="row dev-fields">
      <select id="dev-gu" aria-label="选择蛊虫">${options(GU_DEFS)}</select>
      <button data-action="devAction" data-id="gu">获得蛊虫 ×1</button>
    </div>
    <div class="row dev-fields">
      <select id="dev-item" aria-label="选择物品">${options(ITEMS)}</select>
      <button data-action="devAction" data-id="item">获得物品 ×20</button>
    </div>
    <div class="row dev-fields">
      <select id="dev-rank" aria-label="转数">${RANK_NAMES.slice(1).map((name, index) => `<option value="${index + 1}" ${p.rank === index + 1 ? 'selected' : ''}>${name}</option>`).join('')}</select>
      <select id="dev-stage" aria-label="小境界">${XIAO_NAMES.map((name, index) => `<option value="${index}" ${p.xiao === index ? 'selected' : ''}>${name}</option>`).join('')}</select>
      <button data-action="devAction" data-id="realm">设置境界</button>
    </div>
    <div class="row">
      <button ${gs.battle ? 'disabled' : ''} data-action="devAction" data-id="hours">推进 1 时辰</button>
      <button ${gs.battle ? 'disabled' : ''} data-action="devAction" data-id="day">推进 1 日</button>
      <button ${gs.battle ? 'disabled' : ''} data-action="devAction" data-id="month">推进 30 日</button>
    </div>
    <div class="row">
      <button data-action="toggleDeveloper">关闭开发者模式</button>
      <button class="primary" data-action="closeModal">返回游戏</button>
    </div>`;
}

export function renderBagView(gs, tab) {
  const p = gs.player;
  if (tab === 'bag') {
    const entries = Object.entries(p.items);
    const rows = entries.map(([id, cnt]) => {
      const def = ITEMS[id];
      if (!def) return '';
      return `<div class="card">
        <div class="kv"><b>${esc(def.name)} ×${cnt}</b><span class="badge">${esc(def.kind)}</span></div>
        <div class="muted" style="margin-bottom:6px">${esc(def.desc)}</div>
        ${def.heal ? `<button class="sm primary" data-action="useHealItem" data-id="${id}">敷药疗伤（+${def.heal}血）</button>` : ''}
      </div>`;
    }).join('');
    const moDesc = p.mo >= 60 ? '正道公敌（铁血冷随时围捕）' : p.mo >= 30 ? '恶名昭彰（魔道捕手巡查）' : '清白';
    return `<div class="card">
        <h3>人物档案</h3>
        <div class="kv"><span>姓名 / 境界</span><b>${esc(p.name)} · ${esc(realmText(p))}</b></div>
        <div class="kv"><span>资质 / 元海</span><b>${esc(p.grade)}等 · ${p.hai} 成</b></div>
        <div class="kv"><span>元石 / 恶名</span><b>${p.yuanshi} 元石 · 恶名 ${p.mo}（${moDesc}）</b></div>
      </div>
      <div class="card"><h3>行囊物品</h3><div class="grid2">${rows || '<span class="muted">行囊空空如也</span>'}</div></div>`;
  }

  const hasCicada = hasGu(gs, 'chunqiuchan');
  return `<div class="card">
      <h3>春秋蝉与存档</h3>
      <div class="row" style="margin-bottom:8px">
        ${hasCicada ? '<button class="gold" data-action="saveCicada">留下春秋蝉旧影</button>' : '<span class="muted">未持有春秋蝉</span>'}
        ${gs.snapshot ? '<button class="blood" data-action="rewindCicada">催动春秋蝉逆流重来</button>' : ''}
      </div>
      <div class="row">
        <button class="primary" data-action="manualSave">保存进度</button>
        <button data-action="exportSave">导出存档</button>
        <button class="blood" data-action="resetGame">重开一世</button>
        <button data-action="${gs.developerMode ? 'openDeveloper' : 'toggleDeveloper'}">${gs.developerMode ? '开发者面板' : '开启开发者模式'}</button>
      </div>
    </div>
    <div class="card">
      <h3>青茅山行纪</h3>
      <div class="loglist">${gs.logs.map((l) => `<div class="${esc(l.cls || '')}">[第${l.age || 1}年] ${esc(l.text)}</div>`).join('')}</div>
    </div>`;
}
