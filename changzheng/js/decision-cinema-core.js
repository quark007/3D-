/* Match an actual uploaded clip, constrained by chapter before interpreting intent. */
const DecisionCinemaCore={
  termCache:new Map(),
  acceptsTerms(terms,command){if(!terms)return true;if(typeof terms!=='string'||terms.length>240)return false;let pattern=this.termCache.get(terms);if(pattern===undefined){try{const plain=terms.replace(/\.\{0,(\d{1,2})\}/g,(all,n)=>Number(n)<=12?'':all);if(/[\\.^$*+?()[\]{}]/.test(plain))return false;pattern=new RegExp(terms);}catch{pattern=null;}if(this.termCache.size>=128)this.termCache.delete(this.termCache.keys().next().value);this.termCache.set(terms,pattern);}return !!pattern&&pattern.test(String(command).slice(0,2000));},
  identity(a){return String(a.shotId||a.title.replace(/[_\s·\d]+$/,''));},
  sceneShots:{1:[1,2,3],2:[5,8],3:[9,10,124],4:[11,12],5:[13],6:[15,16],7:[17,18,21],8:[19,70,72],9:[20,41,47],10:[89],11:[61,62],12:[153,154,140]},
  fixed(catalog,nodeId,text,options={}){
    const aliases={scout:'侦察',intel:'核验情报',cover:'掩护联络',collective:'集体研判',move:'机动转移',mobility:'机动转移',feint:'联络佯动',rest:'休整',direct:'正面冲锋'};
    const normalized=String(text).replace(/\b(scout|intel|cover|collective|move|mobility|feint|rest|direct)\b/g,key=>aliases[key]);
    const semantic=this.match(catalog,nodeId,normalized,{...options,requirePrimary:true});
    if(semantic.clips.length)return {...semantic,clips:semantic.clips.slice(0,options.kind==='fixed_dialogue'?1:3),mode:'fixed',reason:'固定剧情与行动对应素材。'};
    if(options.kind!=='fixed_dialogue'||semantic.intents.length)return {...semantic,mode:'fixed'};
    const node=Number(nodeId),shots=this.sceneShots[node]||[],actions=this.rules.map(([intent])=>intent),assets=(catalog.assets||[]).filter(a=>a.source_kind!=='diagram'&&a.eligible&&!a.library_only&&(!a.allowed_roles||a.allowed_roles.includes(options.role||"soldier"))&&a.nodes.includes(node)&&(a.neutral_environment||!a.tags.some(tag=>actions.includes(tag))));
    const sequence=[...shots.map(id=>assets.find(a=>a.shotId===id)).filter(Boolean),...assets.filter(a=>a.neutral_environment)];
    const chosen=sequence[(Number(options.round||0)+Number(options.part||0))%Math.max(1,sequence.length)];
    const clip=chosen&&!options.recent?.includes(this.identity(chosen))?chosen:sequence.find(a=>!options.recent?.includes(this.identity(a)))||chosen;
    return {clips:clip?[clip]:[],mode:'fixed',reason:clip?'本段没有动作特写，展示当前章节中性环境，未表示玩家已执行行动。':'本章没有贴合这段对白的中性环境映像，继续当前剧情。'};
  },
  rules:[['recon',/侦察|探查|观察|核验|核实|核对|望远镜|地图|摸清|看清|探明|查明|打探|敌情/],['help',/互助|照料|照顾|救护|救助|分担|扶|拉起|拉一把|照应|分享|分给|搭把手|帮.{0,4}背/],['supply',/清点|物资|补给|口粮|饮水|干粮|负重|携行|粮食|食物|喝水|行囊/],['signal',/联络|电报|传令|文件|资料|来源|分工|集体研判|会议|讨论|汇报|报告|通信|传话|联系|史料/],['bridge',/攀索|攀爬|铁索|桥头|过桥|铁链|桥板/],['cross',/渡河|渡江|渡口|渡运|船只|划桨|撑船|过江|过河|登船|乘船/],['rest',/休整|休息|扎营|宿营|取暖|歇一歇|歇会|歇脚|保暖|疲惫|累了|想家|害怕/],['move',/转移|机动|前进|行军|行进|出发|赶路|迂回|探路|绕行|继续走|慢行|撤离/],['combat',/强攻|冲锋|射击|开火|机枪|火力压制|火力掩护|炮击|突击|进攻/]],
  profile(command){
    const text=String(command||'').replace(/核对(?=物资|口粮|粮食|饮水|补给)/g,'清点').replace(/(?:核对|核实|核验)(?=联络|信号|电报|分工|交接|接应|任务内容)/g,'确认'),active=[],denied=[];
    for(const [key,pattern] of this.rules){let first=Infinity,negative=false;for(const m of text.matchAll(new RegExp(pattern.source,'g'))){const prefix=text.slice(0,m.index).split(/[，。；！？,;!?\n]/).at(-1).slice(-16).replace(/ /g,'');const neg=/(?:不要|不再|不得|避免|别|勿|停止|取消|禁止|不能|不必|无需|拒绝|不)(?:盲目|直接|正面|继续|再|贸然|进行|实施|随意|去|让人|让|做)*$/.test(prefix)&&!['害怕','想家'].includes(m[0]);if(neg)negative=true;else first=Math.min(first,m.index);}if(Number.isFinite(first))active.push({key,index:first});else if(negative)denied.push(key);}
    return {intents:active.sort((a,b)=>a.index-b.index).map(a=>a.key),denied};
  },
  intents(command){return this.profile(command).intents;},
  focusCompatible(asset,text){const focus=asset.semantic_focus;if(/救护|伤员|转运|照料|卫生/.test(text)&&asset.tags.includes('help')&&focus!=='care'&&!/担架|包扎|卫生员|救护/.test(asset.title))return false;if(asset.tags.includes('supply')&&/口粮|干粮|分粮|食物/.test(text)&&!/饮水|水壶|喝水/.test(text)&&focus!=='supply'&&!/口粮|干粮|粮食|粮袋/.test(asset.title))return false;if(focus==='water'&&/照料|救护|搀扶|拉起|伤员|转运|负重|分担/.test(text))return false;if(focus==='help'&&/救护|伤员|转运|照料/.test(text))return false;if(focus==='care'&&!/救护|伤员|转运|照料|照应|卫生/.test(text))return false;return true;},
  preferred(node){return {recon:[123,173],help:[131,132,43],supply:[127],signal:node===3?[10,173,172,130]:[173,172,166],bridge:[21,24,26,28],cross:node===1?[3,1]:node===4?[11,12]:node===5?[13]:[15,16,79],rest:[139,140,146,73],move:node===8?[70,72,67]:node===9?[41,47]:[153,61,62,3],combat:[107,115,113]};},
  match(catalog,nodeId,command,{role='soldier',requirePrimary=false,recent=[]}={}){
    const node=Number(nodeId),query=this.profile(command),intents=[...new Set(query.intents.map(t=>node===3&&t==='recon'?'signal':node===10&&t==='bridge'&&!/铁索|铁链|桥/.test(command)?'climb':t))],assets=(catalog.assets||[]).filter(a=>a.source_kind!=='diagram'&&a.eligible&&!a.library_only&&(!a.allowed_roles||a.allowed_roles.includes(role))&&a.nodes.includes(node)&&this.acceptsTerms(a.match_terms,command)&&this.focusCompatible(a,command)&&!a.tags.some(t=>query.denied.includes(t))&&(!a.tags.includes('combat')||intents.includes('combat'))&&(!['logistics','medic'].includes(role)||!/扣动扳机|拉枪栓|推.{0,3}上膛|第一人称.{0,8}(枪|射击)|换弹匣/.test(a.title)));
    if(!intents.length)return {clips:[],intents,reason:'请先提出具体行动，才能匹配相应的剧情映像。'};
    if(/无人机|卫星|手机|原子弹|直升机|互联网/.test(command))return {clips:[],intents,reason:'这条方案超出当前历史任务条件，未匹配剧情视频。'};
    if(intents.includes('combat')&&![2,4,6,7,10].includes(node))return {clips:[],intents,reason:'当前章节没有与该战斗指令相符的剧情映像，请按本章任务重新安排。'};
    const clips=[],seen=new Set(),preferred=this.preferred(node);
    for(const intent of intents){
      if(intent==='bridge'&&node!==7){if(requirePrimary&&intent===intents[0])return {clips:[],intents,reason:'本章没有与首要行动相符的剧情映像，继续当前任务。',role};continue;}
      let candidates=assets.filter(a=>a.tags.includes(intent)&&(intent!=='rest'||!a.tags.includes('combat')));if(intent==='help'&&/救护|伤员|转运|照料|卫生/.test(command)&&candidates.some(a=>a.semantic_focus==='care'))candidates=candidates.filter(a=>a.semantic_focus==='care');
      const ids=preferred[intent]||[];candidates.sort((a,b)=>{
        const score=a=>(ids.includes(a.shotId)?100-ids.indexOf(a.shotId):0)+(a.semantic_focus==='care'&&/救护|伤员|转运|照料|卫生/.test(command)?130:0)+(a.match_priority||0)+(a.module!==8?8:0)-(a.source_kind==='diagram'?6:0)-(/_\d+\.mp4$/.test(a.file)?2:0)-(recent.includes(this.identity(a))?500:0);
        return score(b)-score(a)||a.id.localeCompare(b.id);
      });
      const clip=candidates.find(a=>!seen.has(this.identity(a)));if(!clip){if(requirePrimary&&intent===intents[0])return {clips:[],intents,reason:'本章没有与首要行动相符的剧情映像，继续当前任务。',role};continue;}seen.add(this.identity(clip));clips.push({...clip,intent});if(clips.length>=3)break;
    }
    return {clips,intents,reason:clips.length?'根据当前章节和你提出的行动匹配场景素材。':'现有素材没有与这条行动相符的场景，保留当前任务继续操作。',role};
  }
};
