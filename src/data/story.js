import { QINGMAO_QUESTS, QINGMAO_SCENES } from './qingmao-stories.js';

export const STORY_QUEST_STAGES = {
  completed: '已完成',
  failed: '已失败'
};

export const STORY_QUESTS = {
  ...QINGMAO_QUESTS,
  caravan: {
    name: '贾家商队失踪',
    followupDays: 2,
    followupEvent: 'jia_case_followup',
    steps: {
      investigate: {
        name: '调查取证',
        hint: '去山寨客栈问访商队伙计，或到任务堂抄录驿道登记。次年三月初六起，贾富会在寨中问询。'
      },
      verify: {
        name: '核对证词',
        hint: '继续去山寨客栈、任务堂取证。贾富信得过你时，可在蛊铺查私账。铁家入寨听证结束前，到任务堂提交卷宗。'
      }
    },
    clues: {
      tracks: { name: '雨中足迹与失物', detail: '窄道脚印与一件商队失物，能证明有人经过山涧。' },
      witness: { name: '伙计的口供', detail: '客栈伙计亲见贾金生离开车队，记得他的出发时辰。' },
      trail: { name: '寨门驿道的复查', detail: '守门人记下货车过门的时辰，可与口供对照。' },
      ledger: { name: '贾富的私账', detail: '出货时辰与车队登记不同，贾富愿私下解释其中缘由。' }
    },
    outcomes: {
      iron: '证据交由铁家复核',
      jia: '私账交回贾富，贾家自行追查',
      refused: '玩家放弃继续追查',
      theft: '贾家发现货款未归还',
      expired: '铁家收卷时，调查仍无结论',
      legacy: '原有问询结果已归档'
    }
  }
};

