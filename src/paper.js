export const TICK=.25, MULTIPLIER=50;
export const DEFAULTS={initialBalance:25000,maxContracts:2,maxRisk:500,marginPerContract:5000,feePerSide:2.5,slippageTicks:1};
export const active=o=>o.status==='working'||o.status==='filled';
const signed=o=>o.side==='short'?-1:1;
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
export const onTick=n=>Number.isFinite(n)&&n>0&&Math.abs(n/TICK-Math.round(n/TICK))<1e-7;
export function account(orders,mark,settings=DEFAULTS){
 const cfg={...DEFAULTS,...settings};
 const realized=round(orders.reduce((n,o)=>n+(o.realizedGross||0)-(o.fees||0),0));
 const unrealized=round(orders.filter(o=>o.status==='filled').reduce((n,o)=>n+(mark-o.fillPrice)*signed(o)*MULTIPLIER*o.openQty,0));
 const committed=orders.filter(active).reduce((n,o)=>n+(o.status==='filled'?o.openQty:o.qty),0);
 const balance=round(cfg.initialBalance+realized),equity=round(balance+unrealized),margin=committed*cfg.marginPerContract;
 return {balance,equity,realized,unrealized,margin,available:round(equity-margin),committed};
}
export function validateOrder(o,orders,bar,settings=DEFAULTS,paused=false){
 const c={...DEFAULTS,...settings},e=[];
 if(paused)e.push('New paper orders are paused');
 if(!['long','short'].includes(o.side))e.push('Choose long or short');
 if(!['market','limit','stop'].includes(o.type))e.push('Choose market, limit or stop entry');
 if(!Number.isInteger(o.qty)||o.qty<1||o.qty>c.maxContracts)e.push('Choose 1–'+c.maxContracts+' whole contracts');
 const ref=o.type==='market'?bar?.close:o.entry;
 if(![ref,o.stop,o.target].every(onTick))e.push('All prices must be positive ES quarter-point ticks');
 const s=signed(o);
 if(!((ref-o.stop)*s>0&&(o.target-ref)*s>0))e.push('Stop and target must bracket the entry in your trade direction');
 if(Math.abs(ref-o.stop)*MULTIPLIER*o.qty>c.maxRisk)e.push('Planned stop risk exceeds $'+c.maxRisk);
 const a=account(orders,bar?.close||ref,c);
 if(a.committed+o.qty>c.maxContracts)e.push('Working and open orders exceed the contract limit');
 if(a.available<o.qty*(c.marginPerContract+c.feePerSide))e.push('Insufficient simulated buying power');
 return e;
}
export function newOrder(input,orders,bar,settings,meta={}){
 const errors=validateOrder(input,orders,bar,settings,meta.paused);if(errors.length)throw new Error(errors.join('. '));
 return {...input,id:meta.id||crypto.randomUUID(),entry:input.type==='market'?bar.close:input.entry,status:'working',created:bar.time,sessionId:meta.sessionId||'',datasetId:meta.datasetId||'',contract:meta.contract||'ES',openQty:0,fees:0,realizedGross:0,fills:[],note:String(input.note||'').slice(0,1000)};
}
export function cancelOrder(o){if(o.status!=='working')throw new Error('Only a working order can be cancelled');return {...o,status:'cancelled',reason:'Cancelled by you'}}
export function requestClose(o,qty=o.openQty){if(o.status!=='filled'||!Number.isInteger(qty)||qty<1||qty>o.openQty)throw new Error('Invalid close quantity');return {...o,closeQty:qty}}
function exit(o,price,qty,time,reason,cfg){
 const realizedGross=round(o.realizedGross+(price-o.fillPrice)*signed(o)*MULTIPLIER*qty),fees=round(o.fees+qty*cfg.feePerSide),openQty=o.openQty-qty;
 return {...o,openQty,realizedGross,fees,pnl:round(realizedGross-fees),exit:price,status:openQty?'filled':'closed',closedAt:openQty?undefined:time,reason,closeQty:undefined,fills:[...o.fills,{kind:'exit',price,qty,time,reason}]};
}
export function advanceOrders(orders,bar,settings=DEFAULTS){
 const c={...DEFAULTS,...settings},slip=c.slippageTicks*TICK;
 let result=orders.map(o=>({...o,fills:[...(o.fills||[])]}));
 // Existing positions exit before new orders compete for buying power at this bar.
 for(let i=0;i<result.length;i++){
  let o=result[i];if(o.status!=='filled'||bar.time<=o.created)continue;
  const s=signed(o),stopOpen=(bar.open-o.stop)*s<=0,targetOpen=(bar.open-o.target)*s>=0;
  if(stopOpen)o=exit(o,bar.open-s*slip,o.openQty,bar.time,'Stop gap',c);
  else if(o.closeQty)o=exit(o,bar.open-s*slip,o.closeQty,bar.time,'Manual close',c);
  else if(targetOpen)o=exit(o,o.target,o.openQty,bar.time,'Target',c);
  if(o.status==='filled'){
   const stopHit=s===1?bar.low<=o.stop:bar.high>=o.stop,targetHit=s===1?bar.high>=o.target:bar.low<=o.target;
   if(stopHit)o=exit(o,o.stop-s*slip,o.openQty,bar.time,targetHit?'Stop first: ambiguous candle':'Stop',c);
   else if(targetHit)o=exit(o,o.target,o.openQty,bar.time,'Target',c);
  }result[i]=o;
 }
 for(let i=0;i<result.length;i++){
  let o=result[i];if(o.status!=='working'||bar.time<=o.created)continue;
  const s=signed(o);let price=null,atOpen=false;
  if(o.type==='market'){price=bar.open+s*slip;atOpen=true}
  if(o.type==='limit'){
   if((bar.open-o.entry)*s<=0){price=bar.open;atOpen=true}
   else if(s===1?bar.low<=o.entry:bar.high>=o.entry)price=o.entry;
  }
  if(o.type==='stop'){
   if((bar.open-o.entry)*s>=0){price=bar.open+s*slip;atOpen=true}
   else if(s===1?bar.high>=o.entry:bar.low<=o.entry)price=o.entry+s*slip;
  }
  if(price===null)continue;
  const others=result.filter((_,j)=>j!==i),a=account(others,bar.open,c);
  if((price-o.stop)*s<=0||(o.target-price)*s<=0||Math.abs(price-o.stop)*MULTIPLIER*o.qty>c.maxRisk||a.available<o.qty*(c.marginPerContract+c.feePerSide)){
   result[i]={...o,status:'rejected',reason:'Opening price or buying power no longer fits this bracket and risk limit'};continue;
  }
  o={...o,status:'filled',fillPrice:price,filledAt:bar.time,openQty:o.qty,fees:round(c.feePerSide*o.qty),fills:[{kind:'entry',price,qty:o.qty,time:bar.time,reason:o.type}]};
  const stopHit=s===1?bar.low<=o.stop:bar.high>=o.stop,targetHit=s===1?bar.high>=o.target:bar.low<=o.target;
  if(stopHit)o=exit(o,o.stop-s*slip,o.openQty,bar.time,'Entry-bar stop: conservative assumption',c);
  else if(atOpen&&targetHit)o=exit(o,o.target,o.openQty,bar.time,'Target',c);
  // An intrabar target may have occurred before entry, so wait for the next candle.
  result[i]=o;
 }
 return result;
}
export function metrics(orders){const closed=orders.filter(o=>o.status==='closed'),wins=closed.filter(o=>o.pnl>0),losses=closed.filter(o=>o.pnl<0),profit=wins.reduce((n,o)=>n+o.pnl,0),loss=-losses.reduce((n,o)=>n+o.pnl,0);return {trades:closed.length,winRate:closed.length?wins.length/closed.length:0,profitFactor:loss?profit/loss:null,net:round(closed.reduce((n,o)=>n+o.pnl,0))}}
