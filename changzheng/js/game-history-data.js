/* ========================================
   长征·星火 — 史实数据层
   所有史实文本必须来自知识库（Cz-xh/data/knowledge/*.json）
   或 parallel_endings.json，禁止前端手写史实句子。
   每条史实标注 source（出处）和 refId（知识库条目ID）。
   无知识库对应的节点，history 字段为空（前端不渲染史实区域）。
   ======================================== */

// ===== 节点史实数据（按 nodeId 索引） =====
// 只有知识库中有对应条目的节点才填充 historyText
// 没有对应条目的节点，historyText 为空字符串，前端不显示史实区域
const NODE_HISTORY_DATA = {
  // 节点1 瑞金·出发 — 知识库无对应条目
  1: {
    historyText: '',
    historySource: '',
    historyRefId: ''
  },

  // 节点2 血战湘江 — 知识库无对应条目
  2: {
    historyText: '',
    historySource: '',
    historyRefId: ''
  },

  // 节点3 遵义会议 — 对应 zunyi_meeting.json 多条条目
  3: {
    historyText: '遵义会议于1935年1月15日至17日在贵州遵义召开。会议的主要内容是总结第五次反"围剿"以来的经验教训。遵义会议决议：毛泽东同志选为常委。这是党历史上生死攸关的转折点。遵义会议指出，博古同志在军事指挥上犯了严重错误，李德在军事指挥上也犯了严重错误。遵义会议决议：仍由最高军事首长朱德、周恩来为军事指挥者，而毛泽东同志为恩来同志军事指挥上的帮助者。遵义会议后，2月5日，由张闻天代替博古负总责。博古仍然保留政治局常委职务。遵义会议确立了毛泽东在党和红军中的领导地位，是中国共产党独立自主地解决中国革命问题的开始。',
    historySource: '《中国共产党简史》',
    historyRefId: 'zunyi_001, zunyi_002, zunyi_003, zunyi_004, zunyi_005, zunyi_007'
  },

  // 节点4 四渡赤水 — 对应 parallel_timeline.json parallel_006
  4: {
    historyText: '遵义会议后红军四渡赤水，巧妙穿插于国民党重兵之间，这是毛泽东军事指挥艺术的经典战例。',
    historySource: '《中国共产党简史》',
    historyRefId: 'parallel_006'
  },

  // 节点5 巧渡金沙江 — 知识库无对应条目
  5: {
    historyText: '',
    historySource: '',
    historyRefId: ''
  },

  // 节点6 强渡大渡河 — 对应 luding_bridge.json luding_006（大渡河背景）
  6: {
    historyText: '大渡河水流湍急，河宽约100米，无法徒涉。泸定桥是当时大渡河上唯一的桥梁，夺取泸定桥关系到红军能否渡河北上。',
    historySource: '《中国共产党简史》',
    historyRefId: 'luding_006'
  },

  // 节点7 飞夺泸定桥 — 对应 luding_bridge.json 多条条目
  7: {
    historyText: '泸定桥位于四川省泸定县，横跨大渡河，是一座铁索桥。桥长100米，宽2.8米，由13根铁索组成。红四团在接到夺桥命令后，一昼夜急行军240里，于5月29日晨到达泸定桥西岸。1935年5月29日，红四团二十二名勇士冒着枪林弹雨攀爬铁索，夺取桥头。泸定桥战斗中，二十二名突击队员分为三组，第一组攀铁索前进，第二组跟进铺木板，第三组火力掩护。红四团团长王开湘、政委杨成武指挥了泸定桥战斗。突击队由二连连长廖大珠率领。毛泽东评价飞夺泸定桥："这是一个战略性举动"，打开了红军北上的通路。红军夺取泸定桥后，主力部队顺利渡过大渡河，摆脱了国民党军队的围追堵截，为北上创造了条件。',
    historySource: '《中国共产党简史》',
    historyRefId: 'luding_001, luding_002, luding_003, luding_004, luding_005, luding_007, luding_008'
  },

  // 节点8 翻越雪山 — 知识库无对应条目
  8: {
    historyText: '',
    historySource: '',
    historyRefId: ''
  },

  // 节点9 穿越草地 — 知识库无对应条目
  9: {
    historyText: '',
    historySource: '',
    historyRefId: ''
  },

  // 节点10 腊子口战役 — 知识库无对应条目
  10: {
    historyText: '',
    historySource: '',
    historyRefId: ''
  },

  // 节点12 会宁会师 — 知识库无对应条目
  12: {
    historyText: '',
    historySource: '',
    historyRefId: ''
  },

  // 节点11 吴起镇·落脚 — 对应 zunyi_meeting.json zunyi_012（诗词）
  11: {
    historyText: '毛泽东《七律·长征》：红军不怕远征难，万水千山只等闲。五岭逶迤腾细浪，乌蒙磅礴走泥丸。金沙水拍云崖暖，大渡桥横铁索寒。更喜岷山千里雪，三军过后尽开颜。',
    historySource: '本人著作原文',
    historyRefId: 'zunyi_012'
  }
};

