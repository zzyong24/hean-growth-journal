import React from 'react';
import Svg,{Path,Circle,Rect,Ellipse,G} from 'react-native-svg';
import {Kind} from './domain';
// Each glyph shares a 48-unit optical box and rounded 1.8-unit strokes.
const palette:Record<Kind,[string,string]>={note:['#A66B50','#F5DBC8'],bottle:['#B88442','#F6E3B9'],nursing:['#AD7184','#F4DCE4'],pumping:['#648D98','#D8EBED'],food:['#BB8553','#F7E5BD'],diaper:['#658D85','#D7EAE1'],sleep:['#8A7CAB','#E7DFF4'],weight:['#6D8E8A','#DBEBE5'],height:['#A28A58','#F1E7C9'],head:['#8F7B9E','#E9DFF0'],temperature:['#BA7470','#F7DFD9'],medicine:['#708C9D','#DDE8F1'],supplement:['#9C9157','#EDEACB']};
export function CareGlyph({kind,size=44}:{kind:Kind;size?:number}){
 const [ink,fill]=palette[kind];
 const shapes:Record<Kind,React.ReactNode>={
 note:<><Rect x="9" y="10" width="27" height="30" rx="5" fill={fill}/><Path d="M15 10v30M19 30l2-7 14-14 5 5-14 14-7 2Z" fill="#FFFCF6"/><Path d="m32 12 5 5M6 17h6M6 24h6M6 31h6"/></>,
 bottle:<><Path d="M21 6h6v5l4 4v4H17v-4l4-4Z" fill={fill}/><Rect x="14" y="19" width="20" height="23" rx="6" fill="#FFFCF6"/><Path d="M15 28h18v7a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6Z" fill={fill}/><Path d="M25 24h5M27 29h3M25 34h5"/></>,
 nursing:<><Circle cx="20" cy="12" r="6" fill={fill}/><Path d="M10 39c-1-10 0-19 9-19 5 0 8 4 10 9l8 3-5 9Z" fill={fill}/><Ellipse cx="28" cy="31" rx="12" ry="7" transform="rotate(-20 28 31)" fill="#FFFCF6"/><Circle cx="35" cy="26" r="4" fill={fill}/><Path d="m13 29 9 7 12-2"/></>,
 pumping:<><Path d="M10 10h12v8l-5 6H9v-8Z" fill={fill}/><Rect x="8" y="24" width="15" height="18" rx="4" fill="#FFFCF6"/><Path d="M9 32h13M23 13h8c6 0 7 5 7 9v5"/><Rect x="30" y="27" width="13" height="13" rx="4" fill={fill}/><Circle cx="36.5" cy="33.5" r="2" fill="#FFFCF6"/></>,
 food:<><Path d="M7 25h31c0 10-6 16-15 16S7 35 7 25Z" fill={fill}/><Path d="M6 25h33M15 42h17M28 24l8-14"/><Ellipse cx="37" cy="9" rx="4" ry="6" transform="rotate(25 37 9)" fill={fill}/><Path d="M15 18c-4-4 3-4 0-8M23 18c-4-4 3-4 0-8"/></>,
 diaper:<><Path d="M7 13h34l-3 14-9 14H19L10 27Z" fill={fill}/><Path d="M7 13h34v7H7ZM10 24c7 0 10 6 9 16M38 24c-7 0-10 6-9 16" fill="#FFFCF6"/><Path d="M21 26c0-3 6-3 6 0s-3 5-3 5-3-2-3-5Z"/></>,
 sleep:<><Path d="M29 7a17 17 0 1 0 12 25C24 37 16 20 29 7Z" fill={fill}/><Path d="m36 9 1.5 4.5L42 15l-4.5 1.5L36 21l-1.5-4.5L30 15l4.5-1.5Z" fill="#F4E5BA"/><Circle cx="42" cy="26" r="1"/></>,
 weight:<><Rect x="8" y="10" width="32" height="32" rx="8" fill={fill}/><Path d="M15 17q9-8 18 0l-3 9H18Z" fill="#FFFCF6"/><Path d="m24 23 4-7M15 34h4M29 34h4"/></>,
 height:<><Rect x="15" y="6" width="18" height="36" rx="4" fill={fill}/><Path d="M16 12h9M16 18h5M16 24h9M16 30h5M16 36h9"/></>,
 head:<><Circle cx="24" cy="23" r="14" fill={fill}/><Path d="M10 21c8 5 20 5 28 0M13 27c7 4 15 4 22 0M21 10c-2-6 6-7 6-3M19 20v3M29 20v3M21 33q3 3 6 0"/><Path d="M37 23v15h-6"/></>,
 temperature:<><Path d="M20 27V10a5 5 0 0 1 10 0v17a9 9 0 1 1-10 0Z" fill="#FFFCF6"/><Circle cx="25" cy="34" r="5" fill={fill}/><Path d="M25 15v19M34 13h4M34 19h3"/></>,
 medicine:<><Path d="m11 27 15-15a8 8 0 0 1 11 11L22 38a8 8 0 0 1-11-11Z" fill="#FFFCF6"/><Path d="m11 27 7-7 11 11-7 7a8 8 0 0 1-11-11Z" fill={fill}/><Path d="m28 15 3-1M35 37v8M31 41h8"/></>,
 supplement:<><Rect x="15" y="6" width="18" height="9" rx="3" fill={fill}/><Rect x="11" y="15" width="26" height="27" rx="6" fill="#FFFCF6"/><Rect x="12" y="23" width="24" height="13" rx="2" fill={fill}/><Path d="M24 25v9M19.5 29.5h9"/></>,
 };
 return <Svg width={size} height={size} viewBox="0 0 48 48"><G stroke={ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none">{shapes[kind]}</G></Svg>;
}
