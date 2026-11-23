/* Extracted GameUI reports methods. All instance state remains on GameUI. */
const GameUIReports54 = {
applyBattleResult(reportData) {
    if (!GameState.character) return;

    const victory = reportData.outcome !== '受挫' && reportData.emotion_tag !== 'defeat';
    const decisions = this.qtePlayerDecisions;
    const totalCasualty = decisions.reduce((sum, d) => sum + (d.casualty || 0), 0);

    // 资源变化
    if (victory) {
      // 胜利：扣弹药、扣少量兵力、加士气
      const ammoCost = Math.min(30, 10 + decisions.length * 3);
      const troopLoss = Math.min(15, totalCasualty * 2);
      GameState.resources.ammo = Math.max(0, GameState.resources.ammo - ammoCost);
      GameState.resources.troops = Math.max(0, GameState.resources.troops - troopLoss);
      GameState.resources.morale = Math.min(100, GameState.resources.morale + 15);

      this.floatStat('Ammo', -ammoCost);
      this.floatStat('Troops', -troopLoss);
      this.floatStat('Morale', 15);
    } else {
      // 失败：扣兵力、扣士气
      const troopLoss = Math.min(25, 10 + totalCasualty * 3);
      const moraleLoss = 20;
      GameState.resources.troops = Math.max(0, GameState.resources.troops - troopLoss);
      GameState.resources.morale = Math.max(0, GameState.resources.morale - moraleLoss);

      this.floatStat('Troops', -troopLoss);
      this.floatStat('Morale', -moraleLoss);
    }

    GameState.save();
    this.updateResourceHUD();
  },
async showSettlement(node, reportData) {
    if (!node) { this.showToast('请先选择本次任务'); return; }
    clearTimeout(this.settlementRequestTimer);
    const session = this.settlementSession = (this.settlementSession || 0) + 1;
    this.settlementCurrentNode = node;
    this.settlementReportData = reportData;
    this._settlementSkipRequested = false;
    this._hideSettlementLoading();

    const levelInfo = this.nodeLevelMap[node.id] || { level: 'ruijin', scene: 'river_crossing' };
    const victory = reportData && (reportData.outcome !== '受挫' && reportData.emotion_tag !== 'defeat');
    const outcome = victory ? 'victory' : 'defeat';
    const totalCasualty = this.qtePlayerDecisions.reduce((sum, d) => sum + (d.casualty || 0), 0);
    const playerData = {
      command: this.commandFreeCommands.join('；'),
      tactic: this.commandParseData ? this.commandParseData.tactic : '',
      qteResult: { success: victory, maxCombo: this.qteClickCount || 0, missCount: 0 },
      battleReport: reportData ? { outcome: reportData.outcome || (victory ? '胜利' : '受挫'), rating: reportData.rating || '' } : {},
      resources: { troops: Math.round(GameState.resources.troops), ammo: Math.round(GameState.resources.ammo), food: Math.round(GameState.resources.food), morale: Math.round(GameState.resources.morale) },
      outcome: victory ? '胜利' : '受挫', casualtyCount: totalCasualty
    };

    // 1. 先查预加载缓存，命中则秒开
    const cached = getCachedHistoryCompare(levelInfo.level, outcome, totalCasualty,playerData);

    // 2. 显示结算界面框架 + 沉浸式loading动画
    const settlementOverlay = document.getElementById('settlementOverlay');
    if (settlementOverlay) {
      settlementOverlay.classList.add('open');
    }

    // 渲染左侧"你的决策线"（本地数据，立即渲染，不等AI）
    this.renderSettlementTimelinePlayer();

    if (cached && ['luding','zunyi'].includes(levelInfo.level)) {
      // 缓存命中：直接渲染，无需loading
      this._renderSettlementFull(node, _adaptCompareData(cached,levelInfo.level), outcome, totalCasualty,!!cached.degraded);
      return;
    }

    if(!['luding','zunyi'].includes(levelInfo.level)){
      this._renderSettlementFull(node,this.getLocalEnding(levelInfo.level,outcome,totalCasualty,playerData.command),outcome,totalCasualty,true);return;
    }
    // 3. 缓存未命中：显示沉浸式loading动画
    this._showSettlementLoading();
    this._settlementSkipRequested = false;

    // 4. 5秒超时降级计时器
    let settled = false;
    const useLocal = () => {
      if (!settled && this.settlementSession === session) {
        settled = true;
        clearTimeout(timeoutTimer);
        this._hideSettlementLoading();
        const localData = this.getLocalEnding(levelInfo.level, outcome, totalCasualty,playerData.command);
        this._renderSettlementFull(node, localData, outcome, totalCasualty, true);
      }
    };
    const timeoutTimer = this.settlementRequestTimer = setTimeout(useLocal, 5000);
    const loadingLayer = document.getElementById('settlementLoadingLayer');
    if (loadingLayer) loadingLayer.onclick = () => { this._settlementSkipRequested = true; useLocal(); };

    // 5. 发起普通请求（契约 v1.0：POST /history/compare）
    try {
      const aiData = _adaptCompareData(await prefetchHistoryCompare(levelInfo.level,playerData),levelInfo.level);
      if (!settled && this.settlementSession === session) {
        settled = true;
        clearTimeout(timeoutTimer);
        this._hideSettlementLoading();
        if (aiData) {
          this._renderSettlementFull(node, aiData, outcome, totalCasualty,!!aiData.degraded);
        } else {
          const localData = this.getLocalEnding(levelInfo.level, outcome, totalCasualty,playerData.command);
          this._renderSettlementFull(node, localData, outcome, totalCasualty, true);
        }
      }
    } catch (e) {
      if (!settled && this.settlementSession === session) {
        settled = true;
        clearTimeout(timeoutTimer);
        console.warn('[showSettlement] 请求失败，启用本地降级:', e.message);
        this._hideSettlementLoading();
        const localData = this.getLocalEnding(levelInfo.level, outcome, totalCasualty,playerData.command);
        this._renderSettlementFull(node, localData, outcome, totalCasualty, true);
      }
    }
  },
_showSettlementLoading() {
    let loadingLayer = document.getElementById('settlementLoadingLayer');
    if (!loadingLayer) {
      loadingLayer = document.createElement('div');
      loadingLayer.id = 'settlementLoadingLayer';
      loadingLayer.className = 'settlement-loading-layer';
      loadingLayer.innerHTML = `
        <div class="film-scan-loading">
          <div class="film-strip">
            <div class="film-frame"></div>
            <div class="film-frame"></div>
            <div class="film-frame"></div>
            <div class="film-frame"></div>
            <div class="film-frame"></div>
          </div>
          <div class="film-scan-line"></div>
          <div class="film-grain"></div>
          <div class="film-loading-text">正在解密历史档案…</div>
          <div class="film-loading-hint">点击屏幕跳过</div>
        </div>
      `;
      const overlay = document.getElementById('settlementOverlay');
      if (overlay) overlay.appendChild(loadingLayer);
    }
    loadingLayer.style.display = 'flex';
    // 点击跳过机制
    loadingLayer.onclick = () => {
      this._settlementSkipRequested = true;
      this._hideSettlementLoading();
    };
  },
_hideSettlementLoading() {
    const loadingLayer = document.getElementById('settlementLoadingLayer');
    if (loadingLayer) loadingLayer.style.display = 'none';
  },
renderSettlementTimelinePlayer() {
    const playerEl = document.getElementById('settlementPlayerLine');
    if (!playerEl) return;
    playerEl.innerHTML = '';
    if (this.qtePlayerDecisions.length === 0) {
      playerEl.innerHTML = '<div class="timeline-item">未记录决策</div>';
    } else {
      this.qtePlayerDecisions.forEach((d, i) => {
        const item = document.createElement('div');
        item.className = 'timeline-item timeline-item-player';
        item.innerHTML = uiHTML`
          <span class="timeline-item-round">${i + 1}</span>
          <span>${zhText(d.action, '行动')} → ${zhText(d.target, '目标待定')}${d.success ? ' ✓' : ' ✗'}</span>
        `;
        playerEl.appendChild(item);
      });
    }
  },
_renderSettlementFull(node, settlementData, outcome, totalCasualty, isDegraded) {
    if(typeof Campaign55!=='undefined')Campaign55.summary(node,document.querySelector('#settlementOverlay .settlement-body'));
    // Historical material must never be supplied by generated comparison data.
    const archive = typeof NODE_HISTORY_DATA !== 'undefined' ? NODE_HISTORY_DATA[node.id] : null;
    const verifiedHistory = node.id === 7
      ? '1935年5月29日，红四团二十二名勇士奋勇夺取泸定桥，打开中央红军北上通道。来源：国防部网站，2025-07-13《军报记者寻根行》。'
      : archive?.historyText && archive?.historySource
        ? `${archive.historyText} 来源：${archive.historySource}`
        : '本关历史资料待逐条核对出处；本次仅展示虚构协作任务体验，不提供未经核实的历史数据对比。';
    settlementData = { ...settlementData,
      degraded: isDegraded || settlementData.degraded === true,
      title: `${node.name} · 体验复盘`,
      evaluation_title: '协作任务回顾',
      evaluation: '评分仅反映本次虚构任务中的操作与资源分配，不评价真实历史人物、部队或战役。',
      comparison: (settlementData.comparison || []).map(c => ({ ...c, history_line: c.dimension === '史料出处' && archive?.historySource ? archive.historySource : verifiedHistory, inferred: false })),
      conclusion: '以上资源、评分与任务结果均为教学体验数据，不代表真实部队规模、伤亡或战果，也不改变历史事件的真实结局。历史学习请查阅有明确出处的资料。'
    };
    this.settlementCompareData = settlementData;
    const filmHeader=document.getElementById('settlementCinema');
    if(filmHeader)filmHeader.innerHTML=SvgScenes.render(node,{phase:'resolve',shotIndex:0});

    // 应用emotion色调
    const overlay = document.getElementById('settlementOverlay');
    this.applyEmotionTheme(overlay, settlementData.emotion_tag);

    // 渲染标题/副标题
    document.getElementById('settlementTitle').textContent = settlementData.title || `${node.name} — 战后复盘`;
    document.getElementById('settlementSubtitle').textContent = `${node.date || ''} · ${node.location || ''}`;

    // 渲染右侧历史真实线（打字机效果，可跳过）
    this._renderHistoryLineWithTypewriter(settlementData.comparison || []);

    // 渲染对比表
    this.renderCompareTable(settlementData.comparison || []);

    // 渲染结论
    this.renderConclusion(settlementData.conclusion || '');

    // 渲染AI评价
    this.renderEvaluation(settlementData);

    // 评分
    const computedScore = this.computeScore(outcome, totalCasualty);
    this.renderScore(computedScore.score, computedScore.rating);
    if(typeof StoryConsequences!=='undefined')StoryConsequences.renderRecap(document.getElementById('settlementPanelReview'),node.id);

    // 降级标记
    const degradedBadge = document.getElementById('settlementDegradedBadge');
    if (degradedBadge) degradedBadge.style.display = settlementData.degraded ? 'block' : 'none';

    // 默认显示复盘Tab
    this.switchSettlementTab('review');

    // 记录快照 + 数据看板
    GameState.recordNodeSnapshot(node.id, node.name);
    this.renderDashboard();

    // 自动语音播报
    const voiceButton=document.getElementById('settlementVoiceBtn');if(voiceButton){voiceButton.textContent='系统朗读（可选）';voiceButton.title='使用浏览器系统音色；不会自动替换成已选的录音音色。';}
  },
_renderHistoryLineWithTypewriter(comparison) {
    const historyEl = document.getElementById('settlementHistoryLine');
    if (!historyEl) return;
    historyEl.innerHTML = '';

    if (comparison.length === 0) {
      historyEl.innerHTML = '<div class="timeline-item">历史数据缺失</div>';
      return;
    }

    // 准备所有文本
    const items = comparison.map((c, i) => ({
      round: i + 1,
      text: c.history_line || ''
    }));

    // 如果之前请求了跳过，直接显示全文
    if (this._settlementSkipRequested) {
      items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'timeline-item timeline-item-history';
        const number=document.createElement('span');number.className='timeline-item-round';number.textContent=String(item.round);const text=document.createElement('span');text.textContent=item.text;el.append(number,text);
        historyEl.appendChild(el);
      });
      this._settlementSkipRequested = false;
      return;
    }

    // 打字机逐条渲染
    let itemIdx = 0;
    let charIdx = 0;
    let currentEl = null;
    clearInterval(this._historyTypewriterTimer);
    this._historyTypewriterTimer = setInterval(() => {
      if (this._settlementSkipRequested) {
        // 跳过：直接显示所有文本
        clearInterval(this._historyTypewriterTimer);
        historyEl.innerHTML = '';
        items.forEach(item => {
          const el = document.createElement('div');
          el.className = 'timeline-item timeline-item-history';
          const number=document.createElement('span');number.className='timeline-item-round';number.textContent=String(item.round);const text=document.createElement('span');text.textContent=item.text;el.append(number,text);
          historyEl.appendChild(el);
        });
        this._settlementSkipRequested = false;
        return;
      }
      if (itemIdx >= items.length) {
        clearInterval(this._historyTypewriterTimer);
        return;
      }
      const item = items[itemIdx];
      if (charIdx === 0) {
        currentEl = document.createElement('div');
        currentEl.className = 'timeline-item timeline-item-history';
        currentEl.innerHTML = `<span class="timeline-item-round">${item.round}</span><span class="history-typing-text"></span>`;
        historyEl.appendChild(currentEl);
      }
      if (charIdx < item.text.length) {
        const textSpan = currentEl.querySelector('.history-typing-text');
        textSpan.textContent += item.text[charIdx];
        charIdx++;
      } else {
        itemIdx++;
        charIdx = 0;
      }
    }, 40);
  },
