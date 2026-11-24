import Receipt from '@/components/Receipt';
import {getConfig,getOrder,publicOrder} from '@/lib/server';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'Ваша заявка',robots:{index:false,follow:false}};
export default async function RequestPage({params}:{params:Promise<{token:string}>}){const {token}=await params;try{const [order,company]=await Promise.all([getOrder(token),getConfig()]);return <Receipt token={token} initial={publicOrder(order)} companyConfig={company}/>;}catch{notFound();}}
