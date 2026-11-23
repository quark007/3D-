/* 星火勋章 · medal72 —— 第三批 P7（隔离区开发，待统一接线）
   只读聚合：铜≥60 / 银≥75 / 金≥90；五章节燎原进度条；daily_* 近30天守夜人进度。
   铁律：绝不写入 storyPreparations / battleScores，只读。
   图鉴挂载（集成时接线）：education43 hub() 追加「星火燎原 · 勋章总览」入口。 */
window.Medal72={
  VERSION:'1.0',
  CHAPTERS:['星火启程','血战转战','转折抉择','雪山草地','决战会师'],
  /* en: 条目键（prefix=storyPreparations 前缀；battle=[nodeId] 表示读 battleScores 取最高） */
  ENTRIES:[
    {key:'bridge72_1',label:'于都浮桥',ch:0},
    {key:'blanket72_2',label:'半条被子',ch:0},
    {key:'xjg67_2',label:'渡口阻击',ch:1},
    {key:'wujiang72_6',label:'乌江浮桥',ch:1},
    {key:'ferry72_6',label:'大渡河强渡',ch:1},
    {key:'battle:6,7',label:'神炮手',ch:1},
    {key:'scout67_5',label:'夜探渡口',ch:1},
    {key:'sidu67_4',label:'声东击西',ch:1},
    {key:'zunyi72_3',label:'遵义抉择',ch:2},
    {key:'poem72_3',label:'娄山关诗卷',ch:2},
    {key:'lantern72_4',label:'苟坝马灯',ch:2},
    {key:'gouba72_3',label:'苟坝夜灯',ch:2},
    {key:'snow68_8',label:'雪山速降',ch:3},
    {key:'fire68_9',label:'夜营守火种',ch:3},
    {key:'fishhook72_9',label:'金色的鱼钩',ch:3},
    {key:'wildveg72_9',label:'野菜资料辨识',ch:3},
    {key:'g30_9',label:'草地三十天',ch:3},
    {key:'run69_result',label:'长征Run',ch:3},
    {key:'lazikou68_10',label:'腊子口投弹',ch:4},
    {key:'wuqi68_11',label:'切尾巴之战',ch:4},
    {key:'drum67_12',label:'会师腰鼓',ch:4},
    {key:'press72_10',label:'哈达铺读报',ch:4},
    {key:'aid73_2',label:'湘江接应',ch:1},
    {key:'cipher73_4',label:'教学译报',ch:2},
    {key:'alliance73_5',label:'倾听与信任',ch:2},
    {key:'chains73_7',label:'铁索练习',ch:1},
    {key:'matches73_9',label:'守护火种',ch:3},
    {key:'mini71_warehouse_1',label:'补给仓库',ch:0},
    {key:'mini71_stretcher_2',label:'双人担架',ch:1},
    {key:'mini71_circuit_3',label:'断线重连',ch:2},
    {key:'mini71_ropes_5',label:'携行绳',ch:2},
    {key:'mini71_bridge_7',label:'木桥工坊',ch:1},
    {key:'mini71_archive_11',label:'档案修复',ch:4}
  ],
  TIERS:[{min:90,id:'gold',label:'金星火'},{min:75,id:'silver',label:'银星火'},{min:60,id:'bronze',label:'铜星火'}],
  _gs(){return typeof GameState!=='undefined'?GameState:window.GameState;},
  forGame(prefix,score){
    if(!Number.isFinite(score))return {tier:null,label:''};
    for(const t of this.TIERS)if(score>=t.min)return {tier:t.id,label:t.label};
    return {tier:null,label:''};
  },
  bestOf(entry){
    const GS=this._gs();
    try{
      if(entry.key.startsWith('battle:')){
        const ids=entry.key.slice(7).split(',').map(Number);
        const bs=(GS&&Array.isArray(GS.battleScores))?GS.battleScores:[];
        let best=null;
        for(const r of bs)if(ids.includes(Number(r&&r.nodeId))&&r&&Number.isFinite(r.score))best=Math.max(best??-1,r.score);
        return best;
      }
      const sp=GS&&GS.storyPreparations;
      if(!sp)return null;
      let best=null;
      const direct=sp[entry.key]?.bestScore??sp[entry.key]?.score;if(Number.isFinite(direct))best=direct;
      /* 前缀聚合：run69_result 等精确键之外，允许 prefix_ 系列取最高 */
      for(const k in sp){
        if(k===entry.key)continue;
        if(entry.key.endsWith('_result')?false:(k.startsWith(entry.key+'_')||k===entry.key)){
          const v=sp[k]?.bestScore??sp[k]?.score;
          if(Number.isFinite(v))best=Math.max(best??-1,v);
        }
      }
      return best;
    }catch{return null;}
  },
  overview(){
    const rows=this.ENTRIES.map(e=>{
      const best=this.bestOf(e);
      return {key:e.key,label:e.label,ch:e.ch,best,tier:best===null?null:this.forGame(e.key,best).tier};
    });
    const chapters=this.CHAPTERS.map((name,i)=>({
      name,total:rows.filter(r=>r.ch===i).length,
      done:rows.filter(r=>r.ch===i&&r.tier).length,
      full:rows.filter(r=>r.ch===i).every(r=>r.tier&&r.tier!=='bronze'||r.tier==='gold'||r.tier==='silver'||r.tier==='bronze')&&rows.filter(r=>r.ch===i).every(r=>!!r.tier)
    }));
    const earned=rows.filter(r=>r.tier).length;
    return {rows,chapters,earned,total:rows.length,nightwatch:this.nightwatch()};
  },
  nightwatch(){
    const GS=this._gs(),sp=GS&&GS.storyPreparations;if(!sp)return 0;
    const now=Date.now();let n=0;
    for(const k in sp){
      if(!k.startsWith('daily_'))continue;
      const d=k.slice(6);
      const t=Date.parse(d);
      if(!isNaN(t)&&now-t>=0&&now-t<30*864e5)n++;
    }
    return n;
  },
  /* 渲染：燎原进度条（container 为任意 DOM 元素） */
  renderBar(container){
    if(!container)return null;
    const ov=this.overview();
    const box=document.createElement('div');
    box.className='medal72-bar';
    box.innerHTML='<style>.medal72-bar{font:14px/1.6 \'Microsoft YaHei\',sans-serif;color:#e8e2d2;background:#14161a;border:1px solid #4a4d52;border-radius:12px;padding:14px 16px;max-width:720px}'
      +'.medal72-bar h3{margin:0 0 4px;color:#ffcf24;font-size:18px}.medal72-bar small{color:#8b8e93;letter-spacing:.18em;font-size:11px}'
      +'.medal72-track{height:14px;background:#1a1c20;border-radius:7px;overflow:hidden;margin:10px 0}.medal72-fill{height:100%;background:linear-gradient(90deg,#e5484d,#ffcf24);width:0;transition:width .6s ease}'
      +'.medal72-chs{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.medal72-ch{padding:6px 10px;border:1px solid #4a4d52;border-radius:8px;background:#101114;color:#9a9c9f;font-size:12px}'
      +'.medal72-ch.lit{border-color:#ffcf24;color:#ffcf24;box-shadow:0 0 10px rgba(255,207,36,.25)}'
      +'.medal72-rows{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-top:8px}'
      +'.medal72-row{display:flex;justify-content:space-between;background:#101114;border:1px solid #33363b;border-radius:6px;padding:5px 9px;font-size:12px}'
      +'.medal72-row b{font-weight:900}.medal72-g{color:#ffcf24}.medal72-s{color:#cfd8dc}.medal72-b{color:#d08a4a}.medal72-n{color:#55585d}.medal72-nw{margin-top:8px;color:#7ecbff;font-size:12px}</style>'
      +'<h3>燎原进度 <small>SPARK TO PRAIRIE FIRE</small></h3>'
      +'<div class="medal72-track"><div class="medal72-fill"></div></div>'
      +'<div style="font-size:12px;color:#9a9c9f">已燃星火 '+ov.earned+' / '+ov.total+'</div>'
      +'<div class="medal72-chs">'+ov.chapters.map((c,i)=>'<span class="medal72-ch'+(c.full?' lit':'')+'">'+c.name+' '+c.done+'/'+c.total+'</span>').join('')+'</div>'
      +'<div class="medal72-rows">'+ov.rows.map(r=>'<div class="medal72-row"><span>'+r.label+'</span><b class="medal72-'+(r.tier?r.tier[0]:'n')+'">'+(r.tier==='gold'?'金':r.tier==='silver'?'银':r.tier==='bronze'?'铜':'—')+'</b></div>').join('')+'</div>'
      +'<div class="medal72-nw">守夜人：近 30 天完成每日挑战 '+ov.nightwatch+' 天</div>';
    container.append(box);
    requestAnimationFrame(()=>{const f=box.querySelector('.medal72-fill');if(f)f.style.width=(ov.total?Math.round(ov.earned/ov.total*100):0)+'%';});
    return box;
  },
  init(){
    /* 自动挂载点：优先复用 education43 徽章墙逻辑由集成接线；此处提供手动 API */
    if(this._inited)return;this._inited=true;
    if(typeof window.__MEDAL72_HOOK__==='function')window.__MEDAL72_HOOK__(this);
  }
};
