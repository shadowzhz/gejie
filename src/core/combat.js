import { GU_DEFS } from '../data/gu.js';
import { ENEMIES } from '../data/enemies.js';
import { addGu, addItem, addLog, hasGu, recalcStats, recordQuestProgress } from './state.js';
import { killerMoveBlock, recordKillerSequence } from './killer.js';

function pickIntent(enemy, rng = Math.random) {
  const pool = enemy.moves.filter((m) => (enemy.cds[m.name] || 0) <= 0);
  const list = pool.length ? pool : [enemy.moves[0]];
  const total = list.reduce((s, m) => s + (m.weight || 1), 0);
  let r = rng() * total;
  for (const m of list) {
    r -= (m.weight || 1);
    if (r <= 0) return m;
  }
  return list[0];
}

export function startBattle(gs, enemyId, tag = '遭遇战', rng = Math.random) {
  const tpl = ENEMIES[enemyId];
  if (!tpl || gs.battle) return null;
  const foe = {
    id: tpl.id,
    name: tpl.name,
    rank: tpl.rank,
    hp: tpl.hp,
    hpMax: tpl.hp,
    zy: tpl.zy,
    zyMax: tpl.zy,
    speed: tpl.speed,
    shield: 0,
    stunned: false,
    moves: tpl.moves,
    cds: {},
    intent: null,
    reward: tpl.reward || {},
    practice: !!tpl.practice
  };
  foe.intent = pickIntent(foe, rng);

  const b = {
    tag,
    round: 1,
    state: 'ongoing', // ongoing | win | lose | fled
    lethal: false,
    scouted: false,
    meShield: 0,
    meBoost: 0,
    cds: {},
    guQueue: [],
    foe,
    logs: [`【${tag}】${foe.name}挡在前方。`]
  };

  if (foe.speed > gs.player.speed && !foe.practice) {
    b.logs.push(`${foe.name}身法更快，抢先出手！`);
    enemyTurn(gs, b, rng);
  }
  gs.battle = b;
  return b;
}

function enemyTurn(gs, b, rng = Math.random) {
  const foe = b.foe;
  if (foe.hp <= 0) return;
  for (const k of Object.keys(foe.cds)) {
    if (foe.cds[k] > 0) foe.cds[k]--;
  }
  if (foe.stunned) {
    foe.stunned = false;
    b.logs.push(`${foe.name}身形一滞，错过了这一轮出手。`);
    foe.intent = pickIntent(foe, rng);
    return;
  }
  const mv = foe.intent || foe.moves[0];
  if (mv.cd) foe.cds[mv.name] = mv.cd;
  if (mv.kind === 'attack' || mv.kind === 'drain' || mv.kind === 'stun') {
    const raw = Math.round(mv.power * (0.9 + rng() * 0.2));
    const absorbed = Math.min(b.meShield, raw);
    b.meShield -= absorbed;
    const dmg = raw - absorbed;
    gs.player.hp = Math.max(0, gs.player.hp - dmg);
    b.logs.push(`${foe.name}使出「${mv.name}」，${absorbed ? `护盾挡下 ${absorbed}，` : ''}造成 ${dmg} 点伤害。`);
    if (mv.kind === 'drain' && dmg > 0) {
      const heal = Math.round(dmg * 0.4);
      foe.hp = Math.min(foe.hpMax, foe.hp + heal);
      b.logs.push(`${foe.name}吸取气血，恢复 ${heal} 点。`);
    }
    if (mv.kind === 'stun' && rng() < 0.35) {
      b.logs.push('你身形微晃，好在强自稳住了心神。');
    }
  } else if (mv.kind === 'shield') {
    foe.shield += mv.power;
    b.logs.push(`${foe.name}催动「${mv.name}」，周身浮现 ${mv.power} 点护盾。`);
  } else if (mv.kind === 'heal') {
    foe.hp = Math.min(foe.hpMax, foe.hp + mv.power);
    b.logs.push(`${foe.name}催动「${mv.name}」，气血恢复 ${mv.power} 点。`);
  }

  if (gs.player.hp <= 0) {
    if (foe.practice) {
      gs.player.hp = Math.max(10, Math.round(gs.player.hpMax * 0.2));
      b.state = 'lose';
      b.logs.push('切磋点到为止，你退后认输。');
    } else {
      b.state = 'lose';
      gs.player.dead = true;
      b.logs.push('你气血耗尽，倒在了血泊之中。');
    }
  } else {
    foe.intent = pickIntent(foe, rng);
  }
}

