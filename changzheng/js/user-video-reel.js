/* Lazy chapter reel. Only an explicitly opened clip receives a video source. */
const UserVideoReel={
  manifest:null,pending:null,states:new WeakMap(),
  async load(){if(this.manifest)return this.manifest;if(!this.pending){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);this.pending=fetch('assets/story-media/ldq35/manifest.json',{cache:'no-cache',signal:controller.signal}).then(r=>{if(!r.ok)throw Error('reel');return r.json();}).then(data=>{if(data.chapter!==7||!Array.isArray(data.clips)||!data.clips.length||!data.clips.every(c=>/^assets\/story-media\/ldq35\/ldq-\d{2}\.mp4$/.test(c.localSrc)&&/^assets\/story-media\/ldq35\/ldq-\d{2}\.webp$/.test(c.poster)))throw Error('manifest');data.clips=data.clips.filter(c=>!c.quarantined&&c.eligible!==false);this.manifest=data;return data;}).finally(()=>{clearTimeout(timer);this.pending=null;});}return this.pending;},
  markup(){return '<section class="chapter-screening user-video-screening" data-chapter="7"><div class="chapter-screening-title"><small>第07程 / 新增剧情影像</small><h3>泸定 · 铁索之上</h3><p>接近桥梁、悬空攀索、战友互助与征途回望。</p></div><details data-user-reel="ldq35"><summary>▶ 查看23段新分镜 · 点击后载入</summary><div class="user-reel-body"><p class="user-reel-status" role="status">展开后可选择片段，不会预加载整组视频。</p><label>选择分镜<select aria-label="选择泸定桥分镜" disabled></select></label><video controls playsinline preload="none" aria-label="泸定桥剧情分镜"></video><div class="user-reel-actions"><button type="button" data-reel-prev>← 上一段</button><button type="button" data-reel-next>下一段 →</button><a href="video-review.html?collection=ldq35">打开完整新片库 ↗</a></div><p>用户提供的AI剧情演绎，非历史实拍。插旗、受伤与尾声为分镜回看，不代表当前任务已完成。</p></div></details></section>';},
  release(root){const video=root.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load();}},
  async open(root){
    const message=root.querySelector('.user-reel-status');message.textContent='正在整理本章分镜…';
    try{
      const manifest=await this.load();if(!root.isConnected||!root.open)return;
      let state=this.states.get(root);
      if(!state){
        state={index:0};this.states.set(root,state);const select=root.querySelector('select');select.replaceChildren();
        manifest.clips.forEach((clip,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=String(clip.number).padStart(2,'0')+' · '+clip.title;select.append(option);});select.disabled=false;
        select.onchange=()=>{state.index=select.selectedIndex;this.show(root,manifest,state);};
        root.querySelector('[data-reel-prev]').onclick=()=>{state.index=Math.max(0,state.index-1);this.show(root,manifest,state);};
        root.querySelector('[data-reel-next]').onclick=()=>{state.index=Math.min(manifest.clips.length-1,state.index+1);this.show(root,manifest,state);};
      }
      this.show(root,manifest,state);
    }catch{if(root.isConnected)message.textContent='分镜暂未读取成功，可收起后重开；文字任务仍可继续。';}
  },
  show(root,manifest,state){
    const video=root.querySelector('video'),clip=manifest.clips[state.index];this.release(root);root.querySelector('select').selectedIndex=state.index;
    video.poster=clip.poster;video.src=clip.localSrc;video.preload='none';video.muted=true;
    root.querySelector('.user-reel-status').textContent=`${state.index+1} / ${manifest.clips.length} · ${clip.title} · 约${Math.round(clip.duration)}秒${clip.has_audio?' · 默认静音，可在播放器打开声音':' · 无原片声音'}`;
    video.onerror=()=>{root.querySelector('.user-reel-status').textContent='当前片段暂未就绪，可换片或继续文字任务。';};
    root.querySelector('[data-reel-prev]').disabled=state.index===0;root.querySelector('[data-reel-next]').disabled=state.index===manifest.clips.length-1;
  },
  install(){
    if(this.installed||typeof ChapterPresentation==='undefined')return;this.installed=true;
    const markup=ChapterPresentation.markup;ChapterPresentation.markup=function(node){return Number(node?.id)===7?UserVideoReel.markup():markup.apply(this,arguments);};
    document.addEventListener('toggle',event=>{const root=event.target;if(!root.matches?.('[data-user-reel="ldq35"]'))return;if(root.open)this.open(root);else this.release(root);},true);
    this.observer=new MutationObserver(rows=>{for(const row of rows)for(const node of row.removedNodes){if(node.nodeType!==1)continue;if(node.matches?.('[data-user-reel]'))this.release(node);for(const root of node.querySelectorAll?.('[data-user-reel]')||[])this.release(root);}});
    this.observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('pagehide',event=>{if(event.persisted)return;this.observer.disconnect();document.querySelectorAll('[data-user-reel]').forEach(root=>this.release(root));},{once:true});
  }
};document.addEventListener('DOMContentLoaded',()=>UserVideoReel.install());
