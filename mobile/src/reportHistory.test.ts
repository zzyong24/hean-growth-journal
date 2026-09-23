import {test} from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {reportKey} from './reports/historyKey';
import {readPoster,writePoster} from './reports/history.web';
test('report history isolates babies and periods and normalizes month/week dates',async()=>{
 const a=reportKey('baby-a','day','2026-09-07'),b=reportKey('baby-b','day','2026-09-07');
 const poster={xml:'<svg>saved original</svg>',height:1080,saved:true,variation:4};
 await writePoster(a,poster);assert.deepEqual(await readPoster(a),poster);assert.equal(await readPoster(b),null);
 assert.equal(await readPoster(reportKey('baby-a','week','2026-09-07')),null);
 assert.equal(reportKey('a','week','2026-09-07'),reportKey('a','week','2026-09-13'));
 assert.equal(reportKey('a','month','2026-09-01'),reportKey('a','month','2026-09-30'));
 await writePoster(b,{...poster,xml:'other'});assert.deepEqual(await readPoster(a),poster);
 await writePoster(a,{...poster,xml:'regenerated',variation:5});assert.equal((await readPoster(a))?.xml,'regenerated');
});
