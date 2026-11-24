'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {categories,estimate,itemTitle,labels,money,unitPrice,variants,type CartItem,type Category,type CompanyConfig} from '@/lib/domain';
import {api,load,randomToken,save} from '@/lib/client';
import Stage from './Stage';
import CompanyFooter from './CompanyFooter';
import {Button,ErrorMessage,Field,Icon,PwaSetup,Stepper} from './ui';
type Photo={key:string;name:string;id?:string;preview:string;state:'uploading'|'ready'|'error';error?:string;file?:File};
type Draft={name:string;phone:string;address:string;day:string;time:string;comment:string;outside:boolean;consent:boolean};
const empty:Draft={name:'',phone:'',address:'',day:'',time:'',comment:'',outside:false,consent:false};
const defaultVariant=(category:Category)=>category==='sofa'?'three':variants[category][0]?.id??'';
async function photoFile(file:File){
  if(file.size>20000000)throw new Error('Выберите фотографию до 20 МБ');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Выберите JPEG, PNG или WebP');
  let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error('Не удалось прочитать фото. Выберите другой JPEG, PNG или WebP.');}const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Не удалось прочитать фото')),'image/jpeg',.8));
  return new File([blob],file.name,{type:'image/jpeg'});
}
export default function CustomerApp({config}:{config:CompanyConfig}){
  const [view,setView]=useState<'choose'|'cart'|'request'>('choose'),[category,setCategory]=useState<Category>('sofa'),[variant,setVariant]=useState('three'),[quantity,setQuantity]=useState(1),[dirt,setDirt]=useState(false),[bothSides,setBothSides]=useState(false),[description,setDescription]=useState('');
  const [cart,setCart]=useState<CartItem[]>([]),[editing,setEditing]=useState<string|null>(null),[removed,setRemoved]=useState<{item:CartItem;index:number}|null>(null),[draft,setDraft]=useState(empty),[photos,setPhotos]=useState<Photo[]>([]),[draftKey,setDraftKey]=useState(''),[idem,setIdem]=useState(''),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[last,setLast]=useState('');
  const reduced=useReducedMotion();
  useEffect(()=>{setCart(load('cart',[]));setDraft({...empty,...load('draft',empty)});setPhotos(load<Photo[]>('photos',[]));const key=load('draft-key','')||randomToken(),id=load('idem','')||crypto.randomUUID();setDraftKey(key);setIdem(id);save('draft-key',key);save('idem',id);setLast(load('last-request',''));setLoaded(true);},[]);
  useEffect(()=>{if(loaded){save('cart',cart);save('draft',draft);save('photos',photos.filter(p=>p.state==='ready').map(({file,...p})=>p));}},[cart,draft,photos,loaded]);
  function navigate(next:typeof view,selection={category,variant}){setView(next);history.pushState({},'',next==='choose'?'/?'+new URLSearchParams({category:selection.category,...(selection.variant?{variant:selection.variant}:{})}):'/?step='+next);setError('');setNotice('');window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});}
  useEffect(()=>{const restore=()=>{const params=new URLSearchParams(location.search),step=params.get('step');setView(step==='cart'||step==='request'?step:'choose');if(step!=='cart'&&step!=='request'){const requested=params.get('category'),c=requested&&categories.includes(requested as Category)?requested as Category:'sofa',v=params.get('variant');setCategory(c);setVariant(v&&variants[c].some(option=>option.id===v)?v:defaultVariant(c));}};restore();window.addEventListener('popstate',restore);return ()=>window.removeEventListener('popstate',restore);},[]);
  useEffect(()=>{if(loaded&&view==='request'&&cart.length===0){setView('cart');history.replaceState({},'','/?step=cart');}},[loaded,view,cart.length]);
  function syncSelection(c:Category,v:string){history.replaceState({},'','/?'+new URLSearchParams({category:c,...(v?{variant:v}:{})}));}
  function choose(c:Category){if(c===category)return;const v=defaultVariant(c);setCategory(c);setVariant(v);setQuantity(1);setDirt(false);setBothSides(false);setDescription('');setError('');syncSelection(c,v);}
  function chooseVariant(v:string){setVariant(v);syncSelection(category,v);}
  const current:CartItem={id:editing??'temporary',category,variant,quantity,dirt,bothSides,description};const price=unitPrice(current,config);const total=estimate(cart,config,draft.outside);
  function add(){
    if(category==='other'&&description.trim().length<3){setError('Напишите, какую мебель нужно почистить');return;}
    const item={...current,id:editing??crypto.randomUUID(),description:description.trim()};
    if(!editing){const same=cart.find(i=>i.category===item.category&&i.variant===item.variant&&i.dirt===item.dirt&&i.bothSides===item.bothSides&&i.description===item.description);if(same&&same.quantity+item.quantity>20){setError('В одной позиции можно указать до 20 предметов');return;}if(!same&&cart.length>=20){setError('Можно добавить до 20 разных позиций');return;}}
    setCart(items=>{if(editing)return items.map(i=>i.id===editing?item:i);const same=items.find(i=>i.category===item.category&&i.variant===item.variant&&i.dirt===item.dirt&&i.bothSides===item.bothSides&&i.description===item.description);if(same){const q=same.quantity+item.quantity;if(q>20){setError('В одной позиции можно указать до 20 предметов');return items;}return items.map(i=>i.id===same.id?{...i,quantity:q}:i);}return [...items,item];});
    setEditing(null);navigate('cart');
  }
  function edit(item:CartItem){setCategory(item.category);setVariant(item.variant);setQuantity(item.quantity);setDirt(item.dirt);setBothSides(item.bothSides);setDescription(item.description);setEditing(item.id);navigate('choose',item);}
  function remove(item:CartItem,index:number){setRemoved({item,index});setCart(items=>items.filter(i=>i.id!==item.id));}
  function undo(){if(removed){setCart(items=>{const next=[...items];next.splice(removed.index,0,removed.item);return next;});setRemoved(null);}}
  async function upload(photo:Photo){
    setPhotos(items=>items.map(p=>p.key===photo.key?{...p,state:'uploading',error:''}:p));
    try{if(!photo.file)throw new Error('Выберите это фото ещё раз');const file=await photoFile(photo.file);const form=new FormData();form.append('file',file);form.append('draft',draftKey);form.append('id',photo.key);const result=await api<{id:string}>('uploads',{method:'POST',body:form});const bitmap=await createImageBitmap(file);const thumb=document.createElement('canvas');const factor=Math.min(1,320/Math.max(bitmap.width,bitmap.height));thumb.width=Math.round(bitmap.width*factor);thumb.height=Math.round(bitmap.height*factor);thumb.getContext('2d')!.drawImage(bitmap,0,0,thumb.width,thumb.height);bitmap.close();const preview=thumb.toDataURL('image/jpeg',.65);URL.revokeObjectURL(photo.preview);setPhotos(items=>items.map(p=>p.key===photo.key?{...p,id:result.id,preview,state:'ready'}:p));}
    catch(e){setPhotos(items=>items.map(p=>p.key===photo.key?{...p,state:'error',error:(e as Error).message}:p));}
  }
  async function addPhotos(files:FileList|null){if(!files)return;const incoming=[...files].slice(0,3-photos.length);if(files.length>3-photos.length)setError('Можно добавить до 3 фотографий');for(const file of incoming){const photo:Photo={key:crypto.randomUUID(),name:file.name,preview:URL.createObjectURL(file),state:'uploading',file};setPhotos(items=>[...items,photo]);await upload(photo);}}
  async function removePhoto(photo:Photo){if(photo.id){try{await api('uploads/'+photo.id,{method:'DELETE',headers:{'x-draft-token':draftKey}});}catch(e){setError((e as Error).message);return;}}URL.revokeObjectURL(photo.preview);setPhotos(items=>items.filter(p=>p.key!==photo.key));}
  async function submit(e:React.FormEvent){e.preventDefault();setError('');if(photos.some(p=>p.state!=='ready')){setError('Дождитесь фотографий или повторите их загрузку');return;}setBusy(true);try{const result=await api<{token:string}>('orders',{method:'POST',body:JSON.stringify({...draft,idem,draft:draftKey,items:cart,photos:photos.map(p=>p.id)})});save('last-request',result.token);save('cart',[]);save('draft',empty);save('photos',[]);save('idem',null);save('draft-key',null);window.location.assign('/request/'+result.token);}catch(e){setError((e as Error).message);setBusy(false);}}
  function update<K extends keyof Draft>(key:K,value:Draft[K]){setDraft(d=>({...d,[key]:value}));}
  const summary=<div className="panel price-summary">{total.total!==null&&<div className="row"><span>Чистка по тарифам</span><span>{money(total.subtotal)}</span></div>}{total.minimumTopup>0&&<div className="row muted"><span>Доплата до минимума</span><span>{money(total.minimumTopup)}</span></div>}<div className="row"><span>Выезд{draft.outside?' за город':' по городу'}</span><span>{total.travel?money(total.travel):'Бесплатно'}</span></div>{total.pending&&total.total!==null&&<div className="row muted"><span>Нестандартная мебель</span><span>По фото</span></div>}<div className="row total"><span>{total.total===null?'Стоимость чистки':total.pending?'Известная часть':'Предварительно'}</span><strong className={total.total===null?'':'price'}>{total.total===null?'По фото':money(total.total)}</strong></div></div>;
  return <div className="app" style={{'--accent':config.accent} as CSSProperties}><PwaSetup/><header className="header"><a className="brand" href="/">{config.name}</a><nav className="desktop-nav"><a href="/services">Услуги</a><a href="/services#how">Как это работает</a><a href="/contacts">Связаться</a></nav><button className="glass cart-button" onClick={()=>navigate('cart')}><Icon name="cart"/>Заказ{cart.length>0&&<span className="counter">{cart.reduce((s,i)=>s+i.quantity,0)}</span>}</button></header>
    <main id="main-content">
      {view==='choose'&&<><div className="intro"><h1>Любимая мебель.<br/>Снова свежая.</h1><p>Выберите мебель — рассчитаем чистку.</p></div><div className="hero-grid"><section className="stage" aria-label="Выбор мебели"><Stage category={category} character={config.character} quotes={config.quotes}/>{category!=='other'&&<p className="rotation-hint">Потяните, чтобы повернуть</p>}<div className="category-dock glass" role="tablist" aria-label="Тип мебели">{categories.map(c=><button key={c} role="tab" aria-selected={category===c} onClick={()=>choose(c)}>{category===c&&<motion.span className="selected-category" layoutId="category" transition={{type:'spring',bounce:0,duration:reduced?0:.4}}/>}<span className="category-content"><Icon name={c}/><span>{labels[c]}</span></span></button>)}</div></section>
      <section className="configuration"><div className="panel"><h2>{category==='other'?'Что будем чистить?':labels[category]}</h2><div className="configuration-fields">{category==='other'?<Field label="Предмет мебели"><textarea rows={3} placeholder="Например, пуф или изголовье кровати" value={description} maxLength={500} onChange={e=>setDescription(e.target.value)}/></Field>:<div className="segments" role="group" aria-label="Вариант мебели">{variants[category].map(v=><button key={v.id} aria-pressed={variant===v.id} onClick={()=>chooseVariant(v.id)}>{v.label}</button>)}</div>}
      {category!=='other'&&<label className="check-row">Сильные загрязнения <input type="checkbox" checked={dirt} onChange={e=>setDirt(e.target.checked)}/></label>}{category==='mattress'&&<label className="check-row">С двух сторон <input type="checkbox" checked={bothSides} onChange={e=>setBothSides(e.target.checked)}/></label>}<div className="row quantity"><span>Количество</span><Stepper value={quantity} onChange={setQuantity}/></div></div>
      <div className="configuration-action"><div className="row preview-price"><span className="muted">{category==='other'?'Стоимость':'Предварительно'}</span><strong className={price===null?'':'price'}>{price===null?'По фото':money(price*quantity)}</strong></div><ErrorMessage error={error}/><Button onClick={add}>{editing?'Сохранить изменения':'Добавить в заказ'}<Icon name="arrow"/></Button>{editing&&<button className="link" onClick={()=>{setEditing(null);navigate('cart');}}>Отмена</button>}</div></div></section></div>
      </>}
      {view==='cart'&&<section className="order-page page">
        <button className="back" onClick={()=>navigate('choose')}><Icon name="back"/>К выбору мебели</button>
        <div className="order-heading"><span className="eyebrow">Ваш заказ</span><h1>Всё, что освежим.</h1></div>
        {cart.length===0?<div className="panel empty"><Icon name="cart"/><h2>В заказе пока пусто</h2><p>Выберите мебель, которой нужна чистка.</p><Button onClick={()=>navigate('choose')}>Выбрать мебель</Button></div>:<div className="order-layout">
          <div className="cart-content"><div className="cart-list">{cart.map((item,index)=>{const p=unitPrice(item,config);return <article className="cart-item" key={item.id}>
            <div className="cart-item-heading"><span className="cart-item-icon"><Icon name={item.category}/></span><div><h2>{itemTitle(item)}</h2>{(item.dirt||item.bothSides)&&<p className="item-parameters">{[item.dirt?'Сильные загрязнения':'',item.bothSides?'С двух сторон':''].filter(Boolean).join(' · ')}</p>}</div><strong className={p===null?'':'price'}>{p===null?'По фото':money(p*item.quantity)}</strong></div>
            <div className="cart-item-controls"><Stepper value={item.quantity} onChange={quantity=>setCart(items=>items.map(i=>i.id===item.id?{...i,quantity}:i))}/><div className="item-actions"><button className="link" onClick={()=>edit(item)}>Изменить</button><button className="link danger" onClick={()=>remove(item,index)}>Удалить</button></div></div>
          </article>;})}</div><Button secondary onClick={()=>{setEditing(null);navigate('choose');}}><Icon name="plus"/>Добавить мебель</Button></div>
          <aside className="order-summary"><h2>Стоимость заказа</h2>{summary}<Button onClick={()=>navigate('request')}>Оформить заявку<Icon name="arrow"/></Button><p className="order-note">Итоговую цену и время подтвердим по телефону.</p></aside>
        </div>}
        {removed&&<div className="undo" role="status">Предмет удалён <button className="link" onClick={undo}>Вернуть</button></div>}
      </section>}
      {view==='request'&&<section className="order-page page">
        <button className="back" onClick={()=>navigate('cart')}><Icon name="back"/>Ваш заказ</button>
        <div className="order-heading"><span className="eyebrow">Оформление</span><h1>Куда и когда приехать?</h1></div>
        <form onSubmit={submit} className="checkout request-form">
          <div className="request-fields">
            <section className="checkout-block" aria-labelledby="contact-heading"><h2 id="contact-heading">Как с вами связаться</h2><div className="field-pair">
              <Field label="Ваше имя"><input name="name" required minLength={2} autoComplete="name" value={draft.name} maxLength={60} onChange={e=>update('name',e.target.value)} placeholder="Как к вам обращаться"/></Field>
              <Field label="Телефон"><input name="phone" required type="tel" autoComplete="tel" inputMode="tel" value={draft.phone} onChange={e=>update('phone',e.target.value)} placeholder="+7 (___) ___-__-__"/></Field>
            </div></section>
            <section className="checkout-block" aria-labelledby="address-heading"><h2 id="address-heading">Адрес выезда</h2>
              <Field label="Улица, дом и квартира"><input name="address" required minLength={5} autoComplete="street-address" value={draft.address} maxLength={250} onChange={e=>update('address',e.target.value)} placeholder={`${config.city}, улица, дом, квартира`}/></Field>
              <label className="address-outside"><input name="outside" type="checkbox" checked={draft.outside} onChange={e=>update('outside',e.target.checked)}/><span>За пределами города</span><span className="muted">+{money(config.travel)}</span></label>
            </section>
            <section className="checkout-block" aria-labelledby="visit-heading"><h2 id="visit-heading">Когда вам удобно</h2><div className="field-pair visit-fields">
              <Field label="Желаемая дата"><input name="day" type="date" required={!!draft.time} value={draft.day} min={new Date().toLocaleDateString('en-CA')} onInput={e=>update('day',e.currentTarget.value)} onChange={e=>update('day',e.target.value)}/></Field>
              <Field label="Желаемое время"><input name="time" type="time" value={draft.time} onInput={e=>update('time',e.currentTarget.value)} onChange={e=>update('time',e.target.value)}/></Field>
            </div><p className="section-note">Дату и время подтвердим по телефону. Если не выбрали — подберём вместе.</p></section>
            <section className="checkout-block photo-panel" aria-labelledby="photos-heading"><div className="row"><h2 id="photos-heading">Фото и пожелания</h2><span className="photo-count">{photos.length} / 3</span></div>
              <div className="photo-list">{photos.map(photo=><div className="photo-item" key={photo.key}><img src={photo.preview} alt="Прикреплённая мебель" width={64} height={64}/><div><p>{photo.name}</p><small className={photo.state==='error'?'danger':'muted'}>{photo.state==='uploading'?'Загружается…':photo.state==='error'?photo.error:'Готово'}</small></div><div className="item-actions">{photo.state==='error'&&<button type="button" className="link" onClick={()=>upload(photo)}>Повторить</button>}<button type="button" disabled={photo.state==='uploading'} className="link" onClick={()=>removePhoto(photo)}>Удалить</button></div></div>)}</div>
              {photos.length<3&&<label className="upload-button"><Icon name="plus"/><span>Добавить фото</span><span className="upload-formats">JPG, PNG, WebP</span><input name="photos" aria-label="Добавить фотографии мебели" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{addPhotos(e.target.files);e.target.value='';}}/></label>}
              {cart.some(i=>i.category==='other')&&<p className="section-note">Для нестандартной мебели добавьте хотя бы одно фото.</p>}
              <Field label="Комментарий · необязательно"><textarea name="comment" rows={3} value={draft.comment} maxLength={1000} onChange={e=>update('comment',e.target.value)} placeholder="Пятна, особенности мебели, как найти подъезд…"/></Field>
            </section>
          </div>
          <aside className="order-summary checkout-summary"><div className="row"><h2>Ваш заказ</h2><button type="button" className="link" onClick={()=>navigate('cart')}>Изменить</button></div><div className="checkout-items">{cart.map(item=><div className="checkout-item" key={item.id}><Icon name={item.category}/><span>{itemTitle(item)}</span><span className="muted">×{item.quantity}</span></div>)}</div>{summary}
            <label className="consent"><input name="consent" type="checkbox" required checked={draft.consent} onChange={e=>update('consent',e.target.checked)}/><span>Согласен на <a href="/privacy" target="_blank" rel="noopener noreferrer">обработку персональных данных</a> для ответа на заявку.</span></label>
            <ErrorMessage error={error}/><Button type="submit" disabled={busy||photos.some(p=>p.state==='uploading')}>{busy?'Отправляем…':'Отправить заявку'}{!busy&&<Icon name="arrow"/>}</Button>
            <p className="order-note" role="status">{busy?'Сохраняем заявку…':'Без оплаты в приложении.'}</p>
          </aside>
        </form>
      </section>}
    </main><CompanyFooter company={config} receiptToken={last}/></div>;
}
