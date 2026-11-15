# Stage AF independent review

Separate read-only agent `/root/af_independent_review`, 2026-11-15 20:12 JST. P2-AE01 PASS; P3-AE02 scoped PASS. No measurement or browser use. Formal CI, commit/push, Windows preservation and GitHub submission are outside this review's scope.

Independently recomputed B1 residual 1086.408500000081ms and B2 1097.2686999999837ms; both exactly equal stored residuals. OFF accumulators0, residual null. Four normal records accepted, runtime NOT_OBTAINED and posthoc POSTHOC_VERIFIED retained.

Found and verified fixes for four issues: optional summary bypass; missing receipt-module source snapshot; manifest-only HEAD/tree claim; per-row runtime VERIFIED despite raw ID/mode failure. Saved-summary-only mutation independently reproduced PASS→FAIL (`SUMMARY_BYTES_SIZE_SHA`). Final reviewed audit module SHA256 `93acf26bc80d8f64f720fefb6449a1ec1cf5a62dab7676dfc8c66a03b4d0bbe7`.

P3 is limited to checked raw/source/checkpoint/cohort/summary correspondence. It does not manufacture historical execution-time bindings or bind Node native libraries/OS. UNKNOWN root cause, NOT_TESTED improvement and merge NO remain.
