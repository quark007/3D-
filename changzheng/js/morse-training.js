/* 通信教学：训练资格属于玩家存档，不绑定岗位，不替代章节对话门槛。 */
const MorseTraining = {
  root: null, step: 0,
  exercises: [
    {code:'.',answer:'E',choices:['E','T','A'],note:'点：短音持续1个单位。先在表里找单个短音，再判断字母。'},
    {code:'-',answer:'T',choices:['E','T','S'],note:'划：长音持续3个单位。听一听长短区别。'},
    {code:'..',answer:'I',choices:['I','M','N'],note:'同一字母内部，两个信号之间停1个单位。'},
    {code:'--',answer:'M',choices:['N','M','A'],note:'不要把两个长音误听成一个更长的声音。每个信号都要记录。'},
    {code:'.-',answer:'A',choices:['A','N','I'],note:'顺序很重要：先短后长，与先长后短不是同一个字母。'},
    {code:'-.',answer:'N',choices:['A','N','T'],note:'先逐个写下点划，再查表。不要只数信号个数。'},
    {code:'...',answer:'S',choices:['S','O','I'],note:'连续三个短音；保持同样长度，不要吞掉末尾的点。'},
    {code:'---',answer:'O',choices:['S','M','O'],note:'连续三个长音；划的长度应约为点的三倍。'},
    {code:'. .- -',answer:'EAT',choices:['ETA','EAT','TEA'],note:'字母之间停3个单位。这里有三个字母，逐字查表后连起来。'},
    {code:'... --- ...',answer:'SOS',choices:['SOS','SO','OSO'],note:'这是教学用常见信号组合。注意三个字组之间的边界。'},
    {code:'.- / -',answer:'A T',choices:['AT','A T','N T'],note:'单词之间停7个单位，用 / 标出；字母空格和单词空格不可混淆。'},
    {code:'--. ---',answer:'GO',choices:['GO','OG','GOT'],note:'先在草稿里分出两组，再按顺序译出。'},
    {code:'.---- ----. ...-- ....-',answer:'1934',typed:true,note:'数字通常由5个点划组成。现在不用选项，按数字表独立输入。'},
    {code:'.... . .-.. .--.',answer:'HELP',typed:true,note:'逐组核对。听不清可重听，先记录点划，不要凭语感猜词。'},
    {code:'.-- .- .. - / --. ---',answer:'WAIT GO',typed:true,note:'两组单词的完整译报，保留单词之间的空格。'},
    {code:'.-. . .- -.. -.--',answer:'READY',typed:true,note:'结业练习：独立记录、查表、输入、复核。训练学习的是点划译读，不等于破译历史加密密码本。'}
  ],
  open() { this.root?.remove();this.step=0;const dialog=document.createElement('dialog');dialog.className='morse-training';dialog.setAttribute('aria-label','通信训练所');this.root=dialog;document.body.append(dialog);this.render();dialog.showModal();dialog.addEventListener('close',()=>{this.audio?.close();this.audio=null;dialog.remove();}); },
  async listen(code){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){this.status.textContent='当前设备未启用听音，请使用点划和对照表完成练习。';return;}if(this.audio)await this.audio.close();const audio=this.audio=new Audio();await audio.resume();let t=audio.currentTime+.12;const unit=.15;for(const char of code){if(char===' '){t+=unit*2;continue;}if(char==='/'){t+=unit*2;continue;}const duration=char==='-'?unit*3:unit;const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.frequency.value=570;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.12,t+.008);gain.gain.setValueAtTime(.12,t+duration-.008);gain.gain.linearRampToValueAtTime(0,t+duration);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(t);oscillator.stop(t+duration+.01);t+=duration+unit;}},
  render() {
    const root=this.root;root.replaceChildren();
    const title=document.createElement('h2');title.textContent='通信训练所 · 从听音到完整译报';const intro=document.createElement('p');intro.textContent='16步循序训练：短长音、字母顺序、字组边界、数字、独立译报。允许查表和反复听音，答错会指出检查方法；完成全部训练后，四种岗位均可破译章节电报。';
    const manual=document.createElement('details'),summary=document.createElement('summary');summary.textContent='操作手册 · 点1拍 / 划3拍 / 字母间隔3拍 / 单词间隔7拍';manual.append(summary);const tip=document.createElement('p');tip.textContent='步骤：先听并记下点划 → 按停顿分组 → 用字母表逐组译出 → 核对顺序 → 提交。不把字母之间的空格写入单词，遇到 / 才写单词空格。';manual.append(tip);const table=document.createElement('div');table.className='morse-reference';const codes={...MORSE_CODE,'0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.'};Object.entries(codes).forEach(([letter,code])=>{const item=document.createElement('span');item.textContent=letter+'  '+code;table.append(item);});manual.append(table);root.append(title,intro,manual);
    if(this.step<this.exercises.length){const ex=this.exercises[this.step],code=document.createElement('h3');code.textContent=`训练 ${this.step+1} / ${this.exercises.length}： ${ex.code}`;root.append(code);const hint=document.createElement('p');hint.setAttribute('role','status');hint.textContent=ex.note;this.status=hint;const answer=value=>{if(value.trim().toUpperCase().replace(/\s+/g,' ')!==ex.answer){hint.textContent='还未通过。'+ex.note+' 可展开手册，再按字组逐个复核。';return;}this.step++;this.render();};
      if(ex.typed){const input=document.createElement('input');input.className='morse-answer';input.placeholder='输入译文，字母大小写均可';input.setAttribute('aria-label','独立译报答案');input.autocomplete='off';input.spellcheck=false;const submit=document.createElement('button');submit.textContent='核对并提交译文';submit.onclick=()=>answer(input.value);input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();answer(input.value);}};root.append(input,submit);}else for(const choice of ex.choices){const button=document.createElement('button');button.textContent=choice;button.onclick=()=>answer(choice);root.append(button);}
      const listen=document.createElement('button');listen.textContent='听本题信号 · 可反复听';listen.onclick=()=>this.listen(ex.code).catch(()=>{hint.textContent='听音未启动，可继续用点划对照练习。';});root.append(hint,listen);
    }else{GameState.skills.morse=true;const saved=GameState.save();const rule=(typeof NpcStory!=='undefined'&&NpcStory.describe)?NpcStory.describe():'每章完成8轮';const done=document.createElement('p');done.textContent=saved?`全部16步通过！译报资格已保存，四种岗位均可使用。回到章节${rule}剧情后，即可破译本章电报。`:'训练通过，本次游戏四种岗位均可译报；当前存档写入失败，请先检查存储空间。';root.append(done);}
    const close=document.createElement('button');close.textContent=this.step===this.exercises.length?'完成训练 · 返回剧情':'稍后继续学习';close.onclick=()=>root.close();root.append(close);
  },
  install(){
    const css=document.createElement('style');css.textContent='.morse-training{max-width:680px;width:calc(100% - 48px);max-height:85vh;overflow:auto;background:#eee2c8;color:#292016;border:2px solid #8a3e2c;padding:24px;line-height:1.8}.morse-training::backdrop{background:#100c09bb}.morse-training button,.morse-chapter-button{background:#7b3025;color:#fff2d5;border:1px solid #b39765;padding:12px 18px;margin:6px;cursor:pointer;font:inherit}.morse-reference{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-family:monospace}.morse-training h3{letter-spacing:3px}';document.head.append(css);
    const entry=document.createElement('button');entry.className='morse-chapter-button';entry.textContent='通信训练所 · 学习摩斯密码';entry.onclick=()=>this.open();document.querySelector('.settings-list')?.prepend(entry);
    const panel=GameUI.showDungeonPanel;
    GameUI.showDungeonPanel=function(node){const result=panel.apply(this,arguments);const host=document.querySelector('#dungeonPanel .panel-body');host?.querySelector('.morse-chapter-button')?.remove();if(host&&node){const button=document.createElement('button');button.className='morse-chapter-button';button.textContent=GameState.skills.morse?'破译本章电报':'学习摩斯密码 · 解锁译报';button.onclick=()=>{
      if(!GameState.skills.morse){MorseTraining.open();return;}
      if(RouteMap.isNodeLocked(node.id)||typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){const rule=(typeof NpcStory!=='undefined'&&NpcStory.required)?NpcStory.required({nodeId:node.id,part:1}):8;GameUI.showToast(`先完成前置章节和本章${rule}轮剧情对话，再收取电报`);return;}
      MorseTraining.returnToChapter=true;GameUI.showDecrypt(node);
    };host.append(button);}return result;};
    const close=GameUI.closeDecryptAndContinue;GameUI.closeDecryptAndContinue=function(){if(!MorseTraining.returnToChapter)return close.apply(this,arguments);MorseTraining.returnToChapter=false;document.getElementById('decryptOverlay').classList.remove('open');this.stopDecryptAmbient();this.decryptCurrentNode=null;};
  }
};
document.addEventListener('DOMContentLoaded',()=>MorseTraining.install());
