import {describe,it,expect} from 'vitest';
import {formatLorenzValue as fmt} from './lorenz-format';

describe('Lorenz approximate display values',()=>{
 it('preserves tiny nonzero values, including both sides of the old zero-rounding boundary',()=>{
  for(const value of [Number.MIN_VALUE,1e-12,1e-8,1.23456789e-8,4.99999e-6,5e-6,9.99999e-6])for(const sign of [1,-1]){
   const actual=sign*value,display=fmt(actual);expect(display).not.toBe('0');expect(Math.sign(Number(display))).toBe(Math.sign(actual));
   expect(Math.abs(Number(display)-actual)).toBeLessThanOrEqual(Math.max(Number.MIN_VALUE,Math.abs(actual)*5e-6));
  }
  expect(fmt(1e-8)).toBe('1e-8');expect(fmt(-1e-8)).toBe('-1e-8');expect(fmt(1.23456789e-8)).toBe('1.23457e-8');
 });
 it('keeps the standard delta and ordinary values in familiar decimal form',()=>{
  for(const [value,display] of [[1e-5,'0.00001'],[-1e-5,'-0.00001'],[.1,'0.1'],[1,'1'],[10,'10'],[8/3,'2.66667'],[-9.37857128994133,'-9.37857'],[59.995,'59.995']] as const)expect(fmt(value)).toBe(display);
 });
 it('distinguishes true zero from a tiny signed value without negative zero',()=>{
  expect(fmt(0)).toBe('0');expect(fmt(-0)).toBe('0');expect(fmt(-1e-12)).toBe('-1e-12');
 });
});
