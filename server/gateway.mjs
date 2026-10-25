import Fastify from 'fastify';
import {Readable} from 'node:stream';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {createServer} from './index.mjs';
import {voiceStore} from './voice-store.mjs';
import {registerVoiceRoutes} from './voice-routes.mjs';
import {registerDisplayRoutes} from './display.mjs';
import {registerVoiceChat} from './voice-chat.mjs';
import {registerMusicRoutes} from './music.mjs';
import {dashboardDelivery,registerDashboardRoutes} from './dashboard.mjs';
import {accessStore} from './access.mjs';
const dir=process.env.STATE_DIRECTORY||'./state';mkdirSync(dir,{recursive:true,mode:0o700});
const access=accessStore(`${dir}/access.sqlite`);
const voice=voiceStore(`${dir}/voice.sqlite`);
const dashboard=dashboardDelivery(voice,{origin:process.env.PUBLIC_ORIGIN||undefined});
const internalToken=randomBytes(32).toString('hex');process.env.APP_TOKEN=internalToken;
const backend=createServer();await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
const upstream=`http://127.0.0.1:${backend.address().port}`;
const app=Fastify({logger:false,bodyLimit:26000000,requestTimeout:30000,trustProxy:'127.0.0.1'});
const allowed=new Set((process.env.ALLOWED_ORIGINS||'http://localhost:8081,http://127.0.0.1:8081').split(','));
let chat=0,image=0;const active=new Set();
app.addHook('onRequest',async(req,res)=>{
 res.header('Cache-Control','no-store');
 const origin=req.headers.origin;if(origin&&!allowed.has(origin))return res.code(403).send({error:'ORIGIN_DENIED'});
 if(origin)res.header('Access-Control-Allow-Origin',origin).header('Vary','Origin');
 res.header('Access-Control-Allow-Headers','Content-Type,Authorization,MCP-Protocol-Version').header('Access-Control-Allow-Methods','GET,POST,OPTIONS');
 if(req.method==='OPTIONS')return res.code(204).send();
 if(req.url==='/health'||req.url==='/auth/guest')return;
 if(/^\/api\/music\/play\/[^/?]+(?:\?|$)/.test(req.url))return; // Each track requires its own expiring playback ticket.
 if(req.url.split('?')[0]==='/api/display/app.lua')return; // Private, five-minute package ticket checked by the route.
 if(req.url.split('?')[0]==='/api/display/summary'){const link=voice.identifyDisplay(req.headers.authorization?.replace(/^Bearer /,''));if(!link)return res.code(401).send({error:'UNAUTHORIZED'});req.displayLink=link;return;}
 if(['/mcp/hean','/api/voice/chat/completions'].includes(req.url.split('?')[0])){const link=voice.identify(req.headers.authorization?.replace(/^Bearer /,''));if(!link)return res.code(401).send({error:'UNAUTHORIZED'});req.voiceLink=link;return;}
 const id=access.identify(req.headers.authorization?.replace(/^Bearer /,''));if(!id)return res.code(401).send({error:'UNAUTHORIZED'});
 req.user=id;
 if(req.method==='POST'&&!req.url.startsWith('/api/voice/')){
 const art=['/api/create-portrait','/api/create-report-background'].includes(req.url),key=id+':'+(art?'image':'chat');
 if(active.has(key)||(art?image>=1:chat>=6))return res.code(429).header('Retry-After','3').send({error:'BUSY'});
 if(!access.quota(id,art))return res.code(429).send({error:'DAILY_LIMIT'});
 active.add(key);if(art)image++;else chat++;
 let released=false;const release=()=>{if(released)return;released=true;active.delete(key);if(art)image--;else chat--;};res.raw.once('close',release);res.raw.once('finish',release);
 }
});
app.get('/health',async()=>({ok:true,service:'hean-ai'}));
app.post('/auth/guest',{bodyLimit:1024},async(req,res)=>{const guest=access.register(req.ip);return guest?guest:res.code(429).send({error:'REGISTRATION_LIMIT'});});
registerVoiceRoutes(app,{store:voice,upstream,internalToken,quota:id=>access.quota(id,false)});
registerDisplayRoutes(app,voice);
registerVoiceChat(app,{store:voice,quota:id=>access.quota(id,false),publicOrigin:process.env.PUBLIC_ORIGIN||undefined,dashboard});
registerDashboardRoutes(app,dashboard);
registerMusicRoutes(app,voice,`${dir}/music`);
const routes=['/api/status','/api/interpret','/api/interpret-stream','/api/transcribe','/api/observe','/api/create-portrait','/api/create-report-background'];
for(const url of routes)app.route({method:url==='/api/status'?'GET':'POST',url,handler:async(req,res)=>{
 const controller=new AbortController();res.raw.once('close',()=>controller.abort());
 try{const r=await fetch(upstream+url,{method:req.method,headers:{Authorization:`Bearer ${internalToken}`,'Content-Type':'application/json'},...(req.method==='POST'?{body:JSON.stringify(req.body)}:{}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(265000)])});res.code(r.status).header('Content-Type',r.headers.get('content-type')||'application/json').header('X-Accel-Buffering','no');return res.send(Readable.fromWeb(r.body));}catch{if(!res.sent)return res.code(502).send({error:'UPSTREAM_UNAVAILABLE'});}
}});
app.setErrorHandler((error,req,res)=>res.code(error.statusCode||500).send({error:error.statusCode===413?'TOO_LARGE':'REQUEST_FAILED'}));
await app.listen({port:Number(process.env.PORT||8790),host:'127.0.0.1'});
console.log('Hean gateway ready');
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,async()=>{await app.close();backend.close();access.close();voice.close();process.exit(0)});
