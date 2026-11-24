import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z, ZodError } from 'zod';
import { query,secrets } from '@/lib/db';
import { statuses,statusLabels } from '@/lib/domain';
import { checkOrigin,getConfig,getOrder,getOwnerOrder,hash,HttpError,login,logout,ownerAuthenticated,publicOrder,rateLimit,requireOwner,saveConfig,saveOrder,savePassword,submitOrder } from '@/lib/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function json(req:Request){const str=await req.text();if(str.length>100000)throw new HttpError(413,'Слишком много данных');return JSON.parse(str);}
type Context={params:Promise<{path:string[]}>};
const draftValid=(value:string)=>/^[a-f0-9]{64}$/.test(value);
const localDemo=(req:Request)=>!process.env.VERCEL&&!process.env.DATABASE_URL&&['127.0.0.1','localhost'].includes(new URL(req.url).hostname);
async function handle(req:Request,ctx:Context){
  try{
    const {path}=await ctx.params;const route=path.join('/'),method=req.method;
    if(method!=='GET')checkOrigin(req);
    if(route==='config'&&method==='GET')return response(await getConfig());
    if(route==='admin/session'&&method==='GET')return response({authenticated:await ownerAuthenticated(),localDemo:localDemo(req)});
    if(route==='admin/login'&&method==='POST'){const body=await json(req);await login(z.string().max(300).parse(body.password),req);return response({ok:true});}
    if(route==='admin/local-demo'&&method==='POST'){if(!localDemo(req))throw new HttpError(404,'Не найдено');await login(secrets().password,req);return response({ok:true});}
    if(route==='admin/logout'&&method==='POST'){await logout();return response({ok:true});}
    if(route==='uploads'&&method==='POST'){
      await rateLimit(req,'photos',60);
      if(Number(req.headers.get('content-length')??0)>4500000)throw new HttpError(413,'Фото слишком большое');
      const form=await req.formData(),file=form.get('file'),draft=String(form.get('draft')??'');const id=z.string().uuid().parse(form.get('id'));
      if(!(file instanceof File)||!draftValid(draft))throw new HttpError(400,'Не удалось прочитать фотографию');
      if(file.size>4000000||file.size<12)throw new HttpError(413,'Загрузите фото до 4 МБ');
      const existing=await query('SELECT id FROM myagko_photos WHERE id=$1 AND draft_hash=$2',[id,hash(draft)]);if(existing.length)return response({id});
      const owned=await query('SELECT id FROM myagko_photos WHERE draft_hash=$1',[hash(draft)]);if(owned.length>=3)throw new HttpError(400,'Можно добавить до 3 фотографий');
      const bytes=Buffer.from(await file.arrayBuffer());
      const jpeg=bytes[0]===0xff&&bytes[1]===0xd8;const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));const webp=bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
      if(!jpeg&&!png&&!webp)throw new HttpError(400,'Нужны JPEG, PNG или WebP');
      const compressed=await sharp(bytes,{limitInputPixels:40000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer();
      await query('INSERT INTO myagko_photos(id,draft_hash,mime,data,created_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING',[id,hash(draft),'image/jpeg',compressed.toString('base64'),Date.now()]);return response({id},201);
    }
    if(path[0]==='uploads'&&method==='DELETE'){
      const draft=req.headers.get('x-draft-token')??'';if(!draftValid(draft))throw new HttpError(403,'Нет доступа');
      const orders=await query<{data:string}>('SELECT data FROM myagko_orders');if(orders.some(o=>JSON.parse(o.data).request.photos.includes(path[1])))throw new HttpError(409,'Фотография уже прикреплена к заявке');
      await query('DELETE FROM myagko_photos WHERE id=$1 AND draft_hash=$2',[path[1],hash(draft)]);return response({ok:true});
    }
    if(route==='orders'&&method==='POST'){const result=await submitOrder(await json(req),req);return response({order:publicOrder(result.order),token:result.token},201);}
    if(path[0]==='orders'&&method==='GET')return response(publicOrder(await getOrder(path[1])));
    if(path[0]==='orders'&&path[2]==='game'&&method==='POST'){
      z.object({progress:z.number().min(95).max(100)}).parse(await json(req));
      const order=await getOrder(path[1]);if(order.config.game==='off')throw new HttpError(403,'Игра выключена');
      if(order.config.game==='bonus'&&!order.coupon){const c=order.config;order.coupon={code:'ЧИСТО-'+order.id.slice(0,8).toUpperCase(),amount:c.bonus,expires:new Date(Date.now()+c.bonusDays*86400000).toISOString(),minimum:c.bonusMinimum};await saveOrder(order);}
      return response({coupon:order.coupon??null});
    }
    if(path[0]==='admin'){
      await requireOwner();
      if(route==='admin/config'&&method==='PUT')return response(await saveConfig(await json(req)));
      if(route==='admin/password'&&method==='PUT'){const b=await json(req);await savePassword(String(b.current??''),String(b.next??''),req);return response({ok:true});}
      if(route==='admin/orders'&&method==='GET'){const rows=await query<{data:string}>('SELECT data FROM myagko_orders');return response(rows.map(r=>JSON.parse(r.data)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));}
      if(path[1]==='orders'&&path[2]&&method==='PATCH'){
        const b=z.object({status:z.enum(statuses),agreedPrice:z.number().int().min(0).max(1000000).nullable(),agreedDay:z.string().trim().max(100),ownerNote:z.string().trim().max(2000)}).parse(await json(req));
        if(b.status==='scheduled'&&(b.agreedPrice===null||b.agreedDay.length<5))throw new HttpError(400,'Укажите согласованные цену и время');
        const order=await getOwnerOrder(path[2]);order.history.push({at:new Date().toISOString(),text:order.status!==b.status?'Статус изменён: '+statusLabels[b.status]:'Детали выезда обновлены'});Object.assign(order,b,{updatedAt:new Date().toISOString()});await saveOrder(order);return response(order);
      }
      if(path[1]==='orders'&&path[2]&&method==='DELETE'){
        const order=await getOwnerOrder(path[2]);for(const id of order.request.photos)await query('DELETE FROM myagko_photos WHERE id=$1',[id]);await query('DELETE FROM myagko_orders WHERE id=$1',[order.id]);return response({ok:true});
      }
      if(path[1]==='photos'&&method==='GET'){
        const rows=await query<{mime:string;data:string}>('SELECT mime,data FROM myagko_photos WHERE id=$1',[path[2]]);if(!rows.length)throw new HttpError(404,'Фото не найдено');return new Response(Buffer.from(rows[0].data,'base64'),{headers:{'Content-Type':rows[0].mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
      }
    }
    throw new HttpError(404,'Не найдено');
  }catch(error){
    if(error instanceof HttpError)return response({error:error.message},error.status);
    if(error instanceof ZodError)return response({error:error.issues[0]?.message??'Проверьте поля'},400);
    if(error instanceof SyntaxError)return response({error:'Не удалось прочитать данные'},400);
    console.error('API failure',error instanceof Error?error.message:'unknown');return response({error:'Сервис временно недоступен. Данные сохранены на устройстве.'},503);
  }
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE};
