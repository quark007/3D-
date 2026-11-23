/* Short per-chapter celebration; final completion remains owned by Victory49. */
const ChapterVictory56={
  open(node,after){
    this.root?.close();const d=document.createElement('dialog');d.className='chapter-victory56';d.setAttribute('aria-label',node.name+'通关胜利');
    const art=document.createElement('div');
    art.innerHTML='<svg viewBox="0 0 400 180" aria-hidden="true"><path d="M8 148L75 58L120 115L185 25L248 116L304 66L392 148" fill="#b8ac8840" stroke="#9b865b" stroke-width="2"/><path class="victory-route56" d="M25 150C100 150 65 99 140 112S220 160 270 86S335 106 357 36" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><g class="victory-flag56"><path d="M355 22V89" stroke="#6d4930" stroke-width="4"/><path d="M357 22H391L382 35L391 48H357Z" fill="currentColor"/></g></svg>';
    const h=document.createElement('h2');h.textContent='本章通关胜利';const p=document.createElement('p');p.textContent=`第${node.id}章 · ${node.name}`;
    const note=document.createElement('p');note.textContent='已完成本章模拟协作。历史事实与游戏体验独立呈现，下一步查看史实。';
    const b=document.createElement('button');b.type='button';b.textContent='查看史实 · 继续征程';b.onclick=()=>d.close();
    d.append(art,h,p,note,b);document.body.append(d);this.root=d;
    d.addEventListener('close',()=>{d.remove();if(this.root===d)this.root=null;if(typeof after==='function')after();},{once:true});
    d.showModal();b.focus();return d;
  }
};
