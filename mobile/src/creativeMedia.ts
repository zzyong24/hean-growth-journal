import {Directory,File,Paths} from 'expo-file-system';import * as Library from 'expo-media-library/legacy';import {uid} from './domain';
const folder=()=>{const d=new Directory(Paths.document,'baby-ai-creations');d.create({intermediates:true,idempotent:true});return d;};
export async function keepPhoto(uri:string){const id=uid()+'.png';const out=new File(folder(),id);if(uri.startsWith('data:')){out.write(uri.split(',')[1],{encoding:'base64'});}else await new File(uri).copy(out);return id;}
export async function photoURI(id:string){return new File(folder(),id).uri;}
export async function photoData(id:string){const b=await new File(folder(),id).base64();return `data:image/${b.startsWith("/9j/")?"jpeg":"png"};base64,${b}`;}
export async function savePhoto(id:string){const p=await Library.requestPermissionsAsync(true);if(!p.granted)throw new Error('PHOTO_PERMISSION');await Library.saveToLibraryAsync(await photoURI(id));}
