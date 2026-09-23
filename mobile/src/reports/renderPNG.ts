type SVGRenderer = {toDataURL(callback:(data:string)=>void):void};

export function renderPosterPNG(ref:SVGRenderer|null):Promise<string>{
 if(!ref)return Promise.reject(new Error('NOT_READY'));
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('RENDER_TIMEOUT')),15000);
  try{
   // iOS draws at the mounted view's bounds, even with export width/height.
   // Keep those bounds; its image renderer already applies the screen pixel scale.
   ref.toDataURL(data=>{clearTimeout(timer);data?resolve(data):reject(new Error('RENDER_FAILED'))});
  }catch(error){clearTimeout(timer);reject(error)}
 });
}
