export function monthDays(anchor:Date) {
 const first=new Date(anchor.getFullYear(),anchor.getMonth(),1);
 const lead=(first.getDay()+6)%7;
 const count=new Date(anchor.getFullYear(),anchor.getMonth()+1,0).getDate();
 return Array.from({length:Math.ceil((lead+count)/7)*7},(_,i)=>i<lead||i>=lead+count?null:new Date(anchor.getFullYear(),anchor.getMonth(),i-lead+1));
}
export function shiftMonth(anchor:Date,step:number) { return new Date(anchor.getFullYear(),anchor.getMonth()+step,1); }
