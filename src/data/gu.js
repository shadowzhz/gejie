export const ITEMS = {
  guangyin_water: { id: 'guangyin_water', name: '光阴河水', kind: '口粮', price: 22, desc: '维持残存春秋蝉的生机，也可用于修复其残躯。' },
  fanran: { id: 'fanran', name: '幡然蛊', kind: '炼蛊用蛊', price: 20, desc: '可将四味酒虫逆炼为一只一转酒虫。' },
  langzi: { id: 'langzi', name: '浪子蛊', kind: '炼蛊用蛊', price: 85, desc: '可将四味酒虫逆炼为两只一转酒虫。' },
  shengjiye: { id: 'shengjiye', name: '生机叶', kind: '一转消耗蛊', price: 22, heal: 24, healCooldown: 60, desc: '取自九叶生机草，疗伤后叶片消散。一小时内再次使用无效。' },
  yuelanhua: { id: 'yuelanhua', name: '月兰花瓣', kind: '口粮', price: 2, desc: '月光蛊、月芒蛊、小光蛊的食料。' },
  shourou: { id: 'shourou', name: '兽肉', kind: '口粮', price: 3, desc: '黑豕蛊、白豕蛊、血蝠蛊、电狼蛊的食料。' },
  fengmi: { id: 'fengmi', name: '蜂王蜜', kind: '口粮', price: 4, desc: '目前可用于喂养铜皮蛊。' },
  yushi: { id: 'yushi', name: '玉石', kind: '口粮', price: 4, desc: '玉皮蛊和白玉蛊的食料。' },
  qingzhujiu: { id: 'qingzhujiu', name: '青竹酒', kind: '口粮', price: 5, desc: '酒虫最喜的竹香米酒，也可略微活血。' },
  tianjiu: { id: 'tianjiu', name: '甜果酒', kind: '口粮', price: 8, desc: '四味酒虫所需的四味之一。' },
  lajiu: { id: 'lajiu', name: '烈辣烧酒', kind: '口粮', price: 10, desc: '四味酒虫所需的烈酒，饮之暖身。' },
  suanjiu: { id: 'suanjiu', name: '酸梅酒', kind: '炼材', price: 8, desc: '合炼四味酒虫所需的酸酒。' },
  kujiu: { id: 'kujiu', name: '苦叶酒', kind: '炼材', price: 8, desc: '合炼四味酒虫所需的苦酒。' },
  yezhuya: { id: 'yezhuya', name: '野猪牙', kind: '炼材', price: 8, desc: '合炼白玉蛊所需的辅材。' },
  kuangshi: { id: 'kuangshi', name: '青铁矿精', kind: '炼材', price: 8, desc: '合炼防御与金铁类蛊虫常用辅材。' },
  yuanshi_zha: { id: 'yuanshi_zha', name: '灵晶', kind: '口粮', price: 6, desc: '探知、隐匿与部分奇蛊的食料，也可作炼蛊辅材。' },
  zhixuegao: { id: 'zhixuegao', name: '止血草膏', kind: '伤药', price: 10, desc: '局外使用可恢复 35 点气血。', heal: 35 }
};

export function guEffectText(def) {
  const effects = {
    攻击: `基础伤害 ${def.power}`,
    控制: `基础伤害 ${def.power} · 35% 几率使敌方跳过 1 次出手`,
    防御: `护盾 ${def.power} · 持续至耗尽或战斗结束`,
    治疗: `立即恢复 ${def.power} 气血`,
    增益: '下一次月光蛊伤害 +35%',
    探知: '查看敌方气血、真元和意图，持续至战斗结束',
    隐匿: `护盾 ${Math.round(def.power * 0.6)} · 持续至耗尽或战斗结束`
  };
  const effect = effects[def.kind];
  if (!effect) return '';
  const extra = {
    dianlang_gu: ' · 35% 几率使敌方跳过 1 次出手',
    xuefu_gu: ' · 回复实际伤害的 35%'
  }[def.id] || '';
  const wait = Math.max(0, def.cd - 1);
  return `${effect}${extra} · 真元 ${def.cost} · ${wait ? `间隔 ${wait} 回合` : '可连续催动'}`;
}

