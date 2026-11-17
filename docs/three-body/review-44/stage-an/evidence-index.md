# Stage AN evidence index

- Local environment acquisition is labelled development-host-only in environment-local.json. The exact Windows guest, R endpoint, credentials, roles, ABI and binaries remain unbound.
- evidence/start.json fixes both the isolation baseline and the separate PR review context. evidence/frozen-candidate.json and evidence/frozen-final.json record the working candidate bytes and hashes.
- evidence/*-vitest.json are original per-test outputs. Initial and final AN runs are distinct. The AL/AM runs use their isolated pure-contract configurations, and unchanged import closures do not include AN.
- evidence/draft-vs-candidate.json and evidence/sparse-arrays-final-replay.json contain the independent before/after controls. The budget schema changed, so the two budget comparisons preserve equivalent faults without claiming identical input bytes.
- evidence/ak28.json and evidence/workflow-trigger-audit.json record invariance and the existing workflow push conditions.
- owner-request.md is the submission package. No owner grant has been acquired. Use a separately approved restricted store for actual authorization or protected environment evidence.
- Original ZIP captures, manifests, Git/API readbacks and the independent archive reader's records are handled separately from committed summaries. The proposed Windows AN directory requires destination and scope confirmation. A workspace ZIP is preparation only, and cannot establish persistent retention.
