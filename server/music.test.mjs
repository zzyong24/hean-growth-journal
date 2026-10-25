import test from 'node:test';import assert from 'node:assert/strict';import Fastify from 'fastify';import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {DatabaseSync} from 'node:sqlite';import {voiceStore} from './voice-store.mjs';import {registerMusicRoutes,musicDispatch} from './music.mjs';
test('private music tickets are scoped, expire, survive reopen, and support byte ranges',async()=>{
 const root=mkdtempSync(join(tmpdir(),'hean-music-')),file=join(root,'voice.sqlite');let s=voiceStore(file);const db=new DatabaseSync(file);db.prepare('INSERT INTO music_tracks VALUES(?,?,?,?,?)').run('a','baby','abc','ABC儿歌','abc.mp3');writeFileSync(join(root,'abc.mp3'),Buffer.from('0123456789'));
 try{assert.throws(()=>s.musicTicket('b','baby','abc'));const ticket=s.musicTicket('a','baby','abc');assert.equal(s.identify(ticket),undefined);assert.equal(s.musicRead(ticket,'wrong'),undefined);s.close();s=voiceStore(file);
  const app=Fastify();registerMusicRoutes(app,s,root);
  try{assert.equal((await app.inject({url:'/api/music/play/abc'})).statusCode,404);const url='/api/music/play/abc?ticket='+ticket;const r=await app.inject({url,headers:{range:'bytes=2-5'}});assert.equal(r.statusCode,206);assert.equal(r.body,'2345');assert.equal(r.headers['content-range'],'bytes 2-5/10');assert.equal((await app.inject({url,headers:{range:'bytes=99-'}})).statusCode,416);assert.equal((await app.inject({url,headers:{range:'bytes=-3'}})).body,'789');db.exec('UPDATE music_tickets SET expires=0');assert.equal((await app.inject({url})).statusCode,404);
  }finally{await app.close()}
 }finally{s.close();db.close();rmSync(root,{recursive:true,force:true})}
});
test('music uses available URL player or action bridge, never a paid search',()=>{
 const direct=musicDispatch([{function:{name:'ls.built_in.play_audio_link',parameters:{properties:{url:{type:'string'}}}}}],'ABC','https://example.test/a');assert.equal(JSON.parse(direct.arguments).url,'https://example.test/a');
 const bridge=musicDispatch([{function:{name:'action_agent_bridge'}}],'ABC','https://example.test/a');assert.match(JSON.parse(bridge.arguments).user_text,/不调用酷我/);assert.throws(()=>musicDispatch([],'ABC','url'));
});
