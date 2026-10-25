/** Approximate finite UI values; never round a nonzero tiny value to zero. */
export function formatLorenzValue(value:number):string{
 if(value===0)return '0'; // Includes negative zero.
 if(Math.abs(value)<1e-5){
  const [mantissa,exponent]=value.toExponential(5).split('e');
  return `${Number(mantissa)}e${exponent}`;
 }
 return Number(value.toFixed(5)).toString();
}
