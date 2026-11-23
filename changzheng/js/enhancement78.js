/* Connect narrative sound priorities to the new manager; no second music player. */
window.Enhancement78={
 sync(){if(document.hidden)return;const b=window.BGM;if(!b)return;const dialog=!!document.querySelector('dialog[open],.npc-overlay.open,.decision-film-overlay,.decision-cinema-overlay');if(dialog!==this.dialog){this.dialog=dialog;b[dialog?'duck':'unduck']('dialog78');}
 const speaking=!!window.speechSynthesis?.speaking||[...document.querySelectorAll('audio,video')].some(m=>!m.paused&&!m.muted&&m.volume>0);if(speaking!==this.speaking){this.speaking=speaking;b[speaking?'duck':'unduck']('narration78');}
 },
 install(){if(this.installed)return;this.installed=true;this.observer=new MutationObserver(()=>this.sync());this.observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','class']});this.timer=setInterval(()=>this.sync(),250);for(const e of ['play','pause','ended'])document.addEventListener(e,()=>this.sync(),true);document.addEventListener('visibilitychange',()=>this.sync());this.sync();window.addEventListener('pagehide',()=>{this.observer.disconnect();clearInterval(this.timer);},{once:true});}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>Enhancement78.install(),{once:true});else Enhancement78.install();
