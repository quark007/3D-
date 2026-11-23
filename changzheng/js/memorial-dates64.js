/* 纪念日时空信：命中长征纪念日期的当天，首次进入地图时弹出一封时空信。守卫式新增 storyPreparations.memorial 分域（{version:1,seen:{'MMDD':'YYYY'}}），不改既有字段；与 stamp-codes64 同为纯增量模块。 */
const MemorialDates64=(()=>{
 const DATES={
  '1017':{title:'出发 · 于都',dateLabel:'1934年10月17日 · 中央红军从于都出发',
   text:'1934年10月17日起，中央红军主力于都河畔夜渡出发，踏上二万五千里征途。浮桥是百姓拆门板搭起的。今天路过这里，请记得：每一次出发，都始于一场郑重的告别。',
   source:['人民网 · 于都夜渡 远征启航','http://cpc.people.com.cn/n1/2026/0806/c443712-40774882.html']},
  '1201':{title:'湘江',dateLabel:'1934年12月1日 · 湘江战役',
   text:'1934年12月1日，湘江之战最烈的一天。红三十四师在东岸且战且退，掩护主力过江。民间流传“三年不饮湘江水，十年不食湘江鱼”，说的正是此战的沉重。',
   source:['人民网 · 红34师师长陈树湘 湘江“断肠明志”','https://paper.people.com.cn/hqrw/html/2016-05/16/content_1725404.htm']},
  '0115':{title:'遵义会议',dateLabel:'1935年1月15日 · 遵义会议开幕',
   text:'1935年1月15日，遵义会议开幕。会议连开三天，集中解决当时的军事与组织问题，成为党的历史上生死攸关的转折点。路还是那条路，方向从此不同。',
   source:['共产党员网 · 遵义会议和红军长征的胜利','https://fuwu.12371.cn/2016/07/22/ARTI1469154834425831.shtml']},
  '0529':{title:'泸定桥',dateLabel:'1935年5月29日 · 飞夺泸定桥',
   text:'1935年5月29日，泸定桥。二十二名突击队员攀着铁索冲向对岸，后续部队边铺桥板边跟进。夺下泸定桥，主力渡过大渡河。不是不怕，是不能退。',
   source:['人民网党史频道 · 回忆飞夺泸定桥之战','https://cpc.people.com.cn/n1/2022/0721/c443712-32481508.html']},
  '1022':{title:'会师',dateLabel:'1936年10月22日 · 将台堡会师，长征胜利',
   text:'1936年10月22日，将台堡会师。历经两年，红军三大主力先后会合，长征胜利结束。会师的欢呼里，也记着每一个没能走到终点的人。星火至此，终成燎原。',
   source:['共产党员网 · 三大主力红军会师','https://www.12371.cn/2012/10/19/ARTI1350595776756879.shtml']}
 };
 const today=()=>{const d=new Date();return String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');};
 const demoSession=()=>{try{return typeof window!=='undefined'&&!!window.CZ_DEMO_SESSION;}catch(e){return false;}};
 const state=()=>{
  if(typeof GameState==='undefined'||!GameState)return {version:1,seen:{}};
  if(!GameState.storyPreparations||typeof GameState.storyPreparations!=='object'||Array.isArray(GameState.storyPreparations))GameState.storyPreparations={};
  const host=GameState.storyPreparations;
  if(!host.memorial||typeof host.memorial!=='object'||Array.isArray(host.memorial))host.memorial={version:1,seen:{}};
  const s=host.memorial;
  if(!s.seen||typeof s.seen!=='object'||Array.isArray(s.seen))s.seen={};
  return s;
 };
 const open=(row,acceptance)=>{
  if(typeof Education43==='undefined'||!Education43.dialog)return false;
  const d=Education43.dialog('时空信 · '+row.title);
  d.classList.add('memorial64');
  d.append(Education43.el('small',row.dateLabel));
  d.append(Education43.el('blockquote',row.text));
  d.append(Education43.el('p','信文为本项目研学创作（60—90字），非历史文献或人物原话；纪念日期对应真实史实节点。','education43-notice'));
  if(acceptance)d.append(Education43.el('p','验收入口 · 仅供核对展示效果（?memorial=MMDD）；不写入存档，正常游玩不会出现此入口。','education43-notice'));
  Education43.references(d,[row.source]);
  return true;
 };
 const check=dateKey=>{
  const key=String(dateKey||'').trim();
  const row=Object.prototype.hasOwnProperty.call(DATES,key)?DATES[key]:null;
  if(!row)return false;                 // 非纪念日不弹
  if(demoSession())return false;        // 演示会话：不弹、不写
  const year=String(new Date().getFullYear());
  const s=state();
  if(s.seen[key]===year)return false;   // 同一天同一年只弹一次
  s.seen[key]=year;
  try{if(typeof GameState!=='undefined'&&GameState&&typeof GameState.save==='function')GameState.save();}catch(e){}
  return open(row,false)===true;
 };
 // 进入地图（GameShell.enter）与地图进度刷新（RouteMap.updateProgress）各挂一次尝试；
 // 命中与否由 seen 去重兜底，两处都属最小侵入包裹，不改动被包函数本身。
 const auto=()=>{
  if(demoSession())return;
  if(typeof GameState==='undefined'||!GameState||!GameState.character)return;   // 未开始游戏（不在地图）不弹
  if(typeof Education43==='undefined')return;
  check(today());
 };
 const api={DATES,check,today,state,open,auto};
 if(typeof window!=='undefined'){
  window.MemorialDates64=api;
  const install=()=>{
   try{
    // 手动验收入口：?memorial=MMDD 直接弹（仅供验收，不写 seen、不落存档；演示会话仍不弹）。
    const param=new URL(location.href).searchParams.get('memorial');
    if(param){
     const key=param.trim();
     if(Object.prototype.hasOwnProperty.call(DATES,key)&&!demoSession())open(DATES[key],true);
     return;
    }
    if(typeof RouteMap!=='undefined'&&RouteMap&&typeof RouteMap.updateProgress==='function'){
     const update=RouteMap.updateProgress;
     RouteMap.updateProgress=function(){const result=update.apply(this,arguments);try{api.auto();}catch(e){}return result;};
    }
    if(typeof GameShell!=='undefined'&&GameShell&&typeof GameShell.enter==='function'){
     const enter=GameShell.enter;
     GameShell.enter=function(){const result=enter.apply(this,arguments);try{api.auto();}catch(e){}return result;};
    }
   }catch(e){}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
 }
 if(typeof module!=='undefined'&&module&&module.exports)module.exports=api;
 return api;
})();
