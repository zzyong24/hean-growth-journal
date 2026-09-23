import test from 'node:test';import assert from 'node:assert/strict';import {dictationAttachment} from './speechAttachment';
test('dictation retains the selected photo or video, not the speech audio',()=>{
 const photo={type:'image',uri:'photo'};assert.equal(dictationAttachment(photo),photo);assert.equal(dictationAttachment({type:'audio'}),null);assert.equal(dictationAttachment(null),null);
});
