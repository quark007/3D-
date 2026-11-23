/* Measure event timing when supported; fallback measures event-to-next-frame. */
const InputFeedback={samples:[],native:false,
 add(duration,kind){if(!Number.isFinite(duration)||duration<0)return;this.samples.push({ms:Math.round(duration),kind});if(this.samples.length>120)this.samples.shift();},
 stats(){const values=this.samples.map(x=>x.ms).sort((a,b)=>a-b);return {samples:values.length,p95_ms:values.length?values[Math.ceil(values.length*.95)-1]:null,max_ms:values.at(-1)??null,measurement:this.native?'PerformanceEventTiming (events >=16ms)':'event-handler-to-next-frame (excludes input queue)'};},
 install(){try{if(PerformanceObserver.supportedEntryTypes?.includes('event')){const o=new PerformanceObserver(list=>{for(const e of list.getEntries())if(['click','pointerup','keydown','drop'].includes(e.name))this.add(e.duration,e.name);});o.observe({type:'event',durationThreshold:16,buffered:true});this.native=true;}}catch{}
 document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b||b.disabled)return;b.classList.add('input-ack');setTimeout(()=>b.classList.remove('input-ack'),120);if(!this.native){const start=performance.now();requestAnimationFrame(()=>this.add(performance.now()-start,'click'));}},true);
 }
};document.addEventListener('DOMContentLoaded',()=>InputFeedback.install());
