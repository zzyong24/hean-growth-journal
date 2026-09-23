#import <React/RCTBridgeModule.h>
@interface RCT_EXTERN_MODULE(HeanCamera, NSObject)
RCT_EXTERN_METHOD(capture:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
