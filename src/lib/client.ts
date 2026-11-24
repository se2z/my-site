export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  let res:Response;try{res=await fetch('/api/'+path,{...options,signal:options.signal??controller.signal,headers:{...(options.body&&!(options.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...options.headers}});}catch{throw new Error('Не удалось связаться с сервером. Проверьте соединение и повторите.');}finally{clearTimeout(timer);}
  let data;try{data=await res.json();}catch{throw new Error('Сервис временно недоступен. Попробуйте ещё раз.');}if(!res.ok){if(res.status===401&&path.startsWith('admin/')&&path!=='admin/login')window.dispatchEvent(new Event('myagko:auth-expired'));throw new Error(data.error??'Не удалось выполнить запрос');}return data;
}
export const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export function load<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem('myagko.v1.'+key)??'null')??fallback;}catch{return fallback;}}
export function save(key:string,value:unknown){try{localStorage.setItem('myagko.v1.'+key,JSON.stringify(value));}catch{}}
