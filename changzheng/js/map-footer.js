/* Bottom controls occupy layout space instead of floating over each other. */
document.addEventListener('DOMContentLoaded',()=>{
  const nav=document.querySelector('.nav-bottom'),steps=document.querySelector('.node-nav'),note=document.querySelector('.compliance-stamp'),dock=document.querySelector('.experience-dock');
  if(!nav||!steps)return;
  const footer=document.createElement('section');footer.className='map-footer';footer.setAttribute('aria-label','行军控制与功能入口');
  const secondary=document.createElement('div');secondary.className='map-footer-secondary';
  footer.append(steps);if(dock)secondary.append(dock);if(note){note.querySelector('.compliance-text').textContent='本内容仅供历史教育使用 · 体验数值不代表历史统计';secondary.append(note);}footer.append(secondary);nav.before(footer);
  let frame;const fit=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(typeof MapView!=='undefined')MapView.refit();});};
  new ResizeObserver(fit).observe(document.getElementById('mapContainer'));fit();
});
