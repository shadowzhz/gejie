export const ITEMS = {
  yuelanhua: { id: 'yuelanhua', name: '月兰花瓣', kind: '口粮', price: 2, desc: '月光蛊、月芒蛊、小光蛊的食料。' },
  shourou: { id: 'shourou', name: '兽肉', kind: '口粮', price: 3, desc: '黑豕蛊、白豕蛊、血蝠蛊、电狼蛊的食料。' },
  fengmi: { id: 'fengmi', name: '蜂王蜜', kind: '口粮', price: 4, desc: '玉皮蛊、白玉蛊、石皮蛊、铜皮蛊的食料。' },
  qingzhujiu: { id: 'qingzhujiu', name: '青竹酒', kind: '口粮', price: 5, desc: '酒虫最喜的竹香米酒，也可略微活血。' },
  tianjiu: { id: 'tianjiu', name: '甜果酒', kind: '口粮', price: 8, desc: '四味酒虫所需的四味之一。' },
  lajiu: { id: 'lajiu', name: '烈辣烧酒', kind: '口粮', price: 10, desc: '四味酒虫所需的烈酒，饮之暖身。' },
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
    增益: '下一次蛊虫或杀招伤害 +35%',
    探知: '查看敌方气血、真元和意图，持续至战斗结束',
    隐匿: `护盾 ${Math.round(def.power * 0.6)} · 持续至耗尽或战斗结束`
  };
  const effect = effects[def.kind];
  if (!effect) return '';
  const extra = {
    bingzhen: ' · 35% 几率使敌方跳过 1 次出手',
    dianlang_gu: ' · 35% 几率使敌方跳过 1 次出手',
    xuefu_gu: ' · 回复实际伤害的 35%'
  }[def.id] || '';
  const wait = Math.max(0, def.cd - 1);
  return `${effect}${extra} · 真元 ${def.cost} · ${wait ? `间隔 ${wait} 回合` : '可连续催动'}`;
}

