/* Noncombat teaching models. No damage, stamina, weapons, enemy spawning or resources invented. */
(() => {
  'use strict';
  function definition(row) {
    const kind=row.mechanic || 'dispatch';
    const routeLabels=({4:['分组集结点','渡口观察点','沿岸联络点','已确认的接应岸'],5:['出发队列','渡运候行点','接应联络点','对岸交接处'],8:['山脚集结点','背风观察处','同伴互助点','山路接应处'],9:['营地出发处','草甸观察点','同伴接应点','已确认的营地'],11:['队列集结点','路口观察点','联络接应处','吴起镇交接处'],12:['出发集结处','行程观察点','同伴会合点','会师交接处']})[row.chapterId]||['出发点','沿途观察点','同伴接应点','交接处'];
    if(kind==='route')return {kind,title:row.title,clues:['先查看沿途标记，标有断路的通道暂不通行。','联络点已约定接应，经过后再同行抵达交接处。路线为原创研学习作，不是历史地图复原。'],
      nodes:[{id:'start',label:routeLabels[0],next:['bank','broken']},{id:'bank',label:routeLabels[1],next:['aid','short']},{id:'broken',label:'断路 · 尚未修复',blocked:true,next:['goal']},
        {id:'short',label:'近路 · 未见接应标记',blocked:true,next:['goal']},{id:'aid',label:routeLabels[2],next:['goal']},{id:'goal',label:routeLabels[3],next:[]}],required:['aid']};
    const assemblyLabels=({2:['检查接应地点','固定携行物件','整理接应通道','互助试行并交接'],6:['检查桥台与浮件','复核连接位置','整理通行铺面','试行检查并交接'],7:['检查两侧支承','固定连接与互相复核','整理桥板通道','试行检查并完成交接'],10:['观察通路与联络标记','复核携行绳连接','整理山路携行通道','确认接应信号并交接']})[row.chapterId]||['检查两侧支承','固定连接与互相复核','整理携行通道','试行检查并完成交接'];
    if(kind==='assembly')return {kind,title:row.title,clues:['依次进行观察检查、连接复核、通路整理与同行验收。','准备未确认前，不能直接交接通行；这些是原创基层协作操作，不模拟历史战斗。'],
      parts:[{id:'inspect',label:assemblyLabels[0],requires:[]},{id:'secure',label:assemblyLabels[1],requires:['inspect']},{id:'deck',label:assemblyLabels[2],requires:['secure']},{id:'check',label:assemblyLabels[3],requires:['deck']}]};
    if(kind==='rhythm')return {kind,title:row.title,clues:['看清领拍标记后按下对应节拍。','没有限时，不比速度；错拍可重新组织。'],pattern:['左','右','同心','左','同心','右']};
    if(kind==='evidence')return {kind,title:row.title,clues:['先看材料从哪里来：有出处的档案原文归入“史料资料”，本作编写的对白归入“创作表达”，你自己的观察与疑问归入“玩家记录”。','资料整理服务于理解，不由玩家改变会议结论。'],
      legend:{'史料资料':'有出处的档案、日期、地点与原文','创作表达':'本作编写的对白、场景与人物语言','玩家记录':'你亲眼观察、记录或仍待核对的问题'},
      cards:[{id:'fact',label:'本章既有史实档案原文',category:'史料资料',hint:'材料来自已有档案，标明日期、地点与出处'},{id:'dialogue',label:'本组岗位协作的创作对白',category:'创作表达',hint:'这段交谈由本作编写，用于还原岗位协作情境'},{id:'note',label:'你自己的研学观察记录',category:'玩家记录',hint:'这是你在本章记下的观察、疑问与待核对事项'}],categories:['史料资料','创作表达','玩家记录']};
    return {kind:'dispatch',title:row.title,clues:['每趟携行不超过三份教学物件；这是练习单位，不是历史物资数量。','两处均完成清点才交接；照料用品交给接应组，工具交给修整组。'],capacity:3,
      cargo:[{id:'aid-a',label:'照料用品甲',weight:2,destination:'接应组'},{id:'tool-a',label:'修整工具甲',weight:1,destination:'修整组'},
        {id:'aid-b',label:'照料用品乙',weight:1,destination:'接应组'},{id:'tool-b',label:'修整工具乙',weight:2,destination:'修整组'}],destinations:['接应组','修整组']};
  }
  function create(d,progress) {
    const s={kind:d.kind,done:[],selected:[],route:['start'],assignments:{},beats:[],moves:0,feedback:'先查看线索，再安排当前工作。'};
    if(progress && progress.kind===d.kind){
      s.done=Array.isArray(progress.done)?progress.done.filter(id=>[...(d.cargo||[]),...(d.parts||[])].some(p=>p.id===id)):[];
      s.route=['start'];for(const id of Array.isArray(progress.route)?progress.route.slice(1):[]){const p=d.nodes?.find(n=>n.id===s.route.at(-1)),n=d.nodes?.find(n=>n.id===id);if(!p?.next.includes(id)||n?.blocked)break;s.route.push(id);}
      s.beats=Array.isArray(progress.beats)?progress.beats.filter((v,i)=>d.pattern?.[i]===v).slice(0,d.pattern?.length):[];
      for(const c of d.cards||[])if(d.categories.includes(progress.assignments?.[c.id]))s.assignments[c.id]=progress.assignments[c.id];
    }return s;
  }
  function solved(d,s){
    if(d.kind==='route')return s.route.at(-1)==='goal' && d.required.every(id=>s.route.includes(id));
    if(d.kind==='assembly')return d.parts.every(p=>s.done.includes(p.id));
    if(d.kind==='rhythm')return d.pattern.length===s.beats.length && d.pattern.every((v,i)=>v===s.beats[i]);
    if(d.kind==='evidence')return d.cards.every(c=>s.assignments[c.id]===c.category);
    return d.cargo.every(c=>s.done.includes(c.id));
  }
  function act(d,s,action){
    if(d.kind==='route'){
      const current=d.nodes.find(n=>n.id===s.route.at(-1)),next=d.nodes.find(n=>n.id===action.id);
      if(!current?.next.includes(action.id)||!next||next.blocked){s.feedback='此处尚无可通行条件，先回到已确认的道路。';return false;}
      s.route.push(action.id);
    }else if(d.kind==='assembly'){
      const p=d.parts.find(v=>v.id===action.id);if(!p||s.done.includes(p.id)||!p.requires.every(id=>s.done.includes(id))){s.feedback='还缺少前一道协作，请先检查支承与连接。';return false;}s.done.push(p.id);
    }else if(d.kind==='rhythm'){
      if(action.id!==d.pattern[s.beats.length]){s.feedback='这一拍没有对齐，可撤回或重新组织。';return false;}s.beats.push(action.id);
    }else if(d.kind==='evidence'){
      if(!d.cards.some(c=>c.id===action.id)||!d.categories.includes(action.category))return false;s.assignments[action.id]=action.category;
    }else {
      const cargo=(action.ids||[]).map(id=>d.cargo.find(c=>c.id===id));
      if(!cargo.length||new Set(action.ids).size!==cargo.length||cargo.some(c=>!c||s.done.includes(c.id))||cargo.reduce((sum,c)=>sum+c.weight,0)>d.capacity){s.feedback='请重新核对本趟物件与携行份数。';return false;}
      if(cargo.some(c=>c.destination!==action.destination)){s.feedback='本趟交接对象不同，请分开安排。';return false;}
      s.done.push(...action.ids);s.selected=[];
    }
    s.moves++;s.feedback=solved(d,s)?'各项已核对，可确认交接。':'已记下本次安排，继续完成其余工作。';return true;
  }
  async function start(row,signal,{progress={},checkpoint=()=>{}}={}){
    const d=definition(row),{el,button,dialog}=window.CZMarchUI,box=dialog(row.title,signal),decisionHost=el('div');let s=create(d,progress),history=[],result={status:'cancelled'};
    const save=()=>checkpoint(JSON.parse(JSON.stringify(s)));
    const apply=a=>{const old=JSON.parse(JSON.stringify(s));if(act(d,s,a))history.push(old);save();render();};
    function render(){
      box.body.replaceChildren();box.foot.replaceChildren();box.body.append(el('small','原创协作练习 · 不复现战斗，不改变重大历史结果','march83-label'));
      const clues=el('aside',undefined,'march83-clues');for(const c of d.clues)clues.append(el('p',c));box.body.append(clues);
      let next='各项已核对，点击下方「核对并确认交接」。',recommended='';
      const correct=d.kind==='evidence'?d.cards.filter(c=>s.assignments[c.id]===c.category).length:0;
      if(!solved(d,s)){
        if(d.kind==='dispatch'){const item=d.cargo.find(c=>!s.done.includes(c.id));recommended=item?.label||'';next=item?`选择「${item.label}」，再点击「交给${item.destination}」。`:next;}
        else if(d.kind==='assembly'){const item=d.parts.find(p=>!s.done.includes(p.id)&&p.requires.every(id=>s.done.includes(id)));recommended=item?.label||'';next=item?`下一步：${item.label}。完成后再处理后续连接。`:'请先撤回，核对支承顺序。';}
        else if(d.kind==='route'){const current=d.nodes.find(n=>n.id===s.route.at(-1)),candidates=(current?.next||[]).map(id=>d.nodes.find(n=>n.id===id)).filter(n=>n&&!n.blocked);const nextNode=candidates.find(n=>n.id==='bank'&&!s.route.includes('bank'))||candidates.find(n=>n.id==='aid')||candidates.find(n=>n.id==='goal')||candidates[0];recommended=nextNode?.label||'';next=nextNode?`先观察路况，再选择「${nextNode.label}」。`:'请撤回或重新练习，重新确认行走顺序。';}
        else if(d.kind==='rhythm'){recommended=d.pattern[s.beats.length];next=`下一拍：${recommended}。按顺序完成余下节奏。`;}
        else{const card=d.cards.find(c=>s.assignments[c.id]!==c.category);next=card?`下一项：为「${card.label}」选择归档位置。全部归对后再确认交接。`:'请为三份材料选择归档位置。';}
      }
      const instruction=el('aside',next,'march89-action-hint');instruction.setAttribute('role','status');box.body.append(instruction);
      const progressText=d.kind==='dispatch'?`携行交接 ${s.done.length} / ${d.cargo.length} 件`
        :d.kind==='assembly'?`协作步骤 ${s.done.length} / ${d.parts.length} 道`
        :d.kind==='rhythm'?`节拍对齐 ${s.beats.length} / ${d.pattern.length} 拍`
        :d.kind==='route'?`已确认 ${Math.max(0,s.route.length-1)} 段通路`
        :`资料归档 ${correct} / ${d.cards.length}`;
      const progress=el('p',progressText,'march89-task-progress');progress.dataset.taskProgress='';progress.setAttribute('aria-live','polite');box.body.append(progress);
      if(d.kind==='evidence'){
        const legend=el('aside',undefined,'march87-legend');legend.append(el('strong','归档图例'));
        for(const cat of d.categories){const rowText=el('p');rowText.append(el('b',cat+'：'),document.createTextNode(d.legend?.[cat]||''));legend.append(rowText);}
        box.body.append(legend);
      }
      const work=el('div',undefined,'march83-work');
      if(d.kind==='dispatch'){
        for(const c of d.cargo){const b=button(`${s.done.includes(c.id)?'已交接 · ':s.selected.includes(c.id)?'已选 · ':''}${c.label} / ${c.weight}份`,()=>{s.selected=s.selected.includes(c.id)?s.selected.filter(id=>id!==c.id):[...s.selected,c.id];render();});b.disabled=s.done.includes(c.id);b.setAttribute('aria-pressed',String(s.selected.includes(c.id)));work.append(b);}
        box.body.append(el('p',`本趟 ${s.selected.reduce((a,id)=>a+d.cargo.find(c=>c.id===id).weight,0)} / ${d.capacity} 份`));
        for(const dest of d.destinations)work.append(button('交给'+dest,()=>apply({ids:s.selected,destination:dest})));
      }else if(d.kind==='route'){
        work.append(el('p','已走过：'+s.route.map(id=>d.nodes.find(n=>n.id===id).label).join(' → ')));
        for(const id of d.nodes.find(n=>n.id===s.route.at(-1)).next){const n=d.nodes.find(n=>n.id===id);work.append(button(n.label,()=>apply({id})));}
      }else if(d.kind==='assembly')for(const p of d.parts){const b=button((s.done.includes(p.id)?'已完成 · ':'')+p.label,()=>apply({id:p.id}));b.disabled=s.done.includes(p.id);work.append(b);}
      else if(d.kind==='rhythm'){work.append(el('p',d.pattern.map((v,i)=>i<s.beats.length?'●':v).join('  ·  ')));for(const id of ['左','右','同心'])work.append(button(id,()=>apply({id})));}
      else for(const c of d.cards){
        const card=el('label',undefined,'march87-evidence-card');card.dataset.card=c.id;
        card.append(el('strong',c.label));if(c.hint)card.append(el('small',c.hint));
        const select=el('select');select.className='march87-select';select.setAttribute('aria-label',c.label+'的资料类别');
        if(!s.assignments[c.id]){select.classList.add('march87-select-missing');select.setAttribute('aria-invalid','true');}
        else if(s.assignments[c.id]!==c.category){select.classList.add('march87-select-wrong');select.setAttribute('aria-invalid','true');}
        select.append(new Option('请选择归档位置',''));
        const optionHint={'史料资料':'档案原文与出处','创作表达':'本作编写的对白','玩家记录':'你的观察与疑问'};
        for(const cat of d.categories)select.append(new Option(cat+' · '+(optionHint[cat]||''),cat));
        select.value=s.assignments[c.id]||'';select.onchange=()=>apply({id:c.id,category:select.value});card.append(select);work.append(card);
      }
      if(recommended)for(const b of work.querySelectorAll('button'))if(b.textContent.includes(recommended)&&!b.disabled)b.dataset.recommended='true';
      box.body.append(work);const feedback=el('p',s.feedback,'march89-task-feedback');feedback.setAttribute('role','status');box.body.append(feedback);
      box.body.append(decisionHost);
      if(!decisionHost.childElementCount)try{window.CZMarchDecision?.attach(decisionHost,row);}catch(error){console.info('[march-decision]',error);}
      const undo=button('撤回安排',()=>{if(history.length){s=history.pop();save();render();}});undo.disabled=!history.length;
      box.foot.append(undo,button('重新练习',()=>{s=create(d);history=[];save();render();}));
      const finish=button('核对并确认交接',()=>{
        if(!solved(d,s)){
          const gap=d.kind==='evidence'?d.cards.find(c=>s.assignments[c.id]!==c.category):null;
          if(gap){
            const assigned=s.assignments[gap.id];
            feedback.textContent=assigned?`「${gap.label}」现在归入“${assigned}”，请按图例改为“${gap.category}”。`:`还差一项：请为「${gap.label}」选择归档位置。`;
            feedback.dataset.invalid='true';feedback.setAttribute('role','alert');
            const card=work.querySelector(`[data-card="${gap.id}"]`),select=card?.querySelector('select');
            select?.classList.add('march87-select-wrong');select?.setAttribute('aria-invalid','true');
            card?.scrollIntoView?.({block:'center',behavior:'smooth'});select?.focus({preventScroll:true});
            return;
          }
          s.feedback='还有工作未完成，请对照线索继续安排。';render();return;
        }
        if(signal.aborted)return;result={status:'completed',moves:s.moves};box.d.close();
      });box.foot.append(finish);
    }
    render();return new Promise(resolve=>box.d.addEventListener('close',()=>resolve(result),{once:true}));
  }
  window.CZMarchCooperation={definition,create,act,solved,start};
})();
