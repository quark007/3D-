/* ========================================
   长征·星火 — 副本节点数据定义
   12个关键节点 · 按历史时间线排列
   ======================================== */

// 请在此处手动微调坐标（x/y 为百分比，0~100）
const GAME_NODES = [
  {
    id: 1,
    name: "中央苏区·出发",
    type: "start",
    typeLabel: "出发",
    x: 65,
    y: 77,
    date: "1934年10月",
    location: "瑞金等地出发，向于都集结",
    historyId: 1,
    challenges: [
      { icon: "drag", name: "携行与岗位协作", desc: "12格携行搭配，按所选岗位完成分工" },
      { icon: "choice", name: "自由决策推演", desc: "输入自己的行动计划和事件处置，AI 判断风险与可能后果" },
      { icon: "qte", name: "于都阶段协作", desc: "六段节奏配合与互助，不是疯狂连点" },
      { icon: "choice", name: "行记与史实对照", desc: "资源曲线、自由战友对话、AI复盘与历史档案" },{"icon":"bridge","name":"于都河浮桥 · 星夜架桥","desc":"工程教学 · 选择材料搭建、试载；第三段拆解回收。键1—4选材料，空格试载。（可选研学）"}
    ],
    rewards: ["出征令旗", "红军军旗", "初心徽章"],
    spiritId: 1,
    spiritKeyword: "信念"
  },
  {
    id: 2,
    name: "血战湘江",
    type: "battle",
    typeLabel: "战役",
    x: 58,
    y: 76,
    date: "1934年11月",
    location: "广西湘江",
    historyId: 2,
    challenges: [
      { icon: "qte", name: "突破封锁", desc: "QTE连击 · 突破敌军四道封锁线" },
      { icon: "choice", name: "生死抉择", desc: "在惨烈损失中做出战术决策" },
      { icon: "guard", name: "渡口阻击", desc: "兵棋推演 · 布防浮桥阵地，掩护纵队渡江（点击练习）" },
      { icon: "snipe", name: "敌后狙击", desc: "番外推演 · 1937 敌后狙击战，掩护乡亲转移（点击游玩）" },{"icon":"blanket","name":"半条被子 · 夜宿沙洲","desc":"军民情深 · 不拿屋中物件，完成帮助乡亲的事项；出发时选择留下半条被子。（可选研学）"},{"icon":"aid","name":"战地药箱 · 湘江接应","desc":"原创教学 · 方向键移动，E分配教学药包，F护送；护送回左侧接应点。（可选研学）"}
    ],
    rewards: ["湘江勋章", "铁血战旗", "突围令"],
    spiritId: 2,
    spiritKeyword: "牺牲"
  },
  {
    id: 3,
    name: "遵义会议",
    type: "meeting",
    typeLabel: "会议",
    x: 51,
    y: 70,
    date: "1935年1月15日-17日",
    location: "贵州遵义老城子尹路96号",
    historyId: 3,
    challenges: [
      { icon: "drag", name: "情报梳理", desc: "拖拽整理各方情报，还原战场态势" },
      { icon: "choice", name: "资料核对", desc: "理解会议议题与历史意义，不改变会议决定" },{"icon":"zunyi","name":"遵义会议 · 抉择二十分钟","desc":"史料研读 · 阅读卡片，选择并排序三组研学线索；数字键1—5落卡，退格撤回。不是对历史指挥作评分。（可选研学）"},
      { icon: "lamp", name: "苟坝夜灯", desc: "马灯密室 · 光照范围内查清三条军情，夜行挽回一场险仗（点击游玩）" },
      { icon: "poem", name: "娄山关诗卷", desc: "诗词复原 · 拼回课标名句，长卷尽展（点击游玩）" }
    ],
    rewards: ["遵义决议", "学习纪念卡", "转折勋章"],
    spiritId: 3,
    spiritKeyword: "转折"
  },
  {
    id: 4,
    name: "四渡赤水",
    type: "battle",
    typeLabel: "战役",
    x: 48,
    y: 71,
    date: "1935年1月-3月",
    location: "贵州赤水河",
    historyId: 4,
    challenges: [
      { icon: "qte", name: "声东击西", desc: "QTE节奏 · 模拟四次渡河的时机把握" },
      { icon: "choice", name: "战术调度", desc: "在敌军重围中选择渡河方向" },
      { icon: "bluff", name: "迷雾渡河", desc: "地图推演 · 布置主力与牵制分队路线，在追兵封口前东返南下" },{"icon":"cipher","name":"军委二局 · 密电破局","desc":"原创符号 · 按教学符号表填写三段短句；数字键落字，退格撤回，Enter核对。非真实密电。（可选研学）"},{"icon":"lantern","name":"苟坝马灯 · 夜路寻道","desc":"创作回望 · 方向键或WASD提灯前行，按E交互；留意光照、添油点与路标。（可选研学）"},{"icon":"nightlamp","name":"苟坝夜灯 · 马灯密室","desc":"密室推演 · 同一夜的两盏灯：这里在灯下线索中还原那夜的决断（点击体验）（可选研学）"}

    ],
    rewards: ["赤水战旗", "谋略勋章", "运动战手册"],
    spiritId: 4,
    spiritKeyword: "智慧"
  },
  {
    id: 5,
    name: "巧渡金沙江",
    type: "battle",
    typeLabel: "战役",
    x: 43,
    y: 75,
    date: "1935年5月",
    location: "云南金沙江",
    historyId: 5,
    challenges: [
      { icon: "scout", name: "夜探渡口", desc: "潜行推演 · 躲开哨兵视线摸清敌情（点击练习）" },
      { icon: "drag", name: "渡江调度", desc: "拖拽安排渡江顺序，限时完成全员渡江" },
      { icon: "choice", name: "船只分配", desc: "合理分配有限船只，确保全员安全渡江" },{"icon":"alliance","name":"彝海结盟 · 倾听与信任","desc":"创作对白 · 倾听、解释、核对并遵守约定。本场景是独立研学回望，不把结盟混同于金沙江节点。（可选研学）"}
    ],
    rewards: ["金沙江勋章", "渡江令旗", "从容徽章"],
    spiritId: 5,
    spiritKeyword: "胆略"
  },
  {
    id: 6,
    name: "强渡大渡河",
    type: "battle",
    typeLabel: "战役",
    x: 43,
    y: 67,
    date: "1935年5月25日",
    location: "四川安顺场",
    historyId: 6,
    challenges: [
      { icon: "mortar", name: "神炮手", desc: "迫击炮弹道 · 三发模拟炮弹掩护渡河（点击练习）" },
      { icon: "pontoon", name: "乌江浮桥", desc: "掩护架桥 · 轮换压制敌炮，护工兵打十根桥桩（点击游玩）" },
      { icon: "ferry", name: "大渡河强渡", desc: "十七勇士 · 操控渡船穿激流避炮火，一人不能少（点击游玩）" },
      { icon: "yihai", name: "彝海结盟", desc: "民族团结 · 按史料礼序完成歃血结盟仪式（点击体验）" },
      { icon: "qte", name: "勇士冲锋", desc: "QTE连击 · 十七勇士强渡大渡河" },
      { icon: "choice", name: "火力压制", desc: "指挥岸上火力掩护渡河勇士" }
    ],
    rewards: ["大渡河勋章", "勇士战旗", "十七勇士名录"],
    spiritId: 6,
    spiritKeyword: "英勇"
  },
  {
    id: 7,
    name: "飞夺泸定桥",
    type: "battle",
    typeLabel: "战役",
    x: 43,
    y: 62,
    date: "1935年5月29日",
    location: "四川泸定",
    historyId: 7,
    challenges: [
      { icon: "mortar", name: "炮火掩护", desc: "迫击炮弹道 · 修正风偏，掩护勇士攀索（点击练习）" },
      { icon: "qte", name: "铁索攀爬", desc: "QTE极限连击 · 22勇士攀铁索夺桥" },
      { icon: "drag", name: "铺设桥板", desc: "拖拽铺设桥板，限时完成夺桥" },
      { icon: "choice", name: "突击指挥", desc: "选择突击路线与火力配置" },{"icon":"chains","name":"飞夺泸定桥 · 铁索冲锋","desc":"动作练习 · A/D移动，S俯身，空格跳跃，B铺板；先观察扫射预告。（可选研学）"}
    ],
    rewards: ["泸定桥勋章", "铁索战旗", "飞夺徽章", "二十二勇士名录"],
    spiritId: 7,
    spiritKeyword: "无畏"
  },
  {
    id: 8,
    name: "翻越雪山",
    type: "nature",
    typeLabel: "险阻",
    x: 43,
    y: 58,
    date: "1935年6月",
    location: "四川夹金山",
    historyId: 8,
    challenges: [
      { icon: "choice", name: "雪山行军", desc: "在极端严寒中做出行军决策" },
      { icon: "qte", name: "攀登坚持", desc: "QTE持久战 · 在缺氧严寒中坚持攀登" },
      { icon: "snow", name: "雪山速降", desc: "横版速降 · 一步不能停，搀扶每一位掉队战友（点击游玩）" }
    ],
    rewards: ["雪山勋章", "坚韧战旗", "夹金山纪念"],
    spiritId: 8,
    spiritKeyword: "坚韧"
  },
  {
    id: 9,
    name: "穿越草地",
    type: "nature",
    typeLabel: "险阻",
    x: 45,
    y: 57,
    date: "1935年8月",
    location: "四川松潘草地",
    historyId: 9,
    challenges: [
      { icon: "drag", name: "探路行军", desc: "拖拽探路 · 在泥沼草地中寻找安全路线" },
      { icon: "choice", name: "生存抉择", desc: "在断粮绝境中做出生存决策" },
      { icon: "collect", name: "青稞采集", desc: "行军采集 · 草地觅八份青稞，绕开泥潭水潭（点击游玩）" },
      { icon: "fire", name: "夜营守火种", desc: "守夜反应 · 扑灭雨渍添柴守火，撑到天亮（点击游玩）" },
      { icon: "ration", name: "草地三十天", desc: "连队管理 · 三十天分粮守夜，带队伍走出草地（点击游玩）" },{"icon":"fish","name":"金色的鱼钩 · 老班长","desc":"经典课文 · 鱼影靠近浮标时拉杆，再把鱼汤与青稞分给同行小战士；按界面按钮操作。（可选研学）"},{"icon":"veg","name":"草地食堂 · 野菜辨识","desc":"资料教学 · 依据本关虚构资料标记作三类归档。图形不是植物鉴定图，不能用于现实采食。（可选研学）"},{"icon":"matches","name":"七根火柴 · 守护火种","desc":"经典课文 · 四段行程兼顾支援、遮蔽与保留火种；出发前读清每种安排的代价。（可选研学）"}
    ],
    rewards: ["草地勋章", "生存战旗", "松潘纪念"],
    spiritId: 9,
    spiritKeyword: "卓绝"
  },
  {
    id: 10,
    name: "腊子口战役",
    type: "battle",
    typeLabel: "战役",
    x: 48,
    y: 54,
    date: "1935年9月",
    location: "甘肃腊子口",
    historyId: 10,
    challenges: [
      { icon: "qte", name: "悬崖攀爬", desc: "QTE精准操作 · 攀登悬崖侧袭敌军" },
      { icon: "choice", name: "战术突破", desc: "正面佯攻与侧翼攀崖的战术配合" },
      { icon: "lob", name: "火力准备", desc: "抛物线投掷 · 压制桥头碉堡，掩护侧翼攀崖（点击游玩）" },
      { icon: "press", name: "哈达铺读报", desc: "文字情报 · 旧报圈关键词，一纸定去向（点击游玩）" }
    ],
    rewards: ["腊子口勋章", "突破战旗", "天险徽章"],
    spiritId: 10,
    spiritKeyword: "攻坚"
  },
  {
    id: 11,
    name: "吴起镇·落脚",
    type: "meeting",
    typeLabel: "落脚",
    x: 55,
    y: 48,
    date: "1935年10月19日",
    location: "陕北吴起镇",
    historyId: 11,
    challenges: [
      { icon: "choice", name: "扎根陕北", desc: "在陕北建立革命根据地的战略决策" },
      { icon: "final", name: "切尾巴之战", desc: "终局推演 · 全线战备汇于一战，顶住骑兵三波冲击（点击游玩）" }
    ],
    rewards: ["长征胜利勋章", "星火战旗", "燎原令牌", "新征程钥匙"],
    spiritId: 11,
    spiritKeyword: "星火"
  },
  {
    id: 12,
    name: "三大主力·会师",
    type: "end",
    typeLabel: "会师",
    x: 53,
    y: 56,
    date: "1936年10月",
    location: "甘肃会宁、宁夏将台堡",
    historyId: 12,
    challenges: [
      { icon: "drag", name: "三军汇聚", desc: "拖拽调度 · 了解会宁与将台堡两处会师" },
      { icon: "choice", name: "战略部署", desc: "整理会师时间、地点与部队资料" },
      { icon: "drum", name: "会师腰鼓", desc: "节奏庆典 · 四轨腰鼓欢庆会师（点击练习）" }
    ],
    rewards: ["会师勋章", "统一战旗", "胜利令牌"],
    spiritId: 12,
    spiritKeyword: "团结"
  }
];

