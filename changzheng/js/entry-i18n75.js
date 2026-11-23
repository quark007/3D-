/* Complete entry/role chrome localisation. Display nodes only; no story/save/role data rewriting. */
window.EntryI18n75={
 pairs:[['解谜档案室（独立练习）','Puzzle archive (independent practice)'],
  ['长征','Long March'],['星火','Starfire'],['1934 — 1936 ／ 循迹山河','1934 — 1936 / Retracing the journey'],
  ['前路艰难，仍要作出选择。','The road ahead is hard, and choices must still be made.'],['把有限的补给，留给同行的人。','Set aside your limited supplies for those who march with you.'],
  ['12 站主线 · 多岗位协作 · 固定剧情可离线体验','12 chapters / multiple roles / authored story playable offline'],
  ['开始游戏','Begin the Long March'],['重新开始一段征程','Start a new journey'],['检测游戏服务','Check game service'],
  ['可先体验固定剧情，云服务连接后启用AI推演与私有视频。','You can play the authored story first. Connect the service for AI simulations and private video.'],
  ['配音试听','Voice samples'],['战地放映室','Screening room'],['首次体验记录','First-play study'],
  ['动态背景：轻柔','Background motion: Gentle'],['动态背景：关','Background motion: Off'],['动态背景：系统已减弱','Background motion: Reduced by system'],
  ['离线 AI（可选）','Offline AI (optional)'],['离线 AI (可选)','Offline AI (optional)'],['配置BFF地址','Configure service URL'],['帧率 / 画质','Frame rate / graphics'],
  ['切换玩家 / 独立存档','Player profiles / separate saves'],['行记 · 阅读与收藏','Journal / reading & collections'],['English Prologue','English interface & prologue'],
  ['回看斯诺序章','Replay the Snow prologue'],['静默电台（离线见证）','Silent Radio (offline witness)'],['长征年报 · 查看版式样例','Journey report / sample layout'],['真相编辑部 · 研学核查','Truth Newsroom / source checking'],['导出 / 导入存档','Export / import save'],
  ['坚定信念 · 实事求是 · 团结互助 · 艰苦奋斗','Conviction · Seeking truth · Mutual support · Perseverance'],['基层协作任务为虚构体验，历史档案独立保留。','Local collaboration tasks are fictional learning activities. Historical records remain separate.'],
  ['剧情已就绪 · 点击开始即可选择岗位','Ready / select Begin to choose your role'],['剧情程序未准备好，请点击“重新加载”。存档会保留。','The story is not ready. Select Reload; your save will be kept.'],['正在准备剧情程序，完成后会进入你选择的入口…','Preparing the story. Your selected activity will open when ready.'],['剧情程序加载失败，可重新加载页面。你的存档会保留。','The story could not load. Reload the page; your save will be kept.'],['剧情程序仍在下载。可等待，或重新加载重试。','The story is still downloading. Wait, or reload to try again.'],['重新加载','Reload'],
  ['AI 服务未连接：可先体验固定剧情；需要推演时点击检测服务。','AI service offline. Play the authored story first; check the service when you need simulations.'],['正在检测服务…','Checking service...'],['正在检测本地服务…','Checking local service...'],['BFF已连接 · 模型已配置，生成状态以实际请求为准','Service connected / model configured. Generation availability depends on each request.'],['BFF已连接 · 服务端尚未配置模型','Service connected / model not configured on the server'],['服务不可达：请核对地址、服务启动状态、HTTPS与跨域配置。','Service unavailable. Check the URL, running service, HTTPS and cross-origin configuration.'],['服务地址无效或暂时不可达，请重新配置后检测。','The service URL is invalid or temporarily unavailable. Configure it and check again.'],['本机BFF未启动：复制目录还需Python依赖和服务端配置，或填写已部署的公网BFF地址。','Local service is not running. Install its Python dependencies and configure the server, or enter a deployed service URL.'],
  ['← 返回主菜单','← Back to main menu'],['选择你的角色','Choose your role'],['选择虚构岗位，体验不同职责；每个岗位均不自带部队，队伍资源统一管理','Choose a fictional role with different duties. No role brings its own troops; team resources are shared.'],['第1步：点选下方岗位卡片，再点“踏上征程”。不同岗位都能从第一章开始。','Choose a role card, then select Set out. Every role begins at Chapter 1.'],['同屏双岗 · 2–4 人轮流操作（无须联网）','Shared-screen roles / 2–4 players take turns (no network needed)'],
  ['红军连长','Red Army Commander'],['后勤补给员','Supply Officer'],['普通红军战士','Red Army Soldier'],['红军女医护','Red Army Medic'],
  ['在上级部署下，组织本连行动与战友协作','Organize your company and coordinate with comrades under higher-level orders.'],['清点、保管和运送物资，协助队伍补给','Count, safeguard and transport supplies to support the team.'],['执行行军与警戒任务，与战友互助前行','Carry out marching and lookout duties, supporting your comrades along the way.'],['参与伤员救护与照料，协助卫生保障','Help care for the wounded and support the team’s medical needs.'],
  ['岗位职责 · 教学设定','Role duties / learning scenario'],['组织协作','Team coordination'],['传达任务','Conveying orders'],['照顾全连','Supporting the company'],['物资清点','Supply inventory'],['补给运输','Supply transport'],['节约分配','Careful allocation'],['行军警戒','Marching and lookout'],['执行任务','Carrying out tasks'],['战友互助','Mutual support'],['伤员照料','Care for the wounded'],['卫生保障','Medical support'],['协助转运','Assisted transport'],
  ['踏上征程','Set out'],['请先点选上方任一岗位','Choose a role to begin'],['指','C'],['勤','L'],['兵','S'],['医','M'],['开','On'],['关','Off']
 ],
 normalize(value){return String(value).trim().replace(/\s+/g,' ');},
 prepare(){this.forward=new Map();this.reverse=new Map();for(const [zh,en]of this.pairs){this.forward.set(this.normalize(zh),en);this.reverse.set(this.normalize(en),zh);}if(typeof I18nSnow65!=='undefined')for(const row of Object.values(I18nSnow65.table)){if(row.zh&&!row.zh.includes('<')){this.forward.set(this.normalize(row.zh),row.en);if(!this.reverse.has(this.normalize(row.en)))this.reverse.set(this.normalize(row.en),row.zh);}}},
 text(value,lang){
  const raw=String(value),key=this.normalize(raw),source=this.reverse.get(key)||key;
  if(lang==='zh')return this.reverse.has(key)?raw.replace(raw.trim(),this.reverse.get(key)):raw;
  let out=this.forward.get(source);
  if(!out){const roles={红军连长:'Red Army Commander',后勤补给员:'Supply Officer',普通红军战士:'Red Army Soldier',红军女医护:'Red Army Medic'};let m;
   if((m=/^指令已签发\s*·\s*(.+)$/.exec(source)))out='Role confirmed / '+(roles[m[1]]||m[1]);
   if((m=/^已选择\s*·\s*(.+?)[，,]\s*点击出发$/.exec(source)))out='Selected: '+(roles[m[1]]||m[1])+' / select Set out';
   if((m=/^(\d+) 岗协作 · 请选择 2–4 个岗位$/.exec(source)))out=m[1]+' roles selected / choose 2–4 roles';
  }
  return out?raw.replace(raw.trim(),out):raw;
 },
 apply(){
  if(!this.forward)this.prepare();const lang=typeof I18nSnow65!=='undefined'?I18nSnow65.lang():'zh';
  for(const root of [document.getElementById('titleScreen'),document.getElementById('charSelectOverlay')]){if(!root)continue;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){if(n.parentElement?.closest('script,style,textarea,input,[contenteditable=true]'))continue;const old=this.nodes.get(n);let source=old&&n.nodeValue===old.output?old.source:n.nodeValue;
    if(lang==='en'){const restored=this.reverse.get(this.normalize(source));if(restored)source=source.replace(source.trim(),restored);}
    const out=lang==='en'?this.text(source,lang):source;if(n.nodeValue!==out)n.nodeValue=out;this.nodes.set(n,{source,output:out});
   }}
  const title=document.getElementById('titleScreen');title?.setAttribute('aria-label',lang==='en'?'Long March: Starfire / start screen':'长征星火开始界面');document.querySelector('.title-links')?.setAttribute('aria-label',lang==='en'?'Activities and samples':'体验与试听');
  document.querySelectorAll('input[data-snow65-lang]').forEach(e=>e.setAttribute('aria-label',lang==='en'?'English interface and prologue':'英文界面与序章'));
  document.title=lang==='en'?'Long March · Starfire — Interactive History Theatre':this.originalTitle;
 },
 install(){if(this.installed)return;this.installed=true;this.nodes=new WeakMap();this.originalTitle=document.title;this.prepare();let queued=false;const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;this.apply();});};this.observer=new MutationObserver(schedule);for(const id of ['titleScreen','charSelectOverlay']){const root=document.getElementById(id);if(root)this.observer.observe(root,{childList:true,subtree:true,characterData:true});}if(typeof I18nSnow65!=='undefined')I18nSnow65.onChange(()=>this.apply());this.apply();window.addEventListener('pagehide',()=>this.observer.disconnect(),{once:true});}
};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>window.EntryI18n75.install(),{once:true});else window.EntryI18n75.install();}
