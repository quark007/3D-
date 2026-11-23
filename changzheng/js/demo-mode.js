/* Full-progress exhibition reuses the established memory-only demo boundary. */
window.DemoMode={
 BACKUP_KEY:'cz_demo_backup43',OWNER_KEY:'cz_demo_owner78',starting:false,
  SCORES:{1:96,2:88,3:92,4:78,5:85,6:91,7:70,8:94,9:76,10:90,11:83,12:97},
  STORY:{'bridge72_1':95,'blanket72_2':81,'xjg67_2':87,'battle67_6':91,'battle67_7':72,
    'sidu67_4':89,'scout67_5':84,'drum67_12':93,'lazikou68_10':90,'fire68_9':77,
    'snow68_8':94,'wuqi68_11':88,'g30_9':80,'run69_result':86,'fishhook72_9':92,
    'wildveg72_9':69,'zunyi72_3':78,'lantern72_4':75},

 storage(){return window.MainlineDemo?.previous||window.localStorage;},
 owner(){return typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:'default';},
 active(){try{return this.storage().getItem('cz_demo_mode')==='1'&&this.storage().getItem(this.OWNER_KEY)===String(this.owner());}catch{return false;}},
 async apply(){
  if(this.starting)return false;const main=window.MainlineDemo;if(!main)return false;this.starting=true;
  const storage=this.storage(),already=this.active();
  try{
   if(!already){storage.setItem(this.BACKUP_KEY,storage.getItem('changzheng_state')||'');storage.setItem(this.OWNER_KEY,String(this.owner()));}
   // start() snapshots runtime plus all profile domains before swapping storage.
   const result=await main.start({exhibit:true});if(result!==true){if(!already&&main.active)main.exit();return false;}
   const g=typeof GameState!=='undefined'?GameState:window.GameState;if(!g)return false;
   g.medalRecords=Object.entries(this.SCORES).map(([id,score])=>({nodeId:Number(id),score,rating:'演示预置',svg:''}));g.gameCompleted=true;g.storyPreparations??={};
   for(const [key,score]of Object.entries(this.STORY))if(!g.storyPreparations[key]||g.storyPreparations[key].score<score)g.storyPreparations[key]={score,rating:'演示预置',completedAt:new Date().toISOString(),demo:true};
   g.battleScores=Object.entries(this.SCORES).map(([id,score])=>({nodeId:Number(id),score,rating:'演示预置',demo:true}));g.save();
   storage.setItem('cz_demo_mode','1');main.map();
   const url=new URL(location.href);url.searchParams.set('demo','exhibit');history.replaceState(history.state,'',url);
   const banner=document.querySelector('.demo-banner');if(banner){banner.firstChild.nodeValue='展演预置 · 全进度仅在内存，不代表实际游玩成绩 ';const back=banner.querySelector('button');if(back)back.onclick=()=>this.restore();}
   if(typeof GameUI!=='undefined')GameUI.showToast('展演模式已开启；预置数据仅在内存，退出恢复正式征程。');return true;
  }catch(error){if(!already&&main.active)main.exit();if(typeof GameUI!=='undefined')GameUI.showToast('演示未能准备好，请稍后重试。');return false;}finally{this.starting=false;}
 },
 restore(){const storage=this.storage();if(window.MainlineDemo?.active)window.MainlineDemo.exit();storage.removeItem('cz_demo_mode');storage.removeItem(this.BACKUP_KEY);storage.removeItem(this.OWNER_KEY);return true;},
 toggle(){return this.active()?this.restore():this.apply();},
 boot(){const q=new URLSearchParams(location.search).get('demo');if(q==='off'){this.restore();const u=new URL(location.href);u.searchParams.delete('demo');history.replaceState(history.state,'',u);return;}
  // A leftover local flag or a copied URL must not manufacture a completed journey.
  if(q==='exhibit'&&window.MainlineDemo?.active&&window.MainlineDemo.requested())this.apply();},
 install(){if(this.installed)return;this.installed=true;this.boot();document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='d'){e.preventDefault();this.toggle();}});}
};
document.addEventListener('DOMContentLoaded',()=>window.DemoMode.install());
