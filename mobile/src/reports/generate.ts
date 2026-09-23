import {checkCancelled} from "../cancellation";

import {styleForReport} from './styles';
import {AppData} from '../domain';

import {artwork} from './artwork';
import {buildReport,Period} from './model';
import {poster} from './poster';
import {reportImage} from './media';
export async function generateReport(data:AppData,period:Period,date:string,signal:AbortSignal,onStage:(s:'media'|'ai'|'layout')=>void,variation=0){
 const report=buildReport(data.records,period,date),art=await artwork(styleForReport(date,period,variation));
 const moments=report.moments.slice(-3),images:Record<string,string>={},sizes:Record<string,{width:number;height:number}>={};
 const photos=[...report.rows].sort((a,b)=>b.at.localeCompare(a.at)).flatMap(r=>r.attachments||[]).filter(a=>a.type==='image');
 onStage('media');
 const inputs=[photos[0],...moments.map(r=>r.attachments?.find(a=>a.type!=='audio'))].filter(Boolean);
 for(const a of inputs){checkCancelled(signal);if(a&&!images[a.id]){const image=await reportImage(a);images[a.id]=image.data;sizes[a.id]=image;}}
 checkCancelled(signal);onStage('layout');return poster(report,data.profile.name,period,data.settings.language==='zh',moments,images,art,sizes);
}