getLocalEnding(level, outcome, casualtyCount,commandText) {
    const node=GAME_NODES.find(n=>this.nodeLevelMap[n.id]?.level===level)||this.settlementCurrentNode||GAME_NODES[0];
    const archive=typeof NODE_HISTORY_DATA!=='undefined'?NODE_HISTORY_DATA[node.id]:null;
    const facts=archive?.historyText||'本地档案尚未收录本章的详细史料，暂不补写历史战果、人数与伤亡。';
    const command=(commandText??(this.commandFreeCommands||[]).join('；'))||'以本章实际行动记录为准';
    const comparison=[{dimension:'本次虚构任务',player_line:command,history_line:facts,inferred:false}];
    if(archive?.historySource)comparison.push({dimension:'史料出处',player_line:'资源与结果为游戏体验指数',history_line:archive.historySource,inferred:false});
    const item={title:node.name,date:node.date||'',detail:facts,stats:[['本章史料',facts]]};
    return {player:{outcome:outcome==='victory'?'胜利':'受挫',command,tactic:''},history:{[level]:item},title:node.name+' · 行动与史实对照',comparison,conclusion:'本次任务结果独立于真实历史。复盘你的行动、资源代价与协作；缺少史料的部分保持待核实。',emotion_tag:outcome==='victory'?'hopeful':'defeat',evaluation:'',evaluation_title:'',score:null,rating:null,degraded:true};
  },
