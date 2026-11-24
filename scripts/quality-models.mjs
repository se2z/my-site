import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTTextureWebP} from '@gltf-transform/extensions';
import {dedup,prune,resample,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {spawn} from 'node:child_process';
import {readdir,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const input=new URL('../../design/assets/characters-v4/',import.meta.url);
const records=[];
function encodeTexture(image){return new Promise((resolve,reject)=>{
  // Isolate Sharp from the CLI's image codecs: their bundled libvips versions differ on Windows.
  const worker=spawn(process.execPath,[fileURLToPath(new URL('./encode-texture.cjs',import.meta.url))],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  const chunks=[];let error='';worker.stdout.on('data',b=>chunks.push(b));worker.stderr.on('data',b=>error+=b);worker.on('error',reject);worker.on('close',code=>code?reject(new Error(error||'Texture encoder failed')):resolve(Buffer.concat(chunks)));worker.stdin.end(image);
});}
for(const file of (await readdir(input)).filter(name=>name.endsWith('.glb'))){
  const document=await io.read(fileURLToPath(new URL(file,input)));
  // Keep original topology, UVs and animation. Normal/roughness data must not suffer lossy color encoding.
  await document.transform(dedup(),prune({keepAttributes:true}),resample());
  for(const texture of document.getRoot().listTextures()){
    const image=texture.getImage();if(!image)continue;
    texture.setImage(await encodeTexture(image)).setMimeType('image/webp');
  }
  if(document.getRoot().listTextures().length)document.createExtension(EXTTextureWebP).setRequired(true);
  await document.transform(meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeNormal:16,quantizeTexcoord:16}));
  const root=document.getRoot();
  if(!root.listAnimations().some(a=>a.getName()==='WelcomeWave'))throw new Error(file+': missing greeting');
  const uvMeshes=root.listMeshes().flatMap(m=>m.listPrimitives()).filter(p=>p.getAttribute('TEXCOORD_1')).length;
  if(file==='sofa-character.glb'&&uvMeshes!==3)throw new Error('Cleaning surfaces changed');
  const bytes=await io.writeBinary(document);
  await writeFile(new URL('../public/models/'+file,import.meta.url),bytes);
  records.push({file,bytes:bytes.length,cleaningSurfaces:uvMeshes,textureCompression:'lossless WebP',geometry:'original topology; 16-bit normals, positions and UVs',animations:root.listAnimations().map(a=>a.getName())});
}
await mkdir(new URL('../proof/',import.meta.url),{recursive:true});
await writeFile(new URL('../proof/model-quality.json',import.meta.url),JSON.stringify(records,null,2));
console.log(JSON.stringify(records,null,2));
