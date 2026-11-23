/* Tap-friendly descriptions; resource values always come from the visible HUD. */
document.addEventListener('DOMContentLoaded',()=>{
  const entries=[
    ['hudTroops','队伍状态','反映当前体验中队伍的人员保障与行动状态。行军、任务消耗及救护安排会影响它；数值不表示真实人数。'],
    ['hudAmmo','弹药','反映当前体验中的弹药储备，用于战斗任务与行动保障。请结合任务需要安排使用。'],
    ['hudFood','补给','反映当前体验中的口粮、饮水等行军补给。行军会消耗补给，物资分配会影响后续保障。'],
    ['hudMorale','士气','反映当前体验中的队伍精神状态。任务经历、休整与战友互助会影响它。']
  ];
  const panel=document.createElement('section');panel.id='hudResourceHelp';panel.className='hud-resource-help';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','资源说明');
  const heading=document.createElement('strong'),description=document.createElement('p'),note=document.createElement('small'),close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','关闭资源说明');note.textContent='游戏体验指标 · 0—100，不代表真实历史统计';panel.append(heading,close,description,note);document.body.append(panel);
  let active=null;
  const hide=()=>{panel.hidden=true;active?.setAttribute('aria-expanded','false');active=null;};
  const position=()=>{if(!active)return;const r=active.getBoundingClientRect();panel.style.left=Math.max(12,Math.min(r.right-panel.offsetWidth,window.innerWidth-panel.offsetWidth-12))+'px';panel.style.top=Math.min(r.bottom+10,Math.max(12,window.innerHeight-panel.offsetHeight-12))+'px';};
  close.onclick=()=>{const previous=active;hide();previous?.focus();};
  for(const [id,name,text] of entries){const button=document.getElementById(id);if(!button)continue;button.setAttribute('role','button');button.tabIndex=0;button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');button.title=`${name} · 点击查看说明`;
    button.addEventListener('click',()=>{if(active===button){hide();return;}hide();active=button;heading.textContent=`${name} · 当前 ${button.querySelector('.stat-val').textContent} / 100`;description.textContent=text;panel.hidden=false;button.setAttribute('aria-expanded','true');position();});
    button.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();button.click();}});
    new MutationObserver(()=>{if(active===button)heading.textContent=`${name} · 当前 ${button.querySelector('.stat-val').textContent} / 100`;}).observe(button.querySelector('.stat-val'),{childList:true,characterData:true,subtree:true});
  }
  document.addEventListener('pointerdown',event=>{if(active&&!panel.contains(event.target)&&!active.contains(event.target))hide();});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active){const previous=active;hide();previous.focus();}});window.addEventListener('resize',position);window.addEventListener('scroll',hide,true);
});
