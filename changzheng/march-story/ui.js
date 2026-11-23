(() => {
  'use strict';
  const el = (tag,text,className) => {const n=document.createElement(tag); if(text !== undefined)n.textContent=text;if(className)n.className=className;return n;};
  function dialog(title, signal) {
    const trigger=document.activeElement, d=el('dialog',undefined,'march83-dialog'), head=el('header'), label=el('div');
    label.append(el('small','长征 · 星火 / JOURNEY NOTES'),el('h2',title));
    const close=el('button','返回场景 · Esc');close.type='button';close.onclick=()=>d.close();head.append(label,close);
    const body=el('section',undefined,'march83-body'), foot=el('footer');d.append(head,body,foot);document.body.append(d);
    const abort=()=>{if(d.open)d.close();else d.remove();};signal?.addEventListener('abort',abort,{once:true});
    d.addEventListener('close',()=>{signal?.removeEventListener('abort',abort);try{const cinema=typeof DecisionCinema!=='undefined'?DecisionCinema:window.DecisionCinema;if(cinema&&((cinema.root&&d.contains(cinema.root))||d.querySelector('.decision-film-pending,.decision-film-overlay')))cinema.close();}catch{}if(window.CZMarchVoice)window.CZMarchVoice.stop();else window.CZMarchEnv().ui?.stopNpcVoice?.();d.remove();if(trigger?.isConnected)trigger.focus({preventScroll:true});},{once:true});
    d.addEventListener('keydown',e=>e.stopPropagation());
    d.addEventListener('cancel',e=>{e.preventDefault();d.close();});d.showModal();return {d,body,foot};
  }
  function button(text,run) {
    const b=el('button',text);b.type='button';
    const failed=error=>{const message='操作未完成：'+(error?.message||'请重试');note(message);const host=b.closest('dialog');if(host){let n=host.querySelector('[data-button-error]');if(!n){n=el('p',undefined,'march87-error');n.dataset.buttonError='';n.setAttribute('role','alert');host.querySelector('section')?.append(n);}n.textContent=message;}};
    b.onclick=e=>{if(b.disabled)return;try{const result=run(e);if(result?.then){b.disabled=true;b.setAttribute('aria-busy','true');Promise.resolve(result).catch(failed).finally(()=>{b.disabled=false;b.removeAttribute('aria-busy');});}}catch(error){failed(error);}};return b;
  }
  const note = text => {const g=window.CZMarchEnv().ui;if(g?.showToast)g.showToast(text);else console.info('[march-story]',text);};
  async function dialogue(row, signal, checkpoint) {
    const env=window.CZMarchEnv(), script=env.story.get(row.chapterId,row.part);
    if(!script)return {status:'error',reason:'未找到原始对话剧本 '+row.scriptId};
    const role=env.story.role(), owner=env.owner, preparations=env.state.storyPreparations,{d,body,foot}=dialog(row.title,signal);
    let result={status:'cancelled'}, last='';
    const valid=()=>!signal.aborted && owner===window.CZMarchEnv().owner&&env.state.storyPreparations===preparations&&env.story.role()===role&&!!env.state.character;
    function render(auto=false){
      window.CZMarchVoice?.stop();
      body.replaceChildren();foot.replaceChildren();const count=env.flow.count(script,role), required=env.story.required(script);
      body.append(el('small','创作对白 · 学习视角，不代表历史人物原话','march83-label'),el('p',`${Math.min(count,required)} / ${required} 轮交谈已记录`,'march83-progress'));
      const plan=window.CZMarchStory?.progress?.(row.chapterId);if(plan){const i=plan.steps.findIndex(step=>step.rows.some(r=>r.storyId===row.storyId));if(i>=0){const badge=el('aside',`本章第 ${i+1}/${plan.steps.length} 项 · ${plan.steps[i].title}`,'march89-dialog-step');body.append(badge);}}
      const opening=env.core.opening(script,row.npcId,{role,nodeId:row.chapterId});
      body.append(el('h3',env.core.names[row.npcId] || row.npcId),el('p',last || opening,'march83-line'));
      try{window.CZMarchDecision?.attach(body,row);}catch(error){console.info('[march-decision]',error);}
      if(window.CZMarchVoice)window.CZMarchVoice.mount(foot,last||opening,row.npcId,{auto});
      else foot.append(button('朗读当前对白',()=>{if(!window.CZMarchEnv().muted)env.ui?.playNpcVoice?.(row.npcId,'calm',last||opening)?.catch?.(()=>{});}));
      const chat=el('details',undefined,'march104-chat');chat.append(el('summary','与 AI 战友自由交谈 · DeepSeek'));
      const input=el('textarea');input.maxLength=200;input.rows=3;input.placeholder='向战友提问，或商量当前任务…';input.setAttribute('aria-label','给AI战友的话');
      const reply=el('p',undefined,'march104-chat-reply');reply.setAttribute('role','status');
      const send=button('发送给战友',async()=>{const message=input.value.trim();if(!message)return;const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),45000);const cancel=()=>abort.abort();signal.addEventListener('abort',cancel,{once:true});d.addEventListener('close',cancel,{once:true});reply.textContent='DeepSeek 战友正在回应…';try{const base=window.CZ_API_BASE||window.CZ_PUBLIC_API_BASE||'/api';const response=await fetch(base.replace(/\/$/,'')+'/npc/chat',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',signal:abort.signal,body:JSON.stringify({npcId:row.npcId,message,scene:'dialog',script_id:row.scriptId,history:[]})});if(!response.ok)throw Error('服务返回 '+response.status);const data=await response.json();if(valid()&&d.open){reply.textContent=(response.headers.get('X-AI-Mode')==='model'?'DeepSeek：':'本地战友回复：')+(data.text||'本次没有收到回复，请重试。');input.value='';}}catch(error){if(valid()&&d.open)reply.textContent='本次交谈未返回，请重试。固定对白仍可继续。';}finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel);d.removeEventListener('close',cancel);}});
      chat.append(input,send,reply);body.append(chat);
      const options=env.flow.options(script,role,row.npcId);
      for(const [index,option] of options.entries()){const choice=button(option.label,()=>{
        if(!valid())return;const picked=env.flow.choose(script,role,row.npcId,index,count);if(!picked)return;
        last=picked.reply;checkpoint?.();render(true);
      });choice.className='march83-choice';foot.append(choice);}
      if(count){const undo=button('返回上一个选项',()=>{if(!valid()||undo.disabled)return;if(!env.flow.undo(script,role))return;window.CZMarchSave.transact(s=>{for(const [id,t]of Object.entries(s.tasks))if(id.startsWith(`chapter-${row.chapterId}/dialogue-${row.scriptId}-`)){t.completed=false;t.completedAt=null;}});last=env.flow.turns(script,role).at(-1)?.reply || '';render();});
        const state=window.CZMarchSave.read();undo.disabled=row.part===1&&(!!state.tasks[`chapter-${row.chapterId}/main-task`]?.completed||state.completedChapters.includes(row.chapterId));foot.append(undo);}
      if(count>=required)foot.append(button('记录交谈 · 返回场景',()=>{if(!valid())return;result={status:'completed'};d.close();}));
      body.append(el('p','完成本段后点击「记录交谈」保存，再返回场景跟随下一项指引；关闭窗口会保留已选对白，但不会确认本段完成。','march83-note'));
    }
    try{render();}catch(error){d.close();return {status:'error',reason:'对白加载失败：'+error.message};}
    /* 确定性收尾：除依赖 'close' 事件外，凡程序化 d.close() 关闭已开弹窗都直接兑现结果，
       防止个别环境下 close 事件未送达导致 run() 永久等待、行走层被锁。 */
    return new Promise(resolve=>{
      const done=()=>resolve(result);
      d.addEventListener('close',done,{once:true});
      const nativeClose=d.close.bind(d);
      d.close=(...args)=>{const wasOpen=d.open,r=nativeClose(...args);if(wasOpen)queueMicrotask(done);return r;};
    });
  }
  async function read(row, signal) {
    const env=window.CZMarchEnv(), {d,body,foot}=dialog(row.title,signal);let result={status:'cancelled'};
    if(row.kind==='hero'){
      const hero=env.heroes?.rows.find(v=>v.id===row.heroId);
      if(!hero){d.close();return {status:'error',reason:'缺少阅读原文'};}
      if(hero.role && hero.role!==env.heroes.role()){body.append(el('p','此篇为指定岗位的阅读视角。可在原角色档案中回看，不改变当前岗位。'));}
      body.append(el('small',hero.kind),el('p',hero.intro));let page=0;
      const text=el('article');body.append(text);
      const show=()=>{const [speaker,line]=hero.lines[page];text.replaceChildren(el('h3',speaker),el('p',line));foot.replaceChildren();
        if(window.CZMarchVoice)window.CZMarchVoice.mount(foot,line,'narrator');
        else foot.append(button('朗读本页',()=>{if(!window.CZMarchEnv().muted)env.ui?.playNpcVoice?.('narrator','calm',line)?.catch?.(()=>{});}));
        if(page<hero.lines.length-1)foot.append(button('继续阅读',()=>{page++;show();}));
        else {text.append(el('blockquote',hero.reflection));for(const src of [hero.source,hero.source2].filter(Boolean)){const p=el('p',src[0]+'：'+src[1]);if(/^https:\/\//.test(src[1])){const a=el('a','查看来源');a.href=src[1];a.target='_blank';a.rel='noopener noreferrer';p.append(a);}text.append(p);}
          foot.append(button('记下这段见证',()=>{if(signal.aborted || env.owner!==window.CZMarchEnv().owner)return;result={status:'completed'};d.close();}));}
      };show();
      try{window.CZMarchDecision?.attach(body,row);}catch(error){console.info('[march-decision]',error);}
    } else {
      const h=env.history[row.chapterId];body.append(el('small','历史资料 · 以原有档案标注为准'),el('p',h?.historyText || h?.text || '此条未找到可显示的史料原文，请从原站点历史档案核对。'));
      try{window.CZMarchDecision?.attach(body,row);}catch(error){console.info('[march-decision]',error);}
      foot.append(button('读完 · 返回场景',()=>{result={status:'completed'};d.close();}));
    }
    return new Promise(resolve=>{
      const done=()=>resolve(result);
      d.addEventListener('close',done,{once:true});
      const nativeClose=d.close.bind(d);
      d.close=(...args)=>{const wasOpen=d.open,r=nativeClose(...args);if(wasOpen)queueMicrotask(done);return r;};
    });
  }
  window.CZMarchUI={el,button,dialog,note,dialogue,read};
})();
