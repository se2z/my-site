import 'server-only';
import { createHash,createHmac,timingSafeEqual,scryptSync,randomBytes,randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { query,readRecord,secrets,writeRecord } from './db';
import { defaultConfig,configSchema,estimate,requestSchema,statusLabels,type CompanyConfig,type Order } from './domain';
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const privateToken=(idem:string)=>createHmac('sha256',secrets().secret).update('receipt:'+idem).digest('hex');
export const getConfig=()=>readRecord<CompanyConfig>('company',defaultConfig);
export async function ownerAuthenticated(){const cookie=(await cookies()).get('owner_session')?.value;if(!cookie)return false;const expiry=await readRecord<number>('session:'+hash(cookie),0);return expiry>Date.now();}
export async function requireOwner(){if(!await ownerAuthenticated())throw new HttpError(401,'Войдите в кабинет');}
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export function checkOrigin(req:Request){const origin=req.headers.get('origin');if(!origin)return;const expected=new URL(req.url);const allowedHost=req.headers.get('host')??expected.host;const protocol=req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()+':';const actual=new URL(origin);if(actual.host!==allowedHost||(actual.protocol!==(protocol==='undefined:'?expected.protocol:protocol)))throw new HttpError(403,'Запрос с другого сайта отклонён');}
export async function rateLimit(req:Request,kind:string,limit=20){const ip=req.headers.get('x-forwarded-for')?.split(',')[0]??'local';const key='rate:'+hash(kind+':'+ip)+':'+Math.floor(Date.now()/3600000);const count=await readRecord<number>(key,0);if(count>=limit)throw new HttpError(429,'Слишком много попыток. Попробуйте позже.');await writeRecord(key,count+1);}
export async function login(password:string,req:Request){await rateLimit(req,'login',12);const saved=await readRecord<{salt:string;digest:string}|null>('owner-password',null);const salt=saved?.salt??'myagko-owner';const target=saved?Buffer.from(saved.digest,'hex'):scryptSync(secrets().password,salt,32);const supplied=scryptSync(password,salt,32);if(!timingSafeEqual(target,supplied))throw new HttpError(401,'Неверный пароль');const token=randomBytes(32).toString('hex');await writeRecord('session:'+hash(token),Date.now()+7*86400000);(await cookies()).set('owner_session',token,{httpOnly:true,sameSite:'lax',secure:!!process.env.VERCEL,path:'/',maxAge:7*86400});}
export async function logout(){const jar=await cookies();const token=jar.get('owner_session')?.value;if(token)await writeRecord('session:'+hash(token),0);jar.delete('owner_session');}
export async function savePassword(current:string,next:string,req:Request){await login(current,req);if(next.length<12)throw new HttpError(400,'Используйте не менее 12 символов');const salt=randomBytes(16).toString('hex');await writeRecord('owner-password',{salt,digest:scryptSync(next,salt,32).toString('hex')});await logout();await query("DELETE FROM myagko_records WHERE key LIKE 'session:%'");}
export async function saveConfig(value:unknown){const c=configSchema.parse(value);for(const key of Object.keys(defaultConfig.rates))if(c.rates[key]===undefined)throw new HttpError(400,'Укажите все тарифы');await writeRecord('company',c);return c;}
export async function getOrder(token:string){if(!/^[a-f0-9]{64}$/.test(token))throw new HttpError(404,'Заявка не найдена');const rows=await query<{data:string}>('SELECT data FROM myagko_orders WHERE token_hash=$1',[hash(token)]);if(!rows.length)throw new HttpError(404,'Заявка не найдена');return JSON.parse(rows[0].data) as Order;}
export async function getOwnerOrder(id:string){const rows=await query<{data:string}>('SELECT data FROM myagko_orders WHERE id=$1',[id]);if(!rows.length)throw new HttpError(404,'Заявка не найдена');return JSON.parse(rows[0].data) as Order;}
export async function saveOrder(order:Order){await query('UPDATE myagko_orders SET data=$1 WHERE id=$2',[JSON.stringify(order),order.id]);}
export async function submitOrder(raw:unknown,req:Request){
  const input=requestSchema.parse(raw);const token=privateToken(input.idem);const rows=await query<{data:string}>('SELECT data FROM myagko_orders WHERE idem=$1',[input.idem]);
  if(rows.length)return {order:JSON.parse(rows[0].data) as Order,token};
  await rateLimit(req,'orders',15);if(input.day&&input.day<new Date().toLocaleDateString('en-CA'))throw new HttpError(400,'Выберите сегодняшний или будущий день');
  if(input.items.some(i=>i.category==='other')&&input.photos.length===0)throw new HttpError(400,'Добавьте фото нестандартной мебели');
  for(const id of input.photos){const photo=await query('SELECT id FROM myagko_photos WHERE id=$1 AND draft_hash=$2',[id,hash(input.draft)]);if(!photo.length)throw new HttpError(400,'Фотография ещё не загрузилась. Повторите загрузку.');}
  const config=await getConfig(),now=new Date().toISOString(),id=randomUUID();
  const order:Order={id,number:'М-'+id.slice(0,8).toUpperCase(),createdAt:now,updatedAt:now,status:'new',request:input,config,estimate:estimate(input.items,config,input.outside),agreedPrice:null,agreedDay:'',ownerNote:'',history:[{at:now,text:'Заявка получена'}]};
  await query('INSERT INTO myagko_orders(id,idem,token_hash,data) VALUES($1,$2,$3,$4) ON CONFLICT(idem) DO NOTHING',[id,input.idem,hash(token),JSON.stringify(order)]);
  return {order:await getOrder(token),token};
}
export function publicOrder(order:Order){return {id:order.id,number:order.number,status:order.status,createdAt:order.createdAt,updatedAt:order.updatedAt,items:order.request.items,name:order.request.name,address:order.request.address,day:order.request.day,time:order.request.time??'',estimate:order.estimate,agreedPrice:order.agreedPrice,agreedDay:order.agreedDay,coupon:order.coupon,game:order.config.game,quotes:order.config.quotes,company:{name:order.config.name,phone:order.config.phone}};}
