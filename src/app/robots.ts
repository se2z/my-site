import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:['/','/services'],disallow:['/admin','/api/','/request/']},sitemap:process.env.NEXT_PUBLIC_SITE_URL?process.env.NEXT_PUBLIC_SITE_URL+'/sitemap.xml':undefined};}
