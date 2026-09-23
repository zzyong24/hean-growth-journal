// UIImagePickerController otherwise inherits an automatic flash mode on iOS.
const fs=require('fs');const path=require('path');
const file=path.join(__dirname,'../node_modules/expo-image-picker/ios/ImagePickerModule.swift');
const source=fs.readFileSync(file,'utf8');
const anchor='picker.cameraDevice = options.cameraType == .front ? .front : .rear';
if(!source.includes(anchor))throw new Error('Camera defaults patch needs review after expo-image-picker update');
if(!source.includes('picker.cameraFlashMode = .off'))fs.writeFileSync(file,source.replace(anchor,anchor+'\n      picker.cameraFlashMode = .off'));
