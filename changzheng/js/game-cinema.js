/* Numbered SVG films use explicit historical/event gates, never AI-selected URLs. */
const CinemaAssets = {
  cacheVersion:'20261017cinema3',
  byId:new Map(CINEMA_MANIFEST.map(asset=>[asset.id,asset])),
  sequence:{1:[1,2,3,4,192,193],2:[5,6,7,8],3:[9,10,124,173],4:[11,12,79,86],5:[13,14,79,81],6:[15,16,79],7:[17,21,22,24,28],8:[19,58,67,68,70,72,102,135],9:[20,41,43,47,48,141,143],10:[107,109,113,115],11:[151,153,154],12:[112,152,164]},
  storyboards:{
    1:{entry:[1,2],briefing:[3,128,197],action:[4,192,193,194,195],resolve:[101,165]},
    2:{entry:[5],briefing:[31,35],action:[6,7,33],crisis:[8],resolve:[162,165]},
    3:{entry:[9],briefing:[10,124,130,173],action:[170,172],resolve:[162,165]},
    4:{entry:[11],briefing:[86,123],action:[12,89,90,97],resolve:[88,103,165]},
    5:{entry:[13],briefing:[79,123],action:[14,81,82],resolve:[131,136,165]},
    6:{entry:[15],briefing:[16,31],action:[92,93,115],resolve:[162,165]},
    7:{entry:[17],briefing:[21,22],action:[18,24,25,26,28],resolve:[27,99,165]},
    8:{entry:[19],briefing:[58,121,127],action:[67,68,69,70,71,72,102,135,194,199],resolve:[131,138,139,165]},
    9:{entry:[20],briefing:[41,42,44,56,59,121,125,127],action:[43,45,46,47,48,50,63,141,143],resolve:[49,131,138,139,140,165]},
    10:{entry:[107],briefing:[109,110,113],action:[115,116,117,198],resolve:[162,165]},
    11:{entry:[151],briefing:[121,153,154],action:[144,145,146,150],resolve:[152,162,165]},
    12:{entry:[152],briefing:[151,153,154],action:[112,101,103],resolve:[162,165]}
  },
  frame(id,options={}) {
    const a=this.byId.get(Number(id));if(!a)return '';
    if(!options.archive && (!a.automatic || a.kind==='archive'))return '';
    if(options.nodeId && !options.archive && a.nodes.length && !a.nodes.includes(options.nodeId))return '';
    const title=this.escape(a.title),file=this.escape(this.versioned(a.file)),video=this.videoUrl(a.id);
    const reduce=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData=typeof navigator!=='undefined'&&navigator.connection&&navigator.connection.saveData;
    const media=video&&!reduce&&!saveData
      ? `<video class="cinema-video" poster="${file}" muted loop autoplay playsinline preload="metadata" data-svg-fallback="${file}" aria-label="${title}，电影分镜动画"><source src="${this.escape(video)}" type="video/mp4"></video>`
      : `<img src="${file}" alt="${title}，SVG场景示意动画" width="1920" height="1080" decoding="async" loading="${options.loading||'eager'}">`;
    const format=video&&!reduce&&!saveData?'OBS视频':'SVG动画';
    return `<figure class="svg-scene cinema-frame" data-cinema-id="${a.id}">${media}<figcaption>分镜 ${String(a.id).padStart(3,'0')} · ${title} · ${format}，非历史影像</figcaption></figure>`;
  },
  escape(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));},
  versioned(file){return `${file}${file.includes('?')?'&':'?'}v=${this.cacheVersion}`;},
  obsBaseUrl(){try{return (localStorage.getItem('cz_obs_video_base')||'').trim().replace(/\/+$/,'');}catch{return ''; }},
  videoUrl(id){const base=this.obsBaseUrl();return base?`${base}/video-${String(Number(id)).padStart(3,'0')}.mp4`:'';},
  setObsBaseUrl(value){const clean=String(value||'').trim().replace(/\/+$/,'');try{clean?localStorage.setItem('cz_obs_video_base',clean):localStorage.removeItem('cz_obs_video_base');}catch{}return clean;},
  bindVideoFallbacks(root=document){
    root.querySelectorAll('video.cinema-video:not([data-fallback-bound])').forEach(video=>{
      video.dataset.fallbackBound='1';
      video.addEventListener('error',()=>this.replaceVideoWithSvg(video),{once:true});
      const source=video.querySelector('source');if(source)source.addEventListener('error',()=>this.replaceVideoWithSvg(video),{once:true});
    });
  },
  replaceVideoWithSvg(video){if(!video||!video.isConnected)return;const img=document.createElement('img');img.src=video.dataset.svgFallback||'';img.alt=video.getAttribute('aria-label')||'SVG场景示意动画';img.width=1920;img.height=1080;img.decoding='async';video.replaceWith(img);const caption=img.closest('figure')?.querySelector('figcaption');if(caption)caption.textContent=caption.textContent.replace('OBS视频','SVG动画（视频不可用）');},
  select(node,context={}) {
    if(node.journeyCrossing)return null; // Yudu pontoon stays distinct from boats and Luding iron chains.
    if(context.phase==='loading')return 166;
    if(context.flow==='journey') {
      if(context.stage===0)return 1;
      if(context.stage===1)return context.role==='medic'?131:context.role==='logistics'?3:193;
      if(context.stage===2)return 197;
      if(context.stage===3)return context.eventIndex===0?125:context.eventIndex===1?136:173;
      if(context.stage===5)return 165;
    }
    if(context.phase==='success' && node.id===7)return 99;
    const board=this.storyboards[node.id];
    const phase=context.phase==='qte'?'action':context.phase;
    if(board && phase && board[phase]) {
      const shots=board[phase];
      return shots[Math.max(0,context.shotIndex||0)%shots.length];
    }
    if(context.phase==='review')return 165;
    const candidates=this.sequence[node.id]||[];
    const index=Math.max(0,context.shotIndex||0)%Math.max(1,candidates.length);
    return candidates[index]||null;
  },
  renderFor(node,context={}) {
    const id=this.select(node,context);
    if(!id)return '';
    return this.frame(id,{nodeId:node.id});
  },
  alternatives(node,context={}) {
    const eligible=CINEMA_MANIFEST.filter(a=>a.nodes.includes(node.id)&&a.kind==='scene'&&a.automatic);
    const list=eligible.map(a=>`<option value="${a.id}">${String(a.id).padStart(3,'0')} · ${this.escape(a.title)}</option>`).join('');
    return `<details class="cinema-catalog"><summary>本章分镜档案 · ${eligible.length} 条可用素材</summary><p>仅供查看场景意象。手部受伤、器材损毁等素材需要对应情节，不会随机插入。</p><a href="svg-cinema-gallery.html?node=${node.id}" target="_blank" rel="noopener">打开本章素材档案 ↗</a></details>`;
  }
  ,
  chapterPrelude(node) {
    const board=this.storyboards[node.id];
    if(!board)return '';
    const phases=[['entry','抵达'],['briefing','史料'],['action','任务'],['resolve','回望']];
    const cards=phases.map(([phase,label])=>{
      const id=(board[phase]||[])[0],a=this.byId.get(id);if(!a)return '';
      return `<div class="chapter-film-beat"><img src="${this.escape(this.versioned(a.file))}" alt="${this.escape(a.title)}，场景示意" loading="lazy"><span>${label}</span><b>${this.escape(a.title)}</b></div>`;
    }).join('');
    return `<section class="chapter-film-strip" aria-label="${this.escape(node.name)}剧情分镜"><div class="chapter-film-heading"><span>本章电影分镜</span><small>按剧情阶段调用 · 非历史影像</small></div><div class="chapter-film-grid">${cards}</div></section>`;
  }
};
