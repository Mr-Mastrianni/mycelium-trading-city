import {onTick} from './paper.js';
const LIMIT=10000;
function records(text){
 const first=text.split(/\r?\n/).find(x=>x.trim())||'',delimiter=first.includes('\t')?'\t':first.includes(';')?';':',';
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){let ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}
 else if(!quoted&&(ch===delimiter||ch==='\n')){row.push(field.trim());field='';if(ch==='\n'){if(row.some(Boolean))rows.push(row);row=[]}}
 else if(ch!=='\r')field+=ch;
 }if(quoted)throw new Error('Unclosed CSV quote');row.push(field.trim());if(row.some(Boolean))rows.push(row);return rows;
}
function wallTime(stamp,zone){
 const match=stamp.match(/^(\d{4})[-/.]?(\d{2})[-/.]?(\d{2})[ T](\d{2}):?(\d{2})(?::?(\d{2}))?$/);
 if(!match)throw new Error('Use ISO timestamps with an offset, Unix timestamps, or YYYY-MM-DD HH:mm:ss');
 const [y,m,d,h,mi,s]=match.slice(1).map(Number),desired=Date.UTC(y,m-1,d,h,mi,s||0);
 const check=new Date(desired);if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d||h>23||mi>59||(s||0)>59)throw new Error('Invalid calendar date or clock time');
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const local=t=>{const p=Object.fromEntries(fmt.formatToParts(new Date(t)).map(p=>[p.type,p.value]));return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)};
 let result=desired;for(let i=0;i<4;i++)result+=desired-local(result);
 if(local(result)!==desired)throw new Error('Timestamp falls in a daylight-saving gap');
 if(local(result-3600000)===desired||local(result+3600000)===desired)throw new Error('Ambiguous daylight-saving timestamp: use an explicit UTC offset');
 return result;
}
export function parseTime(value,zone='UTC'){
 const s=String(value).trim();let t;
 if(/^\d{10,19}$/.test(s)){const n=Number(s);t=s.length<=10?n*1000:s.length<=13?n:s.length<=16?n/1000:n/1e6}
 else if(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(s))t=Date.parse(s);
 else t=wallTime(s,zone);
 if(!Number.isFinite(t)||t<Date.UTC(2000,0,1)||t>Date.now()+86400000)throw new Error('Timestamp is outside the supported historical range');return t;
}
export function parseCSV(text,{contract,source='Personal CSV export',timezone='UTC',id=''}={}){
 if(typeof text!=='string'||text.length>10*1024*1024)throw new Error('Choose a CSV smaller than 10 MB');
 contract=String(contract||'').trim().toUpperCase();
 if(!/^ES[HMUZ]\d{1,4}$/.test(contract))throw new Error('Enter the specific ES contract, for example ESZ26. Continuous and Micro contracts are not supported.');
 const rows=records(text.replace(/^\uFEFF/,'')),header=rows.shift()?.map(x=>x.toLowerCase().replace(/[\s_-]+/g,''))||[];
 const column=(...names)=>names.map(n=>header.indexOf(n)).find(n=>n>=0)??-1;
 const ix={time:column('timestamp','tsevent','datetime','time','date'),open:column('open'),high:column('high'),low:column('low'),close:column('close','last'),volume:column('volume','vol'),symbol:column('symbol','contract')};
 if(['time','open','high','low','close'].some(k=>ix[k]<0))throw new Error('CSV needs timestamp (or time/date), open, high, low and close headers');
 if(rows.length<50||rows.length>LIMIT)throw new Error('Import between 50 and 10,000 one-minute candles');
 const dateIx=column('date'),timeIx=column('time');let last=-Infinity,gaps=0;
 const bars=rows.map((r,i)=>{
  try{
   let raw=r[ix.time];if(dateIx>=0&&timeIx>=0&&dateIx!==timeIx)raw=r[dateIx]+' '+r[timeIx];
   const t=parseTime(raw,timezone);if(t<=last)throw new Error('Candles must be chronological with no duplicate timestamps');
   if(t%60000!==0)throw new Error('Candles must be aligned to the start of a minute');if(t-last>60000&&last!==-Infinity)gaps++;
   last=t;const bar={time:new Date(t).toISOString(),complete:true};
   for(const k of ['open','high','low','close']){if(!String(r[ix[k]]||'').trim())throw new Error('Missing '+k);bar[k]=Number(r[ix[k]]);if(!onTick(bar[k]))throw new Error(k+' is not a positive ES quarter-point price')}
   if(bar.high<Math.max(bar.open,bar.close,bar.low)||bar.low>Math.min(bar.open,bar.close,bar.high))throw new Error('OHLC prices are inconsistent');
   bar.volume=ix.volume>=0?Number(r[ix.volume]):0;if(!Number.isFinite(bar.volume)||bar.volume<0)throw new Error('Invalid volume');
   if(ix.symbol>=0&&String(r[ix.symbol]).trim().toUpperCase()!==contract)throw new Error('CSV symbol does not match '+contract+'; export one contract at a time');return bar;
  }catch(e){throw new Error('Row '+(i+2)+': '+e.message)}
 });
 return {id:id||crypto.randomUUID(),contract,source:String(source).trim().slice(0,120)||'Personal CSV export',kind:'imported',timezone,interval:'1m',gaps,bars,importedAt:new Date().toISOString()};
}
export function aggregate(input,minutes){
 if(minutes===1)return input;const groups=new Map();
 for(const b of input){const t=Date.parse(b.time),key=Math.floor(t/(minutes*60000))*minutes*60000;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(b)}
 return [...groups.entries()].flatMap(([t,b])=>{
  if(b.length!==minutes||Date.parse(b[0].time)!==t||b.some((v,i)=>Date.parse(v.time)!==t+i*60000))return [];
  return [{time:new Date(t).toISOString(),open:b[0].open,high:Math.max(...b.map(x=>x.high)),low:Math.min(...b.map(x=>x.low)),close:b.at(-1).close,volume:b.reduce((n,x)=>n+(x.volume||0),0),complete:true}];
 });
}
