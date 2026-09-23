import {Directory,File,Paths} from 'expo-file-system';
import {SavedPoster} from './historyKey';
const folder=()=>{const d=new Directory(Paths.document,'hean-report-history');d.create({intermediates:true,idempotent:true});return d};
export async function readPoster(key:string):Promise<SavedPoster|null>{const f=new File(folder(),encodeURIComponent(key)+'.json');return f.exists?JSON.parse(await f.text()):null;}
export async function writePoster(key:string,value:SavedPoster){new File(folder(),encodeURIComponent(key)+'.json').write(JSON.stringify(value));}