export const STORY_EVENTS = [
  {
    id: 'kaike',
    title: '学堂开课',
    cond: '!flag:kaike',
    text: '开窍大典散后，学堂家老把今年新开窍的少年召到堂前。\n“从今日起，你们便是一转蛊师。去堂后蛊室挑一只本命蛊，谁先在三月三日之前炼化交卷，赏二十块元石。”\n人群顿时起了骚动。\n\n家老把铜簿翻到空白页，没急着写名字。“从蛊室领出来算借给你，留住它、炼化它，才算你的本事。出了寨，没人照着这上面的次序救你。”门边一个孩子摸了摸自己的空口袋，把手缩回袖中。',
    choices: [
      { text: '记下规矩，前往学堂领蛊', effects: ['flag:kaike', 'flag:toumin_race', 'goal:前往「学堂」领取本命蛊，并赶在三月三日前交卷夺取头名赏'] },
      { text: '借家老的领蛊簿，问清领蛊与炼化的区别', effects: ['flag:kaike', 'flag:toumin_race', 'flag:academy_ledger', 'goal:到学堂的蛊室领蛊，再到空窍炼化本命蛊'] }
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
    text: '天刚蒙蒙亮，学堂外便传开了消息：昨夜半夜，古月方源敲开了家老的门，抢先领走了头名赏的二十块元石。\n谁也没想到，丙等资质的他竟比甲等的方正还快一步。\n\n门房说方源站在阶下报的是自己的名，语气像报天亮的时辰。有人说他有藏起来的蛊，有人只记得那一夜借过他半盏灯。',
    choices: [
      { text: '专心眼下修行', effects: ['unflag:toumin_race', 'goal:前往「演武场」练手，尽快攒够实力出寨历练'] },
      { text: '问方源为何半夜来交卷，记下他走过的石阶', effects: ['unflag:toumin_race', 'flag:fangyuan_night_steps', 'goal:去演武场练手，也可到客栈问问方源走过的路'] }
    ]
  },
  {
    id: 'uncle',
    title: '舅父设局',
    cond: 'after:1-4-1-0',
    text: '古月冻土请你在过继文书上画押，许诺先给一笔安家钱。你翻到末页，发现旧产仍由他代管。族中执事愿替你留一份文书，却要你自己承担日后的争讼。\n\n冻土拢了拢袖子，把笔又往你面前推半寸。“药圃年年要修沟，账上亏的是我。你只消按手印，手上就干净。”执事没有插话，先把垫在竹席下的旧纸翻了个面。',
    choices: [
      { text: '拒绝画押，请执事封存文书', effects: ['flag:inheritance_claim'] },
      { text: '签下文书，领取二十八块元石', effects: ['yuanshi:+28'] }
    ]
  },
  {
    id: 'classmates',
    title: '学堂推举班头',
    cond: 'after:1-5-1-0',
    text: '古月漠北与古月赤城各自招揽同窗。漠北邀你随队练手，赤城愿借家中的人脉帮你备货。你也可以独行，去听酒客说说山里的旧事。\n\n漠北把几根练歪了的木桩一一扶正。赤城分货签时给看门的也留了一份。方源坐得最靠门，听完两人的价码，拿起早已喝空的竹杯，先一步出了学堂。',
    choices: [
      { text: '与漠北同练，领一只石皮蛊', effects: ['flag:mo_faction', 'relation:mobei:20:30:学堂同练', 'gu:shipi'] },
      { text: '随赤城备货，领十八块元石', effects: ['flag:chi_faction', 'relation:chicheng:20:30:替赤脉备货', 'yuanshi:+18'] },
      { text: '独行，追查酒香（解锁暗涧遗洞）', effects: ['flag:clue:huajiu', 'goal:循血蝠洞旁的小径探访暗涧遗洞'] }
    ]
  },
  {
    id: 'wine_lead',
    title: '石缝里的酒香',
    cond: 'after:1-6-1-0',
    text: '客栈伙计拾到一片沾着酒香的石片，指得出它来自哪一道山涧。行商也肯替你留意下一趟商队的酒虫拍卖。\n\n伙计取清水把石片冲了一遍，杯底仍有香气。他看了看后门：“寻酒的人要看哪家酒好。要是石头比酒还香，得先问它是从哪儿往外流的。”',
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
    text: '族中执事摊开旧账，酒肆和药圃须重新清点。此前封存的文书足以证明你对药圃的份额。若已经签下过继文书，眼下只能接受舅父拨给你的补偿。\n\n门外排着等结工钱的人。执事每念一处田产，便有人把头抬起来。轮到药圃时，旧管事没应声，手里捏着那束晒干的账绳。',
    choices: [
      { text: '按旧账分产，收下九叶生机草', cond: 'flag:inheritance_claim', effects: ['gu:jiuyecao'] },
      { text: '拿酒肆分红作本钱（四十二块元石）', cond: 'flag:inheritance_claim', effects: ['yuanshi:+42'] },
      { text: '收下过继后的补偿（十八块元石）', cond: '!flag:inheritance_claim', effects: ['yuanshi:+18'] },
      { text: '按旧管事说的办法分账，先把药圃收入留给赈济', cond: 'flag:estate_private', effects: ['flag:estate_relief', 'item:zhixuegao:3'] }
    ]
  },
  {
    id: 'nianmo_exam',
    title: '年末大考',
    cond: 'after:1-12-15-0&!flag:nianmo_done',
    text: '转眼已至腊月十五，古月山寨迎来一年一度的年末考核。全族长老坐在演武场高台之上，按修为、蛊虫与实战功绩评定甲乙丙丁。\n\n沙地还没扫净，上午落下的脚印盖着下午第一场的界线。漠北弯腰把边上的尺摆正。赤城在棚下替两名迟到的学徒留了位，等家老唱名，也没说他们是谁家的人。',
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
    quest: 'caravan',
    text: '贾家商队点货时，贾金生迟迟没有回来。伙计记得他打听过山涧方向，求你搭把手。窄道泥泞，车辙和脚印正在被雨冲散。\n\n最后一辆车倒是回来了。车夫把本该交给贾金生的钥匙搁在半空，问该递给谁。伙计仓促掀开防水布，布下的货款散了一地。',
    choices: [
      { text: '描下脚印，保管商队失物', effects: ['flag:jia_evidence', 'quest:caravan:investigate', 'clue:caravan:tracks', 'relation:jiafu:5:5:替商队保管失物'] },
      { text: '拾走散落货款（四十块元石，恶名 +22）', effects: ['yuanshi:+40', 'mo:+22', 'flag:jia_missing_stones', 'quest:caravan:investigate', 'relation:jiafu:-30:-25:伙计指认你拿了货款'] },
      { text: '护送车队回寨，领十二块元石', effects: ['yuanshi:+12', 'quest:caravan:investigate', 'relation:jiafu:15:25:护送伙计回寨'] }
    ]
  },
  {
    id: 'jia_questions',
    title: '贾富问询',
    cond: 'after:2-3-6-0&flag:event_done:jia_missing',
    quest: 'caravan',
    text: '贾富借竹君子逐一问话，想知道谁见过贾金生和失踪前的货物。问到山涧时，伙计将目光移向了你。\n\n贾富让人挪开了账桌前的凳子，自己也站着听。“有亲眼见过的，就告诉我那段路朝哪儿走。若是听旁人传的，说清楚是哪一个人。”他把两沓卷页分在两边，一页也没有销掉。',
    choices: [
      { text: '交出失物与足迹（留下查案凭证）', cond: 'flag:jia_evidence', effects: ['flag:jia_witness', 'yuanshi:+20', 'quest:caravan:verify', 'relation:jiafu:15:30:已收下失物与足迹'] },
      { text: '退回货款（四十块元石，恶名 -15）', cond: 'flag:jia_missing_stones&stones:40', effects: ['yuanshi:-40', 'mo:-15', 'unflag:jia_missing_stones', 'unflag:jia_trade_refused', 'quest:caravan:verify', 'relation:jiafu:15:20:货款已退，仍待核实'] },
      { text: '只说自己亲眼所见，不交出手上的东西', effects: ['quest:caravan:verify'] },
      { text: '说货款交给了寨门值夜人，请他自己去问', cond: 'flag:jia_missing_stones', effects: ['quest:caravan:verify', 'flag:jia_trade_refused', 'mo:+8', 'relation:jiafu:-20:-25:谎称货款交给了守门人'] }
    ]
  },
  {
    id: 'langchao_start',
    title: '青茅狼潮',
    cond: 'after:2-6-1-0&!flag:langchao_seen',
    text: '次年六月，黑压压的电狼群终于顺着山脊压向古月山寨！山脚木栅接连告急，族中下令所有二转以上蛊师轮值迎敌。\n混乱之中，有人在趁乱发财，也有人在死守寨门。\n\n头一轮号角还没吹完，传令的人就从石阶上滚下来。他张嘴先问后队到了没有，手里的旗却还是给头队用的。东墙守夜的饭碗一个也没收。',
    choices: [
      { text: '随漠北登墙，迎击电狼（从护盾 30 开战）', cond: 'flag:mo_faction&trust:mobei:25', effects: ['relation:mobei:10:10:狼潮并肩守寨', 'flag:langchao_seen', 'battle:dianlang', 'shield:30', 'onwin:wall_held'] },
      { text: '用备好的药粮接济守军（立下战功）', cond: 'flag:wolf_supplies', effects: ['flag:langchao_seen', 'flag:wall_held', 'yuanshi:+20'] },
      { text: '亲自迎击电狼，守住缺口', effects: ['flag:langchao_seen', 'battle:dianlang', 'onwin:wall_held'] },
      { text: '趁夜搜刮遗物（六十块元石，恶名 +25）', effects: ['flag:langchao_seen', 'yuanshi:+60', 'mo:+25'] },
      { text: '随猎户从私道引走受伤的巡山人（记下战功）', cond: 'flag:hunter_evac', effects: ['flag:langchao_seen', 'flag:wall_held', 'flag:hunter_people_rescued'] },
      { text: '对照巡山队的山图，截住侧翼狼群（从护盾 20 开战）', cond: 'flag:hunter_patrol&flag:hunter_spoor_read', effects: ['flag:langchao_seen', 'battle:dianlang', 'shield:20', 'onwin:wall_held'] }
    ]
  },
  {
    id: 'bai_encounter',
    title: '白家来客',
    cond: 'after:2-6-15-0&flag:langchao_seen',
    text: '白凝冰出关后接连向两寨蛊师挑战。你在巡山换防时遇见他，石径上凝着一层薄霜。他邀你过招，守军却正等着这批人回寨。\n\n他一脚把湿柴踢离石径，给你留出了侧身的位置。“现在借半丈，明天你未必肯借我。”他看了看你身后的同窗，长袖收得紧了一点。',
    choices: [
      { text: '接下邀约（切磋，胜后再会有备）', effects: ['relation:bainingbing:10:5:应下白家邀战', 'battle:bainingbing', 'onwin:bai_read'] },
      { text: '护送同窗回寨，先把这场约战记着（领十块元石）', effects: ['yuanshi:+10', 'relation:bainingbing:-2:5:他记下了此时你要护送的人'] }
    ]
  },
  {
    id: 'wolf_breach',
    title: '东门告急',
    cond: 'after:2-7-10-0&flag:langchao_seen',
    text: '狼群扑向东门，熊家求援队也被困在山坳。你可以点烽火引守军接应，或把狼群引向对方的退路，趁混乱取得遗落的物资。\n\n东门灯绳上打的是救援才用的活扣。拽一下，山坳里的人就会出来。有人已经看清那条路会把狼一同引过去，仍在等你动手。',
    choices: [
      { text: '点烽火接应（有守寨战功，领四十块元石）', cond: 'flag:wall_held', effects: ['flag:wolf_rescue', 'yuanshi:+40'] },
      { text: '从小径引狼截路（赤铁舍利蛊，恶名 +35）', cond: 'flag:wolf_trail', effects: ['flag:wolf_betrayal', 'gu:chitie_sheli', 'item:kuangshi:3', 'mo:+35'] },
      { text: '守住驿道，迎战豪电狼王', effects: ['battle:langwang', 'onwin:wolf_rescue'] },
      { text: '留守内寨，护送伤员撤退', effects: ['item:shengjiye:2'] },
      { text: '用贾富留下的货车撤走伤员（记下救援战功）', cond: 'flag:jia_wagon_aid&trust:jiafu:50', effects: ['flag:wolf_rescue', 'relation:jiafu:5:5:借来货车救援伤员'] },
      { text: '依漠北此前定下的轮值，把后队调到东门救人', cond: 'flag:mobei_relief', effects: ['flag:wolf_rescue', 'relation:mobei:10:10:后队从东门接走伤员'] },
      { text: '循遗洞记号开通水道，带伤员绕过东门', cond: 'flag:grotto_map', effects: ['flag:wolf_rescue', 'flag:survivor_pass'] },
      { text: '把药圃留作赈济的份额调给东门伤员', cond: 'flag:estate_relief', effects: ['flag:wolf_rescue', 'flag:estate_relief_used'] },
      { text: '把赤城预留的药箱交给东门守军', cond: 'flag:chi_reserved', effects: ['flag:wolf_rescue', 'relation:chicheng:8:12:依领条把药箱用在救人上'] },
      { text: '开炉坊的公示后巷，让东门脚夫照着通路接人', cond: 'flag:workshop_route', effects: ['flag:wolf_rescue', 'flag:survivor_pass'] },
      { text: '出示修炉商人签过的药费单，调一批药给东门', cond: 'flag:workshop_aid', effects: ['flag:wolf_rescue', 'flag:workshop_paid_aid'] },
      { text: '托过境的商队沿证人走过的私路接走伤员', cond: 'flag:jia_safe_passage&trust:jiafu:25', effects: ['flag:wolf_rescue', 'flag:survivor_pass', 'relation:jiafu:5:8:伙计引商队接走了伤员'] },
      { text: '照着药堂点下的无记灯，领巡守送伤者出寨', cond: 'flag:survivor_lamp&(flag:survivor_record|flag:survivor_pass)', effects: ['flag:wolf_rescue', 'flag:survivor_lamp_guided'] }
    ]
  },
  {
    id: 'tie_inquiry',
    title: '铁血冷入寨',
    cond: 'after:2-8-20-0&flag:event_done:wolf_breach',
    text: '铁血冷与铁若男查起贾金生一案，同时复核狼潮时几支队伍的行迹。贾家问话时的证词、东门的战功和乡人的指认都摆上了案头。\n\n铁若男把两份山路图叠起来，专盯不重合的那一角。铁血冷把灯挪过去，让墙上的影子避开桌面。“有件事众口一词，也得看看这话最先是谁说的。”',
    notes: [
      { cond: 'flag:wolf_betrayal', text: '铁若男把手按在山路图上偏出的一截：“狼本该追着烽火走。有人动了路。等你说完，我还要去找走丢的人。”' },
      { cond: 'flag:jia_named_witness', text: '铁案桌后留出了一处空位。商队伙计就坐在那里，手压着自己写下的证词。' }
    ],
    choices: [
      { text: '以失踪案证词或救援记录结案（恶名 -15）', cond: '!mo:30&(flag:jia_witness|flag:wolf_rescue)', effects: ['mo:-15', 'flag:tie_cleared', 'yuanshi:+24', 'relation:tiexueleng:10:15:核验旧证后准予通行'] },
      { text: '领取协查文书，以后出入须登记', cond: '!mo:30', effects: ['flag:tie_cleared'] },
      { text: '交三十块元石赔偿，接受保结（恶名 -20）', cond: 'mo:30&stones:30', effects: ['yuanshi:-30', 'mo:-20', 'flag:tie_bond'] },
      { text: '趁夜冲出封锁，迎战铁家追兵', cond: 'mo:30', effects: ['relation:tiexueleng:-20:-30:违令闯过封锁', 'battle:tie_patrol', 'onwin:tie_fugitive'] },
      { text: '请铁若男出示复核卷宗（恶名 -15，获准通行）', cond: '!mo:30&flag:jia_iron_review&trust:tieruonan:30&trust:tiexueleng:20', effects: ['mo:-15', 'flag:tie_cleared', 'relation:tiexueleng:10:10:正式采信复核卷宗'] },
      { text: '在铁家见证下偿还货款（四十块元石，恶名 -15）', cond: '!favor:jiafu:-39&flag:jia_missing_stones&stones:40', effects: ['yuanshi:-40', 'mo:-15', 'unflag:jia_missing_stones', 'unflag:jia_trade_refused', 'flag:tie_bond', 'relation:jiafu:15:10:在铁家听证时还款'] },
      { text: '请在册的证人和伤者当面核对记录，获准通行', cond: '!mo:30&(flag:survivor_record|flag:jia_named_witness|flag:estate_public)', effects: ['flag:tie_cleared', 'relation:tieruonan:10:15:核查了可追溯的证词'] },
      { text: '把改引狼道的经过写进案卷，带铁家找失散的人', cond: 'flag:wolf_betrayal&flag:survivor_record', effects: ['mo:-12', 'flag:tie_bond', 'flag:wolf_betrayal_admitted', 'relation:tiexueleng:-5:10:承认改引狼道并交出路线'] },
      { text: '用赤城签过的互保文书答复盘查（接受保结）', cond: 'flag:chi_joint_bond&!flag:wolf_betrayal&!flag:jia_trade_refused', effects: ['flag:tie_bond', 'relation:chicheng:5:10:在听证时共同担责'] },
      { text: '把方源交卷当晚的见闻作为旁证，请铁家核对两份值夜记录', cond: '!mo:30&flag:fangyuan_written_note&clue:caravan:trail', effects: ['flag:tie_cleared', 'relation:tieruonan:5:12:拿旧夜行记录核实了值守程序'] }
    ]
  },
  {
    id: 'three_clans',
    title: '三寨斗蛊大比',
    cond: 'after:2-9-10-0&flag:event_done:tie_inquiry',
    text: '狼潮过后，古月、白、熊三家要以斗蛊重划山路和猎场。白凝冰已经登台。寨门仍有铁家的人盘查，保结在身的人可请赤城作保递帖。\n\n演武执事摆出三只装界绳的木匣，起绳的一段都磨出了亮色。白凝冰抬了抬眼，望向你来时那边：“有人今天来划界，有人只想看自己能站到哪儿。”',
    notes: [
      { cond: 'flag:mobei_contender', text: '漠北把比试簿放到三家面前：“上头还有我的名次。要是不认他的，我这一行也划去。”' },
      { cond: 'flag:chi_joint_bond', text: '赤城把两枚盖过印的领条摆开，又将自己的名字签得大了一点，让三个执事都看得清。' },
      { cond: 'flag:bai_joint_read', text: '白凝冰在场上换了同你谈过的起手。远处的人只当是一阵风把他衣摆吹斜了。' }
    ],
    choices: [
      { text: '登台挑战白凝冰（胜得赤铁舍利蛊）', cond: 'flag:tie_cleared|(flag:tie_bond&flag:chi_faction&trust:chicheng:25)', effects: ['relation:bainingbing:5:5:在三寨大比应战', 'battle:bainingbing', 'onwin:tournament_won', 'wingu:chitie_sheli'] },
      { text: '依上次交手所见先护住要害（护盾 28，胜得赤铁舍利蛊）', cond: 'flag:bai_read&trust:bainingbing:20&(flag:tie_cleared|(flag:tie_bond&flag:chi_faction&trust:chicheng:25))', effects: ['relation:bainingbing:8:5:在大比认出了上次的起手', 'battle:bainingbing', 'shield:28', 'onwin:tournament_won', 'wingu:chitie_sheli'] },
      { text: '在场外观战，记下撤往山外的路', effects: ['relation:bainingbing:0:2:在场外看完了他最后一场比试'] },
      { text: '按与白凝冰交换的起手提前备战（护盾 28）', cond: 'flag:bai_joint_read&(flag:tie_cleared|(flag:tie_bond&flag:chi_joint_bond))', effects: ['relation:bainingbing:8:8:用交换的起手再试高低', 'battle:bainingbing', 'shield:28', 'onwin:tournament_won', 'wingu:chitie_sheli'] },
      { text: '请漠北把公开比试约一并呈上，依名册登台', cond: 'flag:mobei_contender&!rank:1', effects: ['relation:mobei:5:8:一同兑现公开比试约', 'relation:bainingbing:5:0:登台应战', 'battle:bainingbing', 'onwin:tournament_won', 'wingu:chitie_sheli'] },
      { text: '出示公买凭据，以任务堂见证人身份入场', cond: 'flag:chi_separate&flag:chi_public_bid&!mo:30', effects: ['relation:chicheng:2:5:用公买凭据为队伍作证', 'relation:bainingbing:5:0:登台应战', 'battle:bainingbing', 'onwin:tournament_won', 'wingu:chitie_sheli'] }
    ]
  },
  {
    id: 'blood_skull',
    title: '血池边的取舍',
    cond: 'after:2-10-1-0&flag:event_done:three_clans',
    text: '地下血池翻涌，古月一代现身。血颅蛊能以血亲之血提升资质。乱局中有人想夺取这份力量，也有人打算趁通道尚在，叫醒身边还活着的族人。\n\n与你擦肩的那人还背着药堂用的木架，架上的绑带空着。地底传来第二声震动，有人沿阶回头数名字，数到一半，忽然不知道该往哪一边喊。',
    choices: [
      { text: '夺血颅蛊，以血亲献祭（元海最多 +2 成，恶名 +55）', cond: 'flag:wolf_betrayal|flag:tie_fugitive', effects: ['hai:+2', 'mo:+55'] },
      { text: '疏散族人，备好干粮继续突围', effects: ['item:shourou:6'] }
    ]
  },
  {
    id: 'qingmao_endgame',
    title: '血海降世 · 天鹤来袭',
    cond: 'after:2-10-1-0&!flag:qingmao_finished&flag:event_done:blood_skull',
    text: '十万大山骤然血光冲天！古月一族先祖「古月一代」从血池杀出，中洲仙鹤门的天鹤上人驾鹤截住了他。\n山崩地裂，整座青茅山已成死地，这是你走出青茅山的最后时机。\n\n寨门楼已经低了一截。鼓绳拖到地上，有人把它当成指路的绳，一寸一寸摸过去。你看见山腰上还有数点灯火，各朝不同的坡道移动。',
    notes: [
      { cond: 'flag:bai_escape_route', text: '低处有一簇白家人的灯突然转向，照亮此前画在石壁上的折线。你认得白凝冰说的位置。' },
      { cond: 'flag:grotto_shelter', text: '一道水帘还没断。此时从下风坡过去，暗涧的石顶能挡住乱石一阵。' }
    ],
    choices: [
      { text: '截击古月一代残躯（胜后可离开青茅山）', effects: ['battle:guyue_yidai', 'onwin:qingmao_finished', 'goal:击败古月一代残躯后，从寨门离开青茅山'] },
      { text: '直面天鹤上人（胜后可离开青茅山）', effects: ['battle:tianhe', 'onwin:qingmao_finished', 'goal:击退天鹤上人后，从寨门离开青茅山'] },
      { text: '趁双方两败俱伤，潜行绕道直接翻山离去（稳妥脱身）', effects: ['flag:qingmao_finished', 'yuanshi:+40', 'goal:你已避开血海绝境，可于「寨门」或行纪中宣告走出青茅山'] },
      { text: '从事先留下的隐蔽路线避过混战，再带人出山', cond: 'flag:grotto_shelter|flag:survivor_pass|flag:bai_escape_route|flag:hunter_people_rescued|flag:survivor_lamp_guided|flag:workshop_escape_route|flag:survivor_recuperation|(flag:grotto_lit&flag:grotto_map)', effects: ['flag:qingmao_finished', 'flag:escape_with_survivors', 'goal:带避难者从青茅寨门离开'] },
      { text: '依白凝冰指过的落脚点截住古月一代残躯（护盾 24）', cond: 'flag:bai_last_challenge', effects: ['battle:guyue_yidai', 'shield:24', 'onwin:qingmao_finished', 'goal:取胜后从青茅寨门离开'] }
    ]
  },
  {
    id: 'jia_witness_visit',
    title: '问访商队伙计',
    manual: true,
    quest: 'caravan',
    cond: 'at:kezhan&(quest:caravan:investigate|quest:caravan:verify)',
    text: '伙计在客栈里等车队的消息。那日他忙着缚货，听见贾金生问去山涧的方向。他记得人是什么时辰走的，却没看见人回来。',
    choices: [
      { text: '记下时辰，请他核对口供', effects: ['clue:caravan:witness'] }
    ]
  },
  {
    id: 'jia_road_visit',
    title: '调阅驿道登记',
    manual: true,
    quest: 'caravan',
    cond: 'at:renwutang&(quest:caravan:investigate|quest:caravan:verify)',
    text: '执事调来寨门值夜簿。货车回寨时比平日少了一人，守门人把过门的时辰记在旁边。',
    choices: [
      { text: '抄录过门时辰与人数', effects: ['clue:caravan:trail'] }
    ]
  },
  {
    id: 'jia_private_ledger',
    title: '贾富的私账',
    manual: true,
    quest: 'caravan',
    cond: 'at:gupu&quest:caravan:verify&trust:jiafu:25',
    text: '贾富关上蛊铺侧门，把自己的货单递了过来。上面的时辰与车队登记不同。伙计怕耽误开市，先报了到，晚些才补写缺员。贾富想保住这个证人，托你先别把私账传出去。',
    choices: [
      { text: '记下私账与公簿的差异', effects: ['clue:caravan:ledger', 'relation:jiafu:5:5:获准查阅私账'] }
    ]
  },
  {
    id: 'jia_submit_case',
    title: '给失踪案留一份卷宗',
    manual: true,
    quest: 'caravan',
    cond: 'at:renwutang&quest:caravan:verify',
    text: '任务堂有贾家留下的收件人，也肯代送给铁家。卷宗能查明贾金生离开车队的时辰，至于离队后去了哪里，仍需追查。',
    choices: [
      { text: '把两份互证材料封送铁若男', cond: '(clue:caravan:witness&(clue:caravan:tracks|clue:caravan:trail))|(clue:caravan:tracks&clue:caravan:trail)', effects: ['quest:caravan:completed:iron', 'relation:tieruonan:10:15:收到失踪案卷宗'] },
      { text: '将私账交回贾富，请他自行追查', cond: 'clue:caravan:ledger&trust:jiafu:25', effects: ['quest:caravan:completed:jia', 'relation:jiafu:15:15:受托保护商队证人'] },
      { text: '放弃追查，撤回自己的卷宗', cond: '!flag:jia_missing_stones', effects: ['quest:caravan:failed:refused'] },
      { text: '留下货款，撤回自己的卷宗', cond: 'flag:jia_missing_stones', effects: ['quest:caravan:failed:theft', 'flag:jia_trade_refused', 'relation:jiafu:-20:-20:贾家决定追偿'] }
    ]
  },
  {
    id: 'jia_case_followup',
    title: '失踪案回音',
    quest: 'caravan',
    cond: 'due:caravan',
    text: '任务堂转来一封信。先前交出去的材料已有回音，先前欠下的账也有人追问。',
    choices: [
      { text: '收下铁若男的复核回函', cond: 'outcome:caravan:iron', effects: ['flag:jia_iron_review', 'relation:tieruonan:10:20:证据互证，已复核', 'relation:tiexueleng:5:25:已阅铁若男的复核卷宗'] },
      { text: '收下贾富留给你的护送酬谢（二十四块元石）', cond: 'outcome:caravan:jia', effects: ['yuanshi:+24', 'flag:jia_wagon_aid', 'relation:jiafu:10:10:贾家回信致谢'] },
      { text: '得知贾家已把欠款名单交给铁家', cond: 'outcome:caravan:theft&flag:jia_missing_stones', effects: ['mo:+8', 'relation:tieruonan:-10:-15:收到贾家的追偿记录', 'relation:tiexueleng:-5:-10:收录货款争议'] },
      { text: '收下卷宗存档回条', cond: 'outcome:caravan:refused|outcome:caravan:expired|(outcome:caravan:theft&!flag:jia_missing_stones)', effects: [] }
    ]
  },
  ...QINGMAO_SCENES
];
