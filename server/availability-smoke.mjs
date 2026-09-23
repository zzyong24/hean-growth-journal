// Explicit live-provider smoke, synthetic records only; never writes a user's data.
import assert from 'node:assert/strict';
import {createServer} from './index.mjs';
const originalKey=process.env.DUDU_API_KEY,originalURL=process.env.DUDU_BASE_URL;
delete process.env.DUDU_API_KEY;
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/api/interpret`;
const base={now:'2026-09-10T08:30:00Z',timezone:'Asia/Shanghai',language:'zh',profile:{name:'测试宝宝',birthday:'2026-08-30'},pending:[],records:[]};
const cases=[
 {name:'compound',body:{text:'刚才喝完配方奶60毫升，右侧亲喂20分钟，换了一个有小便的尿布。'},check:r=>assert.deepEqual(r.drafts.map(x=>x.kind).sort(),['bottle','diaper','nursing'])},
 {name:'elapsed-history',body:{text:'妈妈右侧吸奶100毫升，用了15分钟。',history:[{role:'user',text:'不对，20分钟母乳，以及上次睡着是两点。',at:'2026-09-09T20:10:00Z'},{role:'assistant',text:'这次回复未完成，请重试。',at:'2026-09-09T20:11:00Z'}]},check:r=>{assert.equal(r.drafts.length,1);assert.equal(r.drafts[0].kind,'pumping');assert.equal(r.drafts[0].value,100);assert.equal(Date.parse(r.drafts[0].at),Date.parse(base.now));}},
 {name:'sleep-end',body:{text:'宝宝醒了，然后喝完30毫升配方奶，还吃了20分钟母乳。',babyContext:{sleepStart:'2026-09-10T06:00:00Z'}},check:r=>{assert.equal(r.drafts.length,3);assert.equal(r.drafts.find(x=>x.kind==='sleep').value,150);assert.equal(r.drafts.find(x=>x.kind==='nursing').value,20);}},
];
try{
 for(const item of cases){const started=Date.now();const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.APP_TOKEN||''}`},body:JSON.stringify({...base,...item.body}),signal:AbortSignal.timeout(85000)});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));item.check(result);console.log(JSON.stringify({case:item.name,pass:true,ms:Date.now()-started,kinds:result.drafts.map(x=>x.kind)}));}
 // Force a disconnected primary and verify the deployed request path uses the backup.
 process.env.DUDU_API_KEY='synthetic-unreachable';process.env.DUDU_BASE_URL='http://127.0.0.1:1/v1';
 const started=Date.now();const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.APP_TOKEN||''}`},body:JSON.stringify({...base,text:'刚才喝完60毫升配方奶。'})});const result=await response.json();assert.equal(response.status,200);assert.equal(result.drafts[0]?.value,60);console.log(JSON.stringify({case:'disconnected-primary-fallback',pass:true,ms:Date.now()-started}));
}finally{if(originalKey)process.env.DUDU_API_KEY=originalKey;else delete process.env.DUDU_API_KEY;if(originalURL)process.env.DUDU_BASE_URL=originalURL;else delete process.env.DUDU_BASE_URL;await new Promise(r=>server.close(r));}
