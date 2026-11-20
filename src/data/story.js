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
    id: 'uncle',
    title: '舅父设局',
    cond: 'after:1-4-1-0',
    text: '古月冻土请你在过继文书上画押，许诺先给一笔安家钱。你翻到末页，发现旧产仍由他代管。族中执事愿替你留一份文书，却要你自己承担日后的争讼。',
    choices: [
      { text: '拒绝画押，请执事封存文书', effects: ['flag:inheritance_claim'] },
      { text: '签下文书，领取二十八块元石', effects: ['yuanshi:+28'] }
    ]
  },
  {
    id: 'classmates',
    title: '学堂推举班头',
    cond: 'after:1-5-1-0',
    text: '古月漠北与古月赤城各自招揽同窗。漠北邀你随队练手，赤城愿借家中的人脉帮你备货。你也可以独行，去听酒客说说山里的旧事。',
    choices: [
      { text: '与漠北同练，领一只石皮蛊', effects: ['flag:mo_faction', 'gu:shipi'] },
      { text: '随赤城备货，领十八块元石', effects: ['flag:chi_faction', 'yuanshi:+18'] },
      { text: '独行，追查酒香（解锁暗涧遗洞）', effects: ['flag:clue:huajiu', 'goal:循血蝠洞旁的小径探访暗涧遗洞'] }
    ]
  },
  {
    id: 'wine_lead',
    title: '石缝里的酒香',
    cond: 'after:1-6-1-0',
    text: '客栈伙计拾到一片沾着酒香的石片，指得出它来自哪一道山涧。行商也肯替你留意下一趟商队的酒虫拍卖。',
    choices: [
      { text: '收下石片，私探遗洞', effects: ['flag:clue:huajiu', 'goal:从血蝠洞旁前往暗涧遗洞，寻找酒虫'] },
      { text: '等商队开拍（凭帖竞买酒虫）', effects: ['flag:wine_bid', 'goal:次年三月初一至初八去蛊铺竞买酒虫'] }
    ]
  },
  {
    id: 'early_sheli',
    title: '学堂的青铜舍利',
    cond: 'after:1-7-1-0&rank:1&haiBelow:6',
    text: '家老见你冲刷窍壁吃力，从备给学徒的赏格里取出一只青铜舍利蛊。你可留待瓶颈时使用，也可领取口粮继续温养。',
    choices: [
      { text: '领青铜舍利蛊（一转提升一小阶）', effects: ['gu:qingtong_sheli'] },
      { text: '领月兰花瓣十二片与元石十块', effects: ['item:yuelanhua:12', 'yuanshi:+10'] }
    ]
  },
  {
    id: 'jiuyecao_inheritance',
    title: '家产交割',
    cond: 'after:1-9-1-0',
    text: '族中执事摊开旧账，酒肆和药圃须重新清点。此前封存的文书足以证明你对药圃的份额。若已经签下过继文书，眼下只能接受舅父拨给你的补偿。',
    choices: [
      { text: '按旧账分产，收下九叶生机草', cond: 'flag:inheritance_claim', effects: ['gu:jiuyecao'] },
      { text: '拿酒肆分红作本钱（四十二块元石）', cond: 'flag:inheritance_claim', effects: ['yuanshi:+42'] },
      { text: '收下过继后的补偿（十八块元石）', cond: '!flag:inheritance_claim', effects: ['yuanshi:+18'] }
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
    id: 'wolf_signs',
    title: '残狼过冬',
    cond: 'after:2-1-1-0',
    text: '猎户发现原在山脊活动的狼已经压到竹林。任务堂要人运粮，也有人想趁巡山人手不足去山外探路。',
    choices: [
      { text: '替守寨人运粮，备下疗伤物资', effects: ['flag:wolf_supplies', 'item:zhixuegao:3'] },
      { text: '独自踩点，记下狼群绕行的小径', effects: ['flag:wolf_trail', 'item:shourou:8'] }
    ]
  },
  {
    id: 'jia_missing',
    title: '商队少了一人',
    cond: 'after:2-3-2-0',
    text: '贾家商队点货时，贾金生迟迟没有回来。伙计记得他打听过山涧方向，求你搭把手。窄道泥泞，车辙和脚印正在被雨冲散。',
    choices: [
      { text: '描下脚印，保管商队失物', effects: ['flag:jia_evidence'] },
      { text: '拾走散落货款（四十块元石，恶名 +22）', effects: ['yuanshi:+40', 'mo:+22', 'flag:jia_missing_stones'] },
      { text: '护送车队回寨，领十二块元石', effects: ['yuanshi:+12'] }
    ]
  },
  {
    id: 'jia_questions',
    title: '贾富问询',
    cond: 'after:2-3-6-0&flag:event_done:jia_missing',
    text: '贾富借竹君子逐一问话，想知道谁见过贾金生和失踪前的货物。问到山涧时，伙计将目光移向了你。',
    choices: [
      { text: '交出失物与足迹（留下查案凭证）', cond: 'flag:jia_evidence', effects: ['flag:jia_witness', 'yuanshi:+20'] },
      { text: '退回货款（四十块元石，恶名 -15）', cond: 'flag:jia_missing_stones&stones:40', effects: ['yuanshi:-40', 'mo:-15'] },
      { text: '只说自己亲眼所见，到此为止', effects: [] }
    ]
  },
  {
    id: 'langchao_start',
    title: '青茅狼潮',
    cond: 'after:2-6-1-0&!flag:langchao_seen',
    text: '次年六月，黑压压的电狼群终于顺着山脊压向古月山寨！山脚木栅接连告急，族中下令所有二转以上蛊师轮值迎敌。\n混乱之中，有人在趁乱发财，也有人在死守寨门。',
    choices: [
      { text: '随漠北登墙，迎击电狼（从护盾 30 开战）', cond: 'flag:mo_faction', effects: ['flag:langchao_seen', 'battle:dianlang', 'shield:30', 'onwin:wall_held'] },
      { text: '用备好的药粮接济守军（立下战功）', cond: 'flag:wolf_supplies', effects: ['flag:langchao_seen', 'flag:wall_held', 'yuanshi:+20'] },
      { text: '亲自迎击电狼，守住缺口', effects: ['flag:langchao_seen', 'battle:dianlang', 'onwin:wall_held'] },
      { text: '趁夜搜刮遗物（六十块元石，恶名 +25）', effects: ['flag:langchao_seen', 'yuanshi:+60', 'mo:+25'] }
    ]
  },
  {
    id: 'bai_encounter',
    title: '白家来客',
    cond: 'after:2-6-15-0&flag:langchao_seen',
    text: '白凝冰出关后接连向两寨蛊师挑战。你在巡山换防时遇见他，石径上凝着一层薄霜。他邀你过招，守军却正等着这批人回寨。',
    choices: [
      { text: '接下邀约（切磋，胜后再会有备）', effects: ['battle:bainingbing', 'onwin:bai_read'] },
      { text: '护送同窗回寨（领十块元石）', effects: ['yuanshi:+10'] }
    ]
  },
  {
    id: 'wolf_breach',
    title: '东门告急',
    cond: 'after:2-7-10-0&flag:langchao_seen',
    text: '狼群扑向东门，熊家求援队也被困在山坳。你可以点烽火引守军接应，或把狼群引向对方的退路，趁混乱取得遗落的物资。',
    choices: [
      { text: '点烽火接应（有守寨战功，领四十块元石）', cond: 'flag:wall_held', effects: ['flag:wolf_rescue', 'yuanshi:+40'] },
      { text: '从小径引狼截路（赤铁舍利蛊，恶名 +35）', cond: 'flag:wolf_trail', effects: ['flag:wolf_betrayal', 'gu:chitie_sheli', 'item:kuangshi:3', 'mo:+35'] },
      { text: '守住驿道，迎战豪电狼王', effects: ['battle:langwang', 'onwin:wolf_rescue'] },
      { text: '留守内寨，护送伤员撤退', effects: ['item:shengjiye:2'] }
    ]
  },
  {
    id: 'tie_inquiry',
    title: '铁血冷入寨',
    cond: 'after:2-8-20-0&flag:event_done:wolf_breach',
    text: '铁血冷与铁若男查起贾金生一案，同时复核狼潮时几支队伍的行迹。贾家问话时的证词、东门的战功和乡人的指认都摆上了案头。',
    choices: [
      { text: '以失踪案证词或救援记录结案（恶名 -15）', cond: '!mo:30&(flag:jia_witness|flag:wolf_rescue)', effects: ['mo:-15', 'flag:tie_cleared', 'yuanshi:+24'] },
      { text: '领取协查文书，以后出入须登记', cond: '!mo:30', effects: ['flag:tie_cleared'] },
      { text: '交三十块元石赔偿，接受保结（恶名 -20）', cond: 'mo:30&stones:30', effects: ['yuanshi:-30', 'mo:-20', 'flag:tie_bond'] },
      { text: '趁夜冲出封锁，迎战铁家追兵', cond: 'mo:30', effects: ['battle:tie_patrol', 'onwin:tie_fugitive'] }
    ]
  },
  {
    id: 'three_clans',
    title: '三寨斗蛊大比',
    cond: 'after:2-9-10-0&flag:event_done:tie_inquiry',
    text: '狼潮过后，古月、白、熊三家要以斗蛊重划山路和猎场。白凝冰已经登台。寨门仍有铁家的人盘查，保结在身的人可请赤城作保递帖。',
    choices: [
      { text: '登台挑战白凝冰（胜得赤铁舍利蛊）', cond: 'flag:tie_cleared|(flag:tie_bond&flag:chi_faction)', effects: ['battle:bainingbing', 'onwin:tournament_won', 'wingu:chitie_sheli'] },
      { text: '依上次交手所见先护住要害（护盾 28，胜得赤铁舍利蛊）', cond: 'flag:bai_read&(flag:tie_cleared|(flag:tie_bond&flag:chi_faction))', effects: ['battle:bainingbing', 'shield:28', 'onwin:tournament_won', 'wingu:chitie_sheli'] },
      { text: '在场外观战，记下撤往山外的路', effects: [] }
    ]
  },
  {
    id: 'blood_skull',
    title: '血池边的取舍',
    cond: 'after:2-10-1-0&flag:event_done:three_clans',
    text: '地下血池翻涌，古月一代现身。血颅蛊能以血亲之血提升资质。乱局中有人想夺取这份力量，也有人打算趁通道尚在，叫醒身边还活着的族人。',
    choices: [
      { text: '夺血颅蛊，以血亲献祭（元海最多 +2 成，恶名 +55）', cond: 'flag:wolf_betrayal|flag:tie_fugitive', effects: ['hai:+2', 'mo:+55'] },
      { text: '疏散族人，备好干粮继续突围', effects: ['item:shourou:6'] }
    ]
  },
  {
    id: 'qingmao_endgame',
    title: '血海降世 · 天鹤来袭',
    cond: 'after:2-10-1-0&!flag:qingmao_finished&flag:event_done:blood_skull',
    text: '十万大山骤然血光冲天！古月一族先祖「古月一代」从血池杀出，中洲仙鹤门的天鹤上人驾鹤截住了他。\n山崩地裂，整座青茅山已成死地，这是你走出青茅山的最后时机。',
    choices: [
      { text: '截击古月一代残躯（胜后可离开青茅山）', effects: ['battle:guyue_yidai', 'onwin:qingmao_finished', 'goal:击败古月一代残躯后，从寨门离开青茅山'] },
      { text: '直面天鹤上人（胜后可离开青茅山）', effects: ['battle:tianhe', 'onwin:qingmao_finished', 'goal:击退天鹤上人后，从寨门离开青茅山'] },
      { text: '趁双方两败俱伤，潜行绕道直接翻山离去（稳妥脱身）', effects: ['flag:qingmao_finished', 'yuanshi:+40', 'goal:你已避开血海绝境，可于「寨门」或行纪中宣告走出青茅山'] }
    ]
  }
];
