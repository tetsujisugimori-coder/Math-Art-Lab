# Stage AB preparation verification

Overall **PARTIAL**, merge recommendation **NO**. Baseline `824eae36ed623eae04ba78913c497366bcd849b4`, tree `15348a9c2b95208595585e22747215abce46a8fa`. No product, physical model, initial condition, timestep, tolerance, original test body or timeout changes. Browser launches and original stop trials: **0**. Performance improvement: NOT_TESTED. Final source identity and CI acquisition receipts are appended to PR #44 / Issue #43 after push rather than attributed to a different commit.

## P2-AA03: safe Windows extraction

Windows 11 build 26300, Python 3.14.7, standard-library zipfile. Registry `LongPathsEnabled=0` was read only. CIM access was denied; registry/version APIs and the denial are retained separately. The previous failure path has 269 characters and its parent exists. The new isolated root's longest output path is 215 characters. Absolute personal paths remain in private evidence only.

The fixed small ZIP was extracted once at each of two depths: short exit 0 / one file, deep exit 1 / no file. Deep failure was `FileNotFoundError [WinError 3]` during directory creation. Native stdout/stderr bytes, arguments, hashes and partial file inventories are retained. This supports a **path-depth dependency**, not a definitive identification of the original failure's native mechanism: the old failure occurred at file creation and its native stderr bytes were NOT_SAVED. No setting, registry or privilege change was made.

Original artifact **14043851393**, run **43430468883**: 71,626,415 bytes; SHA-256 `97e56bf0fdf5b4d58311b147df89432d10d5740de04f79703e643f6bb3785573`; API expires_at `2026-11-27T13:37:24Z`. Original and previous partial extraction are unchanged. New extraction and a separate Python verification process agree on all **329** files, sizes and SHA-256 values, with no missing/extra files. The regression manifest inventories **328** payload files; the 329th is the manifest itself. Both current development/production `.last-run.json` files are present. This does not recover the six older missing originals.

The extractor preflights absolute/escaping/drive paths, symlinks, duplicates, Windows case/name collisions, file-directory conflicts, CRC, destination containment/collision and path-length budget before writing. Five Python tests contain multiple hostile-entry subcases. Two early negative-control failures exposed zipfile's Windows separator normalization; both are preserved. The fixture now retains the hostile central-directory name and validation examines `orig_filename`. This was a fixture/validator correction, not exclusion of the condition.

## P2-AA01: observation contract

Synthetic RED suite: 6/20 expected outcomes, including 14 false acceptances. The same suite after correction: **20/20**. This is diagnostic RED→GREEN, not a browser or product result.

Versioned observations require exactly one paired wait request/return, requested 200ms, measured harness elapsed at least 200ms, and a subsequent bounded state acquisition. Requested delay and observed elapsed time remain distinct. Click operations carry unique IDs through issuance/return and page capture/handler events. Missing, duplicate, inverted, mismatched-clock and contradictory records fail. Page and harness monotonic clocks are checked separately; operation IDs do not establish cross-clock timestamp equality. Missing old records are never filled in.

The pause exit and after-200ms state must agree on internal step, DOM, stopped playing and null timer. Timer advance after pause is rejected; later explicit reset/manual refresh is a separate positive control. An independent code review additionally found missing final-read ordering checks, now covered by negative controls. Existing executed FAIL remains FAIL even if evidence/observation validation fails later.

## P2-AA02: independent review gate

Existence-only RED control: 2/12 expected outcomes; corrected approval controls: **12/12**, using the real process controller and mock children only. Required fields bind exact HEAD/tree, plan SHA, runtime-source-set SHA, reviewer ID/login, PASS/YES and GitHub review ID/body hash. Production lookup uses the canonical repository's GitHub API and validates APPROVED state, commit and URL. Self-review identity, untrusted reviewer, PARTIAL/FAIL/NO, malformed/missing records and forged references deny execution.

The committed policy currently authorizes **no reviewer and no execution**. Review 5898515397 is PARTIAL, not approval. Independent code review during Stage AB is not execution authorization. A separate future reviewed revision must establish the trusted identity and plan. The non-probe original entry itself also refuses execution, including direct CLI/generated-entry calls, so the cohort cannot be bypassed. All nine required audit classes must explicitly PASS; a failed aggregate preparation audit does not imply any individual prerequisite passed. Independent static audits still run when measurement is blocked.

## P3-AA04: 1,118 → 1,131

Both existing manifests were identified by their original SHA-256. Their difference is **13 submission records/derived files**, listed in `archive-delta.json`. All 1,131 archived files were reread and matched. A second process independently repeated the inventory and produced the same canonical collection hash `cf48c115f829bafc611abc581da2b6c5e6ff53f49ec422c96d58e806f5368fb4`. This new hash uses a documented `(archiveRelative,size,sha256)` sorting schema; it does not replace the historical archive tool's differently structured collection hash.

Old manifest SHA: `763315bf4fb96031687f60bb082a46d2b850c7a58c4a8c74f4b21f2be9c6d0b1`; later manifest SHA: `a68c7dd3bec03f4f362bc6ca2efc16a2715cc608c003b014eb6c33c1100da8c0`. Copy timestamps from the prior manifest and filesystem modification times are reported separately; neither is invented as an original acquisition time.

## Regression and remaining limits

- Current diagnostic selection: V/W/X/Z/AA/AB, **190/190 PASS**, zero skipped. Includes 62 new AB tests; earlier AA-only/snapshot counts are not substituted.
- Full local current-source run: **690 PASS / 2 FAIL / 0 skip**, 692 total before four review-added tests. Failures are knot exhaustive torus test and figure-eight 20-period test; captured JSON reports `STACK_TRACE_ERROR`, durations 10,258.5 and 10,754.7ms. No timeout relaxation or success-until-retry. Final CI runs the final source independently.
- Initial sandbox startup failed reading esbuild's parent directory. After sandbox-only access adjustment, a substring selection accidentally collected storage snapshots: assertions passed but collection failed for two missing-import snapshots. Both attempts are retained. Explicit current `src/**/*.test.{ts,js}` scope resolves selection without changing archived snapshots.
- Type check and production build PASS. Six presets/A-B numerical comparisons against the baseline have identical Float64 and complete state/history hashes, **0 mismatches**. Independent RK4, triangle and convergence tests passed in the full run; the local 20-period test failure above remains FAIL despite the separate bitwise run succeeding.
- CI browser jobs/steps are explicitly NOT_RUN under the Stage AB PR marker. This implements the user's browser prohibition; it is not full GUI acceptance or removal of historical failures. Deployment conditions/paths and test deadlines are unchanged.
- New evidence is copied exclusively to the approved Stage AB archive and independently reread; final counts/hashes are reported in submission receipts. Overall history remains **LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS**, old six **NOT_OBTAINED**, **REMOTE_BACKUP_NOT_UPLOADED**.

Stop conditions: no original measurements until new independent execution approval, exact source/plan binding, complete required artifacts, passing preparation/observation audits and a future explicit authorization. Performance/native/GPU/OS causes and equivalence to older spikes remain UNKNOWN. Do not infer real-Locator/browser compatibility from mocks.
