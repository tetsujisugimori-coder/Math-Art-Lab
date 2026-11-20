# Stage T candidate fixes

Product changes: **0**. Performance improvement: **NOT_TESTED**, because a causally supported matched product modification has not been adopted.

Geometry cache and DOM/read ordering remain candidates, not decisions. Cache would require resize, DPR1/2, Canvas1/2, pan, lesson restoration, remount and pixel-coherence tests. Ordering can alter forced-layout behavior but needs evidence of the actual blocking mechanism. A faster synthetic fixture does not establish a safe product benefit.

Capture API replacement, pre-capture readback and resource release are diagnostic factors only. Resource release changes the target and is unsuitable as an equivalent capture fix. Readback may change the backend. Any API adoption must preserve the same pixels, viewport, physical step and capture time contract, demonstrate same-condition RED→GREEN, and pass Chromium/WebKit regressions. No fallback hides an E_SCREENSHOT failure.

No Worker/OffscreenCanvas change. Existing 64-step batching, DOM reuse, physical integration, history limits, epoch protection and Pages path remain untouched. Adoption threshold remains primary p95 >=30% reduction, no >10% degradation in other conditions, existing response budgets and all regressions. Unknown cause requires PARTIAL and merge recommendation NO.
