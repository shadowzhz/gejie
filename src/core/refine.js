import { GU_DEFS, ITEMS, REFINE_RECIPES, recipeIngredientsText, recipeOutputText } from '../data/gu.js';
import { isNight } from './calendar.js';
import { addGu, addLog, removeGuByUid, useItem } from './state.js';

export function canStartRefine(gs, recipeId) {
  const rc = REFINE_RECIPES.find((r) => r.id === recipeId);
  if (!rc) return { ok: false, reason: '未知蛊方' };
  if (!gs.player.recipes?.includes(recipeId)) return { ok: false, reason: '尚未习得此蛊方' };
  if (gs.player.yuanshi < rc.cost) return { ok: false, reason: `元石不足（需 ${rc.cost}）` };
  const guUids = [];
  for (const [id, count] of Object.entries(rc.gu)) {
    const matches = gs.player.gu.filter((g) => g.id === id);
    if (matches.length < count) return { ok: false, reason: `需要 ${count} 只「${GU_DEFS[id].name}」` };
    guUids.push(...matches.slice(0, count).map((g) => g.uid));
  }
  for (const [id, count] of Object.entries(rc.materials)) {
    if ((gs.player.items[id] || 0) < count) return { ok: false, reason: `缺少「${ITEMS[id].name}」×${count}` };
  }
  return { ok: true, rc, guUids };
}

const REFINE_FLOWS = {
  moon: {
    name: '聚月凝光', target: 8, safePressure: 2, turns: 5, gentle: 1, force: 3, surge: 2,
    note: '月光聚得快，收炉前要把炉压压下来。',
    signature: { name: '引月', gain: 2, release: 1, night: true, hint: '入夜开炉可引月一次。' }
  },
  armor: {
    name: '淬炼成甲', target: 9, safePressure: 2, turns: 5, gentle: 1, force: 4, surge: 3,
    note: '强火能更快炼开甲材，也更容易冲炉。',
    signature: { name: '淬甲', gain: 2, release: 2, minPressure: 3, hint: '炉压达 3 后可淬甲一次。' }
  },
  wine: {
    name: '四味相调', target: 11, safePressure: 1, turns: 5, gentle: 2, force: 3, surge: 3,
    note: '温养能让四味交融，须在低压下收炉。',
    signature: { name: '调和四味', gain: 3, release: 1, minProgress: 3, maxPressure: 2, hint: '炼成度达 3 且炉压至多 2 时可调和一次。' }
  },
  reverse: {
    name: '拆解蛊性', target: 6, safePressure: 1, turns: 4, gentle: 1, force: 3, surge: 2,
    note: '逆炼能用的火候较少，必须在低压下把蛊性拆开。',
    signature: { name: '回引酒性', gain: 2, release: 1, minProgress: 2, maxPressure: 2, hint: '炼成度达 2 且炉压至多 2 时可回引一次。' }
  }
};

export const OVERLOAD_PRESSURE = 7;

export function createRefineSession(gs, recipeId) {
  const check = canStartRefine(gs, recipeId);
  if (!check.ok) return { error: check.reason };
  const { rc, guUids } = check;
  const flow = REFINE_FLOWS[rc.flow];
  const ingredients = guUids.map((uid) => {
    const gu = gs.player.gu.find((entry) => entry.uid === uid);
    return { uid, name: GU_DEFS[gu.id].name, benming: uid === gs.player.benming };
  });
  const pending = [
    ...ingredients.map(({ uid, name }) => ({ uid, name })),
    ...Object.entries(rc.materials).flatMap(([item, count]) =>
      Array.from({ length: count }, () => ({ item, name: ITEMS[item].name })))
  ];
  return {
    recipeId,
    flow,
    outName: recipeOutputText(rc),
    method: rc.method ?? '合炼',
    ingredients,
    pending,
    materials: recipeIngredientsText(rc),
    cost: rc.cost,
    baseRate: rc.rate,
    progress: 0,
    pressure: 0,
    turns: flow.turns,
    protectedUid: null,
    night: isNight(gs.minutes),
    usedSignature: false,
    state: 'ready',
    success: false,
    lines: []
  };
}

