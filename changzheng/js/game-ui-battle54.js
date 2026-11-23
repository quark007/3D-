/* Extracted GameUI battle methods. All instance state remains on GameUI. */
const GameUIBattle54 = {
returnToMap() {
    // 中途退出：QTE 进行中 / 已判负时，必须先中止本关（否则回滑计时器继续跑，
    // 覆盖层还盖在页面上，士气也会被停滞计时器继续扣）
    if (this.qteActive || this.qteCurrentNode || this.isGameOver || this.isPlayerDead) {
      this.abortLevel('退出本关');
    }
    // 直接关闭副本面板，不走 switchRoute（因为 currentRoute 可能已经是 'map'）
    this.closeDungeonPanel();
  },
abortLevel(reason) {
    const snap = this._levelStartSnapshot;
    const node = (snap && snap.node) || this.qteCurrentNode || this.settlementCurrentNode || null;
    this._clearQteTimers();
    clearInterval(this.telegramTypewriterTimer);
    this.reportController?.abort();
    this.reportRequestId = (this.reportRequestId || 0) + 1;
    this.stopTelegramSound();

    ['qteOverlay', 'settlementOverlay', 'archiveOverlay', 'telegramOverlay'].forEach(id => {
      document.getElementById(id)?.classList.remove('open');
    });
    document.getElementById('qteOverlay')?.classList.remove('qte-defeated');
    document.querySelectorAll('dialog[open]').forEach(dlg => {
      try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); }
    });
    this._hideDefeatPanel();
    this._hideSettlementLoading();
    this.settlementSession = (this.settlementSession || 0) + 1;
    clearTimeout(this.settlementRequestTimer);

    // 本关未完成：资源回到进关前，不做惩罚（停滞扣的士气也退回）
    if (snap && snap.resources && GameState.resources) {
      Object.keys(snap.resources).forEach(key => { GameState.resources[key] = snap.resources[key]; });
    }
    if (snap && typeof snap.stamina === 'number') GameState.stamina = snap.stamina;

    const progressEl = document.getElementById('qteProgress');
    if (progressEl) progressEl.style.width = '0%';
    const qteBtn = document.getElementById('qteClimbBtn');
    if (qteBtn) { qteBtn.disabled = false; qteBtn.classList.remove('qte-dead'); }

    this._clearLevelState();
    this._levelStartSnapshot = null;
    if (typeof GameState.save === 'function') GameState.save();
    if (typeof this.updateResourceHUD === 'function') this.updateResourceHUD();
    if (node) this.showToast(`${node.name} · ${reason}，本关进度未计入征程`);
    console.warn('[abortLevel] 已中止本关:', node && node.id, reason);
    return true;
  },
startQTE(node, parseData) {
    this._clearQteTimers();
    this.qteClickCount = 0;
    this.qteCurrentNode = node;
    this.qteProgress = 0;
    this.qteBloodLevel = 0;
    this.qteClimbRate = 0;
    this.qteLastClickTime = 0;
    this.qteActive = true;
    this.qteRound = 1;
    this.qtePlayerDecisions = [];
    this.qteCompletedLocked = false;  // 进度满锁定标志，防止重复触发

    // ===== 状态锁复位：只要是新开一关，就必须清掉上一关的死亡/结束标记 =====
    this.isPlayerDead = false;
    this.isGameOver = false;
    this.qteDeadLocked = false;

    // ===== 本关起点快照：resetLevel() 靠它把资源与指令完整还原，不靠刷新页面 =====
    this._levelStartSnapshot = {
      node,
      parseData: parseData || null,
      resources: GameState.resources ? { ...GameState.resources } : null,
      stamina: typeof GameState.stamina === 'number' ? GameState.stamina : null,
      commands: (this.commandFreeCommands || []).slice(),
      commandParse: this.commandParseData ? JSON.parse(JSON.stringify(this.commandParseData)) : null
    };

    // ===== 关卡驱动：从 levelConfigs 读取第一视角文案（杜绝硬编码与张冠李戴）=====
    const cfg = getLevelConfig(node.id) || {};
    this.qteConfig = cfg;
    const actions = (parseData && parseData.actions) ? parseData.actions : [];

    // 剧情文本：优先用关卡配置的史实氛围文案；缺失时回退到动态生成
    this.qteSceneText = this.buildQteSceneText((this.nodeLevelMap[node.id] || {}).level || 'ruijin', node, actions);

    // 标题 / 副标题 —— 均由关卡决定
    document.getElementById('qteTitle').textContent = cfg.title || node.name;
    const qteSubtitleEl = document.getElementById('qteSubtitle');
    if (qteSubtitleEl) qteSubtitleEl.textContent = `${GameState.character ? GameState.character.name : '协作任务'} · ${cfg.subtitle || '岗位体验'}`;

    // 按钮文字 —— 由关卡决定（修正：不再被玩家指令动词覆盖）
    const qteBtn = document.getElementById('qteClimbBtn');
    const qteHint = document.querySelector('.qte-hint');
    const roleActions = { logistics: '运送物资', medic: '协助转运', soldier: '协作前进' };
    const btnText = roleActions[GameState.character && GameState.character.id] || cfg.actionText || '前进';
    qteBtn.textContent = btnText;
    qteBtn.disabled = false;
    if (qteHint) {
      qteHint.classList.remove('qte-stall-warn');
      qteHint.textContent = cfg.battleMode === 'marsh'
        ? `疯狂连点${btnText} · 泥沼拖慢脚步，停手将深陷其中`
        : `疯狂连点按钮${btnText} · 停手将陷入险境`;
    }

    // 重置UI
    document.getElementById('qteProgress').style.width = '0%';
    document.getElementById('qteBlood').style.opacity = '0';
    document.getElementById('qteResult').classList.remove('show');
    document.getElementById('qteResult').textContent = '';
    document.getElementById('qteScene').innerHTML = '';

    // 重置士兵动画状态为Idle
    const soldierEl = document.getElementById('qteSoldier');
    if (soldierEl) {
      soldierEl.dataset.animState = 'idle';
      soldierEl.className = 'qte-soldier anim-idle';
      soldierEl.style.setProperty('--anim-speed', 1.0);
    }

    // 显示QTE覆盖层
    const overlay = document.getElementById('qteOverlay');
    overlay.classList.add('open');
    overlay.classList.remove('shaking');

    // 打字机效果播放旁白
    this.typewriterScene();

    // 启动回滑检测定时器
    this.qteSlideTimer = setInterval(() => {
      if (!this.qteActive) return;
      if(document.hidden){this.qteLastClickTime=Date.now();return;}
      const now = Date.now();
      if (now - this.qteLastClickTime > 1500 && this.qteProgress > 0) {
        // 开始回滑 → 触发滑落动画
        this.triggerSlipAnimation();
        this.qteProgress = Math.max(0, this.qteProgress - 6);
        document.getElementById('qteProgress').style.width = this.qteProgress + '%';
        // 仅在未锁定完成时判定失败，避免与胜利流程冲突
        if (this.qteProgress <= 0 && !this.qteCompletedLocked) {
          this.endQTE(false);
        }
      }
      // 连点速率衰减
      this.qteClimbRate = Math.max(0, this.qteClimbRate - 0.5);
      this.updateQteBloodAndShake();
    }, 200);

    // 停滞计时器：15秒未点满 → 停滞提示 + 扣士气（容错保命，防卡死）
    this._startQteStallTimer();
  },
