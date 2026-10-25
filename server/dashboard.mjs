import {readFileSync} from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';

const digest=(value,algorithm='sha256')=>createHash(algorithm).update(value).digest('hex');
// A device can re-download its private screen after exiting. Download tickets
// expire after five minutes; the embedded credential can only read its summary.
export function dashboardDelivery(store,{origin='https://hean.example.com',now=()=>Date.now(),source=readFileSync(new URL('../devices/xiaoling/hean.lua',import.meta.url),'utf8')}={}){
 const url=new URL(origin);
 if(url.protocol!=='https:'||url.origin!==origin)throw Error('INVALID_DASHBOARD_ORIGIN');
 if(!source.includes('"__HEAN_DISPLAY_TOKEN__"')||!source.includes('"__HEAN_DISPLAY_URL__"'))throw Error('INVALID_DASHBOARD_TEMPLATE');
 const packages=new Map(),tickets=new Map();
 function issue(owner,profile){
  if(!store.profile(owner,profile))throw Error('PROFILE_NOT_SYNCED');
  const key=JSON.stringify([owner,profile]);let pkg=packages.get(key);
  if(!pkg){
   const token=store.pairDisplay(owner,profile);
   const body=Buffer.from(source.replace('"__HEAN_DISPLAY_URL__"',JSON.stringify(origin+'/api/display/summary')).replace('"__HEAN_DISPLAY_TOKEN__"',JSON.stringify(token)));
   if(body.length>65536)throw Error('DASHBOARD_TOO_LARGE');
   const hash=digest(body,'md5');
   pkg={body,metadata:{id:'hean-'+digest(key).slice(0,24),version:hash,name:'禾安看板',size:body.length,hash}};
   if(packages.size>=100)packages.delete(packages.keys().next().value);packages.set(key,pkg);
  }
  for(const [key,t] of tickets)if(t.expires<=now())tickets.delete(key);
  if(tickets.size>=500)tickets.delete(tickets.keys().next().value);
  const ticket=randomBytes(32).toString('hex');tickets.set(digest(ticket),{pkg,expires:now()+300000});
  return {...pkg.metadata,url:origin+'/api/display/app.lua?ticket='+ticket};
 }
 function read(ticket){
  if(typeof ticket!=='string'||!/^[a-f0-9]{64}$/.test(ticket))return null;
  const key=digest(ticket),entry=tickets.get(key);
  if(!entry)return null;
  if(entry.expires<=now()){tickets.delete(key);return null;}
  return entry.pkg.body;
 }
 return {issue,read};
}
export function registerDashboardRoutes(app,delivery){
 app.get('/api/display/app.lua',async(req,res)=>{
  const body=delivery.read(req.query?.ticket);
  if(!body)return res.code(404).send({error:'NOT_FOUND'});
  return res.header('Cache-Control','no-store').header('Referrer-Policy','no-referrer').header('Content-Type','text/plain; charset=utf-8').header('Content-Length',body.length).send(body);
 });
}

export function dashboardRequest(text){
 const s=text.trim().replace(/[，。！？!?\s]/g,'').replace(/^(小聆小聆|小聆)/,'').replace(/^(请帮我|帮我|请)/,'');
 return /^(重新打开|打开|回到|返回|进入|恢复|显示|我要看)(禾安|宝宝)?(数据)?看板(吧)?$/.test(s);
}
