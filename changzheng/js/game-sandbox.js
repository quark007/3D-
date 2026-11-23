/* Four decisions with on-demand film playback. Scene inspection is separate. */
const ChishuiSandbox={
 key:'chishui_sandbox_v1',session:0,
 sites:[{name:'出发营地'},{name:'山路观察点'},{name:'河谷渡运点'},{name:'林间联络点'},{name:'接应营地'}],
 labels:{scout:'侦察核验',cover:'掩护联络',feint:'佯动信号',rest:'短暂休整',move:'机动转移'},
 createState(){return {round:0,position:0,selected:1,food:84,stamina:88,intel:35,pressure:38,clock:0,history:[],plan:[],command:''};},
 open(node){this.close();if(window.ChishuiBoard){const chapter=node||{id:4,name:'四渡赤水'};return window.ChishuiBoard.open(chapter,()=>GameUI.completeDungeon(chapter));}this.node=node||{id:4,name:'四渡赤水'};let saved;try{saved=JSON.parse(localStorage.getItem(this.key));}catch{}this.state={...this.createState(),...saved,busy:false};this.state.plan=Array.isArray(saved?.plan)?saved.plan.filter(id=>this.labels[id]):[];this.state.history=Array.isArray(saved?.history)?saved.history.slice(0,4):[];this.state.round=this.state.history.length;this.state.command=typeof saved?.command==='string'?saved.command:'';for(const key of ['position','selected'])this.state[key]=Math.max(0,Math.min(4,Number(this.state[key])||0));this.result=false;this.root=document.createElement('div');this.root.className='sandbox-overlay mission40';this.root.setAttribute('role','dialog');this.root.setAttribute('aria-label','四渡赤水行动决策');document.body.append(this.root);this.render();},
 close(){if(typeof window!=='undefined')window.ChishuiBoard?.close();this.session++;this.controller?.abort();if(this.state)this.state.busy=false;this.root?.remove();this.root=null;},
 save(){try{localStorage.setItem(this.key,JSON.stringify({...this.state,busy:false}));}catch{GameUI.showToast?.('本次进度尚未保存，请保持页面打开。');}},
 evaluate(text=this.state.command){const s=this.state,p=s.plan,has=(id,re)=>p.includes(id)||re.test(text),scout=has('scout',/侦察|核验|观察/),cover=has('cover',/掩护|联络|配合/),feint=has('feint',/佯动|迷惑/),rest=has('rest',/休整|休息/),distance=p.includes('move')||/转移|行军|移动|前进/.test(text)?Math.abs(s.selected-s.position):0,repeated=!!(s.history.at(-1)?.plan?.includes('feint')&&feint);const early=p.indexOf('move')>=0&&p.indexOf('scout')>p.indexOf('move');return {repeated,early,food:-4-distance*3,stamina:rest?10:-4-distance*3+(cover?2:0),intel:scout?15:0,pressure:8-(scout?6:0)-(cover?5:0)-(feint?7:0)+(repeated?10:0)+(early?7:0),time:1+distance+(rest?2:0),note:repeated?'模拟对手加强了对重复佯动的观察。':scout&&cover?'侦察与联络衔接，下一段行动有了更明确的依据。':rest?'小组暂时休整，同时承担时间与补给消耗。':'安排已记录，继续留意情报与协作条件。'};},
 async execute(){
  const s=this.state;if(s.busy||s.round>=4)return;
  const custom=s.command.trim(),plan=[...s.plan];if(!custom&&!plan.length){this.status.textContent='选择任一行动，或输入自己的决策，即可执行。';return;}
  const text=[plan.map(id=>this.labels[id]).join('，然后'),custom].filter(Boolean).join('；补充：'),token=this.session,root=this.root;
  this.controller=new AbortController();s.busy=true;this.status.textContent=custom?'正在解析你的决策，并检索对应视频…':'正在执行所选行动，并检索对应视频…';this.root.querySelectorAll('.sandbox-console button,.sandbox-console textarea').forEach(el=>el.disabled=true);
  if(typeof DecisionCinema!=='undefined')DecisionCinema.play(this.node,text,{kind:custom?'custom_decision':'fixed_decision',userInitiated:true,isCurrent:()=>this.root===root&&this.session===token});
  let parsed=null;try{if(custom&&typeof apiRequest==='function')parsed=await apiRequest('/battle/parse',{command:text},15000,this.controller.signal);}catch{}
  if(token!==this.session||this.root!==root)return;
  const e=this.evaluate(text),from=s.position,to=plan.includes('move')||/转移|行军|移动|前进/.test(custom)?s.selected:s.position,description=parsed?.narrative_hint||parsed?.description||parsed?.suggestion;
  if(typeof description==='string'&&description)e.note=description;
  for(const key of ['food','stamina','intel','pressure'])s[key]=Math.max(0,Math.min(100,s[key]+e[key]));
  s.round++;s.position=to;s.clock+=e.time;s.history.push({round:s.round,from,to,plan,command:custom,text,...e,mode:custom?(parsed&&!parsed.degraded?'AI 解析 · AI生成':'本地规则 · AI 暂未完成'):'预设行动'});
  s.busy=false;s.plan=[];s.command='';this.result=true;this.save();
  GameState.recordStrategicDecision({nodeId:4,nodeName:this.node.name,command:text,videoKind:custom?'custom_decision':'fixed_decision',videoHandled:true,modules:plan,resourceDelta:{food:e.food,stamina:e.stamina,intel:e.intel,pressure:e.pressure},counter:e.note,outcome:'行动完成'});
  this.render();
 },
 render(){
  if(!this.root)return;const s=this.state,el=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!==undefined)e.textContent=text;return e;},button=(label,fn)=>{const b=el('button','',label);b.type='button';b.onclick=fn;return b;};
  const scroll=this.root.scrollTop;this.root.replaceChildren();const shell=el('section','sandbox-shell'),head=el('header','sandbox-head');head.append(el('h1','','四渡赤水 · 行动与映像'),button('保存并返回',()=>{this.save();this.close();}));shell.append(head);
  const panel=el('main','sandbox-console');panel.append(el('p','sandbox-kicker',`行动 ${Math.min(s.round+1,4)} / 4 · ${this.result?'本轮结果':'安排下一步'}`));
  if(this.result||s.round>=4){
   const last=s.history.at(-1);panel.append(el('h2','',s.round>=4?'本章行动已完成':'行动完成，查看结果'));
   if(last){panel.append(el('p','',last.text||last.command),el('p','',last.note),el('small','',last.mode||'已有行动记录'));panel.append(button('重看本次行动视频',()=>DecisionCinema.play(this.node,last.text||last.command||last.plan.map(id=>this.labels[id]).join('，'),{kind:last.command?'custom_decision':'fixed_decision',userInitiated:true})));}
   const metrics=el('div','sandbox-metrics');for(const [key,label] of [['food','补给'],['stamina','体力'],['intel','情报'],['pressure','压力']])metrics.append(el('p','',`${label} ${s[key]}`));panel.append(metrics);
   if(s.round<4)panel.append(button('下一步 · 继续决策',()=>{this.result=false;this.render();}));
   else panel.append(button('归档并继续征程',()=>{GameState.recordBattleScore(4,Math.max(35,Math.min(98,Math.round(50+s.intel*.3+s.stamina*.2-s.pressure*.2))),'行动复盘');GameState.resources.food=s.food;GameState.stamina=s.stamina;GameState.save();GameUI.completeDungeon(this.node);GameUI.updateResourceHUD();this.close();}));
  }else{
   panel.append(el('h2','','下达你的行动决策'),el('p','','可只选预设、只输入指令，或两者组合。无需拖拽，也不强制机动转移。'));
   const sites=el('div','sandbox-sites');this.sites.forEach((site,i)=>{const b=button(site.name,()=>{s.selected=i;this.save();sites.querySelectorAll('button').forEach((node,j)=>node.setAttribute('aria-pressed',String(j===i)));});b.setAttribute('aria-pressed',String(s.selected===i));sites.append(b);});panel.append(sites);
   const pool=el('div','sandbox-pool'),tray=el('div','sandbox-tray');
   const update=()=>{tray.replaceChildren();for(const [i,id] of s.plan.entries()){const item=el('div','sandbox-action');item.append(el('span','',`${i+1}. ${this.labels[id]}`));for(const [label,offset] of [['↑',-1],['↓',1]]){const b=button(label,()=>{const j=i+offset;if(j<0||j>=s.plan.length)return;[s.plan[i],s.plan[j]]=[s.plan[j],s.plan[i]];this.save();update();});b.disabled=i+offset<0||i+offset>=s.plan.length;item.append(b);}item.append(button('撤回',()=>{s.plan.splice(i,1);this.save();update();}));tray.append(item);}if(!s.plan.length)tray.append(el('p','','未选预设，可直接在下方输入决策。'));};
   for(const [id,label] of Object.entries(this.labels))pool.append(button(label,()=>{if(!s.plan.includes(id)){s.plan.push(id);this.save();update();}}));update();
   const label=el('label','','自定义指令'),input=el('textarea');input.value=s.command;input.placeholder='例如：先核对河谷通道，再安排联络接应；也可以只安排短暂休整。';input.maxLength=300;input.setAttribute('aria-label','四渡赤水自定义指令');input.oninput=()=>{s.command=input.value;this.save();};label.append(input);panel.append(pool,tray,label);
   this.status=el('p','sandbox-status','自定义与组合方案会提交 AI 解析；执行后播放按决策检索的视频。');this.status.setAttribute('role','status');const run=button('执行行动 · 检索并播放映像',()=>this.execute());run.dataset.run='true';panel.append(this.status,run);
  }
  shell.append(panel);this.root.append(shell);this.root.scrollTop=scroll;
 }
};