export function refineChance(sess) {
  if (sess.pending.length) return 0;
  const { flow, progress, pressure } = sess;
  if (progress >= flow.target && pressure <= flow.safePressure) return 1;
  const excess = Math.max(0, pressure - flow.safePressure);
  return Math.max(0, Math.min(0.85, sess.baseRate * Math.min(1, progress / flow.target) - excess * 0.12));
}

export function refineTechniques(sess) {
  const { flow, pressure, progress } = sess;
  const turns = sess.pending.length ? 0 : sess.turns;
  const { signature } = flow;
  const signatureReady = turns > 0 && !sess.usedSignature && (!signature.night || sess.night)
    && pressure >= (signature.minPressure ?? 0) && pressure <= (signature.maxPressure ?? Infinity)
    && progress >= (signature.minProgress ?? 0);
  return [
    { id: 'force', name: '催炼', progress: progress + flow.force, pressure: pressure + flow.surge, enabled: turns > 0 },
    { id: 'gentle', name: '温养', progress: progress + flow.gentle, pressure: Math.max(0, pressure - 1), enabled: turns > 0 },
    { id: 'vent', name: '泄压', progress: Math.max(0, progress - 1), pressure: Math.max(0, pressure - 3), enabled: turns > 0 && pressure > 0 },
    { id: 'signature', name: signature.name, progress: progress + signature.gain, pressure: Math.max(0, pressure - signature.release), enabled: signatureReady }
  ];
}

function finishRefining(gs, sess, rc, success, message) {
  const benming = gs.player.benming;
  const usesBenming = sess.ingredients.some(({ uid }) => uid === benming);
  sess.state = 'done';
  sess.success = success;
  sess.lines.push(message);
  if (success) {
    for (const gu of sess.ingredients) removeGuByUid(gs, gu.uid);
    const first = addGu(gs, rc.out);
    if (usesBenming) gs.player.benming = first.uid;
    for (let count = 1; count < (rc.outCount ?? 1); count++) addGu(gs, rc.out);
    sess.lines.push(`得「${sess.outName}」。`);
    if (usesBenming) sess.lines.push('成蛊已继承本命绑定。');
    addLog(gs, `【炼蛊大成】成功${sess.method}出「${sess.outName}」。`, 'log-gold');
    return;
  }

  const spared = [];
  const lost = [];
  for (const gu of sess.ingredients) {
    if (gu.uid === benming || gu.uid === sess.protectedUid) {
      spared.push(gu.benming ? `${gu.name}（本命蛊）` : gu.name);
    } else {
      removeGuByUid(gs, gu.uid);
      lost.push(gu.name);
    }
  }
  if (spared.length) sess.lines.push(`保住：${spared.join('、')}。`);
  if (lost.length) sess.lines.push(`损毁：${lost.join('、')}。`);
  addLog(gs, `【炼蛊失败】「${sess.outName}」${sess.method}未成。`, 'log-bad');
}

