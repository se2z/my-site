import {getConfig} from '@/lib/server';
import {money,variants} from '@/lib/domain';
import CompanyFooter from '@/components/CompanyFooter';
import {Icon} from '@/components/ui';
export const dynamic='force-dynamic';
export const metadata={title:'Услуги химчистки мебели'};
export default async function Services(){
  const c=await getConfig();
  const services=[
    {category:'sofa' as const,title:'Диваны',text:'От любимого двухместного до большого углового. Выберите размер — стоимость появится в расчёте.',price:c.rates['sofa.two'],action:'Выбрать диван'},
    {category:'armchair' as const,title:'Кресла',text:'Для уютных вечеров. Обычные кресла и реклайнеры.',price:c.rates['armchair.standard'],action:'Выбрать кресло'},
    {category:'mattress' as const,title:'Матрасы',text:'Односпальные и двуспальные. С одной или двух сторон.',price:c.rates['mattress.single'],action:'Выбрать матрас'},
    {category:'chair' as const,title:'Стулья',text:'Мягкие сиденья и спинки. Можно заказать сразу несколько.',price:c.rates['chair.seat'],action:'Выбрать стул'}
  ];
  const catalogue=services.map(s=>{const variant=variants[s.category].reduce((best,v)=>c.rates[s.category+'.'+v.id]<c.rates[s.category+'.'+best.id]?v:best).id;return {...s,variant,price:c.rates[s.category+'.'+variant]};});
  return <div className="app services-page">
    <header className="header services-header"><a className="brand" href="/">{c.name}</a><a className="services-back" href="/"><Icon name="back"/>К выбору мебели</a></header>
    <main id="main-content">
      <section className="services-intro"><h1>Чистка для мебели,<br/>которую любите.</h1><p>Приезжаем к вам домой. {c.area||c.city}.</p></section>
      <section className="service-catalog" aria-label="Выберите услугу">
        {catalogue.map((s,i)=><a className={'service-card '+(i===0?'service-featured':'')} href={'/?category='+s.category+'&variant='+s.variant} key={s.category}>
          <div className="service-picture"><img src={'/posters/'+s.category+'-clean-front.webp'} alt="" width={800} height={600} loading={i===0?'eager':'lazy'}/></div>
          <div className="service-card-content"><h2>{s.title}</h2><p>{s.text}</p><div className="service-card-action"><strong className="price">От {money(s.price)}</strong><span>{s.action}<Icon name="arrow"/></span></div></div>
        </a>)}
      </section>
      <a className="service-other" href="/?category=other"><span className="service-other-icon"><Icon name="other"/></span><div><h2>А если это что-то другое?</h2><p>Пуф, изголовье или другая мягкая мебель — оценим по фото.</p></div><Icon name="arrow"/></a>
      <div className="services-details">
        <section className="service-process" id="how"><h2>От расчёта до чистки</h2><ol><li><div><h3>Выберите мебель</h3><p>Добавьте всё, что нужно почистить, в один заказ.</p></div></li><li><div><h3>Отправьте заявку</h3><p>Укажите адрес, контакт и удобные дату и время. Можно приложить фото.</p></div></li><li><div><h3>Согласуем выезд</h3><p>Свяжемся с вами, уточним итоговую цену и время.</p></div></li></ol></section>
        <section className="service-conditions panel"><h2>Условия выезда</h2><div className="row"><span>Минимальный заказ</span><strong className="price">{money(c.minimum)}</strong></div><div className="row"><span>Выезд за город</span><strong className="price">От {money(c.travel)}</strong></div><p>Укажите удобные дату и время в заявке. Подтвердим выезд по телефону.</p><a className="button primary" href="/">Рассчитать стоимость<Icon name="arrow"/></a></section>
      </div>
    </main>
    <CompanyFooter company={c}/>
  </div>;
}
