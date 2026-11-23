/* Extracted GameUI services methods. All instance state remains on GameUI. */
const GameUIServices54 = {
async checkBffHealth() {
    const result = await apiHealth();
    const statusEl=document.getElementById('bffConnectStatus');
    if (!result) {
      this.showToast('⚠ AI 服务未连接，已进入固定剧情模式');
      this.bffStatus = 'offline';
      if(statusEl)statusEl.textContent='未连接 · 可先体验固定剧情';
    } else if (result.model_configured) {
      this.showToast('✓ AI 服务已连接，AI 已配置；回复生成中会显示等待状态');
      this.bffStatus = 'online';
      if(statusEl)statusEl.textContent='已连接 · AI 模型可用';
    } else {
      this.showToast('○ AI 服务已连接，模型未配置（降级模式）');
      this.bffStatus = 'degraded';
      if(statusEl)statusEl.textContent='已连接 · 模型未配置';
    }
    return result;
  },
async autoConnectBff() {
    if(typeof BffConnection!=='undefined')return BffConnection.connect();
    const btn=document.getElementById('bffConnectBtn');
    const status=document.getElementById('bffConnectStatus');
    btn.disabled=true;btn.textContent='正在启动…';
    if(status)status.textContent='正在启动本地 BFF 并检查 AI 模型';
    try {
      const response=await fetch('/__start_bff',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      if(!response.ok)throw new Error('launcher');
      for(let attempt=0;attempt<24;attempt++) {
        const health=await apiHealth(1500);
        if(health) {
          this.bffStatus=health.model_configured?'online':'degraded';
          if(status)status.textContent=health.model_configured?'已连接 · AI 模型可用':'已连接 · 模型未配置';
          btn.textContent='重新检测 BFF';btn.disabled=false;
          this.showToast(health.model_configured?'✓ AI 服务已连接，AI 模型可用':'○ AI 服务已连接，但模型未配置');
          return;
        }
        await new Promise(resolve=>setTimeout(resolve,500));
      }
      throw new Error('timeout');
    } catch(error) {
      this.bffStatus='offline';
      if(status)status.textContent='启动失败 · 请运行 start-local.ps1';
      btn.textContent='再次自动连接';btn.disabled=false;
      this.showToast('BFF 自动连接失败，请运行 start-local.ps1 后重试');
    }
  },
async runLinkCheck() {
    const overlay = document.getElementById('linkcheckOverlay');
    const body = document.getElementById('linkcheckBody');
    overlay.classList.add('open');
    body.innerHTML = '<div class="linkcheck-running">正在检测...</div>';

    const results = [];

    // 1. /health
    const healthResp = await apiGet('/health');
    if (!healthResp) {
      results.push({ name: '/health', status: 'fail', detail: 'BFF 未连接', degraded: false });
    } else {
      const degraded = !healthResp.model_configured;
      results.push({
        name: '/health',
        status: degraded ? 'degraded' : 'ok',
        detail: `model_configured=${healthResp.model_configured}`,
        degraded
      });
    }

    // 2. /battle/parse
    const parseData = _adaptParseData(await apiBattleParse('我命令二班从铁索右侧匍匐前进'));
    if (!parseData) {
      results.push({ name: '/battle/parse', status: 'fail', detail: '请求失败或超时', degraded: false });
    } else {
      const degraded = parseData.degraded === true;
      results.push({
        name: '/battle/parse',
        status: degraded ? 'degraded' : 'ok',
        detail: `tactic=${parseData.tactic || ''} risk=${parseData.risk || ''} advantage=${parseData.advantage || ''}`,
        degraded
      });
    }

    // 3. /battle/report
    const reportData = _adaptReportData(await apiBattleReport('冲锋', { tactic: '正面突破', risk: 'high', advantage: 'speed', description: '' }, { success: true, maxCombo: 12, missCount: 2 }));
    if (!reportData) {
      results.push({ name: '/battle/report', status: 'fail', detail: '请求失败或超时', degraded: false });
    } else {
      const degraded = reportData.degraded === true;
      results.push({
        name: '/battle/report',
        status: degraded ? 'degraded' : 'ok',
        detail: `outcome=${reportData.outcome || ''} rating=${reportData.rating || ''} summary=${(reportData.summary || '').substring(0, 60)}`,
        degraded
      });
    }

    // 4. /npc/chat
    const chatData = _adaptChatData(await apiNpcChat('commander_1', '班长，我害怕', 'luding', []));
    if (!chatData) {
      results.push({ name: '/npc/chat', status: 'fail', detail: '请求失败或超时', degraded: false });
    } else {
      const degraded = chatData.degraded === true;
      results.push({
        name: '/npc/chat',
        status: degraded ? 'degraded' : 'ok',
        detail: `text=${(chatData.text || '').substring(0, 60)} mood=${chatData.mood || ''} references=${(chatData.references || []).length}条`,
        degraded
      });
    }

    // 5. /history/compare
    const compareData = _adaptCompareData(await apiHistoryCompare({ command: '冲锋', tactic: '正面突破', qteResult: { success: true, maxCombo: 12, missCount: 2 }, battleReport: { outcome: '胜利', rating: '出色' }, resources: { troops: 75, ammo: 60, food: 50, morale: 80 }, outcome: '胜利', casualtyCount: 1 }));
    if (!compareData) {
      results.push({ name: '/history/compare', status: 'fail', detail: '请求失败或超时', degraded: false });
    } else {
      const degraded = compareData.degraded === true;
      const historyKeys = compareData.history ? Object.keys(compareData.history).length : 0;
      results.push({
        name: '/history/compare',
        status: degraded ? 'degraded' : 'ok',
        detail: `history=${historyKeys}个事件 comparison=${(compareData.comparison || []).length}条`,
        degraded
      });
    }

    // 渲染结果
    body.innerHTML = '';
    results.forEach(r => {
      const item = document.createElement('div');
      item.className = 'linkcheck-item';
      const badge = r.degraded ? '<span class="linkcheck-item-degraded-badge">降级</span>' : '';
      item.innerHTML = `
        <div class="linkcheck-item-header">
          <span class="linkcheck-item-name">${r.name}${badge}</span>
          <span class="linkcheck-item-status ${r.status}">${r.status === 'ok' ? '正常' : r.status === 'degraded' ? '降级' : '失败'}</span>
        </div>
        <div class="linkcheck-item-detail">${r.detail}</div>
      `;
      body.appendChild(item);
    });
  },
async prefetchTelegram(nodeId) {
    if (this.telegramCache.has(nodeId)) {
      return this.telegramCache.get(nodeId);  // 已缓存
    }
    const node = GAME_NODES.find(n => n.id === nodeId);
    if (!node) return null;
    const levelInfo = this.nodeLevelMap[nodeId] || { level: 'ruijin', scene: 'river_crossing' };
    const levelCfg = this.loadLevelConfig(nodeId);

    // 静默请求电报数据（不显示loading）
    const context = {
      hp: Math.round(GameState.resources.troops),
      ammo: Math.round(GameState.resources.ammo),
      time_remaining: 60
    };

    try {
      const reportData = _adaptReportData(await apiBattleReport('', {}, { success: true, maxCombo: 0, missCount: 0 }));

      if (reportData) {
        // 预加载的数据也需要校验时间线
        const fullText = [
          reportData.summary || reportData.narrative || '',
          reportData.recommendation || reportData.suggestion || ''
        ].join('\n');
        const validation = this.validateTimeline(fullText, levelCfg);
        if (!validation.valid) {
          reportData.summary = levelCfg.sceneAtmosphere + '。' +
            (levelCfg.fallbackScene ? '你下令' + levelCfg.fallbackScene.action + '——不停手，就有希望！' : '');
          reportData.narrative = reportData.summary;
          reportData.recommendation = '继续前进。';
          reportData.suggestion = '继续前进。';
          reportData.degraded = true;
        }
        this.telegramCache.set(nodeId, reportData);
        return reportData;
      }
    } catch (e) {
      console.warn('[prefetchTelegram] 预加载失败:', e);
    }
    return null;
  },
async submitCommand() {
    if (!this.commandCurrentNode) { this.showToast('请重新进入本章指挥所'); return; }
    if (this.commandSubmitting) return;
    const commandSession=this.commandSession;
    const command = this.getFinalCommand();
    const hasCustom=!!document.getElementById('commandInput').value.trim();
    if (!command) {
      this.showToast('请选择战术磁贴或输入指令');
      return;
    }

    this.commandSubmitting = true;
    const submitBtn = document.getElementById('commandSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = hasCustom?'AI 解析中…':'正在整理行动…';

    // 显示 loading 覆盖层
    const loadingEl = document.getElementById('commandLoading');
    if (loadingEl) loadingEl.style.display = 'flex';

    this.commandFreeCommands.push(command);

    const node = this.commandCurrentNode;
    if(typeof DecisionCinema!=='undefined')DecisionCinema.play(node,command,{kind:hasCustom?'custom_decision':'fixed_decision',userInitiated:true,isCurrent:()=>this.commandSession===commandSession&&document.getElementById('commandOverlay').classList.contains('open')});
    const levelInfo = this.nodeLevelMap[node.id] || { level: 'ruijin', scene: 'river_crossing' };

    // 构建context
    const context = {
      hp: Math.round(GameState.resources.troops),
      ammo: Math.round(GameState.resources.ammo),
      time_remaining: 180,
      squad_status: [],
      current_position: 'bridge_west_end'
    };

    // [P1 修复 2026-10-26] 解析主流程改造（G1-01 方案A）：
    // 旧流程等满整个 parse 预算（线上部署约 38s / 本树 55s）才渲染，云端冷启动期间全程 loading；
    // 新流程 12 秒内先出本地可用结果，模型结果迟到后补位升级（三重校验防上一章结果串台）。
    const parseDeadline=Number(window.CZ_TIMEOUTS?.parse)||55000;
    let fallbackTimer;
    const parsePromise=hasCustom?apiBattleParse(command):Promise.resolve(null);
    const parseData = _adaptParseData(await Promise.race([parsePromise,new Promise(resolve=>{fallbackTimer=setTimeout(()=>resolve(null),Math.min(parseDeadline,12000)+500);})]));
    clearTimeout(fallbackTimer);
    if(commandSession!==this.commandSession||this.commandCurrentNode!==node||!document.getElementById('commandOverlay')?.classList.contains('open'))return;

    // 隐藏 loading 覆盖层
    if (loadingEl) loadingEl.style.display = 'none';

    const applyParse=(data)=>{
      this.commandParseData=data;
      document.getElementById('commandDegradedBadge').style.display=(data&&data.degraded)?'block':'none';
      // 应用emotion色调
      this.applyEmotionTheme(document.getElementById('commandOverlay'), data.emotion_tag);
      // 显示narrative_hint
      const hintEl = document.getElementById('commandNarrativeHint');
      if (data.narrative_hint) {
        hintEl.textContent = data.narrative_hint;
        hintEl.classList.add('show');
      } else {
        hintEl.classList.remove('show');
      }
      // 渲染决策三任务结果（ AI评级 / 优化建议 / 史实复盘）
      this.renderDecisionResult(data);
      // 渲染行动卡
      this.renderActionCards(data.actions || []);
      // 显示确认按钮
      if (data.actions && data.actions.length > 0) {
        document.getElementById('commandConfirm').style.display = 'block';
      }
    };
    const buildDecisionEntry=(data)=>{
      const actions=Array.isArray(data?.actions)?data.actions:[];
      return {
        videoHandled:true,nodeId: node?.id || 'unknown', nodeName: node?.name || '行军节点', command, phase:'proposed', videoKind:hasCustom?'custom_decision':'fixed_decision',
        modules: actions.map(action => `${action.verb || ''}${action.target || ''}`),
        outcome: data?.rating || '待执行',
        score: Math.round((actions.reduce((sum, action) => sum + (Number(action.feasibility) || .5), 0) / Math.max(1, actions.length)) * 20),
        counter: data?.risk_note || data?.suggestion || ''
      };
    };
    let proposalId=null;
    if (!parseData || parseData.degraded) {
      // 本地降级：保留本章玩家的行动顺序，不展示服务端通用模板。
      // localParseCommand 自带 degraded:true → 「简化模式」角标语义与旧版一致。
      applyParse(this.localParseCommand(command));
      // 模型结果迟到不丢弃：12s 后到达即补位升级。三重校验（会话/节点/浮层开）+
      // 「尚未进入下一步」（确认键仍显示），任一不满足则静默丢弃，避免打断用户。
      parsePromise.then(late=>{
        const d=_adaptParseData(late);
        if(!d||d.degraded)return;
        if(commandSession!==this.commandSession||this.commandCurrentNode!==node)return;
        if(!document.getElementById('commandOverlay')?.classList.contains('open'))return;
        if(document.getElementById('commandConfirm').style.display!=='block')return;
        applyParse(d);
        // 战报/经验读取的是决策轨迹：把同一条 proposed 记录对齐到最终模型结果。
        if(proposalId)GameState.refineProposedDecision?.(proposalId,buildDecisionEntry(d));
        this.showToast('AI 解析已就绪，决策卡已更新');
      }).catch(()=>{});
    } else {
      applyParse(parseData);
    }

    const proposal=GameState.recordStrategicDecision(buildDecisionEntry(this.commandParseData));
    proposalId=proposal?.id||null;

    this.commandSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = '下达指令';
  },
async requestBattleReport(victory) {
    this.reportController?.abort();
    const reportController=this.reportController=new AbortController();
    const requestId=this.reportRequestId=(this.reportRequestId||0)+1;
    const node = this.qteCurrentNode;
    if(!node){this._forceReturnToMap();return;}
    const levelInfo = this.nodeLevelMap[node.id] || { level: 'ruijin', scene: 'river_crossing' };

    // 显示电报 loading 态
    this.showTelegramLoading();

    const context = {
      hp: Math.round(GameState.resources.troops),
      ammo: Math.round(GameState.resources.ammo),
      time_remaining: 60
    };

    // 构建契约入口参数
    const command = this.commandFreeCommands.join('；') || '';
    const commandAnalysis = this.commandParseData ? {
      tactic: this.commandParseData.tactic || '',
      risk: this.commandParseData.risk || '',
      advantage: this.commandParseData.advantage || '',
      description: this.commandParseData.description || ''
    } : {};
    const qteResult = {
      success: victory,
      maxCombo: this.qteClickCount || 0,
      missCount: 0
    };

    let useLocal;
    const localChoice=new Promise(resolve=>{useLocal=()=>{reportController.abort();resolve(null);};});
    const localButton=document.createElement('button');localButton.textContent='不等待 · 查看本地战报';localButton.className='morse-chapter-button';localButton.dataset.localReport='true';localButton.onclick=useLocal;
    document.getElementById('telegramText')?.insertAdjacentElement('afterend',localButton);
    const reportData = _adaptReportData(await Promise.race([apiBattleReport(command, commandAnalysis, qteResult, reportController.signal),localChoice]));
    localButton.remove();
    if(this.reportController===reportController)this.reportController=null;
    if(requestId!==this.reportRequestId||this.qteCurrentNode!==node)return;

    this.hideTelegramLoading();

    if (!reportData) {
      // 本地降级战报
      this.showTelegramReport(this.localBattleReport(victory));
    } else {
      // 关卡数据隔离：校验 AI战报全文本是否合规（summary + recommendation）
      const levelCfg = this.loadLevelConfig(node.id);
      // 前端兜底：如果summary为空/undefined，用关卡兜底文案填充
      if (!reportData.summary) {
        reportData.summary = levelCfg.sceneAtmosphere + '。' +
          (levelCfg.fallbackScene ? '你下令' + levelCfg.fallbackScene.action + '——不停手，就有希望！' : '');
        reportData.narrative = reportData.summary;
        reportData.degraded = true;
        console.warn('[requestBattleReport] summary为空，已用关卡兜底文案填充');
      }
      if (!reportData.recommendation) {
        reportData.suggestion = '继续前进。';
        reportData.recommendation = '继续前进。';
      }
      const fullText = [
        reportData.summary || '',
        reportData.recommendation || ''
      ].join('\n');
      const validation = this.validateAIContent(fullText, levelCfg);
      if (!validation.valid) {
        reportData.summary = levelCfg.sceneAtmosphere + '。' +
          (levelCfg.fallbackScene ? '你下令' + levelCfg.fallbackScene.action + '——不停手，就有希望！' : '');
        reportData.narrative = reportData.summary;
        reportData.suggestion = '继续前进。';
        reportData.recommendation = '继续前进。';
        reportData.degraded = true;
      }
      this.showTelegramReport(reportData);
    }
  },
localBattleReport(victory) {
    const node = this.qteCurrentNode;
    const decisions = this.qtePlayerDecisions;
    const totalCasualty = decisions.reduce((sum, d) => sum + (d.casualty || 0), 0);

    const outcome = victory ? '胜利' : '受挫';
    const rating = victory ? (totalCasualty <= 2 ? '辉煌' : totalCasualty <= 5 ? '出色' : '艰难') : '失利';
    return {
      outcome,
      rating,
      summary: victory
        ? `你在${node.name}的战斗中完成了${decisions.length}次决策，成功突破。${totalCasualty}名同志负伤。`
        : `你在${node.name}的战斗中未能突破，${totalCasualty}名同志负伤。需要重新调整战术。`,
      casualties: victory ? (totalCasualty <= 2 ? '轻微伤亡' : totalCasualty <= 5 ? '中等伤亡' : '重大伤亡') : '中等伤亡',
      moraleChange: victory ? '+15' : '-15',
      recommendation: victory ? '继续前进。' : '重新整顿，再次尝试。',
      keyMoment: victory ? `${decisions.length}次决策突破` : '战术执行失败',
      // 兼容旧 UI 字段
      narrative: victory
        ? `你在${node.name}的战斗中完成了${decisions.length}次决策，成功突破。${totalCasualty}名同志负伤。`
        : `你在${node.name}的战斗中未能突破，${totalCasualty}名同志负伤。需要重新调整战术。`,
      history_ref: null,
      suggestion: victory ? '继续前进。' : '重新整顿，再次尝试。',
      emotion_tag: victory ? 'hopeful' : 'defeat',
      degraded: true
    };
  },
maybeTriggerNpcChat(node) {
    if (Math.random() > 0.3) return;

    // 按节点类型匹配角色
    const candidates = NPC_NODE_MATCH[node.type] || ['wang_gui'];
    const roleId = candidates[Math.floor(Math.random() * candidates.length)];

    // 获取关卡标识
    const levelInfo = this.nodeLevelMap[node.id] || { level: 'ruijin' };

    this.openNpcChat(roleId, levelInfo.level, node);
  },
openNpcChat(roleId, level, node) {
    const roleConfig = NPC_ROLES[roleId];
    if (!roleConfig) return;
    this.npcSession = (this.npcSession || 0) + 1;
    this.npcRequestId = (this.npcRequestId || 0) + 1;
    clearInterval(this.npcTypewriterTimer);
    clearTimeout(this.npcTypingTimeout);
    this.npcTypingTimeout = null;
    this.hideNpcTypingIndicator();
    this.npcSubmitting = false;
    this.stopNpcVoice();
    this.npcCurrentRole = roleId;
    this.npcCurrentLevel = level;
    this.npcChatHistory = [];
    this.npcIsTyping = false;

    // 设置头像和名称
    document.getElementById('npcName').textContent = roleConfig.name;
    document.getElementById('npcRoleLabel').textContent = `${roleConfig.label} · 行军途中`;
    document.getElementById('npcPortrait').innerHTML = NPC_PORTRAITS[roleId] || NPC_PORTRAITS.wang_gui || '<svg viewBox="0 0 120 160" role="img" aria-label="虚构战友剪影"><circle cx="60" cy="36" r="18" fill="currentColor"/><path d="M35 65Q60 50 85 65L98 150H22Z" fill="currentColor"/></svg>';
    if(typeof NpcFaces!=='undefined')NpcFaces.paint(document.getElementById('npcPortrait'),roleId,roleConfig.name);
    document.getElementById('npcPortrait').dataset.name = roleConfig.name;
    document.getElementById('npcPortrait').className = 'npc-portrait emotion-calm';
    document.getElementById('npcChatFlow').innerHTML = '';
    document.getElementById('npcSuggestActions').innerHTML = '';
    document.getElementById('npcInput').value = '';
    document.getElementById('npcDegradedBadge').style.display = 'none';

    // 显示对话覆盖层
    document.getElementById('npcOverlay').classList.add('open');
    if(typeof NpcModelChoice56!=='undefined')NpcModelChoice56.mount();

    // NPC先开口（自动发送一条开场白）
    const openingSession = this.npcSession;
    setTimeout(() => {
      if (openingSession !== this.npcSession) return;
      this.npcOpeningMessage(roleId, level, node);
    }, 600);
  },
async npcOpeningMessage(roleId, level, node) {
    if (this.npcCurrentRole !== roleId || this.npcCurrentLevel !== level) return;
    const place = node ? node.name : '当前地点';
    this.renderNpcAiMessage({ reply: `同志，我们在${place}。你想了解当前任务，还是需要互相照应？（虚构战友对话）`, emotion_tag: 'calm' });
  },
async sendNpcMessage() {
    if (this.npcIsTyping || this.npcSubmitting) return;
    const input = document.getElementById('npcInput');
    const message = input.value.trim();
    if (!message) return;
    const previous = this.npcChatHistory.slice(-12);
    this.renderNpcPlayerMessage(message);
    input.value = '';
    this.npcSubmitting = true;
    this.npcPendingInput = message;
    this.showNpcTypingIndicator();
    const session = this.npcSession;
    const requestId = this.npcRequestId = (this.npcRequestId || 0) + 1;
    clearTimeout(this.npcTypingTimeout);
    this.npcTypingTimeout=setTimeout(()=>{if(session===this.npcSession&&requestId===this.npcRequestId){this.npcRequestId++;this.onNpcReplyTimeout(message);}},(Number(window.CZ_TIMEOUTS?.npc)||40000)+(typeof EdgeBridge42!=='undefined'&&EdgeBridge42.enabled&&EdgeBridge42.ready?61000:2000));
    const npcId = ROLE_TO_NPC_ID[this.npcCurrentRole] || 'commander_1';
    try {
      const raw = await apiNpcChat(npcId, message, this.npcCurrentLevel, previous, typeof NpcModelChoice56!=='undefined'?NpcModelChoice56.read():'auto');
      if (session !== this.npcSession || requestId !== this.npcRequestId) return;
      clearTimeout(this.npcTypingTimeout);this.npcTypingTimeout=null;
      const data = _adaptChatData(raw);
      this.npcLastReplyDegraded=!data||data.degraded===true;
      this.hideNpcTypingIndicator();
      this.npcSubmitting = false;
      if (data&&raw?.offlineWitness) {
        const sourceBadge=document.getElementById('npcDegradedBadge');sourceBadge.style.display='block';sourceBadge.textContent=(raw.mode==='edge'?'本机端侧模型':'本机规则库 · 非模型推理')+' · 离线见证，非史料';this.renderNpcAiMessage(data);
      }
      else if (!data || data.degraded) {
        if(typeof NpcModelChoice56!=='undefined')NpcModelChoice56.failure(message);else this.renderNpcDegradedMessage(this.npcCurrentRole, message);
      }
      else {
        const sourceBadge=document.getElementById('npcDegradedBadge');sourceBadge.style.display='block';sourceBadge.textContent=data.mode==='edge'?'端侧 AI生成 · 非史料':data.mode==='model'?'AI 虚构对话 · 史实参考档案':'本地剧情回复';
        this.renderNpcAiMessage(data);
      }
    } catch (_) {
      if (session !== this.npcSession || requestId !== this.npcRequestId) return;
      this.hideNpcTypingIndicator();
      this.npcSubmitting = false;
      this.npcLastReplyDegraded=true;
      clearTimeout(this.npcTypingTimeout);this.npcTypingTimeout=null;
      if(typeof NpcModelChoice56!=='undefined')NpcModelChoice56.failure(message);else this.renderNpcDegradedMessage(this.npcCurrentRole, message);
    }
  },
onNpcReplyTimeout(lastMessage) {
    this.npcTypingTimeout = null;
    this.npcSubmitting = false;
    this.hideNpcTypingIndicator();

    // 显示超时气泡 + 重试按钮
    const flow = document.getElementById('npcChatFlow');
    const timeoutBubble = document.createElement('div');
    timeoutBubble.className = 'npc-bubble-ai npc-bubble-timeout';
    timeoutBubble.innerHTML = `
      <span class="npc-timeout-text">连接暂未返回，可以重试，或切回固定剧情继续。</span>
      <button class="npc-retry-btn">重新发送</button>
    `;
    flow.appendChild(timeoutBubble);
    flow.scrollTop = flow.scrollHeight;

    // Retry through the same guarded request path; a closed session cannot write back.
    timeoutBubble.querySelector('.npc-retry-btn').onclick=()=>{timeoutBubble.remove();const input=document.getElementById('npcInput');input.value=lastMessage||'';this.sendNpcMessage();};
  },
showNpcTypingIndicator() {
    this.npcIsTyping = true;
    const flow = document.getElementById('npcChatFlow');
    const indicator = document.createElement('div');
    indicator.className = 'npc-typing-indicator';
    indicator.id = 'npcTypingIndicator';
    indicator.innerHTML = '<span class="npc-typing-text">对方正在输入…</span><span class="npc-typing-dots"><i></i><i></i><i></i></span>';
    flow.appendChild(indicator);
    flow.scrollTop = flow.scrollHeight;
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='取消等待 · 保留输入';
    cancel.onclick=()=>{this.npcRequestId=(this.npcRequestId||0)+1;clearTimeout(this.npcTypingTimeout);this.npcSubmitting=false;this.hideNpcTypingIndicator();const field=document.getElementById('npcInput');if(field&&!field.value)field.value=this.npcPendingInput||'';};indicator.append(cancel);
    this.npcWaitNotice=setTimeout(()=>{const text=indicator.querySelector('.npc-typing-text');if(indicator.isConnected&&text)text.textContent='模型仍在处理，可以取消，或切回固定剧情；不会替你执行行动。';},3000);

    // 禁用输入框
    const inputEl = document.getElementById('npcInput');
    if (inputEl) inputEl.disabled = true;
    const sendBtn = document.getElementById('npcSendBtn');
    if (sendBtn) sendBtn.disabled = true;
  },
hideNpcTypingIndicator() {
    clearTimeout(this.npcWaitNotice);
    this.npcIsTyping = false;
    const indicator = document.getElementById('npcTypingIndicator');
    if (indicator) indicator.remove();

    // 恢复输入框
    const inputEl = document.getElementById('npcInput');
    if (inputEl) inputEl.disabled = false;
    const sendBtn = document.getElementById('npcSendBtn');
    if (sendBtn) sendBtn.disabled = false;
  },
renderNpcPlayerMessage(message, replay=false) {
    const flow = document.getElementById('npcChatFlow');
    const bubble = document.createElement('div');
    bubble.className = 'npc-bubble-player';
    bubble.textContent = message;
    flow.appendChild(bubble);
    if(!replay)flow.scrollTop = flow.scrollHeight;

    this.npcChatHistory.push({ role: 'player', text: message });
  },
renderNpcAiMessage(chatData) {
    const flow = document.getElementById('npcChatFlow');
    const bubble = document.createElement('div');
    bubble.className = 'npc-bubble-ai';
    bubble.dataset.speaker = NPC_ROLES[this.npcCurrentRole]?.name || '剧情旁白';

    const emotion = chatData.emotion_tag || 'calm';
    bubble.classList.add('emotion-' + emotion);

    flow.appendChild(bubble);

    // 更新头像emotion
    document.getElementById('npcPortrait').className = 'npc-portrait emotion-' + emotion;

    // 播放NPC语音
    if(!chatData.replay)this.playNpcVoice(this.npcCurrentRole, emotion, chatData.reply || '');

    // 打字机效果
    const finishReply = () => {
      // 打字完成后添加citation
      if (chatData.citation) {
        const citationEl = document.createElement('div');
        citationEl.className = 'npc-citation';
        const c = chatData.citation;
        citationEl.textContent = `史实出处：${c.document_title || ''} · ${c.date || ''}`;
        bubble.appendChild(citationEl);
      }

      // 渲染suggest_action快捷按钮
      if (chatData.suggest_action) {
        this.renderNpcSuggestAction(chatData.suggest_action);
      }

      // 分段回复：如果has_continuation为true，显示"继续听"按钮
      if (chatData.has_continuation) {
        const continueBtn = document.createElement('button');
        continueBtn.className = 'npc-continue-btn';
        continueBtn.textContent = '继续听 ▶';
        continueBtn.addEventListener('click', () => {
          continueBtn.remove();
          this.requestNpcContinuation();
        });
        bubble.appendChild(continueBtn);
      }
    };
    if (chatData.instant) {
      bubble.textContent = chatData.reply || '...';
      this.npcIsTyping = false;
      finishReply();
      if(!chatData.replay)flow.scrollTop = flow.scrollHeight;
    } else this.npcTypewriter(bubble, chatData.reply || '...', finishReply);

    this.npcChatHistory.push({
      role: 'ai',
      text: chatData.reply || '',
      emotion: emotion,
      citation: chatData.citation || null,
      has_continuation: chatData.has_continuation || false
    });
  },
async requestNpcContinuation() {
    if (this.npcIsTyping || this.npcSubmitting) return;
    document.getElementById('npcInput').value = '请接着说明刚才的任务，不要转移话题。';
    await this.sendNpcMessage();
  },
localNpcReply(message) {
    const text = (message || '').trim();
    if (!text) return '同志，你想了解当前任务，还是需要帮助？';
    if (/^[？?！!。\s]+$/.test(text)) return '刚才的意思没有说明白。你是想问目前的任务，还是想问我需要什么帮助？';
    if (/拉你|扶你|帮你|救你|照顾/.test(text)) return '谢谢你愿意帮忙。我们先站稳、确认安全，再互相照应着前进。';
    if (/加油|肯定|可以|勇气|坚持/.test(text)) return '谢谢你的鼓励。我们按任务安排互相配合，照顾好身边的同志。';
    if (/伤|疼|医|救护/.test(text)) return '你提到救护。我们先确认伤员的状况，并向卫生人员报告，不擅自处理。';
    if (/粮|物资|补给|吃/.test(text)) return '你说的是补给问题。先清点现有物资，再按任务需要分配，也要照顾伤员。';
    if (/历史|时间|哪年|会议|谁|多少/.test(text)) return '这个问题需要核对史料。当前离线回复不提供未经核实的历史细节，请查看带来源的历史档案。';
    return `我听到你说“${text.slice(0, 50)}”。当前使用本地简短回复，暂时不能深入理解这句话；请说明你想讨论的具体任务。`;
  },
renderNpcDegradedMessage(roleId, message) {
    const last = [...this.npcChatHistory].reverse().find(item => item.role === 'player');
    document.getElementById('npcDegradedBadge').style.display = 'block';
    document.getElementById('npcDegradedBadge').textContent='AI 暂未接通 · 当前为本地回复';
    this.renderNpcAiMessage({ reply: this.localNpcReply(message === undefined ? (last && last.text) : message), emotion_tag: 'calm', degraded: true });
  },
renderNpcSuggestAction(action) {
    const container = document.getElementById('npcSuggestActions');
    const btn = document.createElement('button');
    btn.className = 'npc-suggest-btn';
    btn.textContent = action;
    btn.addEventListener('click', () => {
      document.getElementById('npcInput').value = action;
      this.sendNpcMessage();
      container.innerHTML = '';
    });
    container.appendChild(btn);
  },
npcTypewriter(el, text, onComplete) {
    this.npcIsTyping = true;
    let i = 0;
    clearInterval(this.npcTypewriterTimer);

    // 动态打字机速度：短文本慢速（有代入感），长文本自动加速（防等待焦虑）
    const charDelay = 24;
    const batchSize = Math.max(12,Math.ceil(text.length/8));

    el.innerHTML = '<span class="npc-typing-content"></span><span class="npc-typing-cursor"></span>';
    const contentEl = el.querySelector('.npc-typing-content');

    this.npcTypewriterTimer = setInterval(() => {
      if (i < text.length) {
        contentEl.textContent += text.slice(i,i+batchSize);
        i+=batchSize;
        const flow=document.getElementById('npcChatFlow');if(!this.npcScrollFrame)this.npcScrollFrame=requestAnimationFrame(()=>{this.npcScrollFrame=null;if(flow?.isConnected)flow.scrollTop=flow.scrollHeight;});
      } else {
        clearInterval(this.npcTypewriterTimer);
        const cursor = el.querySelector('.npc-typing-cursor');
        if (cursor) cursor.remove();
        this.npcIsTyping = false;
        if (onComplete) onComplete();
      }
    }, charDelay);

    // 点击气泡跳过打字机，瞬间显示全文
    el.onclick = () => {
      if (!this.npcIsTyping) return;
      clearInterval(this.npcTypewriterTimer);
      contentEl.textContent = text; // 瞬间渲染全文
      const cursor = el.querySelector('.npc-typing-cursor');
      if (cursor) cursor.remove();
      this.npcIsTyping = false;
      if (onComplete) onComplete();
    };
  },
closeNpcChat() {
    this.npcSession = (this.npcSession || 0) + 1;
    this.npcRequestId = (this.npcRequestId || 0) + 1;
    document.getElementById('npcOverlay').classList.remove('open');
    clearInterval(this.npcTypewriterTimer);
    clearTimeout(this.npcTypingTimeout);
    this.npcTypingTimeout = null;
    this.npcSubmitting = false;
    this.hideNpcTypingIndicator();
    this.npcIsTyping = false;
    this.npcCurrentRole = null;
    this.npcChatHistory = [];
    this.stopNpcVoice();
  },
openHistoryQa(cardId) {
    document.getElementById('cardDetailOverlay').classList.remove('open');
    document.getElementById('historyQaOverlay').classList.add('open');
    document.getElementById('historyQaChatFlow').innerHTML = '';
    document.getElementById('historyQaInput').value = '';
    document.getElementById('historyQaDegradedBadge').style.display = 'none';
    document.getElementById('historyQaPortrait').innerHTML = NPC_PORTRAITS['he_wen'] || '';if(typeof NpcFaces!=='undefined')NpcFaces.paint(document.getElementById('historyQaPortrait'),'he_wen','指导员何文');

    this._historyQaCardId = cardId;
    this._historyQaHistory = [];
    this._historyQaIsTyping = false;

    // 开场白
    const card = HISTORY_CARDS.find(c => c.id === cardId);
    const openingMsg = card
      ? `你选中了「${card.title}」这张卡牌。关于这段历史，你想了解什么？有出处的问题我才能回答。`
      : '你想了解哪段历史？有出处的问题我才能回答。';

    this.renderHistoryQaAiMessage({ reply: openingMsg, emotion_tag: 'calm', citation: null });
  },
closeHistoryQa() {
    document.getElementById('historyQaOverlay').classList.remove('open');
    clearInterval(this._historyQaTypewriterTimer);
    this._historyQaIsTyping = false;
    this._historyQaCardId = null;
    this._historyQaHistory = [];
  },
async sendHistoryQa() {
    if (this._historyQaIsTyping || this._historyQaSubmitting) return;
    const input = document.getElementById('historyQaInput');
    const message = input.value.trim();
    if (!message) return;

    this.renderHistoryQaPlayerMessage(message);
    input.value = '';

    // 防重复提交 + loading 态
    this._historyQaSubmitting = true;
    try {
    this.showHistoryQaTypingIndicator();

    const card = HISTORY_CARDS.find(c => c.id === this._historyQaCardId);
    const context = {
      hp: Math.round(GameState.resources.troops),
      current_scene: card ? card.id : 'general',
      round: this._historyQaHistory.length + 1
    };

    const chatData = _adaptChatData(await apiNpcChat('commander_3', message, card ? card.id : 'general', this._historyQaHistory || []));

    this.hideHistoryQaTypingIndicator();
    this._historyQaSubmitting = false;

    if (!chatData) {
      // 降级：用NPC_LINES.he_wen台词
      const lines = NPC_LINES['he_wen'] || NPC_LINES['wang_gui'];
      const line = lines[Math.floor(Math.random() * lines.length)];
      this.renderHistoryQaAiMessage({
        reply: line.text,
        text: line.text,
        emotion_tag: line.emotion || 'calm',
        mood: 'neutral',
        citation: null,
        references: [],
        degraded: true
      });
      document.getElementById('historyQaDegradedBadge').style.display = 'block';
    } else {
      // 检查是否有references（无出处兜底）
      if (!chatData.references || chatData.references.length === 0) {
        if (!chatData.degraded) {
          this.renderHistoryQaAiMessage({
            reply: SNOW_LETTER_TEMPLATE.fallbackResponse,
            text: SNOW_LETTER_TEMPLATE.fallbackResponse,
            emotion_tag: 'calm',
            mood: 'neutral',
            citation: null,
            references: []
          });
        } else {
          this.renderHistoryQaAiMessage(chatData);
        }
      } else {
        this.renderHistoryQaAiMessage(chatData);
      }
      if (chatData.degraded) {
        document.getElementById('historyQaDegradedBadge').style.display = 'block';
      } else {
        document.getElementById('historyQaDegradedBadge').style.display = 'none';
      }
    }
    } catch(error) { this.showToast('服务暂未完成，内容已保留，请重试。'); } finally { this._historyQaSubmitting=false;this.hideHistoryQaTypingIndicator(); }
  },
showHistoryQaTypingIndicator() {
    const flow = document.getElementById('historyQaChatFlow');
    if (!flow) return;
    const indicator = document.createElement('div');
    indicator.className = 'npc-typing-indicator';
    indicator.id = 'historyQaTypingIndicator';
    indicator.innerHTML = '<span class="npc-typing-text">指导员正在查阅资料…</span><span class="npc-typing-dots"><i></i><i></i><i></i></span>';
    flow.appendChild(indicator);
    flow.scrollTop = flow.scrollHeight;
    const inputEl = document.getElementById('historyQaInput');
    if (inputEl) inputEl.disabled = true;
  },
hideHistoryQaTypingIndicator() {
    const indicator = document.getElementById('historyQaTypingIndicator');
    if (indicator) indicator.remove();
    const inputEl = document.getElementById('historyQaInput');
    if (inputEl) inputEl.disabled = false;
  },
renderHistoryQaPlayerMessage(message) {
    const flow = document.getElementById('historyQaChatFlow');
    const bubble = document.createElement('div');
    bubble.className = 'npc-bubble-player';
    bubble.textContent = message;
    flow.appendChild(bubble);
    flow.scrollTop = flow.scrollHeight;
    this._historyQaHistory.push({ role: 'player', text: message });
  },
renderHistoryQaAiMessage(chatData) {
    const flow = document.getElementById('historyQaChatFlow');
    const bubble = document.createElement('div');
    bubble.className = 'npc-bubble-ai';
    const emotion = chatData.emotion_tag || 'calm';
    bubble.classList.add('emotion-' + emotion);
    flow.appendChild(bubble);

    // 打字机效果
    this._historyQaIsTyping = true;
    let i = 0;
    const text = chatData.reply || '...';
    clearInterval(this._historyQaTypewriterTimer);
    bubble.innerHTML = '<span class="npc-typing-content"></span><span class="npc-typing-cursor"></span>';
    const contentEl = bubble.querySelector('.npc-typing-content');

    this._historyQaTypewriterTimer = setInterval(() => {
      if (i < text.length) {
        contentEl.textContent += text[i];
        i++;
        flow.scrollTop = flow.scrollHeight;
      } else {
        clearInterval(this._historyQaTypewriterTimer);
        const cursor = bubble.querySelector('.npc-typing-cursor');
        if (cursor) cursor.remove();
        this._historyQaIsTyping = false;
        // 添加citation
        if (chatData.citation) {
          const citationEl = document.createElement('div');
          citationEl.className = 'npc-citation';
          const c = chatData.citation;
          citationEl.textContent = `史实出处：${c.document_title || ''} · ${c.date || ''}`;
          bubble.appendChild(citationEl);
        }
      }
    }, 40);

    this._historyQaHistory.push({
      role: 'ai',
      text: chatData.reply || '',
      emotion: emotion,
      citation: chatData.citation || null
    });
  },
openMailbox() {
    document.getElementById('mailboxOverlay').classList.add('open');
    document.getElementById('mailboxTextarea').value = '';
    document.getElementById('mailboxReplyArea').style.display = 'none';
    document.getElementById('mailboxReplyText').textContent = '';
    document.getElementById('mailboxReplySource').textContent = '';
  },
async sendMailbox() {
    if (this.mailboxSubmitting) return;
    const textarea = document.getElementById('mailboxTextarea');
    const message = textarea.value.trim();
    if (!message) {
      this.showToast('请先写一段话');
      return;
    }

    this.mailboxSubmitting = true;
    try {

    // 检测斯诺关键词
    const isSnowLetter = SNOW_LETTER_TEMPLATE.keywords.some(kw =>
      message.toLowerCase().includes(kw.toLowerCase())
    );

    // 显示回信区域 + loading 态
    const replyArea = document.getElementById('mailboxReplyArea');
    const replyText = document.getElementById('mailboxReplyText');
    const replySource = document.getElementById('mailboxReplySource');
    replyArea.style.display = 'block';
    replyText.innerHTML = '<span class="mailbox-loading"><span class="mailbox-loading-icon">✉️</span>信件穿越时空，正在等待回信…<span class="mailbox-loading-dots"><i></i><i></i><i></i></span></span>';
    replySource.textContent = '';

    // 禁用输入
    textarea.disabled = true;

    // 调用API
    const apiResult = await apiTimeMailbox(message, isSnowLetter);

    if (!apiResult) {
      // 本地降级
      if (isSnowLetter) {
        replyText.textContent = SNOW_LETTER_TEMPLATE.letter;
        replySource.textContent = '本地固定文学回信 · 非斯诺真实来信；背景参考《西行漫记》。';
        GameState.recordMailbox(message, SNOW_LETTER_TEMPLATE.letter, true);
      } else {
        replyText.textContent = SNOW_LETTER_TEMPLATE.normalLetter;
        replySource.textContent = '本地固定文学回信 · 非历史人物真实回信；史实参考档案。';
        GameState.recordMailbox(message, SNOW_LETTER_TEMPLATE.normalLetter, false);
      }
    } else {
      const validReply=typeof apiResult.reply==='string'&&apiResult.reply.trim().length>0&&apiResult.reply.length<=4000;
      const reply=validReply?apiResult.reply:SNOW_LETTER_TEMPLATE.normalLetter;
      replyText.textContent=reply;
      replySource.textContent=apiResult.degraded||!validReply?'本地固定文学回信 · 非历史人物真实回信；史实参考档案。':'AI生成回信 · 虚构演绎，非历史人物真实回信；史实参考档案。';
      GameState.recordMailbox(message,reply,isSnowLetter);
    }

    // 恢复输入
    textarea.disabled = false;
    this.mailboxSubmitting = false;
    textarea.value = '';
    } catch(error) { const fallback=SNOW_LETTER_TEMPLATE.normalLetter;document.getElementById('mailboxReplyArea').style.display='block';document.getElementById('mailboxReplyText').textContent=fallback;document.getElementById('mailboxReplySource').textContent='本地固定回信 · 文学演绎，非历史人物真实回信；史实参考档案。';GameState.recordMailbox(message,fallback,false);this.showToast('AI暂未响应，已显示固定回信；你的来信已保留。'); } finally { this.mailboxSubmitting=false;textarea.disabled=false; }
  }
};
