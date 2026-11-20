export const ENEMIES = {
  caoren: {
    id: 'caoren', name: '演武草人', rank: 1, hp: 55, zy: 20, speed: 4,
    moves: [
      { name: '木臂横扫', kind: 'attack', power: 8, weight: 3 },
      { name: '草甲护身', kind: 'shield', power: 10, weight: 1 }
    ],
    reward: { yuanshi: 2 },
    practice: true
  },
  yezhu: {
    id: 'yezhu', name: '铁鬃野猪', rank: 1, hp: 78, zy: 24, speed: 6,
    moves: [
      { name: '獠牙顶撞', kind: 'attack', power: 13, weight: 3 },
      { name: '厚皮蓄势', kind: 'shield', power: 12, weight: 1 }
    ],
    reward: { yuanshi: 8, item: 'shourou' }
  },
  zhuwang: {
    id: 'zhuwang', name: '野猪王', rank: 1, hp: 115, zy: 35, speed: 8,
    moves: [
      { name: '蛮力冲撞', kind: 'attack', power: 18, weight: 3 },
      { name: '狂暴践踏', kind: 'attack', power: 24, cd: 2, weight: 2 },
      { name: '黑鬃护体', kind: 'shield', power: 18, weight: 1 }
    ],
    reward: { yuanshi: 20, item: 'shourou', gu: 'heishi' }
  },
  xuefu: {
    id: 'xuefu', name: '赤眼血蝠', rank: 1, hp: 90, zy: 30, speed: 10,
    moves: [
      { name: '吸血扑击', kind: 'drain', power: 15, weight: 3 },
      { name: '尖啸震神', kind: 'stun', power: 10, cd: 3, weight: 1 }
    ],
    reward: { yuanshi: 12, item: 'shourou' }
  },
  xuefu_king: {
    id: 'xuefu_king', name: '千蝠王', rank: 2, hp: 165, zy: 60, speed: 12,
    moves: [
      { name: '血翼撕裂', kind: 'attack', power: 25, weight: 3 },
      { name: '吸髓回生', kind: 'drain', power: 20, cd: 2, weight: 2 },
      { name: '血雾护身', kind: 'shield', power: 24, weight: 1 }
    ],
    reward: { yuanshi: 36, gu: 'xuefu_gu' }
  },
  dianlang: {
    id: 'dianlang', name: '青茅电狼', rank: 2, hp: 145, zy: 55, speed: 13,
    moves: [
      { name: '雷爪扑杀', kind: 'attack', power: 24, weight: 3 },
      { name: '电弧嘶吼', kind: 'stun', power: 16, cd: 3, weight: 1 }
    ],
    reward: { yuanshi: 22, item: 'shourou' }
  },
  langwang: {
    id: 'langwang', name: '豪电狼王', rank: 2, hp: 230, zy: 90, speed: 15,
    moves: [
      { name: '万雷狼牙', kind: 'attack', power: 34, weight: 3 },
      { name: '狂雷扑阵', kind: 'attack', power: 44, cd: 3, weight: 2 },
      { name: '雷铠护身', kind: 'shield', power: 32, weight: 1 }
    ],
    reward: { yuanshi: 65, gu: 'dianlang_gu' }
  },
  fangzheng: {
    id: 'fangzheng', name: '古月方正', rank: 2, hp: 170, zy: 80, speed: 11,
    moves: [
      { name: '月芒斩', kind: 'attack', power: 26, weight: 3 },
      { name: '白玉护体', kind: 'shield', power: 28, cd: 2, weight: 2 },
      { name: '生机回春', kind: 'heal', power: 24, cd: 3, weight: 1 }
    ],
    reward: { yuanshi: 30 },
    practice: true
  },
  modao: {
    id: 'modao', name: '山外魔道蛊师', rank: 2, hp: 185, zy: 85, speed: 12,
    moves: [
      { name: '毒刺暗袭', kind: 'attack', power: 28, weight: 3 },
      { name: '血遁借力', kind: 'drain', power: 22, cd: 2, weight: 2 },
      { name: '铁皮护身', kind: 'shield', power: 26, weight: 1 }
    ],
    reward: { yuanshi: 45 }
  },
  tiexueleng: {
    id: 'tiexueleng', name: '铁血冷捕手', rank: 3, hp: 270, zy: 120, speed: 15,
    moves: [
      { name: '铁索镇压', kind: 'stun', power: 28, cd: 3, weight: 2 },
      { name: '正道斩邪', kind: 'attack', power: 38, weight: 3 },
      { name: '玄铁护甲', kind: 'shield', power: 38, cd: 2, weight: 1 }
    ],
    reward: { yuanshi: 80 }
  },
  guyue_yidai: {
    id: 'guyue_yidai', name: '古月一代（血魔残躯）', rank: 3, hp: 340, zy: 160, speed: 16,
    moves: [
      { name: '血颅狂斩', kind: 'attack', power: 44, weight: 3 },
      { name: '血海吸元', kind: 'drain', power: 34, cd: 2, weight: 2 },
      { name: '血煞护身', kind: 'shield', power: 42, cd: 2, weight: 1 }
    ],
    reward: { yuanshi: 120 }
  },
  tianhe: {
    id: 'tianhe', name: '天鹤上人', rank: 3, hp: 380, zy: 180, speed: 18,
    moves: [
      { name: '飞鹤仙羽', kind: 'attack', power: 48, weight: 3 },
      { name: '鹤唳震魂', kind: 'stun', power: 30, cd: 3, weight: 1 },
      { name: '仙鹤云障', kind: 'shield', power: 46, cd: 2, weight: 2 }
    ],
    reward: { yuanshi: 150 }
  }
};