_startQteStallTimer() {
    clearTimeout(this.qteStallTimer);
    this.qteStalled = false;
    this.qteStallTimer = setTimeout(() => {
      if (!this.qteActive || this.qteCompletedLocked) return;
      if(document.hidden){this._startQteStallTimer();return;}
      if (this.qteProgress >= 100) return;
      this.qteStalled = true;
      // 轻微扣减士气
      if (GameState && GameState.resources) {
        const before = Math.round(GameState.resources.morale);
        GameState.resources.morale = Math.max(0, GameState.resources.morale - 5);
        if (typeof this.updateResourceHUD === 'function') this.updateResourceHUD();
        if (typeof this.floatStat === 'function' && GameState.resources.morale !== before) {
          this.floatStat('Morale', GameState.resources.morale - before);
        }
      }
      // 显示停滞提示
      const hintEl = document.querySelector('.qte-hint');
      const overlay = document.getElementById('qteOverlay');
      if (hintEl) {
        hintEl.textContent = '部队陷入僵局，请快速决策！';
        hintEl.classList.add('qte-stall-warn');
      }
      if (overlay) {
        overlay.classList.add('qte-stalled');
        setTimeout(() => overlay.classList.remove('qte-stalled'), 600);
      }
      this.showToast && this.showToast('部队陷入僵局，请快速决策！');
      // 再给一轮容错窗口
      this._startQteStallTimer();
    }, 15000);
  },
_clearQteTimers() {
    this.qteTransitionEpoch=(this.qteTransitionEpoch||0)+1;
    clearTimeout(this.qteTransitionTimer);clearTimeout(this.qteFlashTimer);
    this.qteTransitionTimer=null;this.qteFlashTimer=null;
    document.querySelectorAll('.victory-flash').forEach(el=>el.remove());
    document.getElementById('qteOverlay')?.classList.remove('shaking','victory-shake');
    document.querySelector('.qte-hint')?.classList.remove('qte-stall-warn');
    clearInterval(this.qteSlideTimer);
    clearInterval(this.qteTypewriterTimer);
    clearTimeout(this.qteStallTimer);
    // 句柄置空，避免"已清理但状态仍为真"的误判（abortLevel / 巡检脚本都依赖它判断残留）
    this.qteSlideTimer = null;
    this.qteTypewriterTimer = null;
    this.qteStallTimer = null;
  },
