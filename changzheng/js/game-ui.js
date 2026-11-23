/* ========================================
   长征·星火 — UI交互逻辑 v2
   角色选择 · 副本面板 · 战报日志 · 人物 · 设置
   战前抉择 · 资源HUD · 行军消耗
  AI指挥所 · QTE微操 · 电报战报 · 降级处理
   ======================================== */

// ===== 契约 v1.0 适配层 =====
function uiHTML(strings,...values){const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));return strings.reduce((out,part,i)=>out+part+(i<values.length?escape(values[i]):''),'');}
// roleId → npcId 映射（契约用 commander_1..4，内部用 wang_gui 等）
const ROLE_TO_NPC_ID = {
  'wang_gui': 'commander_1',
  'chen_xiaoman': 'commander_2',
  'he_wen': 'commander_3',
  'narrator': 'commander_4',
  'enemy_messenger': 'commander_1', // 不在契约中，映射到 commander_1
};

// 将契约 parse 响应适配为 UI 期望的格式
// 契约 v1.0 向后兼容扩展：新增 rating/suggestion/historyReview（决策三任务结果）
function _adaptParseData(data) {
  if (!data) return null;
  const emotionMap = { high: 'tense', medium: 'neutral', low: 'calm' };
  return {
    tactic: data.tactic,
    risk: data.risk,
    advantage: data.advantage,
    description: data.description,
    // 新增：决策三任务结果（ AI 评级 / 优化建议 / 史实复盘）
    rating: data.rating || '',                 // 优/良/中/差
    suggestion: data.suggestion || '',         // 符合史实的优化建议
    historyReview: data.historyReview || '',   // 真实历史决策复盘
    // 兼容旧 UI 字段
    emotion_tag: emotionMap[data.risk] || 'neutral',
    narrative_hint: data.description,
    actions: [{
      unit: '部队',
      verb: data.tactic,
      target: '',
      intensity: data.risk === 'high' ? '高' : data.risk === 'low' ? '低' : '中',
      feasibility: 0.5,
      risk_note: ''
    }],
    degraded: data.degraded === true
  };
}

// 将契约 report 响应适配为 UI 期望的格式
function _adaptReportData(data) {
  if (!data) return null;
  const emotionMap = { '胜利': { '辉煌': 'hopeful', '出色': 'hopeful', '艰难': 'tense' }, '受挫': { '失利': 'defeat' } };
  const emotion = (emotionMap[data.outcome] || {})[data.rating] || (data.outcome === '胜利' ? 'hopeful' : 'defeat');
  return {
    outcome: data.outcome,
    rating: data.rating,
    summary: data.summary,
    casualties: data.casualties,
    moraleChange: data.moraleChange,
    recommendation: data.recommendation,
    keyMoment: data.keyMoment,
    // 兼容旧 UI 字段
    narrative: data.summary,
    history_ref: null,
    suggestion: data.recommendation,
    emotion_tag: emotion,
    degraded: data.degraded === true
  };
}

// 将契约 npc/chat 响应适配为 UI 期望的格式
function _adaptChatData(data) {
  if (!data) return null;
  const moodMap = { positive: 'hopeful', neutral: 'calm', negative: 'tragic' };
  return {
    text: data.text,
    mood: data.mood,
    references: data.references || [],
    // 兼容旧 UI 字段
    reply: data.text,
    emotion_tag: moodMap[data.mood] || 'calm',
    citation: data.references && data.references.length > 0 ? { document_title: data.references[0], date: '' } : null,
    degraded: !!data.degraded, mode:data.mode, aiLabel:data.aiLabel
  };
}

// 将契约 history/compare 响应适配为 UI 期望的格式
function _adaptCompareData(data, level='luding') {
  if (!data) return null;
  const history = data.history || {};
  const player = data.player || {};
  // 从 history 事件构建 comparison 数组（兼容旧 UI 渲染）
  const comparison = [];
  for (const [key, event] of Object.entries(history)) {
    if(key!==level)continue;
    if (event && event.stats) {
      event.stats.forEach(([label, value]) => {
        comparison.push({ dimension: label, player_line: player.command||'本次实际任务记录', history_line: value, inferred: false });
      });
    }
  }
  const emotion = player.outcome === '胜利' ? 'hopeful' : 'defeat';
  return {
    player, history,
    // 兼容旧 UI 字段
    title: history[level]?.title || '本章任务复盘',
    comparison,
    conclusion: history[level]?.detail || '本章暂无模型生成的史实对照。',
    emotion_tag: emotion,
    evaluation: '',
    evaluation_title: '',
    score: null,
    rating: null,
    degraded: !!data.degraded, mode:data.mode, aiLabel:data.aiLabel
  };
}

// 时间线安全红线：各节点禁止出现的关键词（防止未来事件污染当前节点文案）
const TIMELINE_FORBIDDEN = {
  ruijin: ['大渡河', '泸定桥', '铁索', '攀爬', '湘江', '冲锋', '封锁线', '碉堡', '机枪'],
  xiangjiang: ['铁索', '泸定桥', '大渡河', '攀岩', '于都河', '浮桥', '金沙江'],
  zunyi: ['铁索', '泸定桥', '大渡河', '攀岩', '湘江', '冲锋', '渡河', '封锁线'],
  chishui: ['铁索', '泸定桥', '大渡河', '攀岩', '湘江', '封锁线'],
  jinsha: ['铁索', '泸定桥', '大渡河', '攀岩', '湘江', '封锁线'],
  dadu: ['铁索', '泸定桥', '攀爬', '湘江', '封锁线', '赤水'],
  luding: ['湘江', '封锁线', '赤水', '于都河', '浮桥', '金沙江'],
  snowmount: ['铁索', '泸定桥', '大渡河', '湘江', '封锁线', '渡河'],
  grassland: ['铁索', '泸定桥', '大渡河', '湘江', '封锁线', '雪山'],
  lazikou: ['铁索', '泸定桥', '大渡河', '湘江', '封锁线'],
  huining: ['铁索', '泸定桥', '大渡河', '攀岩', '湘江', '渡河'],
  wuqi: ['铁索', '泸定桥', '大渡河', '攀岩', '湘江', '渡河']
};

