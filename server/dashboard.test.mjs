import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import Fastify from 'fastify';
import {dashboardDelivery,registerDashboardRoutes,dashboardRequest} from './dashboard.mjs';import {voiceStore} from './voice-store.mjs';
const data={version:1,profile:{name:'测试',birthday:'2026-08-30'},settings:{language:'zh',theme:'peach',region:'CN'},records:[]};
test('private screen packages are scoped, stable, accurately hashed and expire after five minutes',async()=>{
 const store=voiceStore(':memory:');store.sync('a','baby',data);store.sync('b','baby',data);let now=1000;
 const delivery=dashboardDelivery(store,{origin:'https://example.test',now:()=>now});const app=Fastify();registerDashboardRoutes(app,delivery);
 try{
  const a=delivery.issue('a','baby'),again=delivery.issue('a','baby'),b=delivery.issue('b','baby');
  assert.equal(a.id,again.id);assert.equal(a.version,again.version);assert.notEqual(a.url,again.url);assert.notEqual(a.id,b.id);
  assert.throws(()=>delivery.issue('a','missing'));
  const r=await app.inject(new URL(a.url).pathname+new URL(a.url).search);assert.equal(r.statusCode,200);assert.equal(r.rawPayload.length,a.size);assert.equal(createHash('md5').update(r.rawPayload).digest('hex'),a.hash);assert.equal(a.version,a.hash);
  assert.equal(r.headers['cache-control'],'no-store');assert.equal(r.headers['referrer-policy'],'no-referrer');
  const token=r.body.match(/local token = "([a-f0-9]+)"/)[1];assert.deepEqual({...store.identifyDisplay(token)},{owner:'a',profile:'baby'});assert.equal(store.identify(token),undefined);
  assert.ok(!r.body.includes('__HEAN_DISPLAY'));assert.ok(!r.body.includes('测试'));
  assert.equal((await app.inject('/api/display/app.lua')).statusCode,404);assert.equal((await app.inject('/api/display/app.lua?ticket='+('0'.repeat(64)))).statusCode,404);
  now+=299999;assert.ok(delivery.read(new URL(a.url).searchParams.get('ticket')));now++;
  assert.equal((await app.inject(new URL(a.url).pathname+new URL(a.url).search)).statusCode,404);
  const reopened=delivery.issue('a','baby');assert.equal(reopened.id,a.id);assert.ok(delivery.read(new URL(reopened.url).searchParams.get('ticket')));
 }finally{await app.close();store.close();}
});
test('dashboard shortcut accepts direct requests, not questions, denials or quoted instructions',()=>{
 for(const s of ['打开禾安看板','小聆小聆，回到数据看板','重新打开看板','请帮我打开禾安看板'])assert.equal(dashboardRequest(s),true,s);
 for(const s of ['不要打开禾安看板','怎么打开禾安看板？','如果打开禾安看板呢','他说打开禾安看板','打开计时器','宝宝喝了90毫升'])assert.equal(dashboardRequest(s),false,s);
});
