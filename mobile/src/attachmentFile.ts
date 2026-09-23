import type {Attachment} from './domain';
// Only video needs a new path; preserve existing image/audio filenames.
export function attachmentFilename(a:Attachment){
 return a.type==='video'?`${a.id}.${a.mime==='video/quicktime'?'mov':'mp4'}`:a.id;
}
