/* ========================================
   长征·星火 — 地图渲染与交互 v7
   静态底图 + HTML div节点 + 百分比坐标
   UI精修版：水墨风节点 + 虚线行军路线 + 呼吸灯
   ======================================== */

/* ===== 地图视图引擎：缩放 + 平移 ===== */
const MapView = {
  container: null,
  world: null,
  scale: 1,
  panX: 0,
  panY: 0,
  MIN: 0.35,
  MAX: 3,
  BASE_W: 1000,
  BASE_H: 750,
  pointers: new Map(),
  lastDist: 0,
  viewMode: 'route',

  init() {
    this.container = document.querySelector('.map-view') || document.getElementById('mapContainer');
    this.world = document.getElementById('mapWorld');
    this.bindGestures();
    this.fitRoute();
    window.addEventListener('resize', () => this.refit());
    this.checkBaseImage();
  },

  refit() { return this.viewMode === 'all' ? this.fit() : this.fitRoute(); },

  fit() {
    this.viewMode = 'all';
    if (!this.container) return;
    const r = this.container.getBoundingClientRect();
    this.scale = Math.min(r.width / this.BASE_W, r.height / this.BASE_H) * 0.96;
    this.panX = 0;
    this.panY = 0;
    this.apply();
  },

  fitRoute() {
    this.viewMode = 'route';
    if (!this.container || typeof GAME_NODES === 'undefined' || !GAME_NODES.length) return this.fit();
    const rect = this.container.getBoundingClientRect();
    const xs = GAME_NODES.map(n => n.x * this.BASE_W / 100);
    const ys = GAME_NODES.map(n => n.y * this.BASE_H / 100);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    this.scale = Math.min(this.MAX, rect.width / (right-left+120), rect.height / (bottom-top+120)) * .88;
    this.panX = (this.BASE_W / 2 - (left+right) / 2) * this.scale;
    this.panY = (this.BASE_H / 2 - (top+bottom) / 2) * this.scale;
    this.apply();
  },

  apply() {
    if (!this.world) return;
    this.world.style.transform =
      `translate(${this.panX.toFixed(1)}px, ${this.panY.toFixed(1)}px) scale(${this.scale.toFixed(3)})`;
    this.world.style.setProperty('--map-inverse-scale', String(1 / this.scale));
    MapNodeBubble56.position();
  },

  checkBaseImage() {
    document.getElementById('mapBase')?.classList.add('ready');
  },

  bindGestures() {
    const c = this.container;

    c.addEventListener('wheel', (e) => {
      if(e.target.closest('.map-node-card56,.data-museum65'))return;
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      this.zoomAt(mx, my, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });

    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('button,input,a,.node-nav,.map-tools,.map-node-card56,.data-museum65')) return;
      // BUG 1修复：点击地图节点时不进行指针捕获，让click事件能正常触发
      if (e.target.closest('.map-node')) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      c.setPointerCapture(e.pointerId);
    });

    c.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      const prev = this.pointers.get(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size === 1) {
        this.panX += e.clientX - prev.x;
        this.panY += e.clientY - prev.y;
        this.apply();
      } else if (this.pointers.size === 2) {
        const pts = [...this.pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (this.lastDist > 10 && dist > 10) {
          const rect = c.getBoundingClientRect();
          const cx = (pts[0].x + pts[1].x) / 2 - rect.left - rect.width / 2;
          const cy = (pts[0].y + pts[1].y) / 2 - rect.top - rect.height / 2;
          this.zoomAt(cx, cy, dist / this.lastDist);
        }
        this.lastDist = dist;
      }
    });

    const up = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.lastDist = 0;
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
  },

  zoomAt(mx, my, factor) {
    const ns = Math.min(this.MAX, Math.max(this.MIN, this.scale * factor));
    this.panX = mx - (mx - this.panX) / this.scale * ns;
    this.panY = my - (my - this.panY) / this.scale * ns;
    this.scale = ns;
    this.apply();
  }
};

