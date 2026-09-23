export async function readCompletionStream(body,onText,metrics={}) {
 let full='',buffer='';const decoder=new TextDecoder();
 const consume=line=>{
  if(!line.startsWith('data:'))return;
  const str=line.slice(5).trim();if(str==='[DONE]')return true;if(!str)return;
  const item=JSON.parse(str);if(item.error)throw new Error('PROVIDER_STREAM_ERROR');
  const choice=item.choices?.[0];
  if(choice?.finish_reason==='length')throw new Error('MODEL_OUTPUT_LIMIT');
  metrics.reasoningChars=(metrics.reasoningChars||0)+(choice?.delta?.reasoning_content?.length||0);
  const text=choice?.delta?.content||'';full+=text;metrics.contentChars=full.length;
  if(full.length>100000)throw new Error('MODEL_RESPONSE_TOO_LARGE');
  if(text)onText?.(full);
 };
 for await(const chunk of body){
  metrics.firstChunkAt??=Date.now();buffer+=decoder.decode(chunk,{stream:true});
  const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines)if(consume(line))return full;
  if(buffer.length>100000)throw new Error('MODEL_RESPONSE_TOO_LARGE');
 }
 consume(buffer+decoder.decode());return full;
}
