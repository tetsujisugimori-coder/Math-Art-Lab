import * as chai from 'chai';import {JestExtend,JestChaiExpect,getState,setState,GLOBAL_EXPECT} from '@vitest/expect';
// Diagnostic adapter: same installed matchers/counter; no Vitest worker/test association.
chai.use(JestExtend);chai.use(JestChaiExpect);
export const expect=value=>{setState({assertionCalls:getState(expect).assertionCalls+1},expect);return chai.expect(value);};
setState({assertionCalls:0,isExpectingAssertions:false},expect);globalThis[GLOBAL_EXPECT]=expect;
export const assertions=()=>getState(expect).assertionCalls;
