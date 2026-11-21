// 人物身份参照原著青茅山篇。目标、态度及交往进度用于本作剧情。
export const STORY_CHARACTERS = {
  mobei: {
    name: '古月漠北', identity: '古月学堂同窗，漠脉子弟',
    voice: '好胜直率，开口常问敢不敢同去。', goal: '带同窗练出能守寨的队伍。',
    interest: '漠脉在学堂与守军中的声望。', initial: { favor: 0, trust: 0 },
    change: '到演武场与他谈名册。合作能让后队在狼潮时救人，公开竞争可换来大比的见证。'
  },
  chicheng: {
    name: '古月赤城', identity: '古月学堂同窗，赤脉子弟',
    voice: '做事圆转，说话先讲彼此能给什么。', goal: '替赤脉结交能独当一面的蛊师。',
    interest: '赤脉声望与保结担保的风险。', initial: { favor: 0, trust: 0 },
    change: '到聚财坊谈货单。履约可争取互保，选择公买也能凭单据争取三寨大比的资格。'
  },
  bainingbing: {
    name: '白凝冰', identity: '白家寨蛊师，曾在三寨会盟时当众邀战',
    voice: '语气冷淡，遇到值得交手的人会当面下战帖。', goal: '找到能逼自己全力出手的对手。',
    interest: '看重交手的价值，对寨间交情兴趣淡薄。', initial: { favor: -5, trust: 0 },
    change: '到月下竹林找他。交换招法能改变大比与撤离的选项，约战也可换来一处决战落脚点。'
  },
  jiafu: {
    name: '贾富', identity: '贾家行商，贾金生随他离家行商',
    voice: '重礼数，谈及失踪案时习惯把来龙去脉问清。', goal: '找出贾金生的去向，带一份交代回贾家。',
    interest: '护住同行伙计与贾家商誉。', initial: { favor: 0, trust: 0 },
    change: '交还失物或照料伙计会增加信任，足够可信才可看私账。私吞货款会留下追偿记录。'
  },
  tieruonan: {
    name: '铁若男', identity: '铁血冷之女，随父查访贾金生一案',
    voice: '追问细节，喜欢把几人的说辞放在一起核对。', goal: '寻到可以独立复查的证据。',
    interest: '保全证词与证人，避免案卷只剩传言。', initial: { favor: 0, trust: 0 },
    change: '交来两份能互证的线索，会得到她的复核与引见。'
  },
  tiexueleng: {
    name: '铁血冷', identity: '铁家捕神，受贾富之请查案',
    voice: '持重简洁，先问证据能证明什么。', goal: '查清失踪案，同时稳住寨中秩序。',
    interest: '铁家办案公信与各寨平民的安全。', initial: { favor: 0, trust: 0 },
    change: '复核通过后，他愿在入寨听证时接纳你的调查卷宗。'
  }
};