/* ===== 水墨风SVG图标定义 ===== */
const NODE_ICONS = {
  start: '<svg viewBox="0 0 24 24" class="node-icon-svg"><path d="M7 3 L7 21" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M7 3 L19 4.5 L16 8.5 L19 12.5 L7 11 Z" fill="currentColor" opacity="0.9"/></svg>',
  battle: '<svg viewBox="0 0 24 24" class="node-icon-svg"><path d="M12 2 Q8.5 5.5 9.5 10 Q11 8.5 12 11.5 Q13 8.5 14.5 10 Q15.5 5.5 12 2 Z" fill="currentColor"/><rect x="10.5" y="11.5" width="3" height="9.5" rx="1.2" fill="currentColor" opacity="0.85"/></svg>',
  meeting: '<svg viewBox="0 0 24 24" class="node-icon-svg"><path d="M12 2 L14.5 8.5 L21.5 9 L16 13.5 L18 21 L12 16.5 L6 21 L8 13.5 L2.5 9 L9.5 8.5 Z" fill="currentColor"/></svg>',
  nature: '<svg viewBox="0 0 24 24" class="node-icon-svg"><path d="M2 21 L8 9 L11.5 14.5 L16 5 L22 21 Z" fill="currentColor" opacity="0.9"/><path d="M8 9 L11.5 14.5" stroke="rgba(0,0,0,0.35)" stroke-width="0.8" fill="none"/></svg>',
  end: '<svg viewBox="0 0 24 24" class="node-icon-svg"><path d="M7 3 L7 21" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M7 3 L19 4.5 L16 8.5 L19 12.5 L7 11 Z" fill="currentColor" opacity="0.9"/><path d="M13 6.5 L14 8 L13 9.5 L12 8 Z" fill="rgba(0,0,0,0.5)"/></svg>'
};

// Five flag cuts distinguish node types without the former opaque circular badges.
for(const [type,cut] of Object.entries({start:'M6 3H22L18 8L22 13H6Z',battle:'M6 3L23 8L6 13Z',meeting:'M6 3H22V13H6Z',nature:'M6 3H22L18 8L22 13H6L9 8Z',end:'M6 3H22V15L14 11L6 15Z'}))NODE_ICONS[type]=`<svg viewBox="0 0 28 28" class="node-icon-svg" aria-hidden="true"><path d="M6 2V26" stroke="#684c33" stroke-width="2" stroke-linecap="round"/><path d="${cut}" fill="currentColor" stroke="#7b211d" stroke-width=".8"/></svg>`;

// Teaching schematic: historic anchors stay fixed; bends are stable, not invented locations.
function routeCurve56(a,b,index){
  const x=a.x*10,y=a.y*7.5,dx=(b.x-a.x)*10,dy=(b.y-a.y)*7.5;
  const distance=Math.hypot(dx,dy)||1,bend=Math.min(25,distance*.22)*(index%2?-1:1),nx=-dy/distance*bend,ny=dx/distance*bend;
  const f=n=>Number(n.toFixed(2));
  return `M ${f(x)} ${f(y)} C ${f(x+dx/3+nx)} ${f(y+dy/3+ny)} ${f(x+dx*2/3+nx)} ${f(y+dy*2/3+ny)} ${f(x+dx)} ${f(y+dy)}`;
}