renderSettlementTimeline(node) {
    this.renderSettlementTimelinePlayer();
    // 右侧历史线由 _renderHistoryLineWithTypewriter 在AI数据到达后渲染
    const historyEl = document.getElementById('settlementHistoryLine');
    if (historyEl && (!this.settlementCompareData || !this.settlementCompareData.comparison)) {
      historyEl.innerHTML = '<div class="timeline-item">历史数据加载中</div>';
    }
  },
renderCompareTable(comparison) {
    const tableEl = document.getElementById('settlementCompareTable');
    tableEl.innerHTML = '';

    comparison.forEach(c => {
      const row = document.createElement('div');
      row.className = 'compare-row';

      for(const [className,value] of [['compare-dimension',c.dimension],['compare-player',c.player_line],['compare-history',c.history_line]]){const cell=document.createElement('div');cell.className=className;cell.textContent=value||'';row.append(cell);}
      if(c.inferred){const badge=document.createElement('small');badge.className='compare-inferred-badge';badge.textContent='据史料推演';row.lastElementChild.append(badge);}

      tableEl.appendChild(row);
    });
  },
renderConclusion(conclusion) {
    document.getElementById('settlementConclusion').textContent = conclusion;
  },
computeScore(outcome, casualtyCount) {
    const decisions=this.qtePlayerDecisions||[];
    const successes=decisions.filter(d=>d.success).length;
    const completion=decisions.length?successes/decisions.length:(outcome==='victory'?0.7:0.25);
    const decisionGrade={优:14,良:10,中:6,差:1}[this.commandParseData&&this.commandParseData.rating]||5;
    const resources=GameState.resources||{};
    const resourceCare=((Number(resources.morale)||0)+(Number(resources.food)||0)+(Number(resources.troops)||0))/300;
    const outcomeBase=outcome==='victory'?48:28;
    const operation=Math.round(completion*26);
    const care=Math.round(Math.max(0,Math.min(1,resourceCare))*12);
    const casualtyPenalty=Math.min(8,Math.max(0,Number(casualtyCount)||0)*0.35);
    const score=Math.max(20,Math.min(100,Math.round(outcomeBase+operation+decisionGrade+care-casualtyPenalty)));
    return {score,rating:score>=92?'S':score>=82?'A':score>=68?'B':score>=55?'C':'D'};
  },
renderScore(score, rating) {
    const ratingEl = document.getElementById('settlementScoreRating');
    const valueEl = document.getElementById('settlementScoreValue');

    ratingEl.textContent = rating || '未评级';
    ratingEl.className = 'settlement-score-rating ' + (rating || '');
    valueEl.textContent = (score !== null && score !== undefined) ? score : '--';

    // 记入 localStorage
    if (this.settlementCurrentNode && (score !== null && score !== undefined)) {
      GameState.recordBattleScore(this.settlementCurrentNode.id, score, rating);
    }
  },
