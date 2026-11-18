# Stage AO technical audit B

Overall **PARTIAL / HOLD**, with technical content verification complete. This report concerns the three previously copied Stage AN files for Math-Art-Lab PR #44. It applies the [fixed audit criteria](https://github.com/tetsujisugimori-coder/Math-Art-Lab/blob/f89e7079519e4fcc0fea43f6aa56ce47a07b4bb0/docs/three-body/review-44/stage-ao/archive-audit-criteria-20261118.md) and the [fixed Stage AN inventory](https://github.com/tetsujisugimori-coder/Math-Art-Lab/blob/f89e7079519e4fcc0fea43f6aa56ce47a07b4bb0/docs/three-body/review-44/stage-an/archive-approval.md). The archive contents bind to Stage AN commit `4252075c092280e2ccbf6b9f5e9fb7ac96044d91`, tree `4d4f72fd5fdac3b7061bbfdffc6e9a73f04019f2`.

| Decision | Result |
|---|---|
| CONTENT_INTEGRITY | PASS |
| ZIP_ENTRY_INTEGRITY | PASS |
| MANIFEST_INTEGRITY | PASS |
| AUDITOR_INDEPENDENCE | LIMITED_SAME_ACCOUNT |
| RETENTION_APPROVAL | NOT_OBTAINED |
| PERSISTENT_ARCHIVE | HOLD |
| DESIGN_ACCEPTED | PENDING_ARCHIVE |

## Evidence acquired

B opened the three actual files at the specified Windows Archive destination and separately opened the three originals. Each archived size and SHA-256 matched the pinned Stage AN inventory. Direct comparisons established equality over all 906,037 bytes.

| File | Bytes | SHA-256 |
|---|---:|---|
| stage-an-original.zip | 809577 | `6526020fa8420f1a54ee53520a869d646220152dd3182fc8d19e63049c7827b0` |
| manifest.json | 44572 | `abee846f6a3be13f1ee81fdd42e7af812004c544707c848e5e132060e825392d` |
| source-inventory.json | 51888 | `fd77bf39039cb7db713d6a46d1c653e9914854ff4e61e3b07421babd2d92e886` |

The verifier checked 209 distinct central-directory entries and their local headers, decoded name set, sizes, recalculated CRC32 and SHA-256, and expanded bytes. The external manifest matches the embedded manifest byte for byte, with CRC32 `2307164c`. Its 208 payload records exactly cover the non-manifest entries. The separate inventory covers all 209 entries, including the manifest. The archived raw commit, tree and 31 source blob bindings match the fixed Git objects.

The destination path and file set passed the resolution and reparse-point checks. An initial PowerShell ACL query failed to load its security module. B retained that observation and used read-only Windows API queries for the directory and all three files. Those queries and a repeat readback passed. Effective write, modification and deletion restrictions are UNKNOWN. Authorized access logging settings were NOT_OBTAINED.

## Audit provenance and unresolved conditions

The prior copy receipt records A's copy time as 2026-11-18 17:19 JST. A's original CLI/session ID, process ID and Windows token identity were NOT_OBTAINED. B used a separate new Codex CLI session, launched at 18:02 JST, with no session resume or fork. B's session ID, CLI and verifier PIDs, observed principal, timestamps, ACL records and per-entry observations are retained in the new local audit case. B's comparison takes its expected values from the fixed Git inventory and reads the archive and originals directly. A's reported match flags are excluded from the calculations. The owner-approved shared-account setting establishes a separate technical execution, with no verified Windows principal separation or immutability guarantee.

The owner authorized the specified three-file copy and readback and requested this read-only audit. Retention duration and dates, authorized deletion conditions, effective access restrictions, and the durable facility and terms for B's raw audit records are unconfirmed. The proposal values are not active retention rules. This publication records a sanitized summary. The new CLI logs, verifier outputs and ACL metadata remain in the new local workspace audit case, pending authorization for durable audit-record storage.

Technical results in the local case are bound by the SHA-256 of `technical-checks.json` (`7c611e91492fdd35c77a778c68749607ccf214f282ed98094483ea1ec25e0fbd`) and `raw-windows-acl-recheck.json` (`51b923917397dce25ba4ff198e64b0836bc42a87adf760525d9db0359baddf03`). No isolation VM, external R, original Vitest stop test or physical implementation was exercised. The Stage AN and PR #44 revision lines stay separate.
