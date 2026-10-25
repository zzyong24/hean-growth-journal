import type {CareRecord,AppData} from '../domain';
import type {BottleAction} from '../care/bottleFlow';
export function normalizeDrafts(result:unknown,text:string,pending?:CareRecord[],saved?:CareRecord[],context?:Partial<AppData>&{now?:string}):{drafts:CareRecord[];reply:string;sleepStart?:string;nursingStart?:{at:string;side:'left'|'right'};bottleAction?:BottleAction;reviewReasons:string[]};