renderEvaluation(settlementData) {
    const node = this.settlementCurrentNode;
    const totalCasualty = this.qtePlayerDecisions.reduce((s, d) => s + (d.casualty || 0), 0);
    const victory = settlementData && this.settlementReportData
      ? this.settlementReportData.emotion_tag !== 'defeat'
      : true;

    // 降级模板（与后端 DEGRADED_EVALUATIONS 保持一致口径）
    const localEvaluation = (() => {
      if (!victory) {
        return {
          title: '知耻后勇',
          text: '你是一位敢于承担代价的指挥官。败退不是耻辱，隐瞒才是。真正的将才敢于面对自己的失误——因为队伍要活下去，教训必须被记住。'
        };
      }
      if (totalCasualty <= 3) {
        return {
          title: '存人失地',
          text: '你是一位懂得存人失地、具备长远战略眼光的指挥官。你没有为眼前的虚名牺牲兵力，而是把力量留给了下一场战斗——长征要活下去的人，才是真正的胜利者。'
        };
      }
      return {
        title: '勇猛果决',
        text: '你是一位勇猛、果决的指挥官。你敢在最险的时刻下令冲锋，这份胆气正是这支队伍渡过大河的底气。只是战场上的每一分勇猛，都要由后来的人来偿付代价。'
      };
    })();

    const title = (settlementData && settlementData.evaluation_title) || localEvaluation.title;
    const text = (settlementData && settlementData.evaluation) || localEvaluation.text;

    this.settlementEvaluation = { title, text, nodeName: node ? node.name : '', nodeDate: node ? node.date : '' };

    const box = document.getElementById('settlementEvaluation');
    const titleEl = document.getElementById('settlementEvaluationTitle');
    const textEl = document.getElementById('settlementEvaluationText');
    if (box && titleEl && textEl) {
      titleEl.textContent = '「' + title + '」';
      textEl.textContent = text;
      box.style.display = 'block';
    }
  },
async exportMedalShareImage() {
    // === Step 0: 数据收集 ===
    const posterData = this._collectSharePosterData();
    if (!posterData) {
      this.showToast('还没有可分享的勋章，先完成一场战斗');
      return;
    }

    // === Step 1: 异步资源预加载 ===
    const [medalImg, qrCanvas] = await Promise.all([
      this._loadMedalImage(posterData.medal.svg),
      this._generateQrCode(this.shareUrl())
    ]);

    // === Step 2: 同步绘制 ===
    const W = 750, H = 1334;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    this._drawPosterBackground(ctx, W, H);
    this._drawPosterHeader(ctx, W, posterData);
    this._drawPosterAvatar(ctx, W, posterData);
    this._drawPosterEvaluation(ctx, W, posterData);
    this._drawPosterMedal(ctx, W, H, medalImg, posterData);
    this._drawPosterMedalInfo(ctx, W, posterData);
    this._drawPosterStatsPanel(ctx, W, posterData);
    this._drawPosterFooter(ctx, W, H, qrCanvas, posterData);

    // === Step 3: 导出保存 ===
    await this._exportAndSavePoster(canvas, posterData);
  },
_collectSharePosterData() {
    const ev = this.settlementEvaluation;
    const node = this.settlementCurrentNode;
    if (!ev || !node) return null;

    const medalRecord = (GameState.getMedals() || []).find(m => m.nodeId === node.id);
    const score = this.settlementCompareData && this.settlementCompareData.score;
    const rating = this.settlementCompareData && this.settlementCompareData.rating;
    const totalCasualty = this.qtePlayerDecisions.reduce((s, d) => s + (d.casualty || 0), 0);
    const casualties = GameState.getNodeCasualties();
    const totalGain = casualties.reduce((s, c) => s + (c.gain || 0), 0);
    const char = GameState.character || { id: '', name: '', avatar: '' };

    return {
      player: {
        characterName: char.name || '',
        characterAvatar: char.avatar || '',
        characterId: char.id || ''
      },
      level: {
        nodeId: node.id,
        nodeName: node.name,
        nodeDate: node.date,
        nodeLocation: node.location || '',
        nodeType: node.type,
        spiritKeyword: node.spiritKeyword || ''
      },
      stats: {
        score: (score !== null && score !== undefined) ? score : (medalRecord ? medalRecord.score : null),
        rating: rating || (medalRecord ? medalRecord.rating : ''),
        troops: GameState.resources.troops,
        ammo: GameState.resources.ammo,
        food: GameState.resources.food,
        morale: GameState.resources.morale,
        totalCasualty: totalCasualty,
        totalGain: totalGain,
        marchCount: GameState.marchCount,
        medalCount: (GameState.getMedals() || []).length
      },
      medal: {
        svg: medalRecord ? medalRecord.svg : '',
        score: medalRecord ? medalRecord.score : null,
        rating: medalRecord ? medalRecord.rating : ''
      },
      evaluation: {
        title: ev.title || '',
        text: ev.text || '',
        isDegraded: !this.settlementCompareData || this.settlementCompareData.degraded === true
      }
    };
  },