export const GU_DEFS = {
  yueguang: { id: 'yueguang', name: '月光蛊', rank: 1, school: '月道', kind: '攻击', cost: 4, cd: 0, power: 18, food: 'yuelanhua', price: 18, desc: '古月一族传承之蛊，催动后掌心发出弯月光刃斩敌。' },
  xiaoguang: { id: 'xiaoguang', name: '小光蛊', rank: 1, school: '光道', kind: '增益', cost: 4, cd: 2, power: 12, food: 'yuelanhua', price: 16, desc: '辅助月光蛊，也可与月光蛊合炼。' },
  yuemang: { id: 'yuemang', name: '月芒蛊', rank: 2, school: '月道', kind: '攻击', cost: 8, cd: 1, power: 34, food: 'yuelanhua', price: 45, desc: '将月光聚成威力更强的月刃。' },
  yuexuan: { id: 'yuexuan', name: '月旋蛊', rank: 2, school: '月道', kind: '攻击', cost: 7, cd: 1, power: 34, food: 'yuelanhua', price: 45, desc: '绿色月刃沿弧线斩出。' },
  henshi: { id: 'henshi', name: '痕石蛊', rank: 1, kind: '炼蛊', cost: 0, cd: 0, power: 0, food: 'kuangshi', price: 15, desc: '可与月光蛊合炼成二转月痕蛊。' },
  yuehen: { id: 'yuehen', name: '月痕蛊', rank: 2, school: '月道', kind: '攻击', cost: 4, cd: 0, power: 18, food: 'yuelanhua', price: 45, desc: '月刃威力与月光蛊相同，设定中的射程从十米延至二十米。' },
  yueni: { id: 'yueni', name: '月霓裳', rank: 2, school: '月道', kind: '防御', cost: 6, cd: 2, power: 36, food: 'yuelanhua', price: 45, desc: '引月光覆于周身，织成轻盈的护身衣。' },
  yupi: { id: 'yupi', name: '玉皮蛊', rank: 1, school: '土道', kind: '防御', cost: 4, cd: 2, power: 22, food: 'yushi', price: 20, desc: '催动后皮肤泛起温润玉光，化作护盾抵挡来袭伤害。' },
  baiyu: { id: 'baiyu', name: '白玉蛊', rank: 2, school: '土道', kind: '防御', cost: 7, cd: 2, power: 44, food: 'yushi', price: 52, desc: '二转防御蛊，凝出厚实白玉光甲护盾，稳固空窍根基。' },
  shipi: { id: 'shipi', name: '石皮蛊', rank: 1, school: '土道', kind: '防御', cost: 3, cd: 2, power: 18, food: 'kuangshi', price: 15, desc: '以石质硬皮覆体抵挡攻击。' },
  shoupi: { id: 'shoupi', name: '兽皮蛊', rank: 1, kind: '防御', cost: 3, cd: 2, power: 14, food: 'shourou', price: 11, desc: '皮蛊中常见的一种，用于护身，售价低于石皮蛊。' },
  qingsi: { id: 'qingsi', name: '青丝蛊', rank: 1, kind: '防御', cost: 12, cd: 2, power: 30, food: 'fengmi', price: 24, desc: '催动时消耗较多真元，能抵御打击。也可与黑豕蛊合炼。' },
  heizong: { id: 'heizong', name: '黑鬃蛊', rank: 2, kind: '防御', cost: 7, cd: 2, power: 38, food: 'shourou', price: 48, desc: '催动后，汗毛化作粗黑长鬃，在身上结成护甲。' },
  tongpi: { id: 'tongpi', name: '铜皮蛊', rank: 2, school: '金道', kind: '防御', cost: 7, cd: 2, power: 40, food: 'fengmi', price: 48, desc: '铜皮铁骨，护盾之外更可令自身气血上限微增。' },
  jiuyecao: { id: 'jiuyecao', name: '九叶生机草', rank: 2, school: '木道', kind: '治疗', cost: 8, cd: 2, power: 48, food: 'yuelanhua', price: 58, desc: '二转极品疗伤蛊，生机绵长，是保命续航之宝。' },
  jiuchong: { id: 'jiuchong', name: '酒虫', rank: 1, school: '食道', kind: '奇蛊', cost: 0, cd: 0, power: 10, food: 'qingzhujiu', price: 65, desc: '能提纯一转蛊师的真元，温养时修为增长 +25%。' },
  siwei_jiu: { id: 'siwei_jiu', name: '四味酒虫', rank: 2, school: '食道', kind: '奇蛊', cost: 0, cd: 0, power: 22, food: 'lajiu', price: 160, desc: '能提纯二转蛊师的真元，温养时修为增长 +45%。' },
  heishi: { id: 'heishi', name: '黑豕蛊', rank: 1, school: '力道', kind: '消耗', cost: 0, cd: 0, power: 28, food: 'shourou', price: 26, desc: '在空窍中催动可增一猪之力，也可保留用来合炼黑鬃蛊。' },
  baishi: { id: 'baishi', name: '白豕蛊', rank: 1, school: '力道', kind: '消耗', cost: 0, cd: 0, power: 28, food: 'shourou', price: 64, desc: '消耗后增加一猪之力，也可保留用来合炼白玉蛊。' },
  xuefu_gu: { id: 'xuefu_gu', name: '血蝠蛊', rank: 2, school: '血道', kind: '攻击', cost: 8, cd: 2, power: 32, food: 'shourou', price: 55, desc: '吸食敌手精血，造成伤害的同时将部分血气反哺己身。' },
  dianlang_gu: { id: 'dianlang_gu', name: '电狼蛊', rank: 2, school: '雷道', kind: '攻击', cost: 9, cd: 2, power: 38, food: 'shourou', price: 62, desc: '引动蓝白电弧扑击敌手，疾速暴烈，有概率麻痹对手。' },
  nianxi: { id: 'nianxi', name: '念息蛊', rank: 1, school: '智道', kind: '探知', cost: 3, cd: 2, power: 15, food: 'yuanshi_zha', price: 24, desc: '战中催动可探明敌手确切气血、真元与下回合真意。' },
  yinshi: { id: 'yinshi', name: '隐石蛊', rank: 1, school: '暗道', kind: '隐匿', cost: 3, cd: 2, power: 12, food: 'yuanshi_zha', price: 24, desc: '持有时提高战中脱身成功率，并降低招致追捕的几率。' },
  xuanfeng: { id: 'xuanfeng', name: '旋风蛊', rank: 1, school: '风道', kind: '控制', cost: 4, cd: 2, power: 16, food: 'yuelanhua', price: 22, desc: '卷起山风扰乱敌方身法，造成伤害并有概率打断对手蓄势。' },
  qingtong_sheli: { id: 'qingtong_sheli', name: '青铜舍利蛊', rank: 1, school: '天道', kind: '消耗', cost: 0, cd: 0, power: 0, food: 'kuangshi', price: 90, desc: '一转破境奇蛊，使用后可直接助一转蛊师连破小境界。' },
  chitie_sheli: { id: 'chitie_sheli', name: '赤铁舍利蛊', rank: 2, school: '天道', kind: '消耗', cost: 0, cd: 0, power: 0, food: 'kuangshi', price: 210, desc: '二转破境奇蛊，使用后可直接助二转蛊师打破小境界壁垒。' },
  chunqiuchan: { id: 'chunqiuchan', name: '春秋蝉（残）', rank: 3, school: '宙道', kind: '奇蛊', cost: 0, cd: 0, power: 0, food: 'guangyin_water', price: 0, desc: '奇蛊榜第七，可于行纪中留下一道旧影；身殒时消耗它回到那一刻。' }
};

