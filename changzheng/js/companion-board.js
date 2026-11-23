/* Relationships recall completed fictional actions; chatting does not farm trust. */
const CompanionBoard={
  key:'cz_companions_v1',records:{},installed:false,
  load(){this.records={};try{const rows=JSON.parse(localStorage.getItem(this.key)||'{}');if(!rows||typeof rows!=='object'||Array.isArray(rows))return;for(const [id,row] of Object.entries(rows)){if(!NpcStoryCore.names[id]||!row||typeof row!=='object'||!Array.isArray(row.chapters))continue;this.records[id]={chapters:[...new Set(row.chapters.filter(n=>Number.isInteger(n)&&n>=1&&n<=12))],lastNode:Number(row.lastNode)||1,conversations:Math.max(0,Math.min(9999,Number(row.conversations)||0))};}}catch{}},
  save(){try{localStorage.setItem(this.key,JSON.stringify(this.records));}catch{}},
  available(nodeId,id){return NpcStory.scripts.find(s=>s.nodeId===Number(nodeId)&&NpcStoryCore.participants(s,NpcStory.role()).includes(id));},
  encounter(id,nodeId){if(id==='narrator'||id==='enemy_messenger'||!NpcStoryCore.names[id])return;const row=this.records[id]||{chapters:[],conversations:0};if(!row.chapters.includes(Number(nodeId)))row.chapters.push(Number(nodeId));row.lastNode=Number(nodeId);this.records[id]=row;this.save();},
  chat(id,nodeId){const script=this.available(nodeId,id);if(!script){GameUI.showToast('这位战友未出现在本章剧本，先查看共同经历。');return;}const node=GAME_NODES.find(n=>n.id===Number(nodeId));if(!node)return;ExperienceSystem.close();NpcStory.current=script;GameUI.openNpcChat(id,NpcStoryCore.scenes[node.id],node);NpcStory.mode='free';NpcStory.showChoices();document.getElementById('npcInput')?.focus();},
  render(){
    const system=ExperienceSystem,nodeId=Number(system.nodeId)||1,section=system.el('section',undefined,'companion-roster');
    const intro=system.el('div',undefined,'companion-roster-intro');intro.append(system.el('h2','同行的人，也记得你的选择'),system.el('p','打开战友档案，回看共同经历或继续交谈。信任来自实际协作，聊天承诺不会直接增加关系分。'));section.append(intro);
    const grid=system.el('div',undefined,'companion-grid');
    for(const [id,name] of Object.entries(NpcStoryCore.names)){
      if(['narrator','enemy_messenger'].includes(id))continue;
      const script=this.available(nodeId,id),row=this.records[id],memories=system.state.memories.filter(m=>m.npcId===id),score=Number(system.state.bonds[id])||0;
      const card=system.el('article',undefined,'companion-card');card.dataset.npcId=id;
      const avatar=system.el('span',name.replace(/老班长|青年战士|指导员/,'').slice(0,1),'companion-monogram');avatar.setAttribute('aria-hidden','true');
      card.append(avatar,system.el('h3',name),system.el('small',script?'本章可交谈':row||memories.length?'曾经同行 · 本章未出现':'尚未相识'));
      card.append(system.el('p',`${score<0?'尚有隔阂':score>=10?'信任加深':row||memories.length?'逐渐熟悉':'待相识'} · 共同经历 ${new Set([...(row?.chapters||[]),...memories.map(m=>m.nodeId)]).size} 章`));
      const details=system.el('details'),summary=system.el('summary','查看战友档案');details.append(summary);
      if(memories.length)for(const m of memories.slice(-4).reverse())details.append(system.el('p',`${system.context(m.nodeId)?.name||'行军记录'}：${m.note}`));
      else details.append(system.el('p',row?'已在剧情中相识，尚无单独协作事件记录。':'在对应章节相识后，这里会记录你们的共同经历。'));
      if(row?.conversations)details.append(system.el('small',`已完成 ${row.conversations} 次交谈，交谈次数不等于关系分。`));
      card.append(details);const talk=system.button('与TA聊聊',()=>this.chat(id,nodeId));talk.disabled=!script;card.append(talk);grid.append(card);
    }
    section.append(grid);system.content.querySelector('.experience-lead')?.after(section);if(!this.available(nodeId,'chen_xiaoman'))system.content.querySelector('.experience-proof')?.remove();
  },
  install(){
    if(this.installed||typeof NpcStory==='undefined'||!NpcStory.scripts.length||typeof ExperienceSystem==='undefined'||!ExperienceSystem.installed)return;this.installed=true;this.load();
    const render=ExperienceSystem.renderBonds;ExperienceSystem.renderBonds=function(){const result=render.apply(this,arguments);CompanionBoard.render();return result;};
    const open=GameUI.openNpcChat;GameUI.openNpcChat=function(id,level,node){const result=open.apply(this,arguments);CompanionBoard.encounter(id,node?.id);return result;};
    const send=GameUI.sendNpcMessage;GameUI.sendNpcMessage=async function(){const id=this.npcCurrentRole,node=NpcStory.current?.nodeId,session=this.npcSession,before=this.npcChatHistory.length,result=await send.apply(this,arguments);if(this.npcLastReplyDegraded===false&&session===this.npcSession&&this.npcChatHistory.length>=before+2&&CompanionBoard.records[id]){CompanionBoard.records[id].conversations++;CompanionBoard.save();}return result;};
    const clear=GameState.clear;GameState.clear=function(){CompanionBoard.records={};try{localStorage.removeItem(CompanionBoard.key);}catch{this.saveFailed=true;}return clear.apply(this,arguments);};
  }
};
document.addEventListener('npc-story-ready',()=>CompanionBoard.install());
document.addEventListener('DOMContentLoaded',()=>CompanionBoard.install());
