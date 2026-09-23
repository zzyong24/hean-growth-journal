import {portraitPrompt} from '../mobile/src/aiCore/portraitPrompt.mjs';
export function validateCreative(body){return body && (body.feedback===undefined||(typeof body.feedback==='string'&&body.feedback.length<=2000)) && (body.previousImage===undefined||validImage(body.previousImage)) && ['baby','family'].includes(body.mode) && Array.isArray(body.subjects) && body.subjects.length===(body.mode==='family'?3:1) && body.subjects.every((x,i)=>x.role===['baby','father','mother'][i]&&validImage(x.data)) && validImage(body.reference);}
function validImage(s){return typeof s==='string'&&s.length<16000000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s);}
export async function createPortrait(body,signal,promptOverride){
 if(!validateCreative(body))throw new Error('INVALID_INPUT');
 if(!process.env.DUDU_IMAGE_API_KEY)throw new Error('IMAGE_NOT_CONFIGURED');
 const form=new FormData();form.set('model',process.env.DUDU_IMAGE_MODEL||'gpt-image-2');form.set('n','1');form.set('size','1024x1536');
 form.set('prompt',promptOverride||portraitPrompt(body));
 for(const [i,data] of [...body.subjects.map(s=>s.data),...(body.previousImage?[body.previousImage]:[]),body.reference].entries()){const [prefix,b64]=data.split(',');const mime=prefix.slice(5,-7);form.append('image[]',new Blob([Buffer.from(b64,'base64')],{type:mime}),`input-${i}.${mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'}`);}
 const r=await fetch(`${(process.env.DUDU_BASE_URL||'https://dudu.mom/v1').replace(/\/$/,'')}/images/edits`,{method:'POST',headers:{Authorization:`Bearer ${process.env.DUDU_IMAGE_API_KEY}`},body:form,signal:AbortSignal.any([signal,AbortSignal.timeout(240000)])});
 if(!r.ok){await r.body?.cancel();throw new Error(`IMAGE_PROVIDER_${r.status}`);}
 const j=await r.json();const b64=j.data?.[0]?.b64_json;if(typeof b64!=='string'||b64.length>50000000||!/^[A-Za-z0-9+/=]+$/.test(b64))throw new Error('INVALID_IMAGE_RESPONSE');return {image:`data:image/png;base64,${b64}`};
}

export function validateReportBackground(body){return body&&validImage(body.photo)&&validImage(body.reference)&&['day','week','month'].includes(body.period);}
export async function createReportBackground(body,signal){
 if(!validateReportBackground(body))throw new Error('INVALID_INPUT');
 return createPortrait({mode:'baby',subjects:[{role:'baby',data:body.photo}],reference:body.reference},signal,
 `Create a unique text-free background for a baby growth diary poster, portrait 2:3. First image is the user's real recorded photograph. Preserve the identity, age, facial features and body proportions of all people in that photo; do not invent people or change the baby's appearance. Second image is an editorial watercolor PAPER AND PALETTE reference only: never copy its baby/person. Integrate the real photographed moment as a soft photographic collage in the bottom right third, with tasteful watercolor botanical edging and tactile pale rice-paper texture. Upper 70 percent must remain nearly blank very pale paper for accurately overlaid data and Chinese typography. No text, no digits, no charts, no logos, no watermark. If first image is a handwritten log, document, screenshot or contains no baby, do NOT fabricate a baby or reproduce its writing; create a quiet botanical still life inspired by its colors instead. Follow the second image’s color palette and seasonal motifs, with elegant Chinese editorial poster composition. This is a ${body.period} keepsake. One image only.`);
}
