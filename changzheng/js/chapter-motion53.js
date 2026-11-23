/* Decorative fictional scenery only. No clocks, game-state changes or video substitution. */
const ChapterMotion53={
  themes:[
    ['星夜启程','march','#739389'],['湘江接应','river','#6b9098'],
    ['灯下研读','lamp','#c5a26c'],['赤水联络','river','#73998e'],
    ['金沙渡船','boat','#b39969'],['大渡接应','boat','#749aa1'],
    ['铁索协作','bridge','#b49771'],['雪山互助','snow','#c5dadd'],
    ['草地同行','grass','#a6b88c'],['山口联络','pass','#b6ab86'],
    ['陕北落脚','village','#c7a477'],['会师相迎','flag','#d0b16c']
  ],
  art(node){
    const [name,type,color]=this.themes[Math.max(0,Math.min(11,Number(node)-1))]||this.themes[0];
    const water='<g class="cm53-drift" fill="none" stroke="currentColor" opacity=".55"><path d="M-100 370Q100 340 300 370T700 370T1100 370"/><path d="M-80 402Q120 372 320 402T720 402T1120 402"/></g>';
    const marks={
      march:'<path d="M70 480Q260 405 430 440T850 330" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="9 15"/>',
      river:water,
      boat:water+'<g class="cm53-boat" fill="#252e27" stroke="currentColor"><path d="M310 350H620L580 385H355Z"/><path d="M460 350V250M460 250L535 333H460"/></g>',
      bridge:'<g fill="none" stroke="currentColor" stroke-width="3"><path d="M30 270Q500 460 970 270M30 295Q500 485 970 295"/><path d="M80 292V315M180 325V350M280 352V377M380 369V394M480 375V400M580 372V397M680 359V384M780 336V361M880 305V330"/></g>',
      snow:'<path d="M60 360L255 140 440 360 665 105 930 360 760 275 665 210 590 270 490 315 355 270 255 225 160 300Z" fill="currentColor" opacity=".25"/>',
      grass:'<g fill="none" stroke="currentColor" opacity=".6"><path d="M90 460l-12-56m12 56l20-43M240 470l-20-65m20 65l25-48M420 460l-13-70m13 70l23-41M710 472l-17-58m17 58l26-40M890 468l-18-71m18 71l23-44"/></g>',
      lamp:'<g stroke="currentColor" fill="#343326"><path d="M365 400V355L500 330 635 355V400L500 375Z"/><path d="M500 330V375M730 390V288M700 390H760M707 288Q730 245 753 288Z"/><ellipse class="cm53-glow" cx="730" cy="283" rx="50" ry="70" fill="currentColor" opacity=".12"/></g>',
      pass:'<path d="M0 500L140 200 330 340 410 480M1000 500L870 170 670 340 570 480" fill="#364137" stroke="currentColor" opacity=".65"/>',
      village:'<g stroke="currentColor" fill="#30382b"><path d="M230 420V345L315 295 400 345V420ZM460 420V350L540 310 620 350V420Z"/><path d="M290 420V375Q315 347 340 375V420M515 420V380Q540 355 565 380V420"/></g>',
      flag:'<g stroke="currentColor"><path d="M495 425V220" stroke-width="4"/><path class="cm53-flag" d="M498 225Q560 205 610 230T725 225L715 315Q655 335 605 310T498 315Z" fill="#953d32"/></g>'
    };
    const motes=Array.from({length:8},(_,i)=>`<circle cx="${80+i*120}" cy="${120+(i*53)%230}" r="${type==='snow'?3:1.5}" fill="currentColor"/>`).join('');
    return `<svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="color:${color}"><path fill="#172b2c" d="M0 390L130 240 240 325 400 160 550 330 720 200 1000 370V560H0Z"/><path fill="#263b33" d="M0 460L180 350 320 410 500 290 730 430 900 330 1000 400V560H0Z"/>${marks[type]||marks.march}<g class="cm53-motes">${motes}</g><circle class="cm53-pulse" cx="500" cy="390" r="78" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="cm53-caption">${name} · 原创剧情氛围</span>`;
  },
  mount(node){
    const overlay=document.getElementById('qteOverlay');if(!overlay)return;
    let layer=overlay.querySelector('.chapter-motion53');
    if(!layer){layer=document.createElement('div');layer.className='chapter-motion53';overlay.prepend(layer);}
    layer.innerHTML=this.art(node);layer.dataset.node=String(node);this.layer=layer;
  },
  pulse(){
    if(!this.layer?.isConnected||!GameUI.qteActive||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const now=Date.now();if(now-(this.lastPulse||0)<180)return;this.lastPulse=now;
    this.animation?.cancel();
    this.animation=this.layer.querySelector('.cm53-pulse')?.animate?.([{opacity:.7,transform:'scale(.65)'},{opacity:0,transform:'scale(1.7)'}],{duration:650,easing:'ease-out'});
  },
  install(){
    if(this.installed||typeof GameUI==='undefined')return;this.installed=true;
    const start=GameUI.startQTE;GameUI.startQTE=function(node){const r=start.apply(this,arguments);if(this.qteActive)ChapterMotion53.mount(node?.id||1);return r;};
    document.getElementById('qteClimbBtn')?.addEventListener('click',()=>this.pulse());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.animation?.cancel();});
  }
};
document.addEventListener('DOMContentLoaded',()=>ChapterMotion53.install());
