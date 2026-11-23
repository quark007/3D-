/* Expanded course. Keep the existing cross-role qualification and chapter gates. */
(()=>{
 const training=MorseTraining,base=training.exercises.map(x=>({...x}));
 const alphabet={...MORSE_CODE,...{'0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.'}};
 const encode=text=>text.toUpperCase().trim().split(/\s+/).map(word=>[...word].map(c=>alphabet[c]).join(' ')).join(' / ');
 const singles=new Set(base.filter(x=>x.answer.length===1).map(x=>x.answer));
 const letters=Object.entries(alphabet).filter(([k])=>/^[A-Z]$/.test(k)&&!singles.has(k)).map(([answer,code])=>({answer,code,typed:true,note:`字母 ${answer}：先听完整节奏，再把每个点划按顺序记下。可对照手册，不限重听次数。`}));
 const numbers=Object.entries(alphabet).filter(([k])=>/^\d$/.test(k)).map(([answer,code])=>({answer,code,typed:true,note:'数字均为5个点划。1到5逐步增加前面的点，6到0逐步增加前面的划；逐个核对，不只看首尾。'}));
 const send=['SOS','GO','WAIT','READY'].map(text=>({answer:encode(text),code:encode(text),text,typed:true,send:true,note:'把明文转成点划。用点/划按钮或手动输入；字母间用空格，词间用 /。发出后重听并逐组复核。'}));
 const hearing=['A','N','SOS','GO'].map(answer=>({answer,code:encode(answer),typed:true,hearing:true,note:'先听声音，在草稿里记录点划，再输入译文。听不清可降低速度；需要时可主动显示信号，不扣分。'}));
 const final=['SAFE','TEAM 2','WAIT / GO','READY 1934'].map(text=>{const answer=text.replace(' / ',' ');return {answer,code:encode(answer),typed:true,note:'综合收报：注意字母间3拍、单词间7拍；先分组再译读，最后复核数字与顺序。这里是虚构练习短语。'};});
 training.exercises=[...base,...letters,...numbers,...send,...hearing,...final];
 const stage=i=>i<8?'01 · 点划与节奏':i<16?'02 · 分组与译读':i<34?'03 · 补齐26个字母':i<44?'04 · 数字0—9':i<48?'05 · 主动发报':i<52?'06 · 隐藏点划听音': '07 · 综合收发';
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
 const normalize=value=>value.trim().toUpperCase().replace(/[·•]/g,'.').replace(/[—–]/g,'-').replace(/\s*\/\s*/g,' / ').replace(/\s+/g,' ');
 training.saveCourse=function(){GameState.skills.morseCourse={version:2,step:this.step,mistakes:[...new Set(this.mistakes||[])]};return GameState.save();};
 training.stopSound=function(){const audio=this.audio;this.audio=null;if(audio)audio.close().catch(()=>{});};
 training.open=function(){
   if(this.root){this.stopSound();this.root.close();this.root.remove();}
   const saved=GameState.skills.morseCourse;
   this.step=saved?.version===2?Math.min(saved.step,this.exercises.length):0;
   this.mistakes=saved?.version===2?[...(saved.mistakes||[])]:[];this.speed=this.speed||.18;
   const dialog=el('dialog',undefined,'morse-training morse-academy');dialog.setAttribute('aria-label','摩斯学堂 · 零基础收发训练');this.root=dialog;
   dialog.addEventListener('close',()=>{this.stopSound();dialog.remove();if(this.root===dialog)this.root=null;});
   document.body.append(dialog);this.render();dialog.showModal();
 };
 training.listen=async function(code){
   this.stopSound();if(typeof AudioControl43!=='undefined'&&AudioControl43.muted){if(this.status)this.status.textContent='全部静音已开启，恢复声音后可继续听音。';return;}const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio){if(this.status)this.status.textContent='设备不支持听音，仍可使用点划显示和手册练习。';return;}
   const audio=this.audio=new Audio();await audio.resume();if(this.audio!==audio||audio.state==='closed')return;
   const words=code.trim().split(/\s*\/\s*/),unit=this.speed||.18;let time=audio.currentTime+.1;
   // Gaps are total silence, never the 1-unit intra-symbol gap plus another 3/7.
   words.forEach((word,wi)=>word.trim().split(/\s+/).forEach((letter,li,all)=>[...letter].forEach((symbol,si)=>{
     if(!'.-'.includes(symbol))return;const duration=unit*(symbol==='-'?3:1),osc=audio.createOscillator(),gain=audio.createGain();osc.frequency.value=570;
     gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.1*(this.volume43??1),time+.008);gain.gain.setValueAtTime(.1*(this.volume43??1),time+duration-.008);gain.gain.linearRampToValueAtTime(0,time+duration);
     osc.connect(gain);gain.connect(audio.destination);osc.start(time);osc.stop(time+duration+.01);
     time+=duration;if(si<letter.length-1)time+=unit;else if(li<all.length-1)time+=3*unit;else if(wi<words.length-1)time+=7*unit;
   })));
 };
 training.render=function(){
   this.stopSound();const root=this.root;root.replaceChildren();
   const head=el('header');head.append(el('h2','摩斯学堂 · 从零学会收发'),button('关闭学堂',()=>root.close()));root.append(head);const volume=el('label','摩斯独立音量','morse-volume43'),range=el('input');range.type='range';range.min=0;range.max=100;range.value=Math.round((this.volume43??1)*100);range.setAttribute('aria-label','摩斯学堂独立音量');range.oninput=()=>{this.volume43=Number(range.value)/100;this.stopSound();};volume.append(range);root.append(volume);
   root.append(el('p',`${this.exercises.length}步 · 7个单元。可以查表、反复听、随时退出后续学。完成训练取得四岗位通用译报资格；已取得资格的玩家可继续复习。`));
   root.append(el('p','课程路线：点划节奏 → 分组译读 → 全字母 → 全数字 → 主动发报 → 听音辨认 → 综合电报。'));
   const progress=el('progress',undefined,'morse-course-progress');progress.max=this.exercises.length;progress.value=this.step;progress.setAttribute('aria-label','摩斯课程进度');root.append(progress);
   const manual=el('details'),summary=el('summary','随时查阅 · 操作示范与完整字母/数字表');manual.append(summary,
     el('p','点＝1拍，划＝3拍；同一字母的点划之间停1拍，字母之间停3拍，单词之间停7拍。停顿是完整间隔，不需要再叠加1拍。'),
     el('p','示范 A：点—停1拍—划。示范 N：划—停1拍—点。接收顺序：听音 → 记点划 → 按停顿分组 → 查表 → 译读 → 复核。'),
     el('p','写法示范：A T 写为 .- / -；AT 写为 .- -。SOS 在本课作三字母练习；实际连续求救信号可不留字母间隔。中文电报通常还涉及电码本，本课不把英文字母表当作中文历史密码本。'));
   const demos=el('div',undefined,'morse-actions');for(const [name,code] of [['点与划','. -'],['A与N','.- -.'],['字母与词间隔','.- - / .- -']])demos.append(button('听示范：'+name,()=>this.listen(code).catch(()=>{this.status.textContent='听音未启动，请重试或查阅点划。';})));manual.append(demos);
   const table=el('div',undefined,'morse-reference');for(const [letter,code]of Object.entries(alphabet))table.append(el('span',letter+'　'+code));manual.append(table);root.append(manual);
   if(this.step>=this.exercises.length){
     GameState.skills.morse=true;const saved=this.saveCourse();const rule=(typeof NpcStory!=='undefined'&&NpcStory.describe)?NpcStory.describe():'每章完成8轮';root.append(el('h3','收发训练完成'),el('p',saved?`译报资格与进度已保存，四种岗位均可使用。章节电报仍需完成前置任务和${rule}剧情。`:'训练已通过，但进度未写入存储。本次游戏仍可使用资格，请检查存储空间后重试保存。'));
     root.append(button('从头复习（保留已有资格）',()=>{this.step=0;this.mistakes=[];this.saveCourse();this.render();}),button('再次保存',()=>{this.status.textContent=this.saveCourse()?'已保存。':'仍未保存，请检查浏览器存储。';}));
     const status=el('p','','morse-feedback');this.status=status;root.append(status);root.append(button('完成训练 · 返回游戏',()=>root.close()));return;
   }
   const ex=this.exercises[this.step];root.append(el('p',stage(this.step),'morse-stage'),el('h3',`训练 ${this.step+1} / ${this.exercises.length}${ex.send?' · 将明文发成电码':ex.hearing?' · 先听再译':' · 看码与听音互相核对'}`));
   root.append(el('p',ex.note));
   const code=el('div',ex.send?'待发明文：'+ex.text:ex.hearing?'点划已隐藏，请先听本题信号':ex.code,'morse-signal');root.append(code);
   const controls=el('div',undefined,'morse-actions'),speed=el('select');speed.setAttribute('aria-label','听音速度');for(const [label,value]of [['慢速 · 每点240毫秒',.24],['教学 · 每点180毫秒',.18],['进阶 · 每点120毫秒',.12]]){const option=el('option',label);option.value=value;option.selected=this.speed===value;speed.append(option);}speed.onchange=()=>{this.speed=Number(speed.value);this.stopSound();};
   controls.append(button('听本题信号',()=>this.listen(ex.code).catch(()=>{this.status.textContent='听音未开始，可显示点划继续练习。';})),button('停止声音',()=>this.stopSound()),speed);
   if(ex.hearing)controls.append(button('显示点划提示',()=>{code.textContent=ex.code;}));root.append(controls);
   const hint=el('p','先完成本题，再核对。答错可重试，不倒扣进度。','morse-feedback');hint.setAttribute('role','status');hint.setAttribute('aria-live','polite');this.status=hint;
   let passed=false;const next=button('继续下一步',()=>{if(!passed)return;this.step++;const saved=this.saveCourse();this.render();if(!saved)this.status.textContent='本题已通过，但保存失败；当前会话可继续，退出后可能需要重做。';},'morse-next');next.hidden=true;
   const answer=value=>{
     if(passed)return;const actual=normalize(value),expected=normalize(ex.answer);
     if(actual!==expected){this.mistakes.push(this.step);this.saveCourse();let message='';
       if(ex.send){const a=actual.split(' '),b=expected.split(' '),i=b.findIndex((x,i)=>x!==a[i]);message=`请复核第 ${Math.max(0,i)+1} 个字组：先逐字查表，再用空格分开字母。`;}
       else{const i=[...expected].findIndex((c,i)=>actual[i]!==c);message=`请从第 ${Math.max(0,i)+1} 个字符复核，注意点划顺序和词间空格。`;}
       hint.textContent='还未通过。'+message+' '+ex.note;return;
     }
     passed=true;hint.textContent=`核对正确：${ex.answer}。${ex.send?'再听一次，确认发出的顺序。':'请对照上面的信号复核，然后继续。'}`;next.hidden=false;next.focus({preventScroll:true});
   };
   if(ex.typed){
     const input=el('input');input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-label',ex.send?'发送的摩斯点划':'独立译报答案');input.placeholder=ex.send?'输入点划，字母空格分开，词间用 /':'输入译文，大小写均可';
     input.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Enter'&&!event.isComposing){event.preventDefault();answer(input.value);}});root.append(input);
     if(ex.send){const keys=el('div',undefined,'morse-actions');for(const [label,text]of [['点 ·','.'],['划 −','-'],['字母分隔',' '],['单词分隔',' / ']])keys.append(button(label,()=>{input.value+=text;input.focus({preventScroll:true});}));keys.append(button('退一格',()=>{input.value=input.value.slice(0,-1);}),button('清空草稿',()=>{input.value='';}),button('试听我的发报',()=>{if(/^[.\- /]+$/.test(input.value))this.listen(input.value).catch(()=>{});else hint.textContent='先用点、划、空格或 / 写好发报草稿。';}));root.append(keys);}
     root.append(button('核对并提交答案',()=>answer(input.value)));
   }else{const choices=el('div',undefined,'morse-actions');for(const choice of ex.choices)choices.append(button(choice,()=>answer(choice)));root.append(choices);}
   root.append(hint,next);
   const review=el('details'),reviewTitle=el('summary',`错题复习 · ${new Set(this.mistakes).size}题`);review.append(reviewTitle);
   for(const index of [...new Set(this.mistakes)]){const item=this.exercises[index];if(!item)continue;review.append(el('p',`第${index+1}题：${item.code} → ${item.answer}。${item.note}`));}root.append(review);
   const foot=el('div',undefined,'morse-course-footer');foot.append(button('保存进度 · 稍后继续',()=>{if(this.saveCourse())root.close();else hint.textContent='保存失败，窗口已保留，请检查存储或继续学习。';}),el('small','可反复重听、查表；本课不计时。'));root.append(foot);
 };
 const install=training.install;
 training.install=function(){
   install.call(this);
   const entry=document.getElementById('titleMorse');if(entry)entry.onclick=()=>this.open();
   const nav=document.querySelector('.nav-bottom');if(nav&&!nav.querySelector('.morse-nav-entry')){const b=button('',()=>this.open(),'nav-btn morse-nav-entry');b.setAttribute('aria-label','打开摩斯学堂，学习与复习');b.append(el('span','· −','nav-icon'),el('span','摩斯学堂','nav-text'));nav.append(b);}
 };
})();
