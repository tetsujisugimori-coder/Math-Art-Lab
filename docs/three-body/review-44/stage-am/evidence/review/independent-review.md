# Stage AM independent source and synthetic-contract review

Verdict: DESIGN_AND_PURE_CONTRACT_LIMITED_PASS. New P1/P2: none. Actual physical implementation approval NO; qualification BLOCKED; overall PARTIAL.

Reviewer am_independent_review is distinct from implementation/formal-test owner. Directly read source, fixtures, frozen expected results and raw outputs, rather than relying on the owner's report. Review target: frozen source-set SHA256 0369479e85ef24625ebe7be3bf8190db2ef2ce851988244e3e40177eb5703ed4, 77 files with raw size/SHA256/Git blob checks. Contract 10617 bytes, SHA256 7228ab6673a32166e159dafb221b4e97e6842e0b7035302231c50007c4a048e6. Baseline f700e6705dd896037fe6e9d2241f0067fa35efdd / tree 0b84169717f2815f8b8e84183682ad5724762d66.

## Direct independent checks

- Independently constructed 109 synthetic controls, all PASS: M/R faults, stale VM/generation/epoch/nonce, malformed events, reverse same-domain time, raw/SHA/readback corruption, failure latching, STOP/API/VM/EXIT/release separation, old proof rebound to new HEAD/tree/source/plan/environment/scope, approval expiry/revocation/replay and terminal model transitions.
- Dedicated AM Vitest independently executed: 224 PASS, 0 FAIL/SKIP/TODO. Exact occurrence-indexed names and statuses match owner's new 224. Independent probes are not additional Vitest tests.
- Owner's new AL per-test JSON directly checked: all 686 PASS and same individual IDs as prior 686; AL was not independently rerun by this reviewer. Root typecheck/build exit0 and both denial CLI exit2 are directly read from raw records.
- Independently reran reviewed AST closure with output-only redirection: 11 test roots/54 local modules, no original numerical runtime import. The one nonliteral require loads the installed YAML parser. Existing AE physical-capable prepare/run functions are not invoked by these tests; CLI guards and stubbed AF identity calls checked. Third-party runner internals are not exhaustively expanded.
- AK28 raw bytes and baseline Git blobs unchanged; no tracked protected-path diff. PR44 directly fetched: bca7eb3, Draft, auto-merge null. Existing 18 workflow definitions have no push trigger for the new isolated branch; this is not a claim about all external webhooks.

## Safety conclusions

R outside guest and independent failure domains are required design obligations, never physically established by a different process name or synthetic flags. Enrollment, durable independent readback, nonce/epoch/VM and credential lifecycle are required; actual guarantee remains NONE. Job creation-time JOB_LIST, suspended creation, native handles/birth, membership and resume receipts are separate. No silent post-create Assign fallback or breakaway is allowed. Creator-loss atomicity in the real VM remains UNKNOWN and process creation is forbidden without proof.

The state machine is a stateless hypothetical model. MODEL_VALID/IMPLEMENTATION_ELIGIBLE never authorizes execution; every gate response is PLAN_ONLY/BLOCKED/APPROVAL_MISSING/HOLD with allowed false. Synthetic receipts and owner labels are never accepted as external authenticated evidence. Full grant bytes are bound in the model, but real signature/trust/ACL/ledger state is not implemented.

Early draft observations about reverse at values, approval grant raw binding and precreation handle wording were fixed before the frozen review version. The old draft was not captured/executed by this reviewer; no RED is invented. Same adverse inputs reject in the fixed version.

## Retained failures and limits

First independent test attempt failed before collection due to sandbox/esbuild directory access. Second actual Vitest process succeeded exit0 and saved complete per-test JSON/raw logs; the surrounding Python display then failed exit1 because cp932 could not print a checkmark. This observation/display failure and a separate command-quoting ParserError are preserved, not reported as test FAIL or erased. No test rerun was used to hide the display failure.

Microsoft primary specifications for JOB_LIST/HANDLE_LIST, Job final-close/breakaway/nesting, CreateProcessW, GetProcessTimes and IsProcessInJob were directly read. ResumeThread page retrieval timed out and is recorded NOT_OBTAINED; no native call was made. Actual VM, R station, trust anchors, ACL, native binaries/ABI, atomicity, recovery and power-loss durability remain unverified. Original ZIP preservation and final GitHub publication are separate audit steps and were not yet verified by this source reviewer.

Raw evidence: source-acquisition.json, static-independent-verification.json, independent-probes.mjs/results, attempt2/vitest-independent.json and run/stdout/stderr, test-inventory-crosscheck.json, import-closure-independent.json, collector-print-failure.json, preparation.json and review-conclusion.json.

Completed 2026-11-17T20:10:06.468278+00:00 UTC (JST = UTC+09:00).
