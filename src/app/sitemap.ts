import type {MetadataRoute} from 'next';
export default function sitemap():MetadataRoute.Sitemap{const root=process.env.NEXT_PUBLIC_SITE_URL;if(!root||root.includes('127.0.0.1'))return [];return [{url:root,changeFrequency:'monthly'},{url:root+'/services',changeFrequency:'monthly'},{url:root+'/contacts',changeFrequency:'monthly'}];}
