import {File,Paths} from 'expo-file-system';import * as Sharing from 'expo-sharing';
import {AppData} from './domain';import {eventCSV} from './eventCSV';
export async function exportCSV(data:AppData){
 const f=new File(Paths.cache,'禾安事件流-'+Date.now()+'.csv');f.write(eventCSV(data.records,data.profile.name,data.settings.region==='CN'?'Asia/Shanghai':Intl.DateTimeFormat().resolvedOptions().timeZone));
 if(!await Sharing.isAvailableAsync())throw Error('SHARING_UNAVAILABLE');await Sharing.shareAsync(f.uri,{mimeType:'text/csv',UTI:'public.comma-separated-values-text',dialogTitle:'保存事件流到文件'});
}
