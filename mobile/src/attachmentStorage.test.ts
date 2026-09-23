import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import {
  storeAttachment,
  attachmentURI,
  releaseURI,
  exportAttachments,
  deleteAttachments,
  clearAttachments,
} from "./attachmentStorage.web";
test("attachment blobs survive metadata round trip and export, then delete cleanly", async () => {
  const a = await storeAttachment(
    "data:image/png;base64,aGVsbG8=",
    "image",
    "image/png",
    "test.png",
  );
  const restored = JSON.parse(JSON.stringify(a));
  const uri = await attachmentURI(restored);
  assert.equal(await (await fetch(uri)).text(), "hello");
  releaseURI(uri);
  const files = await exportAttachments([restored]);
  assert.equal(files[0].data, "data:image/png;base64,aGVsbG8=");
  await deleteAttachments([restored]);
  await assert.rejects(attachmentURI(restored), /ATTACHMENT_MISSING/);
  await clearAttachments();
});
