/* Optional on-device dialogue. Never load model weights during startup. */
const EdgeBridge42={enabled:false,ready:false,loading:null,epoch:0,listeners:new Set(),progress:{status:'idle'},lastError:'',
 emit(progress){this.progress={...this.progress,source:'',...progress};for(const listener of this.listeners)listener(this.progress);},
 subscribe(listener){this.listeners.add(listener);listener(this.progress);return()=>this.listeners.delete(listener);},
 stop(){this.epoch++;this.enabled=false;this.ready=false;this.loading=null;this.engine?.dispose?.();this.engine=null;this.emit({status:'idle',message:'已取消并释放端侧模型'});},
 createEngine(){
  if(typeof Worker==='undefined')throw Error('此浏览器暂不支持后台端侧推理');
  const worker=new Worker('js/edge-worker42.mjs?v=61',{type:'module'}),pending=new Map();let id=0;
  worker.onmessage=event=>{const row=pending.get(event.data.id);if(!row)return;if(event.data.progress){this.emit(event.data.progress);return;}pending.delete(event.data.id);clearTimeout(row.timer);if(event.data.error)row.reject(Error(event.data.error));else row.resolve(event.data.result);};
  const fail=(reason='后台模型已停止')=>{for(const row of pending.values()){clearTimeout(row.timer);row.reject(Error(reason));}pending.clear();};worker.onerror=event=>{this.lastError=event.message||'后台推理模块加载失败，请检查浏览器是否支持模块 Worker';this.ready=false;this.enabled=false;this.engine=null;worker.terminate();fail(this.lastError);};
  const call=(method,args=[])=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);worker.terminate();fail();this.engine=null;this.ready=false;reject(Error('模型操作超时，请重试'));},method==='prepare'?7260000:70000);pending.set(key,{resolve,reject,timer});worker.postMessage({id:key,method,args});});
  return {configure(){},status:()=>call('status'),ensureLoaded:opts=>call('prepare',[opts||{}]),chat:args=>call('chat',[args]),dispose(){worker.terminate();fail();}};
 },
 async prepare(remote){
  if(this.ready){this.enabled=true;return true;}if(this.loading)return this.loading;
  const epoch=++this.epoch;this.lastError='';this.emit({status:'loading',message:'正在加载推理模块…'});
  const download=!!remote;

  this.downloaded=download;
  this.loading=(async()=>{
   // Restore a permitted directory handle; the original files stay in place.
   if(!download&&!this.importedFiles?.length&&window.indexedDB){try{const io=await import(new URL('js/edge-store61.mjs?v=61',document.baseURI).href);this.importedFiles=await io.restoreDirectory61(true);}catch(error){if(error.code==='MODEL_DIRECTORY_PERMISSION')throw error;}}
   if(!window.EdgeAI)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='js/edge-ai.js?v=61';const timer=setTimeout(()=>{script.remove();reject(Error('端侧模块读取超时'));},30000);script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('端侧模块未能读取'));};document.head.append(script);});
   this.engine??=this.createEngine();
   const ok=await this.engine.ensureLoaded({remote:false,files:this.importedFiles||[]});if(epoch!==this.epoch)return false;
   if(!ok)throw Error('模型初始化失败');
   this.ready=true;this.enabled=true;
   if(download){try{localStorage.setItem('edgeModel58','1');}catch{}}
   this.emit({status:'ready',message:download?'模型已准备完成；支持的浏览器会保存断点缓存':'模型已准备完成，可以离线交谈'});return true;
  })().catch(error=>{if(epoch===this.epoch){
    let msg=error.message;
    // 把底层 "Failed to fetch" 翻译成玩家能照做的提示
    if(download&&/Failed to fetch|NetworkError|fetch/i.test(msg))msg='连不上模型镜像（huggingface.co）。请检查网络或代理后重试，也可以点「导入已下载的模型文件夹」离线配置。';
    if(/load_timeout|backend_timeout/i.test(msg))msg='模型初始化超时。建议关闭其他占用内存的页面后重试；若多次失败请改用「导入已下载的模型文件夹」。';
    this.lastError=msg;this.engine?.dispose?.();this.engine=null;this.ready=false;this.enabled=false;this.emit({status:'error',message:msg});}return false;}).finally(()=>{if(epoch===this.epoch)this.loading=null;});return this.loading;
 },
 async fallback(npcId,message,scene,history){
  if(!this.enabled||!this.ready||!window.EdgeAI)return null;
  const epoch=this.epoch,profile=typeof PlayerProfiles40==='undefined'?'':PlayerProfiles40.id;
  const aliases={ruijin:'suqu_chufa',snowmount:'xueshan',grassland:'caodi',jinshajiang:'jinsha',daduhe:'dadu'};
  const roles={commander_1:'wang_gui',commander_2:'chen_xiaoman',commander_3:'he_wen',commander_4:'narrator'};
  if(!EdgeAI.SCENE[aliases[scene]||scene]||!EdgeAI.NPC[roles[npcId]||npcId])return null;
  const pairs=[];let user='';for(const row of history||[]){if(['user','player'].includes(row.role))user=row.text||row.content||'';else if(['assistant','ai','npc'].includes(row.role)&&user){pairs.push({user,assistant:row.text||row.content||''});user='';}}
  try{const result=await this.engine.chat({npcId:roles[npcId]||npcId,sceneId:aliases[scene]||scene,message,history:pairs});
   if(!result.ok){this.lastError=result.detail||result.reason||'端侧推理未返回有效文本';return null;}
   if(epoch!==this.epoch||!this.enabled||(typeof PlayerProfiles40!=='undefined'&&profile!==PlayerProfiles40.id))return null;
   return {text:result.text,mood:'neutral',references:[],mode:'edge',degraded:false,aiLabel:'端侧AI生成 · 非史料'};
  }catch{return null;}
 },
 open(){
  const existing=document.getElementById('edge-model58');if(existing){existing.focus();return;}
  const previous=document.activeElement;
  const dialog=document.createElement('dialog');dialog.id='edge-model58';dialog.className='service-dialog edge-model58';
  const title=document.createElement('h2');title.textContent='端侧自由交谈';
  const note=document.createElement('p');note.textContent='本机已下载模型可直接选择原文件夹读取，无需复制几百MB，也不会为导入模型再下载另一档。网页版首次联网使用仍需获取483或786MB权重；支持断点缓存，自动比较站内和官方源。EXE完整版直接读取随包模型。';
  const status=document.createElement('p');status.setAttribute('role','status');
  const bar=document.createElement('progress');bar.max=100;bar.setAttribute('aria-label','模型下载进度');
  const detail=document.createElement('p');detail.className='edge-download-detail58';
  const files=new Map();let start=Date.now(),last=0,speed=0,sample=Date.now();
  const mb=n=>(n/1000000).toFixed(1);
  const enable=document.createElement('button');enable.textContent='启用并准备模型';
  const downloadBtn=document.createElement('button');downloadBtn.textContent='下载模型到本机（483–786 MB）';
  const cacheNote=document.createElement('small');cacheNote.className='edge-cache-note58';
  try{cacheNote.textContent=localStorage.getItem('edgeModel58')?'已准备过模型，优先复用缓存；浏览器清理缓存后需要重新下载':'首次使用请先下载或导入模型，之后会缓存到本机';}catch{}
  const unsubscribe=this.subscribe(row=>{
   if(row.status==='backend'||row.status==='loading'){files.clear();last=0;speed=0;start=sample=Date.now();status.textContent=row.status==='loading'?row.message:'正在准备 '+row.device+' / '+row.dtype+'…';bar.removeAttribute('value');}
   else if(row.status==='progress'||row.status==='progress_total'){
    if(row.status==='progress')files.set(row.file||'model',{loaded:row.loaded||0,total:row.total||0});
    const values=row.status==='progress_total'?[row]:[...files.values()];
    const loaded=values.reduce((n,f)=>n+(f.loaded||0),0),total=values.reduce((n,f)=>n+(f.total||0),0),now=Date.now();
    if(now-sample>=300){speed=Math.max(0,(loaded-last)/((now-sample)/1000));sample=now;last=loaded;}
    if(total){bar.value=Math.min(100,loaded/total*100);}else bar.removeAttribute('value');
    status.textContent=(this.importedFiles?.length?'正在读取本地模型 ':row.source?'正在分片下载模型 ':'正在准备 / 读取模型 ')+(total?Math.min(100,loaded/total*100).toFixed(1)+'%':'');
    const eta=(speed>500000&&total>loaded)?Math.round((total-loaded)/speed):null;
    detail.textContent=mb(loaded)+' / '+(total?mb(total):'未知')+' MB · '+mb(speed)+' MB/s'
      +(eta!==null?' · 剩余约 '+(eta>=60?Math.round(eta/60)+' 分钟':eta+' 秒'):'')
      +' · 已用 '+Math.floor((now-start)/1000)+' 秒'
      +(row.file?' · '+(row.file.split('/').pop()):'');
   }else if(row.status==='initializing'){
    // 权重读完到引擎就绪之间有 1–2 分钟空档，这一段必须给明确反馈，否则会被当成"卡死"
    bar.value=100;
    const step=row.total>1?` · 第 ${row.attempt}/${row.total} 档`:'';
    status.textContent=`模型已读取，正在初始化推理引擎（${row.device}/${row.dtype}${step}）…`;
    detail.textContent='已用 '+Math.floor((Date.now()-start)/1000)+' 秒 · 无独立显卡的机器首次约需 1–2 分钟，请保持页面打开';
   }else if((row.status==='done'&&/\.onnx$/.test(row.file||''))||row.status==='ready'){bar.value=100;status.textContent=row.status==='ready'?'✓ 模型已准备完成，可以离线交谈':'权重文件已读取，正在初始化推理引擎…';if(row.status==='ready')detail.textContent='模型已就绪，可以发送离线对话 · 重开页面需重新初始化；耗时取决于设备，无需重新下载已保存的权重';}
   else if(row.status==='error'){bar.removeAttribute('value');status.textContent='准备失败：'+row.message;detail.textContent='可点「启用并准备模型」重试，或用「导入已下载的模型文件夹」跳过联网读取';}
   else if(row.message)status.textContent=row.message;
   enable.disabled=!!this.loading;enable.textContent=this.ready?'重新启用':'启用并准备模型';
   downloadBtn.disabled=!!this.loading||this.ready;
  });
  enable.onclick=async()=>{enable.disabled=true;downloadBtn.disabled=true;await this.prepare();enable.disabled=false;downloadBtn.disabled=this.ready;};
  downloadBtn.onclick=async()=>{downloadBtn.disabled=true;enable.disabled=true;status.textContent='正在检测缓存与下载源…';detail.textContent='优先使用已存在的权重；仅缺失时分片下载，断开后可继续';await this.prepare(true);downloadBtn.disabled=false;enable.disabled=false;};
  const netdisk=document.createElement('button');netdisk.textContent='网盘下载模型（下载后选择文件夹）';netdisk.onclick=()=>window.open('https://pan.baidu.com/s/13ymieYRX3MsT4xqVOZi77A?pwd=re6t','_blank','noopener,noreferrer');
  const off=document.createElement('button');off.textContent='取消 / 关闭端侧回复';off.onclick=()=>this.stop();
  const pick=document.createElement('input');pick.type='file';pick.multiple=true;pick.setAttribute('webkitdirectory','');pick.hidden=true;
  const imported=document.createElement('button');imported.textContent='导入已下载的模型文件夹';imported.onclick=()=>pick.click();
  const useFiles=async(selected,handle)=>{
   imported.disabled=true;
   try{
    const config=selected.find(file=>/(^|\/)config\.json$/.test(file.webkitRelativePath||file.name));
    if(!config)throw Error('请选择包含config.json的模型根文件夹');
    const configPath=config.webkitRelativePath||config.name,root=configPath.slice(0,-'config.json'.length);
    const rows=new Map(selected.map(file=>[(file.webkitRelativePath||file.name).slice(root.length),file]));
    const required=['config.json','tokenizer.json','tokenizer_config.json'];
    if(required.some(name=>!rows.has(name))||!['onnx/model_q4.onnx','onnx/model_q4f16.onnx'].some(name=>rows.has(name)))throw Error('请选择完整模型根文件夹（配置、分词器及onnx权重）');
    for(const name of required)JSON.parse(await rows.get(name).text());
    for(const [name,size]of [['onnx/model_q4.onnx',786156820],['onnx/model_q4f16.onnx',483003582]])if(rows.has(name)&&rows.get(name).size!==size)throw Error(name+'文件大小不完整，请重新下载');
    this.stop();this.importedFiles=[...rows].filter(([name])=>/^[^/]+\.(json|txt)$/.test(name)||/^onnx\/model_q4(f16)?\.onnx$/.test(name)).map(([name,file])=>({name,file}));
    if(handle){try{const io=await import(new URL('js/edge-store61.mjs?v=61',document.baseURI).href);await io.rememberDirectory61(handle);}catch{cacheNote.textContent='本次可直接读取；浏览器未保存目录授权，下次请重新选择';}}
    status.textContent='已连接原模型文件，正在初始化（不复制权重、不联网下载）…';
    cacheNote.textContent=handle?'直接读取已授权文件夹；下次会复用仍然有效的目录授权':'本次直接读取所选文件，不复制权重；关闭页面后需重新选择文件夹';
    await this.prepare();
   }catch(error){status.textContent='导入失败：'+error.message;}finally{imported.disabled=false;pick.value='';}
  };
  pick.onchange=()=>useFiles([...pick.files]);
  imported.onclick=async()=>{
   if(!window.showDirectoryPicker){pick.click();return;}
   try{
    const handle=await window.showDirectoryPicker({mode:'read'});
    const io=await import(new URL('js/edge-store61.mjs?v=61',document.baseURI).href);
    const rows=await io.directoryFiles61(handle);
    // Keep native File references for structured cloning to the worker.
    const required=['config.json','tokenizer.json','tokenizer_config.json'];
    if(required.some(name=>!rows.some(row=>row.name===name)))throw Error('请选择模型根文件夹（含config.json和onnx子目录）');
    for(const name of required)JSON.parse(await rows.find(row=>row.name===name).file.text());
    for(const [name,size]of [['onnx/model_q4.onnx',786156820],['onnx/model_q4f16.onnx',483003582]]){const row=rows.find(x=>x.name===name);if(row&&row.file.size!==size)throw Error(name+'文件大小不完整');}
    if(!rows.some(row=>/onnx\/model_q4(f16)?\.onnx$/.test(row.name)))throw Error('目录缺少ONNX权重');
    imported.disabled=true;this.stop();this.importedFiles=rows;
    try{await io.rememberDirectory61(handle);cacheNote.textContent='已保存目录授权；直接读取原文件，不复制权重';}catch{cacheNote.textContent='本次直接读取原文件；下次请重新选择文件夹';}
    status.textContent='正在直接读取本地模型并初始化，不下载、不复制权重…';await this.prepare();
   }catch(error){if(error.name!=='AbortError')status.textContent='导入失败：'+error.message;}finally{imported.disabled=false;}
  };
  const close=document.createElement('button');close.textContent='返回';close.onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{unsubscribe();dialog.remove();if(previous?.isConnected)previous.focus();},{once:true});
  dialog.append(title,note,status,bar,detail,enable,downloadBtn,cacheNote,imported,pick,netdisk,off,close);document.body.append(dialog);dialog.showModal();
 },
 install(){const button=document.createElement('button');button.textContent='离线 AI（可选）';button.onclick=()=>this.open();document.querySelector('.title-links')?.append(button);}
};document.addEventListener('DOMContentLoaded',()=>EdgeBridge42.install());
