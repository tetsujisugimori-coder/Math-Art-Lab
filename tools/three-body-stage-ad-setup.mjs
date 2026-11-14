import {beforeEach,afterEach} from 'vitest';
import {record} from './three-body-stage-ad-observer.mjs';
const file=process.env.STAGE_AD_WORKER_LOG;
if(!file)throw Error('OBSERVER_OUTPUT_REQUIRED');
record(file,'setup');
beforeEach(ctx=>record(file,'before-test',{name:ctx.task.name}));
afterEach(ctx=>record(file,'after-test',{name:ctx.task.name}));
