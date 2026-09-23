import {uid} from './domain';
const db=()=>new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('baby-ai-creations',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function run(mode:IDBTransactionMode,op:(s:IDBObjectStore)=>IDBRequest){const d=await db();return new Promise<any>((resolve,reject)=>{const t=d.transaction('photos',mode);const r=op(t.objectStore('photos'));t.oncomplete=()=>{d.close();resolve(r.result)};t.onerror=()=>{d.close();reject(t.error)};});}
export async function keepPhoto(uri:string){const id=uid();const blob=await(await fetch(uri)).blob();await run('readwrite',s=>s.put(blob,id));return id;}
export async function photoURI(id:string){const b=await run('readonly',s=>s.get(id));if(!b)throw new Error('PHOTO_MISSING');return URL.createObjectURL(b);}
export async function photoData(id:string){const b=await run('readonly',s=>s.get(id));return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(b);});}
export async function savePhoto(id:string){const u=await photoURI(id),a=document.createElement('a');a.href=u;a.download='Baby-AI-'+id+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