buildQteSceneText(level, node, actions) {
    const role = GameState.character;
    if (role && role.id !== 'commander') {
      const duties = { logistics: '协助清点与运送物资，按计划完成补给', soldier: '听从部署，与战友协作完成当前任务', medic: '协助照料伤员，检查救护用品并配合转运' };
      return `${role.name} · 虚构岗位体验。${node.name}任务中，你${duties[role.id] || '参与协作任务'}。行动与资源变化仅用于教学体验，不代表真实战役过程或结果。`;
    }
    // 动态变量
    const troopPct = Math.round(GameState.resources.troops); // 兵力百分比 0-100
    const roleName = GameState.character ? GameState.character.name : '指挥员';
    const actionVerb = (actions && actions[0] && actions[0].verb) || '前进';
    const intensity = (actions && actions[0] && actions[0].intensity) || '中';
    const target = (actions && actions[0] && actions[0].target) || '';

    // 兵力梯度：高(≥70) / 中(40-69) / 低(<40)
    const troopTier = troopPct >= 70 ? 'high' : (troopPct >= 40 ? 'mid' : 'low');

    // 随机变体选择（每次进入QTE文本都不同）
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // 各关卡场景模板（按兵力梯度分组，每梯度2-3个变体）
    const templates = {
      ruijin: {
        high: [
          `${roleName}，部队士气正盛，${troopPct}%的战力完整。于都河畔，百姓们拆下门板搭起浮桥，灯火在河面上摇曳。你下令${actionVerb}${target ? '，向' + target + '推进' : ''}——告别苏区，踏上战略转移之路！${intensity}烈度行军，隐蔽而迅速！`,
          `${roleName}，夜色笼罩于都河，${troopPct}%的兵力整装待发。浮桥在脚下微微晃动，乡亲们站在岸边默默送别。你低声下令：${actionVerb}！${target ? target + '方向，' : ''}突破第一道封锁线，不能让敌人发现我们的行踪！`
        ],
        mid: [
          `${roleName}，队伍已有折损，只剩${troopPct}%的兵力。于都河的水冰冷刺骨，浮桥简陋但够用。你咬着牙下令：${actionVerb}！${target ? '先过' + target + '，' : ''}隐蔽行军，天亮前必须穿过封锁线！`,
          `${roleName}，${troopPct}%的战力，经不起正面硬拼。于都河畔夜色深沉，你压低声音下令${actionVerb}——${intensity}烈度执行，脚步要轻，动作要快，不能惊动敌军！`
        ],
        low: [
          `${roleName}，只剩${troopPct}%的战力了。每一个战友都是宝贵的。于都河的浮桥在夜色中摇晃，乡亲们含泪送别。你嘶哑地下令：${actionVerb}……${target ? '穿过' + target + '，' : ''}为了苏区的百姓，也要走出去！`,
          `${roleName}，${troopPct}%——这是全队仅剩的战力。于都河畔，门板浮桥在脚下吱呀作响。你下令${actionVerb}——停手就会被追兵赶上，前进才有生机！`
        ]
      },
      xiangjiang: {
        high: [
          `${roleName}，湘江岸边炮火连天，但你手握${troopPct}%的兵力。你一声令下：${actionVerb}${target ? '，冲击' + target : ''}！战友们如潮水般涌向敌阵——这股气势，封锁线挡不住！`,
          `${roleName}，${troopPct}%的兵力正处巅峰。敌人的封锁线就在前方，碉堡枪眼喷着火。你果断下令${actionVerb}，${intensity}烈度的攻势撕开缺口——前进，突破它！`
        ],
        mid: [
          `${roleName}，湘江水已被鲜血染红，你的部队只剩${troopPct}%。封锁线的机枪声密如骤雨。你红着眼下令：${actionVerb}！${target ? '先破' + target + '，' : ''}哪怕踩着战友的脚印，也要冲过去！`,
          `${roleName}，兵力降至${troopPct}%。炮弹在身边炸开，泥土溅了满脸。${intensity}烈度的阻击一波接一波，但${actionVerb}——不能停，停下来就是全军覆没！`
        ],
        low: [
          `${roleName}，只剩${troopPct}%了。湘江的水是红的，岸上的阵地也是红的。你看着身边仅存的战士，声音沙哑：${actionVerb}……${target ? '突破' + target + '，' : ''}为了牺牲的同志，也要走出去！`,
          `${roleName}，${troopPct}%的兵力，这是湘江给我们的最后考验。敌军封锁线的火力网密不透风，但你咬牙下令${actionVerb}——只要还有一个人在冲，封锁线就困不死我们！`
        ]
      },
      zunyi: {
        high: [
          `${roleName}，遵义城内灯火通明，各方意见激烈交锋。你手握${troopPct}%的兵力，但更重要的是——方向！你${actionVerb}，梳理情报、分析敌我，${intensity}烈度的讨论只为找到正确的路！`,
          `${roleName}，${troopPct}%的战力尚在，但真正的力量在于决策。遵义会议，生死攸关的转折点。你${actionVerb}，纠正错误的军事指挥，确立正确的路线——这是党和红军历史上最关键的一刻！`
        ],
        mid: [
          `${roleName}，部队只剩${troopPct}%的兵力，经不起任何折腾了。遵义城内，各方意见纷纭。你${actionVerb}，冷静分析——${intensity}烈度的讨论，只为找到一条生路！`,
          `${roleName}，${troopPct}%的战力，每一分都珍贵。遵义会议，你${actionVerb}，梳理情报、总结教训——不能再走错路了，同志们都在看着！`
        ],
        low: [
          `${roleName}，只剩${troopPct}%的战力。遵义城内，灯火昏暗。你声音沙哑地${actionVerb}——每一个字都重若千钧，因为这关系到全军的命运！`,
          `${roleName}，${troopPct}%——这是全队仅剩的战力。遵义会议，你${actionVerb}，用最后的力气梳理情报、分析敌我——不能再让同志们白白牺牲了！`
        ]
      },
      chishui: {
        high: [
          `${roleName}，赤水河畔敌军重兵围堵，但你有${troopPct}%的兵力在手。声东击西！你下令${actionVerb}${target ? '，向' + target + '穿插' : ''}——让敌人摸不清我们的方向！`,
          `${roleName}，${troopPct}%的战力正旺。四次渡赤水的战机就在眼前，你果断${actionVerb}，${intensity}烈度的行动要快——兵贵神速，跳出包围圈！`
        ],
        mid: [
          `${roleName}，兵力只剩${troopPct}%。赤水河的水冰凉刺骨，敌军的追兵越来越近。你当机立断：${actionVerb}！${target ? '向' + target + '方向，' : ''}犹豫一秒，包围圈就合拢了！`,
          `${roleName}，${troopPct}%的战力，经不起任何消耗了。敌军围堵的脚步声清晰可闻，你下令${actionVerb}——${intensity}烈度执行，快！`
        ],
        low: [
          `${roleName}，只剩${troopPct}%的战力。赤水河在夜色中奔流，身边的战士已经疲惫到极点。但你下令：${actionVerb}……${target ? '往' + target + '走，' : ''}走出这片包围圈，就有活路！`,
          `${roleName}，${troopPct}%——每一条生命都弥足珍贵。敌军的包围圈越缩越小，你压低声音下令${actionVerb}，动作要轻，脚步要快——不能惊动敌人！`
        ]
      },
      jinsha: {
        high: [
          `${roleName}，金沙江水流湍急，但你手握${troopPct}%的兵力。几条小船在皎平渡口待命。你下令${actionVerb}${target ? '，向' + target + '渡江' : ''}——从容不迫，摆脱追兵！`,
          `${roleName}，${troopPct}%的战力正旺。金沙江畔，追兵步步紧逼。你果断${actionVerb}，${intensity}烈度的渡江行动要稳——几条小船昼夜往返，一举甩开尾追的敌军！`
        ],
        mid: [
          `${roleName}，兵力只剩${troopPct}%。金沙江的水浪拍打着船舷，追兵的脚步声越来越近。你咬着牙下令：${actionVerb}！${target ? '先过' + target + '，' : ''}不能让追兵赶上！`,
          `${roleName}，${troopPct}%的战力，经不起任何拖延了。金沙江畔，小船在浪中起伏。你下令${actionVerb}——${intensity}烈度执行，快！`
        ],
        low: [
          `${roleName}，只剩${troopPct}%的战力。金沙江的水浪滔天，身边的战士已经疲惫不堪。但你下令：${actionVerb}……${target ? '渡过' + target + '，' : ''}这是最后的机会！`,
          `${roleName}，${troopPct}%——每一条生命都弥足珍贵。金沙江畔，小船在浪中颠簸。你压低声音下令${actionVerb}，动作要稳，脚步要快——不能惊动追兵！`
        ]
      },
      dadu: {
        high: [
          `${roleName}，大渡河天险横亘在前，急流咆哮。你手握${troopPct}%的兵力，十七名勇士已准备好乘小船强渡。你下令${actionVerb}${target ? '，直取' + target : ''}——为全军打开北上的通路！`,
          `${roleName}，${troopPct}%的战力正旺。大渡河畔，急流如雷。你果断${actionVerb}，${intensity}烈度的强渡行动——勇士们冒着对岸密集火力，冲向渡口！`
        ],
        mid: [
          `${roleName}，兵力只剩${troopPct}%。大渡河的水急流如箭，对岸的守敌已严阵以待。你咬着牙下令：${actionVerb}！${target ? '先过' + target + '，' : ''}哪怕只剩最后一个人，也要冲过去！`,
          `${roleName}，${troopPct}%的战力，经不起任何消耗了。大渡河畔，小船在急流中颠簸。你下令${actionVerb}——${intensity}烈度执行，快！`
        ],
        low: [
          `${roleName}，只剩${troopPct}%的战力。大渡河的急流如雷，身边的战士已经疲惫到极点。但你下令：${actionVerb}……${target ? '冲过' + target + '，' : ''}这是最后的通路！`,
          `${roleName}，${troopPct}%——每一条生命都弥足珍贵。大渡河畔，小船在急流中摇晃。你压低声音下令${actionVerb}，动作要稳，脚步要快——不能让牺牲白费！`
        ]
      },
      luding: {
        high: [
          `${roleName}，部队士气正盛。你趴在冰冷的铁索上，对岸机枪喷吐火舌。你下令${actionVerb}${target ? '，直取' + target : ''}！子弹打在铁链上溅出火星，战友们紧随其后。${intensity}烈度的攻势正猛——不停手，就能冲过这道天险！`,
          `${roleName}，此刻兵力充沛，${troopPct}%的战力还在。铁索摇晃，对岸机枪声密如骤雨，但你中气十足地下令：${actionVerb}！${target ? target + '方向的敌火力点已被压制，' : ''}继续，胜利就在对岸！`
        ],
        mid: [
          `${roleName}，队伍已经折损过半，只剩${troopPct}%的兵力。铁索冰冷，子弹贴着头皮飞。你咬着牙下令：${actionVerb}！${target ? '先夺' + target + '，' : ''}哪怕只剩最后一个人，也要爬到对岸！`,
          `${roleName}，兵力已降至${troopPct}%。铁索在脚下摇晃，对岸机枪声密如骤雨。${intensity}烈度的敌火压得人抬不起头，但${actionVerb}的命令不能变——停一步，就前功尽弃！`
        ],
        low: [
          `${roleName}，队伍只剩${troopPct}%的战力了。每一个战友的伤亡都让人心如刀绞。铁索冰寒，对岸的机枪像毒蛇一样吐着火舌。你嘶哑地下令：${actionVerb}……${target ? '拿下' + target + '，' : ''}这是最后的冲锋了！`,
          `${roleName}，${troopPct}%——这是全队仅剩的战力。你的手臂已经发酸，身边的战友一个个倒下。但你不能停：${actionVerb}！停手就会滑落，停下来，牺牲就白费了！`
        ]
      },
      snowmount: {
        high: [
          `${roleName}，夹金山终年积雪，空气稀薄，但你手握${troopPct}%的兵力。你下令${actionVerb}${target ? '，向' + target + '攀登' : ''}——战士们相互搀扶，一步一喘地向上攀登，用意志对抗严寒与缺氧！`,
          `${roleName}，${troopPct}%的战力正旺。雪山之巅，风雪刺骨。你果断${actionVerb}，${intensity}烈度的攀登行动——用意志对抗严寒，用团结战胜缺氧！`
        ],
        mid: [
          `${roleName}，兵力只剩${troopPct}%。夹金山的风雪越来越猛，战士们的体力已经透支。你咬着牙下令：${actionVerb}！${target ? '先过' + target + '，' : ''}不能停，停下来就会冻僵在雪地里！`,
          `${roleName}，${troopPct}%的战力，经不起任何消耗了。雪山之巅，风雪如刀。你下令${actionVerb}——${intensity}烈度执行，一步一个脚印，不能让任何一个人掉队！`
        ],
        low: [
          `${roleName}，只剩${troopPct}%的战力。夹金山的风雪如刀，身边的战士已经疲惫到极点。但你下令：${actionVerb}……${target ? '翻过' + target + '，' : ''}这是最后的考验！`,
          `${roleName}，${troopPct}%——每一条生命都弥足珍贵。雪山之巅，风雪刺骨。你压低声音下令${actionVerb}，动作要稳，脚步要慢——不能让任何一个人冻僵在雪地里！`
        ]
      },
      grassland: {
        high: [
          `${roleName}，松潘草地无边无际，但你手握${troopPct}%的兵力。你下令${actionVerb}${target ? '，向' + target + '跋涉' : ''}——部队忍着饥饿，踩着前人的脚印，向草地深处跋涉！`,
          `${roleName}，${troopPct}%的战力正旺。草地之上，泥沼遍布。你果断${actionVerb}，${intensity}烈度的跋涉行动——每一步都要小心，每一次拔腿都可能陷入无尽的深渊！`
        ],
        mid: [
          `${roleName}，兵力只剩${troopPct}%。松潘草地的泥沼已经吞噬了不少战友，粮食也所剩无几。你咬着牙下令：${actionVerb}！${target ? '先过' + target + '，' : ''}不能停，停下来就会陷入泥沼！`,
          `${roleName}，${troopPct}%的战力，经不起任何消耗了。草地之上，泥沼如陷阱。你下令${actionVerb}——${intensity}烈度执行，每一步都要踩稳，不能让任何一个人掉进泥沼！`
        ],
        low: [
          `${roleName}，只剩${troopPct}%的战力。松潘草地的泥沼如深渊，身边的战士已经疲惫到极点。但你下令：${actionVerb}……${target ? '走出' + target + '，' : ''}这是最后的跋涉！`,
          `${roleName}，${troopPct}%——每一条生命都弥足珍贵。草地之上，泥沼遍布。你压低声音下令${actionVerb}，动作要稳，脚步要慢——不能让任何一个人陷入泥沼！`
        ]
      },
      lazikou: {
        high: [
          `${roleName}，腊子口两山夹峙，隘口狭窄，但你手握${troopPct}%的兵力。你下令${actionVerb}${target ? '，直取' + target : ''}——正面强攻，同时派突击队攀上悬崖，从敌侧后发起突袭！`,
          `${roleName}，${troopPct}%的战力正旺。腊子口天险，敌军凭险据守。你果断${actionVerb}，${intensity}烈度的突击行动——正面强攻，迂回突袭，一举夺隘！`
        ],
        mid: [
          `${roleName}，兵力只剩${troopPct}%。腊子口的隘口如铁桶，敌军的机枪喷吐火舌。你咬着牙下令：${actionVerb}！${target ? '先破' + target + '，' : ''}哪怕只剩最后一个人，也要冲过去！`,
          `${roleName}，${troopPct}%的战力，经不起任何消耗了。腊子口天险，敌军的火力网密不透风。你下令${actionVerb}——${intensity}烈度执行，正面强攻，迂回突袭！`
        ],
        low: [
          `${roleName}，只剩${troopPct}%的战力。腊子口的隘口如铁壁，身边的战士已经疲惫到极点。但你下令：${actionVerb}……${target ? '突破' + target + '，' : ''}这是最后的通路！`,
          `${roleName}，${troopPct}%——每一条生命都弥足珍贵。腊子口天险，敌军的机枪声密如骤雨。你压低声音下令${actionVerb}，正面强攻，迂回突袭——不能让牺牲白费！`
        ]
      },
      huining: {
        high: [
          `${roleName}，历经千难万险，红军三大主力在会宁胜利会师！你手握${troopPct}%的兵力，将士们欢呼相拥——长征以敌人的围追堵截失败、以红军的胜利会师而告结束！`,
          `${roleName}，${troopPct}%的战力尚在。会宁城内，三军汇聚。你${actionVerb}，${intensity}烈度的庆祝——长征胜利了，同志们，我们走到了最后！`
        ],
        mid: [
          `${roleName}，兵力只剩${troopPct}%。会宁城内，将士们欢呼相拥。你${actionVerb}，${intensity}烈度的庆祝——历经千难万险，我们终于会师了！`,
          `${roleName}，${troopPct}%的战力，每一分都珍贵。会宁会师，长征胜利结束。你${actionVerb}，用最后的力气欢呼——同志们，我们走到了最后！`
        ],
        low: [
          `${roleName}，只剩${troopPct}%的战力。会宁城内，灯火通明。你声音沙哑地${actionVerb}——每一个字都重若千钧，因为这关系到全军的命运！`,
          `${roleName}，${troopPct}%——这是全队仅剩的战力。会宁会师，长征胜利结束。你${actionVerb}，用最后的力气欢呼——同志们，我们走到了最后！`
        ]
      },
      wuqi: {
        high: [
          `${roleName}，中央红军到达陕北吴起镇，与陕北红军胜利会合！你手握${troopPct}%的兵力，宣告中央红军长征的胜利完成——星火在这里燎原，中国革命从此翻开崭新的一页！`,
          `${roleName}，${troopPct}%的战力尚在。吴起镇，长征落脚陕北。你${actionVerb}，${intensity}烈度的宣告——长征胜利了，同志们，我们找到了新的根据地！`
        ],
        mid: [
          `${roleName}，兵力只剩${troopPct}%。吴起镇，长征落脚陕北。你${actionVerb}，${intensity}烈度的宣告——历经千难万险，我们终于到达了！`,
          `${roleName}，${troopPct}%的战力，每一分都珍贵。吴起镇，长征胜利完成。你${actionVerb}，用最后的力气宣告——同志们，我们找到了新的根据地！`
        ],
        low: [
          `${roleName}，只剩${troopPct}%的战力。吴起镇，灯火昏暗。你声音沙哑地${actionVerb}——每一个字都重若千钧，因为这关系到全军的命运！`,
          `${roleName}，${troopPct}%——这是全队仅剩的战力。吴起镇，长征胜利完成。你${actionVerb}，用最后的力气宣告——同志们，我们找到了新的根据地！`
        ]
      }
    };

    // 获取模板
    let tierTemplates = (templates[level] && templates[level][troopTier]) || null;
    
    // 如果没有匹配到模板，使用兜底
    if (!tierTemplates) {
      const fb = {
        ruijin: { scene: '于都河', obstacle: '浮桥', enemy: '追兵' },
        xiangjiang: { scene: '湘江', obstacle: '封锁线', enemy: '敌军机枪' },
        zunyi: { scene: '遵义城', obstacle: '会议', enemy: '错误路线' },
        chishui: { scene: '赤水河', obstacle: '河水', enemy: '围追堵截的敌军' },
        jinsha: { scene: '金沙江', obstacle: '几条小船', enemy: '追兵' },
        dadu: { scene: '大渡河', obstacle: '急流', enemy: '对岸守敌' },
        luding: { scene: '泸定桥', obstacle: '铁索', enemy: '对岸机枪' },
        snowmount: { scene: '夹金山', obstacle: '冰雪严寒', enemy: '高山缺氧' },
        grassland: { scene: '松潘草地', obstacle: '泥沼', enemy: '饥饿困苦' },
        lazikou: { scene: '腊子口', obstacle: '万丈悬崖', enemy: '隘口敌军' },
        huining: { scene: '会宁', obstacle: '长征', enemy: '围追堵截' },
        wuqi: { scene: '吴起镇', obstacle: '长征', enemy: '围追堵截' }
      }[level] || { scene: '战场', obstacle: '险境', enemy: '敌军' };
      
      tierTemplates = [
        `${roleName}，${fb.scene}前${fb.obstacle}险象环生，${fb.enemy}虎视眈眈。你有${troopPct}%的兵力，下令${actionVerb}${target ? '，目标' + target : ''}！${intensity}烈度执行——不停手，就有希望！`,
        `${roleName}，兵力${troopPct}%。${fb.enemy}的火力越来越密，${fb.obstacle}在脚下晃动。你下令${actionVerb}——停手就是绝路，前进才有生机！`
      ];
    }

    // 生成文本
    const text = pick(tierTemplates);
    
    // 时间线安全校验：检查是否包含禁止关键词
    const forbidden = TIMELINE_FORBIDDEN[level] || [];
    for (const kw of forbidden) {
      if (text.includes(kw)) {
        console.warn(`[timeline-safety] 节点${level}文本含禁止词"${kw}"，已替换`);
        return text.replace(new RegExp(kw, 'g'), '***');
      }
    }
    
    return text;
  },
