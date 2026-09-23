import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderPosterPNG} from './reports/renderPNG';

test('native export keeps the SVG viewport instead of enlarging only its canvas',async()=>{
 const svg={toDataURL(callback:(data:string)=>void,...options:unknown[]){
  assert.equal(options.length,0,'iOS uses view bounds for content even when output dimensions are overridden');
  callback('png-data');
 }};
 assert.equal(await renderPosterPNG(svg),'png-data');
});
test('missing renderer and empty native output do not create a shared file',async()=>{
 await assert.rejects(renderPosterPNG(null),/NOT_READY/);
 await assert.rejects(renderPosterPNG({toDataURL(callback){callback('')}}),/RENDER_FAILED/);
});
