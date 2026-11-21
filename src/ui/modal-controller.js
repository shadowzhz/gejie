import { availableLocalScenes } from '../core/story-engine.js';
import { esc, realmText } from '../core/state.js';
import { clearRefineProgress } from './persistence.js';
import { renderBreakModal, renderCustomKillerModal, renderEventModal, renderRefineModal } from './rituals.js';
import { renderPlaceView } from './place-view.js';
import { renderMapPanel } from './map-view.js';
import { renderRefineDetails } from './refine-view.js';
import { renderDeveloperView } from './bag-view.js';

export function renderModal(ui) {
  const modalEl = document.getElementById('modal');
  const sheetEl = document.getElementById('sheet');
  if (!modalEl || !sheetEl) return;

  if ((ui.modal?.kind === 'place' || ui.modal?.kind === 'map') && (ui.game.battle || ui.game.player.dead)) ui.modal = null;
  const placeShown = ui.modal?.kind === 'place' && !ui.game.pendingEventId;
  const mapShown = ui.modal?.kind === 'map' && !ui.game.pendingEventId;
  const refineShown = ui.modal?.kind === 'refine';
  const activeRefineButton = refineShown && sheetEl.contains(document.activeElement) ? document.activeElement : null;
  const samePlaceSheet = sheetEl.classList.contains('place-sheet');
  const keepScroll = (placeShown && samePlaceSheet) || (refineShown
    && sheetEl.classList.contains('refine-sheet') && ui.modal.data.state === 'ongoing' && ui.modal.effect?.action !== 'ignite');
  const scrollTop = keepScroll ? sheetEl.scrollTop : 0;
  sheetEl.classList.toggle('place-sheet', placeShown || mapShown);
  sheetEl.classList.toggle('refine-sheet', refineShown);
  if (placeShown || refineShown) sheetEl.setAttribute('aria-labelledby', placeShown ? 'place-title' : 'refine-title');
  else if (sheetEl.getAttribute('aria-labelledby') !== 'receipt-title') sheetEl.removeAttribute('aria-labelledby');

  if (ui.game && ui.game.pendingEventId && !ui.game.battle && (!ui.modal || ui.modal.kind === 'place' || ui.modal.kind === 'map')) {
    const id = ui.game.pendingEventId;
    const changed = sheetEl.dataset.storyEvent !== id;
    sheetEl.dataset.storyEvent = id;
    sheetEl.setAttribute('aria-labelledby', 'story-title');
    sheetEl.innerHTML = renderEventModal(ui.game, id);
    modalEl.hidden = false;
    if (changed) {
      sheetEl.scrollTop = 0;
      sheetEl.querySelector('#story-title')?.focus({ preventScroll: true });
    }
    return;
  }
  delete sheetEl.dataset.storyEvent;
  const battle = ui.game?.battle;
  const victory = battle?.state === 'win' && Array.isArray(battle.rewards) && battle.rewards.length;
  const receipt = victory
    ? { title: `击败${battle.foe.name} · 战利品`, lines: battle.rewards }
    : ui.modal?.kind === 'receipt' ? ui.modal.data : null;
  if (receipt) {
    const changed = sheetEl.getAttribute('aria-labelledby') !== 'receipt-title' || sheetEl.querySelector('#receipt-title')?.textContent !== receipt.title;
    sheetEl.setAttribute('aria-labelledby', 'receipt-title');
    sheetEl.innerHTML = `<h2 id="receipt-title" tabindex="-1">${esc(receipt.title)}</h2>
      <div class="receipt-list">${receipt.lines.map((line) => `<div class="receipt-row">· ${esc(line)}</div>`).join('')}</div>
      ${receipt.detail ? `<p class="muted">${esc(receipt.detail)}</p>` : ''}
      <div class="row"><button class="primary" data-action="${victory ? 'finishBattle' : 'closeModal'}">${victory ? '离开战场' : '收悉'}</button></div>`;
    modalEl.hidden = false;
    sheetEl.scrollTop = 0;
    if (changed) sheetEl.querySelector('#receipt-title').focus({ preventScroll: true });
    return;
  }
  if (sheetEl.getAttribute('aria-labelledby') === 'receipt-title') sheetEl.removeAttribute('aria-labelledby');
  if (!ui.modal) {
    modalEl.hidden = true;
    sheetEl.innerHTML = '';
    return;
  }
  let html = '';
  if (ui.modal.kind === 'map') {
    html = `<div class="place-sheet-controls"><button class="sm ghost" data-action="closeModal">收起舆图</button></div>${renderMapPanel(ui.game)}`;
  } else if (ui.modal.kind === 'place') {
    html = `<div class="place-sheet-controls"><button class="sm" data-action="closeModal">返回</button></div>${renderPlaceView(ui.game)}`;
  } else if (ui.modal.kind === 'person') {
    const { id, name, response, favor, trust, progress, giftName, giftReason, returnToPlace } = ui.modal.data;
    const scenes = availableLocalScenes(ui.game).filter((event) => event.person === id).map(({ id, title }) =>
      `<button class="gold" data-action="checkEvents" data-id="${esc(id)}">${esc(title)}</button>`).join('');
    sheetEl.setAttribute('aria-labelledby', 'person-title');
    html = `<div class="person-dialog-head"><h2 id="person-title">${esc(name)}</h2><span class="badge">好感 ${favor} · 信任 ${trust}</span></div>
      <div class="story-scroll person-quote">${esc(response)}</div>
      ${progress ? `<p class="muted">${esc(progress)}</p>` : ''}
      <div class="row"><button data-action="visitPerson" data-id="${esc(id)}">交谈</button>
      <button class="gold" data-action="giftPerson" data-id="${esc(id)}" ${giftReason ? 'disabled' : ''}>赠${esc(giftName)} ×1</button>
      ${scenes}<button class="ghost" data-action="closeModal">${returnToPlace ? '返回地点' : '辞别'}</button></div>
      ${giftReason ? `<p class="muted">${esc(giftReason)}</p>` : ''}`;
  } else if (ui.modal.kind === 'break') html = renderBreakModal(ui.modal.data);
  else if (refineShown) {
    html = renderRefineModal(ui.modal.data, ui.modal.effect);
    delete ui.modal.effect;
  }
  else if (ui.modal.kind === 'refineInfo') html = renderRefineDetails(ui.game, ui.modal.data.recipe, ui.modal.data.reason);
  else if (ui.modal.kind === 'killer') html = renderCustomKillerModal(ui.game);
  else if (ui.modal.kind === 'developer') html = renderDeveloperView(ui.game);
  else if (ui.modal.kind === 'import') html = `<h2>导入存档</h2><p class="muted">粘贴之前导出的存档 JSON，覆盖当前进度。</p><textarea id="importJson" rows="6" placeholder='{"v":1,"player":{...}}'></textarea><div class="row"><button class="primary" data-action="doImportSave">导入并覆盖</button><button class="ghost" data-action="closeModal">取消</button></div>`;
  else if (ui.modal.kind === 'dead') {
    html = `<h2>身殒青茅山</h2>
      <p>你的修行止步于${esc(realmText(ui.game.player))}。</p>
      <div class="row">
        ${ui.game.snapshot ? '<button class="gold" data-action="rewindCicada">催动春秋蝉回到旧影</button>' : ''}
        <button class="blood" data-action="resetGame">重开一世</button>
      </div>`;
  } else if (ui.modal.kind === 'win') {
    html = `<h2>走出青茅山 · 卷一圆满</h2>
      <p>${ui.game.flags.escape_with_survivors
        ? '寨门外的山风吹灭了最后一盏灯。你停下点过人数，方才随你穿过山道的人都已经出来了。有人问下一步往哪儿走。这一回，终于还有工夫坐下商量。'
        : '血海翻涌，仙鹤坠落。你在两位强者的死斗边缘活了下来，踏出了青茅山。天色未明，山外的路才刚刚展开。'}</p>
      <div class="card">
        <div class="kv"><span>最终境界</span><b>${esc(realmText(ui.game.player))}</b></div>
        <div class="kv"><span>持有蛊虫</span><b>${ui.game.player.gu.length} 只</b></div>
        <div class="kv"><span>剩余元石</span><b>${ui.game.player.yuanshi}</b></div>
      </div>
      <div class="row">
        <button class="primary" data-action="closeModal">继续游历青茅余烬</button>
        <button class="gold" data-action="resetGame">再开新的一世</button>
      </div>`;
  }
  sheetEl.innerHTML = html;
  modalEl.hidden = false;
  sheetEl.scrollTop = scrollTop;
  if ((placeShown || mapShown) && !samePlaceSheet) sheetEl.querySelector('[data-action="closeModal"]')?.focus();
  if (refineShown) {
    const buttons = [...sheetEl.querySelectorAll('button:not(:disabled)')];
    const next = activeRefineButton && buttons.find(({ dataset }) =>
      dataset.action === activeRefineButton.dataset.action && dataset.id === activeRefineButton.dataset.id);
    (next || buttons[0])?.focus({ preventScroll: true });
  }
}

export function setModal(ui, kind, data) {
  ui.modal = { kind, data };
}

export function dismissModal(ui) {
  if (ui.modal?.kind === 'break' && ui.game.breakthrough) return false;
  if (ui.modal?.kind === 'refine') {
    if (ui.game.refining?.state === 'ongoing') return false;
    clearRefineProgress(ui.game);
  }
  const returnToPlace = !ui.game.battle && (
    (ui.modal?.kind === 'person' && ui.modal.data?.returnToPlace)
    || (ui.modal?.kind === 'receipt' && ui.modal.data?.returnToPlace)
  );
  ui.modal = returnToPlace ? { kind: 'place' } : null;
  return true;
}
