import {type AppData,type CareRecord,mergeRecords} from './domain';
// One atomic local write for an interpreted batch; version checks remain mandatory.
export function commitAutomaticRecords(data:AppData,records:CareRecord[],nursing?:AppData["nursingSession"],sleepStart?:string):AppData {
 if(sleepStart&&(!Number.isFinite(Date.parse(sleepStart))||(data.sleepStart&&data.sleepStart!==sleepStart)))throw new Error('SLEEP_ALREADY_RUNNING');
 if(nursing&&data.nursingSession&&(nursing.at!==data.nursingSession.at||nursing.side!==data.nursingSession.side))throw new Error('NURSING_ALREADY_RUNNING');
 const finished=data.nursingSession&&records.some(r=>r.kind==='nursing'&&r.side===data.nursingSession!.side&&Math.abs(Date.parse(r.at)-(r.value||0)*60000-Date.parse(data.nursingSession!.at))<60000);
 return {...data,nursingSession:nursing||(finished?undefined:data.nursingSession),records:mergeRecords(data.records,records),sleepStart:sleepStart || (data.sleepStart && records.some(r=>r.kind==='sleep'&&r.timePrecision!=='day'&&Math.abs(Date.parse(r.at)-(r.value||0)*60000-Date.parse(data.sleepStart!))<60000)?undefined:data.sleepStart)};
}
