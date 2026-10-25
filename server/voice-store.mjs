import {applyBottleAction} from '../mobile/src/care/bottleFlow.ts';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {validateRecord,mergeRecords} from '../mobile/src/domain/index.ts';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function voiceStore(path){
 const db=new DatabaseSync(path);db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
 CREATE TABLE IF NOT EXISTS voice_links(token TEXT PRIMARY KEY, owner TEXT NOT NULL, profile TEXT NOT NULL, label TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS display_links(token TEXT PRIMARY KEY, owner TEXT NOT NULL, profile TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS voice_chat_turns(owner TEXT,profile TEXT,fingerprint TEXT,turn TEXT,expires INTEGER,PRIMARY KEY(owner,profile,fingerprint));
 CREATE TABLE IF NOT EXISTS music_tracks(owner TEXT,profile TEXT,id TEXT,title TEXT,file TEXT,PRIMARY KEY(owner,profile,id));
 CREATE TABLE IF NOT EXISTS music_tickets(token TEXT PRIMARY KEY,owner TEXT,profile TEXT,track TEXT,expires INTEGER);
 CREATE TABLE IF NOT EXISTS voice_profiles(owner TEXT, profile TEXT, data TEXT NOT NULL, updated TEXT NOT NULL, PRIMARY KEY(owner,profile));
 CREATE TABLE IF NOT EXISTS voice_receipts(id TEXT PRIMARY KEY, owner TEXT, profile TEXT, request_key TEXT, receipt TEXT NOT NULL, acknowledged TEXT, UNIQUE(owner,profile,request_key));`);
 // A crash preserves the original utterance, but never claims the parse completed.
 for(const row of db.prepare('SELECT id,receipt FROM voice_receipts').all()) {const r=JSON.parse(row.receipt);if(r.status==='processing'){r.status='failed';r.reply='处理被中断，原话已保留，请在禾安里重试。';db.prepare('UPDATE voice_receipts SET receipt=? WHERE id=?').run(JSON.stringify(r),row.id);}}
 const list=(owner,profile)=>db.prepare('SELECT receipt,acknowledged FROM voice_receipts WHERE owner=? AND profile=? ORDER BY rowid').all(owner,profile).map(r=>({...JSON.parse(r.receipt),acknowledgedAt:r.acknowledged}));
 function profile(owner,key){const row=db.prepare('SELECT data,updated FROM voice_profiles WHERE owner=? AND profile=?').get(owner,key);return row?{data:JSON.parse(row.data),updated:row.updated}:null;}
 // SQLite is authoritative; the merged view is reused until this profile changes.
 const views=new Map(),versions=new Map();
 const cacheKey=(owner,key)=>JSON.stringify([owner,key]);
 function invalidate(owner,key){const k=cacheKey(owner,key);views.delete(k);versions.set(k,(versions.get(k)||0)+1);}
 function state(owner,key){const k=cacheKey(owner,key);if(views.has(k))return structuredClone(views.get(k));const current=profile(owner,key);if(!current)return null;let data=current.data,cloudUpdated=current.updated,pending=0;for(const r of list(owner,key)){if(r.status==='saved'&&(r.completedAt||r.capturedAt)>cloudUpdated)cloudUpdated=r.completedAt||r.capturedAt;if(r.acknowledgedAt||r.status!=='saved')continue;try {data=applyVoiceResult(data,r);pending++;}catch{ /* Phone version checks decide conflicts. */ }}const value={...current,data,cloudUpdated,pending};if(views.size>=100)views.delete(views.keys().next().value);views.set(k,value);return structuredClone(value);}
 function create(owner,key,requestKey,text){const previous=db.prepare('SELECT receipt FROM voice_receipts WHERE owner=? AND profile=? AND request_key=?').get(owner,key,requestKey);if(previous){const r=JSON.parse(previous.receipt);if(r.text!==text)throw Error('IDEMPOTENCY_CONFLICT');return {receipt:r,created:false};}const r={id:randomUUID(),profileKey:key,text,capturedAt:new Date().toISOString(),timezone:'Asia/Shanghai',status:'processing',records:[],reply:'原话已收到，正在处理。'};db.prepare('INSERT INTO voice_receipts(id,owner,profile,request_key,receipt) VALUES(?,?,?,?,?)').run(r.id,owner,key,requestKey,JSON.stringify(r));return {receipt:r,created:true};}
 function save(owner,key,r){db.prepare('UPDATE voice_receipts SET receipt=? WHERE id=? AND owner=? AND profile=?').run(JSON.stringify(r),r.id,owner,key);invalidate(owner,key);}
 function sync(owner,key,data,acks=[]){
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(key)||!Array.isArray(acks))throw Error('INVALID_SYNC');
  if(data!==undefined&&(!data||!Array.isArray(data.records)||data.records.length>20000||!data.records.every(validateRecord)||!data.profile||!data.settings))throw Error('INVALID_SYNC');
  const now=new Date().toISOString();let changed=false;
  db.exec('BEGIN IMMEDIATE');try{
   const old=db.prepare('SELECT data FROM voice_profiles WHERE owner=? AND profile=?').get(owner,key);
   if(data===undefined&&!old)throw Error('PROFILE_NOT_SYNCED');
   const serialized=data===undefined?old.data:JSON.stringify({...data,babyId:key});
   changed=!old||old.data!==serialized;
   if(changed)db.prepare('INSERT INTO voice_profiles VALUES(?,?,?,?) ON CONFLICT(owner,profile) DO UPDATE SET data=excluded.data,updated=excluded.updated').run(owner,key,serialized,now);
   else db.prepare('UPDATE voice_profiles SET updated=? WHERE owner=? AND profile=?').run(now,owner,key);
   const acknowledged=new Set(acks.filter(x=>typeof x==='string'));
   const pending=db.prepare('SELECT receipt FROM voice_receipts WHERE owner=? AND profile=? AND acknowledged IS NULL ORDER BY rowid').all(owner,key);
   for(const row of pending){const r=JSON.parse(row.receipt);if(!acknowledged.has(`${r.id}:${r.status}`)||r.status==='processing')continue;
    const conflicts=data?.voiceReceiptConflicts||(data===undefined?JSON.parse(serialized).voiceReceiptConflicts:[]);
    if(conflicts?.includes(r.id)){r.status='review';r.reply='手机中的原记录已改动，未覆盖，已保留原话等待核对。';db.prepare('UPDATE voice_receipts SET receipt=? WHERE id=?').run(JSON.stringify(r),r.id);}
    db.prepare('UPDATE voice_receipts SET acknowledged=? WHERE id=?').run(now,r.id);changed=true;
   }
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  // A five-second phone heartbeat does not invalidate all care summaries.
  if(changed)invalidate(owner,key);
  else {const view=views.get(cacheKey(owner,key));if(view){view.updated=now;if(now>view.cloudUpdated)view.cloudUpdated=now;}}
  return db.prepare('SELECT receipt FROM voice_receipts WHERE owner=? AND profile=? AND acknowledged IS NULL ORDER BY rowid LIMIT 100').all(owner,key).map(r=>({...JSON.parse(r.receipt),acknowledgedAt:null}));
 }

 return {profile,state,list,create,save,sync,lastPhoneSync:(owner,key)=>db.prepare('SELECT updated FROM voice_profiles WHERE owner=? AND profile=?').get(owner,key)?.updated,revision:(owner,key)=>versions.get(cacheKey(owner,key))||0,
  musicList(owner,key){return db.prepare('SELECT id,title FROM music_tracks WHERE owner=? AND profile=? ORDER BY id').all(owner,key);},
  musicTicket(owner,key,id){if(!db.prepare('SELECT id FROM music_tracks WHERE owner=? AND profile=? AND id=?').get(owner,key,id))throw Error('TRACK_NOT_FOUND');const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM music_tickets WHERE expires<?').run(Date.now());db.prepare('INSERT INTO music_tickets VALUES(?,?,?,?,?)').run(hash(token),owner,key,id,Date.now()+3600000);return token;},
  musicRead(token,id){return typeof token==='string'?db.prepare('SELECT m.file,m.title FROM music_tickets t JOIN music_tracks m ON t.owner=m.owner AND t.profile=m.profile AND t.track=m.id WHERE t.token=? AND t.track=? AND t.expires>?').get(hash(token),id,Date.now()):null;},
  chatTurn(owner,key,fingerprint){const now=Date.now();db.prepare('DELETE FROM voice_chat_turns WHERE expires<?').run(now);const old=db.prepare('SELECT turn FROM voice_chat_turns WHERE owner=? AND profile=? AND fingerprint=?').get(owner,key,fingerprint);if(old)return old.turn;const turn='chat-'+randomUUID();db.prepare('INSERT INTO voice_chat_turns VALUES(?,?,?,?,?)').run(owner,key,fingerprint,turn,now+120000);return turn;},
  pairDisplay(owner,key){if(!profile(owner,key))throw Error('PROFILE_NOT_SYNCED');const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO display_links VALUES(?,?,?)').run(hash(token),owner,key);return token;},
  identifyDisplay(token){return typeof token==='string'?db.prepare('SELECT owner,profile FROM display_links WHERE token=?').get(hash(token)):null;},
  pair(owner,key,label){if(!profile(owner,key))throw Error('PROFILE_NOT_SYNCED');const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO voice_links VALUES(?,?,?,?)').run(hash(token),owner,key,label.slice(0,80));return token;},
  identify(token){return typeof token==='string'?db.prepare('SELECT owner,profile,label FROM voice_links WHERE token=?').get(hash(token)):null;},
  close:()=>db.close()};
}
export function applyVoiceResult(data,r){
 const records=mergeRecords(data.records,r.records);
 if(r.sleepStart&&data.sleepStart&&data.sleepStart!==r.sleepStart)throw Error('SLEEP_ALREADY_RUNNING');
 if(r.nursingStart&&data.nursingSession&&JSON.stringify(data.nursingSession)!==JSON.stringify(r.nursingStart))throw Error('NURSING_ALREADY_RUNNING');
 const finishes=(kind,start,side)=>r.records.some(x=>x.kind===kind&&x.timePrecision!=='day'&&(!side||x.side===side)&&Math.abs(Date.parse(x.at)-(x.value||0)*60000-Date.parse(start))<60000);
 return applyBottleAction({...data,records,sleepStart:r.sleepStart||(data.sleepStart&&!finishes('sleep',data.sleepStart)?data.sleepStart:undefined),nursingSession:r.nursingStart||(data.nursingSession&&!finishes('nursing',data.nursingSession.at,data.nursingSession.side)?data.nursingSession:undefined)},r.bottleAction);
}
