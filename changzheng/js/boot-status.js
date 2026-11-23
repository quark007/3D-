/* A small independent listener gives feedback even while the game program is downloading. */
(()=>{if(window.CZ_BOOT)return;const boot=window.CZ_BOOT={ready:false,requested:null,errors:[]};
 function status(text){let output=document.getElementById('gameBootStatus');const title=document.getElementById('titleScreen');if(!output&&title){output=document.createElement('p');output.id='gameBootStatus';output.className='game-boot-status';output.setAttribute('role','status');title.querySelector('.title-actions')?.after(output);}if(output)output.textContent=text;}
 function ready(){if(!window.CZ_RUNTIME_READY)return;boot.ready=true;status('剧情已就绪 · 点击开始即可选择岗位');document.getElementById('titleStart')?.removeAttribute('aria-busy');if(boot.requested){const id=boot.requested;boot.requested=null;document.getElementById(id)?.click();}}
 document.addEventListener('click',event=>{const button=event.target.closest?.('#titleStart,#titleDemo,#titleHighlights,#titleMorse');if(!button||boot.ready)return;event.preventDefault();event.stopImmediatePropagation();boot.requested=button.id;button.setAttribute('aria-busy','true');status(boot.errors.length?'剧情程序未准备好，请点击“重新加载”。存档会保留。':'正在准备剧情程序，完成后会进入你选择的入口…');},true);
 window.addEventListener('error',event=>{if(boot.ready||event.target?.dataset?.optionalScene!==undefined)return;const tag=event.target?.tagName;if(tag==='SCRIPT'||event.message){boot.errors.push(tag==='SCRIPT'?'script':'runtime');status('剧情程序加载失败，可重新加载页面。你的存档会保留。');}},true);
 window.addEventListener('unhandledrejection',event=>{boot.errors.push('rejection');try{console.warn('[unhandledrejection]',event.reason);}catch{}const now=Date.now();if(now-(boot.lastRejectionToast||0)<30000)return;boot.lastRejectionToast=now;if(typeof GameUI!=='undefined'&&typeof GameUI.showToast==='function')GameUI.showToast('部分联网功能暂不可用，主线剧情不受影响');});
 window.addEventListener('cz-game-ready',ready);document.addEventListener('DOMContentLoaded',ready);
 /* [R5 修复 2026-10-28] 本文件是 async 脚本，可能晚于 DOMContentLoaded/cz-game-ready 才执行，
    两个通知都已错过时 boot.ready 永远为 false，开始按钮会被上面的捕获层永久吞掉。
    兜底：监听 game-ui.js 置位 CZ_RUNTIME_READY 时补发的 cz-runtime-ready 事件；
    若执行时文档已过解析期（错过了两个通知），立即自检一次。 */
 window.addEventListener('cz-runtime-ready',ready);
 if(document.readyState!=='loading')ready();
 setTimeout(()=>{if(boot.ready)return;status('剧情程序仍在下载。可等待，或重新加载重试。');const output=document.getElementById('gameBootStatus');if(output&&!output.querySelector('button')){const retry=document.createElement('button');retry.type='button';retry.textContent='重新加载';retry.onclick=()=>location.reload();output.append(' ',retry);}},12000);
})();
