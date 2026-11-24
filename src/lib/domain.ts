import { z } from 'zod';
export const categories = ['sofa','armchair','mattress','chair','other'] as const;
export type Category = typeof categories[number];
export const labels: Record<Category,string> = {sofa:'Диван',armchair:'Кресло',mattress:'Матрас',chair:'Стул',other:'Другое'};
export const variants: Record<Category,{id:string;label:string}[]> = {
  sofa:[{id:'two',label:'2 места'},{id:'three',label:'3 места'},{id:'corner',label:'Угловой'}],
  armchair:[{id:'standard',label:'Обычное'},{id:'recliner',label:'Реклайнер'}],
  mattress:[{id:'single',label:'Односпальный'},{id:'double',label:'Двуспальный'}],
  chair:[{id:'seat',label:'Сиденье'},{id:'back',label:'Со спинкой'}],other:[]
};
export const configSchema=z.object({
  name:z.string().trim().min(1).max(40), phone:z.string().trim().min(5).max(25), email:z.string().email(),
  city:z.string().trim().min(2).max(50),area:z.string().trim().max(150),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/),
  rates:z.record(z.string(),z.number().int().min(0).max(100000)), minimum:z.number().int().min(0).max(100000),
  travel:z.number().int().min(0).max(20000), dirtPercent:z.number().int().min(0).max(100),
  bothSidesPercent:z.number().int().min(0).max(100),game:z.enum(['off','fun','bonus']),
  bonus:z.number().int().min(0).max(10000),bonusDays:z.number().int().min(1).max(365),
  bonusMinimum:z.number().int().min(0).max(100000),character:z.enum(['plush','sleepy','wink','off']),
  quotes:z.boolean()
});
export type CompanyConfig=z.infer<typeof configSchema>;
export const defaultConfig:CompanyConfig={name:'мягко',phone:'+7 000 000-00-00',email:'hello@myagko.example',city:'Москва',area:'Москва и Подмосковье',accent:'#216DE5',
  rates:{'sofa.two':1800,'sofa.three':2400,'sofa.corner':3400,'armchair.standard':1200,'armchair.recliner':1600,'mattress.single':1400,'mattress.double':2000,'chair.seat':350,'chair.back':500},
  minimum:2000,travel:500,dirtPercent:20,bothSidesPercent:50,game:'fun',bonus:200,bonusDays:30,bonusMinimum:2000,character:'plush',quotes:true};
export const itemSchema=z.object({id:z.string().uuid(),category:z.enum(categories),variant:z.string().max(30),quantity:z.number().int().min(1).max(20),dirt:z.boolean(),bothSides:z.boolean(),description:z.string().trim().max(500)}).superRefine((v,ctx)=>{
  if(v.category==='other'){if(v.description.length<3)ctx.addIssue({code:'custom',message:'Опишите мебель',path:['description']});}
  else if(!variants[v.category].some(x=>x.id===v.variant))ctx.addIssue({code:'custom',message:'Неизвестный вариант мебели',path:['variant']});
});
export type CartItem=z.infer<typeof itemSchema>;
export function itemTitle(item:CartItem){return item.category==='other'?item.description: `${labels[item.category]} · ${variants[item.category].find(v=>v.id===item.variant)?.label??''}`;}
export function unitPrice(item:CartItem,c:CompanyConfig):number|null {
  if(item.category==='other')return null;
  const base=c.rates[`${item.category}.${item.variant}`]; if(base===undefined)throw new Error('Тариф отсутствует');
  return Math.round(base*(1+(item.dirt?c.dirtPercent/100:0))*(1+(item.category==='mattress'&&item.bothSides?c.bothSidesPercent/100:0)));
}
export function estimate(items:CartItem[],c:CompanyConfig,outside=false){
  const subtotal=items.reduce((sum,item)=>sum+(unitPrice(item,c)??0)*item.quantity,0);
  const pending=items.some(item=>item.category==='other');
  const known=items.some(item=>item.category!=='other');
  const minimumTopup=known?Math.max(0,c.minimum-subtotal):0;
  const travel=outside?c.travel:0;
  return {subtotal,minimumTopup,travel,total:known?subtotal+minimumTopup+travel:null,pending};
}
export const money=(n:number)=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
export function preferredVisit(day:string,time=''){
  if(!day)return 'Подберём вместе';
  const date=new Date(day+'T12:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
  return time?`${date}, к ${time}`:`${date}, в течение дня`;
}
export function contactDetails(company:Pick<CompanyConfig,'phone'|'email'>){
  const digits=company.phone.replace(/\D/g,'');
  return {phone:digits.length>=10&&!/^7?0+$/.test(digits)?company.phone:'',email:/\.(example|invalid|test)$/i.test(company.email)?'':company.email};
}
export const requestSchema=z.object({idem:z.string().uuid(),draft:z.string().regex(/^[a-f0-9]{64}$/),items:z.array(itemSchema).min(1).max(20),
  name:z.string().trim().min(2).max(60),phone:z.string().trim().refine(v=>v.replace(/\D/g,'').length>=10&&v.replace(/\D/g,'').length<=15,'Проверьте телефон'),
  address:z.string().trim().min(5).max(250),day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')),
  time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,'Укажите время в формате ЧЧ:ММ').or(z.literal('')).default(''),
  comment:z.string().trim().max(1000),outside:z.boolean(),photos:z.array(z.string().uuid()).max(3),consent:z.literal(true)
}).refine(v=>!v.time||!!v.day,{message:'Выберите дату для указанного времени',path:['day']});
export const statuses=['new','scheduled','done','cancelled'] as const;
export const statusLabels:Record<typeof statuses[number],string>={new:'Новая заявка',scheduled:'Выезд согласован',done:'Чистка завершена',cancelled:'Заявка отменена'};
export type Order={id:string;number:string;createdAt:string;updatedAt:string;status:typeof statuses[number];
  request:z.infer<typeof requestSchema>;config:CompanyConfig;estimate:ReturnType<typeof estimate>;agreedPrice:number|null;agreedDay:string;ownerNote:string;history:{at:string;text:string}[];coupon?:{code:string;amount:number;expires:string;minimum:number}};