export const REFINE_RECIPES = [
  { id: 'r_shengjiye', flow: 'reverse', price: 8, out: 'shengjiye', method: '采制', preserveGu: true, gu: { jiuyecao: 1 }, materials: { yuelanhua: 1 }, rate: 0.81, cost: 4 },
  { id: 'r_yueguang', flow: 'moon', price: 8, out: 'yueguang', source: '原创', gu: {}, materials: {yuelanhua: 6, yuanshi_zha: 1}, rate: 0.71, cost: 14 },
  { id: 'r_xiaoguang', flow: 'moon', price: 8, out: 'xiaoguang', source: '原创', gu: {}, materials: {yuelanhua: 3, yuanshi_zha: 1}, rate: 0.80, cost: 14 },
  { id: 'r_henshi', flow: 'armor', price: 8, out: 'henshi', source: '原创', gu: {}, materials: {kuangshi: 2}, rate: 0.75, cost: 14 },
  { id: 'r_yupi', flow: 'armor', price: 8, out: 'yupi', source: '原创', gu: {}, materials: {yushi: 3}, rate: 0.73, cost: 14 },
  { id: 'r_shipi', flow: 'armor', price: 8, out: 'shipi', source: '原创', gu: {}, materials: {kuangshi: 1, yuanshi_zha: 1}, rate: 0.78, cost: 14 },
  { id: 'r_shoupi', flow: 'armor', price: 8, out: 'shoupi', source: '原创', gu: {}, materials: {shourou: 3}, rate: 0.82, cost: 14 },
  { id: 'r_qingsi', flow: 'armor', price: 8, out: 'qingsi', source: '原创', gu: {}, materials: {fengmi: 2, yuelanhua: 2}, rate: 0.69, cost: 14 },
  { id: 'r_tongpi', flow: 'armor', price: 16, out: 'tongpi', source: '原创', gu: {shipi: 1}, materials: {kuangshi: 3, fengmi: 1}, rate: 0.59, cost: 28 },
  { id: 'r_jiuyecao', flow: 'moon', price: 16, out: 'jiuyecao', source: '原创', gu: {}, materials: {shengjiye: 3, yuelanhua: 4}, rate: 0.55, cost: 28 },
  { id: 'r_heishi', flow: 'armor', price: 8, out: 'heishi', source: '原创', gu: {}, materials: {shourou: 4, yezhuya: 1}, rate: 0.68, cost: 14 },
  { id: 'r_baishi', flow: 'armor', price: 8, out: 'baishi', source: '原创', gu: {}, materials: {shourou: 6, yezhuya: 2}, rate: 0.63, cost: 14 },
  { id: 'r_xuefu_gu', flow: 'armor', price: 16, out: 'xuefu_gu', source: '原创', gu: {}, materials: {shourou: 5, yuanshi_zha: 2}, rate: 0.52, cost: 28 },
  { id: 'r_dianlang_gu', flow: 'armor', price: 16, out: 'dianlang_gu', source: '原创', gu: {}, materials: {shourou: 4, kuangshi: 3}, rate: 0.50, cost: 28 },
  { id: 'r_nianxi', flow: 'moon', price: 8, out: 'nianxi', source: '原创', gu: {}, materials: {yuanshi_zha: 3}, rate: 0.72, cost: 14 },
  { id: 'r_yinshi', flow: 'armor', price: 8, out: 'yinshi', source: '原创', gu: {}, materials: {kuangshi: 2, yuanshi_zha: 2}, rate: 0.66, cost: 14 },
  { id: 'r_xuanfeng', flow: 'moon', price: 8, out: 'xuanfeng', source: '原创', gu: {}, materials: {yuelanhua: 4, yuanshi_zha: 2}, rate: 0.67, cost: 14 },
  { id: 'r_qingtong_sheli', flow: 'armor', price: 16, out: 'qingtong_sheli', source: '原创', gu: {}, materials: {kuangshi: 5, yuanshi_zha: 3}, rate: 0.58, cost: 28 },
  { id: 'r_chitie_sheli', flow: 'armor', price: 24, out: 'chitie_sheli', source: '原创', gu: {qingtong_sheli: 1}, materials: {kuangshi: 6, yuanshi_zha: 4}, rate: 0.49, cost: 42 },
  { id: 'r_chunqiuchan', flow: 'reverse', price: 24, out: 'chunqiuchan', source: '原创', minRank: 3, unique: true, gu: {}, materials: {guangyin_water: 3, yuanshi_zha: 8}, rate: 0.36, cost: 42 },
  { id: 'r_fanran', flow: 'wine', price: 8, out: 'fanran', source: '原创', gu: {}, materials: {qingzhujiu: 2, yuanshi_zha: 2}, rate: 0.74, cost: 14 },
  { id: 'r_langzi', flow: 'wine', price: 16, out: 'langzi', source: '原创', gu: {}, materials: {qingzhujiu: 4, kujiu: 2, yuanshi_zha: 2}, rate: 0.61, cost: 28 },
  { id: 'r_jiuchong_fanran', flow: 'reverse', price: 8, out: 'jiuchong', method: '逆炼', gu: { siwei_jiu: 1 }, materials: { fanran: 1 }, rate: 0.70, cost: 12 },
  { id: 'r_jiuchong_langzi', flow: 'reverse', price: 12, out: 'jiuchong', outCount: 2, method: '逆炼', gu: { siwei_jiu: 1 }, materials: { langzi: 1 }, rate: 0.64, cost: 12 },
  { id: 'r_yuemang', flow: 'moon', price: 12, out: 'yuemang', gu: { yueguang: 1, xiaoguang: 2 }, materials: {}, rate: 0.65, cost: 25 },
  { id: 'r_yuexuan', flow: 'moon', price: 12, out: 'yuexuan', gu: { yueguang: 1, xuanfeng: 1 }, materials: {}, rate: 0.60, cost: 25 },
  { id: 'r_yuehen', flow: 'moon', price: 12, out: 'yuehen', gu: { yueguang: 1, henshi: 1 }, materials: {}, rate: 0.76, cost: 25 },
  { id: 'r_yueni', flow: 'moon', price: 12, out: 'yueni', gu: { yueguang: 1, yupi: 1 }, materials: {}, rate: 0.62, cost: 25 },
  { id: 'r_baiyu', flow: 'armor', price: 12, out: 'baiyu', gu: { yupi: 1, baishi: 1 }, materials: { yezhuya: 1 }, rate: 0.57, cost: 25 },
  { id: 'r_heizong', flow: 'armor', price: 12, out: 'heizong', gu: { heishi: 1, qingsi: 1 }, materials: {}, rate: 0.56, cost: 25 },
  { id: 'r_siwei', flow: 'wine', price: 20, out: 'siwei_jiu', gu: { jiuchong: 2 }, materials: { suanjiu: 1, tianjiu: 1, kujiu: 1, lajiu: 1 }, rate: 0.51, cost: 45 }
];

export function recipeOutputText(recipe) {
  const name = (GU_DEFS[recipe.out] || ITEMS[recipe.out]).name;
  return recipe.outCount > 1 ? `${name} ×${recipe.outCount}` : name;
}

export function recipeIngredientsText(recipe) {
  return [...Object.entries(recipe.gu), ...Object.entries(recipe.materials)]
    .map(([id, count]) => `${(GU_DEFS[id] || ITEMS[id]).name}${count > 1 ? ` ×${count}` : ''}`)
    .join(' + ');
}
