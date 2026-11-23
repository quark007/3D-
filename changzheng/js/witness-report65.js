/* A keepsake from saved experiences; no invented casualties or historical route score. */
const WitnessReport65={
 eligible(){return GameState.gameCompleted===true&&SnowPrologue63.state().completed===true&&HeroStories63.rows.every(r=>SnowPrologue63.state().heroes[r.id]?.completed);},
 data(sample=false){
  if(sample)return {sample:true,name:'研学者 · 示例',started:'2026-10-24',ended:'2026-10-24',message:'记住扶持彼此的人，也记住每一次认真求证。',nodes:GAME_NODES.map(n=>n.name),decisions:18,medals:6,items:HeroStories63.rows.map(r=>r.item)};
  const s=SnowPrologue63.state(),ids=new Set((GameState.medalRecords||[]).map(r=>Number(r.nodeId)).filter(n=>n>=1&&n<=12));
  const date=v=>v&&!Number.isNaN(Date.parse(v))?new Date(v).toLocaleDateString('zh-CN'):'存档未记录';
  return {sample:false,name:GameState.character?.name||'研学亲历者',started:date(s.messageSavedAt||s.completedAt),ended:date(GameState.storyPreparations?.report65?.endedAt),message:s.message||'出发时选择暂不留言；沿途的见证，仍值得记住。',nodes:GAME_NODES.filter(n=>ids.has(n.id)).map(n=>n.name),decisions:(GameState.decisionTrace||[]).length,medals:(GameState.medalRecords||[]).length,items:HeroStories63.rows.filter(r=>s.heroes[r.id]?.completed).map(r=>r.item),chronicle:String(GameState.storyPreparations?.chronicle49?.text||'').slice(0,600),chronicleMode:GameState.storyPreparations?.chronicle49?.mode||''};
 },
 wrap(c,text,x,y,max,line,size,maxLines=10){c.font=`${size}px "Microsoft YaHei",sans-serif`;let row='',n=0;for(const ch of String(text)){if(ch==='\n'||c.measureText(row+ch).width>max){c.fillText(row,x,y);y+=line;row=ch==='\n'?'':ch;if(++n>=maxLines)return y;}else row+=ch;}if(row){c.fillText(row,x,y);y+=line;}return y;},
 canvas(data){
  const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=data.chronicle?2590:2200;const c=canvas.getContext('2d');if(!c)throw Error('此浏览器未提供Canvas导出');
  c.fillStyle='#1b302c';c.fillRect(0,0,1500,canvas.height);c.strokeStyle='#a99e7c';c.lineWidth=2;c.strokeRect(45,45,1410,data.chronicle?2540:2110);c.fillStyle='#d5c6a3';c.font='25px "Microsoft YaHei"';c.fillText('长征 · 星火 / 见证记录本',100,130);
  c.fillStyle='#f2ead7';c.font='bold 70px "Microsoft YaHei"';c.fillText('我的长征',100,250);c.font='37px "Microsoft YaHei"';c.fillText('一段属于你的见证',100,320);
  c.fillStyle='#c7d3c8';c.font='29px "Microsoft YaHei"';c.fillText(`${data.name} ｜ ${data.started} — ${data.ended}`,100,395);
  c.strokeStyle='#9b7c59';c.beginPath();c.moveTo(100,445);c.lineTo(1400,445);c.stroke();
  c.fillStyle='#dbc99e';c.font='35px "Microsoft YaHei"';c.fillText('出发时，写给未来的自己',100,520);
  c.fillStyle='#f2ead7';this.wrap(c,data.message,100,595,1270,56,37,5);
  c.fillStyle='#b4c4b8';c.font='28px "Microsoft YaHei"';c.fillText('十二站研学，回望二万五千里',100,910);
  c.fillStyle='#e5d5b0';c.font='bold 48px "Microsoft YaHei"';c.fillText(`${data.nodes.length} 个站点见证`,100,1000);c.fillText(`${data.decisions} 条决策记录`,560,1000);c.fillText(`${data.medals||0} 枚历程勋章`,1010,1000);
  c.fillStyle='#b8c9bb';c.font='26px "Microsoft YaHei"';c.fillText(`主线站点覆盖 ${Math.round(data.nodes.length/12*100)}%（${data.nodes.length}/12），用于学习对照，不评价历史。`,100,1070);
  // Diagram belongs to the keepsake: it is not a measured historical map.
  const pts=GAME_NODES.map((_,i)=>({x:130+(i%6)*245,y:1170+Math.floor(i/6)*180}));c.strokeStyle='#b38e61';c.lineWidth=4;c.setLineDash([9,8]);c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.setLineDash([]);
  pts.forEach((p,i)=>{c.fillStyle=i<data.nodes.length?'#b25542':'#53645b';c.fillRect(p.x-7,p.y-15,27,19);c.fillStyle='#e4d8b9';c.fillRect(p.x-9,p.y-15,3,38);this.wrap(c,GAME_NODES[i].name,p.x-25,p.y+62,195,31,23,2);});
  c.fillStyle='#dbc99e';c.font='35px "Microsoft YaHei"';c.fillText('沿途信物，种种守护',100,1540);
  data.items.forEach((item,i)=>{const x=100+(i%5)*270,y=1600+Math.floor(i/5)*105;c.strokeStyle='#a99e7c';c.strokeRect(x,y,240,74);c.fillStyle='#e5d5b0';this.wrap(c,item,x+16,y+47,205,32,26,1);});
  // 史官评语（通关时生成）排在末尾；系统生成声明固定在标题行，未联网时标注本地生成。
  if(data.chronicle){c.fillStyle='#dbc99e';c.font='bold 35px "Microsoft YaHei"';c.fillText('史官评语 · 系统生成的研学评述，非历史文献',100,1900);if(data.chronicleMode!=='model'){c.fillStyle='#b8c9bb';c.font='24px "Microsoft YaHei"';c.fillText('本地生成',1240,1898);}c.fillStyle='#f2ead7';this.wrap(c,data.chronicle,100,1965,1270,50,33,5);}
  const dy=data.chronicle?430:0;
  c.strokeStyle='#a65c4a';c.lineWidth=3;c.strokeRect(100,1890+dy,470,88);c.fillStyle='#d9b08b';c.font='32px "Microsoft YaHei"';c.fillText('1934—1936 · 红星见证',120,1947+dy);
  c.fillStyle='#b8c6bb';this.wrap(c,'研学艺术改编。站点示意、资源与决策记录均为游戏体验，不代表真实行军里程、伤亡或史实路线相似度。',100,2040+dy,1300,33,23,2);
  this.wrap(c,'史料参考：共产党员网《遵义会议和红军长征的胜利》；中国国家博物馆“周广才的半截皮带”。文学故事另行标注。',100,2120+dy,1300,30,21,2);
  if(data.sample){c.fillStyle='#b75742';c.fillRect(970,70,430,65);c.fillStyle='#fff4dc';c.font='31px "Microsoft YaHei"';c.fillText('版式样例 · 非玩家实测',990,114);}
  return canvas;
 },
 async download(canvas,name){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('图片导出未完成');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);},
 open(sample=false){if(!sample&&!this.eligible()){GameUI.showToast('完成序章、十二站与全部可选见证后解锁正式年报；可先查看带水印的版式样例。');return;}const d=Education43.dialog(sample?'年报版式样例 · 非玩家实测':'我的长征年报');d.classList.add('report65-dialog');try{const canvas=this.canvas(this.data(sample));canvas.setAttribute('aria-label','个人见证年报预览');d.append(canvas,Education43.button('保存PNG海报',()=>this.download(canvas,sample?'长征年报-版式样例.png':'我的长征-见证年报.png').catch(e=>GameUI.showToast(e.message))));}catch(e){d.append(Education43.el('p',e.message));}return d;},
 mount(host){if(!host)return;let b=host.querySelector('[data-report65]');if(!b){b=Education43.button('生成我的长征年报',()=>this.open());b.dataset.report65='';host.append(b);}b.disabled=!this.eligible();b.title=b.disabled?'完成十二站与全部可选见证后解锁':'生成PNG纪念海报';},
 install(){this.mount(document.getElementById('rewardEntries'));const b=Education43.button('长征年报 · 查看版式样例',()=>this.open(true));document.querySelector('.title-extras-panel')?.append(b);const complete=GameState.markGameCompleted;GameState.markGameCompleted=function(){const result=complete.apply(this,arguments);this.storyPreparations.report65||={};this.storyPreparations.report65.endedAt||=new Date().toISOString();this.save();return result;};}
};
document.addEventListener('DOMContentLoaded',()=>WitnessReport65.install());
