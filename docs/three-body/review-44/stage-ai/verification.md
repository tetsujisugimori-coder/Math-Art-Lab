# Verification

Commands: `node node_modules/vitest/vitest.mjs run --config tools/three-body-stage-ai-tests.config.mjs`; `node tools/three-body-stage-ai-audit.mjs validate`; `node tools/three-body-stage-ai-audit.mjs --execute` (expected exit2); `npm.cmd run typecheck`; `npm.cmd run build`. Final local: 411 contracts PASS (prior322 + AI89); validate DESIGN_VALID with allowed:false; --execute BLOCKED (exit2); typecheck/build exit0. Initial local 407 PASS/1 FAIL retained separately; seal newline correction preceded frozen review v1. No original numerical test is collected by the AI configuration. Prior 322 contracts included.

Past-revision workflow reruns cannot be retroactively protected by this new workflow. No workflow was dispatched or rerun. Current deny gate has no launcher/callback and returns BLOCKED even for a DESIGN_VALID/approved-looking request.

Primary Node latest-v24 documentation retrieved on 2026-11-16 reported v24.22.3, while AH proposed executable is v24.20.0. Documentation is design guidance, not executable/version equivalence; version-specific support must be verified before approval. The child_process v24 documentation fetch was unavailable; signal-send versus actual-exit distinction was corroborated from official current Node documentation, not asserted as a host experiment.
