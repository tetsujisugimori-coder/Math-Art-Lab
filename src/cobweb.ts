/** A single market, naive expectations and one-period production lag.
 * Q is horizontal, P vertical. All quantities are illustrative model units. */
export type Market = {a:number; b:number; c:number; d:number; initialPrice:number};
export type MarketPoint = {price:number; quantity:number};
export type MarketStep = {period:number; from:MarketPoint; supply:MarketPoint; to:MarketPoint};
export const presets = {
  stable:{name:'安定市場 · 静まる糸', b:1, d:0.65, initialPrice:40},
  cycle:{name:'境界市場 · 往復する糸', b:1, d:1, initialPrice:40},
  unstable:{name:'不安定市場 · ほどける糸', b:1, d:1.2, initialPrice:50},
} as const;
export type PresetId = keyof typeof presets;
export function preset(id:PresetId):Market {
  const {b,d,initialPrice}=presets[id];
  return {a:120,c:0,b,d,initialPrice};
}
export function validMarket(m:Market):boolean {
  return Object.values(m).every(Number.isFinite) && m.a===120 && m.c===0 &&
    m.b>=0.5 && m.b<=2 && m.d>=0.25 && m.d<=2 &&
    m.initialPrice>=0 && m.initialPrice<=m.a/m.b;
}
export function demand(m:Market,price:number):number {return m.a-m.b*price;}
export function supply(m:Market,price:number):number {return m.c+m.d*price;}
export function equilibrium(m:Market):MarketPoint {
  const price=(m.a-m.c)/(m.b+m.d);
  return {price,quantity:demand(m,price)};
}
export function initialPoint(m:Market):MarketPoint {
  return {price:m.initialPrice,quantity:demand(m,m.initialPrice)};
}
export function nextStep(m:Market,from:MarketPoint,period:number):MarketStep {
  const quantity=supply(m,from.price);
  return {period,from:{...from},supply:{price:from.price,quantity},to:{price:(m.a-quantity)/m.b,quantity}};
}
export function stability(m:Market):'convergent'|'cycle'|'divergent' {
  const ratio=m.d/m.b;
  return ratio===1?'cycle':ratio<1?'convergent':'divergent';
}
/** No clamping: the next mathematical result is retained for the explanation. */
export function stopReason(m:Market,step:MarketStep):string|null {
  if(![step.to.price,step.to.quantity].every(Number.isFinite))return '計算の有限精度の限界に達しました。';
  if(step.to.price<0 || step.to.quantity<0)return '次期の価格または数量が負になります。この非負の市場領域での観察を停止します。';
  if(step.to.price>m.a/m.b || step.to.quantity>m.a)return '次期の値が表示領域を超えます。観察を停止します。';
  if(step.period>240)return '観察上限の240期に達しました。初期状態へ戻して比較できます。';
  return null;
}
/** The light traces an update in two stages; it is not an intermediate market price. */
export function tracePoint(step:MarketStep,progress:number):MarketPoint {
  const f=Math.max(0,Math.min(1,progress));
  return f<=0.5?{price:step.from.price,quantity:step.from.quantity+(step.supply.quantity-step.from.quantity)*f*2}:
    {quantity:step.supply.quantity,price:step.from.price+(step.to.price-step.from.price)*(f*2-1)};
}
