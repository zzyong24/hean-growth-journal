import {test} from 'node:test';import assert from 'node:assert/strict';
import {buildReport,reportRange} from './reports/model';
import {CareRecord} from './domain';
const row=(id:string,kind:CareRecord['kind'],at:string,value?:number,details?:CareRecord['details']):CareRecord=>({id,kind,at,value,details,note:'',sourceText:''});
test('calendar week starts Monday and month respects leap days',()=>{assert.equal(reportRange('week','2024-03-03').start.getDate(),26);assert.equal(reportRange('month','2024-02-12').days,29)});
test('report clips and unions sleep, separates pumping and dirty diapers, missing is null',()=>{
 const rows=[row('s','sleep','2024-03-02T01:00:00',120),row('s2','sleep','2024-03-02T00:30:00',30),row('b','bottle','2024-03-01T12:00:00',90),row('p','pumping','2024-03-01T13:00:00',200),row('d','diaper','2024-03-01T13:00:00',undefined,{diaperType:'mixed'})];
 const r=buildReport(rows,'day','2024-03-01',new Date('2024-03-03T12:00:00'));
 assert.equal(r.milk,90);assert.equal(r.sleep,60);assert.equal(r.stools,1);assert.equal(r.wet,1);assert.equal(r.nursing,null);
 assert.equal(buildReport([],'day','2024-03-01').milk,null);
});
test('future entries excluded and coverage reflects recorded days only',()=>{const r=buildReport([row('a','bottle','2024-03-01T10:00:00',50),row('future','bottle','2024-03-02T10:00:00',90)],'month','2024-03-01',new Date('2024-03-01T12:00:00'));assert.equal(r.milk,50);assert.equal(r.coveredDays,1);assert.equal(r.elapsedDays,1)});
import {poster} from './reports/poster';
test('poster escapes private text, includes only selected moments and embeds local thumbnail',()=>{
 const record={...row('note','note','2024-03-01T10:00:00'),note:'洗澡 & 开心 <3',attachments:[{id:'pic',type:'image' as const,mime:'image/png',name:'photo'}]};
 const report=buildReport([record],'day','2024-03-01',new Date('2024-03-02T12:00:00'));
 const image='data:image/png;base64,AA==';const result=poster(report,'宝宝 <一>','day',true,[record],{pic:image});
 assert.ok(result.xml.includes('宝宝 &lt;一&gt;'));assert.ok(result.xml.includes(image));assert.ok(result.xml.includes('洗澡 &amp; 开心 &lt;3'));assert.ok(!poster(report,'宝宝','day',true,[],{}).xml.includes('洗澡'));assert.ok(result.height>1000);
});
test('personalized cover uses the chosen real photo and removes poster disclaimers',()=>{const r=buildReport([],'day','2024-03-01');const xml=poster(r,'宝宝','day',true,[],{},{background:'data:image/png;base64,BG',logo:'data:image/png;base64,LOGO',cover:'data:image/png;base64,PHOTO'}).xml;assert.ok(xml.includes('data:image/png;base64,PHOTO'));assert.ok(!xml.includes('不据此判断'));assert.ok(!xml.includes('记录不代表全天'));assert.ok(xml.includes('禾安成长日记'));});
import {styleForReport,posterStyles} from './reports/styles';
test('twelve hidden styles rotate by date and regeneration without changing data',()=>{assert.equal(posterStyles.length,12);assert.equal(new Set(Array.from({length:12},(_,i)=>styleForReport('2024-03-01','day',i))).size,12);assert.notEqual(styleForReport('2024-03-01','day'),styleForReport('2024-03-02','day'));assert.equal(styleForReport('2024-03-01','month'),styleForReport('2024-03-12','month'));});
test('moment timestamps show seconds without inventing time for date-only events',()=>{
 const exact={...row('a','note','2024-03-01T10:23:45'),note:'洗澡'};
 const day={...row('b','note','2024-03-01T12:00:00'),timePrecision:'day' as const};
 const report=buildReport([exact,day],'day','2024-03-01',new Date('2024-03-02'));
 const xml=poster(report,'宝宝','day',true,[exact,day],{}).xml;
 assert.ok(xml.includes('2024-03-01 10:23:45'));assert.ok(!xml.includes('12:00:00'));
});
test('portrait moments retain their full aspect ratio and report footer links to public source',()=>{
 const record={...row('pic','note','2024-03-01T10:00:00'),attachments:[{id:'photo',type:'image' as const,mime:'image/jpeg',name:'photo'}]};
 const report=buildReport([record],'day','2024-03-01',new Date('2024-03-02'));
 const result=poster(report,'宝宝','day',true,[record],{photo:'data:image/jpeg;base64,AA=='},undefined,{photo:{width:600,height:1200}});
 assert.ok(result.xml.includes('height="1280" preserveAspectRatio="xMidYMid meet"'));
 assert.ok(result.xml.includes('github.com/zzyong24/hean-growth-journal'));
 assert.ok(!result.xml.includes('App Store'));
 assert.ok(!result.xml.includes('<g transform="translate(40 '));
 assert.equal((result.xml.match(/<svg/g)||[]).length,1);
});
