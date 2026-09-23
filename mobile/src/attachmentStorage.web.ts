import { Attachment, uid } from "./domain";
let connection: Promise<IDBDatabase> | undefined;
function db() {
  return (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("baby-ai-media", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      connection = undefined;
      reject(request.error);
    };
  }));
}
async function run<T>(
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("files", mode);
    const req = action(tx.objectStore("files"));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function storeAttachment(
  uri: string,
  type: Attachment["type"],
  mime: string,
  name = "",
): Promise<Attachment> {
  const blob = await (await fetch(uri)).blob();
  if (type !== "video" && blob.size > 30 * 1024 * 1024) throw new Error("TOO_LARGE");
  const a = {
    id: uid(),
    type,
    mime,
    name: (name || `${type}-${Date.now()}`).slice(0, 255),
  };
  await run("readwrite", (s) => s.put(blob, a.id));
  return a;
}
export async function attachmentURI(a: Attachment) {
  const blob = await run<Blob | undefined>("readonly", (s) => s.get(a.id));
  if (!blob) throw new Error("ATTACHMENT_MISSING");
  return URL.createObjectURL(blob);
}
export function releaseURI(uri: string) {
  URL.revokeObjectURL(uri);
}
export async function deleteAttachments(as: Attachment[]) {
  for (const a of as) await run("readwrite", (s) => s.delete(a.id));
}
export async function clearAttachments() {
  await run("readwrite", (s) => s.clear());
}
export async function exportAttachments(as: Attachment[]) {
  return Promise.all(
    as.map(async (a) => {
      const blob = await run<Blob>("readonly", (s) => s.get(a.id));
      if (!blob) throw new Error("ATTACHMENT_MISSING");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      const data = `data:${blob.type || a.mime};base64,${btoa(binary)}`;
      return { ...a, data };
    }),
  );
}
