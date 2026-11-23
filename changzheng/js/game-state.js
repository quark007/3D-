/* ========================================
   长征·星火 — 全局状态管理系统
   角色属性 · 资源系统 · 行军消耗 · localStorage持久化
   ======================================== */

// ===== 角色定义 =====
// 合规红线：角色池只允许红军基层指战员（虚构人物），严禁真实历史人物（毛泽东/周恩来等）
// 个人特长与队伍资源分离；能力参数仅用于教学任务，不表示人数或历史评价。
const CHARACTERS = [
  {
    id: 'commander',
    name: '红军连长',
    avatar: '指',
    desc: '在上级部署下，组织本连行动与战友协作',
    attrs: { endurance: 50, teamwork: 90, care: 40 }
  },
  {
    id: 'logistics',
    name: '后勤补给员',
    avatar: '勤',
    desc: '清点、保管和运送物资，协助队伍补给',
    attrs: { endurance: 65, teamwork: 85, care: 60 }
  },
  {
    id: 'soldier',
    name: '普通红军战士',
    avatar: '兵',
    desc: '执行行军与警戒任务，与战友互助前行',
    attrs: { endurance: 90, teamwork: 40, care: 50 }
  },
  {
    id: 'medic',
    name: '红军女医护',
    avatar: '医',
    desc: '参与伤员救护与照料，协助卫生保障',
    attrs: { endurance: 70, teamwork: 50, care: 60 }
  }
];

const MARCH_RULES=Object.freeze({foodMin:8,foodRange:5,foodCritical:20,moraleLoss:10,staminaCost:10});

