/* Portable progress only: never exports backend URLs, API keys, or other profiles. */
const SaveTransfer66={
 limit:5*1024*1024,
 scoped(key){return typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.isScoped(key):/^(?:changzheng_(?:state(?:_corrupt_\d+)?|journey_v1|experience_v1|npc_dialogue_v1|companions_v1)|chishui_sandbox_v1|cz_pressure_v1_.*|cz_companions_v1|cz_player_intro_v32|cz_goals43)$/.test(key);},
 snapshot(){
  /* [R5 2026-10-28] 保存失败不再静默导出旧存档：GameState.save() 返回 false 时，
     主档改由 GameState.serialize() 从内存直出（与 save() 同一序列化出口），
     并提示玩家导出内容来自内存而非本机存储。
     corrupt_* 备份属于本机恢复材料（内容本身可能是坏 JSON），随分域存储但一律不进导出。 */
  const saved=GameState.save();
  const progress={};for(const key of Object.keys(localStorage))if(this.scoped(key)&&!SaveTransfer66.corruptKey.test(key))progress[key]=localStorage.getItem(key);
  let fromMemory=false;
  if(!saved||(progress.changzheng_state ?? null)===null){progress.changzheng_state=JSON.stringify(GameState.serialize());fromMemory=true;}
  if(!saved&&typeof GameUI!=='undefined'&&typeof GameUI.showToast==='function')GameUI.showToast('本机存储写入失败，已改为从当前内存进度生成导出内容');
  return {format:'changzheng-progress',version:1,exportedAt:new Date().toISOString(),progress,saveFailed:fromMemory};},
 corruptKey:/^changzheng_state_corrupt_\d+$/,
 validate(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>this.limit)throw Error('存档文件须小于 5 MB');const data=JSON.parse(text);if(data?.format!=='changzheng-progress'||data.version!==1||!data.progress||Array.isArray(data.progress)||typeof data.progress!=='object')throw Error('不是受支持的长征星火存档');const entries=Object.entries(data.progress);if(entries.length>100||!entries.some(([key])=>key==='changzheng_state'))throw Error('缺少主存档或文件数量异常');for(const [key,value]of entries){if(this.corruptKey.test(key)||!this.scoped(key)||typeof value!=='string'||value.length>this.limit)throw Error('文件包含非进度字段');const object=JSON.parse(value);let count=0;const walk=(v,depth=0)=>{if(depth>24||++count>40000)throw Error('存档结构过深或过大');if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('存档含无效结构');walk(x,depth+1);}};walk(object);}
  const main=JSON.parse(data.progress.changzheng_state);/* [R6 2026-10-28] characterId===null 是合法的全新空档（尚未选岗位）；
     其余安全检查（结构深度、键数量、大小、资源范围）全部不变，不放松正式存档的校验。 */
  if(!main||typeof main!=='object'||Array.isArray(main)||![undefined,1,2,3].includes(main.schemaVersion)||!(main.characterId===null||['commander','logistics','soldier','medic','mao','zhou'].includes(main.characterId)))throw Error('主存档版本或岗位无效');if(!main.resources||!['troops','ammo','food','morale'].every(k=>typeof main.resources[k]==='number'&&Number.isFinite(main.resources[k])&&main.resources[k]>=0&&main.resources[k]<=100))throw Error('队伍资源超出有效范围');return data;
 },
 restore(data){const old={};for(const key of Object.keys(localStorage))if(this.scoped(key))old[key]=localStorage.getItem(key);
  /* [R6 2026-10-28] characterId===null 的空档：GameState.load() 会完成字段归一化但因无岗位返回 false，
     此属正常（键仍在）。坏档路径则会移除主键并写 corrupt 备份——用「键是否还在」精确区分，
     不放松坏档回滚。 */
  const freshImport=(()=>{try{return (JSON.parse(data.progress.changzheng_state).characterId ?? null)===null;}catch{return false;}})();
  try{for(const key of Object.keys(old))localStorage.removeItem(key);for(const [key,value]of Object.entries(data.progress))localStorage.setItem(key,value);
  const loaded=GameState.load();
  if(!loaded&&!(freshImport&&localStorage.getItem('changzheng_state')!==null))throw Error('主存档未通过载入检查');
  if(!GameState.save())throw Error('本机存储空间不足');}catch(error){for(const key of Object.keys(localStorage))if(this.scoped(key))localStorage.removeItem(key);for(const [key,value]of Object.entries(old))localStorage.setItem(key,value);GameState.load();throw error;}},
 download(){if((GameState.character ?? null)===null&&typeof GameUI!=='undefined'&&typeof GameUI.showToast==='function')GameUI.showToast('尚未选择岗位，导出的是空进度档案；选择岗位后再导出可包含完整进度');
  const blob=new Blob([JSON.stringify(this.snapshot(),null,2)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='长征星火-进度存档-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
 open(){const d=document.createElement('dialog');d.className='coop66-handoff';const h=document.createElement('h2'),p=document.createElement('p'),out=document.createElement('button'),file=document.createElement('input'),status=document.createElement('p'),apply=document.createElement('button'),close=document.createElement('button');h.textContent='存档备份与换机';p.textContent='仅导出当前玩家进度。导入会替换当前玩家的进度，其他玩家和服务配置保留。建议先导出备份。';out.textContent='导出当前玩家存档';out.onclick=()=>this.download();file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label','选择导入的 JSON 存档');apply.textContent='确认导入并重新载入';apply.disabled=true;let candidate=null;file.onchange=async()=>{candidate=null;apply.disabled=true;try{if(!file.files[0])return;if(file.files[0].size>this.limit)throw Error('文件须小于 5 MB');candidate=this.validate(await file.files[0].text());const main=JSON.parse(candidate.progress.changzheng_state);status.textContent=`已验证：${main.characterId} · 行军 ${main.marchCount||0} 次。点击确认后替换当前进度。`;apply.disabled=false;}catch(e){status.textContent='未导入：'+e.message;}};apply.onclick=()=>{try{this.restore(candidate);location.reload();}catch(e){status.textContent='未导入，原进度已回滚：'+e.message;}};
  /* [R5 2026-10-28] 损坏存档恢复入口：备份键已纳入玩家分域（player-profiles40 scoped 正则），
     在此列出并允许用最新备份替换主档后重载（GameState.load 会再校验，仍坏则再次隔离并提示）。 */
  const corrupts=Object.keys(localStorage).map(k=>{const m=k.match(/^changzheng_state_corrupt_(\d+)$/);return m?Number(m[1]):0;}).filter(Boolean).sort((a,b)=>b-a);
  if(corrupts.length){const line=document.createElement('p');line.textContent=`发现 ${corrupts.length} 个损坏存档备份，最近一份：${new Date(corrupts[0]).toLocaleString()}。`;const recover=document.createElement('button');recover.type='button';recover.textContent='用最新损坏备份替换主档';recover.onclick=()=>{try{const raw=localStorage.getItem('changzheng_state_corrupt_'+corrupts[0]);if(!raw)throw Error('备份内容为空');localStorage.setItem('changzheng_state',raw);location.reload();}catch(e){status.textContent='恢复失败：'+e.message;}};d.append(line,recover);}
  close.textContent='返回';close.onclick=()=>d.close();d.addEventListener('close',()=>d.remove(),{once:true});d.append(h,p,out,file,status,apply,close);document.body.append(d);d.showModal();},
 install(){const b=document.createElement('button');b.type='button';b.textContent='导出 / 导入存档';b.onclick=()=>this.open();document.querySelector('#settingsPanel .settings-list')?.append(b);const menu=b.cloneNode(true);menu.onclick=()=>this.open();document.querySelector('.title-extras-panel')?.append(menu);}
};document.addEventListener('DOMContentLoaded',()=>SaveTransfer66.install());