const GameUI = {
  ...GameUIBattle54, ...GameUIAudio54, ...GameUIServices54, ...GameUIReports54,
  dungeonPanel: null,
  journalPanel: null,
  charactersPanel: null,
  settingsPanel: null,
  toast: null,
  journalEntries: [],
  selectedCharId: null,
  prebattleCallback: null,
  bffStatus: 'unknown', // 'online' | 'degraded' | 'offline' | 'unknown'

  // ===== 指挥所状态 =====
  commandCurrentNode: null,
  commandParseData: null,
  commandFreeCommands: [],

  // ===== QTE状态 =====
  qteProgress: 0,
  qteBloodLevel: 0,
  qteClimbRate: 0, // 最近连点速率
  qteLastClickTime: 0,
  qteSlideTimer: null,
  qteBloodTimer: null,
  qteActive: false,
  qtePlayerDecisions: [],
  qteRound: 0,
  qteSceneText: '',
  qteTypewriterTimer: null,
  qteCurrentNode: null,

  // ===== 生死状态锁（核心：死亡后禁止一切过关判定）=====
  isPlayerDead: false,          // 本关玩家已牺牲/失利
  isGameOver: false,            // 本关已判负，处于失败闭环中
  _levelStartSnapshot: null,    // 进入本关前的资源/指令快照，用于 resetLevel()
  defeatPanel: null,            // 失败重试面板 DOM

  // ===== 电报状态 =====
  telegramTypewriterTimer: null,
  telegramAudioCtx: null,

  // ===== 结算状态 =====
  settlementCurrentNode: null,
  settlementCompareData: null,
  settlementReportData: null,
  settlementVoicePlaying: false,

  // ===== NPC对话状态 =====
  npcCurrentRole: null,
  npcCurrentLevel: null,
  npcChatHistory: [],
  npcTypewriterTimer: null,
  npcIsTyping: false,
  npcAudioElement: null,
  npcVoiceEnabled: true,

  // ===== 破译状态 =====
  decryptTimer: null,
  decryptTimeLeft: 90,
  decryptActive: false,
  decryptCurrentNode: null,
  decryptCurrentMode: 'morse', // 'morse' | 'cipher'
  decryptMorseIndex: 0,
  decryptMorseDecoded: '',
  decryptMorseMessage: null,
  decryptCipherMessage: null,
  decryptCipherSlots: [],
  decryptAudioCtx: null,
  decryptSuccess: false,

  // ===== 电报预加载缓存 =====
  telegramCache: new Map(),  // levelId → reportData

  // ===== 节点→关卡映射 =====
  nodeLevelMap: {
    1: { level: 'ruijin', scene: 'river_crossing' },
    2: { level: 'xiangjiang', scene: 'breakthrough' },
    3: { level: 'zunyi', scene: 'meeting' },
    4: { level: 'chishui', scene: 'crossing' },
    5: { level: 'jinsha', scene: 'river_crossing' },
    6: { level: 'dadu', scene: 'river_crossing' },
    7: { level: 'luding', scene: 'bridge_assault' },
    8: { level: 'snowmount', scene: 'mountain_climb' },
    9: { level: 'grassland', scene: 'marsh_crossing' },
    10: { level: 'lazikou', scene: 'pass_breakthrough' },
    11: { level: 'wuqi', scene: 'arrival' },
    12: { level: 'huining', scene: 'reunion' }
  },

  init() {
    this.dungeonPanel = document.getElementById('dungeonPanel');
    this.journalPanel = document.getElementById('journalPanel');
    this.charactersPanel = document.getElementById('charactersPanel');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.toast = document.getElementById('toast');

    this.bindEvents();
    document.getElementById('qteExit54')?.addEventListener('click',()=>this.returnToMap());
    this.initObsCinema();
    this.renderCharacters();

    // 初始化路由状态机：默认在路线Tab
    this.currentRoute = 'map';

    // 尝试加载存档
    GameState.init();
    if(GameState.loadCorrupted){GameState.loadCorrupted=false;this.showToast('存档读取失败，已保留损坏备份；本次从新进度开始');}
    this.journalEntries = GameState.journalEntries || [];
    if (!this.journalEntries.length) {
      (GameState.medalRecords || []).forEach(m => { const node=GAME_NODES.find(n=>n.id===m.nodeId); if(node)this.addJournalEntry(node); });
    }
    this.renderJournal();
    if (GameState.character) {
      // 有存档，跳过开场和角色选择，直接进入地图
      this.skipToIntro();
      // 恢复勋章墙
      this.renderMedalWall();
      // 通关则显示奖励入口
      if (GameState.gameCompleted) {
        document.getElementById('rewardEntries').style.display = 'flex';
      }
    }
  },

  bindEvents() {
    // 副本面板关闭
    document.getElementById('panelClose').addEventListener('click', () => {
      this.closeDungeonPanel();
    });

    // 副本面板返回按钮
    document.getElementById('panelBack').addEventListener('click', () => {
      this.closeDungeonPanel();
    });

    // 进入副本
    document.getElementById('btnEnter').addEventListener('click', () => {
      this.enterDungeon();
    });

    // 稍后再战
    document.getElementById('btnSkip').addEventListener('click', () => {
      this.closeDungeonPanel();
      this.showToast('稍后再战，革命尚未成功');
    });

    // 退出
    document.getElementById('btnExit').addEventListener('click', () => {
      this.closeDungeonPanel();
    });

    // 返回大地图路线界面
    document.getElementById('hudExitBtn').addEventListener('click', () => {
      this.returnToMap();
    });

    // 底部导航
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.onNavClick(btn);
      });
    });

    // 开场动画 → 角色选择
    document.getElementById('introBtn').addEventListener('click', () => {
      this.showCharSelect();
    });
    document.getElementById('awardDemoBtn').addEventListener('click', () => {
      this.showAwardDemo();
    });
    document.getElementById('awardDemoSettingsBtn')?.addEventListener('click', () => {
      this.showAwardDemo();
    });

    // 角色选择开始按钮
    document.getElementById('charSelectStart').addEventListener('click', () => {
      this.startWithChar();
    });

    // 战前抉择
    document.getElementById('prebattleRest').addEventListener('click', () => {
      this.handlePreBattleChoice('rest');
    });
    document.getElementById('prebattleMarch').addEventListener('click', () => {
      this.handlePreBattleChoice('march');
    });

    // 链路自检
    document.getElementById('linkCheckBtn').addEventListener('click', () => {
      this.runLinkCheck();
    });
    document.getElementById('bffConnectBtn').addEventListener('click', () => {
      this.autoConnectBff();
    });
    document.getElementById('obsSaveBtn').addEventListener('click', () => {
      this.saveAndTestObs();
    });
    document.getElementById('obsClearBtn').addEventListener('click', () => {
      CinemaAssets.setObsBaseUrl('');
      document.getElementById('obsBaseUrl').value='';
      document.getElementById('obsVideoStatus').textContent='未配置 · 使用手绘动画背景';
      this.showToast('已恢复SVG动画，视频不会再从OBS加载');
    });
    document.getElementById('linkcheckClose').addEventListener('click', () => {
      document.getElementById('linkcheckOverlay').classList.remove('open');
    });

    // ===== 指挥所事件 =====
    document.getElementById('commandSubmit').addEventListener('click', () => {
      this.submitCommand();
    });
    document.getElementById('commandConfirm').addEventListener('click', () => {
      this.confirmActions();
    });
    // ===== 战术磁贴多选 + 自定义补充 =====
    this.selectedTiles = [];
    document.querySelectorAll('.command-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const tileText = tile.dataset.tile;
        const idx = this.selectedTiles.indexOf(tileText);
        if (idx >= 0) {
          // 已选中 → 取消选中
          this.selectedTiles.splice(idx, 1);
          tile.classList.remove('selected');
        } else {
          // 未选中 → 选中
          this.selectedTiles.push(tileText);
          tile.classList.add('selected');
        }
        tile.setAttribute('aria-pressed', String(idx < 0));
        this.updateCommandDisplay();
      });
    });
    // 输入与预设可以组合；输入时不重建文本框。
    document.getElementById('commandInput').addEventListener('input', (e) => {
      const counter = document.getElementById('commandInputCounter');
      counter.textContent = `${e.target.value.length}/200`;
      this.updateCommandDisplay();
    });

    // ===== QTE事件 =====
    document.getElementById('qteClimbBtn').addEventListener('click', () => {
      this.onQteClimb();
    });

    // ===== 电报战报事件 =====
    document.getElementById('telegramClose').addEventListener('click', () => {
      this.closeTelegram();
    });

    // ===== 结算界面事件 =====
    document.getElementById('settlementContinueBtn').addEventListener('click', () => {
      this.closeSettlement();
    });
    document.getElementById('settlementVoiceBtn').addEventListener('click', () => {
      this.toggleConclusionVoice();
    });
    // 结算Tab切换
    document.getElementById('settlementTabReview').addEventListener('click', () => {
      this.switchSettlementTab('review');
    });
    document.getElementById('settlementTabDashboard').addEventListener('click', () => {
      this.switchSettlementTab('dashboard');
    });
    // 数据看板导出
    document.getElementById('dashboardExportBtn').addEventListener('click', () => {
      this.exportDashboardPNG();
    });

    // ===== 历史档案解锁事件 =====
    document.getElementById('archiveCloseBtn').addEventListener('click', () => {
      document.getElementById('archiveOverlay').classList.remove('open');
    });

    // ===== NPC对话事件 =====
    document.getElementById('npcCloseBtn').addEventListener('click', () => {
      this.closeNpcChat();
    });
    document.getElementById('npcSendBtn').addEventListener('click', () => {
      this.sendNpcMessage();
    });
    document.getElementById('npcInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.sendNpcMessage();
      }
    });

    // ===== 破译事件 =====
    document.getElementById('decryptTabMorse').addEventListener('click', () => {
      this.switchDecryptTab('morse');
    });
    document.getElementById('decryptTabCipher').addEventListener('click', () => {
      this.switchDecryptTab('cipher');
    });
    document.getElementById('decryptSubmitBtn').addEventListener('click', () => {
      this.submitDecrypt();
    });
    document.getElementById('decryptSkipBtn').addEventListener('click', () => {
      this.skipDecrypt();
    });
    document.getElementById('intelBuffCloseBtn').addEventListener('click', () => {
      document.getElementById('intelBuffOverlay').classList.remove('open');
    });
    // 物资分配事件绑定
    document.getElementById('rationSubmitBtn').addEventListener('click', () => {
      this.submitRationAlloc();
    });
    document.getElementById('rationSkipBtn').addEventListener('click', () => {
      this.skipRationAlloc();
    });
    document.getElementById('rationResultCloseBtn').addEventListener('click', () => {
      this.closeRationAndContinue();
    });

    // ===== 通关奖励体系事件 =====
    document.getElementById('btnHistoryCards').addEventListener('click', () => {
      this.openHistoryCards();
    });
    document.getElementById('btnTimeMailbox').addEventListener('click', () => {
      this.openMailbox();
    });
    document.getElementById('historyCardsCloseBtn').addEventListener('click', () => {
      document.getElementById('historyCardsOverlay').classList.remove('open');
    });
    document.getElementById('cardDetailCloseBtn').addEventListener('click', () => {
      document.getElementById('cardDetailOverlay').classList.remove('open');
    });
    document.getElementById('cardDetailAskBtn').addEventListener('click', () => {
      this.openHistoryQa(this._currentCardId);
    });
    // AI 全景语音解说（内容与奖励升级）
    document.getElementById('cardDetailNarrateBtn').addEventListener('click', () => {
      this.narrateHistoryCard(this._currentCardId);
    });
    document.getElementById('cardNarrationPlayBtn').addEventListener('click', () => {
      this.playNarrationSpeech();
    });
    // 生成勋章分享图
    document.getElementById('settlementShareBtn').addEventListener('click', () => {
      this.exportMedalShareImage();
    });
    document.getElementById('historyQaCloseBtn').addEventListener('click', () => {
      this.closeHistoryQa();
    });
    document.getElementById('historyQaSendBtn').addEventListener('click', () => {
      this.sendHistoryQa();
    });
    document.getElementById('historyQaInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendHistoryQa();
    });
    document.getElementById('mailboxCloseBtn').addEventListener('click', () => {
      document.getElementById('mailboxOverlay').classList.remove('open');
    });
    document.getElementById('mailboxSendBtn').addEventListener('click', () => {
      this.sendMailbox();
    });
  },

  // ===== 角色选择 =====
  showCharSelect() {
    const intro = document.getElementById('introOverlay');
    intro.classList.add('hidden');
    intro.style.display='none';this.renderCharSelect();const overlay=document.getElementById('charSelectOverlay');overlay.style.display='';overlay.classList.add('open');
    const back=document.getElementById('charSelectBack');back.onclick=()=>{overlay.classList.remove('open');overlay.style.display='none';if(typeof GameShell!=='undefined')GameShell.show();};
    overlay.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();back.click();}};back.focus({preventScroll:true});
  },

  renderCharSelect() {
    const grid = document.getElementById('charCardsGrid');
    grid.innerHTML = '';
    grid.classList.remove('has-selection');
    this.selectedCharId = null;

    // 重置引导提示
    const hintEl = document.getElementById('charSelectHint');
    if (hintEl) hintEl.classList.remove('hidden');

    // 重置按钮
    const startBtn = document.getElementById('charSelectStart');
    startBtn.disabled = true;

    const roleDuties = {
      commander: ['组织协作', '传达任务', '照顾全连'],
      logistics: ['物资清点', '补给运输', '节约分配'],
      soldier: ['行军警戒', '执行任务', '战友互助'],
      medic: ['伤员照料', '卫生保障', '协助转运']
    };

    CHARACTERS.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'char-card';
      card.dataset.charId = ch.id;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-pressed','false');card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click();}};

      const attrsHtml = `<div class="role-duty-label">岗位职责 · 教学设定</div>${roleDuties[ch.id].map(duty => `<span class="role-duty">${duty}</span>`).join('')}`;

      card.innerHTML = `
        <div class="char-card-check">✓</div>
        <div class="char-card-avatar">${ch.avatar}</div>
        <div class="char-card-name">${ch.name}</div>
        <div class="char-card-desc">${ch.desc}</div>
        <div class="char-attrs">${attrsHtml}</div>
      `;

      card.addEventListener('click', () => {
        if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.selectCard(card,ch.id,startBtn))return;
        // 排他选中：清除其他卡片选中态
        document.querySelectorAll('.char-card').forEach(c => {
          c.classList.remove('selected');c.setAttribute('aria-pressed','false');
        });
        // 选中当前卡片
        card.classList.add('selected');card.setAttribute('aria-pressed','true');startBtn.querySelector('.char-select-start-hint').textContent='已选择 · '+ch.name+'，点击出发';
        grid.classList.add('has-selection');
        this.selectedCharId = ch.id;

        // 隐藏引导提示
        if (hintEl) hintEl.classList.add('hidden');

        // 激活按钮
        startBtn.disabled = false;
      });

      grid.appendChild(card);
    });
  },

  startWithChar() {
    if (!this.selectedCharId) return;

    if(typeof CoopHotseat66!=='undefined')CoopHotseat66.configure();
    GameState.selectCharacter(this.selectedCharId);

    const overlay = document.getElementById('charSelectOverlay');
    overlay.classList.remove('open');
    setTimeout(() => {
      overlay.style.display = 'none';
      this.updateResourceHUD();
      this.showToast(`${GameState.character.name}，征程开始！点击路线上的节点开始剧情`);
      const hint = document.getElementById('nodeNavHint');
      if (hint) {
        setTimeout(() => { hint.style.display = 'none'; }, 5000);
      }
      this.checkBffHealth();if(typeof PlayerOnboarding!=='undefined')PlayerOnboarding.offer({force:true});
    }, 500);
  },

  // 有存档时跳过开场直接进入
  skipToIntro() {
    const intro = document.getElementById('introOverlay');
    const charSelect = document.getElementById('charSelectOverlay');
    intro.style.display = 'none';
    charSelect.style.display = 'none';
    this.updateResourceHUD();
    // 存档恢复后也检查链路
    this.checkBffHealth();
  },

  // ===== 资源HUD更新 =====
  updateResourceHUD() {
    if (!GameState.character) return;
    const r = GameState.resources;
    document.getElementById('statTroops').textContent = Math.round(r.troops);
    document.getElementById('statAmmo').textContent = Math.round(r.ammo);
    document.getElementById('statFood').textContent = Math.round(r.food);
    document.getElementById('statMorale').textContent = Math.round(r.morale);

    // 低资源警告色
    this.toggleLowResourceWarning('hudTroops', r.troops);
    this.toggleLowResourceWarning('hudAmmo', r.ammo);
    this.toggleLowResourceWarning('hudFood', r.food);
    this.toggleLowResourceWarning('hudMorale', r.morale);
  },

  toggleLowResourceWarning(elId, val) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (val < 30) {
      el.classList.add('low-resource');
    } else {
      el.classList.remove('low-resource');
    }
  },

  // 数值飘字动画
  floatStat(statKey, delta) {
    const floatEl = document.getElementById('float' + statKey);
    if (!floatEl) return;
    floatEl.textContent = (delta > 0 ? '+' : '') + delta;
    floatEl.classList.remove('show', 'neg', 'pos');
    void floatEl.offsetWidth; // 强制重排
    floatEl.classList.add(delta < 0 ? 'neg' : 'pos', 'show');
  },

  // ===== 行军消耗显示 =====
  showMarchResult(result) {
    if (!result) return;
    let msg = `行军消耗：粮食 -${result.foodCost}`;
    if (result.extraMoraleLoss > 0) {
      msg += ` · 士气 -${result.extraMoraleLoss}（粮食告急！）`;
    }
    this.showToast(msg);

    // 飘字动画
    this.floatStat('Food', -result.foodCost);
    if (result.extraMoraleLoss > 0) {
      this.floatStat('Morale', -result.extraMoraleLoss);
    }

    this.updateResourceHUD();

    // 被迫休整检查
    if (GameState.checkForcedRest()) {
      setTimeout(() => {
        this.showToast('⚠ 兵力不足30，被迫就地休整！');
      }, 2600);
    }
  },

  // ===== 战前抉择 =====
  showPreBattleChoice(node, callback) {
    // 容错：分粮结算等旧流程可能已清空 rationCurrentNode，此时不带节点，
    // 早先会在此处读 node.name 直接抛错，导致"继续"按钮点了没反应。
    if (!node || !node.id) {
      node = (typeof GAME_NODES !== 'undefined' && GAME_NODES.find(n => n.id === 9)) || this.commandCurrentNode || null;
      if (!node) { this.showToast('本章任务尚未准备好，请返回路线重新进入'); return; }
    }
    this.prebattleCallback = callback;
    document.getElementById('prebattleTitle').textContent = `战前抉择 · ${node.name}`;
    document.getElementById('prebattleSubtitle').textContent = `${node.date || ''} · ${node.location || ''}`;

    // 根据兵力状态调整提示
    const hintEl = document.getElementById('prebattleHint');
    if (GameState.resources.troops < 30) {
      hintEl.textContent = '⚠ 兵力严重不足，强烈建议就地休整';
      hintEl.style.color = '#D98A8A';
    } else if (GameState.resources.food < 20) {
      hintEl.textContent = '⚠ 粮食告急，休整将消耗更多粮食';
      hintEl.style.color = '#D9A668';
    } else {
      hintEl.textContent = '兵力充足，可据情选择';
      hintEl.style.color = '';
    }

    const overlay=document.getElementById('prebattleOverlay');
    const content=overlay.querySelector('.prebattle-content');
    if(!content.querySelector('.prebattle-exit56')){
      const back=document.createElement('button');back.type='button';back.className='prebattle-exit56';back.textContent='返回地图 · 保留进度';
      back.onclick=()=>{this.prebattleCallback=null;overlay.classList.remove('open');};content.prepend(back);
    }
    overlay.inert=false;overlay.classList.add('open');overlay.scrollTop=0;content.scrollTop=0;
  },

  handlePreBattleChoice(choice) {
    const result = GameState.preBattleChoice(choice);
    document.getElementById('prebattleOverlay').classList.remove('open');

    // 飘字动画
    if (choice === 'rest') {
      this.floatStat('Food', -result.foodCost);
      this.floatStat('Morale', result.moraleGain);
      this.showToast(`就地休整：士气 +${result.moraleGain}，体力恢复满`);
    } else {
      this.floatStat('Stamina', -result.staminaCost);
      this.floatStat('Food', -result.foodCost);
      this.floatStat('Morale', -result.moraleCost);
      this.showToast(`急行军：体力 -${result.staminaCost}，士气 -${result.moraleCost}`);
    }

    this.updateResourceHUD();

    // 执行回调（进入副本）
    if (this.prebattleCallback) {
      const cb = this.prebattleCallback;
      this.prebattleCallback = null;
      setTimeout(() => cb(), 500);
    }
  },

  // ===== BFF 链路健康检查 =====
  initObsCinema() {
    const input=document.getElementById('obsBaseUrl');
    const status=document.getElementById('obsVideoStatus');
    const base=CinemaAssets.obsBaseUrl();
    if(input)input.value=base;
    if(status)status.textContent=base?'已配置 · 短片按剧情加载':'未配置 · 使用手绘动画背景';
    CinemaAssets.bindVideoFallbacks(document);
    this._cinemaObserver?.disconnect();
    const bindAddedVideos=records=>{
        for(const record of records)for(const node of record.addedNodes){
          if(node.nodeType!==1)continue;
          const root=node.matches?.('video.cinema-video')?node.parentElement:node;
          CinemaAssets.bindVideoFallbacks(root);
        }
      };
      this._cinemaObserver=new MutationObserver(bindAddedVideos);
      this._cinemaObserver.observe(document.body,{childList:true,subtree:true});
  },

  async saveAndTestObs() {
    const input=document.getElementById('obsBaseUrl');
    const status=document.getElementById('obsVideoStatus');
    const button=document.getElementById('obsSaveBtn');
    let base=String(input.value||'').trim();
    if(!/^https:\/\//i.test(base)){status.textContent='请输入HTTPS开头的OBS公网目录';return;}
    base=base.replace(/\/+$/,'');button.disabled=true;button.textContent='测试001号视频…';status.textContent='正在检查OBS视频与浏览器播放权限';
    const probe=document.createElement('video');probe.muted=true;probe.preload='metadata';probe.src=`${base}/video-001.mp4`;
    const ok=await new Promise(resolve=>{const timer=setTimeout(()=>resolve(false),9000);probe.onloadedmetadata=()=>{clearTimeout(timer);resolve(true);};probe.onerror=()=>{clearTimeout(timer);resolve(false);};probe.load();});
    if(ok){CinemaAssets.setObsBaseUrl(base);status.textContent='连接成功 · 200条视频将按剧情编号加载';this.showToast('✓ OBS视频连接成功，重新进入场景即可播放');}
    else{status.textContent='001号视频不可播放 · 检查文件名、公开读取和Content-Type';this.showToast('OBS测试失败，仍保持SVG动画');}
    button.disabled=false;button.textContent='保存并测试';
  },

  

  

  // ===== 链路自检（4接口仪表盘） =====
  

  // ===== 返回大地图 =====
  

  // ===== 中止本关（中途退出用；不推进主线、不计完成、按进关前快照还原资源）=====
  

  // ===== 副本面板 =====
  showDungeonPanel(node) {
    const panel = this.dungeonPanel;

    document.getElementById('panelNodeType').textContent = node.typeLabel;
    document.getElementById('panelNodeType').className = 'panel-node-type type-' + node.type;
    document.getElementById('panelTitle').textContent = node.name;
    document.getElementById('panelSubtitle').textContent = `${node.date || '时间待考'} · ${node.location || '地点待考'}`;
    const panelCinema=document.getElementById('panelCinema');
    if(panelCinema)panelCinema.innerHTML=(typeof SceneLibrary!=='undefined'&&!SceneLibrary.ready?SceneLibrary.placeholder(node):typeof LongMarch3D!=='undefined'?LongMarch3D.markup(node):'')+CinemaAssets.chapterPrelude(node);

    // 史实文本从数据层取（game-history-data.js），带出处标注
    const lesson = LEARNING_TASKS[node.id];
    const historyData = lesson ? {text:lesson.steps.map(step => step.text).join('<br><br>'),source:lesson.source} : getNodeHistory(node.historyId || node.id);
    const panelHistoryEl = document.getElementById('panelHistory');
    const historySection = panelHistoryEl.closest('.panel-section');
    if (historyData && historyData.text) {
      if (historySection) historySection.style.display = '';
      panelHistoryEl.textContent=String(historyData.text).replace(/<br\s*\/?\s*>/gi,'\n');panelHistoryEl.style.whiteSpace='pre-line';const source=document.createElement('div');source.className='history-source';source.textContent='出处：'+historyData.source;panelHistoryEl.append(source);
    } else {
      // 无知识库条目时，隐藏整个历史背景区域（按史实红线不编造）
      if (historySection) historySection.style.display = 'none';
    }

    // 挑战列表
    const challengesEl = document.getElementById('panelChallenges');
    challengesEl.innerHTML = '';
    node.challenges.forEach(ch => {
      const item = document.createElement('div');
      item.className = 'challenge-item';
      item.innerHTML = `
        <div class="challenge-icon ${ch.icon}">${this.getChallengeIcon(ch.icon)}</div>
        <div>
          <div class="challenge-name">${ch.name}</div>
          <div class="challenge-desc">${ch.desc}</div>
        </div>
      `;
      if(ch.icon==='mortar'){
        item.classList.add('mortar-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['mortar_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof MortarGame!=='undefined')MortarGame.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='bluff'){
        item.classList.add('sidu-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['sidu67_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof SiduBluff67!=='undefined')SiduBluff67.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='guard'){
        item.classList.add('xjg67-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['xjg67_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof XiangjiangGuard67!=='undefined')XiangjiangGuard67.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='drum'){
        item.classList.add('drum67-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['drum67_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof HuishiDrum67!=='undefined')HuishiDrum67.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='scout'){
        item.classList.add('scout67-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['scout67_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof Scout67!=='undefined')Scout67.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='collect'||ch.icon==='snipe'){
        item.classList.add(ch.icon+'-entry');item.setAttribute('role','button');item.tabIndex=0;
        const run=()=>{ /* Preserve authored chapter gates before showing the imported game. */
          if(RouteMap.isNodeLocked(node.id)){this.showToast('尚未抵达此站，请先完成当前章节。');return;}
          if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run};NpcStory.startGate(node);return;}
          if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',run);return;}
          const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active;
          const current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active;
          const done=r=>{if(current()&&r?.win===true)this.completeDungeon(node);};
          const brief=ch.icon==='collect'?{t:'过草地 · 青稞采集',op:'FORAGE DETAIL',lines:['WASD/方向键移动，E/空格采摘；触屏左半屏拖动移动、点按青稞或按钮采摘。','绕开泥潭与水潭：踩泥潭会减速陷落，水潭不可通行。地图右上可缩放。','史实注脚：1935 年 8 月松潘草地，红军以青稞充饥、挖野菜度荒，走出「死亡之海」。']}:{t:'敌后狙击 · 1937',op:'SIDE OPERATION',lines:['番外推演：1937 年秋，红军改编八路军开赴华北前线，你在村口阻击进犯日军分队，掩护乡亲转移。','准星瞄准点击射击：士兵 100 分、军官 250 分、机枪手 150 分，爆头双倍；弹仓 8 发按 R 装填。','共三波每波 60 秒，守住阵地；机枪手出现红色标示时必须优先拔除。']};
          const d=document.createElement('dialog');d.className='xjg-brief';d.setAttribute('aria-labelledby','xjg-brief-t');
          d.innerHTML='<h3 id="xjg-brief-t">'+brief.t+'</h3><span class="xjg-sub">'+brief.op+'</span>'+brief.lines.map(l=>'<p>'+l+'</p>').join('')+'<div class="xjg-brief-actions"><button type="button" class="xjg-brief-go">开始 · START</button><button type="button" data-cancel>返回</button></div>';
          const previous=document.activeElement;d.addEventListener('close',()=>{d.remove();if(previous?.isConnected)previous.focus();},{once:true});document.body.append(d);d.showModal();
          let starting=false;d.querySelector('.xjg-brief-go').onclick=()=>{if(starting||!current())return;starting=true;d.close();if(ch.icon==='collect'){if(typeof GrasslandCollect!=='undefined')GrasslandCollect.open(node.id,done);}else if(typeof Sniper1937!=='undefined')Sniper1937.open(node.id,done);};
          d.querySelector('[data-cancel]').onclick=()=>d.close();
        };
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='lob'){
        item.classList.add('lob68-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['lazikou68_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof Lazikou68!=='undefined')Lazikou68.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='fire'){
        item.classList.add('fire68-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['fire68_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof Campfire68!=='undefined')Campfire68.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='snow'){
        item.classList.add('snow68-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['snow68_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof SnowRun68!=='undefined')SnowRun68.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='final'){
        item.classList.add('wuqi68-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['wuqi68_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof Wuqi68!=='undefined')Wuqi68.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='ration'){
        item.classList.add('g30-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['g30_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof Grassland30!=='undefined')Grassland30.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='lamp'){
        item.classList.add('gouba72-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['gouba72_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof Gouba72!=='undefined')Gouba72.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='poem'){
        item.classList.add('poem72-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['poem72_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof PoemScroll72!=='undefined')PoemScroll72.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='press'){
        item.classList.add('press72-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['press72_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof Press72!=='undefined')Press72.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='pontoon'){
        item.classList.add('wuj72-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['wujiang72_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof Wujiang72!=='undefined')Wujiang72.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='ferry'){
        item.classList.add('ferry72-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['ferry72_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof Ferry72!=='undefined')Ferry72.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(ch.icon==='yihai'){
        item.classList.add('yihai72-entry');item.setAttribute('role','button');item.tabIndex=0;
        const best=GameState.storyPreparations?.['yihai72_'+node.id];
        if(best&&Number.isFinite(best.score))item.querySelector('.challenge-desc').append(document.createTextNode(' · 历史最佳 '+best.score+' 分 · '+best.rating));
        const run=()=>{if(typeof Yihai72!=='undefined')Yihai72.open(node,()=>this.completeDungeon(node));};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      else if(["bridge","blanket","aid","zunyi","cipher","lantern","nightlamp","alliance","chains","fish","veg","matches"].includes(ch.icon)){
        item.classList.add('starfire73-entry');item.setAttribute('role','button');item.tabIndex=0;
        const entry=window.StarfireBook73?.entries.find(e=>e.icon===ch.icon&&e.node===node.id),best=entry&&window.StarfireBook73.best(entry);
        if(best)item.querySelector('.challenge-desc').append(document.createTextNode(' · 最佳 '+best.score+' 分'));
        const run=()=>{if(window.StarfireBook73)window.StarfireBook73.launch(ch.icon,node);else this.showToast('研学模块暂未加载，请刷新后重试。');};
        item.onclick=run;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      }
      challengesEl.appendChild(item);
    });

    // 奖励列表
    const rewardsEl = document.getElementById('panelRewards');
    rewardsEl.innerHTML = '';
    node.rewards.forEach(rw => {
      const item = document.createElement('div');
      item.className = 'reward-item';
      item.innerHTML = `<span>🏅</span> ${rw}`;
      rewardsEl.appendChild(item);
    });

    // 长征精神（从数据层取，spirit 是文学文案不含史实判断）
    const spiritData = getNodeSpirit(node.spiritId || node.id);
    document.getElementById('panelSpirit').textContent = spiritData ? spiritData.text : node.spiritKeyword;

    // 解锁状态
    const locked = RouteMap.isNodeLocked(node.id);
    const completed = RouteMap.isNodeCompleted(node.id);
    const btnEnter = document.getElementById('btnEnter');
    btnEnter.classList.remove('locked');
    if (locked) {
      btnEnter.textContent = '尚未抵达 · 先完成当前章节';
      btnEnter.disabled = true;
      btnEnter.classList.add('locked');
    } else if (completed) {
      btnEnter.textContent = '🔁 重温副本';
      btnEnter.disabled = false;
    } else {
      btnEnter.textContent = '走进这一程';
      btnEnter.disabled = false;
    }

    panel.dataset.nodeId = node.id;
    panel.dataset.nodeName = node.name;

    panel.classList.add('open');
    if(typeof Campaign55!=='undefined'){
      panel.querySelector('.campaign-open55')?.remove();
      const strategy=document.createElement('button');strategy.type='button';strategy.className='campaign-open55';strategy.textContent='战前部署（可选）';strategy.disabled=locked;strategy.onclick=()=>Campaign55.open(node,()=>this.enterDungeon());panel.querySelector('.panel-body')?.append(strategy);Campaign55.marker();
    }

    // 副本面板打开时显示返回按钮 + 禁用底部Tab栏
    document.getElementById('hudExitBtn').style.display = 'flex';
    document.querySelector('.nav-bottom').classList.remove('disabled');
  },

  closeDungeonPanel() {
    this.dungeonPanel.classList.remove('open');
    // 副本面板关闭时隐藏返回按钮 + 恢复底部Tab栏
    document.getElementById('hudExitBtn').style.display = 'none';
    document.querySelector('.nav-bottom').classList.remove('disabled');
  },

  // ===== 进入副本（遵义会议先破译，再战前抉择，再进指挥所） =====
  enterDungeon() {
    if (typeof NpcStory !== 'undefined' && !NpcStory.scripts.length) {
      this.showToast('剧情正在加载，请稍候再进入任务');
      return;
    }
    const panel = this.dungeonPanel;
    const nodeId = parseInt(panel.dataset.nodeId);
    const nodeName = panel.dataset.nodeName;
    const node = GAME_NODES.find(n => n.id === nodeId);

    if (!node) return;

    if (RouteMap.isNodeLocked(nodeId)) {
      this.showToast('此站尚未解锁，先完成当前副本');
      return;
    }

    this.closeDungeonPanel();

    if(typeof Campaign55!=='undefined'&&Campaign55.needsPlan(node)){Campaign55.open(node,()=>this.enterDungeon());return;}
    if (node.id === 1) { JourneyChapter.open(node); return; }
    if (node.id === 3) { this.showZunyiWarRoom(node); return; }
    if (node.id === 4) { ChishuiSandbox.open(node); return; }
    // 穿越草地先进入物资协作，再进入自定义决策与行军任务。
    if (nodeId === 9) {
      this.showRationAlloc(node);
      return;
    }
    if (node.type !== 'battle') { this.showLearningTask(node); return; }

    // 其他节点：直接战前抉择 → 指挥所
    this.showPreBattleChoice(node, () => {
      this.showCommandPost(node);
    });
  },

  showLearningTask(node, challengeCompleted = false) {
    if(!challengeCompleted&&typeof ChapterTasks54!=='undefined'&&ChapterTasks54.supports(node.id))return ChapterTasks54.open(node,()=>this.showLearningTask(node,true));
    const task = LEARNING_TASKS[node.id];
    if (!task) { this.showToast('本节点学习资料尚未准备完成'); return; }
    document.getElementById('learningTaskOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'learningTaskOverlay'; overlay.className = 'learning-overlay open';
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',`${node.name} · 本章行动`);
    const content = document.createElement('section'); content.className = 'learning-content';
    overlay.appendChild(content);
    const scene = document.createElement('aside');scene.className='learning-scene';
    const workspace=document.createElement('div');workspace.className='learning-workspace';content.append(scene,workspace);
    const planState={draft:'',savedCommand:'',savedKind:''};
    let step = 0;
    const render = () => {
      workspace.replaceChildren();
      let answerReady=false;
      const eyebrow = document.createElement('p'); eyebrow.className = 'learning-eyebrow'; eyebrow.textContent = `长征行记 / ${task.kind} · ${node.date} · ${step + 1} / ${task.steps.length}`;
      overlay.dataset.scene = SvgScenes.kind(node);
      const heading = document.createElement('h2'); heading.textContent = node.name;
      const body = document.createElement('p'); body.className = 'learning-body'; body.textContent = task.steps[step].text;
      const note = document.createElement('p'); note.className = 'learning-note'; note.textContent = node.id === 3 ? '以史料理解历史转折，以学习体会实事求是。互动不改变会议结论。' : '沿着先辈足迹，体会坚定信念、艰苦奋斗与团结互助。';
      const source = document.createElement('a'); source.href = task.source; source.target = '_blank'; source.rel = 'noopener'; source.textContent = '查看史料来源 ↗';
      const question = document.createElement('h3');question.className='learning-question';question.textContent = `阅读判断 · ${task.steps[step].question}`;
      const feedback = document.createElement('p');feedback.className='learning-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
      this.retainTaskScene(scene,node,{phase:'briefing',shotIndex:step},overlay);
      workspace.append(eyebrow, heading, body, note, source);
      const next=document.createElement('button');next.type='button';next.className='learning-next';next.textContent=step+1<task.steps.length?'确认安排，继续本章':'确认安排，完成本章';
      const hasPlan=()=>typeof DecisionCinema==='undefined'||!!planState.savedCommand&&planState.draft.trim()===planState.savedCommand;
      const refreshNext=()=>next.setAttribute('aria-disabled',String(!answerReady||!hasPlan()));
      if(typeof DecisionCinema!=='undefined')DecisionCinema.chapterDecisionControls(workspace,node,{state:planState,onChange:refreshNext});
      if(typeof NpcStory!=='undefined')NpcStory.attach(workspace,node,step===0?2:step===1?4:6);
      workspace.append(question);
      const answers=document.createElement('div');answers.className='learning-answers';
      const optionOrder=task.steps[step].options.map((_,index)=>index);
      if(optionOrder.length>=4)for(let i=optionOrder.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[optionOrder[i],optionOrder[j]]=[optionOrder[j],optionOrder[i]];}
      optionOrder.forEach(index => {
        const label=task.steps[step].options[index];
        const button = document.createElement('button');button.type='button';button.className = 'learning-option';button.textContent = label;button.setAttribute('aria-pressed','false');
        button.onclick = () => {
          if(!overlay.isConnected)return;
          for(const b of answers.children){b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));}
          answerReady=index===task.steps[step].answer;
          feedback.textContent=answerReady?'✓ 判断正确。确认上方方案后，点击下方按钮继续；不会自动跳过。':'请再读一次上方资料，按资料内容选择。';refreshNext();
        };
        answers.appendChild(button);
      });
      next.onclick=()=>{if(!overlay.isConnected)return;if(!hasPlan()){feedback.textContent='请先记录上方行动方案；刚输入的内容还没有提交。';workspace.querySelector('.chapter-plan-submit')?.focus();return;}if(!answerReady){feedback.textContent='请先完成本页的阅读判断。';question.focus();return;}if(typeof DecisionCinema!=='undefined')DecisionCinema.emit('fixed_decision',{nodeId:node.id,text:task.steps[step].options[task.steps[step].answer],context:task.steps[step].text,part:step+1});if(++step<task.steps.length)render();else{overlay.remove();this.completeDungeon(node);}};
      question.tabIndex=-1;refreshNext();
      const close = document.createElement('button');close.type='button';close.className = 'learning-close';close.textContent = '返回地图';close.onclick = () => overlay.remove();
      const filmArchive = document.createElement('div');filmArchive.innerHTML=CinemaAssets.alternatives(node);
      workspace.append(answers,feedback,next,filmArchive,close);
    };
    document.body.appendChild(overlay); render();
  },

  getDecisionHistoryContext(node) {
    const id=Number(node?.id||node)||2;
    const contexts={
      1:{title:'中央苏区出发',date:'1934年10月',problem:'按既定部署完成集结、物资衔接与渡河准备',focus:'隐蔽、秩序与基层协作',history:'1934年10月，中央红军从中央苏区多地出发，向于都地区集结并渡过于都河，开始战略转移。'},
      2:{title:'血战湘江',date:'1934年11月',problem:'在敌军封锁下保障渡江与队伍衔接',focus:'渡江时机、掩护与资源保存',history:'1934年11月底至12月初，中央红军突破湘江封锁线，付出了重大牺牲。'},
      3:{title:'遵义会议',date:'1935年1月15日至17日',problem:'总结经验教训，解决具有决定意义的军事和组织问题',focus:'史料核验、集体研判与行动调整',history:'1935年1月15日至17日，中共中央在遵义召开政治局扩大会议。遵义会议是党的历史上一个生死攸关的转折点。'},
      4:{title:'四渡赤水',date:'1935年1月至3月',problem:'在围追堵截中保持高度机动并寻找战机',focus:'情报、佯动、渡河次序与机动转换',history:'遵义会议后，中央红军在赤水河流域灵活机动，四渡赤水，打乱敌军围追堵截。'},
      5:{title:'巧渡金沙江',date:'1935年5月',problem:'利用有限渡运条件迅速组织过江',focus:'渡口控制、船只调度、隐蔽与警戒',history:'1935年5月，中央红军从皎平渡巧渡金沙江，摆脱了敌军的围追堵截。'},
      6:{title:'强渡大渡河',date:'1935年5月25日',problem:'在急流和对岸火力下建立渡河通路',focus:'侦察、火力掩护、船工协作与后续衔接',history:'1935年5月25日，红军先遣部队在安顺场强渡大渡河。'},
      7:{title:'飞夺泸定桥',date:'1935年5月29日',problem:'争取时间抵达泸定桥并夺取通道',focus:'急行军、突击协同、火力掩护与桥头衔接',history:'1935年5月29日，红军夺取泸定桥，为继续北上打开通路。'},
      8:{title:'翻越雪山',date:'1935年6月',problem:'在严寒、缺氧和复杂山地中保持队伍互助',focus:'保暖、节奏、体力分配与人员照应',history:'1935年6月，中央红军翻越夹金山等高寒雪山。'},
      9:{title:'穿越草地',date:'1935年8月',problem:'在泥沼、缺粮和恶劣天气中维持行军',focus:'路线辨认、口粮分配、互助与宿营判断',history:'1935年8月，红军穿越松潘草地，经历缺粮、泥沼和恶劣天气等严峻考验。'},
      10:{title:'突破腊子口',date:'1935年9月',problem:'突破地势险要、正面狭窄的隘口',focus:'正面牵制、侧翼迂回与行动同步',history:'1935年9月，红军突破腊子口天险，打开北上通道。'},
      11:{title:'吴起镇',date:'1935年10月',problem:'在陕北落脚并巩固队伍衔接',focus:'警戒、联络、休整与组织恢复',history:'1935年10月，中央红军到达陕北吴起镇。'},
      12:{title:'三大主力会师',date:'1936年10月',problem:'完成会师后的联络与组织衔接',focus:'联络、秩序、协作与胜利记忆',history:'1936年10月，红军三大主力在甘肃会宁等地胜利会师，长征胜利结束。'}
    };return contexts[id]||contexts[2];
  },

  buildLocalDecisionAssessment(command,moduleIds,node) {
    const text=String(command||''),ids=Array.isArray(moduleIds)?moduleIds:[],ctx=this.getDecisionHistoryContext(node);
    const has=(re,id)=>re.test(text)||ids.includes(id);const intel=has(/情报|侦察|核验|调查|观察|电报/,'intel');const collective=has(/协同|集体|配合|联络|研判|分工|掩护|分批|接应|协作|救护/,'collective');const mobility=has(/机动|路线|转移|迂回|渡河|撤离|急行/,'mobility');const feint=has(/佯动|迷惑|声东击西|假目标/,'feint');const direct=has(/强攻|冲锋|突击|正面|夺取/,'direct');
    const strengths=[intel,collective,mobility,feint,direct].filter(Boolean).length;const vague=text.length<18;let risk=12-strengths*3+(direct?5:0)+(feint&&!intel?4:0)+(vague?5:0);risk=Math.max(-10,Math.min(18,risk));
    const values={intel:intel?8:-5,coordination:collective?8:-4,mobility:mobility?8:-4,morale:collective?4:direct?2:0,risk};
    const weakness=!intel?'情报来源尚未核实':!collective?'各行动组之间的联络衔接不足':!mobility?'缺少备用路线和时机转换':direct&&!intel?'正面行动意图容易暴露':'行动链条较完整，但执行窗口仍可能变化';
    const counter=!intel?'制造相互矛盾的情报，诱使你在错误窗口行动':!collective?'切断联络并分别施压，放大各组行动时间差':!mobility?'收紧关键通道，迫使你在单一路线上消耗资源':feint?'减少对单一信号的反应，以多点侦察识别真实方向':direct?'构筑纵深阻滞，消耗你的行动资源':'改变追堵节奏，迫使你重新核验行动窗口';
    const score=Math.max(25,Math.min(98,46+strengths*10-risk+(text.length>=28?7:0)+new Set(ids).size*2));
    return {rating:score>=85?'优':score>=70?'良':score>=55?'中':'需完善',score:Math.round(score/5),display_score:score,analysis:`在“${ctx.title}”情境中，你的方案投入了${[intel&&'情报核验',collective&&'协同组织',mobility&&'机动准备',feint&&'佯动',direct&&'突击'].filter(Boolean).join('、')||'有限行动'}。`,opponent_response:`假想对手识别到：${weakness}；可能${counter}。`,next_counter:counter,consequence:`本方案围绕${ctx.focus}展开。${risk>6?'当前风险仍偏高，需要补足行动衔接。':'行动链较完整，但仍需根据现场变化调整。'}`,resource_changes:values,history_compare:ctx.history,predicted_pattern:GameState.getEnemyCommanderProfile().primary,causal_nodes:[{label:`${ctx.title}历史困境`,type:'decision',value:ctx.problem},{label:'你的行动顺序',type:'decision',value:ids.join(' → ')||text.slice(0,60)},{label:'直接影响',type:'effect',value:`情报${values.intel>0?'+':''}${values.intel} · 协同${values.coordination>0?'+':''}${values.coordination} · 机动${values.mobility>0?'+':''}${values.mobility}`},{label:'假想对手反制',type:'counter',value:counter},{label:'资源与风险',type:'outcome',value:`士气${values.morale>0?'+':''}${values.morale} · 风险${risk>0?'+':''}${risk}`},{label:'真实历史锚点',type:'outcome',value:ctx.history}]};
  },

  showAwardDemo() {
    document.getElementById('awardDemoOverlay')?.remove();
    const state={stage:0,selected:new Set(['intel','mobility']),order:['intel','mobility'],command:'',assessment:null,recorded:false};
    const overlay=document.createElement('div');overlay.id='awardDemoOverlay';overlay.className='award-demo-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','60秒决策亮点');
    const fromTitle=document.body.classList.contains('at-title'),previousFocus=document.activeElement;
    const closeDemo=()=>{overlay.remove();if(fromTitle&&typeof GameShell!=='undefined')GameShell.show();previousFocus?.focus?.({preventScroll:true});};
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeDemo();}});
    const panel=document.createElement('section');panel.className='award-demo-panel';overlay.append(panel);
    const modules=[
      {id:'intel',icon:'情',name:'核验多源情报',effect:'情报可信度提高，消耗行动时间'},
      {id:'collective',icon:'议',name:'建立集体研判',effect:'协同提高，决策周期延长'},
      {id:'mobility',icon:'路',name:'准备机动路线',effect:'降低封锁风险，消耗粮食'},
      {id:'feint',icon:'虚',name:'释放佯动信号',effect:'迷惑追兵，暴露风险上升'}
    ];
    const readModule=e=>e.dataTransfer.getData('application/x-cz-action')||modules.find(m=>m.name===e.dataTransfer.getData('text/plain'))?.id||'';
    const metrics={troops:68,food:46,morale:55,intel:42,risk:78};
    const head=(eyebrow,title,desc)=>{
      panel.replaceChildren();const h=document.createElement('header');h.className='award-demo-head';
      h.innerHTML=uiHTML`<span>${eyebrow}</span><h2>${title}</h2><p>${desc}</p>`;
      const timer=document.createElement('div');timer.className='award-demo-timer';timer.innerHTML='<b>速览</b><small>DECISION DEMO</small>';h.append(timer);const back=document.createElement('button');back.type='button';back.className='award-demo-back';back.textContent=fromTitle?'← 返回主菜单':'← 返回游戏';back.onclick=closeDemo;panel.append(back,h);
    };
    const metricGrid=(values=metrics)=>{const grid=document.createElement('div');grid.className='award-metrics';[['兵力','troops'],['粮食','food'],['士气','morale'],['情报','intel'],['追堵风险','risk']].forEach(([label,key])=>{const item=document.createElement('div');const v=Math.max(0,Math.min(100,Number(values[key])||0));item.innerHTML=uiHTML`<span>${label}</span><strong>${v}</strong><i><b style="width:${v}%"></b></i>`;if(key==='risk')item.classList.add('danger');grid.append(item);});panel.append(grid);};
    const footer=(label,fn)=>{const row=document.createElement('div');row.className='award-demo-actions';const close=document.createElement('button');close.type='button';close.textContent='退出体验';close.onclick=closeDemo;const next=document.createElement('button');next.type='button';next.className='primary';next.textContent=label;next.onclick=fn;row.append(close,next);panel.append(row);return next;};
    const render=()=>{
      if(state.stage===0){
        head('评委极速体验 / 01','湘江之后 · 生死抉择','队伍付出重大代价，追兵正在收紧包围。你只有一次机会重新建立判断与行动秩序。');
        const film=document.createElement('div');film.className='award-demo-film';film.innerHTML=SvgScenes.render({id:3,name:'遵义 · 决策研判'});panel.append(film);metricGrid();
        const alert=document.createElement('div');alert.className='award-crisis-alert';alert.innerHTML='<b>绝密急电</b><span>情报互相矛盾，既定行动方式受到质疑；必须在可靠信息、组织协同和快速机动之间作出取舍。</span>';panel.append(alert);
        footer('进入 AI 决策驾驶舱',()=>{state.stage=1;render();});
      }else if(state.stage===1){
        head('评委极速体验 / 02','拖动拼出你的决策链','把行动卡拖进托盘并调整先后顺序；顺序不同，会触发不同反制与资源结果。触屏设备也可点按卡片。');
        const layout=document.createElement('div');layout.className='award-command-layout';const choices=document.createElement('div');choices.className='award-module-grid';
        const addModule=id=>{if(!state.selected.has(id)){state.selected.add(id);state.order.push(id);}render();};
        modules.forEach(m=>{const b=document.createElement('button');b.classList.toggle('selected',state.selected.has(m.id));b.draggable=true;b.innerHTML=uiHTML`<i>${m.icon}</i><span><b>${m.name}</b><small>${m.effect}</small></span>`;b.onclick=()=>addModule(m.id);b.ondragstart=e=>{e.dataTransfer.setData('application/x-cz-action',m.id);e.dataTransfer.setData('text/plain',m.name);e.dataTransfer.effectAllowed='move';};choices.append(b);});
        const input=document.createElement('textarea');input.maxLength=240;input.placeholder='直接下达决策，例如：先核对三路情报，建立集体研判，同时准备两条机动路线，根据追堵变化快速切换……';input.value=state.command;input.oninput=()=>state.command=input.value;input.ondragover=e=>e.preventDefault();input.ondrop=e=>{const id=readModule(e),m=modules.find(m=>m.id===id);if(!m)return;e.preventDefault();input.value=[input.value.trim(),m.name].filter(Boolean).join('，然后');state.command=input.value;};
        const builder=document.createElement('div');builder.className='award-builder';const tray=document.createElement('div');tray.className='award-action-tray';tray.innerHTML='<header><b>行动托盘</b><small>拖动卡片重新排序 · 点击已放入的卡片可撤回</small></header>';
        const dropAt=(id,index)=>{if(!modules.some(m=>m.id===id))return;state.order=state.order.filter(x=>x!==id);state.order.splice(index,0,id);state.selected.add(id);render();};
        state.order.filter(id=>state.selected.has(id)).forEach((id,index)=>{const m=modules.find(x=>x.id===id);if(!m)return;const card=document.createElement('button');card.className='award-tray-card';card.draggable=true;card.innerHTML=uiHTML`<em>${index+1}</em><b>${m.name}</b><small>${m.effect}</small><span>×</span>`;card.onclick=()=>{state.selected.delete(id);state.order=state.order.filter(x=>x!==id);render();};card.ondragstart=e=>{e.dataTransfer.setData('application/x-cz-action',id);e.dataTransfer.setData('text/plain',m.name);};card.ondragover=e=>e.preventDefault();card.ondrop=e=>{e.preventDefault();dropAt(readModule(e),index);};tray.append(card);});
        tray.ondragover=e=>{e.preventDefault();tray.classList.add('dragover');};tray.ondragleave=()=>tray.classList.remove('dragover');tray.ondrop=e=>{e.preventDefault();tray.classList.remove('dragover');dropAt(readModule(e),state.order.length);};
        builder.append(tray,input);layout.append(choices,builder);panel.append(layout);metricGrid();
        const memory=GameState.getEnemyCommanderProfile();const memoryBox=document.createElement('aside');memoryBox.className='enemy-memory-preview';memoryBox.innerHTML=uiHTML`<b>AI 敌方记忆 · ${memory.encounters} 次交锋</b><span>${memory.summary}</span><small>${memory.encounters?'识别置信度 '+memory.confidence+'% · 本轮行为将影响下一节点反制':'尚未建立画像 · 本轮是第一次交锋'}</small>`;panel.append(memoryBox);
        const hint=document.createElement('p');hint.className='award-demo-hint';hint.textContent='本地因果引擎立即形成差异化结果；AI 在3.5秒内返回时增强解释，不再让页面长期等待。';panel.append(hint);
        const run=footer('立即推演 · AI 增强',async()=>{let command=input.value.trim();if(!state.selected.size&&!command){hint.textContent='选择至少一张行动卡，或直接写出你的安排。两种方式都可单独提交。';return;}if(!command)command=state.order.filter(id=>state.selected.has(id)).map(id=>modules.find(m=>m.id===id)?.name).filter(Boolean).join('，然后');state.command=command;run.disabled=true;run.textContent='正在计算因果链…';const ordered=state.order.filter(id=>state.selected.has(id));const names=ordered.map(id=>modules.find(m=>m.id===id)?.name).filter(Boolean);const local=this.buildLocalDecisionAssessment(command,ordered,{id:3});const cloud=await Promise.race([apiZunyiAssess(command,names,{source:state.selected.has('intel')?5:2,military:state.selected.has('mobility')?5:3,organization:state.selected.has('collective')?5:2},GameState.getEnemyCommanderProfile()).catch(()=>null),new Promise(resolve=>setTimeout(()=>resolve(null),3500))]);if(!overlay.isConnected)return;state.assessment=local;if(cloud&&!cloud.degraded&&cloud.analysis){state.assessment.analysis=cloud.analysis;state.assessment.ai_mode='AI 增强';}else state.assessment.ai_mode='本地即时因果';GameState.recordStrategicDecision({nodeId:'award-demo-zunyi',nodeName:'遵义会议决策沙盘',command,modules:ordered,outcome:state.assessment.rating,score:state.assessment.display_score,counter:state.assessment.next_counter,causalNodes:state.assessment.causal_nodes});state.recorded=true;state.stage=2;render();});
      }else{
        const a=state.assessment||{rating:'中',score:12,analysis:'本地决策模型已完成推演。',opponent_response:'对手将利用情报与协同的空隙继续施加追堵压力。',consequence:'方案在可靠信息和行动速度之间仍需平衡。',resource_changes:{intel:5,coordination:3,mobility:5,morale:2,risk:-2},history_compare:'1935年1月15日至17日，中共中央在遵义召开政治局扩大会议，集中解决当时具有决定意义的军事和组织问题。'};
        head('评委极速体验 / 03','AI 对抗推演完成','同一历史困境，不同指令将得到不同反制、资源变化和决策画像。');
        const delta=a.resource_changes||{},result={troops:metrics.troops,food:Math.max(0,metrics.food-(state.selected.has('mobility')?7:2)),morale:Math.max(0,metrics.morale+(Number(delta.morale)||0)),intel:Math.max(0,metrics.intel+(Number(delta.intel)||0)),risk:Math.max(0,metrics.risk+(Number(delta.risk)||0))};metricGrid(result);
        const cards=document.createElement('div');cards.className='award-result-grid';[['AI 对手响应',a.opponent_response],['决策收益与代价',a.consequence],['历史真实线',a.history_compare]].forEach(([title,text])=>{const article=document.createElement('article');const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=text;article.append(h,p);cards.append(article);});panel.append(cards);
        const causal=document.createElement('section');causal.className='causal-decision-tree';const causalTitle=document.createElement('div');causalTitle.className='causal-tree-title';causalTitle.innerHTML='<span>可解释 AI</span><h3>本轮决策因果树</h3>';causal.append(causalTitle);
        const causalNodes=(Array.isArray(a.causal_nodes)&&a.causal_nodes.length?a.causal_nodes:[{label:'你的自由指令',type:'decision',value:state.command},{label:'能力投入',type:'effect',value:[...state.selected].map(id=>modules.find(m=>m.id===id)?.name).join('、')},{label:'假想对手反制',type:'counter',value:a.next_counter||a.opponent_response},{label:'资源与风险结果',type:'outcome',value:a.consequence}]).slice(0,8);
        const causalFlow=document.createElement('div');causalFlow.className='causal-tree-flow';causalNodes.forEach((node,index)=>{const item=document.createElement('article');item.className=`causal-node ${node.type||'effect'}`;item.innerHTML=uiHTML`<small>${String(index+1).padStart(2,'0')}</small><b>${node.label||'影响节点'}</b><span>${node.value||''}</span>`;causalFlow.append(item);});causal.append(causalFlow);panel.append(causal);
        const learned=GameState.getEnemyCommanderProfile();const commander=document.createElement('section');commander.className='enemy-commander-card';commander.innerHTML=uiHTML`<div><small>跨关 AI 敌方指挥官</small><h3>${learned.primary}</h3><p>${learned.summary}。${a.next_counter||learned.lastCounter||'下一节点将根据本轮选择调整追堵重点。'}</p></div><strong>${learned.encounters?learned.confidence+'%':'待观察'}<small>${learned.encounters?'识别置信度':'尚未建立画像'}</small></strong>`;panel.append(commander);
        const trust=document.createElement('div');trust.className='award-trust-chain';
        [['01','史实护栏','会议日期、性质与历史定位锁定'],['02','AI 推演','只模拟玩家方案与对手反制'],['03','数值模型','五维变化来自行动链和 AI评估'],['04','结果可追溯','保留指令、模块与模型模式']].forEach(([n,title,copy])=>{const item=document.createElement('div');item.innerHTML=uiHTML`<b>${n}</b><span><strong>${title}</strong><small>${copy}</small></span>`;trust.append(item);});panel.append(trust);
        const profile=document.createElement('div');profile.className='award-profile';const score=Number(a.display_score)||Math.min(100,55+(Number(a.score)||10)*2);profile.innerHTML=uiHTML`<span>你的决策画像 · ${a.ai_mode||'因果推演'}</span><strong>${state.selected.has('intel')?'审慎情报型':'快速行动型'} · ${a.rating||'中'}</strong><b>${score} 分</b>`;panel.append(profile);
        const row=document.createElement('div');row.className='award-demo-actions';const again=document.createElement('button');again.textContent='换一种方案验证因果变化';again.onclick=()=>{state.stage=1;state.assessment=null;state.recorded=false;render();};const report=document.createElement('button');report.textContent='导出课堂复盘';report.onclick=()=>this.exportClassroomReport(state,a,score,result,modules);const share=document.createElement('button');share.className='primary';share.textContent='保存我的决策勋章';share.onclick=()=>this.exportAwardCard(a,score,result);const full=document.createElement('button');full.textContent='进入完整长征';full.onclick=()=>{closeDemo();if(typeof GameShell!=='undefined')GameShell.enter();else this.showCharSelect();};row.append(again,report,share,full);panel.append(row);
      }
    };
    document.body.append(overlay);render();overlay.querySelector('.award-demo-back')?.focus({preventScroll:true});
  },

  exportAwardCard(assessment,score,metrics) {
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const ctx=canvas.getContext('2d');
    const g=ctx.createLinearGradient(0,0,1080,1440);g.addColorStop(0,'#251a1b');g.addColorStop(.55,'#702d28');g.addColorStop(1,'#122a31');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1440);
    ctx.fillStyle='#d2aa68';ctx.fillRect(72,72,936,3);ctx.font='36px serif';ctx.fillText('★  长征·星火',72,145);ctx.fillStyle='#f4dfb3';ctx.font='bold 72px serif';ctx.fillText('我的长征决策画像',72,270);
    ctx.fillStyle='#c6b28f';ctx.font='30px sans-serif';ctx.fillText(assessment.ai_mode||'本地任务推演',72,325);ctx.fillStyle='#f0c77e';ctx.font='bold 112px sans-serif';ctx.fillText(String(score),72,500);ctx.font='30px sans-serif';ctx.fillText('综合决策分',275,492);
    const entries=[['情报可信',metrics.intel],['士气',metrics.morale],['机动准备',Math.max(0,100-metrics.risk)],['风险控制',Math.max(0,100-metrics.risk)]];entries.forEach(([label,v],i)=>{const y=610+i*105;ctx.fillStyle='#dcc9a5';ctx.font='28px sans-serif';ctx.fillText(label,72,y);ctx.fillStyle='#221a18';ctx.fillRect(250,y-24,690,22);ctx.fillStyle=i===3?'#ca705b':'#d7a657';ctx.fillRect(250,y-24,Math.min(690,690*v/100),22);ctx.fillStyle='#f1d7a5';ctx.fillText(String(v),955,y);});
    ctx.fillStyle='#ffffff12';ctx.fillRect(72,1040,936,210);ctx.fillStyle='#e9c98d';ctx.font='bold 34px serif';ctx.fillText(`决策评价 · ${assessment.rating||'中'}`,105,1100);ctx.fillStyle='#e4d7bf';ctx.font='25px sans-serif';const text=String(assessment.analysis||assessment.consequence||'AI 已完成决策推演。').slice(0,72);for(let i=0;i<3;i++)ctx.fillText(text.slice(i*24,(i+1)*24),105,1155+i*39);
    ctx.fillStyle='#baa77f';ctx.font='23px sans-serif';ctx.fillText('历史没有如果，但每一次推演都让我们更理解选择的重量。',72,1340);ctx.fillText('保存这份行记，记下你在山河间的选择。',72,1385);
    const link=document.createElement('a');link.download=`长征星火-决策勋章-${score}.png`;link.href=canvas.toDataURL('image/png');document.body.appendChild(link);link.click();link.remove();
  },

  exportClassroomReport(state,assessment,score,metrics,modules) {
    const chosen=[...state.selected].map(id=>modules.find(m=>m.id===id)?.name).filter(Boolean);
    const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const delta=assessment.resource_changes||{};
    const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>长征星火课堂复盘</title><style>body{font:16px/1.8 system-ui;max-width:900px;margin:40px auto;padding:0 24px;color:#2d2923}h1{color:#8b2e25;border-bottom:3px solid #b79258;padding-bottom:12px}h2{margin-top:28px;color:#6e342c}.score{font-size:42px;color:#9b3328}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.grid b{padding:12px;background:#eee4d2;text-align:center}blockquote{background:#f5efe4;border-left:4px solid #a54a39;padding:12px 18px;margin:0}small{color:#756c60}@media print{button{display:none}}</style><h1>《长征·星火》AI决策课堂复盘</h1><p><b class="score">${score}</b> 分　决策画像：${esc(assessment.rating||'中')}</p><h2>学生决策</h2><p>行动模块：${esc(chosen.join(' → '))}</p><blockquote>${esc(state.command)}</blockquote><h2>AI 对抗推演</h2><p><b>对手响应：</b>${esc(assessment.opponent_response)}</p><p><b>收益与代价：</b>${esc(assessment.consequence)}</p><div class="grid"><b>情报 ${Number(delta.intel)||0}</b><b>协同 ${Number(delta.coordination)||0}</b><b>机动 ${Number(delta.mobility)||0}</b><b>士气 ${Number(delta.morale)||0}</b><b>风险 ${Number(delta.risk)||0}</b></div><h2>历史真实线</h2><p>${esc(assessment.history_compare)}</p><h2>课堂讨论建议</h2><ol><li>方案在哪些地方依赖未经核验的情报？</li><li>怎样兼顾集体研判与行动速度？</li><li>玩家推演与真实历史事实的边界在哪里？</li></ol><small>本报告记录虚构教学推演，不改变真实历史结论；AI输出应结合已核定史料教学。</small><p><button onclick="print()">打印或另存为PDF</button></p></html>`;
    const blob=new Blob([html],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.download=`长征星火-课堂复盘-${score}.html`;link.href=url;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  },

  showZunyiWarRoom(node) {
    document.getElementById('zunyiChapterOverlay')?.remove();
    const state={stage:0,renderedStage:0,timeline:[],budget:{source:4,military:4,organization:4},plan:[],assessment:null,score:0};
    const overlay=document.createElement('div');overlay.id='zunyiChapterOverlay';overlay.className='zunyi-chapter-overlay zunyi-war-room';
    const content=document.createElement('section');content.className='zunyi-chapter';overlay.appendChild(content);
    const records=[
      {id:'arrival',date:'1935年1月上旬',title:'进占遵义',detail:'中央红军进占遵义，为会议召开形成条件。'},
      {id:'meeting',date:'1月15日至17日',title:'政治局扩大会议',detail:'集中解决当时具有决定意义的军事和组织问题。'},
      {id:'meaning',date:'历史定位',title:'生死攸关的转折点',detail:'遵义会议是党的历史上一个生死攸关的转折点。'}
    ];
    const planTiles=[
      {id:'source',label:'核对史料出处',icon:'档'},
      {id:'military',label:'复盘军事问题',icon:'图'},
      {id:'organization',label:'梳理组织问题',icon:'纲'},
      {id:'mobility',label:'保留机动预案',icon:'路'},
      {id:'collective',label:'建立集体研判',icon:'议'}
    ];
    const shell=(step,title,copy)=>{
      content.replaceChildren();
      const head=document.createElement('header');head.className='zunyi-head';
      const eyebrow=document.createElement('p');eyebrow.textContent=`遵义 · 会议推演室 / ${step}`;
      const h=document.createElement('h2');h.textContent=title;
      const intro=document.createElement('span');intro.textContent=copy;
      head.append(eyebrow,h,intro);
      const film=document.createElement('div');film.className='zunyi-film';this.retainTaskScene(film,node,{phase:state.stage<2?'briefing':'resolve',shotIndex:state.stage},overlay);
      const progress=document.createElement('div');progress.className='zunyi-mission-progress';
      ['复原档案','配置研判','下达方案','历史对照'].forEach((label,i)=>{const item=document.createElement('span');item.textContent=`0${i+1} ${label}`;item.classList.toggle('active',i===state.stage);item.classList.toggle('done',i<state.stage);progress.append(item);});
      content.append(head,progress,film);
      if(typeof NpcStory!=='undefined')NpcStory.attach(content,node,[2,3,4,6][state.stage]||2);
    };
    const actions=(label,handler)=>{
      const row=document.createElement('div');row.className='zunyi-actions';
      const exit=document.createElement('button');exit.className='zunyi-quiet';exit.textContent='退出推演';exit.onclick=()=>{state.assessmentAbort?.abort();overlay.remove();};
      const next=document.createElement('button');next.className='zunyi-next';next.textContent=label;next.onclick=handler;
      if(state.stage>0){const back=document.createElement('button');back.className='zunyi-back';back.type='button';back.textContent='返回上一步';back.onclick=()=>{state.assessmentAbort?.abort();state.revision=(state.revision||0)+1;state.stage--;render();};row.append(back);}row.append(exit,next);content.append(row);return next;
    };
    const status=text=>{const p=document.createElement('p');p.className='zunyi-status';p.setAttribute('role','status');p.textContent=text;content.append(p);return p;};
    const render=()=>{const changed=state.renderedStage!==state.stage;const scroll=changed?0:overlay.scrollTop;const contentScroll=changed?0:content.scrollTop;const focused=content.contains(document.activeElement)?document.activeElement.getAttribute('aria-label'):null;state.renderedStage=state.stage;
      if(state.stage===0){
        shell('任务一','复原会议档案时间线','把三份档案拖到桌面轨道，按历史进程排列。也可依次点击档案，移动端同样可玩。');
        const board=document.createElement('div');board.className='zunyi-timeline-board';
        const rail=document.createElement('div');rail.className='zunyi-timeline-rail';
        for(let i=0;i<3;i++){
          const slot=document.createElement('div');slot.className='zunyi-timeline-slot';slot.dataset.index=i;
          const id=state.timeline[i];const record=records.find(r=>r.id===id);
          if(record){
            slot.classList.add('filled');
            const date=document.createElement('small');date.textContent=record.date;
            const title=document.createElement('b');title.textContent=record.title;
            const controls=document.createElement('div');controls.className='zunyi-order-controls';
            const up=document.createElement('button');up.type='button';up.textContent='↑';up.title='向前移动';up.setAttribute('aria-label','向前移动'+record.title);up.disabled=i===0;up.onclick=e=>{e.stopPropagation();[state.timeline[i-1],state.timeline[i]]=[state.timeline[i],state.timeline[i-1]];render();};
            const down=document.createElement('button');down.type='button';down.textContent='↓';down.title='向后移动';down.setAttribute('aria-label','向后移动'+record.title);down.disabled=i===state.timeline.length-1;down.onclick=e=>{e.stopPropagation();[state.timeline[i+1],state.timeline[i]]=[state.timeline[i],state.timeline[i+1]];render();};
            const remove=document.createElement('button');remove.type='button';remove.textContent='撤回';remove.onclick=e=>{e.stopPropagation();state.timeline.splice(i,1);render();};
            controls.append(up,down,remove);slot.append(date,title,controls);
          }
          else slot.textContent=`档案位 ${i+1}`;
          slot.ondragover=e=>{e.preventDefault();slot.classList.add('drag-over');};slot.ondragleave=()=>slot.classList.remove('drag-over');
          slot.ondrop=e=>{e.preventDefault();const rid=e.dataTransfer.getData('text/plain');if(rid&&!state.timeline.includes(rid)){state.timeline.splice(i,0,rid);state.timeline=state.timeline.slice(0,3);render();}};
          rail.append(slot);
        }
        const tray=document.createElement('div');tray.className='zunyi-record-tray';
        [records[1],records[2],records[0]].filter(r=>!state.timeline.includes(r.id)).forEach(record=>{
          const card=document.createElement('button');card.className='zunyi-record-card';card.draggable=true;
          card.innerHTML=`<small>${record.date}</small><b>${record.title}</b><span>${record.detail}</span>`;
          card.ondragstart=e=>e.dataTransfer.setData('text/plain',record.id);
          card.onclick=()=>{state.timeline.push(record.id);render();};tray.append(card);
        });
        board.append(rail,tray);content.append(board);
        const msg=status(`已装入 ${state.timeline.length}/3 份档案。使用卡片内的 ↑ ↓ 直接换位，拖拽并非必需。`);
        actions('锁定时间线',()=>{const correct=['arrival','meeting','meaning'];if(state.timeline.length<3){msg.textContent='还有档案未装入时间线。';return;}if(!correct.every((id,i)=>state.timeline[i]===id)){msg.textContent='时间线存在错位，请根据日期重新排列。';return;}state.score=30;state.stage=1;render();});
      }else if(state.stage===1){
        shell('任务二','配置会议研判力量','你有12点研判资源。＋从其他组调入1点，−回收1点；无需拖动。');
        const panel=document.createElement('div');panel.className='zunyi-budget-panel';
        const labels={source:['史料核验组','检查出处与时间'],military:['军事复盘组','分析此前作战问题'],organization:['组织研究组','梳理组织问题']};
        Object.entries(state.budget).forEach(([key,value])=>{
          const row=document.createElement('div');row.className='zunyi-budget-row';
          const text=document.createElement('div');text.innerHTML=`<b>${labels[key][0]}</b><small>${labels[key][1]}</small>`;
          const meter=document.createElement('div');meter.className='zunyi-budget-meter';meter.innerHTML=`<i style="width:${value*10}%"></i>`;
          const controls=document.createElement('div');controls.className='zunyi-budget-controls';
          const minus=document.createElement('button');minus.textContent='−';minus.setAttribute('aria-label','减少'+labels[key][0]);minus.disabled=value<=1;minus.onclick=()=>{if(state.budget[key]>1){state.budget[key]--;render();}};
          const amount=document.createElement('strong');amount.textContent=value;
          const plus=document.createElement('button');plus.textContent='＋';plus.setAttribute('aria-label','增加'+labels[key][0]);plus.onclick=()=>{const total=Object.values(state.budget).reduce((a,b)=>a+b,0);if(total<12){state.budget[key]++;render();}else{const donor=Object.keys(state.budget).filter(k=>k!==key&&state.budget[k]>1).sort((a,b)=>state.budget[b]-state.budget[a])[0];if(donor){state.budget[donor]--;state.budget[key]++;render();}}};
          controls.append(minus,amount,plus);row.append(text,meter,controls);panel.append(row);
        });
        const total=Object.values(state.budget).reduce((a,b)=>a+b,0);
        const readout=document.createElement('div');readout.className='zunyi-live-readout';
        readout.innerHTML=`<span>可用算力 <b>${12-total}</b></span><span>证据可信度 <b>${Math.min(100,state.budget.source*18)}%</b></span><span>问题覆盖率 <b>${Math.min(100,(state.budget.military+state.budget.organization)*10)}%</b></span>`;
        content.append(panel,readout);
        const msg=status(total===12?'资源已全部部署。不同配置会影响最终研判分。':`保留 ${12-total} 点预备协作资源；本程完成后可在后续部署中抵消额外损耗。`);
        actions('启动研判',()=>{if(total<8||total>12){msg.textContent='请部署8至12点资源，其余可保留。';return;}state.reserve=12-total;state.score=30+Math.min(30,state.budget.source*3+Math.min(state.budget.military,state.budget.organization)*4);state.stage=2;render();});
      }else if(state.stage===2){
        shell('任务三','向 AI 下达决策方案','把决策模块编成行动链，再用自然语言补充方案。AI 将模拟信息不足、协同失误和对手追堵等后果；真实历史结论保持不变。');
        const consoleBox=document.createElement('div');consoleBox.className='zunyi-command-console';
        const modules=document.createElement('div');modules.className='zunyi-plan-modules';
        planTiles.filter(t=>!state.plan.includes(t.id)).forEach(tile=>{const b=document.createElement('button');b.draggable=true;b.innerHTML=`<i>${tile.icon}</i><span>${tile.label}</span>`;b.ondragstart=e=>e.dataTransfer.setData('text/plain',tile.id);b.onclick=()=>{state.plan.push(tile.id);render();};modules.append(b);});
        const rail=document.createElement('div');rail.className='zunyi-plan-rail';rail.ondragover=e=>e.preventDefault();rail.ondrop=e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(id&&!state.plan.includes(id)){state.plan.push(id);render();}};
        if(!state.plan.length)rail.textContent='拖入研判模块，组成行动链';
        state.plan.forEach((id,i)=>{const tile=planTiles.find(t=>t.id===id);const b=document.createElement('button');b.textContent=`${i+1}  ${tile.label}`;b.onclick=()=>{state.plan.splice(i,1);render();};rail.append(b);});
        const input=document.createElement('textarea');input.className='zunyi-proposal';input.maxLength=300;input.value=state.proposal||'';input.placeholder='直接输入你的研判方案，例如：先核对会议日期与材料出处，再分别复盘军事和组织问题，所有推断必须标注依据……';input.oninput=()=>state.proposal=input.value;
        consoleBox.append(modules,rail,input);content.append(consoleBox);
        const msg=status('行动链顺序、资源部署和自由指令将共同提交给 AI 进行对抗推演。');
        actions('执行 AI 对抗推演',()=>{
          let proposal=(state.proposal||'').trim();const hasCustom=!!proposal;
          if(!state.plan.length&&!proposal){msg.textContent='请选择行动模块，或直接输入你的方案；也可组合提交。';return;}
          if(!proposal)proposal=state.plan.map(id=>planTiles.find(t=>t.id===id)?.label).filter(Boolean).join('，然后');
          state.proposal=proposal;state.assessment={...this.buildLocalDecisionAssessment(proposal,state.plan,node||{id:3}),ai_mode:'本地即时因果 · AI 后台复核中，可继续'};
          const updateScore=()=>{state.score=30+Math.min(30,state.budget.source*3+Math.min(state.budget.military,state.budget.organization)*4)+Math.max(0,Math.min(40,Math.round((Number(state.assessment.display_score)||50)*.4)));};
          updateScore();state.stage=3;render();
          const videoCommand=[state.plan.map(id=>planTiles.find(t=>t.id===id).label).join('，然后'),hasCustom?proposal:''].filter(Boolean).join('；补充：');
          if(typeof DecisionCinema!=='undefined')DecisionCinema.play(node,videoCommand,{kind:hasCustom?'custom_decision':'fixed_decision',isCurrent:()=>overlay.isConnected&&!state.finished});
          const epoch=this.settlementSession||0,revision=state.revision||0,player=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null;
          const controller=new AbortController();state.assessmentAbort?.abort();state.assessmentAbort=controller;
          const observer=new MutationObserver(()=>{if(!overlay.isConnected){controller.abort();observer.disconnect();}});observer.observe(document.body,{childList:true});
          let request;try{request=apiZunyiAssess(proposal,state.plan.map(id=>planTiles.find(t=>t.id===id).label),{...state.budget},GameState.getEnemyCommanderProfile(),controller.signal);}catch{request=null;}
          return Promise.resolve(request).catch(()=>null).then(raw=>{
            if(!overlay.isConnected||state.finished||state.stage!==3||epoch!==(this.settlementSession||0)||revision!==(state.revision||0)||(typeof PlayerProfiles40!=='undefined'&&player!==PlayerProfiles40.id))return;
            if(raw&&!raw.degraded&&raw.analysis){
              const history=state.assessment.history_compare;
              state.assessment={...state.assessment,...raw,history_compare:history,display_score:Math.max(0,Math.min(100,(Number(raw.score)||0)*5)),ai_mode:'AI 复核完成 · AI生成模拟，史实参考档案'};
            }else state.assessment.ai_mode='本地即时因果 · 云端暂未完成，可继续';
            updateScore();render();
          }).finally(()=>observer.disconnect());
        });
      }else{
        shell('任务四','平行方案与真实历史线','你的研判方案形成一条推演线；真实历史结论保持不变，两条线在这里对照。');
        const result=document.createElement('div');result.className='zunyi-simulation-result';
        const score=Math.min(100,state.score),rating=score>=85?'优':score>=70?'良':score>=55?'中':'需完善';
        const chart=document.createElement('div');chart.className='zunyi-result-chart';
        [['史料可信',state.budget.source*18],['军事复盘',state.budget.military*18],['组织研判',state.budget.organization*18],['方案完整',score]].forEach(([label,value])=>{const row=document.createElement('div');row.innerHTML=`<span>${label}</span><i><b style="width:${Math.min(100,value)}%"></b></i><strong>${Math.min(100,value)}</strong>`;chart.append(row);});
        const parallel=document.createElement('article');parallel.className='zunyi-parallel-line';const ptitle=document.createElement('h3');ptitle.textContent=`你的推演线 · ${state.assessment.rating||rating}`;const ptext=document.createElement('p');ptext.textContent=state.assessment?.analysis;parallel.append(ptitle,ptext);
        const history=document.createElement('article');history.className='zunyi-history-line';const htitle=document.createElement('h3');htitle.textContent='历史真实线 · 1935年1月15日至17日';const htext=document.createElement('p');htext.textContent=state.assessment.history_compare;history.append(htitle,htext);
        const counter=document.createElement('article');counter.className='zunyi-counter-line';const ctitle=document.createElement('h3');ctitle.textContent='AI 对手响应';const ctext=document.createElement('p');ctext.textContent=state.assessment.opponent_response||'对手会继续利用信息差和行动迟滞施加追堵压力。';counter.append(ctitle,ctext);
        const consequence=document.createElement('article');consequence.className='zunyi-consequence-line';const etitle=document.createElement('h3');etitle.textContent='决策后果';const etext=document.createElement('p');etext.textContent=state.assessment.consequence||state.assessment?.analysis;consequence.append(etitle,etext);
        const changes=document.createElement('div');changes.className='zunyi-resource-delta';const delta=state.assessment.resource_changes||{};[['情报',delta.intel],['协同',delta.coordination],['机动',delta.mobility],['士气',delta.morale],['风险',delta.risk]].forEach(([label,value])=>{const item=document.createElement('span');const n=Number(value)||0;item.classList.toggle('bad',label==='风险'?n>0:n<0);item.textContent=`${label} ${n>0?'+':''}${n}`;changes.append(item);});
        const voice=document.createElement('button');voice.className='zunyi-voice';voice.textContent='▶ 语音播报复盘';voice.onclick=()=>{if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(`${ptext.textContent}。${htext.textContent}`);this.applyVoiceProfile(utter,'narrator');window.speechSynthesis.speak(utter);voice.textContent='正在播报…';utter.onend=()=>voice.textContent='▶ 重新播报';};
        const badge=document.createElement('strong');badge.className='zunyi-final-score';badge.textContent=`推演评分 ${score}`;
        const mode=document.createElement('p');mode.className='zunyi-status';mode.setAttribute('role','status');mode.textContent=state.assessment.ai_mode;
        result.append(mode,chart,counter,consequence,changes,parallel,history,voice,badge);content.append(result);
        actions('完成会议推演',()=>{if(state.finished)return;state.finished=true;state.assessmentAbort?.abort();GameState.recordStrategicDecision({nodeId:node.id,nodeName:node.name,command:state.proposal,modules:state.plan,outcome:state.assessment.rating,score:state.assessment.display_score,counter:state.assessment.next_counter,causalNodes:state.assessment.causal_nodes,videoHandled:true,ai_mode:state.assessment.ai_mode});GameState.recordBattleScore(node.id,score,rating);if(typeof Campaign55!=='undefined')Campaign55.grantReserve(node.id,state.reserve||0);overlay.remove();this.completeDungeon(node);});
      }
      overlay.scrollTop=scroll;content.scrollTop=contentScroll;if(focused)Array.from(content.querySelectorAll('[aria-label]')).find(el=>el.getAttribute('aria-label')===focused)?.focus({preventScroll:true});
    };
    document.body.appendChild(overlay);render();
  },


  // ===== 情报破译解密小游戏 =====
  showDecrypt(node) {
    this.decryptCurrentNode = node;
    this.decryptActive = true;
    this.decryptSuccess = false;
    this.decryptTimeLeft = 90;
    this.decryptCurrentMode = 'morse';
    this.decryptMorseIndex = 0;
    this.decryptMorseDecoded = '';

    // 随机选一条情报
    const msgIdx = Math.floor(Math.random() * INTEL_MESSAGES.length);
    this.decryptMorseMessage = INTEL_MESSAGES[msgIdx];
    this.decryptCipherMessage = CIPHER_PUZZLES[Math.floor(Math.random() * CIPHER_PUZZLES.length)];

    // 重置UI
    document.getElementById('decryptTimerFill').style.width = '100%';
    document.getElementById('decryptTimerFill').classList.remove('warning');
    document.getElementById('decryptTimerText').textContent = '90';
    document.getElementById('morseResult').classList.remove('show', 'success', 'fail');
    document.getElementById('morseResult').textContent = '';

    // 默认显示摩斯电码Tab
    this.switchDecryptTab('morse');

    // 显示破译界面
    document.getElementById('decryptOverlay').classList.add('open');

    // 开始倒计时
    this.startDecryptTimer();

    // 开始电报底噪
    this.playDecryptAmbient();
  },

  switchDecryptTab(mode) {
    this.decryptCurrentMode = mode;

    document.getElementById('decryptTabMorse').classList.toggle('active', mode === 'morse');
    document.getElementById('decryptTabCipher').classList.toggle('active', mode === 'cipher');
    document.getElementById('decryptPanelMorse').style.display = mode === 'morse' ? 'block' : 'none';
    document.getElementById('decryptPanelCipher').style.display = mode === 'cipher' ? 'block' : 'none';

    if (mode === 'morse') {
      this.initMorseGame();
    } else {
      this.initCipherGame();
    }
  },

  // ===== 摩斯电码玩法 =====
  initMorseGame() {
    const msg = this.decryptMorseMessage;
    if (!msg) return;

    // 显示摩斯密码序列（每个字母的摩斯码用空格分隔）
    const morseParts = msg.morse.split(' ');
    const display = document.getElementById('morseDisplay');
    display.innerHTML = '';

    morseParts.forEach((part, i) => {
      const span = document.createElement('span');
      span.className = i === this.decryptMorseIndex ? 'morse-current' : '';
      span.textContent = part;
      display.appendChild(span);
      if (i < morseParts.length - 1) {
        display.appendChild(document.createTextNode(' '));
      }
    });

    // 显示已译出的部分
    const progressEl = document.getElementById('morseProgress');
    progressEl.innerHTML = `已译出：<span class="morse-decoded">${this.decryptMorseDecoded || '...'}</span>`;

    // 渲染字母选择按钮
    const alphabetEl = document.getElementById('morseAlphabet');
    alphabetEl.innerHTML = '';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    letters.forEach(letter => {
      const btn = document.createElement('button');
      btn.className = 'morse-letter-btn';
      btn.textContent = letter;
      btn.addEventListener('click', () => {
        this.onMorseLetterClick(letter);
      });
      alphabetEl.appendChild(btn);
    });
  },

  onMorseLetterClick(letter) {
    if (!this.decryptActive) return;

    const msg = this.decryptMorseMessage;
    const targetLetter = msg.plaintext[this.decryptMorseIndex];

    if (letter === targetLetter) {
      // 正确
      this.decryptMorseDecoded += letter;
      this.decryptMorseIndex++;
      if (msg.plaintext[this.decryptMorseIndex] === ' ') {
        this.decryptMorseDecoded += ' ';
        this.decryptMorseIndex++;
      }

      // 标记按钮为正确
      const btns = document.querySelectorAll('.morse-letter-btn');
      btns.forEach(b => {
        if (b.textContent === letter) {
          b.classList.add('correct');
        }
      });

      // 播放正确音效
      this.playDecryptBeep(600, 0.08);

      // 检查是否全部译完
      if (this.decryptMorseIndex >= msg.plaintext.length) {
        this.onDecryptSuccess();
      } else {
        // 刷新显示
        this.initMorseGame();
      }
    } else {
      // 错误
      const btns = document.querySelectorAll('.morse-letter-btn');
      btns.forEach(b => {
        if (b.textContent === letter) {
          b.classList.add('wrong');
          setTimeout(() => b.classList.remove('wrong'), 300);
        }
      });

      // 播放错误音效
      this.playDecryptBeep(200, 0.15);
    }
  },

  // ===== 替换字谜玩法 =====
  initCipherGame() {
    const puzzle = this.decryptCipherMessage;
    if (!puzzle) return;

    // 显示替换规则
    document.getElementById('cipherRule').textContent = `排列规则：${puzzle.rule}；提示：${puzzle.hint || puzzle.meaning}`;

    // 显示密文（打乱的顺序作为"密文"展示）
    document.getElementById('cipherText').textContent = puzzle.shuffled.join('');

    // 渲染空槽位（明文长度个槽）
    const slotsEl = document.getElementById('cipherSlots');
    slotsEl.innerHTML = '';
    this.decryptCipherSlots = [];
    this._cipherSelected = null;
    const describeSlot = (i) => {
      const state = this.decryptCipherSlots[i];
      return state?.filled ? `第${i + 1}位已填${state.char}，点击撤回` : `第${i + 1}位空位，点击放入所选字块`;
    };
    for (let i = 0; i < puzzle.plaintext.length; i++) {
      const slot = document.createElement('div');
      slot.className = 'cipher-slot';
      slot.dataset.index = i;
      slot.tabIndex = 0;
      slot.setAttribute('role', 'button');
      slot.setAttribute('aria-label', describeSlot(i));
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.classList.add('drag-over');
      });
      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
      });
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        this.onCipherDrop(i, e);
      });
      slot.addEventListener('click', () => {
        const state = this.decryptCipherSlots[i];
        if (state.filled) {
          const source = document.querySelector(`.cipher-block[data-block-id="${state.blockId}"]`);
          if (source) source.classList.remove('used');
          state.filled = false; state.char = null; state.blockId = null;
          slot.textContent = ''; slot.classList.remove('filled');
          slot.setAttribute('aria-label', describeSlot(i));
          return;
        }
        if (!this._cipherSelected) return;
        this.onCipherDrop(i, { dataTransfer: { getData: () => JSON.stringify(this._cipherSelected) } });
        slot.setAttribute('aria-label', describeSlot(i));
      });
      slot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); slot.click(); }
      });
      slotsEl.appendChild(slot);
      this.decryptCipherSlots.push({ index: i, filled: false, char: null });
    }

    // 渲染打乱的字块
    const blocksEl = document.getElementById('cipherBlocks');
    blocksEl.innerHTML = '';
    // 使用明文字符的打乱顺序
    const plainChars = puzzle.plaintext.split('');
    const shuffledChars = [...plainChars].sort(() => Math.random() - 0.5);

    shuffledChars.forEach((char, i) => {
      const block = document.createElement('div');
      block.className = 'cipher-block';
      block.textContent = char;
      block.draggable = true;
      block.dataset.char = char;
      block.dataset.blockId = i;

      block.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ char, blockId: i }));
        block.style.opacity = '0.5';
      });
      block.addEventListener('dragend', () => {
        block.style.opacity = '';
      });

      block.tabIndex = 0;
      block.setAttribute('role', 'button');
      block.setAttribute('aria-label', `字块${char}，点击选中后再点空位`);

      // 移动端触摸支持
      block.addEventListener('pointerdown', (e) => {
        this._cipherDragBlock = block;
        this._cipherDragChar = char;
        this._cipherDragBlockId = i;
      });

      // 触屏无 HTML5 拖拽：先选中字块，再点目标槽位；键盘 Enter/空格等价。
      block.addEventListener('click', () => {
        if (block.classList.contains('used')) return;
        const same = this._cipherSelected?.blockId === i;
        blocksEl.querySelectorAll('.cipher-block.selected').forEach(b => b.classList.remove('selected'));
        this._cipherSelected = same ? null : { char, blockId: i };
        if (!same) block.classList.add('selected');
      });
      block.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); block.click(); }
      });
      blocksEl.appendChild(block);
    });
  },

  onCipherDrop(slotIndex, dropEvent) {
    let dragData;
    try {
      dragData = JSON.parse(dropEvent.dataTransfer.getData('text/plain'));
    } catch (e) {
      // 移动端触摸fallback
      if (this._cipherDragChar) {
        dragData = { char: this._cipherDragChar, blockId: this._cipherDragBlockId };
      } else {
        return;
      }
    }

    if (!this.decryptActive || !dragData) return;
    if (this.decryptCipherSlots.some(s => s.filled && s.blockId === dragData.blockId)) return;
    const slot = this.decryptCipherSlots[slotIndex];
    if (slot.filled) return; // 已填充

    // 填充槽位
    slot.filled = true;
    slot.char = dragData.char;
    slot.blockId = dragData.blockId;

    const slotEl = document.querySelectorAll('.cipher-slot')[slotIndex];
    slotEl.textContent = dragData.char;
    slotEl.classList.add('filled');

    // 标记字块已使用
    const blocks = document.querySelectorAll('.cipher-block');
    blocks.forEach(b => {
      if (parseInt(b.dataset.blockId) === dragData.blockId) {
        b.classList.add('used');
        b.classList.remove('selected');
      }
    });
    this._cipherSelected = null;

    // 播放音效
    this.playDecryptBeep(500, 0.06);

    // Use the explicit submit button; completing a slot never clears a correct answer.
  },


  // ===== 倒计时 =====
  startDecryptTimer() {
    clearInterval(this.decryptTimer);
    this.decryptTimer = setInterval(() => {
      if (!this.decryptActive) return;
      this.decryptTimeLeft--;
      const pct = (this.decryptTimeLeft / 90) * 100;
      document.getElementById('decryptTimerFill').style.width = pct + '%';
      document.getElementById('decryptTimerText').textContent = this.decryptTimeLeft;

      if (this.decryptTimeLeft <= 30) {
        document.getElementById('decryptTimerFill').classList.add('warning');
      }

      // 滴滴声（每秒一次）
      if (this.decryptTimeLeft > 0) {
        this.playDecryptBeep(400, 0.03);
      }

      if (this.decryptTimeLeft <= 0) {
        this.onDecryptFail();
      }
    }, 1000);
  },

  // ===== 破译成功 =====
  onDecryptSuccess() {
    this.decryptActive = false;
    this.decryptSuccess = true;
    clearInterval(this.decryptTimer);
    this.stopDecryptAmbient();

    // 显示成功提示
    const resultEl = document.getElementById('morseResult');
    resultEl.textContent = '破译成功！';
    resultEl.classList.add('show', 'success');

    // 记入GameState
    GameState.setIntelBuff(this.decryptCurrentNode.id, true);

    // 显示情报buff卡
    setTimeout(() => {
      this.showIntelBuffCard();
    }, 1500);
  },

  // ===== 破译失败 =====
  onDecryptFail() {
    this.decryptActive = false;
    this.decryptSuccess = false;
    clearInterval(this.decryptTimer);
    this.stopDecryptAmbient();

    const resultEl = document.getElementById('morseResult');
    resultEl.textContent = '破译失败，时间耗尽';
    resultEl.classList.add('show', 'fail');

    GameState.setIntelBuff(this.decryptCurrentNode.id, false);

    // 1.5秒后关闭，进入正常流程
    setTimeout(() => {
      this.closeDecryptAndContinue();
    }, 1500);
  },

  // ===== 跳过破译 =====
  skipDecrypt() {
    this.decryptActive = false;
    this.decryptSuccess = false;
    clearInterval(this.decryptTimer);
    this.stopDecryptAmbient();
    GameState.setIntelBuff(this.decryptCurrentNode.id, false);
    this.closeDecryptAndContinue();
  },

  // ===== 提交破译（字谜模式用） =====
  submitDecrypt() {
    if (!this.decryptActive || this.decryptSuccess) return;
    if (this.decryptCurrentMode === 'cipher') {
      const allFilled = this.decryptCipherSlots.every(s => s.filled);
      if (!allFilled) {
        this.showToast('请将所有字块填入槽位');
        return;
      }
      const assembled = this.decryptCipherSlots.map(s => s.char).join('');
      if ((this.decryptCipherMessage.answers || [this.decryptCipherMessage.plaintext]).includes(assembled.normalize('NFKC').replace(/\s/g, ''))) {
        this.onDecryptSuccess();
      } else {
        this.showToast('顺序尚未符合提示；点击已填字块撤回，或点字块选中后点目标槽位换位');
      }
    } else {
      // 摩斯模式：如果还没全部译完，提示
      if (this.decryptMorseIndex < this.decryptMorseMessage.plaintext.length) {
        this.showToast('请完成所有字母的破译');
      }
    }
  },

  // ===== 显示情报buff卡 =====
  showIntelBuffCard() {
    const msg = this.decryptCurrentMode === 'morse' ? this.decryptMorseMessage : this.decryptCipherMessage;

    document.getElementById('intelBuffTitle').textContent = '敌军动向';
    document.getElementById('intelBuffText').textContent = msg.meaning + '\n' + msg.source;
    document.getElementById('intelBuffEffect').textContent = msg.buff;

    document.getElementById('decryptOverlay').classList.remove('open');
    document.getElementById('intelBuffOverlay').classList.add('open');

    // buff卡关闭后进入正常副本流程
    const buffCloseHandler = () => {
      document.getElementById('intelBuffCloseBtn').onclick = null;
      document.getElementById('intelBuffOverlay').classList.remove('open');
      document.getElementById('intelBuffCloseBtn').removeEventListener('click', buffCloseHandler);
      this.closeDecryptAndContinue();
    };
    document.getElementById('intelBuffCloseBtn').onclick = buffCloseHandler;
  },

  // ===== 关闭破译，继续副本流程 =====
  closeDecryptAndContinue() {
    document.getElementById('decryptOverlay').classList.remove('open');
    this.stopDecryptAmbient();

    const node = this.decryptCurrentNode;
    this.decryptCurrentNode = null;

    if (!node) return;
    if (node.type !== 'battle') { this.showLearningTask(node); return; }
    this.showPreBattleChoice(node, () => {
      this.showCommandPost(node);
    });
  },

  // ===== 物资分配拖拽小游戏（穿越草地 node 9） =====
  showRationAlloc(node) {
    this.rationCurrentNode = node;
    this.rationTotal = calcRationTotal();
    this.rationAllocations = {};
    this.rationSoldiers = GRASSLAND_SOLDIERS;

    // 初始化每人分配为0
    GRASSLAND_SOLDIERS.forEach(s => {
      this.rationAllocations[s.id] = 0;
    });

    // 渲染战士卡片
    this.renderRationSoldiers();

    // 更新总量显示
    document.getElementById('rationTotalValue').textContent = this.rationTotal;
    this.updateRationRemaining();

    // 重置提示
    document.getElementById('rationHint').textContent = '拖动滑块为每名战士分配青稞面（0-' + RATION_PER_PERSON_MAX + '份）';
    document.getElementById('rationHint').classList.remove('warning');

    // 显示分配界面
    document.getElementById('rationOverlay').classList.add('open');
  },

  renderRationSoldiers() {
    const container = document.getElementById('rationSoldiers');
    container.innerHTML = '';

    GRASSLAND_SOLDIERS.forEach(soldier => {
      const card = document.createElement('div');
      card.className = 'ration-soldier-card status-' + soldier.status;

      const avatarChar = soldier.name.charAt(0);
      card.innerHTML = `
        <div class="ration-soldier-avatar">${avatarChar}</div>
        <div class="ration-soldier-name">${soldier.name}</div>
        <div class="ration-soldier-status status-${soldier.status}">${soldier.statusLabel}</div>
        <div class="ration-slider-wrap">
          <input type="range" class="ration-slider" min="0" max="${RATION_PER_PERSON_MAX}" value="0"
                 data-soldier-id="${soldier.id}">
          <div class="ration-soldier-amount">
            <span class="amount-num" data-amount-id="${soldier.id}">0</span>
            <span class="amount-unit">份</span>
          </div>
        </div>
      `;

      container.appendChild(card);

      // 绑定滑块事件
      const slider = card.querySelector('.ration-slider');
      const amountDisplay = card.querySelector('[data-amount-id]');

      slider.addEventListener('input', (e) => {
        const soldierId = e.target.dataset.soldierId;
        const val = parseInt(e.target.value);

        // 检查总量是否超限
        const currentTotal = Object.values(this.rationAllocations).reduce((a, b) => a + b, 0);
        const currentVal = this.rationAllocations[soldierId];
        const newTotal = currentTotal - currentVal + val;

        if (newTotal > this.rationTotal) {
          // 超限：回退到最大允许值
          const maxAllowed = this.rationTotal - (currentTotal - currentVal);
          if (maxAllowed < 0) {
            e.target.value = 0;
            this.rationAllocations[soldierId] = 0;
            amountDisplay.textContent = '0';
          } else {
            e.target.value = maxAllowed;
            this.rationAllocations[soldierId] = maxAllowed;
            amountDisplay.textContent = maxAllowed;
          }
          document.getElementById('rationHint').textContent = '青稞面不够了！调整分配';
          document.getElementById('rationHint').classList.add('warning');
        } else {
          this.rationAllocations[soldierId] = val;
          amountDisplay.textContent = val;
          document.getElementById('rationHint').textContent = '拖动滑块为每名战士分配青稞面（0-' + RATION_PER_PERSON_MAX + '份）';
          document.getElementById('rationHint').classList.remove('warning');
        }

        this.updateRationRemaining();
      });
    });
  },

  updateRationRemaining() {
    const used = Object.values(this.rationAllocations).reduce((a, b) => a + b, 0);
    const remaining = this.rationTotal - used;
    document.getElementById('rationRemaining').textContent = remaining;
  },

  submitRationAlloc() {
    const allocations = this.rationAllocations;
    const values = Object.values(allocations);
    const totalUsed = values.reduce((a, b) => a + b, 0);

    // 如果完全没分配（全0），提示
    if (totalUsed === 0) {
      document.getElementById('rationHint').textContent = '必须分配青稞面！至少给一名战士分粮';
      document.getElementById('rationHint').classList.add('warning');
      return;
    }

    // 计算结算结果
    const result = this.calcRationResult(allocations);

    // 记录到game-state
    GameState.setRationResult(this.rationCurrentNode.id, allocations, result);

    // 应用效果到资源
    if (result.effects.troops) {
      GameState.resources.troops = Math.max(0, Math.min(100, GameState.resources.troops + result.effects.troops));
    }
    if (result.effects.morale) {
      GameState.resources.morale = Math.max(0, Math.min(100, GameState.resources.morale + result.effects.morale));
    }
    GameState.save();
    this.updateResourceHUD();

    // 浮动数值提示
    if (result.effects.troops) {
      this.floatStat('Troops', result.effects.troops);
    }
    if (result.effects.morale) {
      this.floatStat('Morale', result.effects.morale);
    }

    // 关闭分配界面，显示结算
    document.getElementById('rationOverlay').classList.remove('open');

    setTimeout(() => {
      this.showRationResult(result);
    }, 300);
  },

  calcRationResult(allocations) {
    const values = Object.values(allocations);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const totalUsed = values.reduce((a, b) => a + b, 0);

    // 判断伤员（s4）是否分到<5份
    const woundedAmount = allocations['s4'] || 0;

    // 判断是否有人分0
    const hasZero = values.some(v => v === 0);

    // 判断是否均衡分配（最低≥8）
    const isBalanced = minVal >= 8;

    // 判断极端不均（一人拿了大头，其他人几乎没分到）
    const isExtremeUneven = maxVal >= 15 && minVal === 0 && values.filter(v => v === 0).length >= 3;

    // 优先级：极端不均 > 有人分0 > 伤员<5 > 均衡分配
    if (isExtremeUneven) {
      return GRASSLAND_RESULTS.extreme_uneven;
    }
    if (hasZero) {
      return GRASSLAND_RESULTS.someone_zero;
    }
    if (woundedAmount < 5 && woundedAmount > 0) {
      return GRASSLAND_RESULTS.wounded_starve;
    }
    if (isBalanced) {
      return GRASSLAND_RESULTS.balanced;
    }
    // 默认：不均衡但不极端（有人分少但没分0）
    return GRASSLAND_RESULTS.limited;
  },

  showRationResult(result) {
    document.getElementById('rationResultTitle').textContent = result.title;
    document.getElementById('rationResultNarrative').textContent = result.narrative;

    const effectsEl = document.getElementById('rationResultEffects');
    effectsEl.textContent = result.effectLabel;
    effectsEl.classList.toggle('positive', result.effects.morale > 0 && !result.effects.troops);

    const achievementEl = document.getElementById('rationResultAchievement');
    if (result.achievement) {
      achievementEl.textContent = '🏅 成就解锁：' + result.achievement;
      achievementEl.style.display = 'inline-block';
    } else {
      achievementEl.style.display = 'none';
    }

    document.getElementById('rationResultOverlay').classList.add('open');
  },

  closeRationAndContinue() {
    document.getElementById('rationResultOverlay').classList.remove('open');

    const node = this.rationCurrentNode;
    this.rationCurrentNode = null;

    if(node&&typeof ChapterTasks54!=='undefined'){ChapterTasks54.open(node,()=>this.completeDungeon(node));return;}
    // 旧版独立加载的兼容入口。
    this.showPreBattleChoice(node, () => {
      this.showCommandPost(node);
    });
  },

  skipRationAlloc() {
    document.getElementById('rationOverlay').classList.remove('open');

    const node = this.rationCurrentNode;
    this.rationCurrentNode = null;

    if(node&&typeof ChapterTasks54!=='undefined'){ChapterTasks54.open(node,()=>this.completeDungeon(node));return;}
    // 旧版独立加载的兼容入口。
    this.showPreBattleChoice(node, () => {
      this.showCommandPost(node);
    });
  },

  // ===== Web Audio 电报底噪+滴滴声 =====
  

  

  

  // ===== AI指挥所 =====
  showCommandPost(node) {
    if(!node?.id){this.showToast('请重新选择当前章节');return;}
    this.commandSession=(this.commandSession||0)+1;this.commandSubmitting=false;
    const submit=document.getElementById('commandSubmit');submit.disabled=false;submit.textContent='下达指令';document.getElementById('commandLoading').style.display='none';
    this.commandCurrentNode = node;
    this.commandParseData = null;
    // [P1 修复 2026-10-26] 预热：玩家读章节说明时就让模型端点完成冷启动（120s 节流，
    // apiRequest 失败恒 resolve null 且已自带事件派发，此处仅兜同步异常，不打扰用户）。
    if(!this._parseWarmup||Date.now()-this._parseWarmup>120000){
      this._parseWarmup=Date.now();
      try{apiBattleParse('预热：各班清点装备，原地待命');}catch(e){}
    }
    this.commandFreeCommands = [];
    this.selectedTiles = [];

    const levelInfo = this.nodeLevelMap[node.id] || { level: 'ruijin', scene: 'river_crossing' };

    document.getElementById('commandTitle').textContent = `${node.name} · 指挥所`;
    document.getElementById('commandSubtitle').textContent = `${node.date || ''} · ${node.location || ''} — 选择战术或输入指令`;
    const campaignDraft=typeof Campaign55!=='undefined'?Campaign55.read().plans[node.id]?.custom||'':'';
    document.getElementById('commandInput').value = campaignDraft.slice(0,200);
    document.getElementById('commandInputCounter').textContent = `${Math.min(200,campaignDraft.length)}/200`;
    document.querySelectorAll('.command-tile').forEach(t => {t.classList.remove('selected');t.setAttribute('aria-pressed','false');});
    this.updateCommandDisplay();
    document.getElementById('commandNarrativeHint').classList.remove('show');
    document.getElementById('commandNarrativeHint').textContent = '';
    document.getElementById('commandActionsArea').innerHTML = '';
    document.getElementById('commandConfirm').style.display = 'none';
    document.getElementById('commandDegradedBadge').style.display = 'none';

    // 情报buff展示（破译成功后激活）
    const intelBuff = GameState.getIntelBuff();
    const buffEl = document.getElementById('commandIntelBuff');
    if (intelBuff && intelBuff.buff === 'feasibility_plus_15') {
      buffEl.textContent = '🪖 已知敌军部署 — 首轮行动可行性+15%';

      buffEl.classList.add('show');
    } else {
      buffEl.classList.remove('show');
      buffEl.textContent = '';
    }

    // 清除emotion色调
    const overlay = document.getElementById('commandOverlay');
    overlay.classList.remove('emotion-tense', 'emotion-tragic', 'emotion-hopeful', 'emotion-defeat');

    overlay.classList.add('open');

    // 自动聚焦输入框
    // 触屏设备上 focus() 会让滚动容器把输入框滚进视野（实测 360×800 下 .command-content
    // 直接滚掉 131px，页头「血战湘江 · 指挥所」整个被滚出屏幕）并弹出软键盘。
    // 触屏下不自动聚焦，交给用户自己点；桌面端保留效率，但要 preventScroll 免得跳页。
    if (!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches)) {
      setTimeout(() => {
        document.getElementById('commandInput').focus({ preventScroll: true });
      }, 400);
    }
  },

  closeCommandPost() {
    this.commandSession=(this.commandSession||0)+1;this.commandSubmitting=false;
    this.commandSubmitting=false;
    document.getElementById('commandLoading').style.display='none';
    document.getElementById('commandOverlay').classList.remove('open');
  },

  // ===== 关卡数据隔离：加载关卡配置 =====
  loadLevelConfig(levelId) {
    // 优先使用 levelConfigs（动态配置表），兼容 LEVEL_CONFIG 数字key
    if (levelConfigs) {
      const cfg = getLevelConfig(levelId);
      if (cfg) return cfg;
    }
    // 兜底：兼容旧 LEVEL_CONFIG
    return LEVEL_CONFIG[levelId] || LEVEL_CONFIG[1];
  },

  // ===== 关卡数据隔离：AI内容合规校验 =====
  // 用 forbiddenKeywords 检查 AI生成的文本是否合规
  // 发现违禁词 → 拦截，返回兜底文案
  validateAIContent(aiText, levelConfig) {
    if (!aiText || !levelConfig) return { valid: true, text: aiText };
    const forbidden = levelConfig.forbiddenKeywords || [];
    const violations = forbidden.filter(kw => aiText.includes(kw));
    if (violations.length > 0) {
      console.warn(`[validateAIContent] 拦截违禁词: ${violations.join(', ')}，关卡: ${levelConfig.levelName}`);
      // 返回兜底文案（使用关卡氛围描述生成）
      const fallback = `${levelConfig.sceneAtmosphere}。${levelConfig.fallbackScene ? '你下令' + levelConfig.fallbackScene.action + '——不停手，就有希望！' : ''}`;
      return { valid: false, text: fallback, violations };
    }
    return { valid: true, text: aiText };
  },

  // ===== 历史时间线校验（渲染前最后一道防线） =====
  validateTimeline(telegramText, currentLevelConfig) {
    if (!telegramText || !currentLevelConfig) return { valid: true, text: telegramText };
    const forbidden = currentLevelConfig.forbiddenKeywords || [];
    const violations = forbidden.filter(kw => telegramText.includes(kw));
    if (violations.length > 0) {
      console.warn(`[validateTimeline] 拦截时间线穿越: ${violations.join(', ')}，当前关卡: ${currentLevelConfig.levelName}`);
      // 替换为安全兜底文本
      const safeText = `${currentLevelConfig.sceneAtmosphere}。${currentLevelConfig.fallbackScene ? '你下令' + currentLevelConfig.fallbackScene.action + '——不停手，就有希望！' : ''}`;
      return { valid: false, text: safeText, violations };
    }
    return { valid: true, text: telegramText };
  },

  // ===== 电报预加载：在关卡加载时提前请求并缓存电报数据 =====
  

  // ===== 关卡数据隔离：动态渲染关卡UI =====
  renderLevelUI(levelConfig) {
    if (!levelConfig) return;
    // 动态更新QTE副标题
    const qteSubtitleEl = document.getElementById('qteSubtitle');
    if (qteSubtitleEl && levelConfig.qteSubtitle) {
      qteSubtitleEl.textContent = levelConfig.qteSubtitle;
    }
    // 动态更新QTE按钮文字
    const qteBtn = document.getElementById('qteClimbBtn');
    if (qteBtn && levelConfig.qteButtonText) {
      qteBtn.textContent = levelConfig.qteButtonText;
    }
    // 动态更新QTE提示
    const qteHint = document.querySelector('.qte-hint');
    if (qteHint && levelConfig.qteHint) {
      qteHint.textContent = levelConfig.qteHint;
    }
  },

  // 更新当前指令显示区
  updateCommandDisplay() {
    const display = document.getElementById('commandCurrentDisplay');
    if (!display) return;
    if (this.selectedTiles.length > 0) {
      display.innerHTML = this.selectedTiles.map(t => uiHTML`<span class="command-current-tag">${t}</span>`).join('');
      const extra=document.getElementById('commandInput').value.trim();if(extra){const tag=document.createElement('span');tag.className='command-current-tag custom';tag.textContent=extra;display.append(tag);}
    } else {
      const customInput = document.getElementById('commandInput');
      if (customInput && customInput.value.trim()) {
        display.replaceChildren();
        const tag = document.createElement('span');
        tag.className = 'command-current-tag custom';
        tag.textContent = customInput.value.trim();
        display.append(tag);
      } else {
        display.innerHTML = '<span class="command-current-empty">未选择指令 — 点击下方战术磁贴或输入自定义指令</span>';
      }
    }
  },

  // 获取最终指令文本（磁贴组合 or 自定义输入）
  getFinalCommand() {
    const tiles = Array.isArray(this.selectedTiles) ? this.selectedTiles.join('，') : '';
    return [tiles, document.getElementById('commandInput')?.value.trim()].filter(Boolean).join('；补充：');
  },

  

  retainTaskScene(host,node,context={},owner=host){
    if(typeof Mission40!=='undefined'&&Mission40.activeScene){const active=Mission40.activeScene;active.restore(true);active.dialog.close();}
    if(typeof LongMarch3D==='undefined'||typeof THREE==='undefined'){host.innerHTML=SvgScenes.render(node,context);return;}
    this.taskSceneCache??=new WeakMap();const key=`${Number(node.id)}:${node.journeyCrossing?'crossing':'scene'}`,cached=this.taskSceneCache.get(owner);
    if(cached?.key===key){if(cached.root.parentElement!==host)host.replaceChildren(cached.root);else for(const child of [...host.children])if(child!==cached.root)child.remove();return;}
    host.innerHTML=SvgScenes.render(node,context);const root=host.querySelector('[data-world3d]');if(root)this.taskSceneCache.set(owner,{key,root});
  },
  renderActionCards(actions) {
    const area = document.getElementById('commandActionsArea');
    area.innerHTML = '';

    actions.forEach(action => {
      const card = document.createElement('div');
      card.className = 'action-card';

      const rawFeasibility=Number(action.feasibility);
      const feasibilityPct = Math.round(Math.max(0,Math.min(1,Number.isFinite(rawFeasibility)?rawFeasibility:.5)) * 100);
      const intensityClass = ['低','中','高'].includes(action.intensity)?action.intensity:'中';

      card.innerHTML = uiHTML`
        <div class="action-card-unit">${zhText(action.unit, '未知单位')}</div>
        <div class="action-card-verb">${zhText(action.verb, '行动')}</div>
        <div class="action-card-target">→ ${zhText(action.target, '目标待定')}</div>
        <div class="action-card-intensity ${intensityClass}">${zhText(intensityClass, '中')}</div>
        <div class="action-card-feasibility">
          可行性 ${feasibilityPct}%
          <span class="action-card-feasibility-bar">
            <span class="action-card-feasibility-fill" style="width:${feasibilityPct}%"></span>
          </span>
        </div>
      `;
      if(action.risk_note){const risk=document.createElement('div');risk.className='action-card-risk';risk.textContent='⚠ '+zhText(action.risk_note,'');card.append(risk);}

      area.appendChild(card);
    });
  },

  // ===== 渲染决策三任务结果（ AI评级 / 优化建议 / 史实复盘）=====
  renderDecisionResult(parseData) {
    const box = document.getElementById('commandDecisionResult');
    if (!box) return;
    if (!parseData) { box.style.display = 'none'; return; }

    const gradeEl = document.getElementById('decisionGradeBadge');
    const suggestionEl = document.getElementById('decisionSuggestion');
    const historyEl = document.getElementById('decisionHistoryReview');

    // 评级徽章（配色：优-金 / 良-青 / 中-灰金 / 差-暗红）
    const localGrade=this.commandCurrentNode?this.buildLocalDecisionAssessment(this.getFinalCommand(),this.selectedTiles||[],this.commandCurrentNode).rating:'';
    const grade = parseData.degraded ? localGrade || parseData.rating || '' : parseData.rating || localGrade || '';
    if (gradeEl) {
      gradeEl.textContent = grade ? `${grade}${parseData.rating&&!parseData.degraded?'':' · 本地评估'}` : '行动解析';
      gradeEl.className = 'decision-grade-badge grade-' + this._gradeClass(grade);
    }

    if (suggestionEl) {
      suggestionEl.textContent = parseData.suggestion || parseData.description || '（暂无优化建议）';
    }
    const gradeLabel=box.querySelector('.decision-grade-label');if(gradeLabel)gradeLabel.textContent=parseData.degraded||!parseData.rating?'本地规则评估':'AI决策评价';
    if (historyEl) {
      historyEl.textContent = parseData.historyReview || (this.commandCurrentNode ? this.getDecisionHistoryContext(this.commandCurrentNode).focus : '本次仅解析行动，未生成历史复盘。');
    }

    box.querySelector('.chapter-causal-tree')?.remove();
    const node=this.commandCurrentNode;
    if(node){
      const assessment=this.buildLocalDecisionAssessment(this.getFinalCommand(),this.selectedTiles||[],node);
      const section=document.createElement('section');section.className='chapter-causal-tree';
      const ctx=this.getDecisionHistoryContext(node);section.innerHTML=uiHTML`<header><small>${ctx.date} · ${ctx.title}</small><h4>本关决策因果链</h4><p>${ctx.focus}</p></header>`;
      const flow=document.createElement('div');flow.className='causal-tree-flow';assessment.causal_nodes.forEach((item,index)=>{const card=document.createElement('article');card.className='causal-node '+(['decision','effect','counter','outcome'].includes(item.type)?item.type:'effect');card.innerHTML=uiHTML`<small>${String(index+1).padStart(2,'0')}</small><b>${item.label}</b><span>${item.value}</span>`;flow.append(card);});section.append(flow);box.append(section);
    }

    box.style.display = 'block';
  },

  _gradeClass(grade) {
    if (grade === '优') return 'excellent';
    if (grade === '良') return 'good';
    if (grade === '中') return 'fair';
    if (grade === '差') return 'poor';
    return 'unknown';
  },

  confirmActions() {
    if (!this.commandCurrentNode) { this.showToast('请重新进入本章指挥所'); return; }
    if (!this.commandParseData || !this.commandParseData.actions) return;
    const node = this.commandCurrentNode;
    this.closeCommandPost();
    this.qteCurrentNode=node;
    const cfg = getLevelConfig(node && node.id);
    const mode = (cfg && cfg.battleMode) || 'qte';

    // ===== battleMode 差异化：不同关卡后续动作不同 =====
    if (mode === 'meeting' || mode === 'end') {
      // 会议副本 / 终点：无 QTE，直接进入战报结算
      this.showToast('会议副本，直接进入战报结算…');
      setTimeout(() => {
        this.requestBattleReport(true);
      }, 1500);
      return;
    }

    // 战况动画 → 动画结束后进入 QTE 微操
    this.playBattleAnimation(node, this.commandParseData, () => {
      this.startQTE(node, this.commandParseData);
    });
  },

  // ===== 2D战况动画（预留接口）=====
  // 当前用 CSS/Canvas 实现战果演示：战旗推进 + 兵力条 + 爆炸粒子，无清晰人脸
  // 后续可整体替换为真实美术资源（视频/序列帧），调用方无需改动
  playBattleAnimation(node, parseData, onComplete) {
    const layer = document.getElementById('battleAnimLayer');
    const done = () => { if (typeof onComplete === 'function') onComplete(); };

    // 无动画层时直接进入下一步，保证流程不断裂
    if (!layer) { done(); return; }

    layer.innerHTML = `<div class="battle-anim-stage">${SvgScenes.render(node,{phase:'action',shotIndex:0})}<div class="battle-anim-title"></div><div class="battle-anim-progress" role="progressbar" aria-label="行动准备"><i id="animTroopFill"></i></div><div class="battle-anim-caption" id="animCaption">协作任务准备中…</div></div>`;
    layer.querySelector('.battle-anim-title').textContent = node.name;
    layer.classList.add('open');

    const fill = document.getElementById('animTroopFill');
    const caption = document.getElementById('animCaption');
    if (fill) fill.style.width = '0%';

    const captions = [
      '部队正在执行指令…',
      parseData && parseData.tactic ? `【${parseData.tactic}】战术展开…` : '战术展开…',
      '准备进入本关互动任务…'
    ];
    let step = 0;
    const captionTimer = setInterval(() => {
      step++;
      if (caption && captions[step]) caption.textContent = captions[step];
      if (step >= captions.length - 1) clearInterval(captionTimer);
    }, 700);

    requestAnimationFrame(() => { if (fill) fill.style.width = '72%'; });
    // Symbolic SVG scene replaces missing video; no random explosions.

    // 动画时长约 2.2 秒，结束后回调（战报生成后同样会停留，避免跳转过快）
    setTimeout(() => {
      clearInterval(captionTimer);
      layer.classList.remove('open');
      setTimeout(done, 250); // 淡出后再进入下一步，衔接自然
    }, 2200);
  },


  // ===== 战局数据UI变化（兵力/弹药/士气）=====
  // 刷新HUD数值并高亮变化的数据条，体现战场残酷性
  applyBattleOutcomeUI() {
    this.updateResourceHUD();
    ['hudTroops', 'hudAmmo', 'hudFood', 'hudMorale'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('hud-flash');
      void el.offsetWidth; // reflow 重置动画
      el.classList.add('hud-flash');
    });
  },

  // 本地降级指令解析（关键词匹配）
  localParseCommand(command) {
    const verbs = { '冲锋': '冲锋', '前进': '前进', '匍匐': '匍匐前进', '攀爬': '攀爬', '佯攻': '佯攻', '掩护': '火力掩护', '突围': '突围', '警戒': '警戒', '撤退': '撤退', '迂回': '迂回包抄', '包抄': '迂回包抄', '坚守': '坚守阵地', '转移': '战略转移', '夜间': '夜间突袭', '突袭': '夜间突袭', '侦察': '侦察敌情', '合围': '合围歼敌', '歼敌': '合围歼敌' };
    const units = { '二班': '二班', '三班': '三班', '突击': '突击队', '火力': '火力掩护组', '主力': '主力部队', '全军': '全军' };
    const targets = { '桥头': '桥头', '铁索': '铁索', '左侧': '左侧', '右侧': '右侧', '对岸': '对岸火力点', '山顶': '山顶', '前方': '前方' };

    let foundVerb = '前进';
    let foundUnit = '二班';
    let foundTarget = '前方';
    let intensity = '中';

    for (const kw in verbs) {
      if (command.includes(kw)) { foundVerb = verbs[kw]; break; }
    }
    for (const kw in units) {
      if (command.includes(kw)) { foundUnit = units[kw]; break; }
    }
    for (const kw in targets) {
      if (command.includes(kw)) { foundTarget = targets[kw]; break; }
    }
    if (command.includes('全力') || command.includes('猛')) intensity = '高';
    if (command.includes('小心') || command.includes('悄悄')) intensity = '低';
    const ordered=[...new Set(Object.entries(verbs).filter(([word])=>command.includes(word)).sort(([a],[b])=>command.indexOf(a)-command.indexOf(b)).map(([,verb])=>verb))].slice(0,3);
    const assessment=this.commandCurrentNode?this.buildLocalDecisionAssessment(command,[],this.commandCurrentNode):null;
    return {
      actions: (ordered.length?ordered:[foundVerb]).map(verb=>({
        unit: foundUnit,
        verb,
        target: foundTarget,
        intensity: intensity,
        feasibility: 0.5,
        risk_note: ''
      })),
      // 决策三任务结果（离线降级）
      rating: assessment?.rating || '中',
      suggestion: assessment ? assessment.consequence+' '+assessment.opponent_response : '请补充情报来源、协作分工与后续行动安排。',
      historyReview: '',
      emotion_tag: 'tense',
      narrative_hint: `${foundUnit}开始${foundVerb}，向${foundTarget}推进。`,
      degraded: true
    };
  },

  // ===== QTE 第一视角微操（关卡驱动动态渲染）=====
  

  // ===== 停滞计时器（15秒容错）=====
  

  

  // ===== QTE场景文本动态生成（注入兵力/角色/指令变量，按兵力三梯度+随机变体） =====

  

  // 场景列（.qte-scene 的第一列）有没有真正看得见的东西？
  // 本章 3D 帧会被 mission40.css 的 `body:has(#qteOverlay.open) .world3d-frame:not(.mission40-scene *){visibility:hidden}`
  // 整块藏掉 —— 那样左 42% 是一片空白，而 .qte-hud 却被钉在 left:44%;right:2%（中轴 71%），
  // 士兵与「运送物资」按钮仍在视口 50%，整屏就成了双轴错位。
  // 判据用计算样式而不是「有没有节点」：节点在但不可见，视觉上一样是空的。
  

  

  

  

  // 士兵CSS动画状态机：Idle/Climb/Climb_Fast/Cover/Slip
  // 点击越快 → Climb_Fast（动画加速）；停手 → Slip（滑落）
  

  // 触发滑落动画（停手超时/回滑时调用）
  

  

  // ===== 失败音效：下行小二度，克制、不煽情 =====
  

  // ===== 胜利过渡动画：闪烁 + 震动 + Web Audio 冲锋号 =====
  

  // ===== Web Audio 合成冲锋号 =====
  

  // ===== 强制返回地图（应急兜底）=====
  

  // ===== 电报机战报 =====
  

  

  

  

  

  

  

  // 判定一份战报是否属于"失败/牺牲"
  

  // ===== 失败重试面板（牺牲后唯一出口，绝不含"继续下一关"）=====
  

  

  // 清空本关残留状态（不碰 RouteMap 进度）
  

  // ===== 重试本关：完整重置当前关卡状态（不刷新页面、不推进主线）=====
  

  

  // ===== Web Audio 电报音效 =====
  

  

  

  // ===== emotion_tag 色调驱动 =====
  applyEmotionTheme(el, emotionTag) {
    el.classList.remove('emotion-tense', 'emotion-tragic', 'emotion-hopeful', 'emotion-defeat');
    if (emotionTag && emotionTag !== 'calm') {
      el.classList.add('emotion-' + emotionTag);
    }
  },

  // ===== 平行时空结算界面 =====
  

  // 沉浸式loading动画（胶片扫描风格）
  

  

  // 分块渲染：先渲染左侧玩家决策线（本地数据，立即显示）
  

  // 完整渲染结算界面（ AI数据到达后）
  

  // 右侧历史真实线：打字机效果逐字浮现，支持点击跳过
  

  // 本地预设结局匹配
  
  // 渲染左右决策时间线（兼容旧调用，新流程使用 renderSettlementTimelinePlayer + _renderHistoryLineWithTypewriter）
  

  // 渲染逐维度对比表
  

  // 渲染结论区
  

  // 前端体验评分：依据玩家实际操作，AI是否在线只影响评语，不固定分数。
  

  // 渲染评分
  

  // ===== AI 专属历史评价（内容与奖励升级） =====
  // 后端 /v1/history/compare 返回 evaluation + evaluation_title；
  // 此处含本地降级模板，保证断网/超时时也有完整文案
  

  // ===== 专属历史勋章分享图（Canvas 手绘，导出 PNG） =====
  

  // ===== 分享图：数据收集 =====
  

  // ===== 分享图：勋章SVG加载（Promise模式，无跨域问题） =====
  

  // ===== 分享图：圆角矩形辅助 =====
  

  // ===== 分享图：文本自动换行（支持最大行数+省略号） =====
  

  // ===== 分享图：背景绘制 =====
  

  // ===== 分享图：标题区 =====
  

  // ===== 分享图：头像+角色名+AI评价标题 =====
  

  // ===== 分享图：AI评价正文区 =====
  

  // ===== 分享图：勋章绘制（SVG Image 或 fallback五角星） =====
  

  // ===== 分享图：勋章名+日期+评分 =====
  

  // ===== 分享图：战绩数据面板（3×2网格） =====
  

  // ===== 分享图：页脚（诗句+二维码+声明） =====
  

  // Share the real address as readable text; never fabricate a QR code.
  
  

  // ===== 分享图：导出与保存（双端兼容） =====
  

  // ===== 分享图：微信相册权限引导 =====
  

  // ===== 分享图：DataURL转Blob（用于Web Share API） =====
  

  // ===== 党史档案：AI 全景语音解说 =====
  

  // ===== TTS音色选择器：淘汰默认音色，优先沉稳男声/纪录片解说风 =====
  // 本地Web Speech：从浏览器声音列表中挑选中文男声；后续可切华为云SIS精品音色（见 docs/tts-voice-config.md）
  

  // 应用音色到utterance（voiceType: 'narrator'旁白 | 'commander'指挥员 | 'soldier'战士 | 'medic'医护）
  

  // 语音播报解说
  

  // 自动播放语音播报（结算界面打开后自动触发）
  

  // 语音播报结论
  

  // 关闭结算界面 → 显示历史档案解锁卡 → 完成副本
  

  // ===== 数据看板：Tab切换 =====
  

  // ===== 数据看板：主渲染入口 =====
  

  // ===== 图表1：兵力折线图 =====
  

  // ===== 图表2：士气折线图 =====
  

  // ===== 图表3：热力图（12节点 × 4资源） =====
  

  // ===== 图表4：伤亡/缴获柱状图 =====
  

  // ===== AI数据解读（本地模板生成） =====
  

  // ===== 导出数据看板为PNG =====
  

  // ===== AI战友对话 =====

  // 副本完成后30%概率触发战友谈话
  

  

  

  

  // 超时兜底：强制结束"对方正在输入"，显示未响应提示+重试按钮
  

  

  

  

  // 台词精确匹配用户语音包；系统朗读由玩家主动选择。
  

  
  

  

  

  // 请求NPC继续说（分段回复机制）
  

  

  

  

  

  

  // 历史档案解锁卡
  showArchiveUnlock(node) {
    if (!node) return;
    // 失败态不出档案卡（档案卡 = 通关奖励，牺牲后不该解锁）
    if (this.isPlayerDead || this.isGameOver) {
      console.warn('[showArchiveUnlock] 拦截：失败状态下不解锁档案与下一关');
      this._showDefeatPanel(node, this._currentReportData);
      return;
    }

    document.getElementById('archiveTitle').textContent = node.name;
    document.getElementById('archiveSpiritBadge').textContent = `${node.spiritKeyword} · 精神徽章`;

    // 史实文本从数据层取，带出处标注
    const archiveHistoryData = getNodeHistory(node.historyId || node.id);
    const archiveBodyEl = document.getElementById('archiveBody');
    if (archiveHistoryData && archiveHistoryData.text) {
      archiveBodyEl.innerHTML = uiHTML`${archiveHistoryData.text}<div class="history-source">出处：${archiveHistoryData.source}</div>`;
    } else {
      archiveBodyEl.textContent = '本章历史背景可参考《中国共产党简史》与章节史实回看；本次任务数值为模拟体验。';
    }

    document.getElementById('archiveOverlay').classList.add('open');

    // 档案关闭后完成副本
    const archiveCloseHandler = () => {
      document.getElementById('archiveCloseBtn').onclick = null;
      document.getElementById('archiveOverlay').classList.remove('open');
      document.getElementById('archiveCloseBtn').removeEventListener('click', archiveCloseHandler);

      // 完成副本（添加战报、标记完成、资源恢复）
      this.completeDungeon(node);

      // 清理结算状态
      this.settlementCurrentNode = null;
      this.settlementCompareData = null;
      this.settlementReportData = null;
      this.qtePlayerDecisions = [];
    };

    document.getElementById('archiveCloseBtn').onclick=archiveCloseHandler;
  },

  // ===== 副本完成 =====
  completeDungeon(node) {
    // ===== 状态锁最后一道闸：牺牲/判负状态下绝不允许标记通关（这是"死了还能跳下一关"的根因入口）=====
    if (this.isPlayerDead || this.isGameOver) {
      console.warn('[completeDungeon] 拦截：当前处于失败状态，禁止标记通关', node && node.id);
      this.showToast('本关尚未完成，先重整队伍再来一次');
      return;
    }
    if (!node || RouteMap.isNodeLocked(node.id)) return;
    // 添加战报
    if(typeof Campaign55!=='undefined')Campaign55.settle(node);
    this.addJournalEntry(node);

    // 标记完成
    RouteMap.completeNode(node.id);

    // 战后资源恢复
    if (GameState.character && node.type === 'battle') {
      const prevTroops = GameState.resources.troops;
      const prevMorale = GameState.resources.morale;
      GameState.afterBattleRecover();
      const troopGain = Math.round(GameState.resources.troops - prevTroops);
      const moraleGain = Math.round(GameState.resources.morale - prevMorale);
      if (troopGain > 0) this.floatStat('Troops', troopGain);
      if (moraleGain > 0) this.floatStat('Morale', moraleGain);
      this.updateResourceHUD();
    }

    // 记录节点资源快照（供数据看板使用）
    GameState.recordNodeSnapshot(node.id, node.name);

    // ===== 生成勋章 =====
    const scoreRecord = GameState.getBattleScore(node.id);
    const score = scoreRecord ? scoreRecord.score : 75;
    const rating = scoreRecord ? scoreRecord.rating : '良好';
    const medalSvg = generateMedalSVG(node, score);
    GameState.recordMedal(node.id, score, rating, medalSvg);
    this.renderMedalWall();

    // ===== 解锁党史图鉴卡牌 =====
    const cardUnlockMap = { 1: 'party_founding', 2: 'nanchang_uprising', 3: 'zunyi_meeting', 11: 'yanan_years' };
    if (cardUnlockMap[node.id]) {
      GameState.unlockHistoryCard(cardUnlockMap[node.id]);
    }

    // ===== 通关检测 =====
    if (node.id === 12) {
      GameState.markGameCompleted();
      // 通关后解锁全部卡牌
      HISTORY_CARDS.filter(card => card.optionalStory !== true).forEach(card => GameState.unlockHistoryCard(card.id));
      // 显示通关奖励入口
      document.getElementById('rewardEntries').style.display = 'flex';
      this.showToast(`长征胜利！通关奖励已解锁`);
      if(typeof Victory49!=='undefined'&&(typeof Education43==='undefined'||!Education43.installed))Victory49.open();
    } else {
      this.showToast(`通关：${node.name}！获得「${node.spiritKeyword}」精神徽章`);
    }

    // 30%概率触发战友谈话
    setTimeout(() => {
      if (node.id !== 1 && node.id !== 12 && !document.querySelector('dialog[open]')) this.maybeTriggerNpcChat(node);
    }, 2000);
    return true;
  },

  // ===== 战报日志 =====
  addJournalEntry(node) {
    // 从数据层取史实文本作为战报摘要
    const journalHistoryData = getNodeHistory(node.historyId || node.id);
    const journalText = journalHistoryData && journalHistoryData.text
      ? journalHistoryData.text.substring(0, 80) + '...'
      : `${node.name} · ${node.date}`;
    const entry = {
      title: node.name,
      date: node.date,
      text: journalText,
      result: `获得「${node.spiritKeyword}」精神徽章`,
      type: node.type
    };
    this.journalEntries.push(entry);
    GameState.journalEntries = this.journalEntries;
    GameState.save();
    this.renderJournal();
  },

  renderJournal() {
    const listEl = document.getElementById('journalList');
    if (this.journalEntries.length === 0) {
      listEl.innerHTML = '<div class="journal-empty">尚未经历任何战役，踏上征程吧</div>';
      return;
    }

    listEl.innerHTML = '';
    this.journalEntries.filter(entry => entry && typeof entry === 'object').forEach(entry => {
      const item = document.createElement('div');
      item.className = 'journal-entry';
      item.style.borderLeftColor = NODE_TYPE_CONFIG[entry.type]?.color || '#8C7351';
      item.innerHTML = uiHTML`
        <div class="journal-entry-title">${entry.title}</div>
        <div class="journal-entry-date">${entry.date}</div>
        <div class="journal-entry-text">${entry.text}</div>
        <div class="journal-entry-result">${entry.result}</div>
      `;
      listEl.appendChild(item);
    });
  },

  // ===== 人物面板 =====
  renderCharacters() {
    const gridEl = document.getElementById('charactersGrid');
    gridEl.innerHTML = '';
    GAME_CHARACTERS.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'character-card';
      // 从数据层取人物描述（带出处标注）
      const charDescData = getCharacterDesc(ch.name);
      const descHtml = charDescData && charDescData.desc
        ? `${charDescData.desc}<div class="history-source">出处：${charDescData.source}</div>`
        : '<span class="character-desc-empty">本章节前线代表人物 · 背景参考《中国共产党简史》</span>';
      card.innerHTML = `
        <div class="character-avatar">${ch.avatar}</div>
        <div class="character-name">${ch.name}</div>
        <div class="character-role">${ch.role}</div>
        <div class="character-desc">${descHtml}</div>
      `;
      gridEl.appendChild(card);
    });
  },

  // ===== 路由状态机（单一数据源） =====
  currentRoute: 'map',

  switchRoute(targetRoute) {
    if (this.currentRoute === targetRoute) return;

    // 如果在副本内部，先关闭副本面板
    if (this.dungeonPanel && this.dungeonPanel.classList.contains('open')) {
      this.closeDungeonPanel();
    }

    // 更新数据源
    this.currentRoute = targetRoute;

    // 同步底部Tab高亮
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === targetRoute);
    });

    // 同步一级面板显示
    this.journalPanel.classList.toggle('open', targetRoute === 'journal');
    this.charactersPanel.classList.toggle('open', targetRoute === 'characters');
    this.settingsPanel.classList.toggle('open', targetRoute === 'settings');

    // 地图交互控制：非地图路由时禁用地图交互
    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
      mapContainer.style.pointerEvents = targetRoute === 'map' ? 'auto' : 'none';
    }

    // 顶部HUD返回按钮：仅在副本面板打开时显示
    const hudExitBtn = document.getElementById('hudExitBtn');
    if (hudExitBtn) {
      hudExitBtn.style.display = (this.dungeonPanel && this.dungeonPanel.classList.contains('open')) ? 'flex' : 'none';
    }
  },

  // ===== 导航 =====
  onNavClick(btn) {
    this.switchRoute(btn.dataset.nav);
  },

  closeAllPanels() {
    this.journalPanel.classList.remove('open');
    this.charactersPanel.classList.remove('open');
    this.settingsPanel.classList.remove('open');
  },

  // ===== 通关奖励体系：勋章墙 =====
  safeMedalSvg(value) {const doc=new DOMParser().parseFromString(String(value||''),'image/svg+xml'),svg=doc.documentElement;if(svg.localName!=='svg'||doc.querySelector('parsererror'))return '';for(const el of [svg,...svg.querySelectorAll('*')]){if(!['svg','g','path','circle','rect','polygon','polyline','line','ellipse','text','tspan','defs','linearGradient','radialGradient','stop','title','desc'].includes(el.localName)){el.remove();continue;}for(const attr of [...el.attributes])if(/^on/i.test(attr.name)||/href|style/i.test(attr.name)||/url\((?!#)/i.test(attr.value))el.removeAttribute(attr.name);}return svg.outerHTML;},
  renderMedalWall() {
    const grid = document.getElementById('medalWallGrid');
    const medals = GameState.getMedals();
    if (medals.length === 0) {
      grid.innerHTML = '<div class="medal-wall-empty">通关副本后获得勋章</div>';
      return;
    }
    grid.innerHTML = '';
    medals.forEach(m => {
      const item = document.createElement('div');
      item.className = 'medal-wall-item';item.tabIndex=0;item.setAttribute('role','button');item.setAttribute('aria-label','放大查看勋章');item.onclick=()=>Mission40.showMedal(m);item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();item.click();}};
      item.innerHTML = this.safeMedalSvg(m.svg);
      grid.appendChild(item);
    });
  },

  // ===== 通关奖励体系：党史图鉴 =====
  openHistoryCards() {
    document.getElementById('historyCardsOverlay').classList.add('open');
    this.renderHistoryCards();
  },

  renderHistoryCards() {
    const grid = document.getElementById('historyCardsGrid');
    grid.innerHTML = '';
    HISTORY_CARDS.forEach(card => {
      const unlocked = GameState.isHistoryCardUnlocked(card.id);
      const item = document.createElement('div');
      item.className = 'history-card-item' + (unlocked ? ' unlocked' : ' locked');
      item.innerHTML = uiHTML`
        <div class="history-card-icon" style="color:${unlocked ? card.color : '#5A5240'}">${unlocked ? card.icon : '?'}</div>
        <div class="history-card-title">${unlocked ? card.title : '???'}</div>
        <div class="history-card-subtitle">${unlocked ? card.subtitle : card.unlockCondition}</div>
      `;
      if (unlocked) {
        item.addEventListener('click', () => this.openCardDetail(card));
      } else {
        item.addEventListener('click', () => {
          this.showToast(`解锁条件：${card.unlockCondition}`);
        });
      }
      grid.appendChild(item);
    });
  },

  openCardDetail(card) {
    this._currentCardId = card.id;
    document.getElementById('cardDetailIcon').textContent = card.icon;
    document.getElementById('cardDetailIcon').style.color = card.color;
    document.getElementById('cardDetailTitle').textContent = card.title;
    document.getElementById('cardDetailSubtitle').textContent = card.subtitle;
    document.getElementById('cardDetailBody').textContent = card.content;
    document.getElementById('cardDetailSource').textContent = card.source;
    document.getElementById('cardDetailOverlay').classList.add('open');
  },

  // ===== 通关奖励体系：AI历史问答盲盒 =====
  

  

  

  

  

  

  

  // ===== 通关奖励体系：时空信箱 =====
  

  

  // ===== 工具方法 =====
  getChallengeIcon(type) {
    const icons = {"nightlamp":"💡","bridge":"🌉","pontoon":"🛶","blanket":"🛏","zunyi":"🕯","lantern":"🏮","fish":"🎣","veg":"🌿","matches":"✦","cipher":"⌁","alliance":"◎","chains":"↗","aid":"✚",
      mortar: '💥',
      bluff: '🌫️',
      guard: '🛡️',
      drum: '🥁',
      scout: '👁️',
      collect: '🌾',
      snipe: '🎯',
      final: '🐎',
      snow: '🏔️',
      fire: '🔥',
      lob: '🧨',
      ration: '🍚',
      lamp: '🏮',
      poem: '📜',
      press: '📰',
      ferry: '⛵',
      yihai: '🤝',
      qte: '⚡',
      drag: '✋',
      choice: '🤔'
    };
    return icons[type] || '⚔';
  },

  showToast(msg) {
    const toast = this.toast?.isConnected ? this.toast : (this.toast = document.getElementById('toast'));
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }
};

/* ========================================
   初始化
   ======================================== */
document.addEventListener('DOMContentLoaded', () => {
  GameUI.init();
  MapView.init();
  RouteMap.init();
  window.CZ_RUNTIME_READY=true;
  /* [R5 修复 2026-10-28] boot-status.js 为 async 脚本，可能晚于 DOMContentLoaded 才执行，
     会同时错过 DOMContentLoaded 与 cz-game-ready 两个通知——boot.ready 永远 false，
     开始按钮被 boot-status 捕获层永久吞掉（CZ_RUNTIME_READY=true 但按钮无响应的时序竞态）。
     置位后补发专用事件，boot-status.js 监听它；晚执行的 boot-status 另有 readyState 自检兜底。 */
  window.dispatchEvent(new Event('cz-runtime-ready'));
});
