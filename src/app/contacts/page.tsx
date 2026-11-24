import {getConfig} from '@/lib/server';
import {contactDetails} from '@/lib/domain';
import CompanyFooter from '@/components/CompanyFooter';
import {Icon} from '@/components/ui';

export const dynamic='force-dynamic';
export const metadata={title:'Контакты'};
export default async function Contacts(){
  const company=await getConfig(),contacts=contactDetails(company);
  return <div className="app contacts-page">
    <header className="header"><a className="brand" href="/">{company.name}</a><a className="services-back" href="/"><Icon name="back"/>К выбору мебели</a></header>
    <main className="narrow page" id="main-content">
      <div className="order-heading"><span className="eyebrow">{company.area||company.city}</span><h1>Будем на связи.</h1></div>
      {contacts.phone||contacts.email?<section className="panel contact-card"><h2>Обсудим вашу мебель</h2><p className="muted">Поможем с расчётом и подберём удобное время выезда.</p>{contacts.phone&&<a className="contact-option" href={'tel:'+contacts.phone.replace(/[^+\d]/g,'')}><span>Позвонить<strong>{contacts.phone}</strong></span><Icon name="arrow"/></a>}{contacts.email&&<a className="contact-option" href={'mailto:'+contacts.email}><span>Написать на почту<strong>{contacts.email}</strong></span><Icon name="arrow"/></a>}</section>:<section className="panel contact-card"><h2>Контакты появятся здесь</h2><p className="muted">Это демоверсия. Компания добавит телефон и почту перед запуском. А расчёт и оформление заявки уже можно попробовать.</p></section>}
      <a className="button primary" href="/">Рассчитать чистку<Icon name="arrow"/></a>
    </main>
    <CompanyFooter company={company}/>
  </div>;
}
