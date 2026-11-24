'use client';
import {contactDetails,type CompanyConfig} from '@/lib/domain';
import {InstallButton,ThemeToggle} from './ui';
export default function CompanyFooter({company,receiptToken}:{company:Pick<CompanyConfig,'name'|'phone'|'email'|'city'>;receiptToken?:string}){
  const contacts=contactDetails(company);
  return <footer className="site-footer">
    <div className="footer-contact-row"><div className="footer-identity"><a className="footer-wordmark" href="/">{company.name}</a><span>{company.city}</span></div><a className="footer-phone" href={contacts.phone?`tel:${contacts.phone.replace(/[^+\d]/g,'')}`:'/contacts'}>{contacts.phone||'Связаться'}</a></div>
    <nav className="footer-navigation" aria-label="Информация"><a href="/services">Услуги</a>{receiptToken&&<a href={'/request/'+receiptToken}>Моя заявка</a>}<a href="/privacy">Конфиденциальность</a><a href="/credits">Авторы</a><a href="/admin">Кабинет</a></nav>
    <div className="footer-appearance"><ThemeToggle/><InstallButton/></div>
  </footer>;
}
