const {withDangerousMod}=require('expo/config-plugins');
const fs=require('fs');const path=require('path');
module.exports=config=>withDangerousMod(config,['ios',async config=>{
 const file=path.join(config.modRequest.platformProjectRoot,'ExpoWidgetsTarget','BabyToday.swift');
 let source=fs.readFileSync(file,'utf8');
 if(!source.includes('.containerBackground('))source=source.replace('WidgetsEntryView(entry: entry)',"if #available(iOS 17.0, *) {\n        WidgetsEntryView(entry: entry)\n          .containerBackground(Color(red: 0.969, green: 0.961, blue: 0.918), for: .widget)\n      } else {\n        WidgetsEntryView(entry: entry)\n      }");
 fs.writeFileSync(file,source);return config;
}]);
