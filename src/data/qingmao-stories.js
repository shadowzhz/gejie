// 青茅山支线与人物对话为游戏原创。沿用已有地点、人物身份与蛊虫。
export const QINGMAO_QUESTS = {
  estate: {
    name: '古宅旧账',
    steps: {
      trace: { name: '追索副账', hint: '到任务堂询问夹在过继文书里的收据。' },
      hearing: { name: '决定副账去向', hint: '到山寨客栈见旧管事。' }
    },
    clues: { receipt: { name: '药圃旧收据', detail: '药圃收成一直入公账，末年的支领却写在另一册上。' } },
    outcomes: { public: '副账归公，两家在执事面前重做交割。', private: '以封存副账换回份额，并替旧管事保住生计。' }
  },
  grotto: {
    name: '水帘后的第二道痕',
    steps: {
      marks: { name: '勘察水痕', hint: '从血蝠洞进入暗涧遗洞，查看洞壁。' },
      vault: { name: '决定怎么处置遗洞', hint: '在暗涧遗洞查看水道尽头。线索也能靠徒手厘清。' }
    },
    clues: { waterline: { name: '两道水痕', detail: '外侧水道会进水，石壁上却刻出了留给后来人脱身的回路。' } },
    outcomes: { closed: '封住通向内层的水道，遗洞仍可留作藏身。', marked: '把安全回路留给后来人，猎户也知道了如何绕路。' }
  },
  hunter: {
    name: '猎户的空套索',
    steps: {
      spoor: { name: '辨明山兽行踪', hint: '去月下竹林寻找失效的套索。若山路未开，先去演武场练手。' },
      report: { name: '决定如何预警', hint: '去任务堂见猎户。若赶在次年六月前交图，巡山队和猎户能在狼潮来时接应。' }
    },
    clues: { spoor: { name: '朝寨移动的狼迹', detail: '野猪早已离开，狼群的足迹却一拨比一拨靠近寨门。' } },
    outcomes: { patrol: '公开狼迹，巡山队接过预警。', hidden: '护住猎户的私路，让他们自行撤人。' }
  },
  survivors: {
    name: '狼潮幸存者',
    steps: {
      names: { name: '核对幸存者名册', hint: '狼潮后到药堂盘点席位与伤者。' },
      supplies: { name: '安排物资和通路', hint: '到任务堂与族中执事谈判。铁家还没来时，可以先保存听证要用的材料。' }
    },
    clues: { roster: { name: '名册上的空名', detail: '有些药材用在了名册之外的伤者身上，签名来自东门值夜的人。' } },
    outcomes: { record: '公布真实名册，留作东门责任听证的证据。', shelter: '暂封姓名，给伤者留一条避开盘查的出寨路。' }
  },
  furnace: {
    name: '熄炉之前',
    steps: {
      inspect: { name: '查验失火的炼炉', hint: '到蛊铺查看焦黑的炉箍。炼成过蛊虫的玩家能亲自试炉。' },
      terms: { name: '决定如何追责', hint: '替小工到任务堂讲清事故，或让商人出钱私下修缮。' }
    },
    clues: { hoop: { name: '有旧裂的炉箍', detail: '裂口里已积满灰，失火前就有裂缝。' } },
    outcomes: { open: '公开事故，让新手能查到缺陷并试炉。', private: '商人私下修炉，替小工负担药费。' }
  }
};

