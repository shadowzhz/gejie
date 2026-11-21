import { ITEMS } from '../data/gu.js';
import { PLACES } from '../data/places.js';
import { ENEMIES } from '../data/enemies.js';
import { addLog, SHOP_BATCH_LIMIT, useItem } from './state.js';

export const EXPEDITION_MINUTES = 60;

export function canExpedition(gs, place = PLACES[gs.location]) {
  return Boolean(place?.exploreEnemy && gs.player.benming && gs.flags.practiced && !gs.player.escapedMountain
    && (!place.lock || gs.flags[place.lock.flag]));
}

export function expeditionProgress(gs, id) {
  const count = gs.player.expeditions?.[id];
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

const tradeMaterials = new Set(Object.values(PLACES).flatMap(({ gather, rare, exploreEnemy, bossEnemy }) => [
  ...(gather ?? []), rare?.item, ENEMIES[exploreEnemy]?.reward?.item, ENEMIES[bossEnemy]?.reward?.item
]).filter(Boolean));

export function materialSalePrice(id) {
  return tradeMaterials.has(id) ? Math.max(1, Math.floor(ITEMS[id].price * 0.4)) : 0;
}

export function sellMaterial(gs, id, count) {
  if (gs.location !== 'jucaifang' || gs.player.dead || gs.battle || gs.pendingEventId || gs.refining || gs.breakthrough) {
    return { ok: false, reason: '请在聚财坊柜台出售山材。' };
  }
  const price = materialSalePrice(id);
  if (!price || !Number.isSafeInteger(count) || count < 1 || count > SHOP_BATCH_LIMIT || !useItem(gs, id, count)) {
    return { ok: false, reason: `无法出售，请检查货品和数量（每笔最多 ${SHOP_BATCH_LIMIT} 份）。` };
  }
  const value = price * count;
  gs.player.yuanshi += value;
  const message = `在聚财坊出售${ITEMS[id].name} ×${count}，获得 ${value} 元石。`;
  addLog(gs, message, 'log-gold');
  return { ok: true, message };
}
