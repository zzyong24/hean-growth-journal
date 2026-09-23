const {withXcodeProject}=require('expo/config-plugins');
const fs=require('fs'),path=require('path');
module.exports=config=>withXcodeProject(config,config=>{
 const name=config.modRequest.projectName,p=config.modResults;
 for(const file of ['HeanCamera.swift','HeanCamera.m']){
  fs.copyFileSync(path.join(__dirname,'../native',file),path.join(config.modRequest.platformProjectRoot,name,file));
  if(!p.hasFile(`${name}/${file}`))p.addSourceFile(`${name}/${file}`,{target:p.getFirstTarget().uuid},p.getFirstProject().firstProject.mainGroup);
 }
 return config;
});
