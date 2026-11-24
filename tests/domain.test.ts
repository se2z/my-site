import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {defaultConfig as c,estimate,unitPrice,itemSchema,requestSchema,preferredVisit,contactDetails,type CartItem} from '../src/lib/domain';
const item=(category:CartItem['category']='sofa',variant='three'):CartItem=>({id:randomUUID(),category,variant,quantity:1,dirt:false,bothSides:false,description:category==='other'?'Изголовье':''});
test('минимум применяется к чистке, выезд добавляется сверху',()=>{const result=estimate([item('chair','seat')],c,true);assert.equal(result.subtotal,350);assert.equal(result.minimumTopup,1650);assert.equal(result.total,2500);});
test('смешанный заказ сохраняет неизвестную часть и известную сумму',()=>{const r=estimate([item(),item('other','')],c);assert.equal(r.total,2400);assert.equal(r.pending,true);assert.equal(unitPrice(item('other',''),c),null);});
test('заказ только по фото не получает цену ноль',()=>{const r=estimate([item('other','')],c);assert.equal(r.total,null);assert.equal(r.pending,true);});
test('грязь и две стороны матраса согласованно изменяют цену',()=>{const i={...item('mattress','double'),dirt:true,bothSides:true};assert.equal(unitPrice(i,c),3600);assert.equal(estimate([{...i,quantity:2}],c).total,7200);});
test('серверная схема отклоняет неизвестный тариф и отрицательное количество',()=>{assert.equal(itemSchema.safeParse({...item(),variant:'fake'}).success,false);assert.equal(itemSchema.safeParse({...item(),quantity:-1}).success,false);});

const request=()=>({idem:randomUUID(),draft:'a'.repeat(64),items:[item()],name:'Тест',phone:'+70000000001',address:'Москва, тестовый адрес',day:'2026-12-01',comment:'',outside:false,photos:[],consent:true});
test('время выезда сохраняется, некорректное время и время без даты отклоняются',()=>{
  assert.equal(requestSchema.parse({...request(),time:'14:35'}).time,'14:35');
  for(const time of ['24:00','09:60','9:00','12:00:00'])assert.equal(requestSchema.safeParse({...request(),time}).success,false);
  assert.equal(requestSchema.safeParse({...request(),day:'',time:'14:35'}).success,false);
});
test('заявки и черновики до добавления времени остаются совместимыми',()=>{
  assert.equal(requestSchema.parse(request()).time,'');
  assert.equal(preferredVisit('2026-12-01','14:35'),'1 декабря, к 14:35');
  assert.equal(preferredVisit('2026-12-01'),'1 декабря, в течение дня');
  assert.equal(preferredVisit(''),'Подберём вместе');
});
test('демонстрационные контакты не превращаются в нерабочие ссылки',()=>{
  assert.deepEqual(contactDetails(c),{phone:'',email:''});
  assert.deepEqual(contactDetails({phone:'+7 999 123-45-67',email:'hello@clean.ru'}),{phone:'+7 999 123-45-67',email:'hello@clean.ru'});
});
