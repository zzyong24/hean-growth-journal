-- Appended to hean.lua and run with the official SDK headless simulator.
local start,tick=on_start,on_tick
local store_value,requests,saves,last_url=nil,0,0,nil
local today={year=2026,month=10,day=25,hour=19,min=30}
clock={localtime=function() return today end}
storage={load=function() return store_value and json.decode(json.encode(store_value)) end,save=function(v)
 local count=0;for k,x in pairs(v) do count=count+1;assert(type(x)~="table");if type(x)=="string" then assert(#x<=256) end end
 assert(count<=32 and #json.encode(v)<=1024)
 saves=saves+1;store_value=json.decode(json.encode(v));return true
end}
http={get=function(url) requests=requests+1;last_url=url;return requests end}
endpoint="https://example.test/summary";token="test-only"
local sample={date="2026-10-25",name="测试宝宝",ageDays=57,consumedMl=420,feedCount=6,preparedMl=90,leftoverMl=10,completeMilkCount=1,urinations=4,diaperChanges=4,sleepMinutes=json.null,bottlePreparedMl=json.null,cloudSyncLabel="19:30",phoneSyncLabel="10/25 19:05",version="01234567890123456789",pendingPhoneCount=1}
sample.trend={startDate="2026-10-19",endDate=sample.date,milkMl={json.null,380,400,0,390,510,420},sleepMinutes={120,60,json.null,180,95,150,json.null},diaperChanges={2,4,0,json.null,5,3,4}}
function on_start()
 start();assert(requests==1)
 on_http_response(1,{status=200,body=json.encode(sample)})
 assert(data.consumedMl==420 and data.sleepMinutes==nil and saves==1)
 tick(3000);assert(requests==2 and string.find(last_url,"since="))
 on_http_response(2,{status=200,body=json.encode({unchanged=true,version=sample.version})});assert(not offline and saves==1)
 tick(3000);on_http_response(3,{error={code="network_error"}});assert(offline and data.consumedMl==420 and interval==6000)
 -- Restart displays validated persistent data before the first HTTP response.
 data=nil;request_id=nil;start();assert(cached and data.consumedMl==420 and data.trend.milkMl[2]==380 and data.trend.milkMl[1]==json.null)
 on_http_response(requests,{status=200,body=json.encode(sample)});assert(not cached)
 tick(10000);assert(saves==1)
 sample.version="11234567890123456789";sample.consumedMl=550
 on_http_response(request_id,{status=200,body=json.encode(sample)});assert(data.consumedMl==550 and saves==2)
 today.day=26;tick(1000);assert(data==nil)
 assert(not valid({name="corrupt"}))
 -- Every page renders within the real SDK limits, and only the function key cycles.
 today.day=25;data=sample;page=1;on_button_click("unrelated");assert(page==1)
 local before_pages=requests;elapsed=10000;request_id=nil
 for i=1,5 do assert(page==i);draw();on_button_click("function") end;assert(page==1 and requests==before_pages)
 local invalid=json.decode(json.encode(sample));invalid.trend.milkMl[1]=-1;assert(not valid(invalid))
 invalid.trend.milkMl[1]=false;assert(not valid(invalid));invalid.trend.milkMl[1]=json.null;invalid.trend.endDate="2026-10-24";assert(not valid(invalid))
 -- Lost trend cache must fetch a full payload rather than remain stuck on unchanged.
 store_value.t_milkMl="corrupt";data=nil;request_id=nil;start();assert(data and not data.trend and not string.find(last_url,"since="))
 save_elapsed=10000;local before_repair=saves
 on_http_response(requests,{status=200,body=json.encode(sample)});assert(data.trend.milkMl[2]==380 and saves==before_repair+1)
 assert(json.decode(store_value.t_milkMl)[2]==380)
 data=nil;request_id=nil;start();assert(data.trend.milkMl[2]==380 and string.find(last_url,"since="))
 -- The full cache, including seven days, fits the device even at numeric bounds.
 local ordinary=data;data=json.decode(json.encode(sample));data.name="一二三四五六七八";data.phoneSyncLabel=string.rep("x",40)
 for i=3,12 do data[fields[i]]=1000000 end
 for _,key in ipairs(trend_fields) do for i=1,7 do data.trend[key][i]=1000000 end end
 saved_version=nil;save_elapsed=10000;local before=saves;persist();assert(saves==before+1)
 data=ordinary
 -- Final screenshot of the original dashboard with an actual cache value.
 today.day=25;offline=true;request_id=nil;page=1;draw()
end
function on_tick() end