/* 人物数据（desc 已迁移到 game-history-data.js 的 CHARACTER_DESC_DATA） */
const GAME_CHARACTERS = [
  { name: "毛泽东", role: "政治局常委", avatar: "毛" },
  { name: "周恩来", role: "军事指挥者", avatar: "周" },
  { name: "朱德", role: "最高军事首长", avatar: "朱" },
  { name: "张闻天", role: "负总责", avatar: "张" },
  { name: "博古", role: "常委·会议主持", avatar: "博" },
  { name: "彭德怀", role: "前线指挥", avatar: "彭" },
  { name: "林彪", role: "前线指挥", avatar: "林" },
  { name: "刘伯承", role: "总参谋长", avatar: "刘" },
  { name: "聂荣臻", role: "政委", avatar: "聂" },
  { name: "杨成武", role: "政委", avatar: "杨" },
  { name: "王开湘", role: "团长", avatar: "王" },
  { name: "伍修权", role: "翻译", avatar: "伍" },
  { name: "陈云", role: "常委", avatar: "陈" },
  { name: "叶剑英", role: "参谋长", avatar: "叶" }
];

/* 节点类型配置（暗色战地版） */
const NODE_TYPE_CONFIG = {
  start: { color: "#B08D2F", symbol: "★", size: 14 },
  battle: { color: "#A32020", symbol: "⚔", size: 10 },
  meeting: { color: "#3D6B8C", symbol: "📜", size: 10 },
  nature: { color: "#4A6B3A", symbol: "⛰", size: 10 },
  end: { color: "#B05C14", symbol: "⚑", size: 14 }
};
/* 平行时空预设结局数据（本地降级用，历史线内容只能来自此数据或后端返回） */
const PARALLEL_ENDINGS = {
  luding: {
    victory_low_casualty: {
      title: "飞夺泸定桥 — 惨胜",
      comparison: [
        { dimension: "战术选择", player_line: "你选择从铁索右侧匍匐前进", history_line: "二十二名勇士从铁索上攀爬前进", inferred: false },
        { dimension: "伤亡情况", player_line: "你的队伍3人负伤", history_line: "二十二名勇士奋勇夺桥，打开北上通道", inferred: false },
        { dimension: "战斗结果", player_line: "你夺取了桥头", history_line: "红军夺取了泸定桥", inferred: false }
      ],
      conclusion: "你的战术选择与史实高度一致。当年那二十二名勇士，也是这样冒着枪林弹雨爬过铁索的。桥，就是这么夺下来的。",
      emotion_tag: "hopeful",
      inferred: false,
      score: 90,
      rating: "优秀"
    },
    victory_high_casualty: {
      title: "飞夺泸定桥 — 惨胜（高伤亡）",
      comparison: [
        { dimension: "战术选择", player_line: "你选择了正面冲锋", history_line: "二十二名勇士选择了攀爬铁索", inferred: false },
        { dimension: "伤亡情况", player_line: "你的队伍5人牺牲", history_line: "二十二名勇士奋勇夺桥，打开北上通道", inferred: false },
        { dimension: "战斗结果", player_line: "你夺取了桥头但代价惨重", history_line: "红军以较小代价夺取了桥头", inferred: false }
      ],
      conclusion: "你夺下了桥，但代价远超史实。当年的勇士们选择了更聪明的路线——攀爬铁索而非正面冲锋，用最小的代价取得了胜利。战术选择决定了代价的大小。",
      emotion_tag: "tragic",
      inferred: false,
      score: 60,
      rating: "及格"
    },
    defeat_retreat: {
      title: "飞夺泸定桥 — 撤退",
      comparison: [
        { dimension: "战术选择", player_line: "你选择了撤退", history_line: "二十二名勇士选择了冲锋", inferred: false },
        { dimension: "伤亡情况", player_line: "你保住了全部人员，无伤亡", history_line: "二十二名勇士奋勇夺桥，打开北上通道", inferred: false },
        { dimension: "后果推演", player_line: "你失去了夺取桥梁的机会", history_line: "如果当年红军没有夺桥，大部队将无法渡过大渡河", inferred: true }
      ],
      conclusion: "你选择了保全人员，这在战术上可以理解。但历史告诉我们，正是那一次不顾一切的冲锋，打开了红军北上的通路。有时候，胜利需要付出代价。",
      emotion_tag: "tragic",
      inferred: true,
      score: 30,
      rating: "需反思"
    },
    defeat_annihilation: {
      title: "飞夺泸定桥 — 全军覆没",
      comparison: [
        { dimension: "战术选择", player_line: "你选择了无掩护正面冲锋", history_line: "二十二名勇士选择了攀爬铁索+火力掩护", inferred: false },
        { dimension: "伤亡情况", player_line: "你的队伍全军覆没", history_line: "二十二名勇士奋勇夺桥，打开北上通道", inferred: false },
        { dimension: "后果推演", player_line: "夺桥失败，大部队无法渡河", history_line: "红军成功夺桥，主力顺利渡河北上", inferred: true }
      ],
      conclusion: "没有掩护的正面冲锋是自杀式的。当年的勇士们不是蛮干——他们攀爬铁索的同时有火力掩护，每一步都有战术配合。勇气不是莽撞，勇气是明知危险依然选择最可能成功的路。",
      emotion_tag: "defeat",
      inferred: true,
      score: 10,
      rating: "失败"
    },
    draw: {
      title: "飞夺泸定桥 — 僵持",
      comparison: [
        { dimension: "战术选择", player_line: "你的战术选择不够果断", history_line: "二十二名勇士果断攀爬铁索", inferred: false },
        { dimension: "伤亡情况", player_line: "双方均有伤亡，桥未夺取", history_line: "红军奋勇夺取泸定桥，打开北上通道", inferred: false },
        { dimension: "后果推演", player_line: "僵持消耗了宝贵的时间", history_line: "红军一昼夜急行军240里后迅速夺桥", inferred: true }
      ],
      conclusion: "战争中犹豫是最危险的敌人。当年的红军没有犹豫——一昼夜240里急行军，到了就打，打了就夺。时间不等人，桥也不等人。",
      emotion_tag: "tense",
      inferred: true,
      score: 40,
      rating: "需改进"
    }
  },
  zunyi: {
    correct_decision: {
      title: "遵义会议 — 正确转折",
      comparison: [
        { dimension: "会议态度", player_line: "你支持了正确的军事路线", history_line: "遵义会议增选毛泽东为政治局常委", inferred: false },
        { dimension: "历史影响", player_line: "你的选择让红军走向了正确方向", history_line: "遵义会议是党生死攸关的转折点", inferred: false }
      ],
      conclusion: "遵义会议的伟大之处在于：在最危险的时刻，党敢于承认错误、纠正路线。你的选择和当年的代表们一样——在关键时刻站在了正确的一边。",
      emotion_tag: "hopeful",
      inferred: false,
      score: 95,
      rating: "优秀"
    },
    wrong_decision: {
      title: "遵义会议 — 错误坚持",
      comparison: [
        { dimension: "会议态度", player_line: "你坚持了错误的军事路线", history_line: "遵义会议纠正了'左'倾教条主义错误", inferred: false },
        { dimension: "历史影响", player_line: "你的选择让红军继续走向危险", history_line: "遵义会议后红军四渡赤水，转危为安", inferred: false }
      ],
      conclusion: "遵义会议告诉我们：承认错误不是软弱，而是力量。当年博古没有完全承认错误，但党最终还是选择了正确的路线。在关键时刻，选择比坚持更重要。",
      emotion_tag: "tragic",
      inferred: false,
      score: 20,
      rating: "需反思"
    }
  }
};
/* ========================================
   NPC角色配置（5虚构角色，严禁真实人物作为对话角色）
   ======================================== */