syncQteSceneColumn() {
    const overlay = document.getElementById('qteOverlay');
    const scene = overlay && overlay.querySelector('.qte-scene');
    if (!scene) return;
    // 先摘掉上一次的判定结果再量：.qte-single-col 自己会把非叙事列 display:none，
    // 带着这个类去量永远是「没有场景」，判定会锁死在上一次的结果上（真场景再也回不来）。
    overlay.classList.remove('qte-single-col');
    const visible = [...scene.children].some(el => {
      if (el.classList.contains('qte-scene-text')) return false;
      // .scene-library-card 是 SceneLibrary.placeholder() 的「按需加载」占位卡（写着"先完成本步剧情"），
      // 不是场景本身；QTE 进行中它既不是画面也不该占掉左列 42%。
      if (el.classList.contains('scene-library-card')) return false;
      const style = getComputedStyle(el), rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden'
        && parseFloat(style.opacity) > 0.05 && rect.width > 1 && rect.height > 1;
    });
    overlay.classList.toggle('qte-single-col', !visible);
  },
typewriterScene() {
    clearInterval(this.qteTypewriterTimer);
    const sceneEl = document.getElementById('qteScene');
    this.retainTaskScene(sceneEl,this.commandCurrentNode || { id: 1, type: 'start', name: '行军任务' },{phase:'qte',shotIndex:this.qteRound-1});const sceneText=document.createElement('div');sceneText.className='qte-scene-text';sceneEl.append(sceneText);
    const textEl = sceneEl.querySelector('.qte-scene-text');
    // 立刻判一次，再在下一帧补判一次：场景挂载与 :has(#qteOverlay.open) 的隐藏规则都可能晚一拍生效。
    this.syncQteSceneColumn();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => this.syncQteSceneColumn());
    let i = 0;
    const text = this.qteSceneText;

    this.qteTypewriterTimer = setInterval(() => {
      if (i < text.length) {
        textEl.textContent += text[i];
        i++;
      } else {
        clearInterval(this.qteTypewriterTimer);
      }
    }, 50);
  },
