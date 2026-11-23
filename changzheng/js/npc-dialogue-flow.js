/* Eight sequential choices per script; only real option clicks advance the gate. */
const NpcDialogueFlow={
  required:8,key:'changzheng_npc_dialogue_v1',records:{},
  topics:{
    1:[['携行清点','先按类别核对物资','再登记缺项，不能用估数顶替清点'],['负重分配','按各人的承受能力分组携行','重物互相搭手，不把全部物资交给一个人'],['队列联络','确认前后组的联络方式','离队或掉队及时报告，不独自追赶'],['渡口配合','听从渡口已有的安排','不拥挤抢行，不擅自改变渡运顺序'],['同伴互助','留意身边同志的行装和状态','需要帮忙就招呼同伴，一起处理']],
    2:[['有限情报','区分亲眼所见与转述的情况','不把未经核实的消息当成敌情定论'],['掩护分工','确认本组接到的掩护与转移任务','不能擅自调动其他部队'],['照料安排','向卫生人员报告需要照料的情况','不编造伤情，也不许诺所有人都能立即转运'],['携行取舍','核对现有运力与携行负担','保留必要物资，困难如实报告'],['转移衔接','确认联络信号和接应关系','情况变化先报告，不独自冲出去']],
    3:[['资料整理','把日期、地点和来源分开登记','存疑材料另放，不能补写不存在的记录'],['信息核验','比对材料之间的矛盾','分清史料与自己的猜测'],['基层保障','核对值守、传递和照料安排','这些属于基层协作，不代替会议决策'],['传递纪律','只传递确认过的任务内容','不替历史人物编造发言'],['会后学习','从有出处的档案了解会议','玩家安排不能改写真实会议结论']],
    4:[['观察通道','记录观察位置与消息来源','未查明的通道不能直接当成安全路线'],['联络顺序','先核对侦察与接应的衔接','不能只顾移动而丢掉联络'],['渡运调度','按现有运力商量携行顺序','先确认条件，不保证一趟全部运走'],['信息变化','留意模拟对手对重复行动的反应','这是虚构推演，不冒充真实敌军密电'],['接应核验','核对接应点与联络信号','未确认接应前，不把预定地点当成已到达']],
    5:[['渡口条件','核对渡船和岸上等候的情况','不凭江面景象推定实际运力'],['携行次序','按任务需要讨论分批携行','各组依安排等候，不拥挤争抢'],['船工配合','先听船工说明现有条件','不让单人承担超出能力的搬运'],['夜间联络','确认暗处的联络与应答方式','信号不明时先核实'],['岸上接应','清点已交接和待交接的物资','没有交接记录就不报已经完成']],
    6:[['岸边准备','核对本组岸边协作的职责','不把所有岗位都当成突击队'],['渡运条件','向负责渡运的同志核对船只条件','不擅自许诺渡河时间'],['协作分工','商量搬运、照料和联络的衔接','让每个人知道自己负责哪一项'],['反馈传递','将看到的变化及时报告','观察和判断分开说'],['接应清点','核对本组接收的人物资与消息','未确认的不算已经接应完成']],
    7:[['桥面观察','先看清铁索、通行与桥头条件','不把艺术场景当成测绘记录'],['岗位分工','区分攀索、联络和后续照料','后勤与卫生岗位不被一律安排冲锋'],['行动配合','确认谁负责传令和互相照应','不靠一个人承担全部任务'],['体力与安全','说明自身状态并请求必要协助','不能用鼓励代替实际帮助'],['桥后照料','按报告核对需要接应的事项','不在战报前编造伤亡和胜负']],
    8:[['被服负重','核对保暖物品与携行负担','不是把所有被服都交给同一个人'],['步行节奏','商量同伴之间的照应与休整','体力下降要报告，不以逞强代替配合'],['相互照料','留意战友是否需要帮助','不凭一段对话作伤情诊断'],['联络失散','确认前后组的联络办法','失去联系时报告，不自行宣布有人牺牲'],['下山衔接','核对交接、休整和物资清点','未到达前不说已经安全下山']],
    9:[['口粮饮水','先核对真实可用的补给','不把不明水源说成可以安全饮用'],['脚下路况','观察泥泞与落脚条件','不能凭远处景象判断整条路线安全'],['互助办法','先稳住自身再呼应同伴协助','不把单人冒险当成唯一救助办法'],['寻路联络','记录方向与联络标记','不擅自离开队伍远走'],['宿营分享','结合现有份额商量照料安排','不把耗尽全部口粮设成必然正确的选择']],
    10:[['抵近观察','区分已观察到的山口与未知通道','不把推测写成已经探明的地形'],['任务分工','核对本组侦察、联络或照料职责','不替全军下达命令'],['攀爬准备','核对落脚条件与协作办法','先说明困难，再商量如何配合'],['传令核验','复核收到的任务内容','听不清就问，不随意转述'],['行动整理','记录本组完成与待核对的事项','不把预定结果当成已经发生']],
    11:[['到达核验','根据本组记录核对到达与交接','不把艺术场景当成抵达证明'],['当地接洽','说明来意并尊重当地群众','不能把群众物资当成随意取用的补给'],['安置照料','核对休整与照料的实际需要','未登记的情况先了解再报告'],['队伍整顿','整理行装、登记和联络事项','不用空泛口号代替清点'],['阶段回顾','分清本组经历与真实长征史实','1935年到达陕北不等于1936年三大主力会师']],
    12:[['时间转场','先核对本章时间和背景','1935年陕北落脚与1936年会师分开理解'],['接应安排','核对来向、联络和交接事项','不把不同部队的行程混为一条'],['材料对照','将两地资料按来源分别整理','不替史料填补未经证实的细节'],['保障协作','按实际条件讨论休整与携行','不让单个战友承担所有保障'],['相识与重逢','先了解对方是否有共同经历','没有记录就按初次见面交谈，不编造重逢']]
  },
  load(){try{const raw=JSON.parse(localStorage.getItem(this.key)||'{}');this.records=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};}catch{this.records={};}},
  id(script,role){return `${script.id}:${role}`;},
  turns(script,role){const rows=this.records[this.id(script,role)];return Array.isArray(rows)?rows.slice(0,8):[];},
  count(script,role){return this.turns(script,role).length;},
  options(script,role,npcId){
    const step=this.count(script,role);if(step>=8)return [];
    if(typeof StoryConsequences!=='undefined'){const choices=StoryConsequences.options(script,role,step);if(choices)return choices;}
    if(step===0){const jobs={logistics:['清点与分担携行','核对缺项、记录和交接，搬运时与同伴分担'],medic:['照料与卫生协作','核对用品与照料安排，有异常先报告'],commander:['本连组织与联络','核对分工和衔接，不越权指挥全军'],soldier:['个人准备与战友互助','检查行装，听清任务，互相照应']}[role]||['本组协作','核对眼前任务'];return [{label:`我先确认自己的${jobs[0]}职责。`,reply:`好，你负责${jobs[1]}。这一段是“${script.title}”，先把自己能承担的事说清楚。`},{label:'我想先听清任务，再分担具体工作。',reply:`可以，先听清“${script.title}”的安排，再核对岗位。不能让一个人包办整组的事。`}];}
    if(step===1){const partner={commander:'he_wen',logistics:'logistics_1',medic:'medic_1',soldier:'wang_gui'}[role];const rows=(script.responses||[]).filter(l=>(l.npcId===npcId||(l.npcId==='role_partner'&&partner===npcId))&&['comfort','fear','support','clarify'].includes(l.intent)&&NpcStoryCore.allowed({...l,npcId},{npcId}));const labels={comfort:'我们互相照应，有困难一起说。',fear:'我心里还有些担忧，想再商量一下。',support:'这一步需要我怎样搭手？',clarify:'我们先核对不确定的地方。'};if(rows.length>=2)return rows.slice(0,3).map(l=>({label:/家里|惦记家/.test(l.text)?'离家出发，我有些惦记家里。':labels[l.intent],reply:NpcStoryCore.say(l,{role})}));return [{label:'我愿意配合，也想先问清困难。',reply:'愿意配合很好，拿不准的地方要说出来。我们先把困难和需要协助的事逐项核对。'},{label:'我有些担忧，想确认能向谁求助。',reply:'不用独自硬撑。先找岗位搭档核对，解决不了的情况再向负责的同志报告。'}];}
    if(step===7){const selected=this.turns(script,role).slice(0,7).map(t=>t.label);return [{label:'我把刚才商量的安排复述一遍，再执行任务。',reply:`刚才你提出“${selected[0]}”，也逐项商量了配合办法。现在按任务页面核对条件再行动；对话不代表任务已经完成。`},{label:'分工和联络已听清，遇到变化我会先报告。',reply:'好，准备交谈到这里。行动中仍要按实际情况核对，有变化就沟通；结果等任务执行后再清点。'}];}
    const topics=this.topics[script.nodeId]||this.topics[1];const [topic,action,limit]=topics[Math.max(0,step-2)]||topics[0];
    return [{label:`${action}。`,reply:`就按这个方向准备：${action}。还要记住，${limit}。`},{label:`关于${topic}，我想先把不确定的地方问清。`,reply:`问清再安排。我们先核对${topic}的现有条件，${limit}。你可以把拿不准的地方交给负责的同志一起确认。`}];
  },
  choose(script,role,npcId,index,expected){const count=this.count(script,role);if(expected!==count||!Number.isInteger(index)||index<0)return null;const option=this.options(script,role,npcId)[index];if(!option)return null;const turns=this.turns(script,role);turns.push({...option,npcId,round:count+1});this.records[this.id(script,role)]=turns;try{localStorage.setItem(this.key,JSON.stringify(this.records));}catch{}return option;},
  undo(script,role){const turns=this.turns(script,role);if(!turns.length)return false;turns.pop();this.records[this.id(script,role)]=turns;try{localStorage.setItem(this.key,JSON.stringify(this.records));}catch{}return true;},
  clear(){this.records={};try{localStorage.removeItem(this.key);}catch{}}
};
