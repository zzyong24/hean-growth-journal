export async function exportReport(xml:string,height:number,_ref:any,action:'save'|'share',name:string){
 const url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}));
 try{const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=reject;img.src=url;});const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=Math.round(height*1.5);canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('RENDER_FAILED')),'image/png'));const file=new File([blob],name+'.png',{type:'image/png'});
 if(action==='share'&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:name});return;}
 const download=URL.createObjectURL(blob);const a=document.createElement('a');a.href=download;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(download),10000);
 }finally{URL.revokeObjectURL(url);}
}