export const QINGMAO_SCENES = [
  {
    id: 'mobei_roster', person: 'mobei', manual: true, title: '名次先给谁看',
    cond: 'at:yanwu&flag:event_done:classmates',
    text: '漠北蹲在沙地边，把尺一寸寸压进同窗留下的脚印里。管事来问名册，他用袖子把最浅的两行盖住。\n“人是我叫来的，练得不好我担着。你肯不肯留到收场？要争第一，我也等你开口。”',
    choices: [
      { text: '留下来陪人练，把名次留到最后', effects: ['flag:mobei_partner', 'relation:mobei:15:18:一起带完学堂的散队'] },
      { text: '当众约一个公开的比试名次', effects: ['flag:mobei_rival', 'relation:mobei:-5:8:立下公开比试之约'] }
    ]
  },
  {
    id: 'mobei_watch', person: 'mobei', manual: true, title: '后队的木牌',
    cond: 'at:yanwu&flag:event_done:mobei_roster&flag:event_done:nianmo_exam',
    text: '大考过后，管事把末等学徒划到后队，牌上没有替补。漠北翻到最后一页，发现自己的名字被提前写进了头队。\n“这是给漠脉看的名册。若真遇险，后面的人只能看见我的背。”',
    choices: [
      { text: '愿与他轮流替后队守夜', cond: 'flag:mobei_partner', effects: ['flag:mobei_shared_watch', 'relation:mobei:10:18:同守后队'] },
      { text: '让他自证能守两头，我来做见证', effects: ['flag:mobei_public_test', 'relation:mobei:0:8:为公开校场作证'] }
    ]
  },
  {
    id: 'mobei_wall', person: 'mobei', manual: true, title: '东墙上的半面旗',
    cond: 'at:yanwu&flag:event_done:mobei_watch&flag:event_done:langchao_start',
    text: '旗面叫狼爪掏去半截。漠北把它铺在墙头，拿饭牌压住四角。\n“练的时候我总喊往前。底下那几个人撤下来前，我才知道还有一句该喊。”',
    choices: [
      { text: '请他派轮值旧队接走东门伤员', cond: 'flag:mobei_shared_watch&trust:mobei:35', effects: ['flag:mobei_relief', 'relation:mobei:12:10:答应出人接应东门'] },
      { text: '把比试留到三寨，照实记下后队的战功', effects: ['flag:mobei_contender', 'relation:mobei:3:5:承认彼此是对手'] }
    ]
  },
  {
    id: 'chi_delivery', person: 'chicheng', manual: true, title: '两手交割',
    cond: 'at:jucaifang&flag:event_done:classmates',
    text: '赤城把两份货单叠起来，缺了一角的那份放在上头。“挑一份签。签上面，伙计有工钱；签下面，管事记得是谁替他省了钱。两样我只保一样。”',
    choices: [
      { text: '签实收的货单，和赤城各留一份', effects: ['flag:chi_open_books', 'relation:chicheng:8:18:约定双方各留凭据'] },
      { text: '公开账上的差额，把欠工钱的人叫来', effects: ['relation:chicheng:-18:-22:货单被当众揭开'] }
    ]
  },
  {
    id: 'chi_quota', person: 'chicheng', manual: true, title: '赤脉预留的一箱药',
    cond: 'at:jucaifang&flag:event_done:chi_delivery&after:2-1-1-0',
    text: '箱盖上还留着旧货单的朱印。赤城蹲下去，把贴纸揭得平平整整。\n“开春会涨价。等你用得上时，谁来问我都说这一箱有主。”他把空白的领条递给你。货价之外，领条上还留了手印的位置。',
    choices: [
      { text: '签下领条，约定危时由救人一方先用', cond: 'flag:chi_open_books', effects: ['flag:chi_reserved', 'relation:chicheng:12:18:谈妥药箱的去向'] },
      { text: '请任务堂按市价公买，免去领条', effects: ['flag:chi_public_bid', 'relation:chicheng:-8:-8:药箱改走公买'] }
    ]
  },
  {
    id: 'chi_guarantee', person: 'chicheng', manual: true, title: '保人也要按手印',
    cond: 'at:jucaifang&flag:event_done:chi_quota&flag:event_done:wolf_breach',
    text: '赤城把盖过印的纸摆在算盘旁。窗外有人挨家问东门的事，他把窗推开，让声音进来。\n“写你名字容易。以后若有人问起这张纸，我也要站过去答。”',
    choices: [
      { text: '彼此担责，请他为听证后的出入作保', cond: 'flag:chi_reserved&trust:chicheng:30', effects: ['flag:chi_joint_bond', 'relation:chicheng:8:12:签了互保的文书'] },
      { text: '取回自己的领条，约定今后各自担责', effects: ['flag:chi_separate', 'relation:chicheng:-4:-10:按条款拆伙'] }
    ]
  },
  {
    id: 'bai_footprints', person: 'bainingbing', manual: true, title: '竹叶翻到霜面',
    cond: 'at:zhulin&flag:event_done:classmates',
    text: '湿竹叶翻到背面，寒意隔着鞋底渗上来。石上的少年收回手，没问你是哪一寨的，先问你走来时踩断了几根枝。\n“听不见也行，出手之前别急着报自己的名字。”',
    choices: [
      { text: '指出地上第三道脚印，有人比我们先离开', effects: ['flag:bai_observer', 'relation:bainingbing:10:12:拆穿了竹径上的虚步'] },
      { text: '请他改日当面过招', effects: ['flag:bai_challenge', 'relation:bainingbing:15:4:在竹径约战'] }
    ]
  },
  {
    id: 'bai_after_spar', person: 'bainingbing', manual: true, title: '第二刀留着',
    cond: 'at:zhulin&flag:event_done:bai_footprints&flag:event_done:bai_encounter',
    text: '白凝冰指间夹着两截细竹，一截已裂开，一截还完好。\n“那天你转身时，我还能再出一刀。若只为赢，那一刀也够了。我想看看你下一回会怎么走。”',
    choices: [
      { text: '交换起手破绽，各练自己最容易失手的一招', cond: 'flag:bai_read|flag:bai_observer|!rank:1', effects: ['flag:bai_joint_read', 'relation:bainingbing:12:20:交换了起手破绽'] },
      { text: '把这一刀留到大比，场上见分晓', effects: ['flag:bai_duel_terms', 'relation:bainingbing:8:6:约好大比上再较量'] }
    ]
  },
  {
    id: 'bai_broken_flag', person: 'bainingbing', manual: true, title: '旗落之后',
    cond: 'at:zhulin&flag:event_done:bai_after_spar&flag:event_done:three_clans',
    text: '会盟坡的旗落了，白凝冰用一块石头压住一角。山风把远处呼喊的人声吹散，他一直看着白家那条下山道。\n“旗能换，再立一面就是。山塌下来的时候，你要走哪条路？”',
    choices: [
      { text: '对照两寨走过的路，约好遇险时各带一队人', cond: 'flag:bai_joint_read&trust:bainingbing:30', effects: ['flag:bai_escape_route', 'relation:bainingbing:10:12:留下三寨互通的撤离路线'] },
      { text: '把路位置换成下次交手的落脚点', effects: ['flag:bai_last_challenge', 'relation:bainingbing:5:3:留待山外再见'] }
    ]
  },

  {
    id: 'fangyuan_night_road', person: 'fangyuan', manual: true, title: '方源没借第二盏灯',
    cond: 'at:kezhan&flag:fangyuan_night_steps',
    text: '方源把半盏灯搁回来，灯芯剪得比来时更短。你提起学堂头名，他看了看灯油。\n“有一盏就够了。你若想知道我走哪条路，可以看看门槛上哪边先干。”他说完起身，你看见桌脚旁有一道连向后门的水印。',
    choices: [
      { text: '跟水印查过去，请伙计认出石片的来处', effects: ['flag:clue:huajiu', 'flag:fangyuan_trail_seen'] },
      { text: '还灯给店家，将自己的观察记在纸上', effects: ['flag:fangyuan_written_note'] }
    ]
  },
  {
    id: 'estate_start', quest: 'estate', manual: true, title: '纸背透出一笔账',
    cond: 'at:renwutang&flag:event_done:uncle',
    text: '执事把旧过继文书照着灯举起来，另一面透出一笔药圃收成。那年账上写的是受涝无收，他的桌下却还垫着晒药用的旧竹席。',
    choices: [{ text: '请执事翻出附在文书后的收据', effects: ['quest:estate:trace'] }]
  },
  {
    id: 'estate_receipt', quest: 'estate', manual: true, title: '领款人用了两种笔',
    cond: 'at:renwutang&quest:estate:trace',
    text: '收据上的支笔细得像描画，落款却压破了纸。执事认得后面那支是旧管事的。\n“账我能给你看。他若肯说，你还得答应让他把话说完。”',
    choices: [{ text: '抄下收据，赴客栈见旧管事', effects: ['clue:estate:receipt', 'quest:estate:hearing'] }]
  },
  {
    id: 'estate_terms', quest: 'estate', manual: true, title: '旧管事吃完那碗面',
    cond: 'at:kezhan&quest:estate:hearing',
    text: '老人把面汤喝净，才将账交来。少掉的收成里有三成拿去养死役家属，其余叫人以管事的名义提走。\n“若明早要对簿，劳烦今晚先给那几户送个信。账是账，他们过日子还靠那几顿饭。”',
    choices: [
      { text: '一并提交账册和赈济名单，由执事复核', effects: ['quest:estate:completed:public', 'flag:estate_public', 'flag:inheritance_claim'] },
      { text: '和舅父议定返还份额，将赈济先留给旧管事发放', effects: ['quest:estate:completed:private', 'flag:estate_private'] }
    ]
  },
  {
    id: 'grotto_start', quest: 'grotto', manual: true, title: '酒香随水而来',
    cond: 'at:huajiu&flag:clue:huajiu',
    text: '洞口闻得到酒，往里三步倒淡了。你回到水帘旁再闻了一次，香味竟跟着半湿的脚印往外走。壁上有人顺着被水抹过的地方刻了两道细线。',
    choices: [{ text: '顺着两道水线记下高低位置', effects: ['quest:grotto:marks'] }]
  },
  {
    id: 'grotto_measure', quest: 'grotto', manual: true, title: '第二道线低了一寸',
    cond: 'at:huajiu&quest:grotto:marks',
    text: '两道水线之间夹着一枚竹楔。水涨到这儿，竹楔会浮起，洞外便有人能从背坡拉开绳扣。越往深处，酒香越像是为了替退路留下记号。',
    choices: [
      { text: '借月道蛊光照清楚回路并刻下拓记', cond: 'gu:yueguang|gu:yuexuan|gu:yuehen|gu:yueni|gu:yuemang', effects: ['clue:grotto:waterline', 'quest:grotto:vault', 'flag:grotto_lit'] },
      { text: '用一截干竹试水，沿石壁摸清回路', effects: ['clue:grotto:waterline', 'quest:grotto:vault'] }
    ]
  },
  {
    id: 'grotto_dispose', quest: 'grotto', manual: true, title: '水闸留给谁',
    cond: 'at:huajiu&quest:grotto:vault',
    text: '石闸后是旧人的遗藏，旁边留的一条狭道只能让人贴着水走。撬开挡石时，你在反面摸到了几道新指甲痕。还有旁人来过，也许下次会跟着你留下的记号走。',
    choices: [
      { text: '封住内层水道，在洞里备下一处藏身地', effects: ['quest:grotto:completed:closed', 'flag:grotto_shelter'] },
      { text: '留下退路标记，让熟悉山路的猎户也能通行', effects: ['quest:grotto:completed:marked', 'flag:grotto_map'] }
    ]
  },
  {
    id: 'hunter_start', quest: 'hunter', manual: true, title: '猎户来问一段山路',
    cond: 'at:kezhan&flag:kaike&!flag:hunter_started',
    text: '猎户把两只空套索搁到桌下，占去半张长凳。“猪撞断了绳，绳头得往林子里去。这两回，绳头都朝寨门。”他说完打翻了一点盐，没低头去收。',
    choices: [{ text: '答应去竹林查查套索为何朝寨门倒', effects: ['flag:hunter_started', 'quest:hunter:spoor'] }]
  },
  {
    id: 'hunter_spoor', quest: 'hunter', manual: true, title: '狼有退路，猪没有',
    cond: 'at:zhulin&quest:hunter:spoor',
    text: '你拨开擦白的竹节，土上叠着几层狼印。最后一层从前印横切过去，循着猎户往常收套的方向，直逼山寨。',
    choices: [
      { text: '画出狼迹和两条能够撤人的路', effects: ['clue:hunter:spoor', 'quest:hunter:report'] },
      { text: '把酒客说的狼声和足迹对照，标出兽群回头的山坳', cond: 'flag:hunter_rumor', effects: ['clue:hunter:spoor', 'quest:hunter:report', 'flag:hunter_spoor_read'] }
    ]
  },
  {
    id: 'hunter_report', quest: 'hunter', manual: true, title: '只呈一份山图',
    cond: 'at:renwutang&quest:hunter:report',
    text: '执事愿派巡山队出面，只要猎户把所有小路画出来。几条路通向族规禁猎的地界。猎户将嘴闭得很紧，手指却还按着足迹最靠近寨门的那一处。',
    choices: [
      { text: '公开路径，请巡山队接手防线', effects: ['quest:hunter:completed:patrol', 'flag:hunter_patrol', 'flag:wolf_supplies'] },
      { text: '把危险处交给执事，私路只留给猎户撤人', effects: ['quest:hunter:completed:hidden', 'flag:hunter_evac', 'flag:wolf_trail'] }
    ]
  },
  {
    id: 'survivor_start', quest: 'survivors', manual: true, title: '多出来的一双鞋',
    cond: 'at:yaotang&flag:event_done:langchao_start',
    text: '药堂门边的鞋子排到墙根。看席的人数了三遍，把一双沾着山泥的鞋藏到凳下。床上有三名山外伤者，领药的册上只剩两道空栏。',
    choices: [{ text: '留下帮忙，把每一席的去处核对清楚', effects: ['quest:survivors:names'] }]
  },
  {
    id: 'survivor_roster', quest: 'survivors', manual: true, title: '没有空栏的那个名字',
    cond: 'at:yaotang&quest:survivors:names',
    text: '药师把灯剪短半截。缺的那一笔用东门值夜人的名字领了药，对方认得伤者，也记得出事前有人改过撤人的路。点名查过去，两件事都要翻出来。',
    choices: [{ text: '抄一份名册，请执事到场商量', effects: ['clue:survivors:roster', 'quest:survivors:supplies'] }]
  },
  {
    id: 'survivor_terms', quest: 'survivors', manual: true, title: '留在名册里，还是走出门',
    cond: 'at:renwutang&quest:survivors:supplies',
    text: '执事的笔还没落，伤者托人来问：姓名入卷后，家里将来能领抚恤，可两寨一旦追查，又有谁肯出面护他们回家？\n门外有人牵来一头驮药的骡，缰绳递到你手里。',
    choices: [
      { text: '请伤者自己署名，交存一份实录', effects: ['quest:survivors:completed:record', 'flag:survivor_record'] },
      { text: '封存姓名，先用药队的文书送人下山', effects: ['quest:survivors:completed:shelter', 'flag:survivor_pass'] },
      { text: '自付两份止血膏，替愿作证的伤者留出休养时间', cond: 'item:zhixuegao:2', effects: ['take:zhixuegao:2', 'quest:survivors:completed:record', 'flag:survivor_record', 'flag:survivor_recuperation'] }
    ]
  },
  {
    id: 'furnace_start', quest: 'furnace', manual: true, title: '门边晾着一只焦手套',
    cond: 'at:gupu&!flag:furnace_started&(flag:event_done:wine_lead|flag:furnace_rumor)',
    text: '炉边小工用左手给客人找钱，右手的布换了一层又一层。商人说小工错了火候。小工先点了头，等商人走远，又把一片烧裂的炉箍悄悄压在柜台上。',
    choices: [{ text: '请小工带你看看那台炉', effects: ['flag:furnace_started', 'quest:furnace:inspect'] }]
  },
  {
    id: 'furnace_check', quest: 'furnace', manual: true, title: '火从旧裂口窜出',
    cond: 'at:gupu&quest:furnace:inspect',
    text: '炉箍焦在外圈，缝里却积着冷灰。小工给了你前几日的炉温记录。商人脚步停在后门，隔了一阵，才进去翻能补换的箍。',
    choices: [
      { text: '用成蛊的经验复现泄压，亲手写下证词', cond: 'flag:story_refined_gu', effects: ['clue:furnace:hoop', 'quest:furnace:terms', 'flag:furnace_expert'] },
      { text: '请隔壁炉师验过裂口，代录见证', effects: ['clue:furnace:hoop', 'quest:furnace:terms'] }
    ]
  },
  {
    id: 'furnace_terms', quest: 'furnace', manual: true, title: '把名字写在报修单上',
    cond: 'at:renwutang&quest:furnace:terms',
    text: '商人带来一副新炉箍和一张药费单。若上公示，待人核查之前他要停几日买卖。小工看了很久自己的名字，说这几日还能帮着看炉，往后的学徒也得知道从哪边泄压。',
    choices: [
      { text: '贴出事故记录，请小工一起讲给学徒听', effects: ['quest:furnace:completed:open', 'flag:furnace_public', 'flag:workshop_route'] },
      { text: '由商人赔医药并修炉，单据由小工自己收着', effects: ['quest:furnace:completed:private', 'flag:workshop_aid'] },
      { text: '当众示范避开裂口，领小工把后门留作安全通道', cond: 'flag:furnace_expert', effects: ['quest:furnace:completed:open', 'flag:furnace_public', 'flag:workshop_route', 'flag:workshop_escape_route'] }
    ]
  },
  {
    id: 'jia_safe_statement', quest: 'caravan', manual: true, title: '替证人留一扇门',
    cond: 'at:renwutang&flag:event_done:jia_case_followup&(outcome:caravan:iron|outcome:caravan:jia)',
    text: '失踪案卷宗已经送走，商队伙计却还在寨里。有人赌他讲得太多，有人赌他一句真话也没讲。伙计把房门纸糊了两遍，隔着纸问你，他要是走了，还能不能回来作证。',
    choices: [
      { text: '公开担保他的安全，请他留一份正式证词', effects: ['flag:jia_named_witness', 'relation:tieruonan:5:10:取得在册证人的补录'] },
      { text: '送他上商路，将新住址只交给贾富', effects: ['flag:jia_safe_passage', 'relation:jiafu:10:10:替证人守住了新住址'] }
    ]
  },
  {
    id: 'life_inn', manual: true, ambient: true, title: '倒扣的酒盅',
    cond: 'at:kezhan&night&flag:kaike',
    text: '酒客把酒盅倒扣，杯底有从山上带来的白石粉。“猎户今天空手。他只谈他走回来时听见几只狼在答声。”',
    choices: [
      { text: '请酒客把猎户引来，谈谈空套索', cond: '!flag:hunter_started', effects: ['flag:hunter_started', 'quest:hunter:spoor'] },
      { text: '记下狼的答声方向', effects: ['flag:hunter_rumor'] }
    ]
  },
  {
    id: 'life_carrier', manual: true, ambient: true, title: '一箱药认两家',
    cond: 'at:jucaifang&day&after:2-1-1-0&before:2-6-1-0&flag:chi_open_books',
    text: '送货人按赤城的口信把两张价签并在一起。他愿把药先送到东墙，条件是有人替他在雨天看一趟车。',
    choices: [
      { text: '用八块元石雇短工，药箱先运去东墙', cond: 'stones:8', effects: ['yuanshi:-8', 'flag:wolf_supplies', 'relation:chicheng:6:6:交割时践约'] },
      { text: '让他连箱退回，避免另欠人情', effects: [] }
    ]
  },
  {
    id: 'life_school', manual: true, ambient: true, title: '谁把名字写小了',
    cond: 'at:xuetang&day&flag:kaike&before:1-12-15-0',
    text: '两名同窗把抄错的练功簿举到窗边，一人说是漠家插手，一人说是赤家先来过。门边的方源看了一眼纸角，借走一块砚石便走了。',
    choices: [
      { text: '把原簿和副本留给家老共同核验', effects: ['relation:mobei:4:5:在学堂留存原簿', 'relation:chicheng:4:5:在学堂留存原簿'] },
      { text: '用原簿换赤城说出管事的名字', effects: ['relation:mobei:-8:-8:当着同窗交出名簿', 'relation:chicheng:8:5:透露抄簿管事'] }
    ]
  },
  {
    id: 'life_apprentice', manual: true, ambient: true, title: '炉坊的求助',
    cond: 'at:gupu&day&benming&!flag:furnace_started&!flag:event_done:wine_lead',
    text: '柜台后有人拣起一截烧坏的炉箍，认出你腰间有本命蛊的名牌。他把一张药费单折进袖子，低声问你愿不愿看一眼事故的地方。',
    choices: [
      { text: '去看炉伤，接下小工的请求', effects: ['flag:furnace_started', 'quest:furnace:inspect'] },
      { text: '告诉他可以另约人来验炉', effects: ['flag:furnace_rumor'] }
    ]
  },
  {
    id: 'life_whisper', manual: true, ambient: true, title: '夜柜后的交易',
    cond: 'at:kezhan&night&!rank:1&favor:jiafu:10&clue:caravan:ledger',
    text: '柜房吹熄了灯。旧押车人把值夜簿压在杯下，想换一句承诺：今后有人问起他的同乡，只提事由，别提人名。',
    choices: [
      { text: '把问询范围说清，留下可核对的值夜记录', effects: ['clue:caravan:trail', 'relation:jiafu:4:8:遵守证人的约定'] },
      { text: '拒绝担保，把值夜簿推回去', effects: [] }
    ]
  },
  {
    id: 'life_bamboo', manual: true, ambient: true, title: '血迹倒着走',
    cond: 'at:zhulin&day&flag:practiced',
    text: '竹节崩口凝着一点血，几步外蹄子却印得格外轻。那头受伤的兽爬过这儿之后，有东西拖着它倒走了一段。',
    choices: [
      { text: '在土坡画个三角记号，提醒过路人', effects: ['flag:hunter_rumor'] },
      { text: '借探知蛊找出拖痕朝向', cond: 'gu:nianxi', effects: ['flag:hunter_rumor', 'flag:hunter_spoor_read'] }
    ]
  },
  {
    id: 'life_east_lamp', manual: true, ambient: true, title: '三更的借灯人',
    cond: 'at:yaotang&night&flag:event_done:langchao_start',
    text: '有人在药堂外敲了两短一长。伤者不用药，要一盏没有寨记的灯，好让家里人认得他今晚要走哪道坡。',
    choices: [
      { text: '带他走药队用的山路', cond: 'flag:survivor_pass|flag:grotto_map', effects: ['flag:survivor_lamp_guided'] },
      { text: '留下一盏灯，请他等到队伍天明再出发', effects: ['flag:survivor_lamp'] }
    ]
  }
];
