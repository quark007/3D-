/* Original SVG teaching illustrations; symbolic scenes, never archival imagery. */
const SvgScenes = {
  kind(node) {
    if(node.journeyCrossing) return 'pontoon';
    if (node.id === 3) return 'meeting';
    if (node.id === 8) return 'snow';
    if (node.id === 9) return 'grass';
    if ([5,6,7].includes(node.id)) return 'river';
    if ([11,12].includes(node.id)) return 'reunion';
    return node.type === 'battle' ? 'battle' : 'march';
  },
  render(node, context = {}) {
    if(typeof SceneLibrary!=='undefined'&&!SceneLibrary.ready)return SceneLibrary.placeholder(node);
    if(typeof LongMarch3D!=='undefined' && typeof THREE!=='undefined')return LongMarch3D.markup(node);
    const film = typeof CinemaAssets !== 'undefined' ? CinemaAssets.renderFor(node,context) : '';
    if(film)return film;
    const kind = this.kind(node);
    const person = (x,y,delay=0) => `<g class="svg-walker" style="animation-delay:${delay}s" transform="translate(${x} ${y})"><circle cy="-34" r="8" fill="#d3be97"/><path d="M-9-43h18l4 8h-26z" fill="#777e60"/><path d="M-9-23h18v24h-18z" fill="#828768"/><path d="M-6 0l-6 22m18-22 8 22M-9-16l-13 15m31-15 13 12" stroke="#828768" stroke-width="7" stroke-linecap="round"/><path d="M-4-18h8v18h-8z" fill="#a59265"/></g>`;
    const id = `scene-${node.id}`;
    const palettes = {
      pontoon:['#172b39','#4c6870','#d9bd85'],
      meeting:['#331c20','#75402d','#e6b875'], snow:['#142c3d','#638799','#d4e6e0'],
      grass:['#122d2c','#657951','#d3be84'], river:['#112f38','#477678','#e1ba82'],
      march:['#291e28','#855247','#e6bc7a'], battle:['#261d25','#794b3b','#e5b370'], reunion:['#351f26','#975340','#efd299']
    };
    const palette = palettes[kind];
    let drawing = '';
    if (kind === 'meeting') drawing = `<path d="M170 90h460v240H170z" fill="#332c22" stroke="#8d7955"/><path d="M210 116h110v100H210zm270 0h110v100H480z" fill="#171e20" stroke="#8d7955"/><path d="M212 165h106m-53-47v96m217-49h106m-53-47v96" stroke="#8d7955"/><ellipse cx="400" cy="288" rx="168" ry="34" fill="#806745"/><path d="M252 286v60m296-60v60" stroke="#614d34" stroke-width="12"/><g class="svg-lamp"><path d="M393 224h14l9 46h-32z" fill="#d8b873"/><ellipse cx="400" cy="242" rx="27" ry="42" fill="#e9c781" opacity=".2"/></g><path d="M340 273l40-6 19 19-40 6zm89-2 41 5-16 19-41-5z" fill="#d7c79e"/>`;
    else if(kind === 'pontoon') drawing = `<path d="M0 245Q180 220 400 250T800 245v155H0z" fill="#324d58"/><g class="svg-river" stroke="#b4cac3" opacity=".3" fill="none"><path d="M-80 315q90-20 180 0t180 0t180 0t180 0t180 0M-100 350q100-20 200 0t200 0t200 0t200 0"/></g><g fill="#5f6659" stroke="#c6b48a" stroke-width="2">${[130,260,390,520,650].map(x=>`<path d="M${x-38} 270h76l-12 22h-52z"/>`).join('')}</g><path d="M60 262h680" stroke="#b7a27a" stroke-width="10"/><g stroke="#65543f" stroke-width="2">${Array.from({length:34},(_,i)=>`<path d="M${65+i*20} 257v10"/>`).join('')}</g>${person(270,255)}${person(360,255,-.4)}${person(450,255,-.8)}`;
    else if (kind === 'river') drawing = `<path d="M0 270Q160 210 400 270T800 270v130H0z" fill="#354c4c"/><g class="svg-river" stroke="#b0c3bc" opacity=".38" fill="none"><path d="M-80 315q90-20 180 0t180 0t180 0t180 0t180 0M-100 350q100-20 200 0t200 0t200 0t200 0"/></g><path d="M60 220Q400 300 740 190M60 235Q400 315 740 205" fill="none" stroke="#c7b584" stroke-width="4"/><path d="M70 222v65m660-92v65" stroke="#897d61" stroke-width="10"/>${person(270,245)}${person(360,256,-.4)}${person(450,250,-.8)}`;
    else if (kind === 'snow') drawing = `<path d="M0 330 225 70 420 330 570 40 800 330z" fill="#a5b1ab"/><path d="M134 175 225 70l93 124-63-24-32 24-35-30zm350-18 86-117 92 127-62-28-29 20-33-31z" fill="#e3e7db"/><g class="svg-snow" fill="#edf0e3">${[100,230,360,500,640,740].map((x,i)=>`<circle cx="${x}" cy="${65+i*27}" r="3"/>`).join('')}</g>${person(290,300)}${person(365,284,-.4)}${person(440,267,-.8)}`;
    else if (kind === 'grass') drawing = `<path d="M0 250q200-45 400 5t400-5v150H0z" fill="#59684c"/><ellipse cx="540" cy="315" rx="150" ry="33" fill="#364c44"/><path d="M60 325q230 20 390-70" stroke="#b7aa79" stroke-width="28" fill="none"/>${person(230,290)}${person(310,276,-.5)}<g stroke="#8f9c6a" stroke-width="3"><path d="M650 325v-65m0 30-20-18m20 30 20-18M710 350v-65m0 30-20-18"/></g>`;
    else drawing = `<path d="M0 290 120 190 260 275 440 140 620 260 800 180v220H0z" fill="#46513f"/><path d="M0 360q240-60 800-20" fill="none" stroke="#9c8b63" stroke-width="35"/>${person(240,320)}${person(320,312,-.3)}${person(400,309,-.6)}<g class="svg-flag"><path d="M510 326V170" stroke="#aa9773" stroke-width="5"/><path d="M513 173q44-15 92 0v55q-48-15-92 0z" fill="#8f3430"/></g>`;
    return `<figure class="svg-scene svg-scene-${kind}"><svg viewBox="0 0 800 400" role="img" aria-label="${node.name}场景示意动画"><defs><linearGradient id="${id}-sky" x2=".8" y2="1"><stop stop-color="${palette[0]}"/><stop offset="1" stop-color="${palette[1]}"/></linearGradient><radialGradient id="${id}-sun"><stop stop-color="${palette[2]}" stop-opacity=".7"/><stop offset="1" stop-color="${palette[2]}" stop-opacity="0"/></radialGradient><linearGradient id="${id}-veil" x2="0" y2="1"><stop stop-color="#101217" stop-opacity="0"/><stop offset="1" stop-color="#101217" stop-opacity=".6"/></linearGradient></defs><rect width="800" height="400" fill="url(#${id}-sky)"/><ellipse cx="645" cy="95" rx="190" ry="145" fill="url(#${id}-sun)"/><circle cx="655" cy="84" r="30" fill="${palette[2]}" opacity=".75"/><path d="M0 245 140 135 300 240 470 110 650 230 800 125v275H0z" fill="${palette[0]}" opacity=".6"/>${drawing}<g class="svg-mist" fill="none" stroke="${palette[2]}" stroke-width="22" opacity=".065"><path d="M-100 190q260-42 500-10t540-20M-150 220q240-35 500-6t550-20"/></g><rect width="800" height="400" fill="url(#${id}-veil)"/></svg><figcaption>场景示意 · SVG 动画 · 非历史影像</figcaption></figure>`;
  }
};
