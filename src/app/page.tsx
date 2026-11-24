import CustomerApp from '@/components/CustomerApp';
import { getConfig } from '@/lib/server';
export const dynamic='force-dynamic';
export async function generateMetadata(){const c=await getConfig();return {title:{absolute:`${c.name} — химчистка мебели · ${c.city}`},description:`Выездная чистка диванов, кресел, матрасов и стульев. ${c.city}. Предварительный расчёт по тарифам, фото и заявка на удобный день.`};}
export default async function Page(){return <CustomerApp config={await getConfig()}/>;}
