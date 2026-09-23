import {attachmentFilename} from './attachmentFile';
import { Directory, File, Paths } from "expo-file-system";
import { Attachment, uid } from "./domain";
const dir = () => new Directory(Paths.document, "baby-ai-media");
export async function storeAttachment(
  uri: string,
  type: Attachment["type"],
  mime: string,
  name = "",
): Promise<Attachment> {
  if (type === "video" && uri.startsWith("ph://")) return {id:uid(),type,mime,name:name || "Video",assetId:uri.slice(5)};
  const source = new File(uri);
  if (type !== "video" && source.size > 30 * 1024 * 1024) throw new Error("TOO_LARGE");
  const folder = dir();
  folder.create({ intermediates: true, idempotent: true });
  const a:Attachment = {
    id: uid(),
    type,
    mime,
    name: (name || `${type}-${Date.now()}`).slice(0, 255),
  };
  await source.copy(new File(folder, attachmentFilename(a)));
  return a;
}
export async function attachmentURI(a: Attachment) {
  if (a.assetId) return `ph://${a.assetId}`;
  const f = new File(dir(), attachmentFilename(a));
  if(!f.exists){const old=new File(dir(),a.id);if(old.exists)await old.copy(f);}
  if (!f.exists) throw new Error("ATTACHMENT_MISSING");
  return f.uri;
}
export function releaseURI(_uri: string) {}
export async function deleteAttachments(as: Attachment[]) {
  for (const a of as) {
    if(a.livePhoto)await deleteAttachments([a.livePhoto]);
    if (a.assetId) continue;
    for(const name of [a.id,attachmentFilename(a)]){const f=new File(dir(),name);if(f.exists)f.delete();}
  }
}
export async function clearAttachments() {
  const d = dir();
  if (d.exists) d.delete();
}
type ExportedAttachment=Omit<Attachment,"livePhoto"> & {data?:string;storage?:string;livePhoto?:ExportedAttachment};
export async function exportAttachments(as: Attachment[]):Promise<ExportedAttachment[]> {
  return Promise.all(
    as.map(async (a) => a.assetId ? {...a, storage:"photo-library-reference"} : ({
      ...a,
      ...(a.livePhoto?{livePhoto:(await exportAttachments([a.livePhoto]))[0]}:{}),
      data: `data:${a.mime};base64,${await new File(await attachmentURI(a)).base64()}`,
    })),
  );
}
