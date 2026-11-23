/* Campaign choices share existing player-scoped GameState storage. */
const Campaign55={
  read(){const s=CampaignCore55.normalize(GameState.storyPreparations?.campaign55);GameState.storyPreparations||={};GameState.storyPreparations.campaign55=s;return s;},
  save(s){GameState.storyPreparations.campaign55=s;GameState.save();},
  needsPlan(node){return !this.read().plans[node.id]?.committed;},
  grantReserve(node,amount){const s=this.read();if(s.reserveGrants[node])return;s.reserveGrants[node]=true;s.reserves=Math.min(6,s.reserves+Math.max(0,Math.min(4,Number(amount)||0)));this.save(s);},
  memory(){return this.read().history.slice(-3).map(r=>({nodeId:r.node,note:r.summary}));},
  difficulty(node){const s=this.read(),d=s.plans[node.id];return d?.committed&&!d.settled?Math.max(.75,1-CampaignCore55.quote(s,d).risk*.018):1;},
  settle(node){const s=this.read(),result=CampaignCore55.settle(s,node.id,GameState.resources,GameState.stamina);if(!result)return;GameState.stamina=result.stamina;this.save(s);GameState.recordStrategicDecision({nodeId:node.id,nodeName:node.name,command:result.row.summary,modules:[result.quote.intent],resourceDelta:result.delta,outcome:'教学协作完成',phase:'campaign',causalNodes:[{event:result.row.summary}],videoHandled:true});this.marker();},
  summary(node,host){if(!host)return;host.querySelector('.campaign-summary55')?.remove();const s=this.read(),d=s.plans[node.id];if(!d)return;const q=CampaignCore55.quote(s,d),note=document.createElement('p');note.className='campaign-summary55';note.textContent=`教学策略对照：${q.route}；${CampaignCore55.choices[d.choice].text}。预计额外体力 ${q.stamina}、补给 ${q.food}、士气 ${q.morale}，信息可信度变化 ${q.trust}。${d.settled?'已经记入本地因果账本。':'在确认完成本章时结算，不对应真实历史损耗。'}`;host.append(note);},
  marker(){
    const host=document.getElementById('mapWorld');if(!host||typeof GAME_NODES==='undefined')return;
    host.querySelector('.campaign-pursuer55')?.remove();const s=this.read();if(!s.history.length)return;
    const last=s.history.at(-1).node,current=GAME_NODES[Math.min(11,last)],prev=GAME_NODES[Math.max(0,last-1)],t=s.pressure/100;
    const mark=document.createElement('span');mark.className='campaign-pursuer55';mark.style.left=(prev.x+(current.x-prev.x)*t)+'%';mark.style.top=(prev.y+(current.y-prev.y)*t)+'%';mark.textContent='模拟追赶 '+s.pressure;mark.title='教学压力标记，不代表真实历史敌军位置';host.append(mark);
  },
  open(node,done){
    this.closeActive?.();const s=this.read(),draft=JSON.parse(JSON.stringify(s.plans[node.id]||CampaignCore55.draft(node.id))),owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null;
    const current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null);
    const overlay=document.createElement('div');overlay.className='learning-overlay open campaign55';overlay.id='campaign55';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',node.name+'策略部署');
    const panel=document.createElement('section');panel.className='campaign-panel55';overlay.append(panel);
    const heading=document.createElement('h2');heading.textContent=node.name+' · 协作部署';heading.tabIndex=-1;
    const intro=document.createElement('p');intro.textContent='这是虚构基层协作模拟。两条协作路径都可以完成任务，不改变真实历史结论。资源是体验单位，以下代价在本章完成时结算。';
    const board=document.createElement('div');board.className='campaign-board55';const feedback=document.createElement('p');feedback.className='campaign-feedback55';feedback.setAttribute('role','status');
    const status=document.createElement('p');status.setAttribute('aria-live','polite');
    const button=(label,run)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=run;return b;};
    const section=(name)=>{const area=document.createElement('section'),h=document.createElement('h3');h.textContent=name;area.append(h);board.append(area);return area;};
    const persist=()=>{if(!current()||draft.settled)return;const live=this.read();live.plans[node.id]=JSON.parse(JSON.stringify(draft));this.save(live);};
    const refresh=()=>{if(!current())return;const q=CampaignCore55.quote(s,draft);status.textContent=`额外筹备效果：体力 ${q.stamina>=0?'+':''}${q.stamina}，补给 ${q.food>=0?'+':''}${q.food}，士气 ${q.morale>=0?'+':''}${q.morale}；耗时 ${q.time} 单位，信息可信度 ${q.trust>=0?'+':''}${q.trust}。模拟额外阻力 ${q.risk}。已有预备 ${s.reserves}，本程完成再保留 ${q.banked}（总上限6）。`;panel.querySelectorAll('[data-group]').forEach(b=>{const active=String(draft[b.dataset.group])===b.dataset.value;b.setAttribute('aria-pressed',String(active));b.classList.toggle('selected',active);});persist();};
    const pick=(area,field,values)=>values.forEach(([value,label])=>{const b=button(label,()=>{if(draft.settled)return;draft[field]=value;refresh();});b.dataset.group=field;b.dataset.value=String(value);area.append(b);});
    const routes=section('一关两条协作路径');pick(routes,'route',CampaignCore55.routes[node.id-1].map((v,i)=>[i,v]));
    const pace=section('站间节奏与取舍');pick(pace,'pace',Object.entries(CampaignCore55.paces).map(([k,v])=>[k,v.label]));pick(pace,'choice',Object.entries(CampaignCore55.choices).map(([k,v])=>[k,v.text]));
    const intel=section('有限侦察 · 五条演练消息，核验两次，至少采用两条');
    const claims=['联络员记录的接应顺序','后勤清点表中的携行余量','前哨转述的近路通行情况','接应便条中的时间安排','路标与观察记录的对照'];
    const checks=[];
    claims.forEach((text,i)=>{const row=document.createElement('div');row.className='campaign-intel55';const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=draft.adopted.includes(i);input.disabled=draft.settled;input.onchange=()=>{draft.adopted=input.checked?[...new Set([...draft.adopted,i])]:draft.adopted.filter(v=>v!==i);refresh();};label.append(input,document.createTextNode('采用：'+text));
      const result=document.createElement('span');const reveal=()=>{const verified=draft.verified.includes(i);result.textContent=verified?(CampaignCore55.falseIntel(node.id,i)?'复核冲突，建议撤回采用':'已获本次演练记录佐证'):'尚未核实';};
      const b=button('核验',()=>{if(draft.settled||draft.verified.includes(i))return;if(draft.verified.length>=2){feedback.textContent='本程两次核验已用完，仍可调整采用的消息。';return;}draft.verified.push(i);reveal();updateChecks();refresh();});checks.push(b);row.append(label,b,result);intel.append(row);reveal();});
    const updateChecks=()=>checks.forEach((b,i)=>{b.disabled=draft.settled||draft.verified.includes(i)||draft.verified.length>=2;b.textContent=draft.verified.includes(i)?'已核验':'核验';});updateChecks();
    const shared=section('四岗共享12点协作资源 · 至少部署8点，余额转为跨关预备');
    const rule=document.createElement('p');rule.textContent='报务组降低信息阻力（最多3点生效）；后勤组减轻补给消耗（最多3点生效）；救护组改善体力，但每3点多耗1补给；行动组达到3点时士气额外+2。增加一岗会占用其他岗位或预备资源。';shared.append(rule);
    const labels={signal:'报务组',logistics:'后勤组',care:'救护组',action:'行动组'};
    CampaignCore55.roles.forEach(role=>{const row=document.createElement('div');row.className='campaign-budget55';const label=document.createElement('span');label.textContent=labels[role];const amount=document.createElement('strong');amount.textContent=String(draft.alloc[role]);
      row.append(label,button('−',()=>{if(draft.settled||draft.alloc[role]<=0)return;draft.alloc[role]--;amount.textContent=String(draft.alloc[role]);refresh();}),amount,button('＋',()=>{if(draft.settled)return;const total=Object.values(draft.alloc).reduce((a,b)=>a+b,0);if(total>=12){feedback.textContent='共享资源已达12点，请先减少其他岗位。';return;}draft.alloc[role]++;amount.textContent=String(draft.alloc[role]);refresh();}));shared.append(row);});
    const adversary=section('模拟对手与跨关经验');const counter=document.createElement('p');counter.textContent=CampaignCore55.counter(s,node.id).label;adversary.append(counter);
    const toggle=(name,label,available)=>{const l=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=!!draft[name];input.disabled=draft.settled||!available;input.onchange=()=>{draft[name]=input.checked;refresh();};l.append(input,document.createTextNode(label));adversary.append(l);};
    toggle('countermove','增加交叉联络，化解被针对的风险（时间+2）',true);toggle('useReserve','消耗1点此前保留的预备资源，抵消部分额外损耗',s.reserves>0);
    toggle('support','沿用上一程互助经验：协作转运，体力代价减2、时间+1',s.history.filter(r=>r.node<node.id).at(-1)?.choice==='mutual');
    const ledger=section('因果账本 · 只记录已完成的教学模拟');
    if(!s.history.length){const p=document.createElement('p');p.textContent='尚无已完成的策略部署。';ledger.append(p);}else s.history.forEach(row=>{const p=document.createElement('p');p.textContent=`第${row.node}程：${row.summary}`;ledger.append(p);});
    const custom=section('补充自己的部署，可选');const input=document.createElement('textarea');input.maxLength=300;input.value=draft.custom;input.placeholder='例如：报务组先核验信号，再请后勤协助转运。';input.disabled=draft.settled;input.oninput=()=>{draft.custom=input.value;persist();};custom.append(input);
    const actions=document.createElement('div');actions.className='campaign-actions55';
    const trigger=document.activeElement;const close=()=>{document.removeEventListener('keydown',escape);overlay.remove();if(this.closeActive===close)this.closeActive=null;if(trigger?.isConnected)trigger.focus();};
    const escape=e=>{if(e.key==='Escape'){e.preventDefault();persist();close();}};
    actions.append(button('保存并返回地图',()=>{persist();close();}),button(draft.settled?'返回任务':'锁定部署并继续',()=>{if(!current()||!overlay.isConnected)return;if(!draft.settled&&!CampaignCore55.quote(s,draft).valid){feedback.textContent='请至少部署8点资源，并选择至少两条本次采用的消息。';return;}const emit=!draft.settled;if(emit){draft.committed=true;persist();}close();if(typeof done==='function')done();if(emit&&typeof DecisionCinema!=='undefined')DecisionCinema.emit(draft.custom.trim()?'custom_decision':'fixed_decision',{nodeId:node.id,text:CampaignCore55.routes[node.id-1][draft.route]+(draft.custom.trim()?'；补充：'+draft.custom.trim():''),context:CampaignCore55.choices[draft.choice].text+'；虚构基层协作部署，不改变历史'});}));
    panel.append(heading,intro,board,status,feedback,actions);document.body.append(overlay);this.closeActive=close;document.addEventListener('keydown',escape);refresh();heading.focus();return overlay;
  }
};
