/* Explicit routing: custom chat never silently switches the selected model. */
const NpcModelChoice56={
  read(){return GameState.storyPreparations?.npcModel56==='edge'?'edge':'cloud';},
  mount(){
    const host=document.querySelector('#npcOverlay .npc-input-area')||document.getElementById('npcInput')?.parentElement;if(!host)return;
    document.getElementById('npcModel56')?.remove();const box=document.createElement('div');box.id='npcModel56';box.className='npc-model56';
    const label=document.createElement('label');label.textContent='自定义交谈模型 ';const select=document.createElement('select');select.setAttribute('aria-label','选择自由交谈模型');
    for(const [value,text]of [['cloud','AI 模型 · 云端'],['edge','本机离线模型']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=this.read();label.append(select);
    const prepare=document.createElement('button');prepare.type='button';prepare.textContent='准备本机模型';
    const note=document.createElement('span');note.setAttribute('role','status');
    const render=()=>{prepare.hidden=select.value!=='edge';note.textContent=select.value==='cloud'?'使用项目配置的 AI 服务；失败可重试，不自动切换模型。':'首次按设备读取约483或786 MB权重；准备后在本机运行，不向云端发送对话。';};
    select.onchange=()=>{if(typeof NpcStory!=='undefined')NpcStory.interruptPending();else{GameUI.npcRequestId++;GameUI.hideNpcTypingIndicator();GameUI.npcSubmitting=false;}GameState.storyPreparations||={};GameState.storyPreparations.npcModel56=select.value;GameState.save();render();};
    prepare.onclick=async()=>{if(typeof EdgeBridge42==='undefined')return;prepare.disabled=true;note.textContent='正在准备本机模型，可返回剧情继续任务…';EdgeBridge42.open();const ok=await EdgeBridge42.prepare();if(box.isConnected){prepare.disabled=false;note.textContent=ok?'本机模型已准备，可以发送自由对话。':'本机模型未准备成功，可重试或自行切换 AI 。';}};
    box.append(label,prepare,note);host.before(box);render();
  },
  failure(message){
    const edge=this.read()==='edge',badge=document.getElementById('npcDegradedBadge');badge.style.display='block';badge.textContent=edge?'本机模型尚未返回 · 未替换为模板':'AI 请求暂未成功 · 未替换为本地回复';
    GameUI.onNpcReplyTimeout(message);const text=document.querySelector('#npcChatFlow .npc-bubble-timeout:last-child .npc-timeout-text');if(text)text.textContent=edge?'请先准备本机模型，再重试发送；也可自行选择云端 AI。':'AI 本次未返回有效内容，请重试；也可自行选择本机模型。';
  }
};
