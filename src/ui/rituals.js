import { STORY_EVENTS } from '../data/story.js';
import { discoveredKillerPatterns, killerCraftBlock, killerPatternSequence } from '../core/killer.js';
import { OVERLOAD_PRESSURE, refineChance, refineReady, refineTechniques } from '../core/refine.js';
import { esc } from '../core/state.js';
import { renderRefineRequirements } from './refine-view.js';

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

function renderRefineFurnace(sess, effect) {
  const { state, flow, progress, pressure, success } = sess;
  const canTime = state === 'ongoing' && (sess.pending.length || sess.turns);
  const formed = progress >= flow.target;
  const hot = pressure > flow.safePressure;
  const status = state === 'ready' ? '炉火未点'
    : state === 'ongoing' ? sess.pending.length ? '等火星经过炉心，再投入蛊虫或蛊材'
      : formed && !hot ? '蛊影已经凝实，可以合盖'
      : !sess.turns ? '炉火将尽，只能收炉或撤火'
      : hot ? '炉火太旺，掀开炉盖可以放火' : '等火星经过炉心，按下风箱'
    : success ? `炼成 · ${sess.outName}`
    : state === 'aborted' ? '已停炉'
    : pressure >= OVERLOAD_PRESSURE ? '炸炉' : '炼蛊失败';
  const outcome = state === 'done' ? (success ? 'success' : 'failure') : state;
  return `<div class="refine-stage" data-state="${outcome}" data-effect="${effect?.action ?? ''}" data-hot="${hot}" style="--heat:${Math.min(1, pressure / OVERLOAD_PRESSURE)};--shape:${Math.min(1, progress / flow.target)}">
      <div class="refine-scene" aria-hidden="true">
        <div class="refine-halo"></div>
        <div class="refine-vapor"></div>
        <div class="refine-shape"></div>
        <div class="refine-flame"></div>
        <div class="refine-pot"><div class="refine-mouth"></div><div class="refine-sigil"></div></div>
        <div class="refine-lid"></div>
        <div class="refine-result"></div>
        ${effect?.input ? `<div class="refine-drop">${esc(effect.input)}</div>` : ''}
      </div>
      ${canTime ? '<div class="refine-timing" aria-hidden="true"><i></i></div>' : ''}
      <div class="refine-status" role="status">${esc(status)}</div>
      ${state === 'ongoing' && effect?.action !== 'ignite' && sess.lines.length ? `<div class="refine-feedback">${esc(sess.lines.at(-1))}</div>` : ''}
    </div>`;
}

export function renderRefineModal(sess, effect) {
  const scene = `<h2 id="refine-title">${esc(sess.method)} · ${esc(sess.outName)}</h2>${renderRefineFurnace(sess, effect)}`;
  if (sess.state === 'ready') return `${scene}
    ${renderRefineRequirements(sess.materials, sess.cost, sess.baseRate, sess.realmBonus ?? 0)}
    <div class="row">
      <button class="primary" data-action="refineAct" data-id="ignite">开炉</button>
      <button class="ghost" data-action="closeModal">取消</button>
    </div>`;
  if (sess.state !== 'ongoing') return `${scene}
    <div>${sess.lines.slice(-1).map((line) => esc(line)).join('')}</div>
    <button class="primary" data-action="closeModal">返回炼蛊</button>`;

  if (sess.pending.length) return `<div class="refine-ritual">${scene}
      <div class="row">${sess.pending.map((input, index) =>
        `<button class="gold" data-action="refineAct" data-id="add:${index}" data-input="${esc(input.name)}">投入 ${esc(input.name)}${input.uid === undefined ? ' · 蛊材' : ' · 蛊虫'}</button>`).join('')}</div>
    <div><button class="ghost" data-action="refineAct" data-id="abort">撤火</button></div>
  </div>`;

  const chance = refineChance(sess);
  const ready = refineReady(sess);
  const techniques = refineTechniques(sess);
  const signature = techniques.find(({ id, enabled }) => id === 'signature' && enabled);
  return `<div class="refine-ritual">${scene}
    <div class="row">
      ${sess.turns && !ready ? '<button class="gold" data-action="refineAct" data-id="pulse">按下风箱</button>' : ''}
      ${techniques.some(({ id, enabled }) => id === 'vent' && enabled) && !ready ? '<button data-action="refineAct" data-id="vent">掀盖放火</button>' : ''}
      ${signature && !ready ? `<button data-action="refineAct" data-id="signature">${esc(signature.name)}</button>` : ''}
      ${chance ? `<button class="${ready ? 'primary' : 'blood'}" data-action="refineAct" data-id="seal">${ready ? '合盖收炉' : '冒险合盖'} · ${Math.round(chance * 100)}%</button>` : ''}
      <button class="ghost" data-action="refineAct" data-id="abort">撤火</button>
    </div>
  </div>`;
}

export function renderEventModal(eventId) {
  const ev = STORY_EVENTS.find((e) => e.id === eventId);
  if (!ev) return '';
  return `<h2>${esc(ev.title)}</h2>
    <div class="card" style="white-space:pre-line">${esc(ev.text)}</div>
    <div class="row">${ev.choices.map((c, idx) => `<button class="primary" data-action="chooseEvent" data-id="${esc(ev.id)}" data-idx="${idx}">${esc(c.text)}</button>`).join('')}</div>`;
}

export function renderCustomKillerModal(gs) {
  const rows = discoveredKillerPatterns(gs.player).map((pattern) => {
    const blocked = killerCraftBlock(gs, pattern);
    return `<div class="card">
      <div class="kv"><b>${esc(pattern.name)}</b><span class="badge">${pattern.kind} · 耗 ${pattern.cost} 真元</span></div>
      <div>${esc(killerPatternSequence(pattern))}</div>
      <div class="muted">${esc(pattern.desc)}</div>
      <button class="sm primary" ${blocked ? 'disabled' : ''} data-action="kmCreate" data-id="${pattern.id}">${esc(blocked || `推演 · ${pattern.fee} 元石`)}</button>
    </div>`;
  }).join('');
  return `<h2>自创杀招</h2>
    <input id="kmName" type="text" maxlength="10" aria-label="自定杀招名称" placeholder="自定杀招名称（可留空）">
    ${rows}
    <div class="row"><button class="ghost" data-action="closeModal">返回空窍</button></div>`;
}