const NPC_ROLES = {
  wang_gui: {
    name: '老班长王贵',
    label: '60岁老兵 · 湘赣老游击队员',
    portraitColor: '#1A1A1A',
    accentColor: '#7A1414'
  },
  chen_xiaoman: {
    name: '青年战士陈小满',
    label: '18岁战士 · 第三次入伍',
    portraitColor: '#1A1A1A',
    accentColor: '#A32020'
  },
  he_wen: {
    name: '指导员何文',
    label: '28岁指导员 · 乡村教师出身',
    portraitColor: '#1A1A1A',
    accentColor: '#3D6B8C'
  },
  enemy_messenger: {
    name: '敌方传令兵',
    label: '25岁传令兵 · 无名',
    portraitColor: '#2A2A2A',
    accentColor: '#666'
  },
  narrator: {
    name: '解说旁白',
    label: '客观陈述 · 时空对照',
    portraitColor: '#1A1A1A',
    accentColor: '#B08D2F'
  }
};

/* NPC水墨剪影SVG（按portrait_config.json风格生成，全部无面部细节） */
const NPC_PORTRAITS = {
  wang_gui: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="wg-bg" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#2A2020"/><stop offset="100%" stop-color="#0A0808"/>
      </radialGradient>
      <linearGradient id="wg-ink" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3A3030"/><stop offset="100%" stop-color="#1A1010"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="8" fill="url(#wg-bg)"/>
    <!-- 佝偻老兵侧影 -->
    <path d="M30 85 Q28 70 35 55 Q38 48 42 42 L42 30 Q44 22 52 20 Q60 19 64 24 L66 28 Q68 30 70 28 L72 22 Q74 18 78 20 L76 26 Q74 30 70 32 L68 36 Q72 40 74 48 Q76 55 73 62 L70 70 Q68 78 65 85 Z" fill="url(#wg-ink)" opacity="0.85"/>
    <!-- 八角帽轮廓 -->
    <path d="M44 22 Q42 14 52 12 Q62 13 66 18 L64 24 Q60 20 52 20 Q46 20 44 22 Z" fill="#4A2020" opacity="0.8"/>
    <!-- 步枪斜线 -->
    <line x1="68" y1="40" x2="82" y2="28" stroke="#5A3030" stroke-width="2" opacity="0.6"/>
    <!-- 水墨溅墨效果 -->
    <circle cx="25" cy="75" r="3" fill="#3A2020" opacity="0.3"/>
    <circle cx="80" cy="80" r="2" fill="#3A2020" opacity="0.2"/>
  </svg>`,

  chen_xiaoman: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="cx-bg" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#2A1818"/><stop offset="100%" stop-color="#0A0808"/>
      </radialGradient>
      <linearGradient id="cx-ink" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3A2828"/><stop offset="100%" stop-color="#1A1010"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="8" fill="url(#cx-bg)"/>
    <!-- 瘦小少年侧影 -->
    <path d="M35 85 Q33 72 38 58 Q40 50 44 44 L44 28 Q46 20 54 18 Q62 18 66 24 L68 28 Q70 26 72 22 L74 18 Q78 18 78 24 L76 28 Q74 30 72 30 L70 34 Q74 38 76 46 Q78 54 75 60 L72 68 Q70 78 68 85 Z" fill="url(#cx-ink)" opacity="0.85"/>
    <!-- 略大的八角帽 -->
    <path d="M42 22 Q40 12 54 10 Q68 12 70 20 L66 26 Q62 20 54 18 Q48 18 42 22 Z" fill="#5A2020" opacity="0.8"/>
    <!-- 水墨溅墨 -->
    <circle cx="22" cy="70" r="2" fill="#3A2020" opacity="0.25"/>
    <circle cx="82" cy="65" r="3" fill="#3A2020" opacity="0.2"/>
  </svg>`,

  he_wen: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="hw-bg" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#1A2030"/><stop offset="100%" stop-color="#080A10"/>
      </radialGradient>
      <linearGradient id="hw-ink" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#2A3040"/><stop offset="100%" stop-color="#101420"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="8" fill="url(#hw-bg)"/>
    <!-- 挺拔知识分子侧影 -->
    <path d="M34 85 Q32 68 36 52 Q38 44 42 38 L42 26 Q44 18 52 16 Q60 16 64 22 L66 26 Q68 24 70 20 L72 16 Q76 16 76 22 L74 26 Q72 28 70 28 L68 32 Q72 36 74 44 Q76 52 74 58 L72 66 Q70 76 68 85 Z" fill="url(#hw-ink)" opacity="0.85"/>
    <!-- 眼镜轮廓暗示 -->
    <circle cx="56" cy="24" r="4" fill="none" stroke="#4A5060" stroke-width="0.8" opacity="0.5"/>
    <!-- 手持文件 -->
    <rect x="70" y="42" width="8" height="12" rx="1" fill="#3A4050" opacity="0.5"/>
    <!-- 水墨溅墨 -->
    <circle cx="24" cy="78" r="2" fill="#2A3040" opacity="0.2"/>
  </svg>`,

  enemy_messenger: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="em-bg" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#252525"/><stop offset="100%" stop-color="#0A0A0A"/>
      </radialGradient>
      <linearGradient id="em-ink" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#353535"/><stop offset="100%" stop-color="#151515"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="8" fill="url(#em-bg)"/>
    <!-- 僵硬传令兵侧影 -->
    <path d="M36 85 Q34 65 38 50 Q40 42 44 36 L44 24 Q46 16 54 14 Q60 14 64 20 L66 24 Q68 22 70 18 L72 14 Q76 14 76 20 L74 24 Q72 26 70 26 L68 30 Q72 34 74 42 Q76 50 74 56 L72 64 Q70 74 68 85 Z" fill="url(#em-ink)" opacity="0.8"/>
    <!-- 军帽檐压低 -->
    <path d="M40 18 Q38 10 54 8 Q66 10 68 16 L64 22 Q60 16 54 14 Q46 14 40 18 Z" fill="#454545" opacity="0.8"/>
    <rect x="38" y="20" width="32" height="3" rx="1" fill="#555" opacity="0.6"/>
    <!-- 手持信件 -->
    <rect x="68" y="40" width="10" height="8" rx="1" fill="#404040" opacity="0.5"/>
  </svg>`,

  narrator: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="nr-bg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#1A1A18"/><stop offset="100%" stop-color="#080806"/>
      </radialGradient>
    </defs>
    <rect width="100" height="100" rx="8" fill="url(#nr-bg)"/>
    <!-- 远山轮廓 -->
    <path d="M10 70 Q20 55 30 62 Q40 48 50 58 Q60 45 70 55 Q80 50 90 65 L90 80 L10 80 Z" fill="#2A2A25" opacity="0.6"/>
    <!-- 铁索桥意象 -->
    <line x1="15" y1="68" x2="85" y2="68" stroke="#3A3A30" stroke-width="0.8" opacity="0.4"/>
    <line x1="15" y1="72" x2="85" y2="72" stroke="#3A3A30" stroke-width="0.8" opacity="0.4"/>
    <line x1="20" y1="68" x2="20" y2="72" stroke="#3A3A30" stroke-width="0.5" opacity="0.3"/>
    <line x1="40" y1="68" x2="40" y2="72" stroke="#3A3A30" stroke-width="0.5" opacity="0.3"/>
    <line x1="60" y1="68" x2="60" y2="72" stroke="#3A3A30" stroke-width="0.5" opacity="0.3"/>
    <line x1="80" y1="68" x2="80" y2="72" stroke="#3A3A30" stroke-width="0.5" opacity="0.3"/>
    <!-- 大量留白：上方空旷 -->
  </svg>`
};

/* NPC降级台词库（接口失败时按角色随机选一条） */
const NPC_LINES = {
  wang_gui: [
    { text: '走，跟上。', emotion: 'calm' },
    { text: '我当了十几年兵，没见过这样的桥。铁索凌空，下面就是大渡河。', emotion: 'tragic' },
    { text: '二班的，跟我上。', emotion: 'tense' },
    { text: '好样的，你第一个爬过去了，我亲眼看见的。', emotion: 'hopeful' },
    { text: '别怕，伢子。怕就对了，不怕的都在湘江边留下了。', emotion: 'tragic' }
  ],
  chen_xiaoman: [
    { text: '班长，让我参加突击队，我不怕死！', emotion: 'tense' },
    { text: '我爬到桥中间了，铁索晃得厉害！', emotion: 'tense' },
    { text: '我的左臂中弹了，但我还能爬！', emotion: 'tragic' },
    { text: '班长，我们真的能过去吗？', emotion: 'calm' },
    { text: '前面的人已经到桥头了！快！', emotion: 'hopeful' }
  ],
  he_wen: [
    { text: '同志们，上级命令我们，明天天亮前必须拿下泸定桥。', emotion: 'calm' },
    { text: '全团轻装前进，跑不动就走，走不动就爬。', emotion: 'tense' },
    { text: '二十二名勇士已经组成突击队，他们的身后是整个红军的希望。', emotion: 'hopeful' },
    { text: '遵义会议上，毛泽东同志被选为政治局常委。这是转折点。', emotion: 'calm' },
    { text: '这个我也不太清楚，史书上没写。', emotion: 'calm' }
  ],
  enemy_messenger: [
    { text: '命令：坚守桥头，不得后退。', emotion: 'tense' },
    { text: '泸定桥的木板已经拆除，只剩铁索。', emotion: 'calm' },
    { text: '红军上桥了，他们冒着枪林弹雨在铁索上爬！', emotion: 'tense' },
    { text: '守不住了，桥头被突破了。快撤！', emotion: 'defeat' }
  ],
  narrator: [
    { text: '一九三五年五月，红军来到大渡河边。前有天险，后有追兵。', emotion: 'calm' },
    { text: '红四团接到命令，限一天一夜赶到泸定桥。二百四十里路。', emotion: 'tense' },
    { text: '桥上的木板被敌人拆光了，只剩下十三根铁索。', emotion: 'tragic' },
    { text: '二十二名勇士站了出来。他们知道，这座桥就是通往胜利的路。', emotion: 'hopeful' }
  ]
};

/* 节点类型→NPC角色匹配规则 */
const NPC_NODE_MATCH = {
  battle: ['chen_xiaoman', 'wang_gui'],      // 战役前多触发陈小满
  meeting: ['he_wen'],                         // 会议节点触发何文
  nature: ['wang_gui'],                        // 雪山/草地多触发王贵
  start: ['wang_gui', 'chen_xiaoman'],
  end: ['wang_gui', 'chen_xiaoman']
};
/* ========================================
   情报破译数据（摩斯电码表+情报内容+替换字谜）
   情报内容基于真实历史背景合理推演，标注"据史料推演"
   ======================================== */

// 摩斯电码字母表
const MORSE_CODE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..'
};

// 情报内容（基于遵义会议前后历史背景的合理推演，标注"据史料推演"）
const INTEL_MESSAGES = [
  {
    plaintext: 'ENEMY NORTH',
    morse: '. -. . -- -.-- / -. --- .-. - ....',
    meaning: '敌军主力正向北集结，意图在遵义以北设伏拦截红军',
    source: '据史料推演：遵义会议期间，国民党军多路围追堵截，红军处于重重包围之中',
    buff: '已知敌军部署，首轮行动可行性+15%'
  },
  {
    plaintext: 'ROUTE WEST',
    morse: '.-. --- ..- - . / .-- . ... -',
    meaning: '西进路线敌军防守薄弱，可向西突围转入贵州腹地',
    source: '据史料推演：通道会议后毛泽东主张改向贵州进军，敌军在西面部署较弱',
    buff: '已知敌军部署，首轮行动可行性+15%'
  },
  {
    plaintext: 'BRIDGE SAFE',
    morse: '-... .-. .. -.. --. . / ... .- ..-. .',
    meaning: '前方渡口桥梁尚未被敌军破坏，可迅速通过',
    source: '据史料推演：红军四渡赤水期间，多次利用敌军防守间隙快速渡河',
    buff: '已知敌军部署，首轮行动可行性+15%'
  }
];

// 替换字谜数据（中文明文+替换规则+打乱字块）
const CIPHER_PUZZLES = [
  {
    plaintext: '桥梁可以通行',
    shuffled: ['通','桥','以','行','梁','可'],
    rule: '点击字块组成“桥梁／可以／通行”；本题为虚构通信练习',
    meaning: '练习电报提示通行条件；实际任务仍需核实当前章节的情况。',
    source: '游戏作者编写的通信练习，非历史原始电报',
    buff: '完成本章通信练习，首轮行动可行性+15%'
  },
  {
    plaintext: '敌军向北集结',
    rule: '点击字块还原句子，点击槽位可撤回；本题为虚构通信练习',
    shuffled: ['集', '敌', '结', '军', '向', '北'],
    meaning: '敌军主力正向北集结，意图在遵义以北设伏拦截红军',
    source: '据史料推演：遵义会议期间，国民党军多路围追堵截',
    buff: '已知敌军部署，首轮行动可行性+15%'
  },
  {
    plaintext: '西进路线薄弱',
    answers: ['西进路线薄弱', '西进薄弱路线'],
    hint: '依次描述：向西前进／路线／薄弱；不按上方乱序原样填写',
    rule: '点击字块还原句子，点击槽位可撤回；本题为虚构通信练习',
    shuffled: ['薄', '西', '弱', '进', '路', '线'],
    meaning: '西进路线敌军防守薄弱，可向西突围转入贵州腹地',
    source: '据史料推演：通道会议后毛泽东主张改向贵州进军',
    buff: '已知敌军部署，首轮行动可行性+15%'
  }
];

/* ========================================
   物资分配数据（穿越草地节点 id=9）
   5名虚构战士 · 青稞面分配 · 三种结算结果
   红线：减员用文字叙述，不做血腥/尸体描写
   ======================================== */

// 5名战士卡片（虚构角色，状态影响结算）
const GRASSLAND_SOLDIERS = [
  { id: 's1', name: '张铁柱', status: 'healthy', statusLabel: '健康', desc: '壮实的老兵，能扛能走' },
  { id: 's2', name: '李小顺', status: 'healthy', statusLabel: '健康', desc: '年轻力壮，行军速度快' },
  { id: 's3', name: '王冬生', status: 'weak', statusLabel: '虚弱', desc: '连日饥饿，脚步踉跄' },
  { id: 's4', name: '赵小苗', status: 'wounded', statusLabel: '伤员', desc: '左腿有伤，行走困难' },
  { id: 's5', name: '刘大壮', status: 'weak', statusLabel: '虚弱', desc: '发过烧，勉强跟着走' }
];

// 青稞面总量计算：当前粮食值 ÷ 2（粮食100→50份，粮食60→30份），最低保底20份
function calcRationTotal() {
  const food = GameState.resources.food;
  return Math.max(20, Math.round(food / 2));
}

// 每人分配上限
const RATION_PER_PERSON_MAX = 20;

// 三种结算结果文案（红线：减员用文字叙述，不做血腥描写）
const GRASSLAND_RESULTS = {
  limited: {
    title: '节粮互助',
    narrative: '每个人都分到了口粮，但储备仍然紧张。队伍安排轮流照料伤员，缩短休整间隔，并继续寻找补给。这是本次虚构任务的推演结果。',
    effects: { morale: -2 },
    effectLabel: '士气 -2 · 补给压力仍在',
    achievement: null
  },
  // 有人分0 → 非战斗减员
  someone_zero: {
    title: '断粮之痛',
    narrative: '你把青稞面分给了大部分人，但有人一口也没分到。草地里，没有粮食的人走着走着就掉队了，再也没回来。你不知道他倒在了哪片泥沼旁，只知道他最后的话是："同志们先走，我歇歇就跟上。"',
    effects: { troops: -2, morale: -8 },
    effectLabel: '兵力 -2 · 士气 -8',
    achievement: null
  },
  // 伤员<5份 → 伤情恶化
  wounded_starve: {
    title: '伤情恶化',
    narrative: '伤员分到的青稞面太少了。他的伤口愈合需要体力，但饥饿让他的身体一天天垮下去。走出草地时，他的腿伤已经严重感染，不得不被人抬着走。',
    effects: { troops: -3, morale: -3 },
    effectLabel: '兵力 -3 · 士气 -3',
    achievement: null
  },
  // 均衡分配（最低≥8） → 全员挺过
  balanced: {
    title: '生死与共',
    narrative: '你把青稞面尽可能均匀地分给了每一个人。草地七天七夜，没有人倒下。伤员咬着牙走完了全程，虚弱的同志互相搀扶。走出草地的那一刻，五个人一个不少——这就是生死与共的意思。',
    effects: { morale: +10 },
    effectLabel: '士气 +10',
    achievement: '生死与共'
  },
  // 全给一人（极端不均）
  extreme_uneven: {
    title: '独食难行',
    narrative: '你把大部分青稞面给了一个人，其他人几乎没分到。那个吃饱的人走得最快，但回头一看，身后已经没有人了。草地里，独食者走不远——没有战友的队伍，不是队伍。',
    effects: { troops: -4, morale: -10 },
    effectLabel: '兵力 -4 · 士气 -10',
    achievement: null
  }
};

// 平行时空对比：历史红军平均分粮
const GRASSLAND_HISTORY_COMPARE = {
  title: '穿越草地 — 分粮抉择',
  comparison: [
    { dimension: '分粮方式', player_line: '你按自己的判断分配了青稞面', history_line: '红军将士平均分配仅有的粮食，有人少吃一口让给战友', inferred: false },
    { dimension: '草地减员', player_line: '你的分配导致了不同的结果', history_line: '红军过草地时大量减员，许多人因饥饿和泥沼牺牲', inferred: false },
    { dimension: '生存意志', player_line: '你的选择决定了谁能走出草地', history_line: '红军靠互助和信念走出"死亡之海"，团结是生存的关键', inferred: true }
  ],
  conclusion: '草地是长征中最残酷的自然考验。红军没有足够的粮食，但她们选择了平均分配、互相谦让——把最后一口干粮让给最需要的战友。你的分粮选择，就是你对"生死与共"四个字的理解。',
  emotion_tag: 'tragic',
  inferred: false,
  score: 70,
  rating: '及格'
};
/* ========================================
   数据看板本地解读模板（API降级时使用）
   根据资源变化模式匹配不同的解读文案
   ======================================== */
const DASHBOARD_INSIGHT_TEMPLATES = {
  // 兵力大幅下降（湘江战役典型）
  troops_heavy_loss: '你在{node}段兵力下降最快，从{prev}锐减至{curr}。历史上红军在湘江战役中从86800余人锐减至34300余人，损失过半——这是长征中最惨烈的代价。',
  // 兵力稳步恢复
  troops_recovery: '你在{node}段兵力有所恢复（+{diff}），这得益于之前的休整决策。历史上红军在遵义会议后逐步恢复战斗力，四渡赤水更是以巧制胜、减少伤亡。',
  // 士气大幅下降
  morale_drop: '你在{node}段士气下降最快（-{diff}），历史上红军在雪山草地段非战斗减员最严重，饥寒交迫中士气面临极大考验。但正是这种绝境中的坚持，铸就了长征精神。',
  // 士气大幅上升
  morale_surge: '你在{node}段士气大幅提升（+{diff}），这与历史上遵义会议后红军士气重振相似——正确的领导方向带来了信念的力量。',
  // 粮食持续下降
  food_crisis: '你的粮食储备在{node}段已降至{curr}，接近断粮边缘。历史上红军在草地中靠吃草根、啃树皮维持七天七夜，断粮是长征中最普遍的苦难。',
  // 弹药持续下降
  ammo_low: '你的弹药储备在{node}段已降至{curr}，弹药匮乏意味着每一发子弹都必须命中。历史上红军在长征中弹药补给极度困难，很多时候靠缴获补充。',
  // 综合评价：全程均衡
  overall_balanced: '你的长征之旅整体表现均衡，没有出现某一维度崩溃的情况。历史上红军虽然各阶段都有重大损失，但始终保持了战斗意志和组织纪律——这正是长征胜利的关键。',
  // 综合评价：兵力崩溃
  overall_troops_collapse: '你的兵力在长征途中出现了严重崩溃，这与历史上湘江战役后的状况相似。红军从86800余人锐减至34300余人，但正是遵义会议的转折，让残余力量重新焕发了生机。',
  // 综合评价：士气坚韧
  overall_morale_resilient: '你的士气在长征全程保持了较高水平，这非常难得。历史上红军在最艰难的雪山草地段依然保持了革命信念——"红军不怕远征难"不是一句空话，而是真实的写照。'
};

// 12节点简称（用于图表x轴标签）
const NODE_SHORT_NAMES = [
  '瑞金', '湘江', '遵义', '赤水', '金沙', '大渡',
  '泸定', '雪山', '草地', '腊子', '吴起', '会宁'
];
/* ========================================
   通关奖励体系数据
   1. 数字勋章 SVG 生成模板
   2. 党史图鉴卡牌（史实必须有出处）
   3. 时空信箱斯诺回信模板（基于《西行漫记》）
   红线：斯诺回信只转述公开著作记载，禁止虚构私人对话
   ======================================== */

// 勋章SVG生成函数：根据节点数据+评分生成一枚SVG勋章
function generateMedalSVG(node, score) {
  const typeColor = NODE_TYPE_CONFIG[node.type].color;
  // 与十个引擎实际产出的 {95,85,70} 三档对齐：70→及格、85→良好、95→优秀，避免「及格」档永不出现
  const ratingText = score >= 93 ? '优秀' : score >= 83 ? '良好' : score >= 70 ? '及格' : '需反思';
  const ratingColor = score >= 93 ? '#D4AF5A' : score >= 83 ? '#B08D2F' : score >= 70 ? '#A89B7F' : '#A32020';

  return `<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" class="medal-svg">
    <defs>
      <radialGradient id="medal-bg-${node.id}" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#2A2520"/><stop offset="100%" stop-color="#0F0C08"/>
      </radialGradient>
      <linearGradient id="medal-ring-${node.id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${typeColor}"/><stop offset="100%" stop-color="${typeColor}88"/>
      </linearGradient>
    </defs>
    <!-- 勋章底 -->
    <rect width="120" height="140" rx="10" fill="url(#medal-bg-${node.id})"/>
    <!-- 外环 -->
    <circle cx="60" cy="55" r="42" fill="none" stroke="url(#medal-ring-${node.id})" stroke-width="2.5"/>
    <!-- 内环 -->
    <circle cx="60" cy="55" r="36" fill="none" stroke="${typeColor}44" stroke-width="1"/>
    <!-- 五角星 -->
    <path d="M60 30 L64 44 L78 44 L67 53 L71 67 L60 58 L49 67 L53 53 L42 44 L56 44 Z"
          fill="${typeColor}" opacity="0.9"/>
    <!-- 节点简称 -->
    <text x="60" y="80" text-anchor="middle" fill="#D8CDB4" font-size="11" font-weight="700">${node.name.substring(0,4)}</text>
    <!-- 日期 -->
    <text x="60" y="94" text-anchor="middle" fill="#A89B7F" font-size="7">${node.date.substring(0,10)}</text>
    <!-- 评分 -->
    <text x="60" y="108" text-anchor="middle" fill="${ratingColor}" font-size="9" font-weight="800">${score}分 · ${ratingText}</text>
    <!-- 精神关键词 -->
    <text x="60" y="122" text-anchor="middle" fill="${typeColor}" font-size="8" font-weight="600">${node.spiritKeyword}</text>
    <!-- 装饰线 -->
    <line x1="20" y1="130" x2="100" y2="130" stroke="${typeColor}33" stroke-width="0.5"/>
  </svg>`;
}

// ========================================
// 分享图海报数据结构模板
// 用于 exportMedalShareImage() 收集绘制所需全部数据
// ========================================
const SharePosterData = {
  // 玩家信息
  player: {
    characterName: '',      // 角色名：红军连长/后勤补给员/普通红军战士/红军女医护
    characterAvatar: '',    // 角色头像字：指/勤/兵/医
    characterId: ''         // 角色ID，用于配色映射
  },
  // 关卡信息
  level: {
    nodeId: '',
    nodeName: '',
    nodeDate: '',
    nodeLocation: '',
    nodeType: '',
    spiritKeyword: ''
  },
  // 核心战绩数据
  stats: {
    score: null,            // 指挥评分 0-100
    rating: '',             // 评级文字：优秀/良好/及格/需反思
    troops: 0,              // 当前兵力
    ammo: 0,                // 当前弹药
    food: 0,                // 当前粮食
    morale: 0,              // 当前士气
    totalCasualty: 0,       // 累计伤亡
    totalGain: 0,           // 累计缴获/增员
    marchCount: 0,          // 行军次数
    medalCount: 0           // 已获勋章数
  },
  // 勋章信息
  medal: {
    svg: '',                // SVG字符串（generateMedalSVG输出）
    score: null,
    rating: ''
  },
  // AI评价
  evaluation: {
    title: '',              // 评价标题
    text: '',               // 评价正文
    isDegraded: false       // 是否降级模板
  }
};

// 党史图鉴卡牌（通关后解锁，史实必须有出处）
const HISTORY_CARDS = [
  {
    id: 'party_founding',
    title: '建党初期',
    subtitle: '中共一大 · 1921年',
    icon: '★',
    color: '#B08D2F',
    locked: true,
    content: '1921年7月，中国共产党第一次全国代表大会在上海召开，后转移至嘉兴南湖一艘游船上完成最后议程。出席代表13人，代表全国50余名党员。大会通过了党的第一个纲领和决议，选举产生了中央局。中国共产党的成立，是中国历史上开天辟地的大事变。',
    source: '出处：《中国共产党历史》第一卷，中共党史出版社',
    unlockCondition: '通关节点1（瑞金·出发）'
  },
  {
    id: 'nanchang_uprising',
    title: '南昌起义',
    subtitle: '1927年8月1日',
    icon: '⚔',
    color: '#A32020',
    locked: true,
    content: '1927年8月1日，周恩来、贺龙、叶挺、朱德、刘伯承等领导发动南昌起义，打响了武装反抗国民党反动派的第一枪。起义部队约2万余人，经过激烈战斗占领南昌城。南昌起义标志着中国共产党独立领导革命战争、创建人民军队和武装夺取政权的开端。8月1日后来成为中国人民解放军的建军节。',
    source: '出处：《中国共产党历史》第一卷，中共党史出版社',
    unlockCondition: '通关节点2（血战湘江）'
  },
  {
    id: 'zunyi_meeting',
    title: '遵义会议',
    subtitle: '1935年1月15-17日',
    icon: '📜',
    color: '#3D6B8C',
    locked: true,
    content: '遵义会议在红军同共产国际中断联系的情况下召开，由博古主持，周恩来作副报告，翻译为伍修权。会议开了三天，转折是争论出来的而非一致通过。会议集中解决军事和组织问题，增选毛泽东为政治局常委，毛泽东在党中央和红军中的领导地位事实上开始形成。遵义会议是党生死攸关的转折点。',
    source: '出处：《中国共产党历史》第一卷；遵义会议纪念馆官方资料',
    unlockCondition: '通关节点3（遵义会议）'
  },
  {
    id: 'yanan_years',
    title: '延安岁月',
    subtitle: '1935-1948年',
    icon: '⛰',
    color: '#4A6B3A',
    locked: true,
    content: '1935年10月，中央红军到达陕北吴起镇，结束了长征。此后中共中央在延安领导中国革命长达13年。延安时期是中国共产党从弱小走向强大、从挫折走向胜利的关键时期。在这期间，党开展了整风运动、大生产运动，确立了毛泽东思想为党的指导思想，培养了大批革命干部，为最终取得全国胜利奠定了坚实基础。',
    source: '出处：《中国共产党历史》第一卷；延安革命纪念馆官方资料',
    unlockCondition: '通关节点11（吴起镇·落脚）'
  }
];

// 时空信箱：斯诺回信模板（基于《西行漫记》/《红星照耀中国》公开记载）
// 红线：只转述著作中的见闻记载，禁止虚构私人对话细节
const SNOW_LETTER_TEMPLATE = {
  // 检测关键词：玩家消息中是否提到斯诺/美国记者等
  keywords: ['斯诺', 'snow', '美国记者', '哥伦比亚', '西行漫记', '红星照耀', '外国记者', '埃德加'],
  // 斯诺回信内容（基于《西行漫记》记载的见闻）
  letter: `亲爱的朋友：

你提到了斯诺。1936年6月，美国记者埃德加·斯诺确实来到了陕北保安（今志丹县），他是第一个访问陕北苏区的西方记者。在为期四个月的采访中，斯诺与毛泽东进行了多次长谈，记录下了红军长征的壮举和陕北苏区的真实面貌。

斯诺在《西行漫记》（又名《红星照耀中国》）中写道：红军长征是"当今时代无与伦比的一次史诗般的远征"。他亲眼见到那些经历过长征的红军战士——他们衣衫褴褛但精神饱满，面黄肌瘦但目光坚定。斯诺记录下了毛泽东、周恩来、朱德等人的谈话内容，这些都在他的著作中有详细记载。

斯诺在书中描述了他见到的红军：他们大多很年轻，平均年龄不到二十岁；他们不赌博、不吸鸦片，纪律严明；他们学习识字、唱歌、做体操；他们对革命充满信念。这些见闻都记录在《西行漫记》中，是斯诺亲眼所见、亲耳所闻。

斯诺的采访让全世界第一次了解了中国共产党和红军的真实情况。他的著作成为西方了解中国革命的重要窗口。

本文由 AI 生成，史实据《西行漫记》（埃德加·斯诺著，1937年初版）整理。`,
  // 普通红军回信（非斯诺关键词时）
  normalLetter: `亲爱的朋友：

你的信穿越了九十年的时光，到达了1935年的长征路上。

我们正在行军。脚下是泥泞的山路，头顶是敌人的飞机。粮食已经不多了，但信念还在。你说你想了解我们——我们是普通的农民、工人、学生，被一个理想聚在一起：要建立一个没有压迫的新中国。

我们不知道能不能活着走完这条路，但我们知道，只要还有一个人在走，这条路就不会断。

你问的问题，有些我能回答，有些我确实不知道。史书上没有记载的事情，我不能编。但我可以把我知道的真实告诉你。

——一个红军战士
（本文由 AI 生成，为文学演绎，非真实历史人物回信）`,
  // 无出处问题的兜底话术
  fallbackResponse: '这个问题我没有可靠的史料来源，不能给你编一个答案。历史研究讲究"无征不信"——没有出处的话，说了就是不负责任。你可以试试问一些有史料记载的问题，比如遵义会议、飞夺泸定桥、四渡赤水这些长征中的重大事件。'
};
/* ========================================
   LEVEL_CONFIG — 关卡数据隔离机制
   每个关卡定义独立的场景标签、允许/禁止关键词、QTE按钮文字、战报氛围
   彻底根治"张冠李戴"：第一关绝不会调用后期关卡的素材
   ======================================== */
const LEVEL_CONFIG = {
  // 节点1：瑞金·出发（1934年10月）
  1: {
    levelId: 'ruijin',
    levelName: '瑞金·出发',
    historyTime: '1934年10月',
    sceneTag: '于都河畔',
    qteSubtitle: '第一视角 · 夜渡于都河',
    qteButtonText: '渡河',
    qteHint: '疯狂连点按钮渡过于都河 · 停手将被河水冲散',
    allowedKeywords: ['渡河', '浮桥', '于都', '告别', '苏区', '战略转移', '隐蔽', '夜行', '门板', '集结', '出发', '封锁线'],
    forbiddenKeywords: ['铁索', '泸定桥', '大渡河', '攀岩', '攀爬铁索', '铁链', '桥头'],
    sceneAtmosphere: '告别苏区、夜渡于都河、百姓献门板搭浮桥、隐蔽行军突破第一道封锁线',
    fallbackScene: { obstacle: '于都河', enemy: '追兵', action: '渡河' }
  },
  // 节点2：血战湘江（1934年11月-12月）
  2: {
    levelId: 'xiangjiang',
    levelName: '血战湘江',
    historyTime: '1934年11月-12月',
    sceneTag: '湘江两岸',
    qteSubtitle: '第一视角 · 突破封锁线',
    qteButtonText: '冲锋',
    qteHint: '疯狂连点按钮突破封锁线 · 停手将被敌火压制',
    allowedKeywords: ['湘江', '封锁线', '冲锋', '突破', '碉堡', '渡江', '掩护', '阵地'],
    forbiddenKeywords: ['铁索', '泸定桥', '大渡河', '攀岩', '于都河', '浮桥'],
    sceneAtmosphere: '湘江两岸炮火连天、突破国民党第四道封锁线、惨烈伤亡',
    fallbackScene: { obstacle: '湘江', enemy: '封锁线守敌', action: '冲锋' }
  },
  // 节点3：遵义会议（1935年1月）— 会议副本，无QTE
  3: {
    levelId: 'zunyi',
    levelName: '遵义会议',
    historyTime: '1935年1月',
    sceneTag: '遵义城',
    qteSubtitle: null, // 会议副本无QTE
    qteButtonText: null,
    qteHint: null,
    allowedKeywords: ['遵义', '会议', '决议', '常委', '军事指挥', '转折'],
    forbiddenKeywords: ['铁索', '泸定桥', '大渡河', '攀岩', '湘江', '冲锋'],
    sceneAtmosphere: '遵义会议——生死攸关的转折点',
    fallbackScene: null
  },
  // 节点4：四渡赤水（1935年1月-3月）
  4: {
    levelId: 'chishui',
    levelName: '四渡赤水',
    historyTime: '1935年1月-3月',
    sceneTag: '赤水河畔',
    qteSubtitle: '第一视角 · 穿插赤水',
    qteButtonText: '穿插',
    qteHint: '疯狂连点按钮穿插敌阵 · 停手将被包围',
    allowedKeywords: ['赤水', '渡河', '穿插', '声东击西', '包围', '突围', '机动'],
    forbiddenKeywords: ['铁索', '泸定桥', '大渡河', '攀岩', '湘江', '封锁线'],
    sceneAtmosphere: '四渡赤水、声东击西、跳出包围圈',
    fallbackScene: { obstacle: '赤水河', enemy: '围追堵截的敌军', action: '穿插' }
  },
  // 节点5：巧渡金沙江（1935年5月）
  5: {
    levelId: 'jinsha',
    levelName: '巧渡金沙江',
    historyTime: '1935年5月',
    sceneTag: '金沙江畔',
    qteSubtitle: '第一视角 · 巧渡金沙江',
    qteButtonText: '渡江',
    qteHint: '疯狂连点按钮渡过金沙江 · 停手将被追兵赶上',
    allowedKeywords: ['金沙江', '渡江', '小船', '皎平渡', '追兵', '巧妙'],
    forbiddenKeywords: ['铁索', '泸定桥', '大渡河', '攀岩', '湘江', '封锁线'],
    sceneAtmosphere: '巧渡金沙江、摆脱追兵、几条小船渡江',
    fallbackScene: { obstacle: '金沙江', enemy: '追兵', action: '渡江' }
  },
  // 节点6：强渡大渡河（1935年5月）
  6: {
    levelId: 'dadu',
    levelName: '强渡大渡河',
    historyTime: '1935年5月',
    sceneTag: '安顺场',
    qteSubtitle: '第一视角 · 强渡大渡河',
    qteButtonText: '划船',
    qteHint: '疯狂连点按钮划船渡河 · 停手将被急流冲走',
    allowedKeywords: ['大渡河', '安顺场', '渡河', '小船', '急流', '勇士'],
    forbiddenKeywords: ['铁索', '泸定桥', '攀爬', '湘江', '封锁线', '赤水'],
    sceneAtmosphere: '强渡大渡河、安顺场、勇士乘小船冲过急流',
    fallbackScene: { obstacle: '大渡河', enemy: '对岸守敌', action: '划船渡河' }
  },
  // 节点7：飞夺泸定桥（1935年5月29日）
  7: {
    levelId: 'luding',
    levelName: '飞夺泸定桥',
    historyTime: '1935年5月29日',
    sceneTag: '泸定桥',
    qteSubtitle: '第一视角 · 攀越铁索',
    qteButtonText: '向上爬',
    qteHint: '疯狂连点按钮向上攀爬 · 停手将滑落',
    allowedKeywords: ['铁索', '泸定桥', '大渡河', '攀爬', '桥头', '木板', '勇士', '二十二'],
    forbiddenKeywords: ['湘江', '封锁线', '赤水', '于都河', '浮桥', '金沙江'],
    sceneAtmosphere: '飞夺泸定桥、攀爬铁索、对岸机枪喷吐火舌',
    fallbackScene: { obstacle: '铁索桥', enemy: '对岸机枪', action: '攀爬' }
  },
  // 节点8：翻越雪山（1935年6月）
  8: {
    levelId: 'snowmount',
    levelName: '翻越雪山',
    historyTime: '1935年6月',
    sceneTag: '夹金山',
    qteSubtitle: '第一视角 · 翻越雪山',
    qteButtonText: '攀登',
    qteHint: '疯狂连点按钮攀登雪山 · 停手将滑落冰崖',
    allowedKeywords: ['雪山', '夹金山', '攀登', '寒冷', '冰雪', '缺氧', '艰难'],
    forbiddenKeywords: ['铁索', '泸定桥', '大渡河', '湘江', '封锁线'],
    sceneAtmosphere: '翻越夹金山、冰雪严寒、高山缺氧',
    fallbackScene: { obstacle: '夹金山', enemy: '严寒冰雪', action: '攀登' }
  },
  // 节点9：穿越草地（1935年8月）
  9: {
    levelId: 'grassland',
    levelName: '穿越草地',
    historyTime: '1935年8月',
    sceneTag: '松潘草地',
    qteSubtitle: '第一视角 · 跋涉草地',
    qteButtonText: '前进',
    qteHint: '疯狂连点按钮跋涉草地 · 停手将陷入泥沼',
    allowedKeywords: ['草地', '泥沼', '跋涉', '饥饿', '青稞', '艰难', '沼泽'],
    forbiddenKeywords: ['铁索', '泸定桥', '大渡河', '湘江', '封锁线', '雪山'],
    sceneAtmosphere: '穿越松潘草地、泥沼遍布、饥饿困苦',
    fallbackScene: { obstacle: '松潘草地', enemy: '泥沼饥饿', action: '跋涉' }
  },
  // 节点10：腊子口战役（1935年9月）
  10: {
    levelId: 'lazikou',
    levelName: '腊子口战役',
    historyTime: '1935年9月',
    sceneTag: '腊子口',
    qteSubtitle: '第一视角 · 突破腊子口',
    qteButtonText: '突击',
    qteHint: '疯狂连点按钮突击腊子口 · 停手将被隘口敌火压制',
    allowedKeywords: ['腊子口', '隘口', '突击', '悬崖', '迂回', '天险'],
    forbiddenKeywords: ['铁索', '泸定桥', '大渡河', '湘江', '封锁线'],
    sceneAtmosphere: '腊子口战役、万丈悬崖、迂回突击',
    fallbackScene: { obstacle: '腊子口', enemy: '隘口敌军', action: '突击' }
  },
  // 节点12：会宁会师（1936年10月）— 会议副本
  12: {
    levelId: 'huining',
    levelName: '会宁会师',
    historyTime: '1936年10月',
    sceneTag: '会宁',
    qteSubtitle: null,
    qteButtonText: null,
    qteHint: null,
    allowedKeywords: ['会师', '会宁', '胜利', '长征结束', '三大主力'],
    forbiddenKeywords: ['铁索', '泸定桥', '大渡河', '攀岩', '湘江'],
    sceneAtmosphere: '三大主力会师、长征胜利结束',
    fallbackScene: null
  },
  // 节点11：吴起镇（1935年10月）— 终点
  11: {
    levelId: 'wuqi',
    levelName: '吴起镇',
    historyTime: '1935年10月',
    sceneTag: '吴起镇',
    qteSubtitle: null,
    qteButtonText: null,
    qteHint: null,
    allowedKeywords: ['吴起镇', '落脚', '陕北', '长征结束'],
    forbiddenKeywords: ['铁索', '泸定桥', '大渡河', '攀岩', '湘江'],
    sceneAtmosphere: '到达吴起镇、长征落脚陕北',
    fallbackScene: null
  }
};
/* ========================================
   levelConfigs — 第一视角/战前简报界面动态配置表
   以节点 id（数字）为键，严格对应 GAME_NODES；
   同时以 levelId（字符串）建立别名，兼容 levelConfigs['ruijin'] 访问。
   所有文案据权威党史资料撰写，克制、悲壮；
   严禁编造史实、严禁历史虚无主义、严禁历史人物写实头像。

   battleMode：
     march  = 常规行军/渡河平移微操（CSS 横向推进）
     qte    = 极限连点 QTE（震屏 + 流血特效）
     marsh  = 泥沼降速（连点推进变慢 + 资源扣减）
     meeting/end = 非战斗节点（无 QTE）
   ======================================== */
const levelConfigs = {
  // 节点1：瑞金·出发（1934年10月）
  1: {
    levelId: 'ruijin',
    title: '瑞金 · 出发',
    subtitle: '第一视角 · 夜渡于都河',
    description: '于都河畔夜色深沉，队伍准备渡河。请按照所选岗位完成协作任务；这一互动情境为教学虚构。',
    actionText: '渡河',  // ✅ 修复：瑞金出发是渡河，不是冲锋
    battleMode: 'march'
  },
  // 节点2：血战湘江（1934年11月-12月）
  2: {
    levelId: 'xiangjiang',
    title: '血战湘江',
    subtitle: '第一视角 · 血战湘江',
    description: '敌军重重封锁，湘江两岸炮火连天。战士们以血肉之躯死守渡口，掩护中央纵队过江，部队减员极其严重——这是一场以巨大牺牲换取生路的血战。',
    actionText: '死守阵地',
    battleMode: 'qte'
  },
  // 节点3：遵义会议（1935年1月）— 会议副本，无 QTE
  3: {
    levelId: 'zunyi',
    title: '遵义会议',
    subtitle: '第一视角 · 生死攸关的转折',
    description: '遵义老城，一场关系红军前途命运的会议正在召开。各方意见激烈交锋，最终纠正了错误的军事指挥、确立了正确的路线——这是党和红军历史上生死攸关的转折点。',
    actionText: '梳理情报',
    battleMode: 'meeting'
  },
  // 节点4：四渡赤水（1935年1月-3月）
  4: {
    levelId: 'chishui',
    title: '四渡赤水',
    subtitle: '第一视角 · 穿插赤水',
    description: '赤水河奔流不息，数十万敌军尾追堵截。红军以机动灵活的战法声东击西、四渡赤水，在敌军重围中反复穿插，寻隙跳出包围圈。',
    actionText: '穿插',
    battleMode: 'qte'
  },
  // 节点5：巧渡金沙江（1935年5月）
  5: {
    levelId: 'jinsha',
    title: '巧渡金沙江',
    subtitle: '第一视角 · 巧渡金沙江',
    description: '金沙江水流湍急，追兵步步紧逼。红军以几条小船昼夜往返，在皎平渡口从容渡江，一举摆脱了尾追的敌军。',
    actionText: '渡江',
    battleMode: 'march'
  },
  // 节点6：强渡大渡河（1935年5月25日）
  6: {
    levelId: 'dadu',
    title: '强渡大渡河',
    subtitle: '第一视角 · 强渡大渡河',
    description: '大渡河天险横亘在前，急流咆哮。十七名勇士乘一叶小船，冒着对岸密集火力冲向渡口，为全军打开了北上的通路。',
    actionText: '划船渡河',
    battleMode: 'march'
  },
  // 节点7：飞夺泸定桥（1935年5月29日）
  7: {
    levelId: 'luding',
    title: '飞夺泸定桥',
    subtitle: '第一视角 · 铁索寒光',
    description: '大渡河天险横亘在前，对岸机枪喷吐火舌，桥板已被抽去，只剩十三根铁索。二十二名勇士冒着弹雨，攀爬在悬空的铁索上，向桥头突击。',
    actionText: '攀爬铁索',
    battleMode: 'qte'
  },
  // 节点8：翻越雪山（1935年6月）
  8: {
    levelId: 'snowmount',
    title: '翻越雪山',
    subtitle: '第一视角 · 翻越夹金山',
    description: '夹金山终年积雪，空气稀薄，风雪刺骨。战士们相互搀扶，一步一喘地向上攀登，用意志对抗严寒与缺氧。',
    actionText: '攀登',
    battleMode: 'marsh',  // ✅ 修复：翻雪山是持久跋涉，不是极限连点QTE
  },
  // 节点9：穿越草地（1935年8月）
  9: {
    levelId: 'grassland',
    title: '穿越草地',
    subtitle: '第一视角 · 泥沼行军',
    description: '无边无际的沼泽，没有粮食，没有干地。每一次拔腿，都可能陷入无尽的深渊。部队忍着饥饿，踩着前人的脚印，向草地深处跋涉。',
    actionText: '向前跋涉',
    battleMode: 'marsh'
  },
  // 节点10：腊子口战役（1935年9月）
  10: {
    levelId: 'lazikou',
    title: '腊子口战役',
    subtitle: '第一视角 · 突破腊子口',
    description: '腊子口两山夹峙，隘口狭窄，敌军凭险据守。红军正面强攻，同时派突击队攀上悬崖，从敌侧后发起突袭，一举夺隘。',
    actionText: '突击',
    battleMode: 'qte'
  },
  // 节点12：会宁会师（1936年10月）— 会议副本
  12: {
    levelId: 'huining',
    title: '会宁会师',
    subtitle: '第一视角 · 三军汇聚',
    description: '历经千难万险，红军三大主力在会宁胜利会师。将士们欢呼相拥——长征以敌人的围追堵截失败、以红军的胜利会师而告结束。',
    actionText: '会师',
    battleMode: 'meeting'
  },
  // 节点11：吴起镇·落脚（1935年10月）— 终点
  11: {
    levelId: 'wuqi',
    title: '吴起镇 · 落脚',
    subtitle: '第一视角 · 到达陕北',
    description: '中央红军到达陕北吴起镇，与陕北红军胜利会合，宣告中央红军长征的胜利完成。星火在这里燎原，中国革命从此翻开崭新的一页。',
    actionText: '扎根陕北',
    battleMode: 'end'
  }
};

// 建立 levelId（字符串）别名，兼容 levelConfigs['ruijin'] 形式访问
Object.keys(levelConfigs).forEach(k => {
  const cfg = levelConfigs[k];
  if (cfg && cfg.levelId) levelConfigs[cfg.levelId] = cfg;
});

// 统一解析：支持传入 node.id（数字）或 levelId（字符串）；均缺失时回退瑞金
function getLevelConfig(nodeIdOrLevelId) {
  if ((nodeIdOrLevelId === null || nodeIdOrLevelId === undefined)) return levelConfigs[1] || null;
  return levelConfigs[nodeIdOrLevelId] || levelConfigs[1] || null;
}
// Reviewed learning tasks are independent from fictional combat simulation.
const LEARNING_TASKS = {
  1: {kind:'行军准备',source:'https://www.81.mil.cn/yw_208727/16477938.html',steps:[
    {text:'1934年10月，中共中央、中革军委率直属机关从瑞金出发，向于都地区转移；各部从不同驻地向于都河沿岸集结。中央苏区出发和于都渡河是前后相接的过程。',question:'先整理哪一条行军记录？',options:['各部向于都地区集结，再按计划渡河','先完成全部渡河，再从瑞金组织集结','把瑞金出发与于都集结记录为同一地点','仅记录渡河，不记录此前集结过程'],answer:0},
    {text:'中央红军在于都集结后，按照渡河计划从各渡口渡过于都河，开始战略转移。体验任务是清点行装、确认携行物资并互助前行。',question:'后勤准备应先做什么？',options:['清点物资，按计划协助转运','先统一减轻负重，渡河后再核对物资','先让各组自由转运，结束后再汇总','只核对随身口粮，把联络安排留到最后'],answer:0}]},
  3: {kind:'会议资料梳理',source:'https://www.miit.gov.cn/ztzl/rdzt/dsxxjyzl/xxzl/art/2021/art_a43d76bc5e694806889c07fc36ec6adc.html',steps:[
    {text:'1935年1月15日至17日，中共中央在遵义召开政治局扩大会议，集中解决当时具有决定意义的军事和组织问题。这是会议学习节点，不是战斗关卡。',question:'这次会议集中解决什么问题？',options:['军事和组织问题','军事与渡口运输问题','组织与后续补给分配问题','主要整理会议后的行军路线'],answer:0},
    {text:'遵义会议是党的历史上一个生死攸关的转折点。这里通过阅读和核对资料理解历史，不模拟领袖发言，也不由玩家投票更改真实会议决定。',question:'资料整理应遵循什么原则？',options:['区分史料与虚构台词，保留明确出处','先汇总所有台词，再统一列为会议记录','仅保留结论，出处可以等通关后再补','把推演的高分方案纳入真实会议决议'],answer:0}]},
  8: {kind:'雪山互助',source:'https://www.81.mil.cn/yw_208727/16343466.html',steps:[
    {text:'翻越雪山是长征中的艰难行军经历。教学情境关注保暖、队伍互助和物资携行，不模拟向雪山开火。',question:'这段行军应如何协作？',options:['检查保暖物资，互相照应并按安排前行','先轻装前行，把保暖物资核对留到山后','只清点口粮，其他物资按个人习惯携带','先统一行进速度，再考虑体弱者的负重'],answer:0}]},
  9: {kind:'草地物资协作',source:'https://www.81.mil.cn/yw_208727/16343466.html',steps:[
    {text:'草地行军面临饥饿、泥沼与恶劣环境。下面是虚构物资协作练习，不根据分粮分数推算真实红军伤亡。',question:'物资紧张时先做什么？',options:['清点口粮，统一安排，关注伤员与体弱同志','先平均分完，再清点实际剩余口粮','先确保当前行军速度，安顿后再分粮','优先给负重最多的人，暂不核对体弱情况'],answer:0}]},
  11: {kind:'时间线整理',source:'https://zgjjjc.ccdi.gov.cn/bqml/bqxx/201610/t20161025_88539.html',steps:[
    {text:'1935年10月，党中央和中央红军到达陕北吴起镇，中央红军的长征胜利结束。这早于1936年10月的三大主力会师，不能把两个事件倒置。',question:'与三大主力会师相比，哪条时间记录正确？',options:['1935年中央红军到达吴起镇','两者都记录为1936年10月','先三大主力会师，再到达吴起镇','两者为同一支部队在同一地点的同一事件'],answer:0}]},
  12: {kind:'会师历史档案',source:'https://zgjjjc.ccdi.gov.cn/bqml/bqxx/201610/t20161025_88539.html',steps:[
    {text:'1936年10月，红一、红二、红四方面军先后在会宁、将台堡会师。两处会师共同构成长征胜利的重要标志，不应把将台堡写为会宁的同一地点。',question:'会师地点应如何记录？',options:['分别记录会宁与将台堡','先合并为一个地点，再在附录解释','只记录会宁，将台堡作为别名','只记录将台堡，会宁作为会师日期'],answer:0}]}
};