_loadMedalImage(svgStr) {
    return new Promise((resolve) => {
      if (!svgStr) { resolve(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  },
_roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
_wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    if (!text) return 0;
    const lines = [];
    let current = '';
    for (const ch of text) {
      if (ctx.measureText(current + ch).width > maxWidth) {
        lines.push(current);
        current = ch;
        if (lines.length >= maxLines) break;
      } else {
        current += ch;
      }
    }
    if (current && lines.length < maxLines) lines.push(current);

    // 省略号处理
    const drawnText = lines.join('');
    if (drawnText.length < text.length && lines.length >= maxLines) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = last.slice(0, Math.max(0, last.length - 2)) + '…';
    }

    lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
    return lines.length * lineHeight;
  },
_drawPosterBackground(ctx, W, H) {
    // 暗色战地底
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#1A0E0C');
    bg.addColorStop(0.5, '#2B1512');
    bg.addColorStop(1, '#150B09');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 红色光晕（居中偏上，勋章区域）
    const glow = ctx.createRadialGradient(W / 2, 540, 30, W / 2, 540, 300);
    glow.addColorStop(0, 'rgba(163,32,32,0.40)');
    glow.addColorStop(1, 'rgba(163,32,32,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, 800);

    // 金色双框
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    ctx.strokeStyle = 'rgba(201,162,39,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(34, 34, W - 68, H - 68);
  },
_drawPosterHeader(ctx, W, data) {
    ctx.textAlign = 'center';

    // 主标题
    ctx.fillStyle = '#E8C547';
    ctx.font = 'bold 42px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('长征·星火', W / 2, 80);

    // 副标题
    ctx.fillStyle = '#C9A227';
    ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('专属历史勋章', W / 2, 112);
  },
_drawPosterAvatar(ctx, W, data) {
    const cx = 90, cy = 175, r = 30;
    const charColor = {
      commander: '#B08D2F', logistics: '#5B8C5A',
      soldier: '#C9A227', medic: '#A32020'
    }[data.player.characterId] || '#B08D2F';

    // 圆形头像底色
    ctx.fillStyle = charColor;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // 金色描边
    ctx.strokeStyle = '#E8C547'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    // 头像字
    ctx.fillStyle = '#F5E6C8';
    ctx.font = 'bold 24px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(data.player.characterAvatar, cx, cy);
    ctx.textBaseline = 'alphabetic';

    // 角色名
    ctx.fillStyle = '#F5E6C8';
    ctx.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(data.player.characterName, cx + r + 12, cy - 8);

    // AI评价标题（紧贴角色名右侧或下方）
    if (data.evaluation.title) {
      ctx.fillStyle = '#C9A227';
      ctx.font = 'bold 20px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText('「' + data.evaluation.title + '」', cx + r + 12, cy + 16);
    }
  },
_drawPosterEvaluation(ctx, W, data) {
    const boxY = 230, boxH = 120;
    const boxX = 50, boxW = W - 100;

    // 评价框背景
    ctx.fillStyle = 'rgba(201,162,39,0.10)';
    this._roundRect(ctx, boxX, boxY, boxW, boxH, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(201,162,39,0.45)'; ctx.lineWidth = 1.5;
    this._roundRect(ctx, boxX, boxY, boxW, boxH, 8); ctx.stroke();

    if (!data.evaluation.text) {
      // 兜底：AI评价未生成
      ctx.fillStyle = '#A89B7F';
      ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('指挥官，你的战绩已载入史册', W / 2, boxY + 45);
      ctx.fillStyle = 'rgba(168,155,127,0.6)';
      ctx.font = '16px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText('（AI评价生成中，稍后再试）', W / 2, boxY + 72);
      return;
    }

    // 正文（自动换行，最多3行，超出省略）
    ctx.fillStyle = '#EFE3C8';
    ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    this._wrapText(ctx, data.evaluation.text, boxX + 16, boxY + 32, boxW - 32, 28, 3);
  },
_drawPosterMedal(ctx, W, H, medalImg, data) {
    const medalSize = 240;
    const medalX = (W - medalSize) / 2;
    const medalY = 380;

    if (medalImg) {
      // SVG勋章图片
      ctx.drawImage(medalImg, medalX, medalY, medalSize, medalSize);
    } else {
      // Fallback：纯Canvas绘制五角星勋章
      ctx.save();
      ctx.translate(W / 2, medalY + medalSize / 2);
      const ringR = medalSize / 2 * 0.85;

      // 外环渐变
      const ring = ctx.createLinearGradient(-ringR, -ringR, ringR, ringR);
      ring.addColorStop(0, '#E8C547');
      ring.addColorStop(0.5, '#8B1A1A');
      ring.addColorStop(1, '#E8C547');
      ctx.fillStyle = ring;
      ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.fill();

      // 内环
      const innerR = ringR * 0.82;
      ctx.fillStyle = '#1A0E0C';
      ctx.beginPath(); ctx.arc(0, 0, innerR, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#C9A227'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, innerR, 0, Math.PI * 2); ctx.stroke();

      // 五角星
      const starR = innerR * 0.55;
      const starInnerR = starR * 0.42;
      ctx.fillStyle = '#E8C547';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? starR : starInnerR;
        const a = (Math.PI * 5 * i) / 5 - Math.PI / 2;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  },
_drawPosterMedalInfo(ctx, W, data) {
    ctx.textAlign = 'center';

    // 勋章名
    ctx.fillStyle = '#F5E6C8';
    ctx.font = 'bold 32px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(data.level.nodeName + ' 勋章', W / 2, 660);

    // 日期+地点
    ctx.fillStyle = '#B08D2F';
    ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(data.level.nodeDate + ' · ' + data.level.nodeLocation, W / 2, 690);

    // 评分
    if ((data.stats.score !== null && data.stats.score !== undefined)) {
      ctx.fillStyle = '#E8C547';
      ctx.font = 'bold 26px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText('指挥评分 ' + data.stats.score + ' 分 · ' + data.stats.rating, W / 2, 724);
    }
  },
_drawPosterStatsPanel(ctx, W, data) {
    const panelY = 760, panelH = 100;
    const panelX = 50, panelW = W - 100;

    const items = [
      { label: '兵力', value: data.stats.troops, color: '#E8C547' },
      { label: '弹药', value: data.stats.ammo, color: '#C9A227' },
      { label: '粮食', value: data.stats.food, color: '#B08D2F' },
      { label: '士气', value: data.stats.morale, color: '#D4AF5A' },
      { label: '伤亡', value: data.stats.totalCasualty, color: '#A32020' },
      { label: '勋章', value: data.stats.medalCount, color: '#E8C547' }
    ];

    // 面板背景
    ctx.fillStyle = 'rgba(201,162,39,0.08)';
    this._roundRect(ctx, panelX, panelY, panelW, panelH, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(201,162,39,0.35)'; ctx.lineWidth = 1;
    this._roundRect(ctx, panelX, panelY, panelW, panelH, 8); ctx.stroke();

    // 3列2行网格
    const colW = panelW / 3;
    const rowH = panelH / 2;
    items.forEach((item, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const cx = panelX + col * colW + colW / 2;
      const cy = panelY + row * rowH + rowH / 2;

      // 分割线
      if (col > 0) {
        ctx.strokeStyle = 'rgba(201,162,39,0.2)'; ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(panelX + col * colW, panelY + 8);
        ctx.lineTo(panelX + col * colW, panelY + panelH - 8);
        ctx.stroke();
      }
      // 行分割线
      if (row > 0 && col === 0) {
        ctx.strokeStyle = 'rgba(201,162,39,0.2)'; ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(panelX + 8, panelY + row * rowH);
        ctx.lineTo(panelX + panelW - 8, panelY + row * rowH);
        ctx.stroke();
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = item.color;
      ctx.font = 'bold 24px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText(String(item.value), cx, cy - 4);
      ctx.fillStyle = '#A89B7F';
      ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText(item.label, cx, cy + 14);
    });
  },
_drawPosterFooter(ctx, W, H, qrCanvas, data) {
    // 诗句
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232,197,71,0.75)';
    ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('红军不怕远征难，万水千山只等闲', W / 2, 910);

    // 二维码区域
    if (qrCanvas) {
      const qrSize = 100;
      const qrX = 80, qrY = 950;
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // 二维码右侧提示语
      ctx.textAlign = 'left';
      ctx.fillStyle = '#E8C547';
      ctx.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText('扫码体验', qrX + qrSize + 20, qrY + 35);
      ctx.fillStyle = '#C9A227';
      ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText('长征·星火', qrX + qrSize + 20, qrY + 62);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText('AI沉浸式历史互动剧场', qrX + qrSize + 20, qrY + 84);
    }

    if(this.shareUrl()){ctx.textAlign='center';ctx.fillStyle='#e5d6b1';ctx.font='18px sans-serif';ctx.fillText(this.shareUrl(),W/2,H-70,W-70);}
    // 底部声明
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('本图由《长征·星火》AI指挥系统生成 · 史实据党史文献', W / 2, H - 40);
  },
shareUrl() {const value=window.CZ_SHARE_URL||document.querySelector('meta[name="share-url"]')?.content;try{const u=new URL(value||location.href);if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password){u.search='';u.hash='';return u.href;}}catch{}return '';},
async _generateQrCode() { return null; },
async _exportAndSavePoster(canvas, data) {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const filename = '长征星火-' + data.level.nodeName + '-勋章.png';

      // === 微信小游戏环境 ===
      if (typeof wx !== 'undefined' && wx.canvasToTempFilePath) {
        wx.canvasToTempFilePath({
          canvas: canvas,
          fileType: 'png',
          quality: 1,
          success: (res) => {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => this.showToast('勋章分享图已保存到相册'),
              fail: (err) => {
                if (err.errMsg && (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize'))) {
                  this._guideWxPermission();
                } else {
                  this.showToast('保存失败：' + (err.errMsg || '未知错误'));
                }
              }
            });
          },
          fail: () => this.showToast('图片生成失败')
        });
        return;
      }

      // === H5环境 ===
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile && navigator.share) {
        try {
          const blob = this._dataUrlToBlob(dataUrl);
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: '长征·星火 勋章' });
            this.showToast('分享成功');
            return;
          }
        } catch (shareErr) {
          // Web Share 失败 → 降级为下载
        }
      }

      // 降级：a标签download
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      if (!a.isConnected) document.body.appendChild(a);
      a.click();
      a.remove();
      this.showToast('勋章分享图已生成，正在下载…');

    } catch (e) {
      console.error('exportMedalShareImage error:', e);
      this.showToast('图片生成失败，请检查浏览器权限');
    }
  },