export const GU_DEFS = {
  zhuci: { id: 'zhuci', name: '竹刺蛊', rank: 1, school: '木道', kind: '攻击', cost: 2, cd: 0, power: 14, food: 'yuelanhua', price: 9, desc: '凝出竹刺，催动时消耗的真元较少。' },
  minghuo: { id: 'minghuo', name: '明火蛊', rank: 1, school: '炎道', kind: '攻击', cost: 6, cd: 2, power: 26, food: 'fengmi', price: 18, desc: '骤然喷出一团明火，焚灼对手。' },
  zhujia: { id: 'zhujia', name: '竹甲蛊', rank: 1, school: '木道', kind: '防御', cost: 2, cd: 2, power: 13, food: 'yuelanhua', price: 10, desc: '催生一层轻薄的竹甲抵挡攻击。' },
  luzhu: { id: 'luzhu', name: '露珠蛊', rank: 1, school: '水道', kind: '治疗', cost: 3, cd: 2, power: 14, food: 'yuelanhua', price: 12, desc: '化出一滴清露，即刻缓和伤势。' },
  yunmu: { id: 'yunmu', name: '云幕蛊', rank: 3, school: '云道', kind: '防御', cost: 12, cd: 2, power: 56, food: 'fengmi', price: 96, desc: '聚起层层云幕，消解来袭的攻势。' },
  xuanjia: { id: 'xuanjia', name: '玄甲蛊', rank: 4, school: '金道', kind: '防御', cost: 18, cd: 3, power: 82, food: 'fengmi', price: 180, desc: '真元凝成玄甲，可挡重击。' },
  yueguang: { id: 'yueguang', name: '月光蛊', rank: 1, school: '月道', kind: '攻击', cost: 4, cd: 0, power: 18, food: 'yuelanhua', price: 18, desc: '古月一族传承之蛊，催动后掌心发出弯月光刃斩敌。' },
  xiaoguang: { id: 'xiaoguang', name: '小光蛊', rank: 1, school: '光道', kind: '增益', cost: 4, cd: 2, power: 12, food: 'yuelanhua', price: 16, desc: '增强下一次攻伐招式威能 +35%，常作月光蛊合炼辅材。' },
  yuemang: { id: 'yuemang', name: '月芒蛊', rank: 2, school: '月道', kind: '攻击', cost: 8, cd: 1, power: 34, food: 'yuelanhua', price: 45, desc: '二转月道主力攻伐蛊，月芒凝成细线，穿甲破盾之力甚强。' },
  yueren: { id: 'yueren', name: '月漩蛊', rank: 3, school: '月道', kind: '攻击', cost: 14, cd: 2, power: 62, food: 'yuelanhua', price: 120, desc: '三转月道蛊，催动出旋转月轮，连续撕裂敌方防线。' },
  yupi: { id: 'yupi', name: '玉皮蛊', rank: 1, school: '土道', kind: '防御', cost: 4, cd: 2, power: 22, food: 'fengmi', price: 20, desc: '催动后皮肤泛起温润玉光，化作护盾抵挡来袭伤害。' },
  baiyu: { id: 'baiyu', name: '白玉蛊', rank: 2, school: '土道', kind: '防御', cost: 7, cd: 2, power: 44, food: 'fengmi', price: 52, desc: '二转防御蛊，凝出厚实白玉光甲护盾，稳固空窍根基。' },
  shipi: { id: 'shipi', name: '石皮蛊', rank: 1, school: '土道', kind: '防御', cost: 3, cd: 2, power: 18, food: 'fengmi', price: 15, desc: '以石质硬皮覆体，价廉耐耗，常与玉皮合炼白玉蛊。' },
  tongpi: { id: 'tongpi', name: '铜皮蛊', rank: 2, school: '金道', kind: '防御', cost: 7, cd: 2, power: 40, food: 'fengmi', price: 48, desc: '铜皮铁骨，护盾之外更可令自身气血上限微增。' },
  shengjiye: { id: 'shengjiye', name: '生机叶', rank: 1, school: '木道', kind: '治疗', cost: 5, cd: 2, power: 24, food: 'yuelanhua', price: 22, desc: '一转疗伤常用蛊，一片翠叶化作温和生机愈合伤势。' },
  jiuyecao: { id: 'jiuyecao', name: '九叶生机草', rank: 2, school: '木道', kind: '治疗', cost: 8, cd: 2, power: 48, food: 'yuelanhua', price: 58, desc: '二转极品疗伤蛊，生机绵长，是保命续航之宝。' },
  jiuchong: { id: 'jiuchong', name: '酒虫', rank: 1, school: '食道', kind: '奇蛊', cost: 0, cd: 0, power: 10, food: 'qingzhujiu', price: 65, desc: '可提纯空窍真元（日进修为 +25%，并助跨小境界温养）。' },
  siwei_jiu: { id: 'siwei_jiu', name: '四味酒虫', rank: 2, school: '食道', kind: '奇蛊', cost: 0, cd: 0, power: 22, food: 'lajiu', price: 160, desc: '二转奇蛊，饮四味酒可提纯真元，修炼效率大幅提升（+45%）。' },
  heishi: { id: 'heishi', name: '黑豕蛊', rank: 1, school: '力道', kind: '被动', cost: 0, cd: 0, power: 14, food: 'shourou', price: 26, desc: '增一猪之力：永久提升拳脚与力道攻伐威能。' },
  baishi: { id: 'baishi', name: '白豕蛊', rank: 2, school: '力道', kind: '被动', cost: 0, cd: 0, power: 28, food: 'shourou', price: 64, desc: '再增一猪之力，肉身筋骨大成，抗击打能力显著增强。' },
  bingzhen: { id: 'bingzhen', name: '冰针蛊', rank: 1, school: '冰雪道', kind: '攻击', cost: 4, cd: 1, power: 20, food: 'yuelanhua', price: 20, desc: '射出刺骨寒针，伤害不俗并有几率冻僵敌手使其跳过一轮行动。' },
  xuefu_gu: { id: 'xuefu_gu', name: '血蝠蛊', rank: 2, school: '血道', kind: '攻击', cost: 8, cd: 2, power: 32, food: 'shourou', price: 55, desc: '吸食敌手精血，造成伤害的同时将部分血气反哺己身。' },
  dianlang_gu: { id: 'dianlang_gu', name: '电狼蛊', rank: 2, school: '雷道', kind: '攻击', cost: 9, cd: 2, power: 38, food: 'shourou', price: 62, desc: '引动蓝白电弧扑击敌手，疾速暴烈，有概率麻痹对手。' },
  nianxi: { id: 'nianxi', name: '念息蛊', rank: 1, school: '智道', kind: '探知', cost: 3, cd: 2, power: 15, food: 'yuanshi_zha', price: 24, desc: '战中催动可探明敌手确切气血、真元与下回合真意。' },
  yinshi: { id: 'yinshi', name: '隐石蛊', rank: 1, school: '暗道', kind: '隐匿', cost: 3, cd: 2, power: 12, food: 'yuanshi_zha', price: 24, desc: '持有时提高战中脱身成功率，并降低招致追捕的几率。' },
  xuanfeng: { id: 'xuanfeng', name: '旋风蛊', rank: 1, school: '风道', kind: '控制', cost: 4, cd: 2, power: 16, food: 'yuelanhua', price: 22, desc: '卷起山风扰乱敌方身法，造成伤害并有概率打断对手蓄势。' },
  qingtong_sheli: { id: 'qingtong_sheli', name: '青铜舍利蛊', rank: 1, school: '天道', kind: '消耗', cost: 0, cd: 0, power: 0, food: '', price: 90, desc: '一转破境奇蛊，使用后可直接助一转蛊师连破小境界。' },
  chitie_sheli: { id: 'chitie_sheli', name: '赤铁舍利蛊', rank: 2, school: '天道', kind: '消耗', cost: 0, cd: 0, power: 0, food: '', price: 210, desc: '二转破境奇蛊，使用后可直接助二转蛊师打破小境界壁垒。' },
  chunqiuchan: { id: 'chunqiuchan', name: '春秋蝉（残）', rank: 3, school: '宙道', kind: '奇蛊', cost: 0, cd: 0, power: 0, food: '', price: 0, desc: '奇蛊榜第七，可于行纪中留下一道旧影；身殒时消耗它回到那一刻。' }
};

