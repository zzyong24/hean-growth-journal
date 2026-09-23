import test from 'node:test';import assert from 'node:assert/strict';import {keyboardInset} from './keyboardInset';
test('keyboard avoidance excludes the safe area once and fully resets when hidden',()=>{
 assert.equal(keyboardInset(844,508,34),302);
 assert.equal(keyboardInset(844,844,34),0);
 assert.equal(keyboardInset(844,900,34),0);
 assert.equal(keyboardInset(844,0,34),0);
 assert.equal(keyboardInset(844,NaN,34),0);
});
