export const boundaries=[['T0','parent.launch.request','parent.spawn.returned','parent'],['T1','collection.begin','collection.end','worker'],['T2','worker.import.begin','worker.import.end','worker'],['T3','worker.setup.begin','worker.setup.end','worker'],['T4','body.begin','body.end','worker'],['T5','matcher.first.begin','matcher.last.end','worker'],['T6','cleanup.begin','cleanup.end','worker'],['T7','parent.launch.request','parent.exit.received','parent']];
export const requiredStops=['PLAN_OR_SOURCE_DRIFT','ANY_NONZERO_EXIT','ANY_SIGNAL','RUNNER_FAIL_OR_TIMEOUT','SELECTION_OR_COUNT_MISMATCH','CLOCK_DOMAIN_OR_INVALID_VALUE','REQUIRED_END_EVENT_MISSING','WORKER_RESPONSE_MISSING','MONITOR_FAILURE','EVIDENCE_SAVE_FAILURE','RAW_BYTES_SIZE_SHA_OR_CHECKPOINT_MISMATCH','RUNTIME_ATTRIBUTION_NOT_VERIFIED','PARENT_SAFETY_30000MS','TOTAL_BUDGET_90000MS','EVENT_BUFFER_LIMIT','UNRESOLVED_ANOMALY','SCHEDULE_EXHAUSTED'];
const runner='node_modules/@vitest/runner/dist/chunk-hooks.js',base='node_modules/vitest/dist/chunks/runBaseTests.9Ij9_de-.js';
export const stageSpec=[
 ['collection',[[runner,'async function collectTests(']]],
 ['TypeScript transform',[['node_modules/vite-node/dist/server.mjs','transformRequest']]],
 ['module import',[[runner,'await runner.importFile(filepath, "collect")'],['node_modules/vite-node/dist/client.mjs','executeFile']]],
 ['test registration',[[runner,'getDefaultSuite().collect(file)'],['src/three-body.test.ts','figure eight is reproduced and its energy stays bounded for 20 periods']]],
 ['worker creation/isolation',[['node_modules/vitest/dist/workers/forks.js','class ForksBaseWorker']]],
 ['setup/hook',[[base,'async function setupGlobalEnv('],[runner,'await runSetupFiles(config, setupFiles, runner)']]],
 ['target callback',[['src/three-body.test.ts','figure eight is reproduced and its energy stays bounded for 20 periods'],[runner,'const result = fn(...args)']]],
 ['Verlet/energy/RK4/RMS',[['src/three-body.test.ts','for(let i=0;i<126518;i++)'],['tools/three-body-reference.ts','export function reference']]],
 ['matcher',[['node_modules/@vitest/expect/dist/index.js','toBeLessThan']]],
 ['cleanup/report',[[runner,'async function startTests('],[base,'stopCoverageInsideWorker']]],
 ['timeout/process exit',[[runner,'function withTimeout('],[runner,'now() - startTime >= timeout']]]
];
export const eventNames=[...new Set([...boundaries.flatMap(([,a,b])=>[a,b]),'body.throw','timeout.timer','timeout.resolve.elapsed','pre-body.failure'])];
export const stageActors=['worker Vitest runner','Vite-node coordinator/server','worker executor','worker task collector','coordinator -> forked worker','worker environment and runner','worker runner withTimeout wrapper','same worker synchronous body','worker installed Vitest expect','worker and coordinator reporter','worker deadline; external supervisor for process safety'];
export const stageEvents=[['collection.begin','collection.end'],['worker.import.begin','worker.import.end'],['worker.import.begin','worker.import.end'],['collection.begin','collection.end'],['worker.setup.begin','worker.setup.end'],['worker.setup.begin','worker.setup.end'],['body.begin','body.end','body.throw'],['body.begin','body.end'],['matcher.first.begin','matcher.last.end'],['cleanup.begin','cleanup.end'],['timeout.timer','timeout.resolve.elapsed','parent.exit.received']];
export const expectedEnvironment=Object.freeze({node:'v24.20.0',vitest:'3.2.7',platform:'win32',release:'10.0.26300',arch:'x64',nodeExecutableSha256:'5c976096e04e5c2c1f091938926234cc9fbebfe9787ddd149351b3b0ecc707b5',acquisition:'CURRENT_HOST_STATIC_SNAPSHOT; NOT_TARGET_EXECUTION'});
export const clockSpec=Object.freeze({wall:'performance.now',wallUnit:'ms',processCpu:'process.cpuUsage',threadCpu:'process.threadCpuUsage if supported',cpuUnit:'us',unsupportedThreadCpu:Object.freeze({value:null,status:'NOT_OBTAINED'})});
for(const r of boundaries)Object.freeze(r);Object.freeze(boundaries);Object.freeze(requiredStops);Object.freeze(eventNames);Object.freeze(stageActors);for(const r of stageEvents)Object.freeze(r);Object.freeze(stageEvents);
for(const r of stageSpec){for(const ref of r[1])Object.freeze(ref);Object.freeze(r[1]);Object.freeze(r);}Object.freeze(stageSpec);
