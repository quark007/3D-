import {mkdir, readFile, writeFile, rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash, randomUUID} from 'node:crypto';
export const root=fileURLToPath(new URL('../assets/raw-scans/zunyi/',import.meta.url));
export const hash=(data,algorithm)=>createHash(algorithm).update(data).digest('hex');
export async function atomic(file,data){
  await mkdir(path.dirname(file),{recursive:true});
  const tmp=file+'.'+randomUUID()+'.part';
  await writeFile(tmp,data);
  await rename(tmp,file);
}
export async function record(entry){
  const file=path.join(root,'manifest.json');
  let manifest;
  try {manifest=JSON.parse(await readFile(file,'utf8'))} catch(e){if(e.code!=='ENOENT') throw e; manifest={assets:[]}}
  manifest.assets=manifest.assets.filter(x=>!(x.source===entry.source && x.id===entry.id && x.prefix===entry.prefix));
  manifest.assets.push(entry);
  await atomic(file,JSON.stringify(manifest,null,2)+'\n');
}
export async function retry(fn){
  for(let n=0;;n++){
    try{return await fn()}catch(e){if(n===2)throw e; await new Promise(r=>setTimeout(r,500*2**n))}
  }
}
export async function response(url,options={}){
  const res=await fetch(url,{signal:AbortSignal.timeout(120000),headers:{'User-Agent':'ZunyiSceneAssetImporter/1.0'},...options});
  if(!res.ok)throw Error('HTTP '+res.status+' '+new URL(url).hostname);
  return res;
}
export const json=(url,options)=>retry(async()=>(await response(url,options)).json());
