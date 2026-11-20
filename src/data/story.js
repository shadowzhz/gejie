export const STORY_EVENTS = [
  {
    id: 'kaike',
    title: '学堂开课',
    cond: '!flag:kaike',
    text: '开窍大典散后，学堂家老把今年新开窍的少年召到堂前。\n“从今日起，你们便是一转蛊师。去堂后蛊室挑一只本命蛊，谁先在三月三日之前炼化交卷，赏二十块元石。”\n人群顿时起了骚动。',
    choices: [
      { text: '记下规矩，前往学堂领蛊', effects: ['flag:kaike', 'flag:toumin_race', 'goal:前往「学堂」领取本命蛊，并赶在三月三日前交卷夺取头名赏'] }
    ]
  },
  {
    id: 'toumin_win',
    manual: true,
    title: '学堂头名',
    cond: 'flag:toumin_race&benming&before:1-3-3-0&at:xuetang',
    text: '你赶在众人之前步入学堂，将已经温顺下来的本命蛊气息放出一丝。\n家老抬眼打量了你片刻，点头记下名册：“头名归你，这是二十块元石。”',
    choices: [
      { text: '收下二十块元石', effects: ['yuanshi:+20', 'unflag:toumin_race', 'flag:toumin_won', 'goal:前往「演武场」找草人傀儡练手，再出寨去月下竹林历练'] }
    ]
  },
  {
    id: 'toumin_lost',
    title: '头名旁落',
    cond: 'flag:toumin_race&after:1-3-3-0',
    text: '天刚蒙蒙亮，学堂外便传开了消息：昨夜半夜，古月方源敲开了家老的门，抢先领走了头名赏的二十块元石。\n谁也没想到，丙等资质的他竟比甲等的方正还快一步。',
    choices: [
      { text: '专心眼下修行', effects: ['unflag:toumin_race', 'goal:前往「演武场」练手，尽快攒够实力出寨历练'] }
    ]
  },
  {
    id: 'nianmo_exam',
    title: '年末大考',
    cond: 'after:1-12-15-0&!flag:nianmo_done',
    text: '转眼已至腊月十五，古月山寨迎来一年一度的年末考核。全族长老坐在演武场高台之上，按修为、蛊虫与实战功绩评定甲乙丙丁。',
    choices: [
      { text: '登台应考（按当前实力评定赏格）', effects: ['exam:nianmo', 'flag:nianmo_done', 'goal:继续修行突破二转，或打听后山暗涧遗洞的传闻'] }
    ]
  },
  {
    id: 'langchao_start',
    title: '青茅狼潮',
    cond: 'after:2-6-1-0&!flag:langchao_seen',
    text: '次年六月，黑压压的电狼群终于顺着山脊压向古月山寨！山脚木栅接连告急，族中下令所有二转以上蛊师轮值迎敌。\n混乱之中，有人在趁乱发财，也有人在死守寨门。',
    choices: [
      { text: '随族人登墙守寨（立功稳妥）', effects: ['flag:langchao_seen', 'yuanshi:+35', 'goal:前往「电狼坡」斩杀豪电狼王，平定狼潮锋芒'] },
      { text: '趁夜暗中搜刮战死同族遗物（高收益，恶名上升）', effects: ['flag:langchao_seen', 'yuanshi:+75', 'mo:+25', 'goal:狼潮已起，山寨危局渐近，尽快冲击三转准备应对变局'] }
    ]
  },
  {
    id: 'qingmao_endgame',
    title: '血海降世 · 天鹤来袭',
    cond: 'after:2-10-1-0&!flag:qingmao_finished&flag:langchao_seen',
    text: '十万大山骤然血光冲天！古月一族先祖「古月一代」于地下血池苏醒，欲屠戮全族血亲提炼资质；与此同时，中洲古魂门「天鹤上人」驾仙鹤破空而至，两位绝世强者即将在青茅山拼杀至死！\n山崩地裂，整座青茅山已成死地，这是你走出青茅山的最后时机。',
    choices: [
      { text: '先截击古月一代残躯，再夺路冲出青茅山（凶险，战利品极丰）', effects: ['battle:guyue_yidai', 'flag:qingmao_finished', 'flag:qingmao_hero', 'goal:已历血海大战！整顿行囊，随时可告别青茅山'] },
      { text: '迎战天鹤上人外围弟子，趁两位强者死斗突围', effects: ['battle:tianhe', 'flag:qingmao_finished', 'goal:已从天鹤上人手下脱身，准备走出青茅山'] },
      { text: '趁双方两败俱伤，潜行绕道直接翻山离去（稳妥脱身）', effects: ['flag:qingmao_finished', 'yuanshi:+40', 'goal:你已避开血海绝境，可于「寨门」或行纪中宣告走出青茅山'] }
    ]
  }
];
