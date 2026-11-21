import { mainGrowthGoal, mainStoryGoal } from '../core/growth-guide.js';
import { renderGoalShortcut } from './cultivation-view.js';
import { STORY_CHARACTERS } from '../data/characters.js';
import { STORY_EVENTS, STORY_QUESTS, STORY_QUEST_STAGES } from '../data/story.js';
import { formatDateTime } from '../core/calendar.js';
import { storyRelation } from '../core/story-progress.js';
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
      return `<li class="list-row">
        <div class="list-main">
          <div class="list-title"><b>${esc(def.name)} ×${cnt}</b><span class="list-meta">${esc(def.kind)}</span></div>
          <div class="list-sub">${esc(def.desc)}</div>
        </div>
        <div class="list-side">
          ${def.heal ? `<button class="sm primary" data-action="useHealItem" data-id="${id}">疗伤 +${def.heal}</button>` : ''}
        </div>
      </li>`;
    }).join('');
    const moDesc = p.mo >= 60 ? '正道公敌（铁血冷随时围捕）' : p.mo >= 30 ? '恶名昭彰（魔道捕手巡查）' : '清白';
    return `<div class="card">
        <div class="list-head"><h3>人物档案</h3><span class="badge gold">${esc(realmText(p))}</span></div>
        <div class="dossier-grid">
          <div class="dossier-cell"><span>名讳</span><b>${esc(p.name)}</b></div>
          <div class="dossier-cell"><span>资质 / 元海</span><b>${esc(p.grade)}等 · ${p.hai} 成</b></div>
          <div class="dossier-cell"><span>元石</span><b>${p.yuanshi}</b></div>
          <div class="dossier-cell"><span>声名</span><b>恶名 ${p.mo}（${moDesc}）</b></div>
        </div>
      </div>
      <div class="card">
        <div class="list-head"><h3>行囊物品</h3><span class="muted">${entries.length} 种</span></div>
        ${rows ? `<ul class="list-rows">${rows}</ul>` : '<span class="muted">行囊空空如也</span>'}
      </div>`;
  }

  const hasCicada = hasGu(gs, 'chunqiuchan');
  return `${renderStoryJournal(gs)}<div class="card">
      <h3>${hasCicada || gs.snapshot ? '春秋蝉与存档' : '存档'}</h3>
      ${hasCicada ? '<p class="muted">春秋蝉可留下旧影，供你日后回到保存旧影的时刻。催动后会消耗春秋蝉。</p>' : ''}
      ${hasCicada || gs.snapshot ? `<div class="row" style="margin-bottom:8px">
        ${hasCicada ? '<button class="gold" data-action="saveCicada">留下春秋蝉旧影</button>' : ''}
        ${gs.snapshot ? '<button class="blood" data-action="rewindCicada">催动春秋蝉逆流重来</button>' : ''}
      </div>` : ''}
      <div class="row">
        <button class="primary" data-action="manualSave">保存进度</button>
        <button data-action="exportSave">导出存档</button>
        <button data-action="openImport">导入存档</button>
        <button class="blood" data-action="resetGame">重开一世</button>
        <button data-action="${gs.developerMode ? 'openDeveloper' : 'toggleDeveloper'}">${gs.developerMode ? '开发者面板' : '开启开发者模式'}</button>
      </div>
    </div>
    <div class="card">
      <h3>修行日志</h3>
      <div class="loglist">${gs.logs.map((l) => `<div class="${esc(l.cls || '')}">[第${l.age || 1}年] ${esc(l.text)}</div>`).join('')}</div>
    </div>`;
}

const PROFILE_ARCS = {
  mobei: { meetings: ['classmates', 'mobei_roster'], closer: 'mobei_watch', finale: 'mobei_wall' },
  chicheng: { meetings: ['classmates', 'chi_delivery'], closer: 'chi_quota', finale: 'chi_guarantee' },
  bainingbing: { meetings: ['bai_encounter', 'bai_footprints', 'three_clans'], closer: 'bai_after_spar', finale: 'bai_broken_flag' }
};

function characterProfileLevel(gs, id) {
  const seen = (eventId) => Boolean(gs.story.history[eventId] || gs.flags[`event_done:${eventId}`]);
  const arc = PROFILE_ARCS[id];
  if (arc) {
    if (seen(arc.finale)) return 3;
    if (seen(arc.closer)) return 2;
    return arc.meetings.some(seen) ? 1 : 0;
  }
  if (id === 'jiafu') {
    if (seen('jia_questions') || seen('jia_private_ledger')) {
      if (seen('jia_case_followup') && gs.story.quests.caravan?.outcome === 'jia') return 3;
      if (seen('jia_private_ledger')) return 2;
      return 1;
    }
    return 0;
  }
  if (!seen('tie_inquiry')) return 0;
  if (gs.flags.jia_iron_review && gs.flags.tie_cleared) return 3;
  if (gs.flags.jia_iron_review) return 2;
  const hearing = STORY_EVENTS.find((event) => event.id === 'tie_inquiry');
  const choice = hearing.choices[gs.story.history.tie_inquiry?.choice];
  const workedTogether = choice?.effects.some((effect) => effect.startsWith(`relation:${id}:`));
  return workedTogether ? 2 : 1;
}

