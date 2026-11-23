/* Chapter one: a playable fictional support mission within a fixed historical journey. */
const JourneyChapter = {
  key: 'changzheng_journey_v1',
  items: [
    {id:'food',name:'口粮',weight:2,note:'维持行军补给'},
    {id:'water',name:'饮水',weight:1,note:'途中休整与照料'},
    {id:'medical',name:'救护包',weight:2,note:'照料体弱战友'},
    {id:'blanket',name:'被服',weight:2,note:'保暖与临时垫护'},
    {id:'tools',name:'修整工具',weight:2,note:'修补背带与协助渡河'}
  ],
  roles: {
    logistics:{title:'后勤补给员',task:'将物资交给合适的携行组',slots:['行军保障组','卫生照料组','渡河协作组'],cargo:['口粮与饮水','救护包与被服','修整工具'],answer:[0,1,2],hint:'补给留给行军保障，救护交给卫生照料，工具用于渡河协作。'},
    medic:{title:'红军女医护',task:'为虚构战友安排照料',slots:['先观察并报告','整理救护用品','协助安全转运'],cargo:['询问体弱战友状态','核对绷带与被服','与同伴一起扶稳行走'],answer:[0,1,2],hint:'先了解状况并报告，再准备用品，最后配合转运；这里不模拟医疗诊断。'},
    soldier:{title:'普通红军战士',task:'完成出发前的互助检查',slots:['携行检查','战友互助','队列衔接'],cargo:['检查背带是否牢固','协助同伴分担物资','确认前后组已准备好'],answer:[0,1,2],hint:'检查自己的行装，帮助身边的战友，再确认队列衔接。'},
    commander:{title:'红军连长',task:'在既定部署下组织本连协作',slots:['出发前核对','行军中照应','渡河前协作'],cargo:['核对本连携行物资','安排互助与联络','配合渡口既定安排'],answer:[0,1,2],hint:'只组织本连的基层协作，不决定红军战略路线。'}
  },
  planChips:['核对物资','互相分担负重','照应体弱战友','安排短暂休整','按计划分批渡河'],
  labels:['整装','岗位协作','行动计划','行路互助','渡河协作','行记复盘'],
  getRole() {
    const role=this.roles[this.state.role];
    if(this.state.role!=='logistics')return role;
    const i=this.state.inventory;
    return {...role,cargo:[`口粮${i.food}份 · 饮水${i.water}份`,i.medical||i.blanket?`救护包${i.medical}份 · 被服${i.blanket}份`:'饮水照料与状态报告',i.tools?`修整工具${i.tools}份`:'行装检查与徒手互助']};
  },
  createState(role) {
    return {version:1,role,stage:0,inventory:{food:1,water:1,medical:0,blanket:0,tools:0},assignments:[null,null,null],plan:'',analysis:null,actions:[],events:[],cross:0,misses:0,resource:{food:80,stamina:88,morale:72,cooperation:50},snapshots:[],log:[],chat:[],customDecisions:[],finished:false};
  },
  open(node,onMarchComplete) {
    this.close(false);
    this.onMarchComplete=typeof onMarchComplete==='function'?onMarchComplete:null;
    this.marchOwner=this.onMarchComplete&&typeof CZMarchEnv!=='undefined'?CZMarchEnv().owner:null;
    this.marchStore=this.onMarchComplete?GameState.storyPreparations:null;
    this.node=node;
    const role=GameState.character?.id || 'soldier';
    let saved;
    try { saved=this.onMarchComplete?GameState.storyPreparations.journey83_1:null;if(!saved)saved=JSON.parse(localStorage.getItem(this.key)); } catch (_) {}
    const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
    const usable=saved?.version===1&&saved.role===role&&Number.isInteger(saved.stage)&&saved.stage>=0&&saved.stage<=5&&(!saved.finished||this.onMarchComplete)&&object(saved.inventory)&&this.items.every(i=>Number.isFinite(saved.inventory[i.id])&&saved.inventory[i.id]>=0&&saved.inventory[i.id]<=3)&&object(saved.resource)&&['food','stamina','morale','cooperation'].every(k=>Number.isFinite(saved.resource[k])&&saved.resource[k]>=0&&saved.resource[k]<=100)&&['assignments','actions','events','snapshots','log','chat'].every(k=>Array.isArray(saved[k]));
    this.state=usable?saved:this.createState(role);
    this.state.customDecisions ||= [];
    if(this.state.feedbackVersion!==2)this.state.feedback='';
    this.session=(this.session||0)+1;
    this.busy=false;this.stageSnapshots={};
    this.root=document.createElement('div');this.root.className='journey-overlay';this.root.id='journeyChapter';
    document.body.appendChild(this.root);
    this.keyHandler=e=>{if(e.code==='Space' && this.state.stage===4 && !['TEXTAREA','INPUT','BUTTON'].includes(e.target.tagName)){e.preventDefault();this.crossAction();}};
    document.addEventListener('keydown',this.keyHandler);
    this.render();
  },
  close(save=true) {
    this.stopRecognition();
    if(!this.root)return;
    if(save && this.state) this.save();
    clearInterval(this.crossTimer);this.crossTimer=null;
    this.session=(this.session||0)+1;
    if(this.keyHandler) document.removeEventListener('keydown',this.keyHandler);this.keyHandler=null;
    this.root?.remove();this.root=null;this.sceneArt=null;this.sceneKey=null;this.crossUI=null;
    GameUI.stopNpcVoice();
    this.onMarchComplete=null;this.marchStore=null;this.marchOwner=null;
  },
  marchCurrent(){return this.onMarchComplete&&typeof CZMarchEnv!=='undefined'&&this.marchOwner===CZMarchEnv().owner&&GameState.storyPreparations===this.marchStore&&GameState.character?.id===this.state.role;},
  save() {
    if(this.onMarchComplete){if(!this.marchCurrent())return false;const old=GameState.storyPreparations.journey83_1;try{GameState.storyPreparations.journey83_1=JSON.parse(JSON.stringify(this.state));if(GameState.save()===false)throw Error('save');return true;}catch{if(old===undefined)delete GameState.storyPreparations.journey83_1;else GameState.storyPreparations.journey83_1=old;return false;}}
    try{localStorage.setItem(this.key,JSON.stringify(this.state));return true;}catch{return false;}
  },
  weight() { return this.items.reduce((sum,i)=>sum+i.weight*(this.state.inventory[i.id]||0),0); },
  changeItem(id,delta) {
    const item=this.items.find(i=>i.id===id),current=this.state.inventory[id];
    if(current+delta<0 || current+delta>3) return false;
    if(delta>0 && this.weight()+item.weight>12) return false;
    this.state.inventory[id]+=delta;this.save();return true;
  },
  record(label,changes={}) {
    const before={...this.state.resource};
    for(const [key,value] of Object.entries(changes)) this.state.resource[key]=Math.min(100,Math.max(0,this.state.resource[key]+value));
    this.state.log.push({label,changes,before,after:{...this.state.resource}});
    this.state.snapshots.push({label,...this.state.resource});this.save();
  },
  el(tag,cls,text) {const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;},
  button(text,fn,cls='journey-button') {const b=this.el('button',cls,text);b.type='button';b.onclick=fn;return b;},
  message(text) { const e=this.root?.querySelector('.journey-feedback');if(e)e.textContent=text; },
  next() { this.session++;this.busy=false;this.state.stage++;this.save();this.render();if(this.root)this.root.scrollTop=0; },
  render() {
    this.stopRecognition();
    clearInterval(this.crossTimer);this.crossTimer=null;
    this.stageSnapshots??={};if(!this.stageSnapshots[this.state.stage])this.stageSnapshots[this.state.stage]=JSON.parse(JSON.stringify(this.state));
    const s=this.state,r=this.getRole(),scrollTop=this.root.scrollTop,active=document.activeElement,focusLabel=this.root.contains(active)?active.getAttribute('aria-label'):null;
    this.root.replaceChildren();
    const shell=this.el('section','journey-shell');shell.setAttribute('aria-label','第一章互动任务');
    const header=this.el('header','journey-header');
    const title=this.el('div');title.append(this.el('p','journey-kicker','第一章 / 中央苏区出发 · 1934年10月'),this.el('h2',null,'星夜启程'));
    if(this.onMarchComplete&&s.finished)header.append(this.button('重新练习完整任务',()=>{this.session++;this.busy=false;this.stageSnapshots={};this.state=this.createState(GameState.character.id);this.save();this.render();},'journey-quiet'));
    if(s.stage>0&&this.stageSnapshots[s.stage-1])header.append(this.button('返回上一步',()=>{this.session++;this.busy=false;this.state=JSON.parse(JSON.stringify(this.stageSnapshots[s.stage-1]));for(const key of Object.keys(this.stageSnapshots))if(Number(key)>=s.stage)delete this.stageSnapshots[key];this.save();this.render();},'journey-quiet'));
    header.append(title,this.button('保存并返回',()=>this.close(),'journey-quiet'));shell.append(header);
    const steps=this.el('nav','journey-steps');steps.setAttribute('aria-label','任务进度');
    this.labels.forEach((label,i)=>{const step=this.el('span',i===s.stage?'current':i<s.stage?'done':'',`${String(i+1).padStart(2,'0')} ${label}`);if(i===s.stage)step.setAttribute('aria-current','step');steps.append(step);});shell.append(steps);
    const grid=this.el('div','journey-layout');
    const scene=this.el('aside','journey-scene');
    const sceneKey=(typeof LongMarch3D!=='undefined'&&typeof THREE!=='undefined')?(s.stage===4?'crossing':'march'):`${s.stage}:${s.events.length}`;const art=this.sceneArt&&this.sceneKey===sceneKey?this.sceneArt:this.el('div','journey-art');if(art!==this.sceneArt){art.innerHTML=SvgScenes.render(s.stage===4?{id:1,name:'于都集结与渡河',type:'start',journeyCrossing:true}:{id:1,name:'中央苏区出发',type:'start'},{flow:'journey',stage:s.stage,eventIndex:s.events.length,role:s.role,inventory:s.inventory,resources:s.resource});this.sceneArt=art;this.sceneKey=sceneKey;}
    scene.append(art,this.el('p','journey-role',`你的岗位 · ${r.title}`));
    const captions=[
      '夜色渐深，你和战友整理行装，准备按既定部署出发。携行空间有限，带什么、怎样分担，都需要商量。',
      '每一份物资、每一次照应，都关系着队伍能否保持有序。现在完成你所在岗位的协作任务。',
      '向于都集结前，你可以用自己的话安排这支虚构协作小组的任务。计划需要具体，也需要能被执行。',
      '行军途中，背带、体力和补给都可能成为困难。你的准备会影响接下来的任务消耗。',
      '各部向于都集结后按计划渡河。你在此完成基层协作，不改变历史渡河部署。把握节奏，互相照应。',
      '一段行路结束了。留下的不只是资源数字，还有你对分担、坚持与团结的理解。'
    ];scene.append(this.el('p','journey-caption',captions[s.stage]));
    const resources=this.el('div','journey-resources');
    for(const [key,label] of Object.entries({food:'口粮保障',stamina:'体力',morale:'士气',cooperation:'协作'})){
      const card=this.el('div','journey-resource');card.dataset.journeyResource=key;card.append(this.el('span',null,label),this.el('b',null,String(Math.round(s.resource[key]))));
      const meter=this.el('meter');meter.min=0;meter.max=100;meter.value=s.resource[key];meter.setAttribute('aria-label',label);card.append(meter);resources.append(card);
    }
    scene.append(resources,this.el('p','journey-note','虚构基层协作任务 · 数值为体验指数，不代表历史人数或战果'));
    const shots=this.el('div');shots.innerHTML=CinemaAssets.alternatives(this.node);scene.append(shots);
    grid.append(scene);
    const workspace=this.el('main','journey-workspace');this.workspace=workspace;
    [this.renderPacking,this.renderRole,this.renderPlan,this.renderEvents,this.renderCrossing,this.renderReview][s.stage].call(this,workspace);
    const feedback=this.el('p','journey-feedback');feedback.setAttribute('role','status');workspace.append(feedback);
    grid.append(workspace);shell.append(grid);this.root.append(shell);if(focusLabel)[...this.root.querySelectorAll('button[aria-label]')].find(b=>b.getAttribute('aria-label')===focusLabel)?.focus({preventScroll:true});this.root.scrollTop=scrollTop;
  },
  renderPacking(w) {
    w.append(this.el('p','journey-kicker','携行配置'),this.el('h3',null,'行装有限，怎样带走保障？'),this.el('p','journey-muted','为虚构小组配置12格携行空间。至少带1份口粮和1份饮水，其他用品将影响行路事件。'));
    const load=this.el('p','journey-load',`已用 ${this.weight()} / 12 格`);w.append(load);
    this.items.forEach(item=>{
      const row=this.el('div','journey-item');const info=this.el('div');info.append(this.el('b',null,item.name),this.el('p','journey-muted',`${item.weight} 格 / 份 · ${item.note}`));
      const controls=this.el('div','journey-counter');const count=this.el('strong',null,String(this.state.inventory[item.id]));
      const change=delta=>{if(!this.changeItem(item.id,delta)){this.message('携行空间或份数已达上限，请调整搭配。');return;}count.textContent=String(this.state.inventory[item.id]);load.textContent=`已用 ${this.weight()} / 12 格`;};
      const minus=this.button('−',()=>change(-1),'journey-small');minus.setAttribute('aria-label',`减少${item.name}`);
      const plus=this.button('＋',()=>change(1),'journey-small');plus.setAttribute('aria-label',`增加${item.name}`);
      controls.append(minus,count,plus);row.append(info,controls);w.append(row);
    });
    w.append(this.button('确认行装，开始岗位协作',()=>{
      if(!this.state.inventory.food || !this.state.inventory.water){this.message('至少携带口粮和饮水，再出发。');return;}
      this.state.resource.food=Math.min(100,55+this.state.inventory.food*15);
      this.record('行装确认',{stamina:this.weight()>10?-4:0});this.next();
    }));
  },
  renderRole(w) {
    const r=this.getRole();w.append(this.el('p','journey-kicker','岗位互动 · 可拖拽，也可点按'),this.el('h3',null,r.task),this.el('p','journey-muted',r.hint));
    const cargo=this.el('div','journey-cargo');
    const cargoHead=this.el('header','journey-cargo-head');cargoHead.append(this.el('b',null,'待分配物资托盘'),this.el('small',null,'拖到下方携行组 · 触屏可先点物资再点目标'));cargo.append(cargoHead);
    r.cargo.forEach((label,i)=>{
      const b=this.button(label,()=>{this.selectedCargo=i;this.updateAssignments();this.message(`已选择“${label}”，再点选目标区域。`);},'journey-cargo-item');b.draggable=true;
      b.dataset.cargo=String(i);b.disabled=this.state.assignments.includes(i);
      b.ondragstart=e=>{e.dataTransfer.setData('text/plain',String(i));};cargo.append(b);
    });w.append(cargo);
    r.slots.forEach((label,index)=>{
      const box=this.button(label,()=>{if(this.selectedCargo!==undefined)this.assign(index,this.selectedCargo);else if(this.state.assignments[index]!==null){this.state.assignments[index]=null;this.save();this.updateAssignments();}},'journey-dropzone');box.dataset.slot=String(index+1);
      const assigned=this.state.assignments[index];if(assigned!==null)box.append(this.el('span',null,r.cargo[assigned]+' · 点击撤回'));
      box.ondragover=e=>e.preventDefault();box.ondrop=e=>{e.preventDefault();const payload=e.dataTransfer.getData('text/plain');if(/^[0-2]$/.test(payload))this.assign(index,Number(payload));};w.append(box);
    });
    w.append(this.button('完成协作，商量行动计划',()=>{
      if(!this.state.assignments.every((v,i)=>v===r.answer[i])){this.message('分工还不合适，请依据岗位提示调整；已放好的内容可以撤回。');return;}
      this.record('岗位协作完成',{cooperation:12});this.next();
    }));
  },
  assign(slot,item) {
    if(!Number.isInteger(item)||item<0||item>2||!Number.isInteger(slot)||slot<0||slot>=this.state.assignments.length)return;
    const previous=this.state.assignments.indexOf(item);if(previous>=0)this.state.assignments[previous]=null;
    this.state.assignments[slot]=item;this.selectedCargo=undefined;this.updateAssignments();this.save();
  },
  updateAssignments() {
    if(!this.workspace)return;const r=this.getRole();
    for(const b of this.workspace.querySelectorAll('[data-cargo]')){b.disabled=this.state.assignments.includes(Number(b.dataset.cargo));b.setAttribute('aria-pressed',String(Number(b.dataset.cargo)===this.selectedCargo));}
    for(const b of this.workspace.querySelectorAll('.journey-dropzone')){const i=Number(b.dataset.slot)-1,item=this.state.assignments[i];b.replaceChildren(document.createTextNode(r.slots[i]));b.classList.toggle('is-assigned',item!==null);if(item!==null)b.append(this.el('span',null,r.cargo[item]+' · 点击撤回'));b.setAttribute('aria-label',r.slots[i]+(item!==null?'：'+r.cargo[item]+'，点击撤回':'：待分配'));}
  },
  renderPlan(w) {
    w.append(this.el('p','journey-kicker','自然语言行动 · AI 解析'),this.el('h3',null,'你准备怎样安排这段路？'));
    const textarea=this.el('textarea','journey-input');textarea.placeholder='例如：先核对物资，让体弱战友得到照应；途中分担负重，短暂休整，再按计划分批渡河。';textarea.maxLength=300;textarea.value=this.state.plan;textarea.oninput=()=>{this.state.plan=textarea.value;this.state.analysis=null;this.save();};w.append(textarea);
    const chips=this.el('div','journey-chips');
    this.planChips.forEach(text=>chips.append(this.button(text,()=>{textarea.value+=(textarea.value?'；':'')+text;textarea.dispatchEvent(new Event('input'));},'journey-chip')));w.append(chips);
    if(this.busy) {const film=this.el('div','cinema-loading');film.innerHTML=CinemaAssets.frame(183);w.append(film);}
    const analyze=this.button(this.busy?'正在分析，请稍候…':'解析我的计划',()=>this.analyzePlan());analyze.disabled=this.busy;w.append(analyze);
    if(this.state.analysis){
      const data=this.state.analysis;w.append(this.el('p','journey-mode',data.degraded?'本地规则解析 · 任务可以继续':'AI 已解析 · 任务规则校验通过'));
      const list=this.el('ol','journey-action-list');this.state.actions.forEach(id=>list.append(this.el('li',null,this.actionLabels[id])));w.append(list,this.el('p','journey-advice',data.advice));
      w.append(this.button('采用这份计划，开始行军',()=>{this.record('采用行动计划',{cooperation:this.state.actions.includes('share_load')?5:0});this.next();}));
    }
    this.addMicrophone(w,textarea);
  },
  actionLabels:{check_supplies:'清点物资并确认携行',share_load:'互相分担负重',help_comrade:'照应体弱战友',rest:'短暂休整',cross:'配合既定安排分批渡河'},
  localPlan(text) {
    const actions=[];
    if(/物资|核对|清点|补给|口粮/.test(text))actions.push('check_supplies');
    if(/分担|负重|背包|帮忙|帮助/.test(text))actions.push('share_load');
    if(/体弱|伤员|照应|照顾|扶|救护/.test(text))actions.push('help_comrade');
    if(/休整|休息|停留/.test(text))actions.push('rest');
    if(/渡河|渡口|分批/.test(text))actions.push('cross');
    return {actions,advice:'这是按关键词识别的基层协作安排。计划会影响事件提示、体力消耗和渡河协作容错；没有写到的安排不会自动替你添加。',degraded:true};
  },
  async analyzePlan() {
    const text=this.state.plan.trim();if(text.length<6&&!this.planChips.includes(text)){this.message('请写清要做什么、怎样配合，至少6个字；也可直接采用下方预设行动。');return;}
    if(/改写|扮演毛|扮演周|全军歼灭|原子弹|投降/.test(text)){this.message('请限定在基层协作任务内安排，不改写历史或扮演真实领袖。');return;}
    this.busy=true;this.state.analysis=null;this.render();const session=this.session;
    const preset=text.split(/[；;。]/).map(x=>x.trim()).filter(Boolean).every(x=>this.planChips.includes(x));
    const raw=preset?null:await apiRequest('/journey/plan',{role:this.state.role,command:text,resources:this.state.resource,inventory:this.state.inventory},2500);
    if(session!==this.session||!this.root)return;
    if(this.state.plan.trim()!==text){this.busy=false;this.render();this.message('计划已修改，请重新解析当前内容。');return;}
    const data=raw && !raw.degraded?raw:this.localPlan(text);
    const actions=[...new Set((data.actions||[]).filter(a=>Object.hasOwn(this.actionLabels,a)))];
    this.busy=false;
    if(!actions.length){this.render();this.message('这句话还不能转成具体任务。请补充清点、分担、照应、休整或渡河等安排。');return;}
    this.state.analysis=data;this.state.actions=actions;this.save();this.render();
  },
  addMicrophone(w,input) {
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    const b=this.button(Recognition?'语音输入计划':'当前浏览器未提供语音输入',()=>{
      this.stopRecognition();const recognition=this.recognition=new Recognition(),session=this.session,state=this.state;recognition.lang='zh-CN';recognition.interimResults=false;
      const current=()=>session===this.session&&state===this.state&&input.isConnected&&(!this.onMarchComplete||this.marchCurrent());
      recognition.onresult=e=>{if(!current())return;input.value=String(e.results?.[0]?.[0]?.transcript||'').slice(0,300);input.dispatchEvent(new Event('input'));};
      recognition.onerror=()=>{if(current())this.message('未能取得语音，请继续使用文字输入。');};recognition.onend=()=>{if(this.recognition===recognition)this.recognition=null;};try{recognition.start();}catch{this.stopRecognition();this.message('未能取得语音，请继续使用文字输入。');}
    },'journey-quiet');b.disabled=!Recognition;w.append(b);
  },
  stopRecognition(){const recognition=this.recognition;this.recognition=null;if(recognition){recognition.onresult=null;recognition.onerror=null;recognition.onend=null;try{recognition.abort();}catch{/* Recognition may already have ended. */}}},
  eventData:[
    {title:'背带松了，队伍还在前进',text:'虚构协作小组里，一名战友的背带松脱。你带的用品和之前的计划会影响处理消耗。',options:[{label:'停到安全处，检查并修整背带',id:'repair'},{label:'与同伴临时分担物资，再做修整',id:'share'}]},
    {title:'体弱战友渐渐落在后面',text:'前往集结地点途中，一名虚构战友走得慢了。任务目标是保持联络、互相照应，不以减员作为奖励或惩罚。',options:[{label:'报告情况，短暂休整并检查饮水',id:'rest'},{label:'保持联络，结伴慢行并分担负重',id:'support'}]},
    {title:'抵达集结区域，准备协助渡河',text:'在既定渡河安排下，小组需要再次核对物资。你不能决定真实红军的渡口、路线或历史结局。',options:[{label:'核对物资和人员衔接，再交接任务',id:'check'},{label:'先补充体力，再核对与交接',id:'recover'}]}
  ],
  eventOutcome(id) {
    const inv=this.state.inventory,a=this.state.actions;
    const outcomes={
      repair:{stamina:inv.tools?-2:-7,cooperation:5},
      share:{stamina:a.includes('share_load')?-2:-5,cooperation:8},
      rest:{food:inv.water>=2?-3:-5,stamina:a.includes('rest')?10:6,morale:4},
      support:{stamina:a.includes('help_comrade')?-3:-7,cooperation:inv.medical?10:7,morale:5},
      check:{stamina:-2,cooperation:a.includes('check_supplies')?10:5},
      recover:{food:-5,stamina:8,cooperation:4}
    };return outcomes[id];
  },
  renderEvents(w) {
    const index=this.state.events.length;
    if(index>=this.eventData.length){w.append(this.el('h3',null,'行路记录'),this.el('p','journey-muted','三次任务处置已记录。接下来在渡口完成节奏协作。'),this.button('前往于都渡河协作',()=>this.next()));return;}
    const event=this.eventData[index];w.append(this.el('p','journey-kicker',`行路事件 ${index+1} / 3`),this.el('h3',null,event.title),this.el('p','journey-event-text',event.text));
    this.state.actions.forEach(id=>w.append(this.el('span','journey-plan-tag',this.actionLabels[id])));
    w.append(this.el('p','journey-muted','你可以参考下面两种办法，也可以在下方自行输入其他决策，让 AI判断后果。'));
    event.options.forEach(option=>{
      const delta=this.eventOutcome(option.id);const labels={food:'口粮',stamina:'体力',cooperation:'协作',morale:'士气'};
      const b=this.button(option.label,()=>{this.state.events.push(option.id);this.record(option.label,delta);this.state.decisionPreview=null;this.state.decisionDraft='';this.render();},'journey-event-option');
      b.disabled=this.busy;
      b.append(this.el('small',null,Object.entries(delta).map(([k,v])=>`${labels[k]} ${v>0?'+':''}${v}`).join(' · ')));w.append(b);
    });
    this.renderCustomDecision(w,index);
    w.append(this.button('问问战友的想法',()=>this.askComrade(event.title),'journey-quiet'));
    if(this.state.comradeAdvice){const advice=this.el('p','journey-advice',this.state.comradeAdvice);advice.append(this.el('small','journey-note',this.state.adviceSource||'预设建议'));w.append(advice);}
    this.renderChat(w);
  },
  renderCustomDecision(w,eventIndex) {
    w.append(this.el('h3',null,'你的决策，不限于预设选项'));
    const input=this.el('textarea','journey-input');input.placeholder='写下你自己的处理办法，例如：先请同行的同志一起分担物资，让背带松脱的战友到安全处修整。';input.maxLength=300;input.value=this.state.decisionDraft||'';
    input.oninput=()=>{this.state.decisionDraft=input.value;this.state.decisionPreview=null;this.save();};w.append(input);
    const analyze=this.button(this.busy?'AI正在判断…':'让 AI推演这项决策',()=>this.analyzeDecision(eventIndex));analyze.disabled=this.busy;w.append(analyze);
    if(this.busy) {const film=this.el('div','cinema-loading');film.innerHTML=CinemaAssets.frame(184);w.append(film);}
    const preview=this.state.decisionPreview;
    if(preview && preview.eventIndex===eventIndex && preview.command===this.state.decisionDraft){
      w.append(this.el('p','journey-mode',preview.degraded?'本地有限规则推演 · 非 AI生成':'AI 判断 · 体验规则计算后果'));
      w.append(this.el('p','journey-advice',preview.explanation));
      if(preview.intent==='unclear'){w.append(this.el('p','journey-muted','请补充具体步骤，或使用参考方案；意图不明确时不会自动替你执行。'));return;}
      const box=this.el('div','journey-prediction');box.append(this.el('b',null,`预测风险：${preview.risk} · 仅针对虚构任务`));
      const names={food:'口粮保障',stamina:'体力',morale:'士气',cooperation:'协作'};
      for(const [key,val] of Object.entries(preview.changes))box.append(this.el('span',null,`${names[key]} ${val>0?'+':''}${val}`));
      box.append(this.el('small',null,'这是游戏规则下的可能后果，不是历史统计；实际行动还取决于随后的协作操作。'));w.append(box);
      w.append(this.button('执行我的决策',()=>{
        this.state.events.push(preview.intent);
        this.state.customDecisions.push({event:this.eventData[eventIndex].title,...preview});
        this.record('自定义决策：'+preview.command,preview.changes);
        this.state.decisionPreview=null;this.state.decisionDraft='';this.state.comradeAdvice='';this.render();
      }));
    }
  },
  localDecision(text) {
    if(/丢下|丢弃|抛弃|不管|扔掉/.test(text)&& !/不要|不能|不丢|不抛|不扔/.test(text))return {intent:'unsafe',risk:'高',explanation:'忽略战友或抛弃保障物资可能削弱协作与补给。游戏将记录这项风险，不把它当作真实历史结局。',degraded:true};
    const rules=[['share',/分担|分背|一起背|帮.*背/],['repair',/背带|修整|修补|工具/],['rest',/休整|休息|停下|慢慢/],['support',/照应|扶|照顾|结伴|体弱/],['check',/清点|核对|交接|检查/],['recover',/喝水|吃|补充|口粮/]];
    const match=rules.find(([,pattern])=>pattern.test(text));
    return {intent:match?match[0]:'unclear',risk:'中',explanation:match?'本地规则识别了你提出的协作方法；下方根据现有物资和资源计算体验变化。复杂安排仍建议等待 AI 判断。':'暂时无法理解这项安排，请明确谁做什么、怎样配合。',degraded:true};
  },
  async analyzeDecision(eventIndex) {
    const command=(this.state.decisionDraft||'').trim();
    if(command.length<6){this.message('请至少用6个字说明具体的处理办法。');return;}
    if(this.busy)return;this.busy=true;this.state.decisionPreview=null;this.render();const session=this.session;
    const raw=await apiRequest('/journey/decision',{role:this.state.role,command,event_index:eventIndex,resources:this.state.resource,inventory:this.state.inventory},3000);
    if(session!==this.session||!this.root)return;
    this.busy=false;
    if(this.state.decisionDraft.trim()!==command || this.state.events.length!==eventIndex){this.busy=false;this.render();this.message('决策已修改，请重新推演。');return;}
    const result=raw&&!raw.degraded?raw:this.localDecision(command);
    const intent=['repair','share','rest','support','check','recover','unsafe'].includes(result.intent)?result.intent:'unclear';
    const intents=[...new Set((result.intents?.length?result.intents:[intent]).filter(x=>['repair','share','rest','support','check','recover','unsafe','unclear'].includes(x)))].slice(0,3);
    let changes={};
    for(const id of intents){
      const delta=id==='unsafe'?{food:-8,cooperation:-12,morale:-5}:id==='unclear'?{}:this.eventOutcome(id);
      for(const [key,value] of Object.entries(delta))changes[key]=(changes[key]||0)+value;
    }
    for(const key of Object.keys(changes))changes[key]=Math.max(-15,Math.min(12,changes[key]));
    this.state.decisionPreview={eventIndex,command,intent,intents,risk:result.risk||'中',explanation:result.explanation,changes,degraded:!!result.degraded};this.save();this.render();
  },
  async askComrade(topic) {
    if(this.busy||this.advicePending===this.session)return;const session=this.session,state=this.state,player=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null;
    this.advicePending=session;this.busy=false;
    const message=`当前是虚构基层协作练习，我的岗位是${this.roles[this.state.role].title}。正在处理“${topic}”。请只谈互助与任务准备，不编造历史或敌情。`;
    const reply={role:'ai',text:'先把眼前的困难说清楚，再同战友商量怎样分担；不必一个人硬撑。',source:'预设即时建议 · AI 补充中，可继续任务'};
    const history=state.chat.slice(-8);state.comradeAdvice=reply.text;state.adviceSource=reply.source;state.chat.push({role:'player',text:message},reply);this.save();this.render();
    let raw;try{raw=await apiNpcChat('commander_2',message,'ruijin',history);}catch{raw=null;}
    if(this.advicePending===session)this.advicePending=null;
    if(session!==this.session||state!==this.state||!this.root||!state.chat.includes(reply)||(typeof PlayerProfiles40!=='undefined'&&player!==PlayerProfiles40.id))return;
    if(raw&&!raw.degraded&&raw.text){reply.text=raw.text;reply.source='AI生成对话为虚构演绎，史实参考档案';}else reply.source='预设即时建议 · 云端暂未完成，可继续任务';
    state.comradeAdvice=reply.text;state.adviceSource=reply.source;this.save();
    const advice=this.root.querySelector?.('.journey-advice');if(advice){advice.textContent=reply.text;advice.append(this.el('small','journey-note',reply.source));}
    const log=this.root.querySelector?.('.journey-chat-log');if(log){const updated=this.el('div');this.renderChat(updated);log.replaceChildren(...updated.querySelector('.journey-chat-log').childNodes);}
  },
  renderChat(w) {
    const panel=this.el('details','journey-chat');panel.open=this.state.chat.length>0;
    panel.append(this.el('summary',null,'与战友自由交谈'));
    const log=this.el('div','journey-chat-log');
    this.state.chat.slice(-6).forEach(item=>{const bubble=this.el('p',item.role==='player'?'player':'comrade');bubble.textContent=(item.role==='player'?'你：':'战友：')+item.text;if(item.source)bubble.append(this.el('small','journey-note',item.source));log.append(bubble);});panel.append(log);
    const input=this.el('input','journey-input');input.placeholder='说说你的想法，或向战友请教…';input.maxLength=200;
    input.value=this.state.chatDraft||'';input.oninput=()=>{this.state.chatDraft=input.value;};
    const pending=this.chatPending===this.session;
    const send=this.button(pending?'AI 补充中，可继续任务':this.busy?'正在等待战友…':'发送给战友',()=>this.sendChat());send.disabled=this.busy||pending;send.dataset.journeySend='';
    panel.append(input,send);w.append(panel);
  },
  async sendChat() {
    const message=(this.state.chatDraft||'').trim();if(!message||this.busy||this.chatPending===this.session)return;
    const session=this.session,state=this.state,player=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null;
    const history=state.chat.slice(-10),reply={role:'ai',text:GameUI.localNpcReply(message),source:'预设即时回应 · AI 补充中，可继续任务'};
    state.chat.push({role:'player',text:message},reply);state.chatDraft='';this.busy=false;this.chatPending=session;this.save();this.render();
    const context=`当前是虚构协作任务，玩家岗位为${this.roles[this.state.role].title}，最近任务为${this.eventData[Math.min(2,this.state.events.length)].title}。`;
    let raw;try{raw=await apiNpcChat('commander_2',message,'ruijin',[{role:'system_context',text:context},...history]);}catch{raw=null;}
    if(this.chatPending===session)this.chatPending=null;
    if(session!==this.session||state!==this.state||!this.root||(typeof PlayerProfiles40!=='undefined'&&player!==PlayerProfiles40.id))return;
    if(raw&&!raw.degraded&&raw.text){reply.text=raw.text;reply.source='AI生成对话为虚构演绎，史实参考档案';}else reply.source='预设即时回应 · 云端暂未完成，可继续任务';
    this.save();const log=this.root.querySelector?.('.journey-chat-log');if(log){const updated=this.el('div');this.renderChat(updated);log.replaceChildren(...updated.querySelector('.journey-chat-log').childNodes);}
    const send=this.root.querySelector?.('[data-journey-send]');if(send){send.disabled=!!this.busy;send.textContent='发送给战友';}
  },
  renderCrossing(w) {
    const s=this.state;w.append(this.el('p','journey-kicker','于都集结后 · 虚构渡河协作'),this.el('h3',null,'稳住节奏，照应彼此'));
    const tasks={logistics:'固定物资',medic:'配合转运',soldier:'扶稳同行',commander:'确认衔接'};
    w.append(this.el('p','journey-muted','在指针进入金色区域时点击或按空格。每次成功完成一段协作；失误可以调整重试，不会改变历史结局。'));
    const count=this.el('p','journey-cross-count',`协作进度 ${s.cross} / 6 · 调整 ${s.misses} 次`);w.append(count);
    const bar=this.el('div','journey-timing');bar.setAttribute('aria-label','节奏协作指针');const safe=this.el('div','journey-safe');
    const windowSize=this.timingWindow();safe.style.left=(50-windowSize)+'%';safe.style.width=(windowSize*2)+'%';
    const pointer=this.el('div','journey-pointer');bar.append(safe,pointer);w.append(bar);
    const status=this.el('p','journey-timing-status','等待进入金色区域');status.setAttribute('aria-live','polite');w.append(status);
    const action=this.button(tasks[s.role],()=>this.crossAction());action.disabled=s.cross>=6;w.append(action);
    const access=this.button('辅助模式：完成本段协作',()=>{this.state.assisted=true;this.crossAction(true);},'journey-quiet');w.append(access);
    w.append(this.el('p','journey-note','辅助模式每次点击完成一段，不惩罚操作能力差异；复盘会标记使用辅助。'));
    this.crossUI={count,action,access,workspace:w};access.disabled=s.cross>=6;
    if(s.cross>=6){w.append(this.button('完成渡河协作，查看行记复盘',()=>{this.record('渡河协作完成',{morale:5});this.next();}));return;}
    const start=performance.now();this.crossReadyAt=0;
    const timer=setInterval(()=>{
      if(!this.root?.isConnected||this.state.stage!==4||!w.isConnected){clearInterval(timer);if(this.crossTimer===timer)this.crossTimer=null;return;}
      this.pointerValue=50+45*Math.sin((performance.now()-start)/820);
      pointer.style.left=this.pointerValue+'%';
      const ready=Math.abs(this.pointerValue-50)<=this.timingWindow(),label=ready?'现在可以配合行动':'等待下一次协作时机';if(status.textContent!==label)status.textContent=label;
      bar.classList.toggle('ready',ready);
    },65);this.crossTimer=timer;
  },
  timingWindow(){return Math.min(25,14+(this.state.inventory.tools?3:0)+(this.state.actions.includes('cross')?4:0)+(this.state.resource.cooperation>=75?3:0));},
  crossAction(assist=false) {
    if(this.state.stage!==4||this.state.cross>=6)return false;
    const now=Date.now();if(now-(this.lastCrossAt||0)<650)return false;this.lastCrossAt=now;
    if(assist||Math.abs((this.pointerValue??0)-50)<=this.timingWindow()){
      this.state.cross++;this.record(`渡河协作 ${this.state.cross}/6`,{stamina:-2,cooperation:2});this.updateCrossing();return true;
    }
    this.state.misses++;this.record('节奏调整',{stamina:-1});this.updateCrossing();this.message('这次时机未对上，放慢节奏再试。');this.save();return false;
  },
  updateCrossing(){
    const ui=this.crossUI;if(!ui||!ui.workspace.isConnected){this.render();return;}
    ui.count.textContent=`协作进度 ${this.state.cross} / 6 · 调整 ${this.state.misses} 次`;
    for(const card of this.root.querySelectorAll('[data-journey-resource]')){const value=this.state.resource[card.dataset.journeyResource];card.querySelector('b').textContent=String(Math.round(value));card.querySelector('meter').value=value;}
    if(this.state.cross>=6&&!ui.finished){ui.finished=true;clearInterval(this.crossTimer);this.crossTimer=null;ui.action.disabled=true;ui.access.disabled=true;ui.workspace.append(this.button('完成渡河协作，查看行记复盘',()=>{this.record('渡河协作完成',{morale:5});this.next();}));this.message('六段协作已完成，可以查看本程复盘。');}
  },
  chart() {
    const snapshots=this.state.snapshots,colors={food:'#d3b57c',stamina:'#85b9c3',morale:'#dc8d7b',cooperation:'#93b38d'};
    const paths=Object.entries(colors).map(([key,color])=>{const points=snapshots.map((x,i)=>`${25+i*450/Math.max(1,snapshots.length-1)},${135-x[key]*1.05}`).join(' ');return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5"/>`;}).join('');
    return `<svg viewBox="0 0 500 165" role="img" aria-label="本次虚构协作任务的口粮、体力、士气和协作变化"><path d="M25 25v115h450M25 87h450M25 35h450" stroke="#c3a47833" fill="none"/>${paths}</svg>`;
  },
  renderReview(w) {
    const s=this.state;w.append(this.el('p','journey-kicker','行记复盘 · 你的协作记录'),this.el('h3',null,'把这一程，留在行记里'));
    const chart=this.el('div','journey-chart');chart.innerHTML=this.chart();w.append(chart,this.el('p','journey-chart-legend','金：口粮保障 / 蓝：体力 / 红：士气 / 绿：协作'));
    const score=this.score();w.append(this.el('p','journey-score',`协作体验评分 ${score} / 100`),this.el('p','journey-muted',`计划 ${s.actions.length} 项 · 行路事件 ${s.events.length} 次 · 渡河协作 ${s.cross} 段${s.assisted?' · 使用辅助模式':''}`));
    const log=this.el('details','journey-log');log.append(this.el('summary',null,'展开全部行动记录'));
    s.log.forEach(item=>log.append(this.el('p',null,item.label)));w.append(log);
    const comparison=this.el('section','journey-comparison');comparison.append(this.el('h3',null,'平行时空 · 你的推演与真实历史'));
    const player=this.el('div','journey-player-line');player.append(this.el('b',null,'你的推演线 / 虚构小组'));
    (s.customDecisions||[]).forEach(decision=>player.append(this.el('p',null,decision.command),this.el('small',null,decision.explanation)));
    if(!s.customDecisions?.length)player.append(this.el('p',null,'你采用了参考方案；行动与资源变化已记录在本次行记中。'));
    player.append(this.el('p',null,`完成 ${s.cross} 段协作，当前体力 ${s.resource.stamina}、协作 ${s.resource.cooperation}（体验指数）`));const contrast=this.el('div','journey-contrast-grid');contrast.append(player);comparison.append(contrast);w.append(comparison);
    const history=this.el('div','journey-history');history.append(this.el('b',null,'历史档案 / 史实独立于体验结果'),this.el('p',null,'1934年10月，中央红军从中央苏区多地出发，向于都地区集结，并按计划渡过于都河，开始战略转移。你的物资配置与协作评分，不代表真实红军的资源、伤亡或战果。'));
    history.append(this.el('p',null,'对照要点：历史主线是从中央苏区多地出发、于都集结并按计划渡河；你的自由决策体现这段背景下的基层互助，不对应真实部队的部署，也不能用体验评分评价先辈。'));
    const source=this.el('a',null,'中国军网：于都夜渡，远征启航 ↗');source.href='https://www.81.mil.cn/yw_208727/16477938.html';source.target='_blank';source.rel='noopener';history.append(source);contrast.append(history);
    if(!s.feedback)w.append(this.button(this.busy?'正在生成复盘…':'请 AI 点评我的任务记录',()=>this.generateFeedback(),'journey-quiet'));
    if(s.feedback){w.append(this.el('small','journey-muted','教学复盘 · AI内容为虚构演绎，史实参考档案；本地模板会明确注明。'),this.el('p','journey-advice',s.feedback),this.button('朗读这段复盘',()=>GameUI.playNpcVoice('narrator','calm',s.feedback),'journey-quiet'));}
    this.renderChat(w);
    const row=this.el('div','journey-chips');row.append(this.button('保存行记',()=>this.download()),this.button('领取行路纪念，继续征程',()=>this.finish()));w.append(row);
  },
  score(){return Math.max(0,Math.min(100,Math.round(40+this.state.resource.cooperation*.4+this.state.resource.stamina*.15+this.state.actions.length-this.state.misses)));},
  async generateFeedback() {
    if(this.busy)return;this.busy=true;this.render();const session=this.session;
    const raw=await apiRequest('/journey/review',{role:this.state.role,actions:this.state.actions,resources:this.state.resource,events:this.state.events,log:this.state.log,misses:this.state.misses},4000);
    if(session!==this.session||!this.root)return;
    this.busy=false;this.state.feedbackVersion=2;this.state.feedback=raw&&!raw.degraded?raw.text:'本次任务中，你完成了行装配置、岗位协作、行动计划和六段渡河配合。回顾哪些准备节省了体力、哪些互助让行动更顺畅，再想想艰苦行军中团结与坚持的意义。此为本地复盘，不是历史评价。';this.save();this.render();
  },
  finish() {
    if(this.onMarchComplete){
      if(!this.marchCurrent()||this.state.stage!==5||this.state.cross<6)return;
      const done=this.onMarchComplete,s=this.state,score=this.score();
      if(s.finished){this.close(false);done({won:true,score,rating:'完整岗位协作'});return;}
      const sp=GameState.storyPreparations,old={food:GameState.resources.food,morale:GameState.resources.morale,stamina:GameState.stamina,receipt:sp.journey83_receipt,history:sp.journey83_history};
      s.finished=true;
      if(!sp.journey83_receipt&&!(GameState.medalRecords||[]).some(m=>m.nodeId===1)){GameState.resources.food=s.resource.food;GameState.resources.morale=s.resource.morale;GameState.stamina=s.resource.stamina;}
      sp.journey83_receipt ||= {completedAt:new Date().toISOString(),role:s.role};
      sp.journey83_history=[...(Array.isArray(sp.journey83_history)?sp.journey83_history:[]),{score,rating:'完整岗位协作',completedAt:new Date().toISOString(),state:JSON.parse(JSON.stringify(s))}].slice(-10);
      if(!this.save()){s.finished=false;Object.assign(GameState.resources,{food:old.food,morale:old.morale});GameState.stamina=old.stamina;if(old.receipt===undefined)delete sp.journey83_receipt;else sp.journey83_receipt=old.receipt;if(old.history===undefined)delete sp.journey83_history;else sp.journey83_history=old.history;this.message('任务结果未保存，请检查存储空间后重试。');return;}
      this.close(false);GameUI.updateResourceHUD();done({won:true,score,rating:'完整岗位协作'});return;
    }
    if(this.state.finished)return;
    const s=this.state;s.finished=true;this.save();
    GameState.resources.food=s.resource.food;GameState.resources.morale=s.resource.morale;GameState.stamina=s.resource.stamina;
    GameState.battleScores=GameState.battleScores.filter(x=>x.nodeId!==1);GameState.battleScores.push({nodeId:1,score:this.score(),rating:'协作完成'});GameState.save();
    GameUI.completeDungeon(this.node);GameUI.updateResourceHUD();this.close();
  },
  download() {
    const blob=new Blob([JSON.stringify({chapter:'中央苏区出发',role:this.roles[this.state.role].title,...this.state},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='长征星火-第一章行记.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
};
