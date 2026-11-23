/* ========================================
   长征·星火 — AI 输出中文化过滤器
   作用：在 API 边界统一把模型返回的英文枚举/标签翻译为中文，
        保证界面零英文（模型偶尔不遵守 prompt 时由本层兜底）
   ======================================== */

/* ===== 短语级映射（优先匹配，整词命中） ===== */
const ZH_PHRASES = {
  // 战术动作
  'feint': '佯攻',
  'feint_attack': '佯攻',
  'false_attack': '佯攻',
  'advance': '前进',
  'push_forward': '前进',
  'retreat': '撤退',
  'withdraw': '撤退',
  'flank': '侧翼包抄',
  'flank_attack': '侧翼包抄',
  'encircle': '合围',
  'ambush': '伏击',
  'suppress': '火力压制',
  'suppressive_fire': '火力压制',
  'cover_fire': '火力掩护',
  'cover': '掩护',
  'climb': '攀爬',
  'climb_up': '攀爬',
  'cross': '强渡',
  'ford': '渡口',
  'charge': '冲锋',
  'rush': '冲锋',
  'hold': '坚守',
  'hold_position': '原地警戒',
  'defend': '防守',
  'block': '封锁',
  'breakthrough': '突破',
  'wait': '待机',
  'rest': '休整',
  'scout': '侦察',
  'resupply': '补给',
  'sabotage': '破袭',

  // 目标与地形
  'bridge_defenses': '桥头防御工事',
  'bridge_defense': '桥头防御工事',
  'bridgehead': '桥头',
  'bridge_head': '桥头',
  'bridge': '铁索桥',
  'iron_chain': '铁索',
  'chains': '铁索',
  'far_bank': '对岸',
  'opposite_bank': '对岸',
  'west_bank': '西岸',
  'east_bank': '东岸',
  'enemy_positions': '敌军阵地',
  'enemy_position': '敌军阵地',
  'machine_gun_nest': '机枪掩体',
  'gun_nest': '火力点',
  'firing_point': '火力点',
  'right_flank': '右侧山梁',
  'left_flank': '左侧山梁',
  'mountain_path': '山路',
  'river_crossing': '渡口',
  'ferry': '渡口',
  'snow_mountain': '雪山',
  'marshland': '泥沼草地',
  'swamp': '泥沼',
  'cliff': '悬崖',
  'village': '村寨',
  'road': '公路',
  'woods': '树林',
  'trench': '战壕',
  'wire': '铁丝网',

  // 部队编制
  'squad': '班',
  'platoon': '排',
  'company': '连',
  'battalion': '营',
  'regiment': '团',
  'brigade': '旅',
  'main_force': '主力',
  'mainforce': '主力',
  'vanguard': '先头',
  'vanguard_team': '突击队',
  'assault_team': '突击队',
  'cover_team': '掩护组',
  'fire_support': '火力掩护组',
  'main_body': '主力部队',
  'scout_team': '侦察组',
  'medical_team': '医疗组',

  // 评价维度键（截图中的 tactical_action 等）
  'tactical_action': '战术行动',
  'strategic_intent': '战略意图',
  'environmental_awareness': '环境洞察',
  'resource_management': '资源管理',
  'casualty_control': '伤亡控制',
  'decision_quality': '决策质量',
  'tactical_execution': '战术执行',
  'unit_coordination': '协同配合',
  'timing_control': '时机把握',
  'risk_assessment': '风险评估',
  'morale_management': '士气管理',
  'supply_management': '补给管理',
  'historical_comparison': '史实对照',
  'overall_performance': '综合表现',

  // 状态
  'low': '低', 'medium': '中', 'high': '高',
  'success': '成功', 'failure': '失败', 'draw': '僵持',
  'victory': '胜利', 'defeat': '失败',
  'calm': '沉着', 'tense': '紧张', 'tragic': '悲壮',
  'hopeful': '振奋', 'nervous': '紧张',
  'east': '东', 'west': '西', 'north': '北', 'south': '南',
  'day': '白天', 'night': '夜间', 'dawn': '拂晓', 'dusk': '黄昏',

  // 长征场景补充
  'upstream': '上游', 'downstream': '下游', 'north_bank': '北岸', 'south_bank': '南岸',
  'enemy_line': '敌军防线', 'trench_line': '战壕线', 'wire_obstacle': '铁丝网障碍',
  'iron_bridge': '铁索桥', 'checkpoint': '检查站', 'roadblock': '路障',
  'convoy': '辎重队', 'supply_train': '辎重队', 'supply': '补给',
  'wounded': '伤员', 'medic': '卫生员', 'stretcher': '担架',
  'ammunition': '弹药', 'ammo': '弹药', 'rifle': '步枪', 'grenade': '手榴弹',
  'machine_gun': '机枪', 'mortar': '迫击炮', 'pincer': '钳形攻势',
  'encirclement': '包围圈', 'breach_point': '突破口', 'foothold': '立足点',
  'regroup': '重整队伍', 'withdrawal_': '撤退', 'advance_guard': '先头部队',
  'rear_guard': '后卫部队', 'sentry': '哨兵', 'barricade': '路障',
  'ravine': '山沟', 'slope': '山坡', 'ridge': '山脊', 'summit': '山顶',
  'mountain_pass': '山口', 'ford_point': '渡河点', 'rope': '绳索',
  'ladder': '梯子', 'plank': '桥板', 'anchor': '铁桩',
  'granary': '粮仓', 'portable_stove': '便携炉具', 'grassland': '草地',
  'mud': '泥沼', 'snow': '雪', 'ice': '冰层', 'oxygen': '氧气',
  'frozen': '冰冻', 'starving': '饥饿', 'exhausted': '疲惫',
  'enemy_pursuit': '敌军追击', 'pursuit': '追击', 'blockade': '封锁',
  'aircraft': '敌机', 'bombing': '轰炸', 'airstrike': '空袭',
  'shortage': '短缺', 'hunger': '饥荒', 'famine': '断粮'
};

