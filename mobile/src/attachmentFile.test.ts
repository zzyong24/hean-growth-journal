import test from 'node:test';
import assert from 'node:assert/strict';
import {attachmentFilename} from './attachmentFile';
test('video files preserve a playable container extension without renaming legacy audio or images',()=>{
 assert.equal(attachmentFilename({id:'a',type:'video',mime:'video/quicktime',name:''}),'a.mov');
 assert.equal(attachmentFilename({id:'b',type:'video',mime:'video/mp4',name:''}),'b.mp4');
 assert.equal(attachmentFilename({id:'c',type:'image',mime:'image/png',name:''}),'c');
 assert.equal(attachmentFilename({id:'d',type:'audio',mime:'audio/wav',name:''}),'d');
});
