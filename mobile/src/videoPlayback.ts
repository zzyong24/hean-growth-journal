type Playback = {
 addListener:(event:'statusChange',listener:(e:{status:string})=>void)=>{remove:()=>void};
 replaceAsync:(uri:string)=>Promise<unknown>;
 play:()=>void;
};
// The React player hook owns native release. Cleanup must not invoke player methods.
export function attachVideoPlayback(player:Playback,uri:string,status:(s:string)=>void,failed:()=>void){
 let alive=true;
 const subscription=player.addListener('statusChange',e=>{if(alive)status(e.status)});
 player.replaceAsync(uri).then(()=>{if(alive)player.play()}).catch(()=>{if(alive)failed()});
 return()=>{if(!alive)return;alive=false;try{subscription.remove()}catch{/* SDK may have already removed listeners during release. */}};
}
