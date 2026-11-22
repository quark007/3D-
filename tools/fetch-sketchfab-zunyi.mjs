import path from 'node:path';
import {root,record,atomic,json,response,retry,hash} from './zunyi-scan-store.mjs';
const token=process.env.SKETCHFAB_TOKEN?.trim();
if(!token){
 console.log('请前往 Sketchfab 账号 → Settings → Password & API → 复制 API Token。设置环境变量 SKETCHFAB_TOKEN 后重新运行此脚本。');
 process.exit(0);
}
const api='https://api.sketchfab.com/v3/';
const auth={headers:{Authorization:'Token '+token}};
const limit=30_000_000;
const searches={roof_:'chinese roof tiles',door_:'old wooden door scan',tree_:'old tree trunk scan',main_building_:'chinese old architecture'};
for(const [prefix,q] of Object.entries(searches)){
 let count=0;
 const seen=new Set();
 let next=api+'search?'+new URLSearchParams({type:'models',q,downloadable:'true',archives_flavours:'false'});
 while(next && count<2){
  if(!next.startsWith(api))throw Error('Unexpected pagination URL');
  const page=await json(next,auth);
  for(const model of page.results){
   if(count===2)break;
   if(seen.has(model.uid))continue;
   seen.add(model.uid);
   const slug=model.license?.slug;
   if(!['cc0','by'].includes(slug))continue;
   if(!/scan|photogrammetr|realitycapture|metashape|polycam/i.test([model.name,model.description,...(model.tags??[]).map(t=>t.name)].join(' ')))continue;
   try{
    const {glb}=await json(api+'models/'+model.uid+'/download',auth);
    if(!glb?.url || glb.size>limit)continue;
    const bytes=await retry(async()=>{
     const res=await response(glb.url);
     const chunks=[];let size=0;
     for await(const chunk of res.body){size+=chunk.length;if(size>limit)throw Error('超过 30 MB');chunks.push(chunk)}
     const b=Buffer.concat(chunks);
     if(b.length<20 || b.toString('ascii',0,4)!=='glTF' || b.readUInt32LE(4)!==2 || b.readUInt32LE(8)!==b.length || (glb.size && b.length!==glb.size))throw Error('GLB 校验失败');
     return b;
    });
    if(!/^[a-z0-9]+$/i.test(model.uid))throw Error('Invalid UID');
    const rel='models/'+prefix+model.uid+'.glb';
    await atomic(path.join(root,rel),bytes);
    await record({source:'Sketchfab',id:model.uid,prefix,title:model.name,url:model.viewerUrl,authors:[model.user.displayName],license:slug==='by'?'CC-BY':'CC0',licenseUrl:model.license.url,status:'ready',files:[{path:'assets/raw-scans/zunyi/'+rel,bytes:bytes.length,sha256:hash(bytes,'sha256')}]});
    count++;
   }catch(e){console.error(model.uid,e.message)}
  }
  next=page.next;
 }
 console.log(prefix,count+'/2');if(count<2)process.exitCode=1;
}
