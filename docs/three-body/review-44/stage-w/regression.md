# Local regression and failures retained

Six bit/all-history cases against baseline1e2e895: 6/6 match, mismatches0; physics source unchanged True. Independent RK4/figure-eight20-period RMS 5.166206684615977e-05, maximum normalized energy 2.0425110705340324e-07; triangle analytic RMS 9.182625800475754e-07; half-step ratios [3.9998785243000876, 3.999969635141757, 3.999992427620031]. No tolerances changed.

Baseline diagnostic counterexamples12: 8 RED / 4 already correct. Final V/W diagnostic assertions 64/64 PASS. Additional3 source revision/runner/index cases were added after the initial full unit run; final CI must cover the final source version.

Local full active-src unit 565/567;2 existing long-duration knot/figure-eight tests failed (JSON STACK_TRACE_ERROR, durations10016/10717ms). Raw JSON/stacks preserved; no successful rerun substitutes for them. Separate numerical oracle success is not a claim those tests completed. Earlier U/V failures remain history. Typecheck and both build steps pass.

Target development GUI 44/48; 4 failures, skip0, flaky0. Chromium DPR1/DPR2 delayed-rAF, DPR1 saturated and width390/reduced-motion matrix timed out; no unchanged-condition retry. Production initial invocation used development directory prefix and ran0 tests (NOT_RUN, command error preserved). Corrected basename invocation executed the unchanged production targets once: 48/48, unexpected0, skip0, flaky0.

Existing formal all-artwork Chromium/WebKit development/production CI and automatic diagnostics run on the final submitted HEAD. Their actual status, suites, original artifacts and checksum/checkout proof are reported on Issue43/PR44. Prior focused WebKit wave failure and Windows timeouts remain separate from any later result; no new skips/timeouts/retry mechanism or product fix was introduced.
