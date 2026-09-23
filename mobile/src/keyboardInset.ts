export function keyboardInset(screenHeight:number,keyboardTop:number,safeBottom:number){
 if(!Number.isFinite(keyboardTop)||keyboardTop<=0)return 0;
 return Math.max(0,screenHeight-keyboardTop-safeBottom);
}