const MapNodeBubble56={
  close(restore=false){const id=this.node?.id;this.layer?.remove();this.layer=null;this.node=null;if(restore)document.querySelector(`.map-node[data-node-id="${id}"]`)?.focus();},
  open(node){
    this.close();const host=MapView.container||document.querySelector('.map-view');if(!host)return;
    this.node=node;const layer=document.createElement('div');layer.className='map-node-layer56';
    const card=document.createElement('section');card.className='map-node-card56';card.setAttribute('role','region');card.setAttribute('aria-label',node.name+'站点信息');
    const title=document.createElement('h3');title.textContent=node.name;
    const date=document.createElement('p');date.textContent=node.date||'日期见史实资料';
    const type=document.createElement('p');type.textContent=node.typeLabel||NODE_TYPE_CONFIG[node.type]?.label||'路线站点';
    const actions=document.createElement('div'),enter=document.createElement('button'),close=document.createElement('button');
    enter.type=close.type='button';const locked=RouteMap.isNodeLocked(node.id);enter.textContent=locked?'完成上一站解锁':'开始剧情';enter.disabled=locked;
    enter.onclick=()=>{this.close();GameUI.showDungeonPanel(node);};close.textContent='关闭';close.onclick=()=>this.close(true);
    actions.append(enter,close);card.append(title,date,type,actions);layer.append(card);host.append(layer);this.layer=layer;this.position();
  },
  install(){
    if(this.installed)return;this.installed=true;
    document.addEventListener('click',e=>{if(e.target.closest('.map-view')&&!e.target.closest('.map-node,.map-node-card56,button,input,a,.node-nav,.map-tools'))this.close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.layer){this.close(true);}});
    window.addEventListener('resize',()=>this.position());
  },
  position(){
    if(!this.layer?.isConnected||!this.node)return;
    const anchor=document.querySelector(`.map-node[data-node-id="${this.node.id}"]`),host=this.layer.parentElement,card=this.layer.firstElementChild;if(!anchor)return this.close();
    const h=host.getBoundingClientRect(),r=anchor.getBoundingClientRect(),width=Math.min(270,Math.max(0,h.width-16));
    card.style.width=width+'px';card.style.maxHeight=Math.max(0,h.height-16)+'px';
    const height=card.getBoundingClientRect().height||170,x=r.left-h.left+r.width/2,y=r.top-h.top+r.height/2;
    const blockers=[...document.querySelectorAll('.map-node,.map-tools,.map-search,.map-collapse,.node-nav,.map-attribution,.data-museum65')].filter(n=>n!==anchor).map(n=>n.getBoundingClientRect());
    const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
    const spots=[[x+25,y-height/2],[x-width-25,y-height/2],[x-width/2,y+26],[x-width/2,y-height-26]].map(([left,top])=>{
      left=Math.max(8,Math.min(left,h.width-width-8));top=Math.max(8,Math.min(top,h.height-height-8));
      const rect={left:h.left+left,top:h.top+top,right:h.left+left+width,bottom:h.top+top+height};
      return {left,top,score:blockers.reduce((s,b)=>s+overlap(rect,b),0)+overlap(rect,r)*3};
    }).sort((a,b)=>a.score-b.score);
    card.style.left=spots[0].left+'px';card.style.top=spots[0].top+'px';
  }
};

