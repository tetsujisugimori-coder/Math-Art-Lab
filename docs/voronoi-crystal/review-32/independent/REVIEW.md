# PR #32 independent re-review (P2-01 / P3-01)

Reviewer: separate read-only review agent. No product or tracked test edits, no formal GitHub review, no merge. The implementer supplied its design; this review challenged it using independently implemented rational and pixel/command oracles. This is separate from the implementer's unit and regression results.

Current status after CI follow-up and fallback repair: scoped P2-01 PASS; scoped P3-01 PASS for the independently executed scope. CI at4038c87 failed two WebKit zero-size recovery checks; that failed attempt is preserved and does not become PASS. An independent native ResizeObserver counterexample confirmed the missed repaint wakeup. The new zero-size fallback closes the same counterexample in both engines, and lifecycle/regression checks pass. Overall independent verification PARTIAL. Limited merge recommendation YES remains conditional on the new final HEAD matching the tested fingerprints and required final CI succeeding. Draft remains unchanged. See ci-resize-review.md and resize-coalescing-{red,green}.json; the final CI gate is still pending.

## P2-01

Root cause at cab21143b9263904da2a9fc95571b79a58b22cd0: `nearest` grouped computed distances within 1e-12 and the UI used that grouping to assert a mathematical condition. For x=(0.5000000000001,0.5), p1=(0.25,0.5), p2=(0.75,0.5), the stored coordinate is strictly right of the bisector; p2 alone is the mathematical owner, while the display may still prioritize p1 by minimum ID.

The repair returns mathematicalOwners separately from displayCandidates and displayOwner. Exact squared-distance comparisons use integer-scaled nonnegative finite binary64 coordinates. Independent Python `Fraction.from_float` rational arithmetic agrees for all 1517 cases, including exact boundaries, either side, one-ULP offsets, 3/4-way ties, ID permutations, range edges, close sites, rounded-hypot equalities, subnormals and deterministic random cases. The baseline falsely offered 738 mathematical candidates when the display grouping was used as the ownership assertion. The same inputs produce zero mismatches in the new API. No implementation function computes oracle expectations.

The distinction is correctly qualified as applying to retained coordinates, not arbitrarily precise original real/decimal intent. Exact arithmetic is preferable here to an ambiguous epsilon classification because the supported stored input model has an exact answer. A decimal value rounded during input may represent a different mathematical point; the help explicitly acknowledges this limit. The 1e-12 tolerance remains only in computed-distance presentation. Minimum-ID display priority remains intact.

In each browser the three requested probes give mathematical owners {1,2}, {2}, {1}, while all display candidates remain {1,2}. Raw retained probe precision and the warning that display candidates do not establish mathematical membership are visible. With independently specified rectangle cells, a recording Canvas context verifies the right-of-boundary probe produces a gold dashed p1 distance and a gold solid p2 distance. Both math owners are solid at the exact boundary by the implemented rule. No disagreement among API, text and the exercised Canvas command styles was found.

## P3-01

Root cause at cab2114: drawOne could return without drawing, but draw advanced completion metadata unconditionally. Reacquired baseline in both Chromium and WebKit: setting main CSS width/height to zero leaves the old bitmap intact while a Lloyd step incorrectly advances renderedRevision and renderCount. Both assertions are RED; all ordinary/restoration controls pass.

Current submitCanvas classifies no context, zero/invalid size, reported context loss and exceptions. Completion records advance only after command submission succeeds, independently for main/reference canvases. This denotes CPU Canvas commands returned successfully; it does not claim GPU composition or visible presentation completion. A queued request token prevents an old callback from consuming the replacement request. Disposal has its own guard. Reference source step correctly uses initial=0 or previous=current-1.

Independent browser regression uses an analytical horizontal two-site split: initial sites (.1,.4),(.5,.4) split at x=.3; after one update sites (.15,.5),(.65,.5) split at x=.4. At (.35,.2), the actual interior pixel changes from ID2 hue about75.016 degrees to ID1 hue about297.508 degrees on recovery. With size zero the bitmap and completion metadata stay unchanged. Thus the assertion is not based solely on metadata.

