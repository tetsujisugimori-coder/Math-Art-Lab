import { describe, expect, it } from 'vitest';
import { defaults, deform, generateTree, sampleTree } from './fractal';
import { mathText, parameterFields, structures } from './structures';

describe('数式定義と計算実装の対応', () => {
  const formulas = Object.fromEntries(structures.flatMap(s => s.formulas.map(f => [f.id, f.expression])));
  it('記号式と代入式を区別し、未指定の距離・時刻・世代を保持する', () => {
    expect(Object.fromEntries(Object.entries(formulas).map(([id,expr]) => [id,mathText(expr)]))).toEqual({
      length:'L_n=L_0×r^(n)', heading:'θ_child=θ_parent±α', count:'B=2^(D)−1',
      'endpoint-x':'x_end=x_start+cos(θ_branch)×L_n', 'endpoint-y':'y_end=y_start+sin(θ_branch)×L_n',
      phase:'φ=(2πd)/(λ)−ω×t', envelope:'E(d)=1−exp(−0.8d)',
      'deform-x':'x′=x+A×E(d)×sin(φ)', 'deform-y':'y′=y', 'deform-z':'z′=z+0.5×A×E(d)×cos(φ)',
      distance:'d_end=d_start+ℓ',
    });
    expect(mathText(formulas.length,defaults)).toBe('L_n=1.15×0.72^(n)');
    expect(mathText(formulas.phase,defaults)).toBe('φ=(2πd)/(4.5)−1×t');
    expect(mathText(formulas['deform-x'],{...defaults,amplitude:.63})).toBe('x′=x+0.63×E(d)×sin(φ)');
    expect(mathText(formulas.count,defaults)).toBe('B=2^(8)−1');
    expect(mathText(formulas.heading,defaults)).toBe('θ_child=θ_parent±0.48');
    expect(mathText(formulas['endpoint-x'],defaults)).toBe('x_end=x_start+cos(θ_branch)×L_n');
    expect(mathText(formulas['endpoint-y'],defaults)).toBe('y_end=y_start+sin(θ_branch)×L_n');
  });
  it('全パラメータに記号と対応構造があり、初期値を定義側で複製しない', () => {
    expect(parameterFields.map(f=>f.key).sort()).toEqual(Object.keys(defaults).sort());
    expect(structures.flatMap(s=>s.parameters).sort()).toEqual(Object.keys(defaults).sort());
    expect(new Set(structures.map(s=>s.id)).size).toBe(structures.length);
  });
  it('長さ・方向・累積距離・枝数が表示式と一致する', () => {
    for (const p of [defaults,{...defaults,depth:4,angle:.73,shrink:.51},{...defaults,depth:10,angle:.1,shrink:.82}]) {
      const branches = generateTree(p);
      expect(branches.length).toBe(2**p.depth-1);
      function check(start: typeof branches[number]['start'], n: number, heading: number, distance: number) {
        const children = branches.filter(b=>b.start===start);
        expect(children).toHaveLength(n===0?1:2);
        children.forEach((branch,i)=>{
          const direction = n===0?heading:heading+(i===0?p.angle:-p.angle);
          const length = 1.15*p.shrink**n;
          expect(branch.end.x).toBeCloseTo(start.x+Math.cos(direction)*length,12);
          expect(branch.end.y).toBeCloseTo(start.y+Math.sin(direction)*length,12);
          expect(branch.end.z).toBe(0);
          expect(branch.distance).toBeCloseTo(distance,12);
          if(n+1<p.depth)check(branch.end,n+1,direction,distance+length);
        });
      }
      expect(branches[0].start).toEqual({x:0,y:-2.4,z:0});
      check(branches[0].start,0,Math.PI/2,0);
    }
  });
  it('同世代の左右の子枝も別々の方向角を持ち、親方向から±αとなる', () => {
    const branches=generateTree({...defaults,depth:2});
    const parent=branches[0], children=branches.filter(b=>b.start===parent.end);
    const heading=(b:typeof parent)=>Math.atan2(b.end.y-b.start.y,b.end.x-b.start.x);
    const parentAngle=heading(parent), childAngles=children.map(heading);
    expect(childAngles).toHaveLength(2);
    expect(childAngles[0]).toBeCloseTo(parentAngle+defaults.angle,12);
    expect(childAngles[1]).toBeCloseTo(parentAngle-defaults.angle,12);
    expect(childAngles[0]).not.toBeCloseTo(childAngles[1],12);
    expect(Math.hypot(children[0].end.x-parent.end.x,children[0].end.y-parent.end.y))
      .toBeCloseTo(Math.hypot(children[1].end.x-parent.end.x,children[1].end.y-parent.end.y),12);
  });
  it('位相・包絡・三座標の変形が表示式と一致する', () => {
    const point={x:1,y:-.5,z:2};
    for(const p of [defaults,{...defaults,amplitude:.8,wavelength:1,speed:4},{...defaults,amplitude:0,speed:0}]) {
      for(const d of [0,.3,2,5])for(const t of [0,1.5,10]) {
        const phase=2*Math.PI*d/p.wavelength-p.speed*t, envelope=1-Math.exp(-.8*d);
        const result=deform(point,d,t,p);
        expect(result.x).toBeCloseTo(point.x+p.amplitude*envelope*Math.sin(phase),14);
        expect(result.y).toBe(point.y);
        expect(result.z).toBeCloseTo(point.z+.5*p.amplitude*envelope*Math.cos(phase),14);
      }
    }
  });
  it('式の生成で状態や描画計算結果を変更しない', () => {
    const params=Object.freeze({...defaults});
    const branches=generateTree(params),before=sampleTree(branches,2,params);
    for(const expression of Object.values(formulas)){mathText(expression);mathText(expression,params);}
    expect(sampleTree(branches,2,params)).toEqual(before);
    expect(params).toEqual(defaults);
  });
});
