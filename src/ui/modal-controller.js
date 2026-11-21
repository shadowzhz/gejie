import { esc, realmText } from '../core/state.js';
import { clearRefineProgress } from './persistence.js';
import { renderBreakModal, renderCustomKillerModal, renderEventModal, renderRefineModal } from './rituals.js';
import { renderPlaceView } from './place-view.js';
import { renderRefineDetails } from './refine-view.js';
import { renderDeveloperView } from './bag-view.js';

export function renderModal(ui) {
  const modalEl = document.getElementById('modal');
  const sheetEl = document.getElementById('sheet');
  if (!modalEl || !sheetEl) return;

  if (ui.modal?.kind === 'place' && (ui.game.battle || ui.game.player.dead)) ui.modal = null;
  const placeShown = ui.modal?.kind === 'place' && !ui.game.pendingEventId;
  const refineShown = ui.modal?.kind === 'refine';
  const activeRefineButton = refineShown && sheetEl.contains(document.activeElement) ? document.activeElement : null;
  const samePlaceSheet = sheetEl.classList.contains('place-sheet');
  const keepScroll = (placeShown && samePlaceSheet) || (refineShown
    && sheetEl.classList.contains('refine-sheet') && ui.modal.data.state === 'ongoing' && ui.modal.effect?.action !== 'ignite');
  const scrollTop = keepScroll ? sheetEl.scrollTop : 0;
  sheetEl.classList.toggle('place-sheet', placeShown);
  sheetEl.classList.toggle('refine-sheet', refineShown);
  if (placeShown || refineShown) sheetEl.setAttribute('aria-labelledby', placeShown ? 'place-title' : 'refine-title');
  else sheetEl.removeAttribute('aria-labelledby');

  if (ui.game && ui.game.pendingEventId && !ui.game.battle && (!ui.modal || ui.modal.kind === 'place')) {
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
  if (!ui.modal) {
    modalEl.hidden = true;
    sheetEl.innerHTML = '';
    return;
  }
  let html = '';
  if (ui.modal.kind === 'place') {
    html = `<div class="place-sheet-controls"><button class="sm" data-action="closeModal">返回地图</button></div>${renderPlaceView(ui.game)}`;
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
  if (placeShown && !samePlaceSheet) sheetEl.querySelector('[data-action="closeModal"]').focus();
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
  ui.modal = null;
  return true;
}