onQteClimb() {
    // 已锁定（进度满）或非激活状态时直接忽略，防止重复触发与报错
    if (!this.qteActive || this.qteCompletedLocked) return;
    // 死亡状态锁：牺牲后一律不接受任何输入，杜绝"死着还能点满过关"
    if (this.isPlayerDead || this.isGameOver) return;
    if(typeof PlayerSettings!=='undefined'&&PlayerSettings.values.vibration&&typeof navigator.vibrate==='function'){try{navigator.vibrate(20);}catch{}}

    // ===== battleMode 差异化：不同关卡推进节奏不同 =====
    const mode = (this.qteConfig && this.qteConfig.battleMode) || 'qte';
    let gain = 4;
    if (mode === 'marsh') {
      gain = 2; // 泥沼拖慢脚步
      // 泥沼消耗：小概率扣减粮食，体现战场残酷
      if (Math.random() < 0.15 && GameState && GameState.resources) {
        GameState.resources.food = Math.max(0, GameState.resources.food - 1);
      }
    } else if (mode === 'march') {
      gain = 5; // 常规行军/渡河略快
    }

    if(typeof Campaign55!=='undefined'&&this.qteCurrentNode)gain*=Campaign55.difficulty(this.qteCurrentNode);
    this.qteProgress = Math.min(100, this.qteProgress + gain);
    document.getElementById('qteProgress').style.width = this.qteProgress + '%';

    // 更新连点速率
    const now = Date.now();
    const interval = now - this.qteLastClickTime;
    if (interval < 300) {
      this.qteClimbRate = Math.min(10, this.qteClimbRate + 1);
    } else {
      this.qteClimbRate = Math.max(1, this.qteClimbRate * 0.3);
    }
    this.qteLastClickTime = now;

    this.updateQteBloodAndShake();

    // 记录玩家决策
    const actions = this.commandParseData ? (this.commandParseData.actions || []) : [];
    const primaryAction = actions[0] || { unit: '二班', verb: '攀爬', target: '铁索', intensity: '中' };
    const casualtyMap = { '低': 0, '中': 1, '高': 2 };
    const casualty = casualtyMap[primaryAction.intensity] ?? 1;

    this.qteClickCount = (this.qteClickCount || 0) + 1;
    if (!this.qtePlayerDecisions.length) this.qtePlayerDecisions.push({
      action: zhText(primaryAction.verb, '行动'),
      target: zhText(primaryAction.target, '目标待定'),
      success: true,
      casualty: casualty
    });

    // ===== 进度条满：锁定 + 禁用按钮 + 触发胜利闭环 =====
    if (this.qteProgress >= 100) {
      this.qteCompletedLocked = true;
      this.qteProgress = 100;
      document.getElementById('qteProgress').style.width = '100%';
      const qteBtn = document.getElementById('qteClimbBtn');
      if (qteBtn) qteBtn.disabled = true;  // 禁用按钮，防止继续点击报错
      this.endQTE(true);
    }
  },