export function stepRefineSession(gs, sess, action, rng = Math.random, timing) {
  if (!sess) return sess;
  if (sess.state === 'ready' && action === 'ignite') {
    const check = canStartRefine(gs, sess.recipeId);
    if (!check.ok || !check.guUids.every((uid, index) => uid === sess.ingredients[index]?.uid)) {
      sess.state = 'aborted';
      sess.lines.push(check.reason ?? '入炉蛊虫已变化，请重新选择蛊方。');
      return sess;
    }
    gs.player.yuanshi -= sess.cost;
    sess.state = 'ongoing';
    return sess;
  }

  if (sess.state !== 'ongoing') return sess;
  if (action === 'abort') {
    sess.state = 'aborted';
    sess.lines.push('撤火保住了所有入炉蛊虫。已投入的元石和物品辅材无法取回。');
    addLog(gs, `【停炉】你撤下「${sess.outName}」的炼炉，保住了入炉蛊虫。`);
    return sess;
  }

  const rc = REFINE_RECIPES.find((recipe) => recipe.id === sess.recipeId);
  if (!rc || !sess.ingredients.every(({ uid }) => gs.player.gu.some((gu) => gu.uid === uid))) {
    sess.state = 'aborted';
    sess.lines.push('入炉蛊虫已不齐，炼蛊中止。');
    return sess;
  }
  if (sess.pending.length) {
    const match = /^add:(\d+)$/.exec(action);
    if (!match || !Number.isFinite(timing) || timing < 0 || timing > 1) return sess;
    const index = Number(match[1]);
    const input = sess.pending[index];
    if (!input) return sess;
    if (input.item && !useItem(gs, input.item)) {
      sess.state = 'aborted';
      sess.lines.push(`缺少「${input.name}」，炼蛊中止。`);
      return sess;
    }
    sess.pending.splice(index, 1);
    const offset = Math.abs(timing - 0.5);
    if (offset <= 0.1) {
      sess.progress++;
      sess.lines.push(`「${input.name}」接住炉心的火星，蛊影聚拢了一点。`);
    } else if (offset <= 0.25) {
      sess.lines.push(`「${input.name}」平稳入炉。`);
    } else {
      const pressure = Math.min(2, sess.pressure + 1);
      sess.lines.push(`「${input.name}」擦过炉壁，溅起一片火星。`);
      sess.pressure = pressure;
    }
    return sess;
  }
  if (action === 'seal' && refineChance(sess) > 0) {
    const chance = refineChance(sess);
    const success = chance === 1 || rng() < chance;
    finishRefining(gs, sess, rc, success, chance === 1 ? '蛊性成形，稳稳收炉。' : `强行收炉，成算 ${Math.round(chance * 100)}%，${success ? '成了！' : '炉中蛊性散去。'}`);
    return sess;
  }

  if (action === 'pulse' && sess.turns > 0 && Number.isFinite(timing) && timing >= 0 && timing <= 1) {
    const offset = Math.abs(timing - 0.5);
    if (offset <= 0.1) {
      sess.progress += sess.flow.force;
      sess.pressure += sess.flow.surge - 1;
      sess.lines.push('火星正中炉心，蛊影迅速凝实。');
    } else if (offset <= 0.25) {
      sess.progress += sess.flow.gentle;
      sess.pressure = Math.max(0, sess.pressure - 1);
      sess.lines.push('火候偏了一点，蛊影慢慢聚拢。');
    } else {
      sess.pressure++;
      sess.lines.push('火星撞上炉壁，急火在炉内乱窜。');
    }
    sess.turns--;
    if (sess.pressure >= OVERLOAD_PRESSURE) finishRefining(gs, sess, rc, false, '炉压失控，炸炉了。');
    return sess;
  }

  if (action.startsWith('protect:') && sess.turns > 0 && sess.protectedUid === null) {
    const uid = Number(action.slice('protect:'.length));
    const gu = sess.ingredients.find((entry) => entry.uid === uid && !entry.benming);
    if (!gu) return sess;
    sess.protectedUid = uid;
    sess.turns--;
    sess.lines.push(`用一道护蛊印保住「${gu.name}」。`);
    return sess;
  }

  const technique = refineTechniques(sess).find(({ id, enabled }) => id === action && enabled);
  if (!technique) return sess;
  sess.progress = technique.progress;
  sess.pressure = technique.pressure;
  sess.turns--;
  if (action === 'signature') sess.usedSignature = true;
  sess.lines.push(action === 'vent' ? '热气从盖缝涌出，炉火低了，蛊影也散了一点。'
    : action === 'signature' ? `${technique.name}过后，蛊影聚拢，炉火渐稳。`
    : `${technique.name}过后，炉火与蛊影随之变化。`);
  if (sess.pressure >= OVERLOAD_PRESSURE) finishRefining(gs, sess, rc, false, '炉压失控，炸炉了。');
  return sess;
}
