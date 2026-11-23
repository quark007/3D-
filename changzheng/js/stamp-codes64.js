/* 实地研学打卡：扫码（?stamp=<打卡码>）解锁研学印记。纯增量模块，仅在 GameState.storyPreparations 下守卫式新增 stamps 分域，不改既有字段。 */
const StampCodes64=(()=>{
 const STAMP_CODES={
  'STMP-8VK2Q':{label:'序章卡',kind:'badge'},
  'STMP-3H7RD':{label:'湘江',kind:'badge'},
  'STMP-QM5X8':{label:'遵义',kind:'badge'},
  'STMP-N9T4W':{label:'泸定桥',kind:'badge'},
  'STMP-2PK6B':{label:'雪山',kind:'badge'},
  'STMP-W4YC7':{label:'草地',kind:'badge'},
  'STMP-5DJ3F':{label:'会师',kind:'badge'},
  'STMP-R8S2N':{label:'补给·士气',kind:'supply',reward:{morale:3}},
  'STMP-K3M9G':{label:'补给·粮秣',kind:'supply',reward:{food:5}},
  'STMP-X6B4Z':{label:'半截皮带',kind:'story',storyUnlock:'belt63'}
 };
 const CAP=100;
 const normalize=code=>String(code||'').trim().toUpperCase();
 const toast=msg=>{try{if(typeof GameUI!=='undefined'&&GameUI&&typeof GameUI.showToast==='function')GameUI.showToast(msg);}catch(e){}};
 const demoSession=()=>{try{return typeof window!=='undefined'&&!!window.CZ_DEMO_SESSION;}catch(e){return false;}};
 const state=()=>{
  if(!GameState.storyPreparations||typeof GameState.storyPreparations!=='object'||Array.isArray(GameState.storyPreparations))GameState.storyPreparations={};
  const host=GameState.storyPreparations;
  if(!host.stamps||typeof host.stamps!=='object'||Array.isArray(host.stamps))host.stamps={version:1,redeemed:{},supplies:{}};
  const s=host.stamps;
  if(!s.redeemed||typeof s.redeemed!=='object'||Array.isArray(s.redeemed))s.redeemed={};
  if(!s.supplies||typeof s.supplies!=='object'||Array.isArray(s.supplies))s.supplies={};
  return s;
 };
 const grant=reward=>{
  if(!reward||typeof reward!=='object')return;
  if(!GameState.resources||typeof GameState.resources!=='object'||Array.isArray(GameState.resources))GameState.resources={};
  for(const key of Object.keys(reward)){
   const value=reward[key];
   if(typeof value!=='number'||!Number.isFinite(value))continue;
   const current=typeof GameState.resources[key]==='number'&&Number.isFinite(GameState.resources[key])?GameState.resources[key]:0;
   GameState.resources[key]=Math.min(CAP,Math.max(0,current+value));
  }
 };
 const redeem=raw=>{
  const code=normalize(raw);
  const entry=Object.prototype.hasOwnProperty.call(STAMP_CODES,code)?STAMP_CODES[code]:null;
  if(!entry){toast('打卡码无效，请核对卡片');return{ok:false,reason:'invalid'};}
  if(typeof GameState==='undefined'||!GameState)return{ok:false,reason:'no-state'};
  if(demoSession()){toast('实地研学印记已收录 · '+entry.label);return{ok:true,reason:'demo'};}
  const s=state();
  if(s.redeemed[code]){toast('该印记已收录');return{ok:false,reason:'duplicate'};}
  s.redeemed[code]={label:entry.label,kind:entry.kind,at:new Date().toISOString()};
  if(entry.kind==='supply'){s.supplies[code]=true;grant(entry.reward);}
  if(entry.storyUnlock){if(!s.stories||typeof s.stories!=='object'||Array.isArray(s.stories))s.stories={};s.stories[code]=entry.storyUnlock;}
  try{GameState.save();}catch(e){}
  toast(entry.kind==='story'?'支线印记已记录':'实地研学印记已收录 · '+entry.label);
  return{ok:true};
 };
 const list=()=>Object.keys(STAMP_CODES).map(code=>({code,...STAMP_CODES[code]}));
 const api={STAMP_CODES,redeem,list};
 if(typeof window!=='undefined'){
  window.StampCodes64=api;
  try{
   const install=()=>{try{const code=new URL(location.href).searchParams.get('stamp');if(code)redeem(code);}catch(e){}};
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
   else install();
  }catch(e){}
 }
 if(typeof module!=='undefined'&&module&&module.exports)module.exports=api;
 return api;
})();
