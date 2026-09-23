export function imagePayload(base64:string):string {
 if(!base64||!/^[A-Za-z0-9+/=]+$/.test(base64))throw new Error('IMAGE_ENCODING_FAILED');
 if(base64.length>11000000)throw new Error('IMAGE_TOO_LARGE');
 return `data:image/jpeg;base64,${base64}`;
}
