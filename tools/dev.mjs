import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));const children=[];
function stop(){for(const child of children)child.kill('SIGTERM')}
for(const [folder,args] of [['server',['--env-file-if-exists=.env','index.mjs']],['mobile',['node_modules/expo/bin/cli','start','--web','--port','8081']]]){const child=spawn(process.execPath,args,{cwd:root+folder,stdio:'inherit'});children.push(child);child.on('error',error=>{console.error(error.message);stop();process.exitCode=1});child.on('exit',code=>{if(code){stop();process.exitCode=code}})}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