// ===== 全局状态 =====
const GameState = {
  coop: {mode:'solo',seats:[],activeSeat:0,phase:'dialog',contributions:{orders:0,foodSaved:0,qteWins:0,qteAttempts:0,moraleEvents:0}},
  migrateCoop(raw) {
    const roles=['commander','logistics','soldier','medic'],phases=['dialog','deploy','supply','action','medical'];
    const seats=Array.isArray(raw?.seats)?[...new Set(raw.seats.map(s=>s?.roleId).filter(r=>roles.includes(r)))].slice(0,4).map(roleId=>({roleId})):[];
    const mode=raw?.mode==='hotseat'&&seats.length>=2?'hotseat':'solo';
    const contributions=Object.fromEntries(['orders','foodSaved','qteWins','qteAttempts','moraleEvents'].map(k=>[k,typeof raw?.contributions?.[k]==='number'&&Number.isFinite(raw.contributions[k])?Math.max(0,Math.min(1000000,Math.floor(raw.contributions[k]))):0]));
    contributions.qteWins=Math.min(contributions.qteWins,contributions.qteAttempts);
    return {mode,seats:mode==='hotseat'?seats:[],activeSeat:mode==='hotseat'&&Number.isInteger(raw.activeSeat)&&raw.activeSeat>=0&&raw.activeSeat<seats.length?raw.activeSeat:0,phase:phases.includes(raw?.phase)?raw.phase:'dialog',contributions};
  },
  skills: { morse: false },
  storyPreparations: {},
  // 当前选中角色
  character: null,
  // 资源（0-100）
  resources: { troops: 100, ammo: 100, food: 100, morale: 100 },
  // 体力（0-100）
  stamina: 100,
  journalEntries: [],
  // 行军记录
  marchCount: 0,
  // 战前抉择记录
  preBattleChoices: [],
  // 战斗评分记录 { nodeId, score, rating }
  battleScores: [],
  // 情报破译记录 { nodeId, success, buff }
  intelRecords: [],
  // 当前情报buff（破译成功后激活，战斗中使用）
  currentIntelBuff: null,
  // 物资分配记录 { nodeId, allocations, result, achievement }
  rationRecords: [],
  // 节点资源快照 { nodeId, nodeName, resources: {troops,ammo,food,morale}, timestamp }
  nodeSnapshots: [],
  // 勋章收集记录 { nodeId, score, rating, svg }
  medalRecords: [],
  // 党史图鉴解锁记录 [cardId, ...]
  historyCardsUnlocked: [],
  // 时空信箱记录 { playerMessage, aiReply, isSnow, timestamp }
  mailboxRecords: [],
  // 决策因果轨迹与假想敌方指挥官记忆（跨关持久化）
  decisionTrace: [],
  enemyCommanderMemory: {
    encounters: 0,
    tendencies: { intel: 0, collective: 0, mobility: 0, feint: 0, direct: 0 },
    lastCounter: '',
    lastNodeId: ''
  },
  // 是否通关（解锁图鉴和信箱）
  gameCompleted: false,

  // ===== 初始化 =====
  init() {
    // Capture the empty state before any saved or demonstration data is read.
    window.MainlineDemo?.captureDefaults?.(this);
    this.load();
  },

  // ===== 选择角色 =====
  selectCharacter(charId) {
    this.character = CHARACTERS.find(c => c.id === charId);
    if (!this.character) return;
    // 所有岗位使用相同的队伍初始资源，角色不自带兵力。
    this.resources.troops = 100;
    this.resources.ammo = 100;
    this.resources.food = 100;
    this.resources.morale = 100;
    this.resources.morale = Math.min(100, Math.max(50, this.resources.morale));
    this.stamina = 100;
    this.marchCount = 0;
    this.preBattleChoices = [];
    this.save();
  },

  // ===== 角色属性影响系数 =====
  getFoodCostMultiplier() {
    if (!this.character) return 1.0;
    // 物资越高，粮食消耗越低
    return 1.0 - (this.character.attrs.care - 50) * 0.004; // 40→1.04, 60→0.96
  },

  getMoraleRecoveryBonus() {
    if (!this.character) return 0;
    // 士气值越高，士气恢复加成越大
    return (this.character.attrs.teamwork - 50) * 0.3; // 90→+12, 40→-3
  },

  getTroopRecoveryBonus() {
    if (!this.character) return 0;
    // 物资（含药品/救护）越高，兵力恢复加成越大
    return (this.character.attrs.care - 50) * 0.2; // 60→+2, 40→-2
  },

  // ===== 行军消耗 =====
  marchConsume() {
    if (!this.character) return null;

    const baseFoodCost = MARCH_RULES.foodMin + Math.floor(Math.random() * MARCH_RULES.foodRange); // 8~12
    const foodCost = Math.round(baseFoodCost * this.getFoodCostMultiplier());
    this.resources.food = Math.max(0, this.resources.food - foodCost);

    // 粮食<20时士气额外-10
    let extraMoraleLoss = 0;
    if (this.resources.food < MARCH_RULES.foodCritical) {
      extraMoraleLoss = MARCH_RULES.moraleLoss;
      this.resources.morale = Math.max(0, this.resources.morale - extraMoraleLoss);
    }

    // 体力消耗（基础-10）
    this.stamina = Math.max(0, this.stamina - MARCH_RULES.staminaCost);

    this.marchCount++;
    this.save();

    return {
      foodCost,
      extraMoraleLoss,
      food: this.resources.food,
      morale: this.resources.morale,
      stamina: this.stamina
    };
  },

  // ===== 战前抉择 =====
  preBattleChoice(choice) {
    if (choice === 'rest') {
      // 就地休整：粮食-15，士气+20+加成，体力恢复满
      const moraleGain = 20 + this.getMoraleRecoveryBonus();
      this.resources.food = Math.max(0, this.resources.food - 15);
      this.resources.morale = Math.min(100, this.resources.morale + moraleGain);
      this.stamina = 100;
      this.preBattleChoices.push({ choice: 'rest', moraleGain, foodCost: 15 });
      this.save();
      return { type: 'rest', moraleGain, foodCost: 15, staminaRestored: 100 };
    } else {
      // 急行军：体力-30，粮食-5，士气-5
      this.stamina = Math.max(0, this.stamina - 30);
      this.resources.food = Math.max(0, this.resources.food - 5);
      this.resources.morale = Math.max(0, this.resources.morale - 5);
      this.preBattleChoices.push({ choice: 'march', staminaCost: 30, foodCost: 5, moraleCost: 5 });
      this.save();
      return { type: 'march', staminaCost: 30, foodCost: 5, moraleCost: 5 };
    }
  },

  // ===== 副本完成后资源恢复 =====
  afterBattleRecover() {
    if (!this.character) return;
    const moraleBonus = this.getMoraleRecoveryBonus();
    const recoveryBonus = this.getTroopRecoveryBonus();
    this.resources.morale = Math.min(100, this.resources.morale + 10 + moraleBonus);
    this.resources.troops = Math.min(100, this.resources.troops + 5 + Math.max(0, recoveryBonus));
    this.stamina = Math.min(100, this.stamina + 20);
    this.save();
  },

  // ===== 检查被迫休整 =====
  checkForcedRest() {
    return this.resources.troops < 30;
  },

  // ===== 记录战斗评分 =====
  recordBattleScore(nodeId, score, rating) {
    // 同站重玩保留最佳；本次运行细节由对应小游戏自己的记录保存。
    nodeId=Number(nodeId);
    if(!Number.isInteger(nodeId)||nodeId<1||nodeId>12||!Number.isFinite(score))return null;
    const best=this.battleScores.filter(s=>Number(s.nodeId)===nodeId).sort((a,b)=>b.score-a.score)[0];
    const record=best&&best.score>=score?best:{nodeId,score:Math.max(0,Math.min(100,score)),rating:String(rating||'').slice(0,100)};
    this.battleScores=this.battleScores.filter(s=>Number(s.nodeId)!==nodeId);
    this.battleScores.push(record);
    this.save();
    return record;
  },

  // ===== 获取节点评分 =====
  getBattleScore(nodeId) {
    const record = this.battleScores.find(s => s.nodeId === nodeId);
    return record || null;
  },

  // ===== 设置情报破译结果 =====
  setIntelBuff(nodeId, success) {
    this.intelRecords = this.intelRecords.filter(r => r.nodeId !== nodeId);
    this.intelRecords.push({ nodeId, success, buff: success ? 'feasibility_plus_15' : null });
    this.currentIntelBuff = success ? { nodeId, buff: 'feasibility_plus_15' } : null;
    this.save();
  },

  // ===== 获取当前情报buff =====
  getIntelBuff() {
    return this.currentIntelBuff;
  },

  // ===== 清除情报buff（战斗使用后消耗） =====
  clearIntelBuff() {
    this.currentIntelBuff = null;
    this.save();
  },

  // ===== 记录物资分配结果 =====
  setRationResult(nodeId, allocations, result) {
    this.rationRecords = this.rationRecords.filter(r => r.nodeId !== nodeId);
    this.rationRecords.push({
      nodeId,
      allocations,  // { s1: 10, s2: 8, ... }
      result: result.title,  // '断粮之痛' / '伤情恶化' / '生死与共' / '独食难行'
      achievement: result.achievement || null,
      effects: result.effects
    });
    this.save();
  },

  // ===== 获取物资分配记录 =====
  getRationResult(nodeId) {
    return this.rationRecords.find(r => r.nodeId === nodeId) || null;
  },

  // ===== 记录节点资源快照 =====
  recordNodeSnapshot(nodeId, nodeName) {
    this.nodeSnapshots = this.nodeSnapshots.filter(s => s.nodeId !== nodeId);
    this.nodeSnapshots.push({
      nodeId,
      nodeName,
      resources: { ...this.resources },
      timestamp: Date.now()
    });
    this.save();
  },

  // ===== 获取所有节点快照 =====
  getNodeSnapshots() {
    return this.nodeSnapshots;
  },

  // ===== 获取节点伤亡/缴获数据（基于快照差值计算） =====
  getNodeCasualties() {
    const results = [];
    for (let i = 0; i < this.nodeSnapshots.length; i++) {
      const snap = this.nodeSnapshots[i];
      const prev = i > 0 ? this.nodeSnapshots[i - 1] : null;
      const prevTroops = prev ? prev.resources.troops : 100;
      const troopsChange = snap.resources.troops - prevTroops;
      const casualty = troopsChange < 0 ? Math.abs(troopsChange) : 0;
      const gain = troopsChange > 0 ? troopsChange : 0;
      results.push({ nodeId: snap.nodeId, nodeName: snap.nodeName, casualty, gain });
    }
    return results;
  },

  // ===== 记录勋章 =====
  recordMedal(nodeId, score, rating, svg) {
    this.medalRecords = this.medalRecords.filter(m => m.nodeId !== nodeId);
    this.medalRecords.push({ nodeId, score, rating, svg });
    this.save();
  },

  // ===== 获取所有勋章 =====
  getMedals() {
    return this.medalRecords;
  },

  // ===== 解锁党史图鉴卡牌 =====
  unlockHistoryCard(cardId) {
    if (!this.historyCardsUnlocked.includes(cardId)) {
      this.historyCardsUnlocked.push(cardId);
      this.save();
    }
  },

  // ===== 检查图鉴卡牌是否已解锁 =====
  isHistoryCardUnlocked(cardId) {
    return this.historyCardsUnlocked.includes(cardId);
  },

  // ===== 标记通关 =====
  markGameCompleted() {
    this.gameCompleted = true;
    this.save();
  },

  // ===== 记录时空信箱消息 =====
  recordMailbox(playerMessage, aiReply, isSnow) {
    this.mailboxRecords.push({
      playerMessage: String(playerMessage || '').slice(0, 500),
      aiReply: String(aiReply || '').slice(0, 2000),
      isSnow,
      timestamp: Date.now()
    });
    if (this.mailboxRecords.length > 100) this.mailboxRecords = this.mailboxRecords.slice(-100);
    this.save();
  },

  // ===== 获取时空信箱记录 =====
  getMailboxRecords() {
    return this.mailboxRecords;
  },

  /** @param {{nodeId:number|string,command?:string,modules?:string[],phase?:string}} entry */
  recordStrategicDecision(entry) {
    const safe = entry && typeof entry === 'object' ? entry : {};
    const modules = Array.isArray(safe.modules) ? safe.modules.map(String).slice(0, 8) : [];
    const command = String(safe.command || '').slice(0, 300);
    const record = {
      id: `decision-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      nodeId: String(safe.nodeId || 'unknown'),
      nodeName: String(safe.nodeName || '未命名节点'),
      command,
      modules,
      phase: safe.phase || 'committed',
      resourceDelta: safe.resourceDelta || {},
      outcome: String(safe.outcome || 'pending'),
      score: Number(safe.score) || 0,
      counter: String(safe.counter || '').slice(0, 240),
      causalNodes: Array.isArray(safe.causalNodes) ? safe.causalNodes.slice(0, 10) : [],
      timestamp: Date.now()
    };
    if (record.nodeId.startsWith('award-demo')) return record;
    this.decisionTrace.push(record);
    this.decisionTrace = this.decisionTrace.slice(-30);
    if(record.phase!=='proposed')this.updateEnemyCommanderMemory(record);
    this.save();
    return record;
  },

  // 迟到补位：AI 解析结果晚于本地先行结果到达时，回写同一条 proposed 记录，
  // 保证战报/经验系统的 modules 与最终 actions 一致；已 committed 的记录不再改动。
  refineProposedDecision(id, entry) {
    const record = Array.isArray(this.decisionTrace) ? this.decisionTrace.find(r => r.id === id) : null;
    if (!record || record.phase !== 'proposed') return false;
    const safe = entry && typeof entry === 'object' ? entry : {};
    if (Array.isArray(safe.modules)) record.modules = safe.modules.map(String).slice(0, 8);
    if (safe.outcome !== undefined) record.outcome = String(safe.outcome || 'pending').slice(0, 120);
    if (Number.isFinite(Number(safe.score))) record.score = Number(safe.score);
    if (safe.counter !== undefined) record.counter = String(safe.counter || '').slice(0, 240);
    this.save();
    return true;
  },

  updateEnemyCommanderMemory(record) {
    const memory = this.enemyCommanderMemory || (this.enemyCommanderMemory = { encounters: 0, tendencies: {}, lastCounter: '', lastNodeId: '' });
    memory.tendencies = Object.assign({ intel: 0, collective: 0, mobility: 0, feint: 0, direct: 0 }, memory.tendencies || {});
    const haystack = `${(record.modules || []).join(' ')} ${record.command || ''}`;
    const rules = {
      intel: /情报|核验|侦察|电报|出处|证据/,
      collective: /协同|集体|组织|研判|会商|配合/,
      mobility: /机动|路线|迂回|转移|渡河|撤离/,
      feint: /佯动|迷惑|声东击西|假目标/,
      direct: /强攻|冲锋|正面|突击|夺取/
    };
    Object.entries(rules).forEach(([key, pattern]) => { if (pattern.test(haystack)) memory.tendencies[key] += 1; });
    memory.encounters = (Number(memory.encounters) || 0) + 1;
    memory.lastCounter = record.counter || memory.lastCounter || '';
    memory.lastNodeId = record.nodeId || '';
  },

  getEnemyCommanderProfile() {
    const memory = this.enemyCommanderMemory || {};
    const labels = { intel: '审慎情报型', collective: '协同组织型', mobility: '机动迂回型', feint: '佯动迷惑型', direct: '正面突击型' };
    const entries = Object.entries(Object.assign({ intel: 0, collective: 0, mobility: 0, feint: 0, direct: 0 }, memory.tendencies || {}));
    entries.sort((a, b) => b[1] - a[1]);
    const [primaryKey, primaryCount] = entries[0];
    const campaign=typeof CampaignCore55!=='undefined'?CampaignCore55.normalize(this.storyPreparations?.campaign55):null;
    const counterplay=campaign?CampaignCore55.counter(campaign,Math.min(12,(campaign.history.at(-1)?.node||0)+1)):null;
    return {
      encounters: Number(memory.encounters) || 0,
      primary: primaryCount > 0 ? labels[primaryKey] : '尚未形成',
      primaryKey: primaryCount > 0 ? primaryKey : '',
      confidence: Number(memory.encounters)>0 ? Math.min(95, 35 + primaryCount * 12) : 0,
      tendencies: Object.fromEntries(entries),
      summary: primaryCount > 0 ? `已从${memory.encounters}次交锋中识别出“${labels[primaryKey]}”倾向` : '完成一次决策后，AI将开始建立你的战术画像',
      lastCounter: memory.lastCounter || '',
      counterplay
    };
  },

  // ===== localStorage 持久化 =====
  /* [R5 2026-10-28] serialize() 是主存档内容的唯一序列化出口：save() 写盘用它，
     SaveTransfer66.snapshot() 在保存失败时也用它从内存直出，保证导出内容
     与当前进度一致（旧实现导出的是 localStorage 里的陈旧主档）。 */
  serialize() {
    return {
        schemaVersion: 3,
        coop: this.migrateCoop(this.coop),
        skills: this.skills,
        storyPreparations: this.storyPreparations,
        journalEntries: this.journalEntries,
        characterId: this.character ? this.character.id : null,
        resources: this.resources,
        stamina: this.stamina,
        marchCount: this.marchCount,
        preBattleChoices: this.preBattleChoices,
        battleScores: this.battleScores,
        intelRecords: this.intelRecords,
        currentIntelBuff: this.currentIntelBuff,
        rationRecords: this.rationRecords,
        nodeSnapshots: this.nodeSnapshots,
        medalRecords: this.medalRecords,
        historyCardsUnlocked: this.historyCardsUnlocked,
        mailboxRecords: this.mailboxRecords,
        decisionTrace: this.decisionTrace,
        enemyCommanderMemory: this.enemyCommanderMemory,
        gameCompleted: this.gameCompleted,
        // 69 系列为 additive 可选键（星火传承 meta / 长征 Run 局面），缺省不影响旧档，schemaVersion 无需 bump
        sparkMeta: this.sparkMeta,
        run69: this.run69
      };
  },

  save() {
    try {
      const data = this.serialize();
      const serialized = JSON.stringify(data);
      localStorage.setItem('changzheng_state', serialized);
      if (serialized.length > 3500000 && !this.sizeWarningShown) {
        this.sizeWarningShown = true;
        if (typeof GameUI !== 'undefined') GameUI.showToast('存档已接近浏览器容量上限，建议在设置中导出备份');
      }
      this.saveFailed=false;
      this.saveWarningShown=false;
      return true;
    } catch (e) {
      this.saveFailed=true;
      if(!this.saveWarningShown){this.saveWarningShown=true;if(typeof GameUI!=='undefined')GameUI.showToast('进度未能保存，请检查浏览器存储空间或隐私设置；当前游戏仍可继续');}
      return false;
    }
  },

  load() {
    let raw = null;
    try {
      raw = localStorage.getItem('changzheng_state');
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.coop = this.migrateCoop(data.coop);
      this.skills = { morse: data.skills?.morse === true };
      const course=data.skills?.morseCourse;
      if(course?.version===2&&Number.isInteger(course.step)&&course.step>=0&&course.step<=200)this.skills.morseCourse={version:2,step:course.step,mistakes:Array.isArray(course.mistakes)?course.mistakes.filter(n=>Number.isInteger(n)&&n>=0&&n<200):[]};
      this.storyPreparations = data.storyPreparations && typeof data.storyPreparations==='object' && !Array.isArray(data.storyPreparations) ? data.storyPreparations : {};
      this.character=null;
      if (data.characterId) {
        // 旧存档兼容：历史人物ID映射为新的基层指战员ID（合规整改）
        const legacyMap = { mao: 'commander', zhou: 'logistics' };
        const mappedId = legacyMap[data.characterId] || data.characterId;
        this.character = CHARACTERS.find(c => c.id === mappedId);
      }
      this.journalEntries=Array.isArray(data.journalEntries)?data.journalEntries.filter(v=>v&&typeof v==='object'&&!Array.isArray(v)).slice(-500):[];
      this.resources={troops:100,ammo:100,food:100,morale:100};
      for(const key of Object.keys(this.resources)){const value=data.resources?.[key];if(typeof value==='number'&&Number.isFinite(value))this.resources[key]=Math.max(0,Math.min(100,value));}
      const number=(v,f,min,max)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):f;
      const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
      const node=v=>Number.isInteger(v)&&v>=1&&v<=12;
      const legacyNode=v=>node(v)||(typeof v==='string'&&/^(?:[1-9]|1[0-2])$/.test(v));
      const rows=(key,valid,limit=500)=>Array.isArray(data[key])?data[key].filter(v=>object(v)&&valid(v)).slice(-limit):[];
      this.stamina=number(data.stamina,100,0,100);
      this.marchCount=Math.floor(number(data.marchCount,0,0,100000));
      this.preBattleChoices=rows('preBattleChoices',v=>['rest','march'].includes(v.choice));
      this.battleScores=rows('battleScores',v=>node(v.nodeId)&&typeof v.score==='number'&&Number.isFinite(v.score)).map(v=>({...v,score:number(v.score,0,0,100)}));
      this.intelRecords=rows('intelRecords',v=>node(v.nodeId)&&typeof v.success==='boolean');
      const buff=data.currentIntelBuff;
      this.currentIntelBuff=object(buff)&&node(buff.nodeId)&&buff.buff==='feasibility_plus_15'?{nodeId:buff.nodeId,buff:buff.buff}:null;
      this.rationRecords=rows('rationRecords',v=>node(v.nodeId)&&object(v.allocations)).map(v=>({...v,allocations:Object.fromEntries(Object.entries(v.allocations).slice(0,30).filter(([k])=>/^[a-z0-9_-]{1,30}$/i.test(k)).map(([k,val])=>[k,number(val,0,0,100)]))}));
      this.nodeSnapshots=rows('nodeSnapshots',v=>node(v.nodeId)&&object(v.resources)).map(v=>({...v,resources:Object.fromEntries(['troops','ammo','food','morale'].map(k=>[k,number(v.resources[k],100,0,100)]))}));
      this.medalRecords=rows('medalRecords',v=>node(v.nodeId)&&typeof v.svg==='string'&&v.svg.length<100000).map(v=>({...v,score:number(v.score,0,0,100)}));
      this.historyCardsUnlocked=Array.isArray(data.historyCardsUnlocked)?[...new Set(data.historyCardsUnlocked.filter(id=>typeof id==='string'&&id.length<100))].slice(0,100):[];
      this.mailboxRecords=rows('mailboxRecords',v=>typeof v.playerMessage==='string'&&typeof v.aiReply==='string',100).map(v=>({...v,playerMessage:v.playerMessage.slice(0,500),aiReply:v.aiReply.slice(0,2000)}));
      // Migrate numeric legacy records and our string writer to one canonical type.
      this.decisionTrace=rows('decisionTrace',v=>(legacyNode(v.nodeId)||v.nodeId==='award-demo-zunyi')&&typeof v.command==='string',30).map(v=>({...v,nodeId:String(v.nodeId)}));
      const memory=object(data.enemyCommanderMemory)?data.enemyCommanderMemory:{};
      this.enemyCommanderMemory={encounters:Math.floor(number(memory.encounters,0,0,100000)),tendencies:Object.fromEntries(['intel','collective','mobility','feint','direct'].map(k=>[k,Math.floor(number(memory.tendencies?.[k],0,0,100000))])),lastCounter:typeof memory.lastCounter==='string'?memory.lastCounter.slice(0,200):'',lastNodeId:legacyNode(memory.lastNodeId)?String(memory.lastNodeId):''};
      this.gameCompleted=data.gameCompleted===true;
      // 69 系列 additive 键清洗（缺失/畸形时保持 undefined，由各模块自带兜底）
      const spark=object(data.sparkMeta)?data.sparkMeta:null;
      this.sparkMeta=spark?{embers:Math.floor(number(spark.embers,0,0,1000000)),unlocks:Array.isArray(spark.unlocks)?[...new Set(spark.unlocks.filter(id=>typeof id==='string'&&id.length<100))].slice(0,200):[],modifiers:object(spark.modifiers)?{hardcore:spark.modifiers.hardcore===true}:{}}:undefined;
      this.run69=object(data.run69)?data.run69:undefined;
      return !!this.character;
    } catch (e) {
      // 坏档隔离：保留原文备份后再移除主键，避免下一次 save() 把残档彻底覆盖。
      if (raw) {
        try {
          localStorage.setItem('changzheng_state_corrupt_' + Date.now(), raw);
          /* [R5 2026-10-28] 数量上限：只保留最近 2 份，防反复损坏把配额写满（键已纳入玩家分域）。 */
          try {
            const stamps = Object.keys(localStorage)
              .map(k => { const m = k.match(/^changzheng_state_corrupt_(\d+)$/); return m ? Number(m[1]) : 0; })
              .filter(Boolean).sort((a, b) => a - b);
            while (stamps.length > 2) localStorage.removeItem('changzheng_state_corrupt_' + stamps.shift());
          } catch {}
          localStorage.removeItem('changzheng_state');
        } catch {}
        this.loadCorrupted = true;
        try { console.warn('[state] 存档解析失败，已隔离损坏备份', e); } catch {}
      }
      return false;
    }
  },

  clear() {
    this.coop = this.migrateCoop(null);
    this.skills = { morse: false };
    this.journalEntries = [];
    this.storyPreparations = {};
    this.sparkMeta = undefined;
    this.run69 = undefined;
    this.character = null;
    this.resources = { troops: 100, ammo: 100, food: 100, morale: 100 };
    this.stamina = 100;
    this.marchCount = 0;
    this.preBattleChoices = [];
    this.battleScores = [];
    this.intelRecords = [];
    this.rationRecords = [];
    this.nodeSnapshots = [];
    this.medalRecords = [];
    this.historyCardsUnlocked = [];
    this.mailboxRecords = [];
    this.decisionTrace = [];
    this.enemyCommanderMemory = { encounters: 0, tendencies: { intel: 0, collective: 0, mobility: 0, feint: 0, direct: 0 }, lastCounter: '', lastNodeId: '' };
    this.gameCompleted = false;
    this.currentIntelBuff = null;
    /* [R5 2026-10-28] 分域正则以 PlayerProfiles40.isScoped 为唯一来源；此内联副本仅为
       PlayerProfiles40 缺载时的兜底，与 save-transfer66 的兜底保持同款式（含 corrupt 备份键）。 */
    try { for(const key of Object.keys(localStorage))if(typeof PlayerProfiles40!=='undefined'&&PlayerProfiles40.isScoped?PlayerProfiles40.isScoped(key):/^(?:changzheng_(?:state(?:_corrupt_\d+)?|journey_v1|experience_v1|npc_dialogue_v1|companions_v1)|chishui_sandbox_v1|cz_pressure_v1_.*|cz_companions_v1|cz_player_intro_v32|cz_goals43)$/.test(key))localStorage.removeItem(key); } catch (e) { this.saveFailed=true; }
  }
};

/* [P0 修复 2026-10-26] 启动即同步加载存档：确保任何模块（如 spark69.init→refreshUnlocks→save）
   在 DOMContentLoaded 盲存档之前，GameState 已持有真实进度。此前 load() 要等 game-ui.js:238
   才执行，与 spark69 的自动初始化存在竞态——后者的空态 save() 会覆盖玩家整档（刷新即丢）。 */
GameState.init();
