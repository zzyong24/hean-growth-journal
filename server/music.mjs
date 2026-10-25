import {createReadStream,statSync} from 'node:fs';
import {join,basename} from 'node:path';
export function musicTool(tracks){return {type:'function',function:{name:'hean_music',description:'播放或列出禾安家庭免费曲库。播放儿歌、ABC儿歌、鲁冰花时优先使用。不能转用酷我或付费音乐。仅提供授权曲目；没有的歌如实说明。',parameters:{type:'object',properties:{action:{type:'string',enum:['play','list']},song:{type:'string',enum:tracks.map(x=>x.id),description:tracks.map(x=>x.id+'='+x.title).join('；')}},required:['action'],additionalProperties:false}}};}
export function musicDispatch(native,title,url){
 const direct=native.find(t=>t.function.name.endsWith('play_audio_link'));
 if(direct){const p=direct.function.parameters?.properties||{},key=['url','audio_url','audio_link','link'].find(k=>k in p);if(key)return {name:direct.function.name,arguments:JSON.stringify({[key]:url,...('title' in p?{title}:{})})};}
 const bridge=native.find(t=>t.function.name==='action_agent_bridge');
 if(bridge)return {name:bridge.function.name,arguments:JSON.stringify({user_text:`用设备的 play_audio_link 播放禾安家庭曲库《${title}》，音频地址：${url} 。这是用户已提供的MP3。直接播放这个URL，不搜索音乐，不调用酷我或付费播放服务。`})};
 throw Error('PLAYER_UNAVAILABLE');
}
export function registerMusicRoutes(app,store,root){
 app.get('/api/music/play/:id',async(req,res)=>{
  const track=store.musicRead(req.query?.ticket,req.params.id);
  if(!track)return res.code(404).send({error:'NOT_FOUND'});
  if(typeof track.file!=='string'||basename(track.file)!==track.file||!/^[-a-z0-9]+\.mp3$/.test(track.file))return res.code(404).send();
  const file=join(root,track.file);let size;try{size=statSync(file).size}catch{return res.code(404).send();}
  res.header('Content-Type','audio/mpeg').header('Cache-Control','private, max-age=300').header('Accept-Ranges','bytes').header('Referrer-Policy','no-referrer');
  let start=0,end=size-1;
  if(req.headers.range){
   const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   if(!m||(!m[1]&&!m[2]))return res.code(416).header('Content-Range','bytes */'+size).send();
   if(m[1]){start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}else start=Math.max(0,size-Number(m[2]));
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)return res.code(416).header('Content-Range','bytes */'+size).send();
   res.code(206).header('Content-Range',`bytes ${start}-${end}/${size}`);
  }
  console.info(JSON.stringify({event:'music_stream_started',track:req.params.id,method:req.method,range:!!req.headers.range,bytes:end-start+1}));
  res.header('Content-Length',end-start+1);return res.send(createReadStream(file,{start,end}));
 });
}
