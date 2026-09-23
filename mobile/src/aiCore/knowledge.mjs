import {newbornKnowledge} from "./newbornKnowledge.mjs";
// Curated paraphrases of AAP public guidance, not the contents of the paid handbook.
export const knowledgeCards=[
 ...newbornKnowledge,
 {id:'aap-feeding',title:'AAP：奶量与喂养节奏',url:'https://www.healthychildren.org/English/ages-stages/baby/formula-feeding/Pages/Amount-and-Schedule-of-Formula-Feedings.aspx',maxMonths:12,terms:/奶|喂|饿|formula|feed|milk/i,summary:'Feeding needs vary by infant. Respond to hunger and fullness cues; recorded intake is not necessarily total daily intake. Do not force finishing a bottle or turn population averages into a prescribed target.'},
 {id:'aap-sleep',title:'AAP：婴儿安全睡眠',url:'https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Preventing-SIDS.aspx',maxMonths:12,terms:/睡|枕|被子|趴|sleep|crib/i,summary:'Place an infant on their back for every sleep, on a firm flat sleep surface, without soft bedding or loose objects. Sleep advice must distinguish safety guidance from interpreting an incomplete sleep diary.'},
 {id:'aap-solids',title:'AAP：辅食准备与添加',url:'https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/Starting-Solid-Foods.aspx',maxMonths:36,terms:/辅食|吃饭|食物|solid|food/i,summary:'Readiness for complementary foods is generally around six months and depends on development. Start gradually with appropriate textures; breast milk or formula remains important. Do not recommend solids to a newborn based on a feeding-log question.'}
];
export function retrieveKnowledge(text,profile,now){
 const months=profile?.birthday?Math.max(0,(Date.parse(now)-Date.parse(profile.birthday+'T00:00:00Z'))/86400000/30.44):null;
 return knowledgeCards.filter(c=>c.terms.test(text)&&(months===null||months<=c.maxMonths)).sort((a,b)=>(b.priority||0)-(a.priority||0)).slice(0,4).map(({terms,...c})=>c);
}
export const knowledgePolicy=`【育儿咨询规范】
你提供育儿信息与支持，不扮演已诊疗宝宝的医生。优先利用本次parentingKnowledge、月龄、实际观察和记录趋势；资料仅为已核对的AAP公开摘要，不是《育儿百科》全书，也不是模型训练成果。
先回答用户真正关心的事，再给少量可操作步骤；只追问会改变判断的关键缺项（例如日龄、持续时间、测温方式、精神与实际进食），不要重复档案已有信息。问题涉及真实症状时，区分用户报告的事实、可能解释和仍未知的部分，不武断诊断，不根据照片开药或推剂量。
遇到呼吸明显困难、发青、难唤醒、抽搐等严重表现，先提示立即寻求当地急救；不要为了填表或记录而拖延。按提供资料处理低月龄发热等需要及时就医的情况。常规记录没有危险线索时无需附带医学警告。
引用资料须在sources返回实际使用的条目id。资料没有覆盖的具体建议要明确证据限制，不能伪造AAP出处、标准值或建议用户自行治疗。涉及当地疫苗、药品、补剂规格等差异时，说明需要当地医生或产品信息，不照搬其他地区方案。已有医生个体化建议优先，不凭一般摘要擅自改变。
讨论记录趋势时先说明具体数据支持什么；缺记录不等于实际没有发生，单次波动不等于疾病。保持温和、不责备家长；不保证绝对正常，也不要把普通问题渲染成疾病。咨询与记录可以同轮处理，但不要把你建议将来做的事保存为已发生事件。`;
