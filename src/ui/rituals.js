import { GU_DEFS } from '../data/gu.js';
import { STORY_EVENTS } from '../data/story.js';
import { esc, realmText } from '../core/state.js';

export function renderStartScreen(startState) {
  if (startState.phase === 'kaiqiao') {
    const step = startState.step;
    const pct = Math.min(100, Math.round(step / 50 * 100));
    let beat = '暗河幽蓝，花海深处便是元泉。';
    if (step >= 45) beat = '腹中光团愈发明亮，元泉近在眼前，岸上屏息以待。';
    else if (step >= 40) beat = '四十步！岸上鸦雀无声。';
    else if (step >= 30) beat = '“三十步了……”岸上起了一阵骚动。';
    else if (step >= 20) beat = '“二十步！”岸上响起一阵低语，双腿愈发沉重。';
    else if (step >= 10) beat = '有人低声道：“十步了，有资质。”';
    else if (step >= 1) beat = '微光自花丛升起没入体内，那是希望蛊。';

    const apt = startState.apt;
    const body = startState.done
      ? `<div class="card">
          <h3>开窍落定 · ${esc(startState.name)}</h3>
          <p><b class="log-gold">${esc(apt.grade)}等资质 · 元海 ${apt.hai} 成</b></p>
          <p class="muted">${esc(apt.desc)}</p>
          <button class="primary" data-action="kaiqiaoFinish">踏入古月山寨</button>
        </div>`
      : `<div class="row">
          <button class="gold" data-action="kaiqiaoStep">迈步向前（${step} 步）</button>
          <button class="ghost" data-action="kaiqiaoSkip">跳过演出</button>
        </div>`;

    return `<div class="shell" style="padding:20px;justify-content:center">
      <div class="stage">
        <div class="stage-loc">南疆 · 青茅山 · 古月山寨地下溶洞</div>
        <h1>开窍大典</h1>
        <p class="stage-desc">${esc(beat)}</p>
        <div class="kv"><span>希望蛊共鸣</span><b>${step} / 50 步</b></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </div>
      ${body}
    </div>`;
  }

  return `<div class="shell" style="padding:20px;justify-content:center">
    <div class="stage">
      <div class="stage-loc">南疆 · 青茅山篇</div>
      <h1>蛊界</h1>
      <p class="stage-desc">春雨初歇，青茅山的竹楼还滴着水。今天是古月山寨的开窍大典，也是你踏入蛊师之路的第一天——直至狼潮降临、血海与天鹤决战，走出青茅山。</p>
      <div class="card">
        <h3>立命开窍</h3>
        <div style="margin-bottom:10px">
          <label class="muted" for="startName">姓名</label>
          <input id="startName" type="text" maxlength="8" placeholder="输入姓名" value="${esc(startState.name)}">
        </div>
        <div class="row">
          <button class="gold" data-action="startKaiqiao">前往开窍大典</button>
          ${startState.hasSave ? '<button class="primary" data-action="continueSave">继续上一世</button>' : ''}
        </div>
      </div>
    </div>
  </div>`;
}

export function renderBreakModal(sess) {
  const zyPct = Math.min(100, Math.round(sess.zy / Math.max(1, sess.zyMax) * 100));
  const stoneCost = sess.turn * 10;
  const hardNeed = Math.max(1, Math.round(sess.zyMax * 0.55));
  const softNeed = Math.max(1, Math.round(sess.zyMax * 0.28));
  const steadyNeed = Math.max(1, Math.round(sess.zyMax * 0.15));

  const actions = sess.state === 'ongoing'
    ? `<div class="row">
        <button class="blood" ${sess.zy < 1 ? 'disabled' : ''} data-action="breakAct" data-id="hard">强行冲关（-${hardNeed} 真元）</button>
        <button class="gold" ${sess.zy < 1 ? 'disabled' : ''} data-action="breakAct" data-id="soft">稳步冲关（-${softNeed} 真元）</button>
        <button ${sess.stones < stoneCost || sess.zy >= sess.zyMax ? 'disabled' : ''} data-action="breakAct" data-id="stone">元石回元（-${stoneCost} 元石）</button>
        <button class="ghost" ${sess.zy < steadyNeed || sess.hurt <= 0 ? 'disabled' : ''} data-action="breakAct" data-id="steady">温养护窍（-${steadyNeed} 真元）</button>
        <button class="ghost" data-action="breakAct" data-id="stop">散气退关</button>
      </div>`
    : `<button class="primary" data-action="closeModal">收功</button>`;

  return `<h2>破壁冲关 · ${sess.turn}转 → ${sess.turn + 1}转</h2>
    <div class="muted">第 ${sess.steps} 息 · 窍壁每息愈合 ${sess.wallHeal}%</div>
    <div class="kv"><span>窍壁裂痕</span><b>${sess.crack.toFixed(1)}%</b></div>
    <div class="bar"><i style="width:${Math.min(100, Math.round(sess.crack))}%"></i></div>
    <div class="kv"><span>空窍真元</span><b>${Math.round(sess.zy)} / ${sess.zyMax}（${zyPct}%）</b></div>
    <div class="kv"><span>空窍震伤</span><b style="color:${sess.hurt >= 70 ? 'var(--blood)' : 'var(--warn)'}">${sess.hurt} / 100</b></div>
    <div class="kv"><span>元石余额</span><b>${sess.stones}</b></div>
    <div class="card loglist">${sess.lines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
    ${actions}`;
}

