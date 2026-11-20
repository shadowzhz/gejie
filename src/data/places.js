import { makeTime } from '../core/calendar.js';

export function hasPlaceActions(gs) {
  return !!(PLACES[gs.location]?.services.length
    || (gs.location === 'zhaimen' && gs.flags.qingmao_finished));
}

export const PLACES = {
  zhulou: {
    id: 'zhulou', name: '竹楼', region: '古月山寨', x: 10, y: 22,
    links: { shijie: 15 },
    day: '晨光透进竹帘，案上摆着一只粗瓷碗和几块元石。',
    night: '夜风吹动青竹，窗纸外偶尔掠过巡夜人的火把光。',
    services: ['rest', 'cultivate']
  },
  shijie: {
    id: 'shijie', name: '寨中石阶', region: '古月山寨', x: 26, y: 46,
    links: { zhulou: 15, xuetang: 15, yanwu: 15, yaotang: 30, kezhan: 30, jucaifang: 30, gupu: 30, renwutang: 30, jiazhuge: 30, zhaimen: 30 },
    day: '青石阶上人来人往，学堂的钟声与坊市的叫卖混在一处。',
    night: '石阶泛着夜露的潮气，家主阁方向亮着几盏高悬的灯笼。',
    services: []
  },
  xuetang: {
    id: 'xuetang', name: '学堂', region: '古月山寨', x: 24, y: 14,
    links: { shijie: 15 },
    day: '学堂家老站在讲台前翻看名册，门外悬着蛊室的铜牌。',
    night: '学堂大门半掩，只有值夜的教习在灯下整理考核簿。',
    services: ['xuetang_gu', 'xuetang_report']
  },
  yanwu: {
    id: 'yanwu', name: '演武场', region: '古月山寨', x: 42, y: 16,
    links: { shijie: 15 },
    day: '几名少年正围着木桩催动月刃，沙地上留下浅浅的月牙痕。',
    night: '演武场空无一人，草人傀儡静静立在靶位中央。',
    services: ['practice_caoren', 'sparring']
  },
  yaotang: {
    id: 'yaotang', name: '药堂', region: '古月山寨', x: 10, y: 54,
    links: { shijie: 30 },
    day: '药堂里弥漫着草药的清香，药师正在配制伤药。',
    night: '药堂已落了门栓，只留一扇小窗应对急症。',
    shop: ['item:zhixuegao'],
    services: ['shop', 'heal']
  },
  kezhan: {
    id: 'kezhan', name: '山寨客栈', region: '古月山寨', x: 10, y: 78,
    links: { shijie: 30 },
    day: '行脚商人与族人挤在木桌旁喝青竹酒，消息在这里传得最快。',
    night: '灯火通明，角落里有人压低声音议论山外的风声。',
    shop: ['item:qingzhujiu', 'item:suanjiu', 'item:tianjiu', 'item:kujiu', 'item:lajiu'],
    services: ['shop', 'rumor']
  },
  jucaifang: {
    id: 'jucaifang', name: '聚财坊', region: '古月山寨', x: 26, y: 78,
    links: { shijie: 30 },
    day: '货架上堆着月兰花瓣、腌肉、蜂王蜜与各色一转炼材。',
    night: '柜台亮着油灯，伙计仍在招呼来买口粮和炼材的客人。',
    shop: ['item:yuelanhua', 'item:shourou', 'item:fengmi', 'item:kuangshi', 'item:yuanshi_zha', 'item:yezhuya'],
    services: ['shop']
  },
  gupu: {
    id: 'gupu', name: '蛊铺', region: '古月山寨', x: 58, y: 77,
    links: { shijie: 30 },
    day: '掌柜将蛊虫与蛊方分开陈列。贾家商队次年三月初到寨，停留八日。',
    night: '柜台上点着一盏油灯，掌柜仍在照看蛊虫。',
    shop: ['gu:shipi', 'gu:xuanfeng', 'item:shengjiye'],
    services: ['shop', 'recipes']
  },
  renwutang: {
    id: 'renwutang', name: '任务堂', region: '古月山寨', x: 42, y: 76,
    links: { shijie: 30 },
    day: '族中执事正在告示板上张挂委托。',
    night: '值夜执事仍在灯下登记委托。',
    services: ['quests']
  },
  jiazhuge: {
    id: 'jiazhuge', name: '家主阁', region: '古月山寨', x: 42, y: 40,
    links: { shijie: 30 },
    lock: { flag: 'open:jiazhuge', msg: '族长重地，需二转以上或族中召见方可入内。' },
    day: '朱漆木门紧闭，两名二转护卫按刀立在石阶两侧。',
    night: '阁楼深处灯火未熄，隐约传出算盘与翻卷之声。',
    services: ['clan_hall']
  },
  zhaimen: {
    id: 'zhaimen', name: '青茅寨门', region: '青茅山', x: 58, y: 48,
    links: { shijie: 30, zhulin: 45, xuefu: 60 },
    lock: { flag: 'kaike', msg: '学堂尚未开课，不可擅出山寨。' },
    day: '木栅门外便是十万大山的莽莽林海，守门蛊师正核对出寨令牌。',
    night: '火把在山风里噼啪作响，山林深处不时传来兽嚎。',
    services: []
  },
  zhulin: {
    id: 'zhulin', name: '月下竹林', region: '青茅山外', x: 74, y: 26,
    links: { zhaimen: 45, langchao: 60 },
    lock: { flag: 'practiced', msg: '学堂家老：未在演武场练过手的新丁，不准进深山。' },
    day: '翠竹遮天，林间落叶下藏着野猪拱出的新土与野生蛊材。',
    night: '月色洒在竹叶上，酒香混着兽腥从深处飘来。',
    exploreEnemy: 'yezhu',
    bossEnemy: 'zhuwang',
    services: ['explore', 'gather']
  },
  xuefu: {
    id: 'xuefu', name: '血蝠洞', region: '青茅山外', x: 74, y: 72,
    links: { zhaimen: 60, huajiu: 45 },
    lock: { flag: 'practiced', msg: '学堂家老：未在演武场练过手的新丁，不准进深山。' },
    day: '洞口阴风阵阵，岩壁上挂着成片的赤眼血蝠。',
    night: '洞内腥风大作，正是血蝠群出洞觅食的时辰。',
    exploreEnemy: 'xuefu',
    bossEnemy: 'xuefu_king',
    services: ['explore', 'gather']
  },
  langchao: {
    id: 'langchao', name: '电狼坡', region: '青茅山外', x: 90, y: 34,
    links: { zhulin: 60 },
    lock: { flag: 'clear:xuefu', msg: '电狼群凶悍成阵，须先扫清血蝠洞积攒实战经验。' },
    day: '焦黑的草坡上闪动着蓝白电弧，几头电狼正伏在石后窥伺。',
    night: '坡顶雷光频闪，豪电狼王的啸声震得山石作响。',
    exploreEnemy: 'dianlang',
    bossEnemy: 'langwang',
    services: ['explore', 'gather']
  },
  huajiu: {
    id: 'huajiu', name: '暗涧遗洞', region: '青茅山外', x: 90, y: 80,
    links: { xuefu: 45 },
    hidden: 'clue:huajiu',
    day: '山涧水声轰鸣，循着线索便能找到水帘后隐蔽的入口。',
    night: '水帘后隐约透出一线微光，石壁上刻着花酒行者的遗言。',
    services: ['huajiu_explore']
  }
};
export function placeShopEntries(gs) {
  const shop = PLACES[gs.location]?.shop ?? [];
  if (gs.location !== 'gupu') return shop;
  const entries = [...shop];
  if (gs.flags.kaike) entries.push('gu:yueguang', 'gu:xiaoguang');
  if (gs.minutes >= makeTime(2, 3, 1) && gs.minutes < makeTime(2, 3, 9)
    && !gs.flags.merchant_jiuchong_bought) entries.push('gu:jiuchong');
  return entries;
}