The extended suite additionally checks height-only zero; main progress while reference is zero; reference initial/previous source metadata; hidden and return; a manually forced canceled callback after a replacement was queued; ten synchronous updates coalescing into one draw; independent closed-form site coordinates; actual pixel at (.49,.2) changing from ID2 at step3 to ID1 at step13; complete lesson state and whole-PNG restoration at fractional CSS width; lesson focus; injected stroke exception and recovery; reported isContextLost and recovery; reduced-motion safe restore; and invoking an old callback after view disposal/recreation. All22 checks pass in each browser, with no pageerror. Reported context loss is a controlled test double, not an actual GPU-loss test. Clearing complete backing pixels also yields identical whole PNG before/after lesson in both engines.

Additional adversarial recovery counterexample: the prior injected stroke exception occurred at the first polygon stroke while dash was empty. A one-time exception at the first non-owner dashed distance stroke instead leaves context dash=[3,5]. In both engines the failed attempt keeps count4, but the first successful recovery increments to5 with a PNG different from the normal same-state image; a second successful recovery increments to6 and finally matches. This confirms persistent Canvas context state affects the first recovered frame. Parent suggested the hypothesis; the reviewer independently reproduced it, without product edits, in dash-recovery-check.mjs and dash-recovery-red.json. A start-of-frame dash reset or equivalent state isolation needs verification. Existing22 passes did not detect this case and are not treated as sufficient P3 closure.

The implementer added a start-of-frame setLineDash([]). Independent same-condition rerun in both engines preserves failed count4/dash[3,5], then the first recovery count5 already matches the normal same-state PNG, as does count6. dash-recovery-green.json records GREEN. The pixel11 and extended22 suites were subsequently rerun on the final renderer and pass in both engines. Thus the additional defect is closed by its own counterexample, not by the earlier22 passes. Final renderer SHA256 is265f9f3931c643032432f2ac75eff5705773447b99e70c328fb6eb00819056b9.

CI follow-up found a separate recovery-liveness defect at4038c87. Native ResizeObserver can observe the same initial/restored size without reporting an intermediate zero. An independent same-frame rAF counterexample leaves a positive-size Canvas permanently zero-size/old bitmap, with no resize entries. A100ms size-only fallback now tracks only zero-size surfaces. On the same native counterexample, both engines update to submitted/revision2/step1 with changed PNG while resize entries remain empty. Eleven additional lifecycle assertions pass per engine: no completion or unnecessary current-reference repaint during sustained zero; one pending fallback; hidden cancellation; latest-state recovery; old timer callbacks cannot revive work; zero reference does not repaint current main; comparison disable stops polling; disposal stops old callbacks; no pageerror. Pixel11, extended22 and dashed-exception recovery were rerun successfully on this final fallback code; the rational1517 oracle also still agrees. No product changes were made by the reviewer.

## Evidence and failure history

| File | Result |
| --- | --- |
| baseline-oracle-red.json | 1517 cases; old API lacks strict owners; 738 false-positive candidates |
| oracle-green.json | 1517 exact rational expected owner sets; zero mismatch |
| baseline-browser-red.json | Both engines: zero-size completion count and revision assertions fail; old pixels remain |
| browser-review-green.json | Both engines: all11 checks pass on same conditions |
| extended-review.json | Both engines: all22 checks pass |
| extended-review-harness-failure.json | Preserved earlier harness-only punctuation and exact-screen-float expectation failures |
| dash-recovery-red.json / dash-recovery-green.json | Both engines: non-owner dashed stroke exception first-recovery PNG mismatch before the additional fix, exact match after |
| resize-coalescing-red.json / resize-coalescing-green.json | Both engines, native RO: no observer delivery; old bitmap remains before fallback, latest step/PNG after |
| size-wait-lifecycle.json | Both engines: all11 timer/lifecycle/no-unnecessary-repaint checks pass |
| head-4038c87-provenance.json | Four source hashes matched earlier tests, but that CI attempt failed; not the pending new HEAD |
| failure-history.json | Evidence cleanup/reacquisition, scratch server failure, harness fixes, recurring initial-load timeout |
| environment.json | Node, Playwright, engine versions |