export function renderRefineModal(sess) {
  const actions = sess.state === 'ongoing'
    ? `<div class="row">
        <button class="primary" data-action="refineAct" data-id="steady">稳火温养</button>
        <button class="blood" data-action="refineAct" data-id="fierce">猛火催炼</button>
        <button data-action="refineAct" data-id="cool">收火降温</button>
        <button class="ghost" data-action="refineAct" data-id="abort">停炉保蛊</button>
      </div>`
    : `<button class="primary" data-action="closeModal">收炉</button>`;

  return `<h2>开炉炼蛊 · ${esc(sess.outName)}</h2>
    <div class="muted">第 ${sess.round} / ${sess.maxRounds} 轮 · 最佳火候 45°～75°（过热炸炉）</div>
    <div class="kv"><span>当前炉温</span><b>${Math.round(sess.heat)}°</b></div>
    <div class="bar"><i style="width:${Math.min(100, Math.round(sess.heat))}%"></i></div>
    <div class="kv"><span>额外成算</span><b>+${Math.round(sess.rateBonus * 100)}%</b></div>
    <div class="card loglist">${sess.lines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
    ${actions}`;
}

export function renderEventModal(eventId) {
  const ev = STORY_EVENTS.find((e) => e.id === eventId);
  if (!ev) return '';
  return `<h2>${esc(ev.title)}</h2>
    <div class="card" style="white-space:pre-line">${esc(ev.text)}</div>
    <div class="row">${ev.choices.map((c, idx) => `<button class="primary" data-action="chooseEvent" data-id="${esc(ev.id)}" data-idx="${idx}">${esc(c.text)}</button>`).join('')}</div>`;
}

export function renderCustomKillerModal(gs, draft) {
  const guList = gs.player.gu.filter((g) => ['攻击', '防御', '治疗', '增益', '控制'].includes(GU_DEFS[g.id]?.kind));
  const uniqueIds = [...new Set(guList.map((g) => g.id))];
  const coreButtons = uniqueIds.map((id) => `<button class="sm ${draft.coreId === id ? 'primary' : ''}" data-action="kmPickCore" data-id="${id}">${esc(GU_DEFS[id].name)}</button>`).join('');
  const auxButtons = uniqueIds.filter((id) => id !== draft.coreId).map((id) => `<button class="sm ${draft.auxIds.includes(id) ? 'gold' : ''}" data-action="kmToggleAux" data-id="${id}">${esc(GU_DEFS[id].name)}</button>`).join('');
  return `<h2>自创杀招（二转解锁）</h2>
    <div class="muted">选定 1 只核心蛊与至多 2 只辅蛊，辅蛊的攻/盾/疗/控效果会融入杀招。当前境界：${esc(realmText(gs.player))}</div>
    <div><b>核心蛊</b><div class="row" style="margin-top:6px">${coreButtons || '<span class="muted">暂无可用蛊虫</span>'}</div></div>
    <div><b>辅蛊（已选 ${draft.auxIds.length}/2）</b><div class="row" style="margin-top:6px">${auxButtons || '<span class="muted">暂无其他辅蛊</span>'}</div></div>
    <div><input id="kmName" type="text" maxlength="10" placeholder="杀招名称（留空自动命名）" value="${esc(draft.name || '')}"></div>
    <div class="row">
      <button class="primary" ${draft.coreId ? '' : 'disabled'} data-action="kmCreate">推演成招</button>
      <button class="ghost" data-action="closeModal">取消</button>
    </div>`;
}