/* ===== 路线渲染：div节点 + SVG path虚线 + 水墨风图标 ===== */
const RouteMap = {
  nodesLayer: null,
  linesLayer: null,
  completedLinesLayer: null,
  currentNodeId: 1,
  completedNodeIds: new Set(),
  focusIndex: 0,

  init() {
    this.nodesLayer = document.getElementById('nodesLayer');
    this.linesLayer = document.getElementById('linesLayer');
    this.completedLinesLayer = document.getElementById('completedLinesLayer');

    // Completion is awarded only when a chapter records its medal, not at preview time.
    this.completedNodeIds = new Set((GameState.medalRecords || []).map(m => m.nodeId).filter(id => GAME_NODES.some(n => n.id === id)));
    this.currentNodeId = (GAME_NODES.find(n => !this.completedNodeIds.has(n.id)) || GAME_NODES[GAME_NODES.length - 1]).id;
    this.focusIndex = this.currentNodeId - 1;
    this.renderNodes();
    this.renderLines();
    this.updateProgress();
    this.bindKeys();
    this.bindNodeNav();
    this.updateNavButtons();
    MapNodeBubble56.install();
  },

  renderNodes() {
    this.nodesLayer.innerHTML = '';

    GAME_NODES.forEach((node, idx) => {
      const config = NODE_TYPE_CONFIG[node.type];
      const isLocked = node.id > this.currentNodeId;
      const isCompleted = this.completedNodeIds.has(node.id);
      const isCurrent = node.id === this.currentNodeId;
      const isFocus = idx === this.focusIndex;
      const isStart = node.type === 'start';

      const div = document.createElement('div');
      div.className = `map-node ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isFocus ? 'focusing' : ''} ${isStart ? 'start-node' : ''}`;
      div.style.left = node.x + '%';
      div.style.top = node.y + '%';
      div.setAttribute('data-node-id', node.id);
      div.title=isLocked?'尚未抵达 · 完成当前章节后前往':`${node.name} · ${node.date||''}`;div.setAttribute('aria-label',div.title);div.tabIndex=0;div.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();div.click();}});

      const iconHtml = NODE_ICONS[node.type] || NODE_ICONS.battle;
      div.setAttribute('role','button');div.setAttribute('aria-haspopup','true');

      div.innerHTML = `
        ${isStart && !isLocked ? '<div class="node-pulse-ring"></div>' : ''}
        <div class="node-dot" style="--node-color: ${config.color};">
          ${iconHtml}
        </div>
        <div class="node-name-label">${node.name}</div>
        <div class="node-date-label">${node.date || ''}</div>
      `;

      div.addEventListener('click', () => this.onNodeClick(node, idx));
      this.nodesLayer.appendChild(div);
    });
    MapNodeBubble56.position();
  },

  renderLines() {
    const NS = 'http://www.w3.org/2000/svg';
    this.linesLayer.innerHTML = '';

    for (let i = 0; i < GAME_NODES.length - 1; i++) {
      const a = GAME_NODES[i];
      const b = GAME_NODES[i + 1];
      const path = document.createElementNS(NS, 'path');
      const d = routeCurve56(a,b,i);
      path.setAttribute('d', d);
      path.setAttribute('class', 'route-line');
      path.setAttribute('stroke', '#8B0000');
      path.setAttribute('stroke-width', '3.5');
      path.setAttribute('stroke-dasharray', '8 6');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', '0.75');
      path.setAttribute('filter', 'url(#glow-gold)');
      this.linesLayer.appendChild(path);
    }
  },

  renderCompletedLines() {
    const NS = 'http://www.w3.org/2000/svg';
    this.completedLinesLayer.innerHTML = '';

    const completedNodes = GAME_NODES.filter(n => this.completedNodeIds.has(n.id));
    for (let i = 0; i < completedNodes.length - 1; i++) {
      const a = completedNodes[i];
      const b = completedNodes[i + 1];
      if (b.id !== a.id + 1) continue;
      const path = document.createElementNS(NS, 'path');
      const d = routeCurve56(a,b,GAME_NODES.indexOf(a));
      path.setAttribute('d', d);
      path.setAttribute('class', 'route-line-completed');
      path.setAttribute('stroke', '#D4AF5A');
      path.setAttribute('stroke-width', '3.5');
      path.setAttribute('stroke-dasharray', '8 6');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', '0.85');
      path.setAttribute('filter', 'url(#glow-gold)');
      this.completedLinesLayer.appendChild(path);
    }
  },

  onNodeClick(node, idx) {
    const same=MapNodeBubble56.node?.id===node.id;
    this.focusIndex = idx;
    this.renderNodes();
    this.updateNavButtons();
    if(same)MapNodeBubble56.close();else MapNodeBubble56.open(node);
  },

  bindNodeNav() {
    const prevBtn = document.getElementById('btnPrevNode');
    const nextBtn = document.getElementById('btnNextNode');
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevNode());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextNode());
  },

  bindKeys() {
    document.addEventListener('keydown', (e) => {
      if(document.body.classList.contains('at-title')||document.querySelector('.sandbox-overlay,.npc-overlay.open,.journey-overlay,.pressure-overlay,.command-overlay.open,.learning-overlay.open,.zunyi-chapter-overlay,.award-demo-overlay,.experience-overlay,.decision-film-overlay,dialog[open],.char-select-overlay.open'))return;
      if (e.target && (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)) return;
      if (e.key === 'ArrowLeft') this.prevNode();
      if (e.key === 'ArrowRight') this.nextNode();
    });
  },

  focusNode(index) {
    this.focusIndex = Math.max(0, Math.min(GAME_NODES.length - 1, index));
    this.renderNodes();
    this.updateNavButtons();
    MapNodeBubble56.open(GAME_NODES[this.focusIndex]);
  },

  prevNode() { this.focusNode(this.focusIndex - 1); },

  // BUG 6修复：下一站按钮确保弹出面板
  nextNode() {
    const prevIndex = this.focusIndex;
    this.focusIndex = Math.max(0, Math.min(GAME_NODES.length - 1, this.focusIndex + 1));
    this.renderNodes();
    this.updateNavButtons();

    // 行军消耗：仅在前进到新节点时触发
    if (this.focusIndex > prevIndex && GameState.character && !this.isNodeLocked(this.focusIndex+1) && !this.completedNodeIds.has(this.focusIndex+1)) {
      const result = GameState.marchConsume();
      if (result && typeof GameUI !== 'undefined' && GameUI.showMarchResult) {
        GameUI.showMarchResult(result);
      }
    }

    MapNodeBubble56.open(GAME_NODES[this.focusIndex]);
  },

  updateNavButtons() {
    const posEl = document.getElementById('nodeNavPos');
    const focusNode = GAME_NODES[this.focusIndex];
    if (posEl && focusNode) posEl.textContent = `第 ${this.focusIndex + 1} 站 · ${focusNode.name}`;
    const prevBtn = document.getElementById('btnPrevNode');
    const nextBtn = document.getElementById('btnNextNode');
    if (prevBtn) prevBtn.disabled = this.focusIndex === 0;
    if (nextBtn) nextBtn.disabled = this.focusIndex === GAME_NODES.length - 1;
  },

  updateProgress() {
    const total = GAME_NODES.length;
    const completed = this.completedNodeIds.size;
    const progress = (completed / total) * 100;

    const fillEl = document.getElementById('progressFill');
    const labelEl = document.getElementById('progressLabel');
    if (fillEl) fillEl.style.width = progress + '%';
    if (labelEl) labelEl.textContent = `征程 ${completed} / ${total}`;

    this.renderCompletedLines();
    this.updateChapterBanner();
  },

  updateChapterBanner() {
    const currentNode = GAME_NODES.find(n => n.id === this.currentNodeId);
    if (currentNode) {
      const bannerEl = document.getElementById('chapterName');
      if (bannerEl) bannerEl.textContent = currentNode.name;
    }
  },

  isNodeLocked(nodeId) { return !GAME_NODES.some(node => Number(node.id) === Number(nodeId)); },
  isNodeCompleted(nodeId) { return this.completedNodeIds.has(nodeId); },

  completeNode(nodeId) {
    if (this.isNodeLocked(nodeId)) { if(typeof GameUI!=='undefined')GameUI.showToast('请先完成当前章节，暂不能跳过前置任务'); return; }
    // 死亡状态锁：玩家牺牲时不允许推进主线（防止失败也解锁下一关）
    if (typeof GameUI !== 'undefined' && (GameUI.isPlayerDead || GameUI.isGameOver)) {
      console.warn('[RouteMap.completeNode] 拦截：玩家处于失败状态，主线进度不变', nodeId);
      return;
    }
    const replay=this.completedNodeIds.has(nodeId);
    this.completedNodeIds.add(nodeId);
    if (nodeId === this.currentNodeId && nodeId < GAME_NODES.length) {
      this.currentNodeId = nodeId + 1;
    }
    this.focusIndex = replay ? nodeId - 1 : this.currentNodeId - 1;
    if(replay&&nodeId!==this.currentNodeId&&typeof GameUI!=='undefined')GameUI.showToast(`重温已完成，当前查看第${nodeId}站；主线进度保持不变`);
    this.renderNodes();
    this.updateProgress();
    this.updateNavButtons();
  },

  resetNodes() {
    MapNodeBubble56.close();
    this.completedNodeIds.clear();
    this.currentNodeId = 1;
    this.focusIndex = 0;
    this.renderNodes();
    this.updateProgress();
    this.updateNavButtons();
  }
};

