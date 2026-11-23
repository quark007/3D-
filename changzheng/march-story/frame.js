/* Only local files registered below may communicate. Per-launch nonce, source AND origin checks. */
(() => {
  'use strict';
  const games=[
    ['mnist-lock','手写数字辨识','mnist_success'],['keypad-lock','密码锁研习','keypad_success'],['memory-match','线索记忆','memory_success'],
    ['tic-tac-toe','井字棋研习','tictac_success'],['huarong-15','样本重排','huarong_success'],['mine-sweeper','路障排查','mine_success'],['sokoban-dark','物资推箱','sokoban_success']
  ];
  function validMessage(event,frame,sessionId,signal){return event.origin===location.origin && event.source===frame.contentWindow && event.data?.type==='czmarch:minigame-result' && event.data.sessionId===sessionId && event.data.signal===signal && event.data.status==='completed';}
  async function start(row,signal){
    const game=games.find(g=>'minigames/'+g[0]+'.html'===row.path);if(!game)return {status:'error',reason:'未登记的本地小游戏路径'};
    const {d,body,foot}=window.CZMarchUI.dialog(row.title,signal),frame=document.createElement('iframe'),sessionId=crypto.randomUUID();
    frame.className='march83-frame';frame.title=row.title;frame.src=row.path+'?czMarchSession='+encodeURIComponent(sessionId);frame.setAttribute('sandbox','allow-scripts allow-same-origin');
    const warning=window.CZMarchUI.el('p','独立研习 · 不影响主线进度。关闭、后退与载入超时均不算完成。');warning.setAttribute('role','status');body.append(warning,frame);
    let result={status:'cancelled'};
    return new Promise(resolve=>{
      const receive=event=>{if(signal.aborted || !validMessage(event,frame,sessionId,game[2]))return;result={status:'completed'};d.close();};
      const fail=()=>{warning.textContent='小游戏载入失败，可返回场景后重试；本次未完成。';};frame.addEventListener('error',fail);window.addEventListener('message',receive);
      foot.append(window.CZMarchUI.button('返回场景',()=>d.close()));
      d.addEventListener('close',()=>{window.removeEventListener('message',receive);frame.removeEventListener('error',fail);frame.src='about:blank';resolve(result);},{once:true});
    });
  }
  window.CZMarchFrame={games,validMessage,start};
})();
