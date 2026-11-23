/* One additive field in the EXISTING profile-scoped save. No second save key. */
(() => {
  'use strict';
  const key = 'marchStory83';
  const object = v => v && typeof v === 'object' && !Array.isArray(v);
  const id = v => typeof v === 'string' && /^[a-zA-Z0-9_:/.-]{1,180}$/.test(v) && !['__proto__','constructor','prototype'].includes(v);
  const chapter = v => Number.isInteger(v) && v >= 1 && v <= 12;
  const clone = v => JSON.parse(JSON.stringify(v));
  function position(v) {
    if (!object(v) || !chapter(v.chapterId) || !id(v.sceneId) || !Number.isFinite(v.x) || !Number.isFinite(v.y)) return null;
    return {chapterId:v.chapterId, sceneId:v.sceneId, x:v.x, y:v.y, facing:typeof v.facing === 'string' ? v.facing.slice(0,32) : Number.isFinite(v.facing) ? v.facing : 0};
  }
  function normalize(raw) {
    const v = object(raw) ? raw : {};
    const out = {version:1, revision:Number.isSafeInteger(v.revision) && v.revision >= 0 ? v.revision : 0,
      chapterId:chapter(v.chapterId) ? v.chapterId : 1, location:position(v.location), locations:{}, tasks:{}, completedChapters:[], pending:null,dailyTarget:null};
    if(object(v.dailyTarget)&&id(v.dailyTarget.storyId)&&/^\d{4}-\d{2}-\d{2}$/.test(v.dailyTarget.day))out.dailyTarget={storyId:v.dailyTarget.storyId,day:v.dailyTarget.day};
    for(const [sceneId,p]of Object.entries(object(v.locations)?v.locations:{}).slice(-100)){const valid=position(p);if(id(sceneId)&&valid?.sceneId===sceneId)out.locations[sceneId]=valid;}
    if(out.location)out.locations[out.location.sceneId]=out.location;
    for (const [k,t] of Object.entries(object(v.tasks) ? v.tasks : {}).slice(0,3000)) {
      if (!id(k) || !object(t)) continue;
      out.tasks[k] = {completed:t.completed === true, completedAt:typeof t.completedAt === 'string' ? t.completedAt.slice(0,40) : null,
        attempts:Array.isArray(t.attempts) ? t.attempts.filter(a=>object(a) && id(a.id) && ['completed','cancelled','error','interrupted','failed'].includes(a.status)).slice(-20).map(a=>({id:a.id,status:a.status,at:String(a.at || '').slice(0,40)})) : [],
        progress:object(t.progress) && JSON.stringify(t.progress).length<=100000 ? clone(t.progress) : {}};
    }
    out.completedChapters = [...new Set((Array.isArray(v.completedChapters) ? v.completedChapters : []).filter(chapter))];
    if (object(v.pending) && id(v.pending.taskId) && id(v.pending.id)) out.pending = {id:v.pending.id, taskId:v.pending.taskId};
    return out;
  }
  function read() {
    const g = window.CZMarchEnv().state;
    if (!g) throw Error('现有存档系统尚未就绪');
    g.storyPreparations ||= {};
    const absent=!Object.prototype.hasOwnProperty.call(g.storyPreparations,key);
    const normalized = normalize(g.storyPreparations[key]);
    if(absent)normalized.completedChapters=[...new Set((Array.isArray(g.medalRecords)?g.medalRecords:[]).map(m=>m.nodeId).filter(chapter))];
    g.storyPreparations[key] = normalized;
    return normalized;
  }
  function transact(change, owner = window.CZMarchEnv().owner) {
    if (owner !== window.CZMarchEnv().owner) return false;
    const g = window.CZMarchEnv().state, before = clone(read()), draft = clone(before);
    try {change(draft); draft.revision++;g.storyPreparations[key] = normalize(draft);if(g.save()===false)throw Error('save');return true;}
    catch {g.storyPreparations[key]=before;return false;}
  }
  function finish(taskId, attemptId, status, owner,alsoCompleted=[]) {
    if (!id(taskId) || !id(attemptId) || !['completed','cancelled','error','failed','interrupted'].includes(status)) return false;
    return transact(s=>{
      const t = s.tasks[taskId] ||= {completed:false, attempts:[], progress:{}};
      if (t.attempts.some(a=>a.id === attemptId)) return;
      t.attempts.push({id:attemptId, status, at:new Date().toISOString()});
      if (status === 'completed' && !t.completed) { t.completed = true; t.completedAt = new Date().toISOString(); }
      if(status==='completed')for(const idValue of alsoCompleted.filter(id)){const sibling=s.tasks[idValue] ||= {completed:false,attempts:[],progress:{}};if(!sibling.completed){sibling.completed=true;sibling.completedAt=new Date().toISOString();}}
      if (s.pending?.id === attemptId) s.pending = null;
    }, owner);
  }
  function recover() {
    const pending = read().pending;
    return !pending || finish(pending.taskId, pending.id, 'interrupted', window.CZMarchEnv().owner);
  }
  window.CZMarchSave = {key, normalize, position, read, transact, finish, recover};
})();
