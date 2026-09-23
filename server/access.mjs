import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function accessStore(path){
 const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY, token TEXT UNIQUE, created INTEGER); CREATE TABLE IF NOT EXISTS quota(k TEXT PRIMARY KEY, n INTEGER);');
 function take(key,max){const n=db.prepare('INSERT INTO quota(k,n) VALUES(?,1) ON CONFLICT(k) DO UPDATE SET n=n+1 RETURNING n').get(key).n;return n<=max;}
 function register(ip){const day=new Date().toISOString().slice(0,10);if(!take(`register:${day}:${hash(ip)}`,5)||!take(`register:${day}:all`,50))return null;const token=randomBytes(32).toString('hex'),id=randomUUID();db.prepare('INSERT INTO devices VALUES(?,?,?)').run(id,hash(token),Date.now());return {token,id};}
 function identify(token){return typeof token==='string'?db.prepare('SELECT id FROM devices WHERE token=?').get(hash(token))?.id:null;}
 function quota(id,image){const day=new Date().toISOString().slice(0,10);return take(`${day}:${image?'image':'chat'}:${id}`,image?5:200)&&take(`${day}:${image?'image':'chat'}:all`,image?30:2000);}
 return {register,identify,quota,close:()=>db.close()};
}
