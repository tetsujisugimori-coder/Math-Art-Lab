# Independent design clarification: approval context

Review target: commit 4036c28a7f8e2294c353930c4272cc6f551fdf94 / tree 77354b4ee3df8680ef9f633631604e8bdc6dfde8. Reviewer: am_independent_review, distinct from implementation and formal-test owner. No source changes were made for this clarification.

Verdict: the absence of distinct repository/PR/branch fields in the hypothetical model grant is not a new P1/P2 within the current design-only scope. The prior design/pure-contract limited PASS remains unchanged. modelTransition labels results SYNTHETIC_ONLY, accepts no external approval, and cannot release the current gate. The actual gate is constant PLAN_ONLY/BLOCKED/APPROVAL_MISSING/HOLD with allowed false, independent of all inputs. The model checks the requested HEAD/tree/source/plan/environment/scope and VM/generation/epoch bindings, validity, revocation and nonce reuse without asserting operational authorization.

This verdict does not mean cross-repository, cross-PR or cross-branch approval reuse has been independently rejected by the model. Those identifiers are not separate fields in its grant, and scopeSha256 must not be presented as a verified implicit substitute without acquiring and semantically checking its canonical scope document. Even a globally matching Git HEAD can be present in another repository or PR context.

Before any future real approval validator is implemented or accepted, its canonical signed/authenticated owner grant bytes must explicitly bind repository full_name and immutable repository identity, PR, branch or an explicitly reviewed branch-independent policy, approval-policy version and action, alongside the existing target/version/environment/VM/epoch/scope constraints. Required independent counterexamples include the same Git HEAD in another repository, PR and branch context. Real raw acquisition/readback, trusted issuer/key and trusted time, current revocation and consumed-nonce persistence remain separately required and unimplemented.

Transferring this synthetic model into a real approval role without that separate schema, independent review and explicit owner authorization would exceed this limited acceptance. Execution must continue to be refused. Physical implementation approval remains NO, qualification BLOCKED, AK01 actual guarantee NONE and AK02 physical UNKNOWN.

2026年11月18日 JST