_guideWxPermission() {
    if (typeof wx === 'undefined') return;
    wx.showModal({
      title: '需要相册权限',
      content: '保存勋章分享图需要访问相册权限，请在设置中开启',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting && settingRes.authSetting['scope.writePhotosAlbum']) {
                this.showToast('权限已开启，请再次点击保存');
              }
            }
          });
        }
      }
    });
  },
_dataUrlToBlob(dataUrl) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    return new Blob([u8arr], { type: mime });
  },
async narrateHistoryCard(cardId) {
    const card = HISTORY_CARDS.find(c => c.id === cardId);
    if (!card) return;

    const box = document.getElementById('cardNarration');
    const textEl = document.getElementById('cardNarrationText');
    const srcEl = document.getElementById('cardNarrationSource');
    const btn = document.getElementById('cardDetailNarrateBtn');
    if (!box || !textEl) return;

    if (this._narrateLoading) return;
    this._narrateLoading = true;
    try {
    if (btn) { btn.disabled = true; btn.textContent = 'AI 正在构思…'; }

    box.style.display = 'block';
    textEl.textContent = '正在为你展开这段历史…';
    srcEl.textContent = '';

    // 指令员何文是史实转述者，用 NPC 对话链路生成解说（带 RAG 与引用校验）
    const question = '请为「' + card.title + '（' + card.subtitle + '）」做一段沉浸式全景解说，' +
      '像站在现场一样讲述这个时代的人与事，180字以内，只讲有出处的内容。';

    const chatData = _adaptChatData(await apiNpcChat('commander_3', question, card.id, []));

    let text, source;
    if (chatData && chatData.text) {
      text = chatData.text;
      source = (chatData.references && chatData.references.length > 0)
        ? '史实出处：' + chatData.references[0]
        : (chatData.degraded ? '简化模式' : '');
    } else {
      // 降级：用卡牌已有的审核文本 + 语音
      text = card.content;
      source = '简化模式 · ' + (card.source || '');
    }

    this._narrationText = text;
    textEl.textContent = text;
    srcEl.textContent = source;
    if (btn) { btn.disabled = false; btn.textContent = '重新生成解说'; }
    this._narrateLoading = false;

    // 自动播放语音
    this.playNarrationSpeech();
    } catch(error) { this.showToast('服务暂未完成，内容已保留，请重试。'); } finally { this._narrateLoading=false;if(btn){btn.disabled=false;btn.textContent='重新生成解说';} }
  },
closeSettlement() {
    this.settlementSession = (this.settlementSession || 0) + 1;
    clearTimeout(this.settlementRequestTimer);
    clearInterval(this._historyTypewriterTimer);
    this._hideSettlementLoading();
    document.getElementById('settlementOverlay').classList.remove('open');

    // 停止语音播报
    if (this.settlementVoicePlaying && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.settlementVoicePlaying = false;
    }

    // 失败态：结算页的"继续"绝不能变成过关按钮
    if (this.isPlayerDead || this.isGameOver) {
      this._showDefeatPanel(this.settlementCurrentNode, this._currentReportData);
      return;
    }

    // 显示历史档案解锁卡
    this.showArchiveUnlock(this.settlementCurrentNode);
  },
switchSettlementTab(tab) {
    const tabReview = document.getElementById('settlementTabReview');
    const tabDashboard = document.getElementById('settlementTabDashboard');
    const panelReview = document.getElementById('settlementPanelReview');
    const panelDashboard = document.getElementById('settlementPanelDashboard');

    if (tab === 'review') {
      tabReview.classList.add('active');
      tabDashboard.classList.remove('active');
      panelReview.classList.add('active');
      panelDashboard.classList.remove('active');
    } else {
      tabDashboard.classList.add('active');
      tabReview.classList.remove('active');
      panelDashboard.classList.add('active');
      panelReview.classList.remove('active');
      // 切到看板时重新渲染图表（确保Canvas正确绘制）
      this.renderDashboard();
    }
  },