An independent corrected-harness rerun stopped at initial page.goto after30000ms before feature assertions. Cause UNKNOWN. A later post-dash-fix run passed Chromium22 but stopped at WebKit initial page.goto after30000ms. Unmodified retries with the same timeout passed; this is not evidence of cause or resolution. The pre-existing PR initial-load UNKNOWN remains. No expectation change, skip or timeout increase was used to hide a product failure. The later completed suite added five meaningful checks to the prior17; the previously observed UNKNOWN remains separately recorded. Concurrent other browser work was present, but no evidence establishes it as the cause.

The earlier scratch evidence was accidentally removed by the implementer's default Playwright output cleanup. Baseline RED was reacquired from git-show source, not represented as restoration of original artifacts. Reconstructed scratch tools were run again. See failure-history.json for known harness errors and corrections.

## Reproduce

Keep these scripts in `node_modules/.review32-independent/` so the relative product imports and bare dependency resolution are unchanged. When committed under docs as evidence, copy them to that scratch directory before running. Run from repository root:

```
node node_modules/.review32-independent/extract-baseline.mjs
python node_modules/.review32-independent/oracle.py
node node_modules/.review32-independent/check-oracle.mjs --baseline
node node_modules/.review32-independent/check-oracle.mjs
node node_modules/.review32-independent/browser-check.mjs --baseline
node node_modules/.review32-independent/browser-check.mjs
node node_modules/.review32-independent/extended-check.mjs
node node_modules/.review32-independent/dash-recovery-check.mjs --green
node node_modules/.review32-independent/resize-coalescing-check.mjs --green
node node_modules/.review32-independent/size-wait-lifecycle-check.mjs
```

Required scripts: extract-baseline.mjs, oracle.py, check-oracle.mjs, serve.mjs, browser-check.mjs, extended-check.mjs, dash-recovery-check.mjs, resize-coalescing-check.mjs, size-wait-lifecycle-check.mjs. The baseline script copies source files with git-show from cab2114; it does not alter the checkout. Browser harnesses use their own Vite server on4187 and the Playwright library directly, without the Playwright runner's output-directory cleanup. Execute them sequentially. Browser evidence requires the installed Playwright Chromium/WebKit binaries. No new dependencies were added. The generated oracle-cases.json is retained for audit, but regenerated deterministically by oracle.py. To recreate dash RED, use pre-dash-fix renderer SHA5c92445ecc561dab7592ddaad852c3015d1c132a4105249cfafe9529a38e0dc2 with dash-recovery-check.mjs (no --green); the baseline cab2114 snapshot is a different earlier product state. Resize-coalescing RED uses pre-fallback4038c87 source and the resize script without --green.

## Limits and handoff

NOT_TESTED independently: production preview, complete width/theme/font/DPR matrix, all ten pre-existing artworks, actual GPU/context-loss recovery, real iPhone Safari, actual screen readers, low-performance devices, OS scaling/real browser page zoom, long-term operation and GitHub Pages publication. The implementer's separate full regression/CI evidence must cover its claimed environments. This review does not convert any earlier NOT_TESTED condition to PASS and does not independently establish the cause of the initial-load timeout.

The reviewed source SHA256 fingerprints are embedded in oracle-green.json and extended-review.json. Final HEAD/CI association is an additional provenance step; code changes after those fingerprints require review of the delta. Finite clipping remains approximate and separately documented; exact membership of stored coordinates does not make the painted polygons or pixels exact geometry.

Review updated after zero-size fallback GREEN and all scoped reruns: 2026-11-04 02:50 JST.
