import {Asset} from 'expo-asset';
import {File} from 'expo-file-system';
import {PosterStyle} from './styles';
export type {PosterStyle} from './styles';
const sources={forest:require('../../assets/brand/report-forest.png'),lotus:require('../../assets/brand/report-lotus.png'),snow:require('../../assets/brand/report-snow.png'),peach:require('../../assets/brand/report-peach.png'),cloud:require('../../assets/brand/report-cloud.png'),lemon:require('../../assets/brand/report-lemon.png'),garden:require('../../assets/brand/report-garden.png'),night:require('../../assets/brand/report-night.png'),sea:require('../../assets/brand/report-sea.png'),harvest:require('../../assets/brand/report-harvest.png'),sage:require('../../assets/brand/report-sage.png'),apricot:require('../../assets/brand/report-apricot.png'),logo:require('../../assets/brand/hean-wordmark.png')};
const cache=new Map<string,Promise<string>>();
function data(key:keyof typeof sources){if(!cache.has(key))cache.set(key,(async()=>{const asset=await Asset.fromModule(sources[key]).downloadAsync();return 'data:image/png;base64,'+await new File(asset.localUri||asset.uri).base64()})().catch(e=>{cache.delete(key);throw e}));return cache.get(key)!;}
export async function artwork(style:PosterStyle){const [background,logo]=await Promise.all([data(style),data('logo')]);return {background,logo};}