renderDashboard() {
    const snapshots = GameState.getNodeSnapshots();
    if (snapshots.length === 0) {
      document.getElementById('dashboardInsightText').textContent = '暂无数据，完成副本后可查看数据看板';
      return;
    }

    // 准备数据
    const nodeIds = snapshots.map(s => s.nodeId);
    const nodeNames = snapshots.map(s => s.nodeName);
    const troopsData = snapshots.map(s => s.resources.troops);
    const moraleData = snapshots.map(s => s.resources.morale);
    const foodData = snapshots.map(s => s.resources.food);
    const ammoData = snapshots.map(s => s.resources.ammo);
    const casualtyData = GameState.getNodeCasualties();

    // 绘制4类图表
    this.drawTroopsLineChart(troopsData, nodeNames);
    this.drawMoraleLineChart(moraleData, nodeNames);
    this.drawHeatmap(snapshots);
    this.drawCasualtyBarChart(casualtyData);

    // 生成AI数据解读
    this.generateDashboardInsight(snapshots);
  },
drawTroopsLineChart(data, labels) {
    const canvas = document.getElementById('chartTroops');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 40, padR = 20, padT = 20, padB = 30;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    // 背景网格
    ctx.strokeStyle = '#3A3226';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padT + chartH * i / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      // Y轴刻度
      ctx.fillStyle = '#6E644F';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(100 - i * 25, padL - 4, y + 3);
    }

    // X轴标签
    ctx.fillStyle = '#A89B7F';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;
    labels.forEach((label, i) => {
      const x = padL + i * stepX;
      ctx.fillText(label.substring(0, 2), x, H - padB + 14);
    });

    // 折线
    ctx.strokeStyle = '#A32020';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = padL + i * stepX;
      const y = padT + chartH * (1 - val / 100);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 数据点
    data.forEach((val, i) => {
      const x = padL + i * stepX;
      const y = padT + chartH * (1 - val / 100);
      ctx.fillStyle = '#A32020';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 标题已在HTML中
  },
drawMoraleLineChart(data, labels) {
    const canvas = document.getElementById('chartMorale');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 40, padR = 20, padT = 20, padB = 30;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    // 背景网格
    ctx.strokeStyle = '#3A3226';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padT + chartH * i / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = '#6E644F';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(100 - i * 25, padL - 4, y + 3);
    }

    // X轴标签
    ctx.fillStyle = '#A89B7F';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;
    labels.forEach((label, i) => {
      const x = padL + i * stepX;
      ctx.fillText(label.substring(0, 2), x, H - padB + 14);
    });

    // 折线（金色）
    ctx.strokeStyle = '#D4AF5A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = padL + i * stepX;
      const y = padT + chartH * (1 - val / 100);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 数据点
    data.forEach((val, i) => {
      const x = padL + i * stepX;
      const y = padT + chartH * (1 - val / 100);
      ctx.fillStyle = '#D4AF5A';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  },
drawHeatmap(snapshots) {
    const canvas = document.getElementById('chartHeatmap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 60, padR = 20, padT = 20, padB = 30;
    const gridW = W - padL - padR;
    const gridH = H - padT - padB;

    const resources = ['兵力', '弹药', '粮食', '士气'];
    const resourceKeys = ['troops', 'ammo', 'food', 'morale'];
    const cols = snapshots.length;  // 节点数
    const rows = 4;                  // 资源数

    const cellW = cols > 0 ? gridW / cols : 0;
    const cellH = gridH / rows;

    // 绘制热力格子
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = snapshots[c].resources[resourceKeys[r]];
        // 颜色映射：0→暗红，50→暗金，100→亮金
        const ratio = val / 100;
        let color;
        if (ratio < 0.3) {
          color = `rgba(122, 20, 20, ${0.4 + ratio})`;
        } else if (ratio < 0.6) {
          color = `rgba(176, 141, 47, ${0.3 + ratio * 0.5})`;
        } else {
          color = `rgba(212, 175, 90, ${0.3 + ratio * 0.6})`;
        }

        ctx.fillStyle = color;
        ctx.fillRect(padL + c * cellW, padT + r * cellH, cellW - 1, cellH - 1);

        // 数值文字
        ctx.fillStyle = ratio > 0.5 ? '#191512' : '#D8CDB4';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(val, padL + c * cellW + cellW / 2, padT + r * cellH + cellH / 2 + 3);
      }
    }

    // Y轴标签（资源名）
    ctx.fillStyle = '#A89B7F';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (let r = 0; r < rows; r++) {
      ctx.fillText(resources[r], padL - 4, padT + r * cellH + cellH / 2 + 4);
    }

    // X轴标签（节点简称）
    ctx.textAlign = 'center';
    ctx.font = '9px sans-serif';
    for (let c = 0; c < cols; c++) {
      const name = snapshots[c].nodeName;
      ctx.fillText(name.substring(0, 2), padL + c * cellW + cellW / 2, H - padB + 14);
    }
  },
drawCasualtyBarChart(casualtyData) {
    const canvas = document.getElementById('chartCasualty');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const padL = 40, padR = 20, padT = 20, padB = 30;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const cols = casualtyData.length;
    if (cols === 0) return;

    const maxVal = Math.max(...casualtyData.map(d => Math.max(d.casualty, d.gain)), 10);
    const barW = chartW / cols * 0.35;
    const groupW = chartW / cols;

    // 背景网格
    ctx.strokeStyle = '#3A3226';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padT + chartH * i / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = '#6E644F';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal * (1 - i / 4)), padL - 4, y + 3);
    }

    // 柱状图
    casualtyData.forEach((d, i) => {
      const groupX = padL + i * groupW;

      // 伤亡柱（红色，向下）
      if (d.casualty > 0) {
        const barH = chartH * (d.casualty / maxVal);
        ctx.fillStyle = '#A32020';
        ctx.fillRect(groupX + groupW * 0.1, padT + chartH - barH, barW, barH);
      }

      // 缴获柱（金色，向下）
      if (d.gain > 0) {
        const barH = chartH * (d.gain / maxVal);
        ctx.fillStyle = '#D4AF5A';
        ctx.fillRect(groupX + groupW * 0.55, padT + chartH - barH, barW, barH);
      }

      // X轴标签
      ctx.fillStyle = '#A89B7F';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.nodeName.substring(0, 2), groupX + groupW / 2, H - padB + 14);
    });

    // 图例
    ctx.fillStyle = '#A32020';
    ctx.fillRect(W - padR - 80, padT, 10, 10);
    ctx.fillStyle = '#D8CDB4';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('伤亡', W - padR - 66, padT + 9);

    ctx.fillStyle = '#D4AF5A';
    ctx.fillRect(W - padR - 40, padT, 10, 10);
    ctx.fillStyle = '#D8CDB4';
    ctx.fillText('缴获', W - padR - 26, padT + 9);
  },
