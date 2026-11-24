import type { Metadata,Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
const onest=localFont({src:'../fonts/Onest.ttf',variable:'--font-onest',display:'swap'});
const space=localFont({src:'../fonts/SpaceGrotesk.ttf',variable:'--font-price',display:'swap'});
export const metadata:Metadata={title:{default:'мягко — выездная химчистка мебели',template:'%s · мягко'},description:'Рассчитайте чистку дивана, кресла, матраса или стула. Пришлите фото и удобный день — согласуем цену и выезд.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,statusBarStyle:'default',title:'мягко'},icons:{icon:'/icon.svg',apple:'/icon-192.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:[{media:'(prefers-color-scheme: light)',color:'#F5F7FB'},{media:'(prefers-color-scheme: dark)',color:'#14171A'}]};
const themeScript=`try{const t=JSON.parse(localStorage.getItem('myagko.v1.theme')||'null');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch{}`;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body className={`${onest.variable} ${space.variable}`}><a className="skip-link" href="#main-content">К содержимому</a>{children}</body></html>;}
