/* Small, keyboard-accessible chapter puzzles. All numbers describe a fictional exercise. */
const ChapterTasks54={
  supports(id){return [8,9,11,12].includes(Number(id));},
  definitions:{
    8:{title:'雪山互助 · 整理背囊',kind:'pack',intro:'模拟背囊可装 8 格。保障保暖、口粮与联络，兼顾负重。格数只是本次练习规则，不是历史物资数量。',items:[['备用木箱',4,'extra'],['保暖衣物',3,'warm'],['联络清单',1,'signal'],['青稞干粮',3,'food'],['留念石块',2,'extra']],success:'背囊兼顾了保暖、口粮与联络。物资有限时，互助和分工比盲目增加负重更重要。'},
    9:{title:'草地同行 · 核对路线',kind:'route',intro:'已完成分粮。请对照三条模拟观察记录选择下一段行进路线：北侧积水加深；中央有已确认的队伍标记；南侧视线受阻，尚未完成核对。',items:[['北侧近路','积水加深，信息不足'],['中央标记路线','核对标记，结伴通过'],['南侧小径','视线受阻，等待核实']],success:'你选择沿已核对标记结伴前进，并保持前后联络。本次路线为虚构教学场景，不对应真实地理导航。'},
    11:{title:'陕北落脚 · 整理行记',kind:'order',intro:'按本游戏征程先后，依次点选三张行记卡片。排错时可撤回最后一张；完成后继续阅读本章史实。',items:['三大主力会师','中央苏区出发','中央红军到达吴起镇'],answer:[1,2,0],success:'行记先后已理清：1935 年陕北落脚与 1936 年三大主力会师分别记录。接下来核对资料出处与具体日期。'},
    12:{title:'会师相迎 · 协作分工',kind:'match',intro:'为这次虚构接应任务安排岗位。每项工作各有侧重，完成分工后继续核对真实会师史实。',jobs:['核对接应讯息','整理物资发放','照料需要帮助的战友'],roles:['卫生员','报务员','后勤员'],answer:[1,2,0],success:'讯息、物资与照料都有了负责岗位。每个人的工作相互衔接，队伍才能共同前进。'}
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    this.closeActive?.();
    const d=this.definitions[node.id],owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null;
    const current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null);
    const key='challenge54_'+node.id;
    const stored=GameState.storyPreparations?.[key];
    const state={selected:new Set(Array.isArray(stored?.selected)?stored.selected.filter(n=>Number.isInteger(n)&&n>=0&&n<(d.items?.length||0)):[]),order:Array.isArray(stored?.order)?[...new Set(stored.order.filter(n=>Number.isInteger(n)&&n>=0&&n<3))]:[],matches:Array.isArray(stored?.matches)?stored.matches.slice(0,3):[-1,-1,-1]};
    const overlay=document.createElement('div');overlay.id='chapterTask54';overlay.className='learning-overlay open chapter-task54';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',d.title);
    const panel=document.createElement('section');panel.className='task54-panel';overlay.append(panel);
    const title=document.createElement('h2');title.textContent=d.title;title.tabIndex=-1;
    const intro=document.createElement('p');intro.textContent=d.intro;
    const art=document.createElement('div');art.className='task54-art';art.setAttribute('aria-hidden','true');if(typeof ChapterMotion53!=='undefined')art.innerHTML=ChapterMotion53.art(node.id);
    const board=document.createElement('div');board.className='task54-board';
    const status=document.createElement('p');status.className='task54-status';status.setAttribute('role','status');
    const hint=document.createElement('p');hint.className='task54-note';hint.textContent='原创教学模拟，不改变真实历史。学习过程自动保存；清除浏览器数据会丢失本地进度。';
    const actions=document.createElement('div');actions.className='task54-actions';
    const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;return b;};
    const save=()=>{if(!current())return;GameState.storyPreparations||={};GameState.storyPreparations[key]={selected:[...state.selected],order:state.order,matches:state.matches};GameState.save();};
    let solved=false,finished=false;
    const proceed=button('核对并继续',()=>{
      if(!overlay.isConnected||!current()||finished)return;
      if(!solved){status.textContent='请先完成上方任务。'+(d.kind==='pack'?'保暖、口粮、联络都需要照顾，且合计不超过 8 格。':'对照观察记录或岗位职责再检查一次。');return;}
      finished=true;save();close();GameState.recordBattleScore(node.id,90,'协作完成');if(typeof onComplete==='function')onComplete();
    });
    const update=()=>{
      if(d.kind==='pack'){
        const chosen=[...state.selected].map(i=>d.items[i]),total=chosen.reduce((sum,v)=>sum+v[1],0);
        solved=total<=8&&['warm','signal','food'].every(k=>chosen.some(v=>v[2]===k));status.textContent=`已装 ${total} / 8 格。${solved?d.success:total>8?'负重超出，请取舍物资。':'点击卡片装入或取出物资。'}`;
      }else if(d.kind==='route'){solved=state.selected.size===1&&state.selected.has(1);status.textContent=solved?d.success:'选择有已核实观察依据的路线。';}
      else if(d.kind==='order'){solved=state.order.length===3&&state.order.every((v,i)=>v===d.answer[i]);status.textContent=solved?d.success:'当前行记：'+(state.order.map(i=>d.items[i]).join(' → ')||'尚未排列');}
      else{solved=state.matches.length===3&&state.matches.every((v,i)=>v===d.answer[i]);status.textContent=solved?d.success:'每项工作选一个最相符的岗位。';}
      proceed.setAttribute('aria-disabled',String(!solved));save();
    };
    if(d.kind==='pack'||d.kind==='route')d.items.forEach((v,i)=>{
      const b=button(d.kind==='pack'?`${v[0]} · ${v[1]} 格`:`${v[0]}：${v[1]}`,()=>{
        if(!current())return;if(d.kind==='route')state.selected.clear();else if(state.selected.has(i)){state.selected.delete(i);sync();return;}state.selected.add(i);sync();
      });b.dataset.choice=String(i);board.append(b);
    });
    const sync=()=>{board.querySelectorAll('[data-choice]').forEach(b=>{const selected=state.selected.has(Number(b.dataset.choice));b.setAttribute('aria-pressed',String(selected));b.classList.toggle('selected',selected);});update();};
    if(d.kind==='order'){
      d.items.forEach((label,i)=>{const b=button(label,()=>{if(!current()||state.order.includes(i))return;state.order.push(i);b.disabled=true;update();});b.dataset.order=String(i);b.disabled=state.order.includes(i);board.append(b);});
      board.append(button('撤回最后一张',()=>{const i=state.order.pop();const b=board.querySelector(`[data-order="${i}"]`);if(b)b.disabled=false;update();}));
    }
    if(d.kind==='match')d.jobs.forEach((job,i)=>{
      const label=document.createElement('label');label.textContent=job;const select=document.createElement('select');select.setAttribute('aria-label',job);
      ['请选择岗位',...d.roles].forEach((name,k)=>{const option=document.createElement('option');option.value=String(k-1);option.textContent=name;select.append(option);});select.value=String(state.matches[i]??-1);
      select.onchange=()=>{state.matches[i]=Number(select.value);update();};label.append(select);board.append(label);
    });
    const trigger=document.activeElement;
    const escape=e=>{if(e.key==='Escape'&&document.querySelector('.decision-cinema-overlay'))return;if(e.key==='Escape'){e.preventDefault();close();}};
    const close=()=>{document.removeEventListener('keydown',escape);overlay.remove();if(this.closeActive===close)this.closeActive=null;if(trigger?.isConnected)trigger.focus();};
    this.closeActive=close;
    actions.append(button('保存并返回地图',()=>{save();close();}),proceed);
    panel.append(title,intro,art,board,status,hint,actions);document.body.append(overlay);document.addEventListener('keydown',escape);sync();title.focus();
    return true;
  }
};