updateQteBloodAndShake() {
    // 流血效果：连点速率越高，红色越深
    const bloodOpacity = Math.min(0.7, this.qteClimbRate * 0.07);
    document.getElementById('qteBlood').style.opacity = bloodOpacity;

    // 震屏：连点速率>5时触发
    const overlay = document.getElementById('qteOverlay');
    if (this.qteClimbRate > 5) {
      overlay.classList.add('shaking');
      setTimeout(() => overlay.classList.remove('shaking'), 180);
    }

    // ===== 2D动画状态机：士兵动画随点击频率实时切换 =====
    this.updateSoldierAnimation();
  },
updateSoldierAnimation() {
    const soldierEl = document.getElementById('qteSoldier');
    if (!soldierEl) return;

    const rate = this.qteClimbRate;
    let newState = 'idle';
    if (rate >= 7) newState = 'climb-fast';   // 疯狂连点：动画加倍
    else if (rate >= 3) newState = 'climb';   // 正常连点：稳定攀爬
    else if (rate >= 1) newState = 'climb';   // 缓慢连点：勉强攀爬
    else newState = 'idle';                    // 停手：静止（滑落由回滑定时器触发）

    // 状态切换时更新类名
    if (soldierEl.dataset.animState !== newState) {
      soldierEl.dataset.animState = newState;
      soldierEl.className = 'qte-soldier anim-' + newState;
    }

    // 动画速度随连点速率联动（animator.speed 等效实现）
    const animSpeed = rate >= 7 ? 2.0 : (rate >= 3 ? 1.2 : 1.0);
    soldierEl.style.setProperty('--anim-speed', animSpeed);
  },
triggerSlipAnimation() {
    const soldierEl = document.getElementById('qteSoldier');
    if (!soldierEl) return;
    soldierEl.dataset.animState = 'slip';
    soldierEl.className = 'qte-soldier anim-slip';
  },
endQTE(victory) {
    this.qtePlayerDecisions.forEach(decision => { decision.success = !!victory; });
    this.qteActive = false;
    this._clearQteTimers();

    // ===== 修复：node 未定义卡死 bug（原代码第2347行）=====
    const node = this.qteCurrentNode;
    if (!node) {
      console.error('[endQTE] qteCurrentNode 丢失，直接返回地图');
      this._forceReturnToMap();
      return;
    }

    // 显示结果横幅
    const resultEl = document.getElementById('qteResult');
    const levelCfg = this.loadLevelConfig(node.id);
    const successText = levelCfg && levelCfg.fallbackScene ? '突破成功' : '成功';
    const failText = levelCfg && levelCfg.fallbackScene ? `${levelCfg.fallbackScene.action}失败` : '失败';
    resultEl.textContent = victory ? successText : failText;
    resultEl.classList.add('show');

    if (victory) {
      // ===== 胜利过渡动画：闪烁 + 震动 + Web Audio 冲锋号 =====
      this._playVictoryTransition(() => {
        if(this.qteCurrentNode!==node)return;
        // 隐藏QTE界面
        document.getElementById('qteOverlay').classList.remove('open');
        // 进入战报结算闭环
        this.requestBattleReport(victory);
      });
    } else {
      // ===== 玩家牺牲（失败）：先落状态锁，再放死亡动画，最后才进失败闭环 =====
      this.isPlayerDead = true;
      this.isGameOver = true;
      this.qteDeadLocked = true;
      this.qtePlayerDecisions.forEach(decision => { decision.success = false; });

      // 1. 死亡动画：士兵滑落 + 定格，禁止继续连点
      const deadBtn = document.getElementById('qteClimbBtn');
      if (deadBtn) { deadBtn.disabled = true; deadBtn.classList.add('qte-dead'); }
      const soldierDead = document.getElementById('qteSoldier');
      if (soldierDead) {
        soldierDead.dataset.animState = 'dead';
        soldierDead.className = 'qte-soldier anim-dead';
      }
      const qteOverlayDead = document.getElementById('qteOverlay');
      if (qteOverlayDead) qteOverlayDead.classList.add('qte-defeated');
      this._playDefeatTone();

      // 2. 延迟后关闭QTE，进入失败面板（绝不进结算/档案/完成副本链路）
      const epoch=this.qteTransitionEpoch;
      this.qteTransitionTimer=setTimeout(() => {
        if(epoch!==this.qteTransitionEpoch||this.qteCurrentNode!==node)return;
        document.getElementById('qteOverlay').classList.remove('open');
        this.requestBattleReport(victory);
      }, 1800);
    }
  },
_forceReturnToMap() {
    this.qteActive=false;this._clearQteTimers();this.reportController?.abort();this.reportRequestId=(this.reportRequestId||0)+1;
    document.getElementById('qteOverlay')?.classList.remove('open');
    // 重置QTE状态
    this.qteCurrentNode = null;
    this.qtePlayerDecisions = [];
    this.qteCompletedLocked = false;
  },
