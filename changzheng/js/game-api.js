/* ========================================
   长征·星火 — BFF API 封装层（契约 v1.0）
   4个契约接口：battle/parse, battle/report, npc/chat, history/compare
   附加接口：time/mailbox
   无信封：成功直接返回schema本体，失败返回null
   ======================================== */

let API_BASE = String(window.CZ_API_BASE || document.querySelector('meta[name="api-base"]')?.content || (['localhost','127.0.0.1',''].includes(location.hostname)?'http://127.0.0.1:8000':(location.protocol==='czgame:'?'czgame://app/api':location.hostname==='47.243.68.243'?location.origin+'/api':window.CZ_PUBLIC_API_BASE||'https://api.czstar.cc.cd'))).replace(/\/$/,'');

// 默认请求上限；阻塞任务交互在各接口处使用短预算，媒体复核保留独立异步预算。
const API_TIMEOUT = Number(window.CZ_TIMEOUTS?.showcase)||60000;

// UUID v4 生成（兼容旧浏览器）
function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// 统一请求封装（无信封：直接返回响应体）
async function apiRequest(path, body, timeoutMs = API_TIMEOUT, externalSignal) {
  if(typeof SilentRadio65!=='undefined'&&SilentRadio65.offline())return SilentRadio65.request(path,body,externalSignal);
  const controller = new AbortController();
  const cancel=()=>controller.abort();
  if(externalSignal?.aborted)controller.abort();else externalSignal?.addEventListener('abort',cancel,{once:true});
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(API_BASE + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': uuidv4(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      let error;try{error=await resp.json();}catch{}
      const detail={status:resp.status,code:error?.code,traceId:error?.trace_id||'',retryAfter:resp.headers.get('Retry-After'),message:String(error?.message||'服务暂时未响应，请稍后重试').slice(0,240)};
      window.dispatchEvent(new CustomEvent('cz-api-error',{detail}));
      if([401,403,429].includes(resp.status)&&typeof GameUI!=='undefined'&&Date.now()-(window.czLastApiNotice||0)>5000){window.czLastApiNotice=Date.now();GameUI.showToast(detail.message);}
      return null;
    }
    const json = await resp.json();
    // AI 输出中文化：模型偶尔返回英文枚举/标签，
    // 在 API 边界统一拦截，保证界面零英文。
    if (json && typeof json === 'object') {
      const result = (path.startsWith('/journey/') || path.startsWith('/experience/') || path.startsWith('/strategy/') || path.startsWith('/media/')) ? json : zhDeep(json);
      if(!Array.isArray(result)){
        const mode=resp.headers.get('X-AI-Mode');
        result.degraded = result.degraded === true || mode === 'local';
        if(mode==='model'||mode==='local')result.mode=mode;
      }
      return result;
    }
    return json;
  } catch (e) {
    if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('cz-api-unavailable',{detail:{path,reason:e?.name||'Error'}}));
    return null;
  } finally {
    // Keep the deadline active until the entire JSON body has been read.
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort',cancel);
  }
}