function dealDamageToFoe(b, rawDmg) {
  const foe = b.foe;
  const absorbed = Math.min(foe.shield, rawDmg);
  foe.shield -= absorbed;
  const dmg = rawDmg - absorbed;
  foe.hp = Math.max(0, foe.hp - dmg);
  return { dmg, absorbed };
}

export function battleGuPlan(gs) {
  const { battle, player } = gs;
  const queue = battle.guQueue ?? [];
  const choices = player.equipped.flatMap((uid) => {
    const gu = player.gu.find((g) => g.uid === uid);
    const def = GU_DEFS[gu?.id];
    if (!def || !['攻击', '控制', '防御', '治疗', '增益', '探知', '隐匿'].includes(def.kind)) return [];
    return [{ uid, def, cooldown: Math.max(0, (battle.cds[uid] ?? 0) - 1) }];
  });
  const queued = queue.map((uid) => choices.find((choice) => choice.uid === uid)).filter(Boolean);
  const cost = queued.reduce((total, choice) => total + choice.def.cost, 0);
  return { choices, queued, cost };
}

function applyBattleGu(gs, b, gu, rng) {
  const p = gs.player;
  const foe = b.foe;
  const { def } = gu;
  p.zy -= def.cost;
  if (def.cd) b.cds[gu.uid] = def.cd;
  if (def.kind === '攻击' || def.kind === '控制') {
    const boosted = def.id === 'yueguang' && b.meBoost > 0;
    const mul = boosted ? 1.35 : 1;
    if (boosted) b.meBoost--;
    const strengthBonus = def.school === '力道' ? p.powerBonus * 0.4 : 0;
    const raw = Math.round((def.power + strengthBonus) * mul * (0.92 + rng() * 0.16));
    const res = dealDamageToFoe(b, raw);
    b.logs.push(`你催动「${def.name}」，${res.absorbed ? `破盾 ${res.absorbed}，` : ''}造成 ${res.dmg} 点伤害。`);
    if (def.id === 'xuefu_gu' && res.dmg > 0) {
      const leach = Math.round(res.dmg * 0.35);
      p.hp = Math.min(p.hpMax, p.hp + leach);
      b.logs.push(`血蝠蛊反哺气血 +${leach}。`);
    }
    if ((def.kind === '控制' || def.id === 'dianlang_gu') && rng() < 0.35) {
      foe.stunned = true;
      b.logs.push(`${foe.name}行动受制，本轮无法出手！`);
    }
  } else if (def.kind === '防御') {
    b.meShield += def.power;
    b.logs.push(`你催动「${def.name}」，获得 ${def.power} 点护盾。`);
  } else if (def.kind === '治疗') {
    p.hp = Math.min(p.hpMax, p.hp + def.power);
    b.logs.push(`你催动「${def.name}」，气血恢复 +${def.power}。`);
  } else if (def.kind === '增益') {
    b.meBoost += 1;
    b.logs.push(`你催动「${def.name}」，下一记月光蛊的月刃威能大增！`);
  } else if (def.kind === '探知') {
    b.scouted = true;
    b.logs.push(`你催动「${def.name}」，看清了${foe.name}的气血真元与下步动向。`);
  } else if (def.kind === '隐匿') {
    b.meShield += Math.round(def.power * 0.6);
    b.logs.push(`你催动「${def.name}」隐去身形，获得 ${Math.round(def.power * 0.6)} 点护盾。`);
  }
}

