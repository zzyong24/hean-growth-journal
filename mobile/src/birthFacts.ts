import {Solar} from "lunar-javascript";
const animals=['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const animalEN=['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'];
const animalIcons=['🐭','🐮','🐯','🐰','🐲','🐍','🐴','🐑','🐵','🐔','🐶','🐷'];
const signs=['摩羯座','水瓶座','双鱼座','白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座'];
const signEN=['Capricorn','Aquarius','Pisces','Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn'];
const glyphs=['♑','♒','♓','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑'];
export function birthFacts(birthday:string,lang='zh') {
 const d=new Date(birthday+'T12:00:00Z');if(!Number.isFinite(d.getTime()))return null;
 const month=d.getUTCMonth(),day=d.getUTCDate();const sign=month+(day>=[20,19,21,20,21,22,23,23,23,24,23,22][month]?1:0);
 let lunar='',animal='',icon='',animalIndex=0;
 try {const l=Solar.fromYmd(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate()).getLunar();lunar=`${l.getYearInGanZhi()}年${l.getMonthInChinese()}月${l.getDayInChinese()}`;animalIndex=animals.indexOf(l.getYearShengXiao());animal=(lang==='zh'?animals:animalEN)[animalIndex];icon=animalIcons[animalIndex];}catch{}

 return {lunar,animal,icon,animalIndex,signIndex:sign%12,sign:(lang==='zh'?signs:signEN)[sign],glyph:glyphs[sign]};
}