/* ===== 数据馆：时间轴抽屉 + 站点数据卡（教学标注，独立于章节进度，不改相机/节点状态） ===== */
const DataMuseum65 = {
  data: null,
  drawer: null,
  btn: null,
  isOpen: false,
  tries: 0,

  snapshot() {
    return {
      scale: MapView.scale,
      panX: MapView.panX,
      panY: MapView.panY,
      viewMode: MapView.viewMode,
      currentNodeId: RouteMap.currentNodeId,
      focusIndex: RouteMap.focusIndex,
      completedCount: RouteMap.completedNodeIds.size
    };
  },

  entry(item, kind) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'data-museum65-item';
    b.dataset.kind = kind;
    b.dataset.id = item.id;
    const name = document.createElement('strong');name.textContent = item.name;
    const date = document.createElement('span');date.className = 'data-museum65-date';date.textContent = item.date;
    b.append(name, date);
    b.onclick = () => this.card(item);
    li.append(b);
    return li;
  },

  // 懒渲染：首次打开才构建抽屉 DOM；不开开关时零额外 DOM。
  build() {
    if (this.drawer || !this.data) return false;
    const host = document.querySelector('.map-view');
    if (!host) return false;
    const d = document.createElement('aside');
    d.className = 'data-museum65';
    d.setAttribute('role', 'region');
    d.setAttribute('aria-label', '数据馆 · 长征时间轴（教学标注）');
    const head = document.createElement('header');
    const h = document.createElement('h3');h.textContent = '数据馆 · 长征时间轴';
    const close = document.createElement('button');
    close.type = 'button';close.className = 'data-museum65-close';close.textContent = '×';
    close.setAttribute('aria-label', '关闭数据馆');close.onclick = () => this.close();
    head.append(h, close);
    const tip = document.createElement('small');tip.textContent = '教学标注 · 点击条目查看数据卡';
    const list = document.createElement('ol');list.className = 'data-museum65-list';
    for (const item of this.data.timeline || []) list.append(this.entry(item, 'timeline'));
    const ovHead = document.createElement('h4');ovHead.textContent = '总览 · 口径说明';
    const ov = document.createElement('ol');ov.className = 'data-museum65-list';
    for (const item of this.data.overview || []) ov.append(this.entry(item, 'overview'));
    d.append(head, tip, list, ovHead, ov);
    host.append(d);
    this.drawer = d;
    return true;
  },

  // 数据卡复用 Education43.dialog；底部固定“来源 + 口径”脚注。
  card(item) {
    if (typeof Education43 === 'undefined' || !Education43.dialog) return null;
    const d = Education43.dialog('数据卡 · ' + item.name);
    d.append(Education43.el('h3', item.date), Education43.el('p', item.fact));
    const foot = Education43.el('footer', undefined, 'data-museum65-foot'), p = Education43.el('p');
    p.append(document.createTextNode('来源：'), Education43.link(item.source.label, item.source.url), document.createTextNode(' · 口径：教学标注'));
    if (item.note) p.append(document.createElement('br'), document.createTextNode('口径说明：' + item.note));
    foot.append(p);
    d.append(foot);
    return d;
  },

  async toggle() {
    if (this.isOpen) return this.close();
    if (!this.data) {
      try {
        const r = await fetch('assets/geography/longmarch-data.json');
        if (!r.ok) throw Error(r.status);
        this.data = await r.json();
      } catch {
        if (typeof GameUI !== 'undefined' && GameUI.showToast) GameUI.showToast('数据馆资料尚未取得，请稍后重试。');
        return;
      }
    }
    if (this.build()) {
      this.isOpen = true;
      this.btn?.setAttribute('aria-expanded', 'true');
    }
  },

  close() {
    this.drawer?.remove();
    this.drawer = null;
    this.isOpen = false;
    this.btn?.setAttribute('aria-expanded', 'false');
  },

  // .map-tools 由 ui-polish 在 DOMContentLoaded 中创建（晚于本文件），找不到时短暂重试。
  install() {
    if (this.btn) return;
    const tools = document.querySelector('.map-tools');
    if (!tools) { if (++this.tries > 60) return; return setTimeout(() => this.install(), 50); }
    const b = document.createElement('button');
    b.type = 'button';b.className = 'map-control-btn node-nav-btn';b.dataset.museum65 = 'on';
    b.textContent = '数据馆';
    b.title = '数据馆 · 时间轴与数据卡（教学标注）';
    b.setAttribute('aria-label', '数据馆 · 时间轴与数据卡（教学标注）');
    b.setAttribute('aria-expanded', 'false');
    b.onclick = () => this.toggle();
    // 插到「全图」之前：保留现有 first-child/last-child 文字按钮样式不变。
    const last = tools.lastElementChild;
    if (last) tools.insertBefore(b, last); else tools.append(b);
    this.btn = b;
  }
};
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => DataMuseum65.install());