function renderStoryJournal(gs) {
  const { quests, history } = gs.story;
  const events = STORY_EVENTS.filter((event) => history[event.id] || gs.flags[`event_done:${event.id}`]);
  events.reverse().sort((a, b) => (history[b.id]?.minute ?? -1) - (history[a.id]?.minute ?? -1));
  const latestMain = events.find((event) => !event.quest && !event.person && !event.ambient);
  const chapter = gs.player.escapedMountain ? '卷一已结束' : '卷一 · 青茅山';
  const guide = mainGrowthGoal(gs);
  const main = mainStoryGoal(gs);
  const records = events
    .map((event) => {
      const entry = history[event.id];
      const choice = event.choices[entry?.choice]?.text;
      const feedback = Array.isArray(entry?.feedback) ? entry.feedback : [];
      return `<div class="ledger-item">
        <div class="ledger-head"><b>${esc(event.title)}</b><span class="muted">${Number.isFinite(entry?.minute) ? esc(formatDateTime(entry.minute)) : '旧档记录'}</span></div>
        ${choice ? `<div class="ledger-choice">抉择：${esc(choice)}</div>` : ''}
        ${feedback.length ? `<div class="ledger-sub">${feedback.map((line) => `<span>· ${esc(line)}</span>`).join('')}</div>` : ''}
      </div>`;
    }).join('');
  const people = Object.entries(STORY_CHARACTERS).map(([id, person]) => {
    const level = characterProfileLevel(gs, id);
    if (!level) return '<div class="dossier-locked">未知人物</div>';
    const { favor, trust, progress } = storyRelation(gs, id);
    const introduction = id === 'bainingbing' && level === 1 ? '白家寨蛊师' : person.identity;
    return `<details class="dossier-card">
      <summary><span>${esc(person.name)}</span><small>好感 ${favor} · 信任 ${trust}</small></summary>
      <div class="dossier-body">
        <p>${esc(introduction)}。</p>
        ${level >= 2 ? `<p>${esc(person.voice)}</p>
        <p><b>目标</b> · ${esc(person.goal)}</p>
        <p><b>往来</b> · ${esc(progress || '尚无记录')}</p>` : ''}
        ${level === 3 ? `<p><b>利益</b> · ${esc(person.interest)}</p>
        <p class="muted">${esc(person.change)}</p>` : ''}
      </div>
    </details>`;
  }).join('');
  const clueList = [];
  const tasks = Object.entries(quests).map(([id, progress]) => {
    const quest = STORY_QUESTS[id];
    for (const clueId of progress.clues) {
      const { name, detail } = quest.clues[clueId];
      clueList.push(`<div class="ledger-item"><b>${esc(name)}</b><div class="muted">${esc(detail)}</div></div>`);
    }
    const awaiting = progress.followupAt && !gs.flags[`event_done:${quest.followupEvent}`];
    const step = quest.steps[progress.stage];
    return `<div class="ledger-item">
      <div class="ledger-head"><b>${esc(quest.name)}</b><span class="badge">${esc(step?.name || STORY_QUEST_STAGES[progress.stage])}</span></div>
      <div class="muted">${esc(step?.hint || quest.outcomes[progress.outcome] || '')}</div>
      ${awaiting ? `<div class="list-hint">最早回信 · ${esc(formatDateTime(progress.followupAt))}</div>` : ''}
    </div>`;
  }).join('');
  if (gs.flags['clue:huajiu']) clueList.push('<div class="ledger-item"><b>花酒行者的旧事</b><div class="muted">从血蝠洞沿下游走，水帘后有暗涧遗洞。</div></div>');
  return `<section class="card">
      <h3>成长引导</h3>
      <p>${esc(guide.text)}</p>${renderGoalShortcut(gs, guide)}
    </section>
    <section class="card">
      <h3>主线 · ${chapter}</h3>
      ${!gs.player.escapedMountain && main.text !== guide.text ? `<p>${esc(main.text)}</p>${renderGoalShortcut(gs, main)}` : ''}
      ${latestMain ? `<p class="muted">最近的主线进展 · ${esc(latestMain.title)}</p>` : ''}
    </section>
    <section class="card">
      <h3>支线任务</h3>
      ${tasks ? `<div class="ledger-list">${tasks}</div>` : '<p class="muted">暂无支线记录。</p>'}
    </section>
    <section class="card">
      <h3>已获得的线索</h3>
      ${clueList.length ? `<div class="ledger-list">${clueList.join('')}</div>` : '<p class="muted">尚未记录线索。</p>'}
    </section>
    <section class="card"><h3>人物关系</h3><div class="dossier-list">${people}</div></section>
    <section class="card">
      <h3>重要剧情</h3>
      ${records ? `<div class="ledger-list">${records}</div>` : '<p class="muted">尚未记录重要剧情。</p>'}
    </section>`;
}
