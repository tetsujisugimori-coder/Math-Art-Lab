# Stage T regression contract

No product source, initial condition, tolerance, fixed-step Velocity Verlet, softening potential, invariant scale, history limit, A/B commit, lesson or Pages setting is changed.

Re-run, without raising timeouts or adding skips:

- Baseline34c4: five presets plus chaos A/B, all serialized doubles and Float64 bits, full history hashes (six cases).
- Independent RK4 and refinement, figure-eight t=126.518 (~20 periods), analytic triangle and dt-halving quadratic convergence; conserved quantities and close-stop via existing tests.
- Entire unit suite, including P3-05 unreadable/corrupt/duplicate/missing/process/artifact negative controls and new archive/plan controls.
- Typecheck, development mode build, production build.
- Existing formal three-body development/production GUI on Chromium/WebKit (including DPR2, delayed rAF, Canvas/DOM committed step, epoch safety, restoration and disposal).
- Final-HEAD official CI for all17 works; original606-run diagnostic CI, plus bounded Stage T controls. Record completed, acquisition failure, analytical failure and unexecuted independently.

The initial Stage T driver attempt completed41/105, leaving64 unexecuted because the explicit-plan source copy shared one filename. Those files/logs/manifests remain immutable. A failing fixture reproduces EEXIST; suite-qualified exclusive destinations fix this diagnostic bug. Re-execution uses a new output directory. GREEN for plan coexistence does not mean GREEN for capture acquisition or product performance.

Final-HEAD run URLs, actual artifact IDs/digests/expiry and checkout-tree equality are recorded in the PR final submission after CI completes; an earlier HEAD's success is never substituted. Local startup denial from sandboxed esbuild is retained separately from test assertion failures.

## Local mathematical and failure ledger

Baseline34c4: all6 Float64 bit and full-history cases match; physics source unchanged. Independent reference: figure-eight t126.518 RMS5.1662066846e-5, RK4 refinement9.5850772664e-12, maximum normalized E2.0425110705e-7; analytic triangle RMS9.1826258005e-7. dt=.004/.002/.001/.0005 errors4.4899530e-5/1.1225223e-5/2.8063271e-6/7.0158311e-7 retain quadratic convergence. Numerical mismatch count0. Browser reference comparisons are within the same engine; cross-engine bit identity is not asserted.

First full local unit run:486/488 passed,2 existing5000ms timeouts (knot torus exhaustive case; three-body figure-eight20period case). Targeted unchanged cases also timed out (2 selected failures,46 cases unselected by the diagnostic filter; no new test.skip). Final local full rerun after adding privacy controls:489/491 passed, same2 timeouts. No tolerance/configuration/timeout change. New15 archive/plan/privacy tests passed. These failures remain unresolved; direct numerical scripts succeeding is not a substitute for unit PASS.

Typecheck, development build and production build passed. Development GUI first attempt47/48,1 Chromium DPR1 delayed-rAF case timeout at context.close; production48/48,skip0/flaky0. A single unchanged full development repeat is recorded separately. Do not label an initial failure as a successful run or erase it. A baseline test-set control retains the two failing cases, to distinguish contribution of new diagnostic tests; it is not a formal replacement suite.

A read-only process/memory snapshot found1,684,180KiB free out of16,473,976KiB; this is not a measured pressure timeline, page-fault record or causal explanation. No processes were killed and no OS settings changed. Kernel observations remain NOT_TESTED.

Local follow-up: unchanged development GUI full repeat48/48,skip0/flaky0,271.5s. Initial47/48 failure remains recorded; a manual repeat is not an automatic flaky retry result. Baseline35 original test bodies were verified unchanged and still yielded474/476 with the same2 timeouts. New diagnostic tests are therefore not necessary for this observed failure; specific environment/runtime cause remains UNKNOWN. No further local repetition, timeout increase, skip or product change.
