/* Finite, replayable fictional decisions. No historical outcomes or hidden random deaths. */
const PressureCore={
  create(nodeId,resources={},timed=true){return {version:1,nodeId:Number(nodeId),round:0,timed,remaining:45,minutes:0,resources:{supplies:Math.max(0,Math.min(100,(Number.isFinite(Number(resources.food))?Number(resources.food):65))),stamina:Math.max(0,Math.min(100,(Number.isFinite(Number(resources.stamina))?Number(resources.stamina):75))),trust:50,uncertainty:50},history:[],done:false};},
  preview(state,choice,counter=0){
    const effects={...choice.effects};if(counter>0)effects.uncertainty=(effects.uncertainty||0)+counter;
    const resources={};for(const key of ['supplies','stamina','trust','uncertainty'])resources[key]=Math.max(0,Math.min(100,state.resources[key]+(effects[key]||0)));
    return {resources,minutes:state.minutes+(effects.minutes||0),effects};
  },
  commit(state,scenario,ids,{text='',mode='fixed',timeout=false,counter=0,expectedRound=state.round}={}){
    if(expectedRound!==state.round||state.done||state.round>=scenario.rounds.length)return null;
    const step=scenario.rounds[state.round],unique=[...new Set(ids)].slice(0,2),choices=unique.map(id=>step.choices.find(c=>c.id===id)).filter(Boolean);
    if(!timeout&&!choices.length)return null;
    const effects=timeout?{supplies:-3,stamina:-4,trust:-2,uncertainty:6,minutes:30}:{};
    if(!timeout)for(const choice of choices)for(const [key,value] of Object.entries(choice.effects))effects[key]=(effects[key]||0)+value;
    if(!timeout&&choices.length>1)for(const key of Object.keys(effects))effects[key]=Math.round(effects[key]*.7);
    const before={resources:{...state.resources},minutes:state.minutes};const next=this.preview(state,{effects},counter);
    const row={round:state.round+1,ids:unique,command:text||choices.map(c=>c.label).join('，')||'错过窗口后，先稳住小组核对情况',mode,timeout,before,after:{resources:next.resources,minutes:next.minutes},effects:next.effects,alternatives:step.choices.filter(c=>!unique.includes(c.id)).map(c=>({label:c.label,...this.preview(state,c,counter)}))};
    state.resources=next.resources;state.minutes=next.minutes;state.history.push(row);state.round++;state.remaining=45;state.done=state.round>=scenario.rounds.length;return row;
  },
  score(state){const r=state.resources;return Math.max(0,Math.min(100,Math.round(r.trust*.25+r.stamina*.2+r.supplies*.2+(100-r.uncertainty)*.35-Math.max(0,state.minutes-60))));},
  validate(saved,nodeId){return saved?.version===1&&saved.nodeId===Number(nodeId)&&Number.isInteger(saved.round)&&saved.round>=0&&saved.round<=3&&Array.isArray(saved.history)&&saved.history.length===saved.round&&saved.history.every(r=>r&&Number.isInteger(r.round)&&r.before?.resources&&r.after?.resources&&Array.isArray(r.alternatives)&&r.alternatives.every(b=>b&&typeof b.label==='string'&&b.resources&&b.effects&&Number.isFinite(b.minutes))&&r.effects)&&Number.isFinite(saved.minutes)&&saved.minutes>=0&&saved.resources&&['supplies','stamina','trust','uncertainty'].every(k=>Number.isFinite(saved.resources[k])&&saved.resources[k]>=0&&saved.resources[k]<=100)&&Number.isFinite(saved.remaining)&&saved.remaining>=0&&saved.remaining<=45;}
};
