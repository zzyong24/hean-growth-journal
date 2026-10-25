import test from 'node:test';
import assert from 'node:assert/strict';
import {playbackAction} from '../heanTools';
import {musicOrigin} from '../config.local';

test('only the three private family tracks can be sent to the native player',()=>{
  const base=musicOrigin+'/api/music/play/';
  const token='a'.repeat(64);
  for(const id of ['abc','lubinghua','playlist']){
    const r=playbackAction({url:base+id+'?ticket='+token,title:'untrusted title'});
    assert.equal(r.action,'music_playlist');
    if(r.action==='music_playlist'){assert.equal(r.playback,'audio_link');assert.equal(r.items[0].item_id,id);assert.equal(r.items[0].playable,1);assert.notEqual(r.items[0].name,'untrusted title');}
  }
  for(const url of ['http://127.0.0.1/private',base+'abc?ticket=bad',base+'other?ticket='+token,base+'abc?ticket='+token+'&redirect=http://example.com',base+'../abc?ticket='+token])assert.throws(()=>playbackAction({url}));
});
