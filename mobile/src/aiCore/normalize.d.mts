import type {CareRecord} from '../domain';
export function normalizeDrafts(result:unknown,text:string,pending?:CareRecord[],saved?:CareRecord[]):{drafts:CareRecord[];reply:string;sleepStart?:string;nursingStart?:{at:string;side:'left'|'right'}};