showTelegramLoading() {
    const overlay = document.getElementById('telegramOverlay');
    if (!overlay) return;
    overlay.classList.add('open');
    // DOM中正文区域是 telegramText（不是 telegramContent），直接在正文区显示loading
    const textEl = document.getElementById('telegramText');
    if (textEl) {
      textEl.innerHTML = `
        <div class="telegram-loading">
          <div class="cinema-loading">${CinemaAssets.frame(166)}</div>
          <div class="telegram-loading-text">正在接收前线电报…</div>
          <div class="telegram-loading-dots"><i></i><i></i><i></i></div>
        </div>
      `;
    }
  },
hideTelegramLoading() {
    // telegramText 会被 showTelegramReport 重写，这里不需额外清理
  },
showTelegramReport(reportData) {
    const overlay = document.getElementById('telegramOverlay');
    const textEl = document.getElementById('telegramText');
    const footerEl = document.getElementById('telegramFooter');

    // 渲染前最后一道防线：历史时间线校验
    const node = this.qteCurrentNode;
    if (node) {
      const levelCfg = this.loadLevelConfig(node.id);
      // 准备内容：summary + recommendation
      let fullContent = reportData.summary || reportData.narrative || '';
      if (reportData.recommendation || reportData.suggestion) {
        fullContent += '\n\n【下一步】\n' + (reportData.recommendation || reportData.suggestion);
      }
      const timelineCheck = this.validateTimeline(fullContent, levelCfg);
      if (!timelineCheck.valid) {
        reportData.summary = levelCfg.sceneAtmosphere + '。' +
          (levelCfg.fallbackScene ? '你下令' + levelCfg.fallbackScene.action + '——不停手，就有希望！' : '');
        reportData.narrative = reportData.summary;
        reportData.recommendation = '继续前进。';
        reportData.suggestion = '继续前进。';
        reportData.degraded = true;
        console.warn('[showTelegramReport] 时间线校验拦截，已替换为安全内容');
      }
    }

    // 应用emotion色调
    this.applyEmotionTheme(overlay, reportData.emotion_tag);

    // 清空内容
    textEl.innerHTML = '';

    // 准备内容：summary + recommendation
    let fullContent = reportData.summary || reportData.narrative || '';
    if (reportData.recommendation || reportData.suggestion) {
      fullContent += '\n\n【下一步】\n' + (reportData.recommendation || reportData.suggestion);
    }

    // 兜底：如果fullContent仍为空，使用关卡兜底文案
    if (!fullContent.trim() && node) {
      const levelCfg = this.loadLevelConfig(node.id);
      fullContent = levelCfg.sceneAtmosphere + '。' +
        (levelCfg.fallbackScene ? '你下令' + levelCfg.fallbackScene.action + '——不停手，就有希望！' : '') +
        '\n\n【下一步】\n继续前进。';
      console.warn('[showTelegramReport] fullContent为空，已使用关卡兜底文案');
    }

    // 打字机效果展示战报
    this.telegramTypewriter(textEl, fullContent, () => {
      // 打字完成后显示关闭按钮
      document.getElementById('telegramClose').style.display = 'block';
    });

    // 电报音效
    this.playTelegramSound();

    // 显示电报弹窗
    overlay.classList.add('open');
    document.getElementById('telegramClose').style.display = 'none';

    // 存储当前战报数据用于关闭后处理
    this._currentReportData = reportData;
  },
telegramTypewriter(el, text, onComplete) {
    let i = 0;
    clearInterval(this.telegramTypewriterTimer);

    // 先添加光标
    el.innerHTML = '<span class="telegram-text-content"></span><span class="telegram-cursor"></span>';
    const contentEl = el.querySelector('.telegram-text-content');

    this.telegramTypewriterTimer = setInterval(() => {
      if (i < text.length) {
        const ch = text[i];
        contentEl.textContent += ch;

        // 电报滴滴声（每隔几个字触发）
        if (i % 3 === 0 && ch !== '\n' && ch !== ' ') {
          this.playTelegraphBeep();
        }

        // 换行处理
        if (ch === '\n') {
          contentEl.innerHTML += '<br>';
        }
        i++;
      } else {
        clearInterval(this.telegramTypewriterTimer);
        // 移除光标
        const cursor = el.querySelector('.telegram-cursor');
        if (cursor) cursor.remove();
        if (onComplete) onComplete();
      }
    }, 60);
  },
closeTelegram() {
    this.reportController?.abort();
    this.reportRequestId=(this.reportRequestId||0)+1;
    document.querySelector('[data-local-report]')?.remove();
    document.getElementById('telegramOverlay').classList.remove('open');
    clearInterval(this.telegramTypewriterTimer);
    this.stopTelegramSound();

    // 应用战斗结果到资源系统
    const reportData = this._currentReportData;
    if (reportData) {
      this.applyBattleResult(reportData);
      // 战局数据UI变化：刷新HUD并高亮兵力/弹药/粮食/士气，体现战场残酷性
      this.applyBattleOutcomeUI();
    }

    // ===== 关键分叉：失败（含牺牲）绝不进结算/档案/完成副本，直接进失败重试闭环 =====
    if (this._isDefeatReport(reportData) || this.isPlayerDead || this.isGameOver) {
      this.isPlayerDead = true;
      this.isGameOver = true;
      const deadNode = this.qteCurrentNode;
      // 清理战报态，但保留 qtePlayerDecisions 供失败面板统计
      this.qteCurrentNode = null;
      this.commandFreeCommands = [];
      this.commandParseData = null;
      this._showDefeatPanel(deadNode, reportData);
      return;
    }

    // 进入平行时空结算界面（而不是直接完成副本）
    if (this.qteCurrentNode) {
      // showSettlement owns the single request and snapshots the command before cleanup.
      this.showSettlement(this.qteCurrentNode, reportData);
    }

    // 清理QTE状态（但保留 qtePlayerDecisions 供结算使用）
    this.qteCurrentNode = null;
    this.commandFreeCommands = [];
    this.commandParseData = null;
  },
_isDefeatReport(reportData) {
    if (!reportData) return false;
    if (reportData.outcome === '受挫' || reportData.outcome === '失败') return true;
    if (reportData.rating === '失利') return true;
    if (reportData.emotion_tag === 'defeat') return true;
    return false;
  },
