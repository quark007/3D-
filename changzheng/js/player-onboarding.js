/* Optional, resumable instruction. It never advances a task or changes a save. */
const PlayerOnboarding={
 root:null,step:0,key:'cz_player_intro_v32',
 steps:[
  {title:'从地图上的亮点出发',icon:'01',text:'你刚选好自己的岗位。点击地图上当前亮起的站点，再点击“与战友交谈”。灰色带锁的站点要按顺序解锁。',tip:'第一站是“中央苏区 · 出发”。不需要点击地图以外的地方找入口。'},
  {title:'先听战友说，再作选择',icon:'02',
   /* [R5 2026-10-28] 轮数口径从章节规则（NpcStory.ROUND_RULES/ROUND_DEFAULT）生成，不再写死“8轮”：
      第一章 3 轮即可行动、可继续深入到 8 轮，其余各章 8 轮。 */
   text(){const first=(typeof NpcStory!=='undefined'&&NpcStory.required)?NpcStory.required({nodeId:1,part:1}):3;const rest=(typeof NpcStory!=='undefined'&&NpcStory.ROUND_DEFAULT)||8;return first===rest?`每章先完成${rest}轮固定剧情。阅读战友的话，点选一句回答，直到出现“进入本章任务”。自由输入聊天是补充交流，不计入这${rest}轮。`:`每章需要完成固定轮数的剧情对话：第一章${first}轮即可开始行动（想深入阅读可以聊满${rest}轮），其余各章${rest}轮。阅读战友的话，点选一句回答，直到出现“进入本章任务”。自由输入聊天是补充交流，不计入这些轮数。`;},
   tip:'看不到后续按钮时，可以在当前面板内向下滚动。'},
  {title:'按当前步骤完成任务',icon:'03',text:'第一章会依次带你整装、分工、制定计划、处理行路事件和协作渡河。先看任务标题，再操作页面上的按钮；完成后点击明确的确认或继续按钮。',tip:'后续章节需要帮助时，点击任务旁的“? 本步怎么玩”。说明会在弹窗里显示，不占地图空间。'},
  {title:'记录计划，还要确认执行',icon:'04',text:'可以点选预设方案，也可以输入自己的安排。记录或解析方案后，先看结果，再确认执行。阅读任务还需要完成下方的判断题，记录计划不会直接过关。',tip:'AI等待时可继续阅读；不要反复点击提交。'},
  {title:'照应资源与同行的人',icon:'05',text:'顶部显示队伍、弹药、补给和士气。分粮时拖动每人的滑块，再确认分配；关卡结束后看资源变化与复盘，再返回地图前往下一站。',tip:'过关后仍需点击结算页的继续按钮。'},
  {title:'3D和映像是观察窗口',icon:'06',text:'3D按需开启，拖动可观察场景；它不会卡住任务解锁，也不用在模型里寻找隐藏道具。行动映像就绪后可以自行观看，关闭视频即可继续任务。',tip:'设备吃力时保持“低占用”画质，或先完成剧情再打开3D。'},
  {title:'摩斯学堂，随时入门',icon:'07',text:'底部导航和开始页都有“摩斯学堂”。按课程听音、查表、译报，再点击下一步。学堂可以随时关闭，已保存的练习进度下次可以接着学。',tip:'教程资格四个岗位通用；章节电报仍需完成前置剧情。'},
  {title:'可以出发了',icon:'08',text:'现在点击当前站点开始第一轮交谈。进度保存在这台浏览器；需要回看操作时，顶部“玩法指引”可以重新打开本教程。',tip:'完成一章 → 确认结算 → 回到地图 → 前往下一站。'}
 ],
 read(){try{return JSON.parse(localStorage.getItem(this.key)||'null');}catch{return null;}},
 save(value){try{localStorage.setItem(this.key,JSON.stringify(value));}catch{}},
 offer({force=false}={}){if(document.body.classList.contains('at-title')||window.CZ_DEMO_SESSION)return;if(!force&&this.read())return;this.open();},
 close(){const root=this.root;this.root=null;if(root?.open)root.close();root?.remove();this.previousFocus?.focus?.({preventScroll:true});},
 frame(label){this.close();this.previousFocus=document.activeElement;const root=document.createElement('dialog');root.className='player-onboarding';root.setAttribute('aria-label',label);const close=document.createElement('button');close.type='button';close.className='onboarding-close';close.textContent='×';close.setAttribute('aria-label','关闭引导');close.onclick=()=>{if(this.mode==='steps')this.save({mode:'new',step:this.step,dismissed:true});else if(this.mode==='choice')this.save({mode:'dismissed'});this.close();};root.append(close);root.addEventListener('cancel',event=>{event.preventDefault();close.click();});root.addEventListener('close',()=>{if(this.root===root)this.root=null;root.remove();});document.body.append(root);this.root=root;return root;},
 el(tag,text,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el;},
 button(text,fn,cls){const b=this.el('button',text,cls);b.type='button';b.onclick=fn;return b;},
 illustration(){const files=['01-map','02-dialogue','03-tasks','04-plan','05-resources','06-scene','07-morse','08-loop'],figure=document.createElement('figure');figure.className='onboarding-illustration';const item=this.steps[this.step],text=typeof item.text==='function'?item.text():item.text;const image=document.createElement('img');image.src='assets/tutorial/'+files[this.step]+'.svg';image.alt=item.title+'：'+text;image.width=560;image.height=240;image.decoding='async';image.onerror=()=>figure.hidden=true;figure.append(image,this.el('figcaption','操作示意 · 亮色按钮与箭头标出本步重点'));return figure;},
 open(){this.mode='choice';const root=this.frame('选择你的游玩经验');root.append(this.el('span','征程准备 · 玩法指引','onboarding-eyebrow'),this.el('h2','第一次踏上这段征程吗？'),this.el('p','先了解操作，再把注意力留给故事。引导随时可以关闭，也能从顶部重新打开。'));
  const actions=this.el('div','','onboarding-choices');actions.append(this.button('我是新手 · 带我熟悉操作',()=>{this.mode='steps';const saved=this.read();this.step=saved?.mode==='new'&&!saved.completed?Math.min(7,Math.max(0,saved.step||0)):0;this.save({mode:'new',step:this.step});this.render();},'onboarding-primary'),this.button('我是老手 · 直接进入游戏',()=>{this.save({mode:'veteran'});this.close();},'onboarding-secondary'));root.append(actions);root.showModal();actions.firstChild.focus();},
 render(){this.mode='steps';const item=this.steps[this.step],root=this.frame('新手引导 · '+item.title);root.append(this.el('span',`新手引导　${this.step+1} / ${this.steps.length}`,'onboarding-eyebrow'),this.el('h2',item.title),this.illustration(),this.el('p',typeof item.text==='function'?item.text():item.text),this.el('aside',item.tip,'onboarding-tip'));
  const progress=document.createElement('progress');progress.max=this.steps.length;progress.value=this.step+1;progress.setAttribute('aria-label','引导进度');root.append(progress);
  const actions=this.el('div','','onboarding-actions');const prev=this.button('上一步',()=>{this.step--;this.save({mode:'new',step:this.step});this.render();},'onboarding-secondary');prev.disabled=this.step===0;
  const next=this.button(this.step===this.steps.length-1?'我明白了 · 开始征程':'下一步 →',()=>{if(this.step===this.steps.length-1){this.save({mode:'new',step:this.step,completed:true});this.close();return;}this.step++;this.save({mode:'new',step:this.step});this.render();},'onboarding-primary');actions.append(prev,next);root.append(actions);root.showModal();next.focus();},
 context(node,text,locate){this.mode='context';const root=this.frame('本步操作帮助');root.append(this.el('span','需要时再看 · 操作帮助','onboarding-eyebrow'),this.el('h2',node?.name||`第${node?.id||1}章 · 当前步骤`),this.el('p',text));const actions=this.el('div','','onboarding-actions');actions.append(this.button('知道了 · 返回当前任务',()=>this.close(),'onboarding-primary'));if(locate)actions.append(this.button('找到当前操作 ↓',()=>{this.close();locate();},'onboarding-secondary'));root.append(actions);root.showModal();},
 install(){if(document.getElementById('playerGuideLaunch'))return;const launch=this.button('? 玩法指引',()=>this.open(),'player-guide-launch');launch.id='playerGuideLaunch';document.querySelector('.hud-left')?.append(launch);}
};document.addEventListener('DOMContentLoaded',()=>PlayerOnboarding.install());
