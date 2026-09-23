import {SavedPoster} from './historyKey';
const db=()=>new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('hean-report-history',1);r.onupgradeneeded=()=>r.result.createObjectStore('posters');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
async function run(mode:IDBTransactionMode,op:(s:IDBObjectStore)=>IDBRequest){const d=await db();return new Promise<any>((resolve,reject)=>{const t=d.transaction('posters',mode),r=op(t.objectStore('posters'));t.oncomplete=()=>{d.close();resolve(r.result)};t.onerror=t.onabort=()=>{d.close();reject(t.error||new Error('POSTER_STORAGE_FAILED'))}})}
export async function readPoster(key:string):Promise<SavedPoster|null>{return await run('readonly',s=>s.get(key))||null}
export async function writePoster(key:string,value:SavedPoster){await run('readwrite',s=>s.put(value,key))}