// GET 请求（用于 /health）
async function apiGet(path, timeoutMs = 5000) {
  if(typeof SilentRadio65!=='undefined'&&SilentRadio65.offline())return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(API_BASE + path, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    if(typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('cz-api-unavailable',{detail:{path,reason:e?.name||'Error'}}));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ===== 4个契约接口封装 ===== */

// POST /battle/parse — 玩家自由指令解析
// 入口：{ command }
// 出口：{ tactic, risk, advantage, description }
async function apiBattleParse(command) {
  return await apiRequest('/battle/parse', { command }, Number(window.CZ_TIMEOUTS?.parse)||55000);
}

// POST /battle/report — 战报生成
// 入口：{ command, commandAnalysis, qteResult }
// 出口：{ outcome, rating, summary, casualties, moraleChange, recommendation, keyMoment }
async function apiBattleReport(command, commandAnalysis, qteResult, signal) {
  return await apiRequest('/battle/report', { command, commandAnalysis, qteResult }, API_TIMEOUT, signal);
}

// POST /npc/chat — NPC对话
// 入口：{ npcId, message, scene, history }
// 出口：{ text, mood, references }
async function apiNpcChat(npcId, message, scene, history, model='auto') {
  if(typeof SilentRadio65!=='undefined'&&SilentRadio65.offline())return SilentRadio65.request('/npc/chat',{npcId,message,scene,history});
  if(model==='edge')return typeof EdgeBridge42!=='undefined'?await EdgeBridge42.fallback(npcId,message,scene,history):null;
  const cloud=await apiRequest('/npc/chat', { npcId, message, scene, history: Array.isArray(history)?history.slice(-12):[], ...(typeof NpcStory!=='undefined'?NpcStory.requestContext():{}), context_memory: typeof ExperienceSystem!=='undefined'?ExperienceSystem.memoryFor(npcId,message):[] }, Number(window.CZ_TIMEOUTS?.npc)||40000);
  const valid=cloud&&typeof cloud.text==='string'&&cloud.text.trim().length>0;
  if(valid&&!cloud.degraded)return cloud;
  if(model==='cloud')return null;
  let edge=null;try{edge=typeof EdgeBridge42!=='undefined'?await EdgeBridge42.fallback(npcId,message,scene,history):null;}catch{edge=null;}
  return edge||(valid?cloud:null);
}

// POST /history/compare — 平行时空对比
// 入口：{ player: { command, tactic, qteResult, battleReport, zunyiResult, resources } }
// 出口：{ player: {...}, history: { luding, zunyi, dialog, parallel } }
async function apiHistoryCompare(player) {
  return await apiRequest('/history/compare', { player }, API_TIMEOUT);
}

async function apiZunyiAssess(proposal,selectedEvidence,classifications,memory,signal) {
  return await apiRequest('/zunyi/assess',{proposal,selected_evidence:selectedEvidence||[],classifications:classifications||{},memory:memory||{}},Number(window.CZ_TIMEOUTS?.zunyi)||50000,signal);
}

// ===== 平行时空对比：预加载缓存 =====
const _historyCompareCache = new Map();

function _historyCompareCacheKey(level, outcome, casualtyCount, playerData={}) {
  const normalizedOutcome=['胜利','victory'].includes(outcome)?'victory':'defeat';
  return JSON.stringify([level,normalizedOutcome,casualtyCount,playerData.command||'',playerData.tactic||'',playerData.resources||{},playerData.qteResult||{},playerData.battleReport||{}]);
}

// 预加载：在QTE战斗结束时静默请求，结果存入内存缓存
async function prefetchHistoryCompare(level, playerData) {
  if(!['luding','zunyi'].includes(level))return null;
  const key = _historyCompareCacheKey(level, playerData.outcome || 'victory', playerData.casualtyCount || 0,playerData);
  const cached=_historyCompareCache.get(key);
  if(cached)return cached._pending?cached.promise:cached;
  if(_historyCompareCache.size>=64)_historyCompareCache.delete(_historyCompareCache.keys().next().value);
  const pending={_pending:true};_historyCompareCache.set(key,pending);
  pending.promise=(async()=>{
    try {
      const data = await apiHistoryCompare(playerData);
      if (data) {_historyCompareCache.set(key,data);return data;}
    } catch (e) { /* showSettlement displays its immediate local fallback. */ }
    _historyCompareCache.delete(key);return null;
  })();
  return pending.promise;
}

// 读取缓存：showSettlement时先查缓存，命中则秒开
function getCachedHistoryCompare(level, outcome, casualtyCount, playerData={}) {
  const key = _historyCompareCacheKey(level, outcome, casualtyCount,playerData);
  const cached = _historyCompareCache.get(key);
  if (cached && !cached._pending) return cached;
  return null;
}

// GET /health — 健康检查
async function apiHealth(timeoutMs=5000) {
  // Optional loopback services are checked only after an explicit Connect action.
  // A catch cannot hide Chromium's ERR_CONNECTION_REFUSED network diagnostics.
  try{if(['127.0.0.1','localhost','[::1]'].includes(new URL(API_BASE,location.href).hostname)&&!window.CZ_LOCAL_BFF_PROBE)return null;}catch{return null;}
  return await apiGet('/health', timeoutMs);
}

// POST /time/mailbox — 时空信箱（不在4契约内，保留）
async function apiTimeMailbox(playerMessage, isSnowLetter = false) {
  const body = {
    player_message: playerMessage,
    is_snow_letter: isSnowLetter,
    context: {
      character: typeof GameState!=='undefined'&&GameState.character ? GameState.character.name : '未知',
      completed_nodes: typeof GameState!=='undefined' ? GameState.nodeSnapshots.length : 0
    }
  };
  return await apiRequest('/time/mailbox', body);
}
