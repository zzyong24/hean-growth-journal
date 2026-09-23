import test from 'node:test';import assert from 'node:assert/strict';import {imagePayload} from './imagePayload';
test('image transport declares the actual converted JPEG format and bounds its size',()=>{
 assert.equal(imagePayload('/9j/'),'data:image/jpeg;base64,/9j/');assert.throws(()=>imagePayload(''));assert.throws(()=>imagePayload('A'.repeat(11000001)),/TOO_LARGE/);
});