_showDefeatPanel(node, reportData) {
    // 先关闭可能残留的所有上层弹窗，避免叠层
    ['settlementOverlay', 'archiveOverlay', 'telegramOverlay'].forEach(id => {
      document.getElementById(id)?.classList.remove('open');
    });
    document.getElementById('qteOverlay')?.classList.remove('open', 'qte-defeated');

    // 原生 <dialog>.showModal() 会进入浏览器 top layer，层级高于任何 z-index：
    // 若不关掉（如新手引导、NPC 对话弹窗），失败面板会被盖住且按钮点不动。
    document.querySelectorAll('dialog[open]').forEach(dlg => {
      try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); }
    });

    const targetNode = node || (this._levelStartSnapshot && this._levelStartSnapshot.node) || null;
    const casualty = (this.qtePlayerDecisions || []).reduce((sum, d) => sum + (d.casualty || 0), 0);
    const nodeName = targetNode ? targetNode.name : '本关';

    let panel = document.getElementById('defeatOverlay');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'defeatOverlay';
      panel.className = 'defeat-overlay';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', '本关失利');
      panel.innerHTML = `
        <div class="defeat-card">
          <p class="defeat-eyebrow">长 征 行 记 · 任 务 未 完 成</p>
          <h2 class="defeat-title" id="defeatTitle">行动失利</h2>
          <div class="defeat-rule" aria-hidden="true"></div>
          <p class="defeat-reason" id="defeatReason"></p>
          <dl class="defeat-stats" id="defeatStats"></dl>
          <p class="defeat-note">这是虚构协作任务的推演结果，不改变真实历史。整顿队伍后重来一次，本关进度尚未计入征程。</p>
          <div class="defeat-actions">
            <button type="button" class="defeat-btn defeat-retry" id="defeatRetryBtn">重试本关</button>
            <button type="button" class="defeat-btn defeat-back" id="defeatBackBtn">返回长征路线</button>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
      // 点击遮罩不关闭：失败态必须由玩家显式选择，避免误触跳过
      panel.addEventListener('click', (e) => {
        if (e.target === panel) {
          const card = panel.querySelector('.defeat-card');
          card?.classList.remove('defeat-shake');
          void card?.offsetWidth;
          card?.classList.add('defeat-shake');
        }
      });
    }
    this.defeatPanel = panel;

    const titleEl = panel.querySelector('#defeatTitle');
    if (titleEl) titleEl.textContent = `${nodeName} · 行动失利`;

    const reasonEl = panel.querySelector('#defeatReason');
    if (reasonEl) {
      const summary = reportData && (reportData.summary || reportData.narrative);
      reasonEl.textContent = summary
        ? String(summary).split('\n')[0]
        : `队伍在${nodeName}未能突破，任务中断。牺牲者的名字留在队伍名册上。`;
    }

    const statsEl = panel.querySelector('#defeatStats');
    if (statsEl) {
      const res = GameState.resources || {};
      const rows = [
        ['剩余兵力', `${Math.round(res.troops ?? 0)}`],
        ['士气', `${Math.round(res.morale ?? 0)}`],
        ['本关伤亡', `${casualty} 人`],
        ['征程进度', '本关未完成']
      ];
      statsEl.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    }

    const retryBtn = panel.querySelector('#defeatRetryBtn');
    if (retryBtn) retryBtn.onclick = () => this.resetLevel();
    const backBtn = panel.querySelector('#defeatBackBtn');
    if (backBtn) backBtn.onclick = () => {
      this._hideDefeatPanel();
      this._clearLevelState();
      if (typeof GameUI !== 'undefined' && GameUI.switchRoute) {
        this.switchRoute('map');
      }
    };

    panel.classList.add('open');
    setTimeout(() => retryBtn?.focus(), 60);
  },
_hideDefeatPanel() {
    const panel = document.getElementById('defeatOverlay');
    if (panel) panel.classList.remove('open');
  },
_clearLevelState() {
    this.qteActive = false;
    this.qteCompletedLocked = false;
    this.qteDeadLocked = false;
    this.qteCurrentNode = null;
    this.qtePlayerDecisions = [];
    this.qteProgress = 0;
    this.qteClickCount = 0;
    this.commandCurrentNode = null;
    this.commandFreeCommands = [];
    this.commandParseData = null;
    this.settlementCurrentNode = null;
    this.settlementCompareData = null;
    this.settlementReportData = null;
    this.isPlayerDead = false;
    this.isGameOver = false;
    document.getElementById('qteOverlay')?.classList.remove('open', 'qte-defeated');
    document.getElementById('settlementOverlay')?.classList.remove('open');
    document.getElementById('archiveOverlay')?.classList.remove('open');
    document.getElementById('telegramOverlay')?.classList.remove('open');
  },
resetLevel() {
    const snap = this._levelStartSnapshot;
    const node = (snap && snap.node) || this.settlementCurrentNode || null;
    this._clearQteTimers();
    clearInterval(this.telegramTypewriterTimer);
    this.stopTelegramSound();
    this._hideDefeatPanel();
    this._hideSettlementLoading();
    this.settlementSession = (this.settlementSession || 0) + 1;
    clearTimeout(this.settlementRequestTimer);

    if (!node) {
      this.showToast('找不到本关起点，已返回长征路线');
      this._clearLevelState();
      return;
    }

    // 1. 资源回溯到进入本关之前（重试不是惩罚叠加，也不是免费补给）
    if (snap && snap.resources) {
      Object.keys(snap.resources).forEach(key => {
        GameState.resources[key] = snap.resources[key];
      });
    }
    if (snap && typeof snap.stamina === 'number') GameState.stamina = snap.stamina;
    if (typeof GameState.save === 'function') GameState.save();

    // 2. 清空关卡内所有即时状态（必须先清，再回填指令，否则会被一起清掉）
    this._clearLevelState();
    this.qteProgress = 0;
    this.qteBloodLevel = 0;
    this.qteClimbRate = 0;
    this.qteLastClickTime = 0;
    this.qteRound = 1;

    // 3. 恢复指挥所指令，保证重试时沿用同一套决策，无需重新输入
    this.commandFreeCommands = snap && snap.commands ? snap.commands.slice() : [];
    this.commandParseData = snap && snap.commandParse ? JSON.parse(JSON.stringify(snap.commandParse)) : null;
    this.commandCurrentNode = node;

    const progressEl = document.getElementById('qteProgress');
    if (progressEl) progressEl.style.width = '0%';
    const bloodEl = document.getElementById('qteBlood');
    if (bloodEl) bloodEl.style.opacity = '0';
    const resultEl = document.getElementById('qteResult');
    if (resultEl) { resultEl.classList.remove('show'); resultEl.textContent = ''; }
    const qteBtn = document.getElementById('qteClimbBtn');
    if (qteBtn) { qteBtn.disabled = false; qteBtn.classList.remove('qte-dead'); }
    const soldierEl = document.getElementById('qteSoldier');
    if (soldierEl) {
      soldierEl.dataset.animState = 'idle';
      soldierEl.className = 'qte-soldier anim-idle';
      soldierEl.style.setProperty('--anim-speed', 1.0);
    }
    if (typeof this.updateResourceHUD === 'function') this.updateResourceHUD();

    // 4. 直接重开本关 QTE（同一节点、同一指令），不走"解锁下一关"
    this.showToast(`${node.name} · 重新整队，再来一次`);
    this.startQTE(node, this.commandParseData);
  }
};