export const REFINE_RECIPES = [
  { id: 'r_yuemang', price: 12, out: 'yuemang', main: 'yueguang', aux: 'xiaoguang', mat: 'kuangshi', rate: 0.68, cost: 25, desc: '月光蛊 + 小光蛊 + 青铁矿精 → 月芒蛊（二转）' },
  { id: 'r_yueren', price: 30, out: 'yueren', main: 'yuemang', aux: 'xuanfeng', mat: 'kuangshi', rate: 0.50, cost: 60, desc: '月芒蛊 + 旋风蛊 + 青铁矿精 → 月漩蛊（三转）' },
  { id: 'r_baiyu', price: 12, out: 'baiyu', main: 'yupi', aux: 'shipi', mat: 'fengmi', rate: 0.65, cost: 25, desc: '玉皮蛊 + 石皮蛊 + 蜂王蜜 → 白玉蛊（二转）' },
  { id: 'r_jiuye', price: 15, out: 'jiuyecao', main: 'shengjiye', aux: 'shengjiye', mat: 'yuelanhua', rate: 0.62, cost: 30, desc: '生机叶 ×2 + 月兰花瓣 → 九叶生机草（二转）' },
  { id: 'r_siwei', price: 20, out: 'siwei_jiu', main: 'jiuchong', aux: 'jiuchong', mat: 'tianjiu', rate: 0.58, cost: 45, desc: '酒虫 ×2 + 甜果酒 → 四味酒虫（二转）' }
];
