const {withEntitlementsPlist}=require('expo/config-plugins');
// Local scheduled reminders do not register with APNs.
module.exports=config=>withEntitlementsPlist(config,config=>{delete config.modResults['aps-environment'];return config});
