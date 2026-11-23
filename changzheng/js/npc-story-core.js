/* Script selection only. Authored director notes never become executable rules. */
const NpcStoryCore={
  scenes:{1:'ruijin',2:'xiangjiang',3:'zunyi',4:'chishui',5:'jinsha',6:'dadu',7:'luding',8:'snowmount',9:'grassland',10:'lazikou',11:'wuqi',12:'huining'},
  names:{wang_gui:'老班长王贵',chen_xiaoman:'青年战士陈小满',he_wen:'指导员何文',narrator:'解说旁白',logistics_1:'后勤协作员',medic_1:'卫生员',liaison_1:'交通联络员',boatman_1:'船工',civilian_1:'送行群众',guide_1:'向导',enemy_messenger:'敌方传令兵',new_comrade:'新队伍战友'},
  intent(text){const rules=[['history',/历史|史实|哪年|哪一天|以后|后来|会议结论/],['anachronism',/无人机|卫星|手机|GPS|互联网|直升机/],['boundary',/改变会议|更改历史|调遣毛|命令朱德|指挥全军/],['unclear',/^[？?！!。\s]+$/],['support',/帮你|扶你|救你|分担|抬|照料|帮忙|援助/],['comfort',/加油|谢谢|放心|鼓励|别怕|安慰|相信你/],['fear',/害怕|恐惧|犹豫|累|疲惫|撑不住/],['disagree',/不同意|拒绝|不想|不合理|不愿/],['plan',/先.+再|计划|方案|准备|安排|负责|分工/],['clarify',/核实|拿不准|不确定|补充|真假|存疑/],['status',/情况|现在|任务|怎么样|在哪里|需要什么/]];return rules.find(([,re])=>re.test(text))?.[0]||'other';},
  allowed(line,context={}){
    if(line.npcId==='narrator'&&context.npcId!=='narrator')return false;
    const text=line.text||'',flags=line.guards||[];
    // Authored fixed quantities, injury and outcome claims require structured game evidence.
    if(flags.includes('quantity')||flags.includes('state')||flags.includes('conditional'))return false;
    if(/你没|你漏|未写|没有写/.test(text)&&/联络|照顾|照料|分工/.test(context.command||''))return false;
    return true;
  },
  say(line,context={}){let text=line.text||'';const call={commander:'连长',logistics:'后勤同志',soldier:'同志',medic:'卫生员'}[context.role]||'同志';text=text.replace(/（依岗位称）|\(依岗位称\)/g,call);return text.replace(/（[^）]*）/g,'').trim();},
  practicalReply(message,context={}){
    if(/(全部|所有|全都|全).{0,8}(物资|东西).{0,8}(你|一人|一个人).{0,5}背|你.{0,6}(背|扛).{0,6}(全部|所有)|全背/.test(message))return '我可以分担一部分，但一个人背不动全部物资。先清点轻重和各人的负重，再分组携行；你也一起核对，重的我们搭手。';
    if(/^(好的?|行|明白了?|收到|知道了|嗯|可以)[。！!\s]*$/.test(message))return context.taskHint?`好。${context.taskHint}`:({logistics:'好，先一起清点，再按各人的负重分配携行。发现缺项及时报告，需要别人搭手就提出来。',medic:'好，先核对随身药品和照料安排，需要协助就招呼战友。',commander:'好，先把本连的分组和联络核对清楚，有情况再及时报告。',soldier:'好，先检查自己的行装，再和身边的战友互相照应。'})[context.role]||'好，我们先把眼前的准备核对清楚，再按安排配合。';
    return null;
  },
  participants(script,role='soldier'){
    const set=new Set();for(const section of ['opening','responses','fallback','closing'])for(const line of script[section]||[])if(this.names[line.npcId])set.add(line.npcId);
    const raw=(script.metadata.npc||[]).join(' ');for(const [name,id] of [['王贵','wang_gui'],['陈小满','chen_xiaoman'],['何文','he_wen'],['后勤协作员','logistics_1'],['卫生员','medic_1'],['交通员','liaison_1'],['联络员','liaison_1'],['船工','boatman_1'],['群众','civilian_1'],['向导','guide_1']])if(raw.includes(name))set.add(id);
    if(raw.includes('岗位搭档'))set.add(({commander:'he_wen',logistics:'logistics_1',medic:'medic_1',soldier:'wang_gui'})[role]);
    return [...set];
  },
  select(script,npcId,message,context={}){
    const practical=this.practicalReply(message,context);if(practical)return {text:practical,intent:'practical',source:script.id};
    const partner=({commander:'he_wen',logistics:'logistics_1',medic:'medic_1',soldier:'wang_gui'})[context.role];
    if(partner===npcId)script={...script,...Object.fromEntries(['responses','fallback'].map(k=>[k,(script[k]||[]).map(l=>l.npcId==='role_partner'?{...l,npcId}:l)]))};
    const intent=this.intent(message),safe={...context,npcId},rows=(script.responses||[]).filter(line=>line.npcId===npcId&&line.intent===intent&&this.allowed(line,safe));
    if(/先.+再|计划|方案|安排|分工/.test(message))return {text:`我听到你的安排：“${String(message).slice(0,85)}”。我们再核对现有物资、分工和联络；执行结果还要看任务记录。`,intent:'plan',source:script.id};
    if(rows.length)return {text:this.say(rows[0],safe),intent,source:script.id};
    if(['history','anachronism','boundary','unclear'].includes(intent))return {text:{history:'这个问题请到带有来源的历史档案核对；我只谈当前能知道的任务。',anachronism:'眼下没有这样的装备条件。用现有物资，你准备怎样配合？',boundary:'我们只安排眼前的基层协作，不改变真实历史进程。',unclear:'你想问刚才哪一步？说明白些，我们再商量。'}[intent],intent,source:script.id};
    if(intent==='plan')return {text:`我听到你的安排：“${String(message).slice(0,85)}”。我们再核对现有物资、分工和联络；执行结果还要看任务记录。`,intent,source:script.id};
    if(intent==='other')return {text:`你说“${String(message).slice(0,65)}”，是想了解当前任务，还是商量怎样互相照应？`,intent,source:script.id};
    const fallback=(script.fallback||[]).find(line=>line.npcId===npcId&&this.allowed(line,safe));return {text:fallback?this.say(fallback,safe):'先说眼前的任务。需要哪一项帮助，你指给我。',intent,source:script.id};
  },
  opening(script,npcId,context={}){
    const partner=({commander:'he_wen',logistics:'logistics_1',medic:'medic_1',soldier:'wang_gui'})[context.role];
    if(partner===npcId)script={...script,opening:(script.opening||[]).map(l=>l.npcId==='role_partner'?{...l,npcId}:l)};
    const roleLine=(script.roles?.[context.role]||[]).find(l=>l.npcId===npcId&&this.allowed(l,{...context,npcId}));
    const rows=(script.opening||[]).filter(l=>l.npcId===npcId&&this.allowed(l,{...context,npcId}));
    if(roleLine)rows.push(roleLine);
    const parts=rows.filter(l=>!l.echo).map(l=>this.say(l,context));
    // Echo rows: authored conditional recall lines. Hit + unshown → prepend hint prefix; no record or already shown → silently degrade.
    for(const line of rows.filter(l=>l.echo)){
      if(!this.echoes.hit(line.echo,context.role))continue;
      const shownKey=script.id+':'+line.echo;
      if(this.echoes.state()?.shown[shownKey])continue;
      this.echoes.markShown(shownKey);
      parts.push((line.echoHint||'（他还记得你说过的话）')+this.say(line,context));
    }
    if(parts.length)return parts.join('\n');
    const fallback=(script.fallback||[]).find(l=>l.npcId===npcId&&this.allowed(l,{...context,npcId}));return fallback?this.say(fallback,context):'同志，我们先说当前这组任务。你有什么打算？';
  },
  /* 跨站回响（echoes）：从 npc_dialogue_v1 的结构化分支（effect.kind）与 storyPreparations 决策行
     提取"玩家在先前站点的关键选择"，守卫式写入 GameState.storyPreparations.echoes
     （{version:1, byNode:{'源节点id':[kind...]}, shown:{'剧本id:回响键':true}}）。
     旧存档无该字段不崩、坏字段降级重建；同一回响一次旅程只触发一次。确定性脚本台词，不调 LLM。 */
  echoes:{
    state(){
      if(typeof GameState==='undefined'||!GameState)return null;
      const sp=GameState.storyPreparations;
      if(!sp||typeof sp!=='object'||Array.isArray(sp))GameState.storyPreparations={};
      let s=GameState.storyPreparations.echoes;
      const ok=s&&typeof s==='object'&&!Array.isArray(s)&&s.version===1&&s.byNode&&typeof s.byNode==='object'&&!Array.isArray(s.byNode)&&s.shown&&typeof s.shown==='object'&&!Array.isArray(s.shown);
      if(!ok)s={version:1,byNode:{},shown:{}};
      const byNode={};for(const [k,v] of Object.entries(s.byNode||{}))if(/^[0-9]+$/.test(k)&&Array.isArray(v))byNode[k]=[...new Set(v.filter(x=>typeof x==='string'&&/^[a-z]+$/.test(x)))].sort();
      const shown={};for(const [k,v] of Object.entries(s.shown||{}))if(typeof k==='string'&&k.length>=1&&k.length<=64&&v)shown[k]=true;
      s={version:1,byNode,shown};GameState.storyPreparations.echoes=s;return s;
    },
    refresh(role){
      const s=this.state();if(!s)return;
      const r=role||(typeof NpcStory!=='undefined'&&NpcStory.role&&NpcStory.role())||GameState.character?.id||'soldier';
      const kinds={};
      if(typeof NpcDialogueFlow!=='undefined'&&NpcDialogueFlow.turns){
        for(let n=1;n<=12;n++){
          const script=(typeof NpcStory!=='undefined'&&NpcStory.get)?NpcStory.get(n,1):null;
          const row={id:script?script.id:`${String(n).padStart(2,'0')}-01`,nodeId:n,part:1};
          for(const t of NpcDialogueFlow.turns(row,r)){const k=t&&t.effect&&t.effect.kind;if(typeof k==='string'&&/^[a-z]+$/.test(k))(kinds[n]??=[]).push(k);}
        }
      }
      if(typeof StoryConsequences!=='undefined'&&StoryConsequences.row){
        for(let n=1;n<=12;n++){const row=StoryConsequences.row(n);if(!row)continue;const arr=kinds[n]??=[];
          for(const c of row.choices||[])if(c&&typeof c.kind==='string'&&/^[a-z]+$/.test(c.kind))arr.push(c.kind);
          if(row.verified)arr.push('verify');if(row.coordination)arr.push('signal');if(row.reserved>0)arr.push('reserve');
          if(row.handover==='delivered')arr.push('delivered');if(row.handover==='changed')arr.push('changed');}
      }
      for(const k of Object.keys(kinds))kinds[k]=[...new Set(kinds[k])].sort();
      const before=JSON.stringify(s.byNode);
      s.byNode=Object.fromEntries(Object.entries(kinds).filter(([,v])=>v.length));
      if(typeof GameState!=='undefined'&&JSON.stringify(s.byNode)!==before){try{GameState.save();}catch{}}
    },
    hit(key,role){
      if(typeof key!=='string')return false;
      const m=/^(\d{1,2})-([a-z]+)$/.exec(key);if(!m||typeof GameState==='undefined'||!GameState)return false;
      this.refresh(role);
      return ((this.state()?.byNode||{})[String(Number(m[1]))]||[]).includes(m[2]);
    },
    markShown(shownKey){
      const s=this.state();if(!s||s.shown[shownKey])return;
      s.shown[shownKey]=true;
      if(typeof GameState!=='undefined'&&GameState){try{GameState.save();}catch{}}
    }
  }
};
