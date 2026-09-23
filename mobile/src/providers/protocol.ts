export type Protocol='openai'|'responses'|'anthropic'|'transcriptions'|'qwen-audio'|'images';
export function endpoint(base:string,path:string){
 const u=new URL(base.trim());
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error('INVALID_API_URL');
 if(u.protocol==='http:'&&!/^(localhost$|127\.0\.0\.1$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname))throw Error('HTTPS_REQUIRED');
 let url=u.toString().replace(/\/$/,'');if(u.pathname==='/')url+='/v1';
 return url.endsWith('/'+path)?url:url+'/'+path;
}
export function chatPayload(protocol:Protocol,model:string,system:string,text:string,images:string[]=[]):any{
 if(protocol==='responses')return {model,instructions:system,input:[{role:'user',content:[{type:'input_text',text},...images.map(image_url=>({type:'input_image',image_url}))]}],stream:false};
 if(protocol==='anthropic')return {model,max_tokens:8192,system,messages:[{role:'user',content:[{type:'text',text},...images.map(data=>{const m=data.match(/^data:(image\/[^;]+);base64,(.+)$/s);if(!m)throw Error('INVALID_IMAGE');return {type:'image',source:{type:'base64',media_type:m[1],data:m[2]}};})]}]};
 return {model,messages:[{role:'system',content:system},{role:'user',content:images.length?[{type:'text',text},...images.map(url=>({type:'image_url',image_url:{url}}))]:text}],stream:false};
}
export function readChat(protocol:Protocol,result:any):string{
 if(result.status==='incomplete'||result.stop_reason==='max_tokens'||result.choices?.[0]?.finish_reason==='length')throw Error('INVALID_MODEL_RESPONSE');
 const text=protocol==='responses'?result.output?.filter((x:any)=>x.type==='message').flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join(''):protocol==='anthropic'?result.content?.filter((x:any)=>x.type==='text').map((x:any)=>x.text).join(''):result.choices?.[0]?.message?.content;
 if(typeof text!=='string'||!text.trim())throw Error('INVALID_MODEL_RESPONSE');return text;
}
