import 'server-only';
import { mkdirSync,readFileSync,writeFileSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';

const folder=join(process.cwd(),'data');
type Globals=typeof globalThis & {myagkoSqlite?:DatabaseSync;myagkoPool?:Pool;myagkoReady?:Promise<void>};
const state=globalThis as Globals;
export function secrets(){
  if(process.env.VERCEL&&(!process.env.DATABASE_URL||!process.env.SESSION_SECRET||!process.env.OWNER_PASSWORD))throw new Error('Для публикации настройте DATABASE_URL, SESSION_SECRET и OWNER_PASSWORD');
  if(process.env.SESSION_SECRET&&process.env.OWNER_PASSWORD)return {secret:process.env.SESSION_SECRET,password:process.env.OWNER_PASSWORD};
  if(process.env.NODE_ENV==='production'&&process.env.DATABASE_URL)throw new Error('Не настроен доступ владельца');
  mkdirSync(folder,{recursive:true});const path=join(folder,'local-access.json');
  if(!existsSync(path))writeFileSync(path,JSON.stringify({secret:randomBytes(32).toString('hex'),password:randomBytes(12).toString('base64url')},null,2),{mode:0o600});
  return JSON.parse(readFileSync(path,'utf8')) as {secret:string;password:string};
}
async function ready(){
  secrets();
  if(process.env.DATABASE_URL){
    state.myagkoPool??=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:20000,connectionTimeoutMillis:10000});
    state.myagkoReady??=state.myagkoPool.query(`CREATE TABLE IF NOT EXISTS myagko_records(key text PRIMARY KEY,value text NOT NULL); CREATE TABLE IF NOT EXISTS myagko_orders(id text PRIMARY KEY,idem text UNIQUE NOT NULL,token_hash text UNIQUE NOT NULL,data text NOT NULL); CREATE TABLE IF NOT EXISTS myagko_photos(id text PRIMARY KEY,draft_hash text NOT NULL,mime text NOT NULL,data text NOT NULL,created_at bigint NOT NULL); CREATE INDEX IF NOT EXISTS myagko_photos_draft ON myagko_photos(draft_hash); ALTER TABLE myagko_records ENABLE ROW LEVEL SECURITY; ALTER TABLE myagko_orders ENABLE ROW LEVEL SECURITY; ALTER TABLE myagko_photos ENABLE ROW LEVEL SECURITY; REVOKE ALL ON myagko_records,myagko_orders,myagko_photos FROM PUBLIC;`).then(()=>{});
    await state.myagkoReady;
  }else{
    if(!state.myagkoSqlite){mkdirSync(folder,{recursive:true});state.myagkoSqlite=new DatabaseSync(join(folder,'myagko.sqlite'));state.myagkoSqlite.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS myagko_records(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS myagko_orders(id TEXT PRIMARY KEY,idem TEXT UNIQUE NOT NULL,token_hash TEXT UNIQUE NOT NULL,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS myagko_photos(id TEXT PRIMARY KEY,draft_hash TEXT NOT NULL,mime TEXT NOT NULL,data TEXT NOT NULL,created_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS myagko_photos_draft ON myagko_photos(draft_hash);`);}
  }
}
export async function query<T extends Record<string,unknown>>(sql:string,params:(string|number)[]=[]):Promise<T[]>{
  await ready();if(state.myagkoPool)return (await state.myagkoPool.query(sql,params)).rows as T[];
  const stmt=state.myagkoSqlite!.prepare(sql.replace(/\$\d+/g,'?'));
  if(/^\s*(SELECT|.*RETURNING)/is.test(sql))return stmt.all(...params) as T[];
  stmt.run(...params);return [];
}
export async function readRecord<T>(key:string,fallback:T):Promise<T>{const rows=await query<{value:string}>('SELECT value FROM myagko_records WHERE key=$1',[key]);return rows.length?JSON.parse(rows[0].value):fallback;}
export async function writeRecord(key:string,value:unknown){await query('INSERT INTO myagko_records(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value',[key,JSON.stringify(value)]);}
