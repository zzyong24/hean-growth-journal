-- Appended to hean.lua and run with the official SDK headless simulator.
local start,tick=on_start,on_tick
local store_value,requests,saves,last_url=nil,0,0,nil
local today={year=2026,month=10,day=25,hour=19,min=30}
clock={localtime=function() return today end}
storage={load=function() return store_value end,save=function(v) saves=saves+1;store_value=v;return true end}
http={get=function(url) requests=requests+1;last_url=url;return requests end}
endpoint="https://example.test/summary";token="test-only"
local sample={date="2026-10-25",name="测试宝宝",ageDays=57,consumedMl=420,feedCount=6,preparedMl=90,leftoverMl=10,completeMilkCount=1,urinations=4,diaperChanges=4,sleepMinutes=json.null,bottlePreparedMl=json.null,cloudSyncLabel="19:30",phoneSyncLabel="10/25 19:05",version="01234567890123456789",pendingPhoneCount=1}
function on_start()
 start();assert(requests==1)
 on_http_response(1,{status=200,body=json.encode(sample)})
 assert(data.consumedMl==420 and data.sleepMinutes==nil and saves==1)
 tick(3000);assert(requests==2 and string.find(last_url,"since="))
 on_http_response(2,{status=200,body=json.encode({unchanged=true,version=sample.version})});assert(not offline and saves==1)
 tick(3000);on_http_response(3,{error={code="network_error"}});assert(offline and data.consumedMl==420 and interval==6000)
 -- Restart displays validated persistent data before the first HTTP response.
 data=nil;request_id=nil;start();assert(cached and data.consumedMl==420)
 on_http_response(requests,{status=200,body=json.encode(sample)});assert(not cached)
 tick(10000);assert(saves==1)
 sample.version="11234567890123456789";sample.consumedMl=550
 on_http_response(request_id,{status=200,body=json.encode(sample)});assert(data.consumedMl==550 and saves==2)
 today.day=26;tick(1000);assert(data==nil)
 assert(not valid({name="corrupt"}))
 -- Final screenshot of the original dashboard with an actual cache value.
 today.day=25;data=store_value;offline=true;request_id=nil;draw()
end
function on_tick() end
