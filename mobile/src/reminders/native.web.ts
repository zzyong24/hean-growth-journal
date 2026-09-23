export async function permission(_request=false){return false}
export async function replaceNotifications(_items:{id:string;date:Date;title:string;body:string;babyId:string}[]){}
export function observeNotification(_open:(id:string)=>void){return ()=>{}}
