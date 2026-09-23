export type BabyIndex={version:1;active:string;ids:string[]};
type Store={getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<void>};
export function babyKey(id:string,kind:'data'|'chat'|'creations'){if(!/^[a-zA-Z0-9-]+$/.test(id))throw Error('INVALID_BABY_ID');return `baby-ai:baby:${id}:${kind}:v1`}
const indexKey='baby-ai:babies:v1';
export function createBabyRepository(store:Store){
 async function loadIndex():Promise<BabyIndex>{const raw=await store.getItem(indexKey);if(raw){const v=JSON.parse(raw);if(v.version!==1||!Array.isArray(v.ids)||!v.ids.length||new Set(v.ids).size!==v.ids.length||!v.ids.includes(v.active))throw Error('INVALID_BABY_INDEX');v.ids.forEach((id:string)=>babyKey(id,'data'));return v;}
  for(const [kind,old] of [['data','baby-ai:v1'],['chat','baby-ai:conversation:v1'],['creations','baby-ai:creations:v1']] as const){const value=await store.getItem(old);if(value!==null)await store.setItem(babyKey('legacy',kind),value);}
  const index:BabyIndex={version:1,active:'legacy',ids:['legacy']};await store.setItem(indexKey,JSON.stringify(index));return index;
 }
 async function activate(id:string){const v=await loadIndex();if(!v.ids.includes(id))throw Error('UNKNOWN_BABY');const next={...v,active:id};await store.setItem(indexKey,JSON.stringify(next));return next;}
 async function add(id:string){babyKey(id,'data');const v=await loadIndex();if(v.ids.includes(id))throw Error('DUPLICATE_BABY');const next={...v,ids:[...v.ids,id],active:id};await store.setItem(indexKey,JSON.stringify(next));return next;}
 return {loadIndex,activate,add};
}
