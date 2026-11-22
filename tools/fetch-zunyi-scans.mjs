import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {root,hash,atomic,record,retry,response,json} from './zunyi-scan-store.mjs';
const api='https://api.polyhaven.com/';
const specs=[
 ['road_',/^(stone_floor|cobblestone_floor_01|pavement)$/],
 ['wall_',/^(dark_brick_wall|brick_wall_001)$/],
 ['wall_',/^(weathered_plaster|plastered_wall|plastered_wall_02|old_wall)$/],
 ['wood_',/^(weathered_planks|old_planks|aged_wood)$/],
 ['roof_',/^(grey_roof_tiles|clay_roof_tiles)$/],
 ['prop_',/^rock_moss_set_01$/],['tree_',/^tree_stump_01$/],['tree_',/^tree_stump_02$/]
];
const maps=[['diffuse',['Diffuse','diffuse','color','col','albedo']],['normal',['nor_gl']],['roughness',['rough','roughness']],['displacement',['disp','displacement']]];
const catalogs=await Promise.all(['textures','models'].map(t=>json(api+'assets?t='+t)));
async function save(rel,meta){
 const dest=path.resolve(root,rel);
 if(!dest.startsWith(path.resolve(root)+path.sep))throw Error('Invalid asset path');
 const valid=b=>b.length>0 && b.length===meta.size && hash(b,'md5')===meta.md5;
 let bytes=await readFile(dest).catch(e=>{if(e.code!=='ENOENT')throw e});
 if(!bytes || !valid(bytes)){
   bytes=await retry(async()=>{const b=Buffer.from(await (await response(meta.url)).arrayBuffer()); if(!valid(b))throw Error('Integrity failure '+rel);return b});
   await atomic(dest,bytes);
 }
 return {path:'assets/raw-scans/zunyi/'+rel,url:meta.url,bytes:bytes.length,md5:meta.md5};
}
for(const [prefix,pattern] of specs){
 const model=['prop_','tree_'].includes(prefix);
 const catalog=catalogs[Number(model)];
 const matches=Object.keys(catalog).filter(id=>pattern.test(id)).sort((a,b)=>Number(/^(grey_roof_tiles|dark_brick_wall)$/.test(b))-Number(/^(grey_roof_tiles|dark_brick_wall)$/.test(a)));
 let done=false;
 for(const id of matches){
  const entry={id,prefix,source:'Poly Haven',url:'https://polyhaven.com/a/'+id,license:'CC0',authors:Object.keys(catalog[id].authors??{}),resolution:'1k',files:[]};
  try{
   const detail=await json(api+'files/'+id);
   const name=prefix+id;
   let jobs=[];
   if(model){
    const meta=detail.gltf?.['1k']?.gltf;
    if(!meta)throw Error('Missing 1k glTF');
    const folder='models/'+name+'/';
    jobs=[[folder+name+'.gltf',meta],...Object.entries(meta.include??{}).map(([rel,item])=>[folder+rel,item])];
   }else{
    jobs=maps.map(([role,keys])=>{
     const key=Object.keys(detail).find(k=>keys.includes(k.toLowerCase()));
     const formats=detail[key]?.['1k'];
     const ext=['jpg','png','exr'].find(k=>formats?.[k]);
     if(!ext)throw Error('Missing '+role);
     return ['textures/'+name+'_'+role+'_1k.'+ext,formats[ext]];
    });
   }
   for(const [rel,meta] of jobs)entry.files.push(await save(rel,meta));
   await record({...entry,status:'ready'}); console.log('Ready',name,entry.files.length);done=true;break;
  }catch(e){console.error(id,e.message);await record({...entry,status:'failed',error:e.message})}
 }
 if(!done){console.error('Unfilled',prefix,String(pattern));process.exitCode=1}
}