generateDashboardInsight(snapshots) {
    if (snapshots.length === 0) return;

    let insights = [];

    // 分析兵力变化
    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1];
      const curr = snapshots[i];
      const diff = curr.resources.troops - prev.resources.troops;

      if (diff <= -10) {
        insights.push(DASHBOARD_INSIGHT_TEMPLATES.troops_heavy_loss
          .replace('{node}', curr.nodeName)
          .replace('{prev}', prev.resources.troops)
          .replace('{curr}', curr.resources.troops));
        break;
      }
      if (diff >= 5) {
        insights.push(DASHBOARD_INSIGHT_TEMPLATES.troops_recovery
          .replace('{node}', curr.nodeName)
          .replace('{diff}', diff));
        break;
      }
    }

    // 分析士气变化
    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1];
      const curr = snapshots[i];
      const diff = prev.resources.morale - curr.resources.morale;

      if (diff >= 10) {
        insights.push(DASHBOARD_INSIGHT_TEMPLATES.morale_drop
          .replace('{node}', curr.nodeName)
          .replace('{diff}', diff));
        break;
      }
      const gain = curr.resources.morale - prev.resources.morale;
      if (gain >= 10) {
        insights.push(DASHBOARD_INSIGHT_TEMPLATES.morale_surge
          .replace('{node}', curr.nodeName)
          .replace('{diff}', gain));
        break;
      }
    }

    // 分析粮食危机
    for (let i = 0; i < snapshots.length; i++) {
      if (snapshots[i].resources.food <= 20) {
        insights.push(DASHBOARD_INSIGHT_TEMPLATES.food_crisis
          .replace('{node}', snapshots[i].nodeName)
          .replace('{curr}', snapshots[i].resources.food));
        break;
      }
    }

    // 分析弹药不足
    for (let i = 0; i < snapshots.length; i++) {
      if (snapshots[i].resources.ammo <= 20) {
        insights.push(DASHBOARD_INSIGHT_TEMPLATES.ammo_low
          .replace('{node}', snapshots[i].nodeName)
          .replace('{curr}', snapshots[i].resources.ammo));
        break;
      }
    }

    // 综合评价
    const lastSnap = snapshots[snapshots.length - 1];
    const firstSnap = snapshots[0];
    const totalTroopsChange = lastSnap.resources.troops - firstSnap.resources.troops;
    const minMorale = Math.min(...snapshots.map(s => s.resources.morale));

    if (totalTroopsChange <= -30) {
      insights.push(DASHBOARD_INSIGHT_TEMPLATES.overall_troops_collapse);
    } else if (minMorale >= 60) {
      insights.push(DASHBOARD_INSIGHT_TEMPLATES.overall_morale_resilient);
    } else {
      insights.push(DASHBOARD_INSIGHT_TEMPLATES.overall_balanced);
    }

    // 拼接解读文本
    const text = insights.join('\n\n');
    document.getElementById('dashboardInsightText').textContent = text;
    document.getElementById('dashboardInsightDegraded').style.display = 'block';
  },
exportDashboardPNG() {
    const snapshots = GameState.getNodeSnapshots();
    if (snapshots.length === 0) {
      this.showToast('暂无数据可导出');
      return;
    }

    // 创建合成Canvas
    const exportW = 680;
    const exportH = 1100;  // 标题 + 4图表 + 解读 + 底部
    const canvas = document.createElement('canvas');
    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext('2d');

    // 背景
    ctx.fillStyle = '#191512';
    ctx.fillRect(0, 0, exportW, exportH);

    // 标题
    ctx.fillStyle = '#D4AF5A';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('长征·星火 — 数据看板', exportW / 2, 30);

    ctx.fillStyle = '#A89B7F';
    ctx.font = '12px sans-serif';
    ctx.fillText(`角色: ${GameState.character ? GameState.character.name : '未知'} · 通关节点: ${snapshots.length}/12`, exportW / 2, 50);

    // 逐个绘制图表到合成Canvas
    const chartIds = ['chartTroops', 'chartMorale', 'chartHeatmap', 'chartCasualty'];
    const chartTitles = ['兵力随节点变化', '士气波动', '资源热力图（12节点 × 4资源）', '每节点伤亡 / 缴获对比'];
    let yOffset = 70;

    chartIds.forEach((id, idx) => {
      const srcCanvas = document.getElementById(id);
      if (srcCanvas) {
        // 图表标题
        ctx.fillStyle = '#D4AF5A';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(chartTitles[idx], 20, yOffset);

        // 绘制图表
        yOffset += 10;
        ctx.drawImage(srcCanvas, 20, yOffset, 640, srcCanvas.height);
        yOffset += srcCanvas.height + 16;
      }
    });

    // AI解读文本
    ctx.fillStyle = '#D4AF5A';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AI 数据解读', 20, yOffset);
    yOffset += 10;

    const insightText = document.getElementById('dashboardInsightText').textContent;
    ctx.fillStyle = '#D8CDB4';
    ctx.font = '12px sans-serif';
    // 自动换行
    const maxWidth = 640;
    const lines = [];
    insightText.split('\n').forEach(paragraph => {
      let currentLine = '';
      paragraph.split('').forEach(char => {
        const testLine = currentLine + char;
        if (ctx.measureText(testLine).width > maxWidth) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);
      lines.push('');  // 段落间空行
    });

    lines.forEach(line => {
      ctx.fillText(line, 20, yOffset);
      yOffset += 16;
    });

    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()){
      ctx.fillStyle='#d8c49b';ctx.font='12px sans-serif';ctx.textAlign='left';
      const c=CoopHotseat66.state().contributions;
      ctx.fillText(`同屏贡献：下令 ${c.orders} 次 / 省粮 ${c.foodSaved} 点 / QTE ${c.qteWins}/${c.qteAttempts} / 恢复士气 ${c.moraleEvents} 次`,20,exportH-36);
    }
    // 底部水印
    ctx.fillStyle = '#6E644F';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('长征·星火 沉浸式历史互动剧场 · 数据看板导出', exportW / 2, exportH - 10);

    // 导出
    try {
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'changzheng_dashboard.png';
      link.href = dataURL;
      if (!link.isConnected) document.body.appendChild(link);
      link.click();
      link.remove();
      this.showToast('数据看板已导出为PNG');
    } catch (e) {
      this.showToast('导出失败，请稍后重试');
    }
  }
};
