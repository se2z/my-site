import {getConfig} from '@/lib/server';
import CompanyFooter from '@/components/CompanyFooter';
import {Icon} from '@/components/ui';
export const dynamic='force-dynamic';
export const metadata={title:'Авторы материалов'};
export default async function Credits(){const c=await getConfig();return <main className="article" id="main-content"><header className="article-header"><a className="brand" href="/">{c.name}</a><a className="services-back" href="/"><Icon name="back"/>К выбору мебели</a></header><h1>Авторы материалов</h1><p>Иконки Solar Bold — 480 Design, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. <a href="https://www.figma.com/community/file/1166831539721848736">Набор иконок</a>.</p><p>Исходная мебель — Innerscene, CC0. Лица, руки, матрас и приветствия доработаны для этого проекта в Blender.</p><p>Шрифты Onest и Space Grotesk — SIL Open Font License. Motion и liquid-glass-react — MIT. Three.js — MIT.</p><CompanyFooter company={c}/></main>;}