/* ===== 词级映射（分词后逐词替换） ===== */
const ZH_WORDS = {
  the: '', a: '', an: '', to: '', of: '', at: '', on: '', in: '', and: '', or: '',
  is: '', are: '', be: '', with: '', for: '', from: '', by: '', as: '', it: '',
  team: '队', group: '组', squad_: '班', fire: '火力', gun: '枪', guns: '枪',
  attack: '攻击', attacking: '进攻', defend: '防守', defense: '防御',
  bridge: '桥', bank: '岸', position: '阵地', positions: '阵地',
  enemy: '敌军', friendly: '我军', our: '我方', red: '红军',
  tactical: '战术', strategic: '战略', action: '行动', intent: '意图',
  environmental: '环境', awareness: '洞察', assessment: '评估',
  river: '河', water: '水', current: '水流', flow: '水流',
  narrow: '狭窄', wide: '宽阔', steep: '陡峭', deep: '深',
  risk: '风险', note: '提示', damage: '损伤', casualty: '伤亡',
  heavy: '重', light: '轻', quick: '迅速', slow: '缓慢',
  second: '二', third: '三', first: '一', fourth: '四',
  company_: '连', troops: '部队', force: '部队', forces: '部队',
  front: '前方', rear: '后方', flank_: '侧翼', side: '侧',
  right: '右', left: '左', top: '上', bottom: '下',
  assault: '突击', cover_: '掩护', suppress: '压制', feint_: '佯攻'
};

/* ===== 停用词（分词后直接丢弃，不计入输出） ===== */
const ZH_STOP = new Set(['the', 'a', 'an', 'to', 'of', 'at', 'on', 'in', 'and', 'or',
  'is', 'are', 'be', 'with', 'for', 'from', 'by', 'as', 'it', 'its', 'this', 'that',
  'then', 'than', 'so', 'but', 'not', 'no', 'yes', 'do', 'does', 'did', 'has', 'have',
  'had', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must']);

/* ===== 是否含中文 ===== */
function zhHasChinese(str) {
  return /[\u4e00-\u9fa5]/.test(str);
}

/* ===== 是否含拉丁字母 ===== */
function zhHasLatin(str) {
  return /[A-Za-z]{2,}/.test(str);
}

/**
 * 把任意字符串转为中文显示文本
 * @param {*} s 原始值
 * @param {string} fallback 纯英文且无法翻译时的中文兜底（如"未知行动"）
 */
function zhText(s, fallback) {
  if (s === null || s === undefined) return '';
  const str = String(s).trim();
  if (!str) return '';
  // 已是中文（或中英混排且中文占比够）→ 直接放行
  if (zhHasChinese(str)) return str;
  if (!zhHasLatin(str)) return str;

  const key = str.toLowerCase().replace(/\s+/g, '_');
  if (ZH_PHRASES[key]) return ZH_PHRASES[key];

  // 拆词翻译
  const words = key.split(/[_\-\s]+/).filter(Boolean);
  const parts = [];
  for (const w of words) {
    if (ZH_STOP.has(w)) continue;
    if (ZH_PHRASES[w]) { parts.push(ZH_PHRASES[w]); continue; }
    if (ZH_WORDS[w]) { parts.push(ZH_WORDS[w]); continue; }
    parts.push('');   // 未知词丢弃，避免残留英文
  }
  const joined = parts.join('').trim();
  if (joined) return joined;
  return fallback !== undefined ? fallback : '未识别指令';
}

/**
 * 递归清洗模型返回对象：把所有字符串值中文化
 * 键名不做翻译（snake_case 键是接口约定，只翻译值）
 *
 * 例外：引用类字段（史实原文/出处/文献名/日期）必须原样保留——
 * 项目合规要求 L1 史实层「绝对不可改写，必须原文引用」，
 * 若把英文文献名译成中文反而破坏了引用的真实性。
 */
const ZH_PRESERVE_KEYS = new Set([
  'source', 'document_title', 'date', 'quote', 'trace_id',
  'citation', 'history_ref', 'book', 'title_en'
]);

function zhDeep(obj, fallback, parentKey) {
  if (obj === null || obj === undefined) return obj;
  if (parentKey && ZH_PRESERVE_KEYS.has(parentKey)) return obj;
  if (typeof obj === 'string') return zhText(obj, fallback);
  if (Array.isArray(obj)) return obj.map(v => zhDeep(v, fallback, parentKey));
  if (typeof obj === 'object') {
    const out = {};
    for (const k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      out[k] = zhDeep(obj[k], fallback, k);
    }
    return out;
  }
  return obj;
}
