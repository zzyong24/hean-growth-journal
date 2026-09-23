import {Period,reportRange} from './model';
export const posterStyles=['sage','apricot','garden','night','sea','harvest','forest','lotus','snow','peach','cloud','lemon'] as const;
export type PosterStyle=typeof posterStyles[number];
export function styleForReport(date:string,period:Period,variation=0):PosterStyle{
 const {start}=reportRange(period,date);
 const day=Math.floor(Date.UTC(start.getFullYear(),start.getMonth(),start.getDate())/86400000);
 return posterStyles[((day+({day:0,week:2,month:4}[period])+variation)%posterStyles.length+posterStyles.length)%posterStyles.length];
}