export function battleAct(gs, action, arg = '', rng = Math.random) {
  const b = gs.battle;
  if (!b || b.state !== 'ongoing') return b;
  const p = gs.player;
  const foe = b.foe;

  if (action === 'lethal') {
    if (b.lethal) return b;
    b.lethal = true;
    b.logs.push('你眼神转冷，彻底下了死手！此战不再留手，也再无退路。');
    return b;
  }

  const queue = (b.guQueue ??= []);
  if (action === 'gu') {
    const uid = Number(arg);
    const index = queue.indexOf(uid);
    if (index !== -1) {
      queue.splice(index, 1);
    } else {
      const { choices, cost } = battleGuPlan(gs);
      const choice = choices.find((entry) => entry.uid === uid);
      if (choice && !choice.cooldown && cost + choice.def.cost <= p.zy) queue.push(uid);
    }
    return b;
  }

  const mv = action === 'move' ? p.moves.find((m) => m.id === arg) : null;
  const plan = action === 'resolveGu' ? battleGuPlan(gs) : null;
  if (plan) {
    if (!queue.length || plan.queued.length !== queue.length || plan.cost > p.zy
      || plan.queued.some((choice) => choice.cooldown)) return b;
    b.guQueue = [];
  } else {
    if (queue.length || !['attack', 'stone', 'flee', 'move'].includes(action)) return b;
    if (action === 'stone' && p.yuanshi < 2) return b;
    if (action === 'flee' && b.lethal) return b;
    if (action === 'move' && (!mv || killerMoveBlock(gs, mv) || (b.cds[mv.id] ?? 0) > 1 || p.zy < mv.cost)) return b;
  }

  for (const k of Object.keys(b.cds)) {
    if (b.cds[k] > 0) b.cds[k]--;
  }

  if (action === 'attack') {
    const raw = Math.round((8 + p.rank * 4 + (p.powerBonus || 0) * 0.6) * (0.9 + rng() * 0.2));
    const res = dealDamageToFoe(b, raw);
    b.logs.push(`你挥拳直击，${res.absorbed ? `削去护盾 ${res.absorbed}，` : ''}造成 ${res.dmg} 点伤害。`);
  } else if (action === 'stone') {
    p.yuanshi -= 2;
    const gain = Math.min(p.zyMax - p.zy, Math.max(10, Math.round(p.zyMax * 0.4)));
    p.zy += gain;
    b.logs.push(`你消耗 2 块元石补充真元，真元恢复 +${gain}。`);
  } else if (action === 'flee') {
    const chance = 0.55 + (p.speed - foe.speed) * 0.04 + (hasGu(gs, 'yinshi') ? 0.25 : 0);
    if (rng() < Math.max(0.2, Math.min(0.95, chance))) {
      b.state = 'fled';
      b.logs.push('你虚晃一招，顺利脱离战局。');
      return b;
    }
    b.logs.push('你想脱身退走，却被对方死死缠住！');
  } else if (action === 'resolveGu') {
    const fired = [];
    for (const gu of plan.queued) {
      applyBattleGu(gs, b, gu, rng);
      fired.push(gu.def.id);
      if (foe.hp <= 0) break;
    }
    recordKillerSequence(gs, fired);
  } else if (action === 'move') {
    p.zy -= mv.cost;
    b.cds[mv.id] = mv.cd;
    if (mv.kind === '防御') {
      b.meShield += mv.power;
      b.logs.push(`你催动杀招「${mv.name}」，凝出 ${mv.power} 点厚盾！`);
    } else {
      const raw = Math.round(mv.power * (0.94 + rng() * 0.14));
      const res = dealDamageToFoe(b, raw);
      b.logs.push(`你催动杀招「${mv.name}」，${res.absorbed ? `破盾 ${res.absorbed}，` : ''}重创 ${foe.name} ${res.dmg} 点！`);
      if (mv.bonusShield) { b.meShield += mv.bonusShield; b.logs.push(`辅蛊护体，附加护盾 +${mv.bonusShield}。`); }
    }
  }

  if (foe.hp <= 0) {
    b.state = 'win';
    recordQuestProgress(gs, 'victory', foe.id);
    const rw = foe.reward || {};
    const ys = (rw.yuanshi || 0) + (b.lethal ? 15 : 0);
    if (ys > 0) p.yuanshi += ys;
    if (rw.item) addItem(gs, rw.item, 1);
    if (rw.gu && !hasGu(gs, rw.gu)) {
      addGu(gs, rw.gu);
      b.logs.push(`战后缴获：「${GU_DEFS[rw.gu].name}」！`);
    }
    if (b.lethal && !foe.practice) {
      p.mo += 18;
      b.logs.push('你出手狠辣斩草除根，恶名 +18。');
    }
    if (foe.id === 'zhuwang') gs.flags['clear:zhulin'] = true;
    if (foe.id === 'xuefu_king') gs.flags['clear:xuefu'] = true;
    if (foe.id === 'langwang') gs.flags['clear:langchao'] = true;
    b.logs.push(`胜负已分！击败 ${foe.name}${ys ? `，得元石 ${ys}` : ''}。`);
    addLog(gs, `【胜出】击败 ${foe.name}${ys ? `，元石 +${ys}` : ''}。`, 'log-good');
    recalcStats(gs);
    return b;
  }

  enemyTurn(gs, b, rng);
  b.round++;
  if (b.logs.length > 24) b.logs = b.logs.slice(-24);
  return b;
}
