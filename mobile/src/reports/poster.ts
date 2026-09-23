import {appStoreQR} from './appLink';
import {Report,Period,localDate} from './model';
import {CareRecord} from '../domain';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const txt=(s:string,x:number,y:number,size=20,fill='#344d40',weight='400')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" font-family="Songti SC, STSong, SimSun, serif">${esc(s)}</text>`;
function lines(s:string,max=25){const chars=Array.from(s.replace(/\s+/g,' '));const out:string[]=[];while(chars.length&&out.length<3)out.push(chars.splice(0,max).join(''));if(chars.length)out[2]+='…';return out;}
export function poster(report:Report,name:string,period:Period,zh:boolean,moments:CareRecord[],images:Record<string,string>,art?:{background:string;logo:string;cover?:string},sizes:Record<string,{width:number;height:number}>={}){
 const end=new Date(report.end);end.setDate(end.getDate()-1);
 const title=zh?{day:'这一天的小小成长',week:'一周，慢慢长大',month:'把这个月珍藏'}[period]:{day:'A little day of growing',week:'A week of little wonders',month:'A month to remember'}[period];
 let body=`<rect width="720" height="HEIGHT" fill="#f7f5ea"/>`;
 if(art?.cover)body+=`<defs><linearGradient id="photoFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f5ea" stop-opacity="1"/><stop offset="0.68" stop-color="#f7f5ea" stop-opacity="0.98"/><stop offset="0.82" stop-color="#f7f5ea" stop-opacity="0"/></linearGradient></defs><image href="${esc(art.cover)}" x="0" y="500" width="720" height="580" preserveAspectRatio="xMidYMid slice"/><rect width="720" height="1080" fill="url(#photoFade)"/>`;
 if(art?.cover)body+=`<defs><linearGradient id="paperFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.5" stop-color="white"/><stop offset="0.74" stop-color="black"/></linearGradient><mask id="paperTop"><rect width="720" height="1080" fill="url(#paperFade)"/></mask></defs><image href="${esc(art.background)}" width="720" height="1080" opacity="0.45" mask="url(#paperTop)"/>`;
 if(art&&!art.cover)body+=`<image href="${esc(art.background)}" x="0" y="0" width="720" height="1080" preserveAspectRatio="xMidYMid slice"/>`;
 if(art)body+=`<image href="${esc(art.logo)}" x="44" y="34" width="290" height="97"/>`;
 else body+=txt('禾安成长日记',46,82,30);
 body+=txt(zh?{day:'成长日报',week:'成长周报',month:'成长月报'}[period]:period.toUpperCase()+' JOURNAL',48,157,17,'#668269');
 body+=txt(title,46,229,40)+txt(name.slice(0,18),48,289,26)+txt(`${localDate(report.start)}${period==='day'?'':' — '+localDate(end)}`,48,328,16,'#798575');
 const n=(v:number|null)=>v===null?'—':String(Math.round(v*10)/10);
 const metrics=[ [zh?'已记录瓶喂':'Bottle milk logged',n(report.milk),'ml'],[zh?'已记录睡眠':'Sleep logged',n(report.sleep===null?null:report.sleep/60),zh?'小时':'hours'],[zh?'已记录排便':'Stools logged',n(report.stools),zh?'次':'times'],[zh?'已记录小便':'Wet diapers logged',n(report.wet),zh?'次':'times'] ];
 metrics.forEach(([label,value,unit],i)=>{const x=48+(i%2)*310,y=372+Math.floor(i/2)*128;body+=txt(label,x,y+24,17,'#70816c')+txt(value,x,y+80,43,'#344d40','500')+txt(unit,x+190,y+78,17);});
 body+=`<path d="M48 630 H600" stroke="#a7b39c" stroke-width="0.8"/>`;
 body+=txt(zh?`${report.feeds} 次喂养 · 亲喂 ${n(report.nursing)} 分钟`:`${report.feeds} feeds · Nursing ${n(report.nursing)} min`,48,663,18);
 body+=txt(zh?`尿布 ${n(report.diapers)} 次 · ${report.unclassified} 次未分类`:`${n(report.diapers)} diapers · ${report.unclassified} unclassified`,48,696,16,'#798575');
 body+=txt(zh?`${report.elapsedDays} 天里，留下 ${report.coveredDays} 天的日常`:`${report.coveredDays} of ${report.elapsedDays} days remembered`,48,744,18);
 if(!art?.cover)body+=txt(zh?'一寸光阴':'Little days,',48,852,24)+txt(zh?'一寸成长。':'little wonders.',48,892,24);
 let y=1124;
 if(period!=='day'){
 body+=txt(zh?'奶量的小节奏':'Bottle milk rhythm',40,y,23);y+=24;
 const max=Math.max(1,...report.daily.map(d=>d.milk||0)),w=640/report.days;
 report.daily.forEach((d,i)=>{const h=(d.milk||0)/max*85;body+=`<rect x="${40+i*w}" y="${y+88-h}" width="${Math.max(3,w-4)}" height="${d.milk===null?2:Math.max(3,h)}" rx="2" fill="${d.milk===null?'#dddcd1':'#91a880'}"/>`;});
 y+=118;body+=txt(localDate(report.start).slice(5),40,y,14,'#798575')+txt(localDate(end).slice(5),622,y,14,'#798575');y+=48;
 }
 if(moments.length){body+=txt(zh?'值得珍藏的小事':'Little moments to keep',40,y,25);y+=25;}
 for(const r of moments){
 const a=r.attachments?.find(a=>images[a.id]);const image=a?images[a.id]:undefined;
 if(image&&image!==art?.cover){const size=a?sizes[a.id]:undefined;const imageHeight=size&&size.width>0?Math.round(640*size.height/size.width):480;body+=`<image href="${esc(image)}" x="40" y="${y}" width="640" height="${imageHeight}" preserveAspectRatio="xMidYMid meet"/>`;y+=imageHeight+25;}
 body+=txt(localDate(new Date(r.at))+(r.timePrecision==='day'?'':' '+new Date(r.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}))+(r.attachments?.some(a=>a.type==='video')?(zh?' · 视频瞬间':' · Video moment'):''),40,y,15,'#798575');y+=29;
 for(const l of lines(r.note||r.sourceText||(zh?'这一刻，也很珍贵。':'A moment worth keeping.'),zh?30:57)){body+=txt(l,40,y,20);y+=29;}y+=25;
 }
 if(period==='day'&&!moments.length)y=1100;
 y+=18;
 const qrBody=appStoreQR?appStoreQR.replace(/<svg[^>]*>/,'').replace('</svg>',''):'';
 if(qrBody){body+=`<g transform="translate(40 ${y}) scale(${120/37})">${qrBody}</g>`;body+=txt('禾安成长日记',180,y+42,23)+txt(zh?'App Store · 正式上架后可下载':'App Store · Available after public release',180,y+77,16,'#668269');}
 else body+=txt(zh?'开源代码 · github.com/zzyong24/hean-growth-journal':'Open source · github.com/zzyong24/hean-growth-journal',40,y+48,18,'#668269');
 y+=145;
 y+=12;body+=`<path d="M40 ${y} H680" stroke="#d9dfcc"/>`;y+=35;body+=txt('禾安成长日记 · '+(zh?'把长大的每一天，好好收藏。':'Every little day, treasured.'),40,y,18,'#668269');y+=28;body+=txt((zh?'记录截至 ':'As of ')+localDate(report.generatedAt)+' '+report.generatedAt.toLocaleTimeString(zh?'zh-CN':'en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}),40,y,14,'#798575');y+=30;
 return {xml:`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${y}" viewBox="0 0 720 ${y}">${body.replace('HEIGHT',String(y))}</svg>`,height:y};
}
