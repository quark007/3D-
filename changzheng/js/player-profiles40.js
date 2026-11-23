/* Progress belongs to an origin-local player. Preferences and credentials are not copied. */
const PlayerProfiles40=(()=>{
 const unavailable={available:false,list:()=>[],select(){},create(){}};let storage;try{storage=window.localStorage;}catch{return unavailable;}
 /* [R5 2026-10-28] 损坏存档备份键纳入玩家分域：备份归属当前玩家，可随进度导出，不再落全局。 */
 const scoped=key=>/^(?:changzheng_(?:state(?:_corrupt_\d+)?|journey_v1|experience_v1|npc_dialogue_v1|companions_v1)|chishui_sandbox_v1|cz_pressure_v1_.*|cz_companions_v1|cz_player_intro_v32|cz_goals43)$/.test(key);
 const reloadPlayer=()=>{const u=new URL(location.href);u.searchParams.delete('demo');location.replace(u.href);};
 const uid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
 let id,profiles;
 try{
  profiles=JSON.parse(storage.getItem('cz_players40')||'[]');if(!Array.isArray(profiles))profiles=[];
  id=storage.getItem('cz_player40');
  if(!profiles.some(p=>p.id===id)){
   id=uid();profiles.push({id,name:'我的征程'});
   // Only the first profile inherits this browser's existing save. Other players start empty.
   if(profiles.length===1)for(let i=0;i<storage.length;i++){const key=storage.key(i);if(scoped(key))storage.setItem('czp40:'+id+':'+key,storage.getItem(key));}
   storage.setItem('cz_players40',JSON.stringify(profiles));storage.setItem('cz_player40',id);
  }
 }catch{return unavailable;}
 // Exhibition flags/backups belong to the local player, never to the school licence.
 // Preserve the old backup only for its recorded owner; leave originals intact.
 const playerKey=key=>scoped(key)||/^cz_demo_(?:mode|backup43|owner78)$/.test(key);
 const prefix='czp40:'+id+':',mapped=key=>playerKey(String(key))?prefix+key:String(key);
 try{if(storage.getItem('cz_demo_owner78')===id)for(const key of ['cz_demo_mode','cz_demo_backup43','cz_demo_owner78']){
  const value=storage.getItem(key);if(value!==null&&storage.getItem(prefix+key)===null)storage.setItem(prefix+key,value);
 }}catch{}
 let revision=0,keyCache=null,cacheRevision=-1,cacheLength=-1;
 const keys=()=>{if(keyCache&&cacheRevision===revision&&cacheLength===storage.length)return keyCache;const out=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key.startsWith(prefix))out.push(key.slice(prefix.length));else if(!key.startsWith('czp40:')&&!playerKey(key))out.push(key);}cacheRevision=revision;cacheLength=storage.length;return keyCache=out;};
 window.addEventListener?.('storage',()=>{revision++;});
 const facade={getItem:key=>storage.getItem(mapped(key)),setItem:(key,value)=>{storage.setItem(mapped(key),String(value));revision++;},removeItem:key=>{storage.removeItem(mapped(key));revision++;},key:i=>keys()[i]??null,clear:()=>{for(const key of keys().filter(playerKey))storage.removeItem(mapped(key));revision++;}};
 Object.defineProperty(facade,'length',{get:()=>keys().length,configurable:true});
 const proxy=new Proxy(facade,{ownKeys:()=>keys(),getOwnPropertyDescriptor:(_,key)=>keys().includes(key)?{enumerable:true,configurable:true,value:facade.getItem(key)}:undefined,get:(target,key)=>key in target?target[key]:typeof key==='string'?facade.getItem(key):undefined,set:(_,key,value)=>{if(typeof key==='symbol')return false;facade.setItem(key,value);return true;}});
 try{Object.defineProperty(window,'localStorage',{value:proxy,configurable:true});}catch{return unavailable;}
 return {available:true,id,isScoped:scoped,list:()=>profiles.map(p=>({...p})),select(next){if(!profiles.some(p=>p.id===next))return;storage.setItem('cz_player40',next);reloadPlayer();},create(name){const entry={id:uid(),name:String(name||'新玩家').trim().slice(0,24)||'新玩家'};profiles.push(entry);storage.setItem('cz_players40',JSON.stringify(profiles));storage.setItem('cz_player40',entry.id);reloadPlayer();}};
})();
