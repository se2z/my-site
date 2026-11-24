import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const records=[];
for(const file of (await readdir(new URL('../public/models/',import.meta.url))).filter(f=>f.endsWith('.glb'))){const b=await readFile(new URL('../public/models/'+file,import.meta.url));const length=b.readUInt32LE(12);const gltf=JSON.parse(b.subarray(20,20+length).toString());records.push({file,bytes:b.length,animations:gltf.animations?.map(a=>({name:a.name,channels:a.channels.length})),cleaningUV:gltf.meshes.flatMap(m=>m.primitives).filter(p=>p.attributes.TEXCOORD_1!==undefined).length});if(!gltf.animations?.some(a=>a.name==='WelcomeWave'))throw new Error(file+' has no welcome animation');}
for(const file of (await readdir(new URL('../public/posters/',import.meta.url))).filter(f=>f.endsWith('.png')))await sharp(fileURLToPath(new URL('../public/posters/'+file,import.meta.url))).resize({width:900}).webp({quality:80}).toFile(fileURLToPath(new URL('../public/posters/'+file.replace('.png','.webp'),import.meta.url)));
await mkdir(new URL('../proof/',import.meta.url),{recursive:true});await writeFile(new URL('../proof/models.json',import.meta.url),JSON.stringify(records,null,2));console.log(JSON.stringify(records,null,2));
