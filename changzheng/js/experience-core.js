/* Event-sourced fictional experience. No model output can rewrite resources or history. */
const ExperienceCore={
  battleNodes:[2,4,5,6,7,10],
  empty(){return {version:1,decisions:[],telegrams:[],memories:[],bonds:{},seen:{},unlocked:false};},
  tactics(record){
    let text=String(record.command||'');
    text=text.replace(/(?:不要|避免|禁止|不再|放弃|停止|拒绝|不进行|不采用|不)(?:盲目|无脑|直接|继续|贸然|正面|任何|一味)*\s*(?:强攻|冲锋|突击|进攻|硬冲)/g,'');
    const ids=record.modules||[],has=(re,keys)=>re.test(text)||keys.some(k=>ids.includes(k));
    const direct=has(/强攻|冲锋|硬冲|正面突击/,['direct']),intel=has(/侦察|核验|观察|情报/,['intel','scout']),cover=has(/掩护|协同|联络|侧翼|分工/,['collective','cover']);
    return {direct,intel,cover,mobility:has(/转移|机动|迂回/,['mobility','move']),exposed:direct&&!intel&&!cover};
  },
  addDecision(state,entry){
    if(state.decisions.some(r=>r.id===entry.id))return null;
    const record={id:String(entry.id),phase:entry.phase||'committed',nodeId:entry.nodeId==='award-demo-zunyi'?3:Number(entry.nodeId),nodeName:String(entry.nodeName||'任务').slice(0,80),command:String(entry.command||'').slice(0,300),modules:(entry.modules||[]).map(String).slice(0,8),counter:String(entry.counter||'').slice(0,240),causalNodes:(entry.causalNodes||[]).slice(0,10),resourceDelta:entry.resourceDelta||{},timestamp:entry.timestamp||Date.now()};
    record.tactics=this.tactics(record);state.decisions.push(record);state.decisions=state.decisions.slice(-100);return record;
  },
  pattern(state){
    const battle=state.decisions.filter(r=>this.battleNodes.includes(r.nodeId)&&r.phase==='committed'),last=battle.slice(-3);
    if(last.length===3&&last.every(r=>r.tactics.exposed))return {key:'exposed-direct',label:'连续三次缺少核验与协同的强攻',evidence:last.map(r=>r.id),pressure:5,risk:6,text:'截获模拟密电：对方连续急进，尚未见到侦察与掩护配合。加强通道观察，保持纵深接应，防其突然改变行动方式。'};
    const previous=battle.slice(-3);if(previous.length>=2&&previous.every(r=>r.tactics.intel))return {key:'intel',label:'连续核验情报',evidence:previous.map(r=>r.id),pressure:2,risk:2,text:'截获模拟密电：对方重视情报核验，单一信号恐难奏效。加强观察，注意其核验后的机动。'};
    if(previous.length>=2&&previous.every(r=>r.tactics.mobility))return {key:'mobility',label:'连续机动转移',evidence:previous.map(r=>r.id),pressure:3,risk:3,text:'截获模拟密电：对方多次机动，需加强交通节点观察，不能仅追随一处动向。'};
    return null;
  },
  counter(state,record){const pattern=this.pattern(state);if(!pattern||!this.battleNodes.includes(Number(record.nodeId)))return {pressure:0,risk:0,evidence:[]};const t=this.tactics(record);const changed=pattern.key==='exposed-direct'?(t.intel&&t.cover):pattern.key==='intel'?t.mobility: t.intel&&t.cover;return {...pattern,pressure:changed?0:pattern.pressure,risk:changed?0:pattern.risk,adapted:!!changed};},
  addMemory(state,event){
    if(!event.id||state.memories.some(e=>e.id===event.id))return false;
    const row={id:String(event.id),npcId:event.npcId||'squad',nodeId:Number(event.nodeId),type:event.type,note:String(event.note||'').slice(0,150),delta:Math.max(-15,Math.min(10,Number(event.delta)||0)),timestamp:event.timestamp||Date.now()};
    state.memories.push(row);state.memories=state.memories.slice(-120);state.bonds[row.npcId]=Math.max(-50,Math.min(50,(state.bonds[row.npcId]||0)+row.delta));
    const care=state.memories.filter(e=>e.type==='support'&&e.delta>0);state.unlocked=state.unlocked||(new Set(care.map(e=>e.nodeId)).size>=3&&care.some(e=>e.nodeId===9));return true;
  },
  retrieve(state,npcId,query,nodeId){
    const map={commander_1:'wang_gui',commander_2:'chen_xiaoman',commander_3:'he_wen',commander_4:'narrator'},id=map[npcId]||npcId,words=String(query||'').match(/[\u4e00-\u9fff]{2}|[a-z]+/gi)||[];
    return state.memories.filter(e=>e.npcId===id||e.npcId==='squad').map((e,i)=>({e,score:(e.npcId===id?5:0)+(e.nodeId===Number(nodeId)?3:0)+words.filter(w=>e.note.includes(w)).length+i/1000})).sort((a,b)=>b.score-a.score).slice(0,6).map(x=>x.e);
  },
  alternatives(nodeId){return ({1:['重新分担携行','先核对联络'],2:['补充核验再转移','安排伤员接应'],3:['补核资料来源','调整递送顺序'],4:['先核验再机动','先联络再转移'],5:['调整渡运批次','增加岸上接应'],6:['核对渡河信号','调整岸上配合'],7:['加强联络与掩护','重新安排跟进保障'],8:['分担负重','组织互助休整'],9:['核验通道','保留余粮并互助'],10:['补充通道观察','完善行动联络'],11:['先安置体弱战友','复核物资清单'],12:['核对接应信息','调整保障顺序']})[Number(nodeId)]||['补充核验','调整协同'];}
};
