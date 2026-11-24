'use client';
import {useCallback,useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import type {publicOrder} from '@/lib/server';
import {itemTitle,money,preferredVisit,statusLabels,type CompanyConfig} from '@/lib/domain';
import CompanyFooter from './CompanyFooter';
import {api,save} from '@/lib/client';
import {Button,ErrorMessage,PwaSetup} from './ui';
const CleaningGame=dynamic(()=>import('./CleaningGame'),{ssr:false});
type ReceiptData=ReturnType<typeof publicOrder>;
export default function Receipt({token,initial,companyConfig}:{token:string;initial:ReceiptData;companyConfig:CompanyConfig}){
  const [order,setOrder]=useState(initial),[game,setGame]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
  const refresh=useCallback(async()=>{try{setOrder(await api<ReceiptData>('orders/'+token));setError('');}catch(e){setError((e as Error).message);}},[token]);
  useEffect(()=>{save('last-request',token);const timer=setInterval(()=>{if(!document.hidden)refresh();},15000);const visible=()=>{if(!document.hidden)refresh();};document.addEventListener('visibilitychange',visible);return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[token,refresh]);
  async function copy(){try{await navigator.clipboard.writeText(location.href);setCopied(true);}catch{setError('Скопируйте адрес страницы из строки браузера');}}
  return <div className="app"><PwaSetup/><header className="header"><a className="brand" href="/">{companyConfig.name}</a><a className="glass cart-button" href="/">К выбору мебели</a></header><main className="narrow page receipt" id="main-content"><span className={'status-circle '+order.status}>{order.status==='cancelled'?'×':'✓'}</span><h1>{order.status==='new'?'Заявка отправлена':statusLabels[order.status]}</h1><p className="muted">{order.status==='new'?'Скоро свяжемся, уточним цену и согласуем удобный день.':order.status==='scheduled'?'Ждём встречи. Если планы изменятся — позвоните нам.':order.status==='done'?'Спасибо, что доверили нам свою мебель.': 'Если чистка снова понадобится, можно оставить новую заявку.'}</p><span className="badge">{order.number}</span><div className="panel receipt-summary"><h2>Ваш заказ</h2>{order.items.map(i=><div className="row" key={i.id}><span>{itemTitle(i)}</span><span>{i.quantity} шт.{i.category==='other'?' · по фото':''}</span></div>)}<div className="row total"><span>{order.agreedPrice!==null?'Согласованная цена':order.estimate.total===null?'Стоимость чистки':order.estimate.pending?'Известная часть':'Предварительно'}</span><strong>{order.agreedPrice!==null?money(order.agreedPrice):order.estimate.total===null?'По фото':money(order.estimate.total)}</strong></div><div><span className="summary-label">{order.agreedDay?'Согласованный выезд':'Желаемый выезд'}</span><p>{order.agreedDay||preferredVisit(order.day,order.time)}</p></div><div><span className="summary-label">Адрес</span><p>{order.address}</p></div></div><ErrorMessage error={error}/>{error&&<button className="link" onClick={refresh}>Обновить заявку</button>}<Button secondary onClick={copy}>{copied?'Ссылка скопирована':'Скопировать приватную ссылку'}</Button><a className="button primary" href="/contacts">Связаться</a>
  {order.game!=='off'&&<div className="panel game-invite"><h2>Есть свободная минутка?</h2><Button secondary onClick={()=>setGame(!game)}>{game?'Закрыть игру':'Поиграть с диваном'}</Button>{game&&<CleaningGame token={token} onFinish={refresh} quotes={order.quotes}/>}</div>}
  {order.coupon&&<div className="panel coupon"><h2>{money(order.coupon.amount)} на следующий заказ</h2><strong>{order.coupon.code}</strong><p className="coupon-terms">Назовите код владельцу. Чистка от {money(order.coupon.minimum)}, выезд отдельно. До {new Date(order.coupon.expires).toLocaleDateString('ru-RU')}. Скидка не применяется к этой заявке.</p></div>}
  </main><CompanyFooter company={companyConfig}/></div>;
}
