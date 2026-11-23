/* A local-only presentation switch; never pretends that software isolation is a physical disconnect. */
const SilentRadio65={
 isolated:false,lastSource:'尚未请求',samples:[],budget:30000,
 offline(){return this.isolated||navigator.onLine===false;},
 stamp(path,source,started){const row={path,source,elapsed_ms:Math.round(performance.now()-started),at:new Date().toISOString()};this.samples.push(row);if(this.samples.length>100)this.samples.shift();this.lastSource=source;this.refresh();return row;},
 refresh(){const bar=document.getElementById('radio65-status');if(!bar)return;bar.hidden=!this.offline();const network=navigator.onLine===false?'浏览器报告离线':this.isolated?'云端请求已隔离（网络仍在线）':'网络在线';bar.textContent=`静默电台 · ${network} · 本次来源：${this.lastSource} · 模型${typeof EdgeBridge42!=='undefined'&&EdgeBridge42.ready?'已就绪':'未准备，使用规则库'}`;document.body.classList.toggle('radio65-active',this.offline());},
 async explain(npc,message,scene,history){
  if(typeof EdgeBridge42==='undefined'||!EdgeBridge42.ready)return null;
  let timer;try{return await Promise.race([EdgeBridge42.fallback(npc,String(message).slice(0,300),scene,history||[]),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),this.budget);})]);}catch{return null;}finally{clearTimeout(timer);}
 },
 rule(message){
  const text=String(message||'');if(/时间|日期|会议|历史|斯诺|人数|伤亡|多少里/.test(text))return '具体日期、人数与史实请查看本章带出处的档案；这里的对话是研学创作，不补写未核实的历史。';
  if(/伤|疲|累|冷|困|拿不准|怎么办/.test(text))return '先停下核对眼前条件，向负责的同志报告，再与同伴商量照料、负重和联络。不要独自硬撑，也不把尚未确认的事当成结果。';
  if(/粮|水|补给|物资/.test(text))return '先按清单核对已有物资与缺项，再商量携行和交接；留给谁、由谁接手都记清楚。未交接的物资不能写成已经送到。';
  return '先说清本组任务、已经核对的条件和仍存疑的地方，再约好分工与求助信号。当前回复来自本机规则库，不是大模型推理或真实历史人物原话。';
 },
 async request(path,body={},signal){
  const started=performance.now();if(signal?.aborted)return null;
  if(path.startsWith('/media/')||path.startsWith('/experience/')||path.startsWith('/strategy/')){this.stamp(path,'本章固定映射 / 规则',started);return null;}
  const message=body.message||body.command||body.player_message||body.proposal||'请结合当前协作任务给出简短、克制的研学建议，不提供没有出处的历史数字。';
  const edge=await this.explain(body.npcId||'narrator',message,body.scene||'suqu_chufa',body.history);if(signal?.aborted)return null;
  const source=edge?.text?'端侧模型推理':'本机规则 / 档案';this.stamp(path,source,started);
  const meta={offlineWitness:true,mode:edge?.text?'edge':'local',degraded:!edge?.text,source_label:source};
  const text=edge?.text||this.rule(message);
  if(path==='/npc/chat')return {...meta,text,mood:'neutral',references:[],aiLabel:source+' · 研学创作，非史料'};
  if(path==='/battle/parse'){const plan=typeof GameUI!=='undefined'?GameUI.localParseCommand(String(message)):null;return plan?{...plan,...meta,semantic_note:text}:null;}
  if(path==='/time/mailbox')return {...meta,reply:text,text,is_snow:false};
  // Existing deterministic result/causal engines remain the authority. Generated
  // prose never invents a score, casualty, timeline or historical quotation.
  return null;
 },
 open(){
  const d=Education43.dialog('静默电台 · 离线见证');d.classList.add('radio65-panel');const p=Education43.el('p','首次展演请先联网/连接本地服务准备模型。开启后只隔离本页云端AI请求，不更改电脑网络；真正断网时状态条会显示“浏览器报告离线”。刷新离线页面还需要事先缓存网页资源。');
  const status=Education43.el('p','模型尚未准备。固定剧情、规则解析与史料卡不依赖云端。');status.setAttribute('role','status');
  const confirm=Education43.el('label'),check=document.createElement('input');check.type='checkbox';confirm.append(check,document.createTextNode('我正在展演，确认本页AI请求停止发送到云端。'));
  const backup=Education43.el('label'),rules=document.createElement('input');rules.type='checkbox';backup.append(rules,document.createTextNode('模型未就绪时允许规则库演示，并明确标注为规则。'));
  const prep=Education43.button('准备本机模型',async()=>{prep.disabled=true;status.textContent='正在准备本机模型；进度可在模型窗口查看，尚未进入隔离模式。';EdgeBridge42.open();const ok=await EdgeBridge42.prepare();status.textContent=ok?'模型已就绪：本页可断网测试。':'模型未准备成功；可重试，或明确选择规则库演示。';prep.disabled=false;});
  const enable=Education43.button('开启离线见证',()=>{if(!check.checked){status.textContent='请先确认展演用途。';return;}if(!EdgeBridge42.ready&&!rules.checked){status.textContent='请准备模型，或明确选择规则库演示。';return;}this.isolated=true;this.lastSource=EdgeBridge42.ready?'端侧模型待测':'本机规则待测';this.refresh();status.textContent='云端隔离已开启。网络实际是否断开以状态条为准。';});
  const off=Education43.button('结束展演 · 恢复联网选择',()=>{this.isolated=false;this.refresh();status.textContent='已结束人工隔离；仍实际离线时继续使用本地路径。';});
  const input=document.createElement('input');input.placeholder='问一句与当前协作相关的话';input.maxLength=300;input.value='同志们走得很累，怎样分担物资和互相照应？';
  const answer=Education43.el('p');answer.setAttribute('role','status');
  const send=Education43.button('发送本机测试电文',async()=>{if(!this.offline()){answer.textContent='请先开启展演隔离，或实际断网。';return;}send.disabled=true;answer.textContent='正在本机处理，可继续固定剧情；最长等待14秒后转规则并标注来源。';const r=await this.request('/npc/chat',{npcId:'wang_gui',message:input.value,scene:'suqu_chufa'});if(answer.isConnected)answer.textContent=`[${r?.source_label||'取消'}] ${r?.text||''}`;send.disabled=false;});
  const exportButton=Education43.button('导出本页响应记录 JSON',()=>{const payload={schema:1,browser:navigator.userAgent,logical_cores:navigator.hardwareConcurrency||null,network_online:navigator.onLine,software_isolation:this.isolated,samples:this.samples,note:'端侧模型、规则库和云端样本分开统计；本页记录不代表跨机器或p95。'};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='静默电台-实测记录.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  d.append(p,status,prep,confirm,backup,enable,off,input,send,answer,exportButton);return d;
 },
 install(){const bar=document.createElement('aside');bar.id='radio65-status';bar.setAttribute('role','status');bar.hidden=true;document.body.append(bar);const launch=Education43.button('静默电台（离线见证）',()=>this.open());document.querySelector('#settingsPanel .settings-list')?.append(launch);const menu=launch.cloneNode(true);menu.onclick=()=>this.open();document.querySelector('.title-extras-panel')?.append(menu);window.addEventListener('offline',()=>this.refresh());window.addEventListener('online',()=>this.refresh());this.refresh();}
};
document.addEventListener('DOMContentLoaded',()=>SilentRadio65.install());
