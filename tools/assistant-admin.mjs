// Local server operator tool. It never opens voiceStore, which recovers interrupted jobs.
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import {writeFileSync,unlinkSync,existsSync} from 'node:fs';
import path from 'node:path';
const [command,...rest]=process.argv.slice(2),args={};
for(let i=0;i<rest.length;i+=2){if(!rest[i].startsWith('--')||!rest[i+1])throw Error('Use --key value');args[rest[i].slice(2)]=rest[i+1];}
if(!['list','pair','music'].includes(command)||!args.state)throw Error('Usage: node tools/assistant-admin.mjs list|pair|music --state /private/state [options]');
const file=path.resolve(args.state,'voice.sqlite');if(!existsSync(file))throw Error('Start gateway and sync a phone profile first');
const db=new DatabaseSync(file,{readOnly:command==='list'});db.exec('PRAGMA busy_timeout=5000');
try{
 if(command==='list'){for(const r of db.prepare('SELECT owner,profile,updated FROM voice_profiles').all())console.log(JSON.stringify(r));}
 else {
  const {owner,profile}=args;if(!owner||!profile||!db.prepare('SELECT 1 FROM voice_profiles WHERE owner=? AND profile=?').get(owner,profile))throw Error('Choose an existing owner and profile from list');
  if(command==='pair'){
   const origin=new URL(args.origin);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Use an HTTPS origin');
   if(!args.out)throw Error('Set --out to a private new directory');
   const out=path.resolve(args.out);if(!existsSync(out))throw Error('Create output directory first, chmod 700');
   const voice=randomBytes(32).toString('hex'),display=randomBytes(32).toString('hex'),hash=s=>createHash('sha256').update(s).digest('hex'),written=[];
   db.exec('BEGIN IMMEDIATE');try{
    for(const [name,value] of [['assistant-link.json',{url:origin.origin+'/mcp/hean',token:voice}],['display-link.json',{url:origin.origin+'/api/display/summary',token:display}]]){
     const target=path.join(out,name);writeFileSync(target,JSON.stringify(value)+'\n',{flag:'wx',mode:0o600});written.push(target);
    }
    db.prepare('INSERT INTO voice_links VALUES(?,?,?,?)').run(hash(voice),owner,profile,'小聆');db.prepare('INSERT INTO display_links VALUES(?,?,?)').run(hash(display),owner,profile);db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');for(const f of written)unlinkSync(f);throw e;}
   console.log('Created scoped credentials in private files; tokens are not printed.');
  }else{
   const titles={abc:'ABC儿歌',lubinghua:'鲁冰花',playlist:'ABC儿歌和鲁冰花连播'};
   if(!titles[args.id]||!/^[a-zA-Z0-9_-]+\.mp3$/.test(args.file||'')||!existsSync(path.join(args.state,'music',args.file)))throw Error('Use abc/lubinghua/playlist and an existing safe MP3 basename under state/music');
   db.prepare('INSERT INTO music_tracks VALUES(?,?,?,?,?) ON CONFLICT(owner,profile,id) DO UPDATE SET title=excluded.title,file=excluded.file').run(owner,profile,args.id,titles[args.id],args.file);console.log('Registered track:',args.id);
  }
 }
}finally{db.close();}
