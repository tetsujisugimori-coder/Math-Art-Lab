# Stage T capture analysis

Baseline Stage S final CI: 606/606 runs completed; 48 E_SCREENSHOT failures (Linux Chromium33, Windows Chromium15, Linux WebKit0). Completion is distinct from acquisition success. Existing raw data and failure history are preserved.

The new explicit plan uses ABBA order for each independent pair, separately for current `willReadFrequently:true` and old/default context. It compares API, trace order, pre-capture readback, explicit device metrics override, DPR, Canvas resource release and command retention. Launch arguments, OS/browser version, before/after backing dimensions, command tape SHA, clock brackets, API timestamps and readback status remain in raw data. The additional CDP metrics condition means `Emulation.setDeviceMetricsOverride`, not a physical display or GPU change.

Timeout remains5000ms. Every exception and pixel/dimension mismatch remains E_SCREENSHOT. Released resources intentionally change the target and cannot prove equivalent pixels. A command-tape hash is not bitmap equality. Post-capture readback is outside the measured playback window and may affect later backend behavior; each run uses a fresh browser. Direct CDP capture is not presumed equivalent unless its decoded dimensions/pixels match.

Native wait target and Windows/Linux differences remain UNKNOWN until supported by correlated evidence and counterexamples. No timeout extension, ignore, skip or replacement API has been adopted. Final run counts and failure distributions will be published with the final-HEAD CI readback; they cannot be inferred from the baseline48.

## Local capture results (new directory, no overwrite)

All105 planned runs completed;64 attempted captures yielded34 acquisitions and30 E_SCREENSHOT failures:26 timeouts and4 direct CDP protocol errors. Of34 acquired images,32 were checked against the Canvas readback: dimensions matched and different channels0. Two intentional backing-reset/removal images have no equivalence claim. There were no pixel-mismatch failures in this local set. The30 failures remain in FAIL status and report/check exit1 is retained.

| Old/default context ABBA factor | A results | B results | Interpretation |
|---|---|---|---|
| Pre-readback OFF / ON | OFF0/2 acquired | ON2/2 acquired, Canvas channel difference0 | Limited path dependence; native wait still UNKNOWN |
| New commands / initial bitmap only | New0/2 | Bitmap-only2/2, Canvas channel difference0 | Pending/new drawing path participates; do not stop product drawing as a fix |
| Retain / reset backing+remove DOM | Retain0/2 | Reset/remove0/2 | Removal did not suffice; JavaScript context references remain, GPU disposal NOT_TESTED |
| Explicit device metrics OFF / ON | OFF0/2 | ON0/2 | Override alone did not fix this window |
| Trace stop before / after capture | Both conditions failed | Both conditions failed | No local trace-order remedy demonstrated |

Current context also produced2 direct `cdp-view` protocol errors; the old context produced2 more. This refutes an exclusively Playwright-specific failure explanation. API implementation/native wait, Linux/Windows disparity and equivalence of a replacement capture API remain UNKNOWN. Pre-readback is still a diagnostic intervention only; no capture API or timeout contract was replaced.
