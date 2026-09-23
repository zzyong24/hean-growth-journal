import {localDate,Period,reportRange} from './model';
export type SavedPoster={xml:string;height:number;variation:number;saved:boolean};
export function reportKey(babyId:string|undefined,period:Period,date:string){return `${encodeURIComponent(babyId||'legacy')}_${period}_${localDate(reportRange(period,date).start)}`;}
