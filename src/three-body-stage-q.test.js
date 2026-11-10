import{describe,it,expect}from'vitest';
import{inputStatistics,performanceVerdict,clockBracket,classifyArrival}from'../tools/three-body-stage-q-metrics.mjs';
describe('Stage Q measurement contracts',()=>{
 it('separates planned timer delay from main queue delay',()=>{const s=inputStatistics([{Tminus1:100,T0:140,T1:147}]);expect(s.scheduledToSend.max).toBe(40);expect(s.sendToReceive.max).toBe(7);expect(s.scheduledToReceive.max).toBe(47);});
 it('keeps timer delays and negative nominal clock values rather than clamping them',()=>{const s=inputStatistics([{Tminus1:0,T0:400,T1:399},{Tminus1:500,T0:500,T1:501}]);expect(s.scheduledToSend.max).toBe(400);expect(s.sendToReceive.median).toBe(-1);expect(s.scheduledToReceive.max).toBe(399);});
 it('does not fabricate planned times for old records',()=>{const s=inputStatistics([{T0:10,T1:12}]);expect(s.scheduledToReceive.status).toBe('NOT_TESTED');expect(s.scheduledToReceive.max).toBeNull();expect(s.scheduledToReceive.missing).toBe(1);expect(s.sendToReceive.max).toBe(2);});
 it('does not turn missing stop timestamps into zero latency',()=>{const s=inputStatistics([{Tminus1:0,T0:1,T1:2}]);expect(performanceVerdict(s,{T1:2}).verdict).toBe('NOT_TESTED');});
 it('reports budget violations without calling measured maxima a guarantee',()=>{const s=inputStatistics([{Tminus1:0,T0:1,T1:300}]);const b=performanceVerdict(s,{T1:300,T3:301,T4:310});expect(b.verdict).toBe('PARTIAL');expect(b.failed).toContain('scheduledMax');expect(b.upperBoundGuaranteed).toBe(false);});
 it('uses a measured bracket and preserves the uncertainty',()=>{expect(clockBracket([]).status).toBe('NOT_TESTED');const b=clockBracket([{low:3,high:9},{low:4,high:6}]);expect(b.offset).toBe(5);expect(b.halfWidth).toBe(1);expect(b.precisionGuaranteed).toBe(false);});
 it('requires actual arrival inside the long interval beyond clock error',()=>{const span={begin:100,end:200};expect(classifyArrival(span,101,2)).toBe('TARGET_MISS');expect(classifyArrival(span,150,2)).toBe('HIT');expect(classifyArrival({begin:100,end:120},110)).toBe('TARGET_MISS');});
});
