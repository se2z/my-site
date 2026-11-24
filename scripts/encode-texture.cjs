const sharp=require('sharp');
const chunks=[];
process.stdin.on('data',chunk=>chunks.push(chunk));
process.stdin.on('end',async()=>{
  try{
    const source=Buffer.concat(chunks);
    const output=await sharp(source).webp({lossless:true,effort:6}).toBuffer();
    const before=await sharp(source).ensureAlpha().raw().toBuffer();
    const after=await sharp(output).ensureAlpha().raw().toBuffer();
    if(!before.equals(after))throw new Error('Lossless texture pixel validation failed');
    process.stdout.write(output);
  }catch(error){process.stderr.write(String(error));process.exitCode=1;}
});
