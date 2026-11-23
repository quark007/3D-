/* Original soldiers, budget and assessment function; reversible allocation, no casualties or repeated bonus. */
(() => {
  'use strict';
  function normalize(soldiers,raw,max){return Object.fromEntries(soldiers.map(s=>[s.id,Number.isFinite(raw?.[s.id])?Math.max(0,Math.min(max,Math.floor(raw[s.id]))):0]));}
  function validate(soldiers,allocations,total,max){const values=soldiers.map(s=>allocations[s.id]);return values.every(v=>Number.isInteger(v)&&v>=0&&v<=max)&&values.reduce((a,b)=>a+b,0)>0&&values.reduce((a,b)=>a+b,0)<=total;}
  async function start(row,signal,{progress={},checkpoint=()=>{}}={}){
    const env=window.CZMarchEnv(),{el,button,dialog}=window.CZMarchUI,{d,body,foot}=dialog(row.title,signal),soldiers=env.rationSoldiers,total=env.rationTotal,max=env.rationMax;
    const preparations=env.state.storyPreparations,role=env.story.role();let allocations=normalize(soldiers,progress.allocations,max),result={status:'cancelled'};const status=el('p');status.setAttribute('role','status');
    body.append(el('small','原创分粮练习 · 份数沿用原游戏规则，不代表历史实物数量'),el('p','按已有队伍资料安排本次分配；可撤回、调整。这里记录协作方案，不执行原战斗减员效果。'));
    if(!soldiers.length || !Number.isFinite(total) || total<=0){body.append(el('p','当前没有可用于分配的教学份额，可返回场景继续其他协作。'));return new Promise(resolve=>d.addEventListener('close',()=>resolve(result),{once:true}));}
    const controls=[];const update=()=>{status.textContent='已安排 '+Object.values(allocations).reduce((a,b)=>a+b,0)+' / '+total+' 份';checkpoint({allocations:{...allocations}});};
    for(const s of soldiers){const label=el('label',s.name+' · '+s.statusLabel),input=el('input'),value=el('output',String(allocations[s.id]));input.type='range';input.min='0';input.max=String(max);input.step='1';input.value=String(allocations[s.id]);input.setAttribute('aria-label','给'+s.name+'安排的青稞面份数');input.oninput=()=>{const before=allocations[s.id];allocations[s.id]=Number(input.value);if(Object.values(allocations).reduce((a,b)=>a+b,0)>total){allocations[s.id]=before;input.value=String(before);status.textContent='份额超出当前总量，请调整后再分配。';return;}value.textContent=String(allocations[s.id]);update();};label.className='march83-ration-row';label.append(input,value);body.append(label);controls.push({input,value,id:s.id});}
    body.append(status);update();
    try{window.CZMarchDecision?.attach(body,row);}catch(error){console.info('[march-decision]',error);}
    foot.append(button('清空重新分配',()=>{allocations=normalize(soldiers,{},max);for(const c of controls){c.input.value='0';c.value.textContent='0';}update();}),button('核对并保存分配',()=>{
      if(signal.aborted || env.owner!==window.CZMarchEnv().owner||env.state.storyPreparations!==preparations||env.story.role()!==role||!env.state.character)return;
      if(!validate(soldiers,allocations,total,max)){status.textContent='请在当前份额内至少安排一份，再核对保存。';return;}
      const feedback=env.ui.calcRationResult(allocations),before=env.state.rationRecords;
      const record={nodeId:row.chapterId,allocations:{...allocations},result:feedback.title,achievement:feedback.achievement||null,effects:{troops:0,morale:0},learningOnly:true};
      if(!window.CZMarchSave.transact(()=>{env.state.rationRecords=[...(before||[]).filter(r=>r.nodeId!==row.chapterId),record];},env.owner)){env.state.rationRecords=before;status.textContent='分配未能保存，请检查存储后重试。';return;}
      result={status:'completed',allocations:{...allocations}};d.close();
    }));
    return new Promise(resolve=>d.addEventListener('close',()=>resolve(result),{once:true}));
  }
  window.CZMarchRation={normalize,validate,start};
})();