// ===== 节点精神数据（spirit 为文学性表达，不含史实判断句） =====
// spirit 字段是游戏文学文案，不是史实叙述，不需要知识库出处
// 但必须确保不包含具体数字、日期、事件叙述等史实内容
const NODE_SPIRIT_DATA = {
  1: { spiritText: '信念坚定，矢志不渝。长征的起点，是理想的起点。', spiritKeyword: '信念' },
  2: { spiritText: '不怕牺牲，前赴后继。湘江畔的鲜血铸就了红军不屈的脊梁。', spiritKeyword: '牺牲' },
  3: { spiritText: '实事求是，独立自主。遵义会议挽救了党、挽救了红军、挽救了中国革命——真理的力量，在绝境中闪耀。', spiritKeyword: '转折' },
  4: { spiritText: '灵活机动，出奇制胜。用智慧代替蛮力，用机动打破围困。', spiritKeyword: '智慧' },
  5: { spiritText: '胆略过人，从容不迫。在追兵将至的绝境中，红军用智慧完成了不可能的渡江。', spiritKeyword: '胆略' },
  6: { spiritText: '英勇无畏，舍生忘死。他们用血肉之躯，为红军打开了生命通道。', spiritKeyword: '英勇' },
  7: { spiritText: '勇往直前，百折不挠。当桥板被拆除，他们用身体铺路，用意志架桥。', spiritKeyword: '无畏' },
  8: { spiritText: '坚韧不拔，百折不回。红军用双脚丈量了人类意志的极限。', spiritKeyword: '坚韧' },
  9: { spiritText: '艰苦卓绝，自强不息。红军在绝境中走出了一条生路。', spiritKeyword: '卓绝' },
  10: { spiritText: '智勇双全，攻坚克难。绝境之中，总有破局之路。', spiritKeyword: '攻坚' },
  12: { spiritText: '团结一致，众志成城。团结，是长征留给中国革命最宝贵的遗产。', spiritKeyword: '团结' },
  11: { spiritText: '星火燎原，生生不息。长征不是结束，而是开始。', spiritKeyword: '星火' }
};

// ===== 人物描述数据（desc 必须有知识库出处） =====
// 只有在知识库中有对应条目的人物才保留 desc
// 无知识库对应的 desc 设为空字符串（前端不渲染描述区域）
const CHARACTER_DESC_DATA = {
  '毛泽东': {
    desc: '遵义会议决议：毛泽东同志选为常委。遵义会议确立了毛泽东在党和红军中的领导地位。',
    source: '《中国共产党简史》',
    refId: 'zunyi_002, zunyi_007'
  },
  '周恩来': {
    desc: '遵义会议决议：仍由最高军事首长朱德、周恩来为军事指挥者。遵义会议博古作正报告，周恩来作副报告。',
    source: '《中国共产党简史》',
    refId: 'zunyi_004, zunyi_009'
  },
  '朱德': {
    desc: '遵义会议决议：仍由最高军事首长朱德、周恩来为军事指挥者。',
    source: '《中国共产党简史》',
    refId: 'zunyi_004'
  },
  '张闻天': {
    desc: '遵义会议后，2月5日，由张闻天代替博古负总责。博古仍然保留政治局常委职务。',
    source: '《中国共产党简史》',
    refId: 'zunyi_005'
  },
  '博古': {
    desc: '遵义会议指出，博古同志在军事指挥上犯了严重错误。遵义会议博古作正报告，在报告中过分强调客观困难，未完全承认错误。',
    source: '《中国共产党简史》',
    refId: 'zunyi_003, zunyi_009'
  },
  '彭德怀': {
    desc: '',
    source: '',
    refId: ''
  },
  '林彪': {
    desc: '',
    source: '',
    refId: ''
  },
  '刘伯承': {
    desc: '',
    source: '',
    refId: ''
  },
  '聂荣臻': {
    desc: '',
    source: '',
    refId: ''
  },
  '杨成武': {
    desc: '红四团团长王开湘、政委杨成武指挥了泸定桥战斗。',
    source: '《中国共产党简史》',
    refId: 'luding_007'
  },
  '王开湘': {
    desc: '红四团团长王开湘、政委杨成武指挥了泸定桥战斗。突击队由二连连长廖大珠率领。',
    source: '《中国共产党简史》',
    refId: 'luding_007'
  },
  '伍修权': {
    desc: '遵义会议出席者包括政治局常委和委员。李德作为共产国际军事顾问列席。伍修权担任翻译。',
    source: '《中国共产党简史》',
    refId: 'zunyi_008'
  },
  '陈云': {
    desc: '遵义会议出席者包括政治局常委和委员：博古、周恩来、张闻天、毛泽东、朱德、陈云等。',
    source: '《中国共产党简史》',
    refId: 'zunyi_008'
  },
  '叶剑英': {
    desc: '',
    source: '',
    refId: ''
  }
};

// ===== 查询函数 =====
function getNodeHistory(nodeId) {
  const data = NODE_HISTORY_DATA[nodeId];
  if (!data || !data.historyText) return null;
  return {
    text: data.historyText,
    source: data.historySource,
    refId: data.historyRefId
  };
}

function getNodeSpirit(nodeId) {
  const data = NODE_SPIRIT_DATA[nodeId];
  if (!data) return null;
  return {
    text: data.spiritText,
    keyword: data.spiritKeyword
  };
}

function getCharacterDesc(name) {
  const data = CHARACTER_DESC_DATA[name];
  if (!data || !data.desc) return null;
  return {
    desc: data.desc,
    source: data.source,
    refId: data.refId
  };
}