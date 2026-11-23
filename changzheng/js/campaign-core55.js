/* Pure teaching simulation. No historical outcome, death count or real enemy location is changed. */
const CampaignCore55={
  roles:['signal','logistics','care','action'],
  paces:{night:{label:'夜行隐蔽',stamina:-6,food:-3,morale:0,pressure:-4,time:2},day:{label:'白昼协作',stamina:-3,food:-2,morale:1,pressure:3,time:1},rest:{label:'原地休整',stamina:8,food:-6,morale:3,pressure:5,time:4}},
  choices:{verify:{text:'先核验再行动',stamina:-2,food:-3,morale:1,trust:8,time:3},mutual:{text:'优先照应体弱战友',stamina:-4,food:-2,morale:6,trust:2,time:2},swift:{text:'压缩准备时间，保持联络',stamina:-7,food:-1,morale:-2,trust:-3,time:1}},
  routes:[['清点集中携行','分组协助转运'],['沿岸核验接应','分组护送转移'],['先核对出处','先汇总再交叉研判'],['核验联络点','分散接应转运'],['渡口讯息核对','岸侧物资转运'],['观察联络协作','分组接应协作'],['桥头通联协作','岸侧转运保障'],['核对携行物资','结伴分担负重'],['核对路线标记','分段联络互助'],['山口联络接应','分组转运保障'],['先整理行记','先互助安顿'],['先核对接应讯息','先分组保障接应']],
  num(v,min,max,fallback=0){return typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;},
  draft(node){return {node,route:0,pace:'day',choice:'verify',custom:'',alloc:{signal:3,logistics:3,care:3,action:3},verified:[],adopted:[],countermove:false,support:false,useReserve:false,committed:false,settled:false};},
  falseIntel(node,index){return [node*3%5,(node*3+2)%5].includes(index);},
  normalize(raw){
    const s={version:1,plans:{},history:[],pressure:15,trust:50,reserves:0,reserveGrants:{},elapsed:0};
    if(!raw||typeof raw!=='object')return s;
    for(const k of ['pressure','trust'])s[k]=this.num(raw[k],0,100,s[k]);s.reserves=this.num(raw.reserves,0,6);s.elapsed=this.num(raw.elapsed,0,10000);
    for(let node=1;node<=12;node++){
      const v=raw.plans?.[node];if(!v||typeof v!=='object')continue;
      const d=this.draft(node);d.route=v.route===1?1:0;d.pace=Object.hasOwn(this.paces,v.pace)?v.pace:'day';d.choice=Object.hasOwn(this.choices,v.choice)?v.choice:'verify';d.custom=String(v.custom||'').slice(0,300);
      for(const role of this.roles)d.alloc[role]=Math.floor(this.num(v.alloc?.[role],0,12,3));
      if(Object.values(d.alloc).reduce((a,b)=>a+b,0)>12)d.alloc={signal:3,logistics:3,care:3,action:3};
      d.verified=[...new Set(Array.isArray(v.verified)?v.verified.filter(n=>Number.isInteger(n)&&n>=0&&n<5):[])].slice(0,2);
      d.adopted=[...new Set(Array.isArray(v.adopted)?v.adopted.filter(n=>Number.isInteger(n)&&n>=0&&n<5):[])];
      for(const key of ['countermove','support','useReserve','committed','settled'])d[key]=v[key]===true;s.plans[node]=d;
    }
    s.history=(Array.isArray(raw.history)?raw.history:[]).filter(v=>v&&Number.isInteger(v.node)&&v.node>=1&&v.node<=12&&['intel','mobility'].includes(v.intent)).slice(-12).map(v=>({node:v.node,intent:v.intent,choice:Object.hasOwn(this.choices,v.choice)?v.choice:'verify',route:v.route===1?1:0,summary:String(v.summary||'').slice(0,200)}));
    for(let n=1;n<=12;n++)if(raw.reserveGrants?.[n]===true)s.reserveGrants[n]=true;
    return s;
  },
  counter(state,node){
    const h=state.history.filter(r=>r.node<node).slice(-2);
    if(h.length===2&&h[0].node!==h[1].node&&h[0].intent===h[1].intent)return {active:true,intent:h[1].intent,label:h[1].intent==='intel'?'对手投放未经核实的转述，试图利用你的核验习惯':'对手提高接应点压力，试图针对你的转运习惯'};
    return {active:false,intent:'',label:'尚未连续暴露同一种安排；保持核验与互助。'};
  },
  quote(state,draft){
    const d=this.normalize({plans:{[draft.node]:draft}}).plans[draft.node],pace=this.paces[d.pace],choice=this.choices[d.choice];
    const intent=d.route===0?'intel':'mobility',counter=this.counter(state,d.node),prior=state.history.filter(r=>r.node<d.node).at(-1);
    const uncertain=d.adopted.filter(i=>this.falseIntel(d.node,i)).length;
    const countered=counter.active&&counter.intent===intent&&!d.countermove;
    const risk=Math.max(0,uncertain*4+(countered?6:0)+Math.floor(state.pressure/25)-Math.min(3,d.alloc.signal)-(d.countermove?3:0));
    const reserve=d.useReserve&&state.reserves>0?1:0;
    const support=!!prior&&prior.choice==='mutual'&&d.support;
    const stamina=pace.stamina+choice.stamina+Math.min(6,d.alloc.care)-Math.max(0,risk-reserve*3)+(support?2:0)-(d.route===0?1:3);
    const food=pace.food+choice.food+Math.min(3,d.alloc.logistics)-Math.ceil(d.alloc.care/3)-(d.route===1?1:0);
    const morale=pace.morale+choice.morale+(d.alloc.action>=3?2:0)-(uncertain?2:0);
    const trust=choice.trust+d.verified.filter(i=>!this.falseIntel(d.node,i)).length*2-uncertain*6+(d.route===0?3:0);
    const total=Object.values(d.alloc).reduce((a,b)=>a+b,0);
    return {intent,risk,countered,reserve,support,stamina,food,morale,trust,banked:12-total,pressure:pace.pressure+(countered?5:0)-(d.countermove?3:0)-(d.route===1?2:0),time:pace.time+choice.time+(d.countermove?2:0)+(support?1:0)+(d.route===0?2:1),valid:total>=8&&d.adopted.length>=2,route:this.routes[d.node-1][d.route],choice:d.choice};
  },
  settle(state,node,resources,stamina){
    const d=state.plans[node];if(!d?.committed||d.settled)return null;
    const q=this.quote(state,d);if(!q.valid)return null;
    const before={food:resources.food,morale:resources.morale,stamina};
    for(const k of ['food','morale'])resources[k]=this.num(Number(resources[k])+q[k],0,100,50);
    const nextStamina=this.num(stamina+q.stamina,0,100,50);
    state.pressure=this.num(state.pressure+q.pressure,0,100);state.trust=this.num(state.trust+q.trust,0,100);state.reserves=Math.min(6,Math.max(0,state.reserves-q.reserve)+q.banked);state.elapsed+=q.time;d.settled=true;
    const row={node,intent:q.intent,route:d.route,choice:d.choice,summary:`${q.route}；${this.choices[d.choice].text}。体力${nextStamina-before.stamina>=0?'+':''}${nextStamina-before.stamina}、补给${resources.food-before.food>=0?'+':''}${resources.food-before.food}、士气${resources.morale-before.morale>=0?'+':''}${resources.morale-before.morale}；模拟压力${state.pressure}。`};
    state.history=state.history.filter(r=>r.node!==node);state.history.push(row);state.history=state.history.slice(-12);
    return {stamina:nextStamina,row,quote:q,delta:{stamina:nextStamina-before.stamina,food:resources.food-before.food,morale:resources.morale-before.morale}};
  }
};
if(typeof module!=='undefined'&&module.exports)module.exports=CampaignCore55;
